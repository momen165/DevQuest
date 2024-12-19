const axios = require('axios');
const db = require('../config/database');
const { Buffer } = require('buffer');
const NodeCache = require('node-cache');
const rateLimit = require('express-rate-limit');

// Cache configuration
const codeExecutionCache = new NodeCache({
    stdTTL: 300, // 5 minutes cache
    checkperiod: 320,
});

// Rate limiter configuration
const executionLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // limit each IP to 50 requests per windowMs
    message: { error: 'Too many code execution requests. Please try again later.' }
});

const JUDGE0_RAPID_API_HOST = 'judge0-ce.p.rapidapi.com';
const JUDGE0_RAPID_API_KEY = '179f6770f5msh61cd752c25cd483p180d42jsn40216ba79f4a';
const POLL_INTERVAL = 2000;

// Helper function to generate cache key
const generateCacheKey = (lessonId, code, input) => {
    return `${lessonId}-${Buffer.from(code).toString('base64')}-${input || 'noInput'}`;
};

const runCode = async (req, res) => {
    const { lessonId, code } = req.body;
    const isBase64Encoded = req.query.base64_encoded === 'true';

    if (!lessonId || !code) {
        return res.status(400).json({ error: 'Missing required fields: lessonId or code' });
    }

    try {
        // Fetch language ID and test cases from the database
        const [langResult, lessonResult] = await Promise.all([
            db.query(
                `SELECT c.language_id
                 FROM course c
                          JOIN section s ON c.course_id = s.course_id
                          JOIN lesson l ON s.section_id = l.section_id
                 WHERE l.lesson_id = $1`,
                [lessonId]
            ),
            db.query('SELECT test_cases FROM lesson WHERE lesson_id = $1', [lessonId]),
        ]);

        if (langResult.rowCount === 0 || !langResult.rows[0].language_id) {
            return res.status(400).json({ error: 'Language ID not found for this lesson' });
        }

        if (lessonResult.rowCount === 0 || !Array.isArray(lessonResult.rows[0].test_cases)) {
            return res.status(404).json({ error: 'Lesson or test cases not found' });
        }

        const languageId = langResult.rows[0].language_id;
        const testCases = lessonResult.rows[0].test_cases;

        // Validate test cases
        for (const testCase of testCases) {
            if (!testCase.expected_output) {
                return res.status(400).json({error: 'Invalid test case format: expected_output is required'});
            }
        }

        const decodedCode = isBase64Encoded ? Buffer.from(code, 'base64').toString('utf-8') : code;

        const results = await Promise.all(
            testCases.map(async (testCase) => {
                const {input, expected_output} = testCase;
                
                const normalizeOutput = (output) => {
                    if (!output) return '';
                    return output
                        .replace(/\r\n/g, '\n')  // Normalize line endings
                        .replace(/\r/g, '\n')     // Handle old Mac line endings
                        .replace(/\n+$/, '')      // Remove trailing newlines
                        .replace(/^\n+/, '');     // Remove leading newlines
                };

                // Check cache first
                const cacheKey = generateCacheKey(lessonId, decodedCode, input);
                const cachedResult = codeExecutionCache.get(cacheKey);
                
                if (cachedResult) {
                    console.log('Cache hit for code execution');
                    return cachedResult;
                }

                // If not in cache, proceed with execution
                const submission = {
                    source_code: Buffer.from(decodedCode).toString('base64'),
                    language_id: languageId,
                    stdin: input ? Buffer.from(input).toString('base64') : '',
                    expected_output: Buffer.from(expected_output).toString('base64'),
                };

                // Execute code and get results
                const result = await executeCode(submission);
                
                // Debug logging
                console.log('Expected Output (raw):', JSON.stringify(expected_output));
                console.log('Actual Output (raw):', JSON.stringify(result.actual_output));
                
                const normalizedExpected = normalizeOutput(expected_output);
                const normalizedActual = normalizeOutput(result.actual_output);
                
                // More debug logging
                console.log('Normalized Expected:', JSON.stringify(normalizedExpected));
                console.log('Normalized Actual:', JSON.stringify(normalizedActual));
                console.log('Length Expected:', normalizedExpected.length);
                console.log('Length Actual:', normalizedActual.length);
                console.log('Are equal:', normalizedExpected === normalizedActual);
                
                // Compare character by character
                if (normalizedExpected !== normalizedActual) {
                    console.log('Character comparison:');
                    for (let i = 0; i < Math.max(normalizedExpected.length, normalizedActual.length); i++) {
                        if (normalizedExpected[i] !== normalizedActual[i]) {
                            console.log(`Difference at position ${i}:`);
                            console.log(`Expected: ${normalizedExpected.charCodeAt(i)} (${normalizedExpected[i]})`);
                            console.log(`Actual: ${normalizedActual.charCodeAt(i)} (${normalizedActual[i]})`);
                        }
                    }
                }

                const testResult = {
                    input,
                    expected_output: expected_output,
                    actual_output: result.actual_output,
                    status: normalizedExpected === normalizedActual ? 'Passed' : 'Failed',
                    error: result.error,
                    status_description: result.status_description,
                };

                // Cache the result
                codeExecutionCache.set(cacheKey, testResult);

                return testResult;
            })
        );

        res.json({ results });
    } catch (error) {
        console.error('Error in /api/run:', error.message || error);
        res.status(500).json({
            error: 'Code execution failed',
            details: error.response?.data || error.message,
        });
    }
};

