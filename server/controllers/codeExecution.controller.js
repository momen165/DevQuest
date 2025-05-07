const axios = require("axios");
const db = require("../config/database");
const { Buffer } = require("buffer");
const NodeCache = require("node-cache");
const rateLimit = require("express-rate-limit");
//YygtxMr4Uud43e6NrsWjntszH8rUF95n
// Configuration
const CONFIG = {
  cache: {
    ttl: 300, // 5 minutes cache
    checkPeriod: 320,
  },
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 50,
  },
  judge0: {
    host: "judge0-ce.p.rapidapi.com",
    apiKey: "[REDACTED]", //  RapidAPI key
    pollInterval: 2000,
    maxPollTime: 20000,
    maxOutputSize: 1024 * 100,
    timeLimit: 10,
    memoryLimit: 512000,
  },
};

// Add language-specific error handling configurations
const LANGUAGE_CONFIGS = {
  // JavaScript (Node.js)
  27: {
    formatError: (error) => {
      if (error.includes("SyntaxError")) {
        return `Syntax Error: ${error.split("\n")[0]}`;
      }
      return error;
    },
  },
  // Python
  100: {
    formatError: (error) => {
      if (error.includes("SyntaxError")) {
        return error.split("\n").slice(0, 2).join("\n");
      }
      return error;
    },
  },
  // Java
  91: {
    formatError: (error) => {
      if (error.includes("error:")) {
        return error
          .split("\n")
          .filter((line) => line.includes("error:"))
          .join("\n");
      }
      return error;
    },
  },
  // C++
  105: {
    formatError: (error) => {
      if (error.includes("error:")) {
        return error
          .split("\n")
          .filter((line) => line.includes("error:"))
          .join("\n");
      }
      return error;
    },
  },
};

// Initialize cache and rate limiter
const codeExecutionCache = new NodeCache(CONFIG.cache);
const executionLimiter = rateLimit({
  windowMs: CONFIG.rateLimit.windowMs,
  max: CONFIG.rateLimit.maxRequests,
  message: {
    error: "Too many code execution requests. Please try again later.",
  },
});

