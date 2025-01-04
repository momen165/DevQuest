const axios = require('axios');
const db = require('../config/database');
const { Buffer } = require('buffer');
const NodeCache = require('node-cache');
const rateLimit = require('express-rate-limit');

// Configuration
const CONFIG = {
  cache: {
    ttl: 300,  // 5 minutes cache
    checkPeriod: 320
  },
  rateLimit: {
    windowMs: 15 * 60 * 1000,  // 15 minutes
    maxRequests: 50
  },
  judge0: {
    host: 'judge0-ce.p.rapidapi.com',
    apiKey: '179f6770f5msh61cd752c25cd483p180d42jsn40216ba79f4a',
    pollInterval: 2000,
    maxPollTime: 20000,
    maxOutputSize: 1024 * 100, // 100KB output limit
    timeLimit: 10,  // 5 seconds execution time limit
    memoryLimit: 512000  // 512MB memory limit
  }
};

// Initialize cache and rate limiter
const codeExecutionCache = new NodeCache(CONFIG.cache);
const executionLimiter = rateLimit({
  windowMs: CONFIG.rateLimit.windowMs,
  max: CONFIG.rateLimit.maxRequests,
  message: { error: 'Too many code execution requests. Please try again later.' }
});

// Helper functions
const helpers = {
  generateCacheKey: (lessonId, code, input) => 
    `${lessonId}-${Buffer.from(code).toString('base64')}-${input || 'noInput'}`,

  normalizeOutput: (output) => {
    if (!output) return '';
    return output
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\n+$/, '');
  },

  decodeBase64: (str) => {
    if (!str) return '';
    // First try UTF-8 decode
    try {
      return Buffer.from(str, 'base64').toString('utf-8');
    } catch (e) {
      // Fallback to binary if UTF-8 fails
      return Buffer.from(str, 'base64').toString('binary');
    }
  },

  encodeBase64: (str) => {
    if (!str) return '';
    // Properly handle Unicode characters by using UTF-8 encoding
    return Buffer.from(str, 'utf-8').toString('base64');
  },

  async executeCode(submission) {
    const headers = {
      'Content-Type': 'application/json',
      'X-RapidAPI-Host': CONFIG.judge0.host,
      'X-RapidAPI-Key': CONFIG.judge0.apiKey
    };

    // Add execution constraints
    const constrainedSubmission = {
      ...submission,
      time_limit: CONFIG.judge0.timeLimit,
      memory_limit: CONFIG.judge0.memoryLimit,
      enable_network: false  // Disable network access
    };

    // Submit code
    const { data: { token } } = await axios.post(
      `https://${CONFIG.judge0.host}/submissions?base64_encoded=true`,
      constrainedSubmission,
      { headers }
    );

    // Poll for results
    const startTime = Date.now();
    let result;
    
    do {
      if (Date.now() - startTime > CONFIG.judge0.maxPollTime) {
        throw new Error('Polling timed out.');
      }
      await new Promise(resolve => setTimeout(resolve, CONFIG.judge0.pollInterval));
      const response = await axios.get(
        `https://${CONFIG.judge0.host}/submissions/${token}?base64_encoded=true`,
        { headers }
      );
      result = response.data;
    } while (result.status.id < 3);

    // Check output size before returning
    const stdout = helpers.decodeBase64(result.stdout) || '';
    if (stdout.length > CONFIG.judge0.maxOutputSize) {
      throw new Error('Output size exceeds the maximum limit');
    }

    return {
      actual_output: stdout.replace(/\n+$/, '') || '',
      error: helpers.decodeBase64(result.stderr),
      compile_error: helpers.decodeBase64(result.compile_output),
      status_description: result.status.description
    };
  }
};

