import React, { useEffect } from 'react';
import hljs from 'highlight.js';
import 'highlight.js/styles/srcery.css';

const LessonContent = ({ content }) => {
    useEffect(() => {
        document.querySelectorAll('pre code').forEach((block) => {
            hljs.highlightElement(block);
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