// Helper functions
const helpers = {
  generateCacheKey: (lessonId, code, input) =>
    `${lessonId}-${Buffer.from(code).toString("base64")}-${input || "noInput"}`,

  normalizeOutput: (output) => {
    if (!output) return "";
    return output
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .replace(/\n+$/, "")
      .replace(/\[ /g, "[")
      .replace(/ \]/g, "]")
      .replace(/, /g, ",")
      .replace(/\{ /g, "{")
      .replace(/ \}/g, "}")
      .replace(/: /g, ":")
      .replace(/' /g, "'")
      .replace(/ '/g, "'")
      .replace(/'/g, '"')
      .replace(/\s+/g, "")
      .trim();
  },

  decodeBase64: (str) => {
    if (!str) return "";
    // First try UTF-8 decode
    try {
      return Buffer.from(str, "base64").toString("utf-8");
    } catch (e) {
      // Fallback to binary if UTF-8 fails
      return Buffer.from(str, "base64").toString("binary");
    }
  },

  encodeBase64: (str) => {
    if (!str) return "";
    // Properly handle Unicode characters by using UTF-8 encoding
    return Buffer.from(str, "utf-8").toString("base64");
  },

  async executeCode(submission) {
    const headers = {
      "Content-Type": "application/json",
      "X-RapidAPI-Host": CONFIG.judge0.host,
      "X-RapidAPI-Key": CONFIG.judge0.apiKey,
    };

    try {
      const base64SourceCode = Buffer.from(submission.source_code).toString(
        "base64",
      );
      const base64ExpectedOutput = submission.expected_output
        ? Buffer.from(submission.expected_output).toString("base64")
        : "";
      const base64Input = submission.stdin
        ? Buffer.from(submission.stdin).toString("base64")
        : "";

      const response = await axios.post(
        `https://${CONFIG.judge0.host}/submissions`,
        {
          source_code: base64SourceCode,
          language_id: submission.language_id, // Default to C++17 if not specified
          stdin: base64Input,
          expected_output: base64ExpectedOutput,
          time_limit: CONFIG.judge0.timeLimit,
          memory_limit: CONFIG.judge0.memoryLimit,
          enable_network: false,
        },
        {
          headers,
          params: {
            base64_encoded: true,
            wait: true,
          },
          timeout: 30000, // 30 seconds
          timeoutErrorMessage: "Request timed out while connecting to Judge0",
        },
      );

      // Get language-specific error formatter
      const languageConfig = LANGUAGE_CONFIGS[submission.language_id] || {
        formatError: (error) => error, // Default formatter
      };

      // Decode and format the response
      return {
        actual_output: response.data.stdout
          ? Buffer.from(response.data.stdout, "base64").toString().trim()
          : "",
        error: response.data.stderr
          ? languageConfig.formatError(
              Buffer.from(response.data.stderr, "base64").toString(),
            )
          : "",
        compile_error: response.data.compile_output
          ? languageConfig.formatError(
              Buffer.from(response.data.compile_output, "base64").toString(),
            )
          : "",
        status_description: response.data.status?.description || "Unknown",
      };
    } catch (error) {
      console.error("Code execution error:", error);
      throw error;
    }
  },
};

// Error handler wrapper
const handleAsync = (fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (error) {
    console.error(`Error in ${fn.name}:`, error.message);

    // Handle specific error types
    if (error.message.includes("Output size exceeds")) {
      return res.status(413).json({
        error: "Output Limit Exceeded",
        details:
          "Your code generated too much output. Please reduce the amount of output (limit: 100KB).",
      });
    }

    if (error.message.includes("time")) {
      return res.status(408).json({
        error: "Time Limit Exceeded",
        details:
          "Your code took too long to execute. Please optimize your code (limit: 5 seconds).",
      });
    }

    if (error.message.includes("memory")) {
      return res.status(413).json({
        error: "Memory Limit Exceeded",
        details:
          "Your code used too much memory. Please optimize your code (limit: 512MB).",
      });
    }

    if (error.response?.status === 429) {
      return res.status(429).json({
        error: "Rate Limit Exceeded",
        details:
          "Too many requests. Please wait a few minutes before trying again.",
      });
    }

    res.status(500).json({
      error: "Code Execution Failed",
      details:
        error.response?.data?.message ||
        error.message ||
        "An unexpected error occurred while running your code.",
    });
  }
};

// Main controller functions
const runCode = handleAsync(async (req, res) => {
  let { code, lessonId } = req.body;

  if (!code || !lessonId) {
    return res.status(400).json({ error: "Code and lessonId are required." });
  }

  // Decode the code if it's base64 encoded
  try {
    if (code.match(/^[A-Za-z0-9+/=]+$/)) {
      code = Buffer.from(code, "base64").toString("utf8");
    }
  } catch (error) {
    console.error("Error decoding code:", error);
  }

  try {
    const [langResult, lessonResult] = await Promise.all([
      db.query(
        `
        SELECT c.language_id
        FROM course c
        JOIN section s ON c.course_id = s.course_id
        JOIN lesson l ON s.section_id = l.section_id
        WHERE l.lesson_id = $1
      `,
        [lessonId],
      ),
      db.query("SELECT test_cases FROM lesson WHERE lesson_id = $1", [
        lessonId,
      ]),
    ]);

    const testCases = lessonResult.rows[0]?.test_cases;

    // Process test cases
    const results = await Promise.all(
      testCases.map(async (testCase) => {
        const result = await helpers.executeCode({
          source_code: code,
          language_id: langResult.rows[0].language_id,
          stdin: testCase.input || "",
          expected_output: testCase.expected_output || "",
        });

        // Check for compilation errors first
        if (result.compile_error) {
          return {
            input: testCase.input,
            status: "Failed",
            actual_output: "",
            error: `Compilation Error: ${result.compile_error}`,
            status_description: "Compilation failed",
            compile_error: result.compile_error,
          };
        }

        // Check for runtime errors
        if (result.error) {
          return {
            input: testCase.input,
            status: "Failed",
            actual_output: "",
            error: `Runtime Error: ${result.error}`,
            status_description: "Runtime error occurred",
          };
        }

        // Continue with existing validation logic
        let validationResult;
        if (testCase.auto_detect) {
          validationResult = {
            status: result.actual_output && !result.error ? "Passed" : "Failed",
            actual_output: result.actual_output,
            error:
              result.error ||
              (result.actual_output ? "" : "No output detected"),
            status_description:
              result.actual_output && !result.error
                ? "Auto-detect: Code executed successfully with output"
                : "Auto-detect: No output or execution error",
          };
        } else if (testCase.use_pattern) {
          validationResult = validatePattern(
            result.actual_output,
            testCase.pattern,
          );
        } else {
          validationResult = validateExactMatch(
            result.actual_output,
            testCase.expected_output,
          );
        }

        return {
          input: testCase.input,
          expected_output: testCase.use_pattern
            ? testCase.pattern
            : testCase.expected_output,
          ...validationResult,
          auto_detect: testCase.auto_detect,
          use_pattern: testCase.use_pattern,
          pattern: testCase.pattern,
        };
      }),
    );

    // Check if all test cases passed their respective validations
    const allPassed = results.every((result) => result.status === "Passed");

    res.json({
      results,
      success: allPassed,
      message: allPassed ? "All test cases passed!" : "Some test cases failed.",
      execution_successful: true,
      validation_passed: allPassed,
    });
  } catch (error) {
    console.error("Error running code:", error);
    res.status(500).json({
      error: "Failed to execute code",
      details: error.message,
      execution_successful: false,
      validation_passed: false,
    });
  }
});

// Split validation into two separate functions
const validatePattern = (actualOutput, pattern) => {
  try {
    const regex = new RegExp(`^(${pattern})$`, "i");
    // Remove trailing newlines and whitespace for pattern matching
    const cleanOutput = actualOutput.trim();
    const isMatch = regex.test(cleanOutput);

    return {
      status: isMatch ? "Passed" : "Failed",
      actual_output: actualOutput,
      error: isMatch
        ? ""
        : `Output must be either ${pattern.split("|").join(" or ")} (any case). Got "${cleanOutput}" instead.`,
      status_description: isMatch
        ? "Pattern match successful"
        : "Pattern match failed",
    };
  } catch (error) {
    return {
      status: "Failed",
      actual_output: actualOutput,
      error: `Invalid pattern: ${error.message}`,
      status_description: "Pattern validation error",
    };
  }
};

const validateExactMatch = (actualOutput, expectedOutput) => {
  const isMatch =
    helpers.normalizeOutput(actualOutput) ===
    helpers.normalizeOutput(expectedOutput);
  return {
    status: isMatch ? "Passed" : "Failed",
    actual_output: actualOutput,
    error: isMatch ? "" : "Output does not match expected value",
    status_description: isMatch ? "Exact match" : "Match failed",
  };
};

const getCacheStats = handleAsync(async (req, res) => {
  const stats = codeExecutionCache.getStats();
  const totalRequests = stats.hits + stats.misses;

  res.json({
    keys: codeExecutionCache.keys(),
    stats,
    hits: stats.hits,
    misses: stats.misses,
    hitRate: totalRequests
      ? `${((stats.hits / totalRequests) * 100).toFixed(2)}%`
      : "0%",
    entries: codeExecutionCache.keys().length,
  });
});

const executeCode = handleAsync(async (req, res) => {
  const { code, language_id } = req.body;

  if (!code || !language_id) {
    return res
      .status(400)
      .json({ error: "Code and language_id are required." });
  }

  // Modify the code to capture console.log outputs
  const wrappedCode = `
    let output = [];
    const originalConsoleLog = console.log;
    console.log = (...args) => {
      output.push(args.join(' '));
      originalConsoleLog.apply(console, args);
    };

    try {
      ${code}
    } catch (error) {
      console.error(error.message);
    }

    console.log = originalConsoleLog;
    output.join('\\n');
  `;

  const options = {
    method: "POST",
    url: process.env.JUDGE0_API_URL,
    params: { base64_encoded: "false", wait: "true" },
    headers: {
      "content-type": "application/json",
      "Content-Type": "application/json",
    },
    data: {
      source_code: wrappedCode,
      language_id: language_id,
      stdin: "",
    },
  };

  const response = await axios.request(options);

  // Extract the output from the response
  let result = "";
  if (response.data.stdout) {
    result = response.data.stdout.trim();
  } else if (response.data.stderr) {
    result = `Error: ${response.data.stderr}`;
  } else if (response.data.compile_output) {
    result = `Compilation Error: ${response.data.compile_output}`;
  }

  res.json({
    status: response.data.status,
    output: result,
    memory: response.data.memory,
    time: response.data.time,
  });
});

module.exports = { runCode, executionLimiter, getCacheStats, executeCode };
