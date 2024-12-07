// website/client/src/components/MonacoEditorComponent.js
import React from 'react';
import {Editor} from '@monaco-editor/react';
import axios from 'axios';
import {FaPlay, FaCopy} from 'react-icons/fa';

const MonacoEditorComponent = ({
                                   language,
                                   code,
                                   setCode,
                                   user,
                                   lessonId,
                                   languageId,
                                   setConsoleOutput,
                                   setIsAnswerCorrect
                               }) => {
    const runCode = async () => {
        if (!code.trim()) {
            setConsoleOutput('Please enter some code before running.');
            return;
        }

        try {
            console.log('Running code...');
            setConsoleOutput('Running code...');

            if (!languageId) {
                setConsoleOutput('Language ID not available. Cannot run the code.');
                return;
            }

            if (!user || !user.token) {
                setConsoleOutput('Authorization token is missing. Please log in again.');
                return;
            }

            const encodedCode = btoa(code);

            const payload = {
                lessonId: parseInt(lessonId, 10),
                code: encodedCode,
                languageId,
            };

            console.log('Sending request to run code with payload:', payload);

            const response = await axios.post(
                '/api/run?base64_encoded=true',
                payload,
                {
                    headers: {
                        Authorization: `Bearer ${user.token}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            console.log('Received response from server:', response.data);

            const {results} = response.data;
            if (!results || results.length === 0) {
                setConsoleOutput('No results received from the server.');
                return;
            }

            let output = 'Test Case Results:\n';
            let allPassed = true;
            results.forEach((testCase, index) => {
                const {input, expected_output, actual_output, status, compileError, error} = testCase;
                const isCorrect = actual_output.trim() === expected_output.trim();
                if (!isCorrect) {
                    allPassed = false;
                }
                output += `Test Case ${index + 1}:\n`;
                output += `Input:\n${input}\n`;
                output += `Expected Output:\n${expected_output.trim()}\n`;
                output += `Actual Output:\n${actual_output.trim()}\n`;
                output += `Status: ${isCorrect ? 'Passed' : 'Failed'}\n`;
                if (error) output += `Error: ${error}\n`;
                if (compileError) output += `Compile Error: ${compileError}\n`;
                output += `\n`;
            });

            setConsoleOutput(output);
            setIsAnswerCorrect(allPassed);

            await axios.put('/api/update-lesson-progress', {
                user_id: user.user_id,
                lesson_id: lessonId,
                completed: allPassed,
                submitted_code: code,
            }, {
                headers: {
                    Authorization: `Bearer ${user.token}`,
                },
            });

        } catch (err) {
            console.error('Error running code:', err.response?.data || err.message);
            setConsoleOutput(err.message);
        }
    };

    const copyCodeToClipboard = () => {
        navigator.clipboard.writeText(code).then(() => {
            alert('Code copied to clipboard!');
        }).catch(err => {
            console.error('Failed to copy code: ', err);
        });
    };

    return (
        <div>
            <Editor
                height="400px"
                theme="vs-dark"
                language={language}
                options={{
                    fontSize: 18,
                    lineNumbers: "on",
                    minimap: {enabled: false},
                }}
                value={code}
                onChange={(value) => setCode(value)}
            />
            <button className="run-btn" onClick={runCode}>
                Run <FaPlay/>
            </button>
            <button className="copy-btn" onClick={copyCodeToClipboard}>
                Copy Code <FaCopy/>
            </button>
        </div>
    );
};

export default MonacoEditorComponent;