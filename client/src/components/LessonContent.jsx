// LessonContent.js
import React, { useEffect, useState } from "react";
import parse from "html-react-parser";
import hljs from "highlight.js";
import { FaRegCopy, FaCheck } from "react-icons/fa";
import "highlight.js/styles/srcery.css";
import "styles/LessonContent.css";

import { getFontClass } from "../utils/editorUtils";

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
    document.querySelectorAll("pre code").forEach((block) => {
      block.removeAttribute("data-highlighted");
      // Get the raw text content without escaping
      const rawContent = block.textContent || "";
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
        console.error("Failed to copy code: ", err);
      });
  };

  const options = {
    replace: (node) => {
      if (!node || !node.name) return;

      // Handle font family classes
      if (
        node.attribs &&
        node.attribs.style &&
        node.attribs.style.includes("font-family")
      ) {
        const fontFamily = node.attribs.style.match(
          /font-family:\s*([^;]+)/,
        )[1];
        const fontClass = getFontClass(
          fontFamily.split(",")[0].replace(/['"]/g, "").trim(),
        );

        if (fontClass) {
          node.attribs.class = node.attribs.class
            ? `${node.attribs.class} ${fontClass}`
            : fontClass;
        }
      }

      if (node.name === "pre" && node.children?.length > 0) {
        const codeNode = node.children[0];
        if (!codeNode) return;

        // Get the code text, ensuring we handle both direct text and nested content
        let codeText = "";
        if (codeNode.children && codeNode.children.length > 0) {
          codeText = codeNode.children[0]?.data || "";
        } else if (typeof codeNode === "string") {
          codeText = codeNode;
        }

        // If code text is empty, try getting it directly from pre tag
        if (!codeText && node.children[0]?.data) {
          codeText = node.children[0].data;
        }

        const className = codeNode.attribs?.class || "";
        const language = className.replace("language-", "") || "plaintext";

        return (
          <div className="code-block">
            <button
              className="copy"
              onClick={(e) => copyCodeToClipboard(codeText, e)}
            >
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
            <div className={`hint-section ${!canShowHint ? "disabled" : ""}`}>
              <button
                onClick={() => setShowHint(!showHint)}
                className={`hint-button ${canShowHint ? "available" : ""}`}
                disabled={!canShowHint}
              >
                💡 {showHint ? "Hide Hint" : "Show Hint"}
                {!canShowHint && (
                  <span className="attempts-needed">
                    (Available after {HINT_THRESHOLD - failedAttempts} more
                    failed attempts)
                  </span>
                )}
              </button>
              {showHint && canShowHint && (
                <div className="hint-content">{parse(hint)}</div>
              )}
            </div>
          )}

          {solution && (
            <div
              className={`solution-section ${!canShowSolution ? "disabled" : ""}`}
            >
              <button
                onClick={() => setShowSolution(!showSolution)}
                className={`solution-button ${canShowSolution ? "available" : ""}`}
                disabled={!canShowSolution}
              >
                ✨ {showSolution ? "Hide Solution" : "Show Solution"}
                {!canShowSolution && (
                  <span className="attempts-needed">
                    (Available after {SOLUTION_THRESHOLD - failedAttempts} more
                    failed attempts)
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
