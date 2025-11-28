import React from 'react';
import { FaRegCopy, FaCheck } from 'react-icons/fa';

const CodeBlock = ({ codeText, language }) => {
  const copyCodeToClipboard = (code, event) => {
    const button = event.currentTarget;

    navigator.clipboard
      .writeText(code)
      .then(() => {
        button.focus();
        setTimeout(() => {
          button.blur();
        }, 2000);
      })
      .catch((err) => {
        console.error('Failed to copy code: ', err);
      });
  };

  return (
    <div className="code-block" style={{ contain: 'layout style paint' }}>
      <button className="copy" onClick={(e) => copyCodeToClipboard(codeText, e)}>
        <span
          className="tooltip"
          data-text-initial="Copy to clipboard"
          data-text-end="Copied!"
        ></span>
        <span>
          <FaRegCopy className="clipboard" />
          <FaCheck className="checkmark" />
        </span>
      </button>
      <pre style={{ willChange: 'contents' }}>
        <code className={`hljs language-${language}`}>{codeText}</code>
      </pre>
    </div>
  );
};

export default CodeBlock;