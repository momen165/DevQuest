const axios = require('axios');
const db = require('../config/database'); // Adjust the path if necessary
require('dotenv').config();

const JUDGE0_API_URL = 'https://judge0-ce.p.rapidapi.com/submissions';
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const POLL_INTERVAL = 5000; // Polling interval in milliseconds



const runCode = async (lessonId, code) => {
  if (!lessonId || !code) {
    throw new Error('Missing required fields: lessonId or code');
  }

  try {
    // Get language ID and test cases in parallel
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

    // Validate language ID
    if (langResult.rowCount === 0 || !langResult.rows[0].language_id) {
      throw new Error('Language ID not found for this lesson');
    }

    // Validate lesson and test cases
    if (lessonResult.rowCount === 0 || !Array.isArray(lessonResult.rows[0].test_cases)) {
      throw new Error('Lesson or test cases not found');
    }

    const languageId = langResult.rows[0].language_id;
    const testCases = lessonResult.rows[0].test_cases;

    // Process test cases
    const results = await Promise.all(testCases.map(async (testCase) => {
      const { input, expectedOutput, expected_output } = testCase;
      const normalizedExpectedOutput = (expectedOutput || expected_output || '').replace(/\\n/g, '\n');

      // Validate test case
      if (!input || !normalizedExpectedOutput) {
        throw new Error('Invalid test case format');
      }

      // Prepare submission
      const submission = {
        source_code: code,
        language_id: languageId,
        stdin: input,
        expected_output: normalizedExpectedOutput
      };

      // Submit code to RapidAPI
      const { data: { token } } = await axios.post(JUDGE0_API_URL, submission, {
        headers: {
          'Content-Type': 'application/json',
          'X-RapidAPI-Key': RAPIDAPI_KEY,
          'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com'
        }
      });

      // Poll for results
      let result;
      do {
        await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
        const response = await axios.get(`${JUDGE0_API_URL}/${token}`, {
          headers: {
            'X-RapidAPI-Key': RAPIDAPI_KEY,
            'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com'
          }
        });
        result = response.data;
      } while (result.status.id < 3);

      // Process result
      const actualOutput = result.stdout
        ? result.stdout.trim()
        : '';

      return {
        input,
        expected_output: normalizedExpectedOutput.trim(),
        actual_output: actualOutput,
        status: actualOutput === normalizedExpectedOutput.trim() ? 'Passed' : 'Failed',
        error: result.stderr || null
      };
    }));

    return { results };
  } catch (error) {
    console.error('Error in code execution:', error.message || error);
    throw new Error('Code execution failed');
  }
};

module.exports = { runCode };
