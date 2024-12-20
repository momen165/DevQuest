﻿// LessonContent.js
import React, {useEffect} from 'react';
import parse, {domToReact} from 'html-react-parser';
import hljs from 'highlight.js';
import 'highlight.js/styles/srcery.css';
import { FaCopy } from 'react-icons/fa';
import 'styles/LessonContent.css';

const LessonContent = ({ content }) => {
  const copyCodeToClipboard = (code) => {
    navigator.clipboard.writeText(code)
        .then(() => {
          alert('Code copied to clipboard!');
        })
        .catch((err) => {
          console.error('Failed to copy code: ', err);
        });
  };

  useEffect(() => {
    document.querySelectorAll('pre code').forEach((block) => {
      hljs.highlightElement(block);
    });
  }, [content]);

  const options = {
    replace: (node) => {
      if (node.name === 'pre' && node.children.length > 0) {
        const codeNode = node.children[0];
        const className = codeNode.attribs.class || '';
        const language = className.replace('language-', '');

        const codeText = codeNode.children[0]?.data || '';

        return (
            <div className="code-block">
              <button
                  className="unique-copy-btn"
                  onClick={() => copyCodeToClipboard(codeText)}
              >
                <FaCopy className="unique-icon"/>
              </button>
              <pre>
              <code className={className}>
                {codeText}
              </code>
            </pre>
            </div>
        );
      }
    },
  };

  return (
      <div className="lesson-content">
        {parse(content, options)}
      </div>
  );
};

export default LessonContent;