// Helper function to execute code
async function executeCode(submission) {
    const { data: { token } } = await axios.post(
        `https://${JUDGE0_RAPID_API_HOST}/submissions?base64_encoded=true`,
        submission,
        {
            headers: {
                'Content-Type': 'application/json',
                'X-RapidAPI-Host': JUDGE0_RAPID_API_HOST,
                'X-RapidAPI-Key': JUDGE0_RAPID_API_KEY,
            },
        }
    );

    let result;
    const MAX_POLL_TIME = 20000;
    const startTime = Date.now();
    
    do {
        if (Date.now() - startTime > MAX_POLL_TIME) {
            throw new Error('Polling timed out.');
        }
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
        const response = await axios.get(
            `https://${JUDGE0_RAPID_API_HOST}/submissions/${token}?base64_encoded=true`,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'X-RapidAPI-Host': JUDGE0_RAPID_API_HOST,
                    'X-RapidAPI-Key': JUDGE0_RAPID_API_KEY,
                },
            }
        );
        result = response.data;
    } while (result.status.id < 3);

    return {
        actual_output: result.stdout 
            ? Buffer.from(result.stdout, 'base64')
                .toString('utf-8')
                .replace(/\n+$/, '')  // Remove trailing newlines
            : '',
        error: result.stderr ? Buffer.from(result.stderr, 'base64').toString('utf-8') : null,
        compile_error: result.compile_output ? Buffer.from(result.compile_output, 'base64').toString('utf-8') : null,
        status_description: result.status.description,
    };
}

// Add getCacheStats function
const getCacheStats = (req, res) => {
    try {
        const stats = {
            keys: codeExecutionCache.keys(),
            stats: codeExecutionCache.getStats(),
            hits: codeExecutionCache.getStats().hits,
            misses: codeExecutionCache.getStats().misses,
            hitRate: `${(codeExecutionCache.getStats().hits / 
                (codeExecutionCache.getStats().hits + codeExecutionCache.getStats().misses) * 100).toFixed(2)}%`,
            entries: codeExecutionCache.keys().length,
        };
        
        res.json(stats);
    } catch (error) {
        console.error('Error getting cache stats:', error);
        res.status(500).json({ error: 'Failed to retrieve cache statistics' });
    }
};

module.exports = { runCode, executionLimiter, getCacheStats };