// Error handler wrapper
const handleAsync = (fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (error) {
    console.error(`Error in ${fn.name}:`, error.message);
    
    // Handle specific error types
    if (error.message.includes('Output size exceeds')) {
      return res.status(413).json({
        error: 'Output Limit Exceeded',
        details: 'Your code generated too much output. Please reduce the amount of output (limit: 100KB).'
      });
    }
    
    if (error.message.includes('time')) {
      return res.status(408).json({
        error: 'Time Limit Exceeded',
        details: 'Your code took too long to execute. Please optimize your code (limit: 5 seconds).'
      });
    }

    if (error.message.includes('memory')) {
      return res.status(413).json({
        error: 'Memory Limit Exceeded',
        details: 'Your code used too much memory. Please optimize your code (limit: 512MB).'
      });
    }

    if (error.response?.status === 429) {
      return res.status(429).json({
        error: 'Rate Limit Exceeded',
        details: 'Too many requests. Please wait a few minutes before trying again.'
      });
    }

    res.status(500).json({
      error: 'Code Execution Failed',
      details: error.response?.data?.message || error.message || 'An unexpected error occurred while running your code.'
    });
  }
};

// Main controller functions
const runCode = handleAsync(async (req, res) => {
  const { lessonId, code } = req.body;
  const isBase64Encoded = req.query.base64_encoded === 'true';

  if (!lessonId || !code) {
    return res.status(400).json({ error: 'Missing required fields: lessonId or code' });
  }

  // Fetch language ID and test cases
  const [langResult, lessonResult] = await Promise.all([
    db.query(`
      SELECT c.language_id
      FROM course c
      JOIN section s ON c.course_id = s.course_id
      JOIN lesson l ON s.section_id = l.section_id
      WHERE l.lesson_id = $1
    `, [lessonId]),
    db.query('SELECT test_cases FROM lesson WHERE lesson_id = $1', [lessonId])
  ]);

  if (!langResult.rows[0]?.language_id) {
    return res.status(400).json({ error: 'Language ID not found for this lesson' });
  }

  const testCases = lessonResult.rows[0]?.test_cases;
  if (!Array.isArray(testCases)) {
    return res.status(404).json({ error: 'Lesson or test cases not found' });
  }

  if (testCases.some(test => !test.expected_output)) {
    return res.status(400).json({ error: 'Invalid test case format: expected_output is required' });
  }

  const decodedCode = isBase64Encoded ? helpers.decodeBase64(code) : code;

  // Process test cases
  const results = await Promise.all(testCases.map(async ({ input, expected_output }) => {
    const cacheKey = helpers.generateCacheKey(lessonId, decodedCode, input);
    const cachedResult = codeExecutionCache.get(cacheKey);
    
    if (cachedResult) {
      console.log('Cache hit for code execution');
      return cachedResult;
    }

    const submission = {
      source_code: helpers.encodeBase64(decodedCode),
      language_id: langResult.rows[0].language_id,
      stdin: helpers.encodeBase64(input),
      expected_output: helpers.encodeBase64(expected_output)
    };

    const result = await helpers.executeCode(submission);
    const normalizedExpected = helpers.normalizeOutput(expected_output);
    const normalizedActual = helpers.normalizeOutput(result.actual_output);

    // If the normalized versions match but actual doesn't match expected,
    // use the expected format
    const finalOutput = normalizedExpected === normalizedActual 
      ? expected_output  // Use the expected format when test passes
      : result.actual_output;  // Keep original output when test fails

    const testResult = {
      input,
      expected_output,
      actual_output: finalOutput,
      status: normalizedExpected === normalizedActual ? 'Passed' : 'Failed',
      error: result.error,
      status_description: result.status_description
    };

    codeExecutionCache.set(cacheKey, testResult);
    return testResult;
  }));

  res.json({ results });
});

const getCacheStats = handleAsync(async (req, res) => {
  const stats = codeExecutionCache.getStats();
  const totalRequests = stats.hits + stats.misses;
  
  res.json({
    keys: codeExecutionCache.keys(),
    stats,
    hits: stats.hits,
    misses: stats.misses,
    hitRate: totalRequests ? `${(stats.hits / totalRequests * 100).toFixed(2)}%` : '0%',
    entries: codeExecutionCache.keys().length
  });
});

module.exports = { runCode, executionLimiter, getCacheStats };