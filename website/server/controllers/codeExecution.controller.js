const axios = require('axios');
const db = require('../config/database');
const { Buffer } = require('buffer'); // Node.js built-in module

const JUDGE0_API_URL = 'https://judge0-ce.p.rapidapi.com/submissions';
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY; // Store in .env
const POLL_INTERVAL = 2000; // Polling interval in milliseconds


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
        `
        SELECT c.language_id
        FROM course c
        JOIN section s ON c.course_id = s.course_id
        JOIN lesson l ON s.section_id = l.section_id
        WHERE l.lesson_id = $1
        `,
        [lessonId]
      ),
      db.query('SELECT test_cases FROM lesson WHERE lesson_id = $1', [lessonId]),
    ]);

    // Validate language ID
    if (langResult.rowCount === 0 || !langResult.rows[0].language_id) {
      return res.status(400).json({ error: 'Language ID not found for this lesson' });
    }

    // Validate lesson and test cases
    if (lessonResult.rowCount === 0 || !Array.isArray(lessonResult.rows[0].test_cases)) {
      return res.status(404).json({ error: 'Lesson or test cases not found' });
    }

    const languageId = langResult.rows[0].language_id;
    const testCases = lessonResult.rows[0].test_cases;

      // Decode Base64 encoded code if necessary
      const decodedCode = isBase64Encoded ? atob(code) : code;


    // Process each test case
    const results = await Promise.all(
      testCases.map(async (testCase) => {
        const { input, expectedOutput, expected_output } = testCase;
        const normalizedExpectedOutput = (expectedOutput || expected_output || '').replace(/\\n/g, '\n');



        // Validate test case format
        if (!input || !normalizedExpectedOutput) {
          throw new Error('Invalid test case format');
        }

        // Prepare submission payload
          const submission = {
              source_code: decodedCode, // Use the decoded code here
              language_id: languageId,
              stdin: input,
              expected_output: normalizedExpectedOutput,
          };

        // Submit to Judge0
        const { data: { token } } = await axios.post(JUDGE0_API_URL, submission, {
          headers: {
            'Content-Type': 'application/json',
            'X-RapidAPI-Key': RAPIDAPI_KEY,
            'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com',
          },
        });

        // Poll Judge0 for results
        let result;
        do {
          await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
          const response = await axios.get(`${JUDGE0_API_URL}/${token}`, {
            headers: {
              'X-RapidAPI-Key': RAPIDAPI_KEY,
              'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com',
            },
          });
          result = response.data;
        } while (result.status.id < 3);

        // Process result
        const actualOutput = result.stdout ? result.stdout.trim() : '';
        return {
          input,
          expected_output: normalizedExpectedOutput.trim(),
          actual_output: actualOutput,
          status: actualOutput === normalizedExpectedOutput.trim() ? 'Passed' : 'Failed',
          error: result.stderr || null,
        };
      })
    );

    // Respond with results
    res.json({ results });
  } catch (error) {
    console.error('Error in /api/run:', error.message || error);
    res.status(500).json({
      error: 'Code execution failed',
      details: error.response?.data || error.message,
    });
  }
};

module.exports = { runCode };
