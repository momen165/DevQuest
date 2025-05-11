// LessonContent.js
import React, { useEffect, useState } from 'react';
import parse, { domToReact } from 'html-react-parser';
import hljs from 'highlight.js';
import { FaRegCopy, FaCheck } from 'react-icons/fa';
import 'highlight.js/styles/srcery.css';
import '../styles/LessonContent.css';

import { getFontClass } from '../utils/editorUtils';

const LessonContent = ({ content, hint, solution, failedAttempts = 0 }) => {
  const HINT_THRESHOLD = 2; // Show hint after 2 failed attempts
  const SOLUTION_THRESHOLD = 4; // Show solution after 4 failed attempts

  const [showHint, setShowHint] = useState(false);
  const [showSolution, setShowSolution] = useState(false);

  const canShowHint = failedAttempts >= HINT_THRESHOLD;
  const canShowSolution = failedAttempts >= SOLUTION_THRESHOLD;

  // Reset visibility when failedAttempts changes
  useEffect(() => {
    if (!canShowHint) setShowHint(false);
    if (!canShowSolution) setShowSolution(false);
  }, [canShowHint, canShowSolution]);

  // Initialize syntax highlighting
  useEffect(() => {
    // Remove previous highlighting
    document.querySelectorAll('pre code').forEach((block) => {
      block.removeAttribute('data-highlighted');
      // Get the raw text content without escaping
      const rawContent = block.textContent || '';
      block.textContent = rawContent;
      hljs.highlightElement(block);
    });
  }, [content, hint, solution]);

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

  const options = {
    replace: (node) => {
      if (!node || !node.name) return;

      // Dynamic filtering for empty paragraphs - handle all cases of empty paragraphs
      if (node.name === 'p') {
        // Debug to see node structure - remove this in production
        // console.log("Found paragraph node:", JSON.stringify(node, null, 2));

        // Case 1: No children
        if (!node.children || node.children.length === 0) {
          return null;
        }

        // Check if all children are just whitespace, br, or empty spans
        let hasContent = false;

        for (const child of node.children) {
          // Case 2: Text nodes with only spaces or &nbsp;
          if (child.type === 'text') {
            if (child.data && child.data.replace(/\s|\u00A0/g, '').length > 0) {
              hasContent = true;
              break;
            }
          }
          // Case 3: <br> tags (skip them, they're not content)
          else if (child.name === 'br') {
            continue;
          }
          // Case 4: Check spans and other elements recursively
          else if (child.name) {
            // If it has attribs or specific classes we care about, keep it
            if (
              child.attribs &&
              (Object.keys(child.attribs).length > 1 ||
                (child.attribs.class && child.attribs.class !== 'empty'))
            ) {
              hasContent = true;
              break;
            }

            // Check children of the element
            if (child.children && child.children.length > 0) {
              let hasSubContent = false;
              for (const subChild of child.children) {
                if (
                  subChild.type === 'text' &&
                  subChild.data &&
                  subChild.data.replace(/\s|\u00A0/g, '').length > 0
                ) {
                  hasSubContent = true;
                  break;
                }
              }
              if (hasSubContent) {
                hasContent = true;
                break;
              }
            }
          }
        }

        // If no actual content found, remove the paragraph
        if (!hasContent) {
          return null;
        }
      }

      // Special handling for figure tags that only contain tables (removes extra spacing)
      if (node.name === 'figure' && node.attribs && node.attribs.class === 'table') {
        // Return just the table inside without the figure wrapper
        for (const child of node.children || []) {
          if (child.name === 'table') {
            return (
              <table className="lesson-table">
                {child.children && domToReact(child.children, options)}
              </table>
            );
          }
        }
      }

      // Handle font family classes
      if (node.attribs && node.attribs.style && node.attribs.style.includes('font-family')) {
        const fontFamily = node.attribs.style.match(/font-family:\s*([^;]+)/)[1];
        const fontClass = getFontClass(fontFamily.split(',')[0].replace(/['"]/g, '').trim());

        if (fontClass) {
          node.attribs.class = node.attribs.class
            ? `${node.attribs.class} ${fontClass}`
            : fontClass;
        }
      }

      // Table rendering support
      if (node.name === 'table') {
        return (
          <table className="lesson-table">
            {node.children && domToReact(node.children, options)}
          </table>
        );
      }
      if (node.name === 'thead') {
        return <thead>{node.children && domToReact(node.children, options)}</thead>;
      }
      if (node.name === 'tbody') {
        return <tbody>{node.children && domToReact(node.children, options)}</tbody>;
      }
      if (node.name === 'tr') {
        return <tr>{node.children && domToReact(node.children, options)}</tr>;
      }
      if (node.name === 'th') {
        return (
          <th className="lesson-table-th">{node.children && domToReact(node.children, options)}</th>
        );
      }
      if (node.name === 'td') {
        return (
          <td className="lesson-table-td">{node.children && domToReact(node.children, options)}</td>
        );
      }

      // Handle code blocks
      if (node.name === 'pre' && node.children?.length > 0) {
        const codeNode = node.children[0];
        if (!codeNode) return;

        // Get the code text, ensuring we handle both direct text and nested content
        let codeText = '';
        if (codeNode.children && codeNode.children.length > 0) {
          codeText = codeNode.children[0]?.data || '';
        } else if (typeof codeNode === 'string') {
          codeText = codeNode;
        }

        // If code text is empty, try getting it directly from pre tag
        if (!codeText && node.children[0]?.data) {
          codeText = node.children[0].data;
        }

        const className = codeNode.attribs?.class || '';
        const language = className.replace('language-', '') || 'plaintext';

        return (
          <div className="code-block">
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
            <pre>
              <code className={`hljs language-${language}`}>{codeText}</code>
            </pre>
          </div>
        );
      }
    },
  };

  if (!content) return null;

  return (
    <div className="lesson-content">
      <div className="content-section">{parse(content, options)}</div>

      {(hint || solution) && (
        <div className="help-section">
          {hint && (
            <div className={`hint-section ${!canShowHint ? 'disabled' : ''}`}>
              <button
                onClick={() => setShowHint(!showHint)}
                className={`hint-button ${canShowHint ? 'available' : ''}`}
                disabled={!canShowHint}
              >
                💡 {showHint ? 'Hide Hint' : 'Show Hint'}
                {!canShowHint && (
                  <span className="attempts-needed">
                    (Available after {HINT_THRESHOLD - failedAttempts} more failed attempts)
                  </span>
                )}
              </button>
              {showHint && canShowHint && <div className="hint-content">{parse(hint)}</div>}
            </div>
          )}

          {solution && (
            <div className={`solution-section ${!canShowSolution ? 'disabled' : ''}`}>
              <button
                onClick={() => setShowSolution(!showSolution)}
                className={`solution-button ${canShowSolution ? 'available' : ''}`}
                disabled={!canShowSolution}
              >
                ✨ {showSolution ? 'Hide Solution' : 'Show Solution'}
                {!canShowSolution && (
                  <span className="attempts-needed">
                    (Available after {SOLUTION_THRESHOLD - failedAttempts} more failed attempts)
                  </span>
                )}
              </button>
              {showSolution && canShowSolution && (
                <div className="solution-content">{parse(solution)}</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LessonContent;
