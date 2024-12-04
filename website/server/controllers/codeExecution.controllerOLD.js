const axios = require('axios');
const db = require('../config/database');
const {Buffer} = require('buffer'); // Node.js built-in module

const JUDGE0_API_URL = 'http://localhost:2358/submissions'; // Adjusted URL
const POLL_INTERVAL = 2000; // Polling interval in milliseconds

const runCode = async (req, res) => {
    const {lessonId, code} = req.body;
    const isBase64Encoded = req.query.base64_encoded === 'true';

    if (!lessonId || !code) {
        return res.status(400).json({error: 'Missing required fields: lessonId or code'});
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

        if (langResult.rowCount === 0 || !langResult.rows[0].language_id) {
            return res.status(400).json({error: 'Language ID not found for this lesson'});
        }

        if (lessonResult.rowCount === 0 || !Array.isArray(lessonResult.rows[0].test_cases)) {
            return res.status(404).json({error: 'Lesson or test cases not found'});
        }

        const languageId = langResult.rows[0].language_id;
        const testCases = lessonResult.rows[0].test_cases;

        const decodedCode = isBase64Encoded ? Buffer.from(code, 'base64').toString('utf-8') : code;

        const results = await Promise.all(
            testCases.map(async (testCase) => {
                const {input, expectedOutput, expected_output} = testCase;
                const normalizedExpectedOutput = (expectedOutput || expected_output || '').replace(/\\n/g, '\n');

                if (!normalizedExpectedOutput) {
                    throw new Error('Invalid test case format: expected_output is required');
                }

                const submission = {
                    source_code: Buffer.from(decodedCode).toString('base64'),
                    language_id: languageId,
                    stdin: input ? Buffer.from(input).toString('base64') : '',
                    expected_output: Buffer.from(normalizedExpectedOutput).toString('base64'),
                };

                const {data: {token}} = await axios.post(`${JUDGE0_API_URL}?base64_encoded=true`, submission, {
                    headers: {
                        'Content-Type': 'application/json'
                    },
                });

                let result;
                do {
                    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
                    const response = await axios.get(`${JUDGE0_API_URL}/${token}?base64_encoded=true`, {
                        headers: {
                            'Content-Type': 'application/json'
                        },
                    });
                    result = response.data;
                } while (result.status.id < 3);

                const actualOutput = result.stdout ? Buffer.from(result.stdout, 'base64').toString('utf-8').trim() : '';
                const error = result.stderr ? Buffer.from(result.stderr, 'base64').toString('utf-8') : null;
                const compileError = result.compile_output ? Buffer.from(result.compile_output, 'base64').toString('utf-8') : null;

                return {
                    input,
                    expected_output: normalizedExpectedOutput.trim(),
                    actual_output: actualOutput,
                    status: actualOutput === normalizedExpectedOutput.trim() ? 'Passed' : 'Failed',
                    error: error,
                    compileError: compileError
                };
            })
        );

        res.json({results});
    } catch (error) {
        console.error('Error in /api/run:', error.message || error);
        res.status(500).json({
            error: 'Code execution failed',
            details: error.response?.data || error.message,
        });
    }
};

module.exports = {runCode};