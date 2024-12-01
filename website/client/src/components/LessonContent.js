import React, { useEffect, useRef } from 'react';
import hljs from 'highlight.js';
import 'highlight.js/styles/srcery.css';
import { FaCopy } from 'react-icons/fa';
import 'styles/LessonContent.css';
import ReactDOM from 'react-dom';

const LessonContent = ({ content }) => {
    useEffect(() => {
        document.querySelectorAll('.lesson-content pre code').forEach((block) => {
            hljs.highlightElement(block);
        });
    }, [content]);

    const copyCodeToClipboard = (code) => {
        navigator.clipboard.writeText(code).then(() => {
            alert('Code copied to clipboard!');
        }).catch(err => {
            console.error('Failed to copy code: ', err);
        });
    };

    useEffect(() => {
        document.querySelectorAll('.lesson-content pre').forEach((pre) => {
            if (!pre.querySelector('.unique-copy-btn')) {
                const button = document.createElement('button');
                button.className = 'unique-copy-btn';
                button.onclick = () => copyCodeToClipboard(pre.innerText);

                // Create a span to hold the icon
                const iconSpan = document.createElement('span');
                iconSpan.className = 'unique-icon';

                // Use React to render the icon into the span
                ReactDOM.render(<FaCopy />, iconSpan);

                button.appendChild(iconSpan);
                pre.insertBefore(button, pre.firstChild);
            }
        });
    }, [content]);

    return (
        <div
            className="lesson-content"
            dangerouslySetInnerHTML={{ __html: content }}
        ></div>
    );
};

export default LessonContent;