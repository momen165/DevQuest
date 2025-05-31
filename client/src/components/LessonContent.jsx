// LessonContent.js
import React, { useEffect, useState, memo } from 'react';
import parse, { domToReact } from 'html-react-parser';
import { FaRegCopy, FaCheck } from 'react-icons/fa';
import '../styles/LessonContent.css';

import { getFontClass } from '../utils/editorUtils';
import { useOptimizedHighlighting } from '../hooks/useOptimizedHighlighting';
import { loadCSSAsync } from '../utils/performanceUtils';
import { loadAdditionalFonts } from '../utils/fontLoader';

import axios from 'axios';
import { useAuth } from '../AuthContext';
import { useParams } from 'react-router-dom';

const LessonContent = ({ content, hint, solution, failedAttempts = 0 }) => {
  const HINT_THRESHOLD = 2; // Show hint after 2 failed attempts
  const SOLUTION_THRESHOLD = 4; // Show solution after 4 failed attempts

  const [showHint, setShowHint] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [dynamicHint, setDynamicHint] = useState(hint);
  const [dynamicSolution, setDynamicSolution] = useState(solution);
  const { user } = useAuth();
  const { lessonId } = useParams();

  // Axios instance for API
  const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
    timeout: 10000,
    validateStatus: (status) => true,
  });
  const [hintUnlocked, setHintUnlocked] = useState(false);
  const [solutionUnlocked, setSolutionUnlocked] = useState(false);  const [highlightCSSLoaded, setHighlightCSSLoaded] = useState(false);
  const [isAboveFold, setIsAboveFold] = useState(true);
  const [showHelpSection, setShowHelpSection] = useState(false);
  // Track the attempt at which the hint was unlocked
  const [hintUnlockAttempt, setHintUnlockAttempt] = useState(null);
  const canShowHint = hintUnlocked || failedAttempts >= HINT_THRESHOLD;
  // Solution unlocks after 2 more failed attempts after hint is unlocked
  const canShowSolution =
    solutionUnlocked ||
    (hintUnlocked && hintUnlockAttempt !== null && failedAttempts >= hintUnlockAttempt + 2);

  // On mount, fetch lesson progress to check unlock status
  useEffect(() => {
    if (!user || !lessonId) return;
    (async () => {
      try {
        const res = await api.get(
          `/lesson-progress?user_id=${user.user_id}&lesson_id=${lessonId}`,
          {
            headers: { Authorization: `Bearer ${user?.token}` },
          }
        );
        if (res.status === 200 && res.data) {
          if (res.data.hint_unlocked) {
            setHintUnlocked(true);
            setShowHint(true);
            // If this is the first time unlocking, record the attempt number
            setHintUnlockAttempt((prev) => (prev !== null ? prev : failedAttempts));
            // Fetch hint if not present
            if (!dynamicHint) {
              const hintRes = await api.get(`/lesson/${lessonId}?showHint=true`, {
                headers: { Authorization: `Bearer ${user?.token}` },
              });
              if (hintRes.status === 200 && hintRes.data.hint) {
                setDynamicHint(hintRes.data.hint);
              }
            }
          } else {
            setHintUnlocked(false);
            setHintUnlockAttempt(null);
          }
          if (res.data.solution_unlocked) {
            setSolutionUnlocked(true);
            setShowSolution(true);
            // Fetch solution if not present
            if (!dynamicSolution) {
              const solRes = await api.get(`/lesson/${lessonId}?showSolution=true`, {
                headers: { Authorization: `Bearer ${user?.token}` },
              });
              if (solRes.status === 200 && solRes.data.solution) {
                setDynamicSolution(solRes.data.solution);
              }
            }
          } else {
            setSolutionUnlocked(false);
          }
        }
      } catch (e) {}
    })();
    // eslint-disable-next-line
  }, [user, lessonId, failedAttempts]);

  // Reset visibility and dynamic hint/solution when failedAttempts changes (unless already unlocked)
  useEffect(() => {
    if (!canShowHint && !showHint) {
      setShowHint(false);
      setDynamicHint(hint);
    }
    if (!canShowSolution && !showSolution) {
      setShowSolution(false);
      setDynamicSolution(solution);
    }
  }, [canShowHint, canShowSolution, hint, solution, showHint, showSolution]);

  // Fetch hint from backend if needed and unlock it persistently
  useEffect(() => {
    if (showHint && canShowHint && !dynamicHint) {
      (async () => {
        try {
          // Unlock hint in DB
          await api.post(
            `/lesson/${lessonId}/unlock-hint`,
            {},
            {
              headers: { Authorization: `Bearer ${user?.token}` },
            }
          );
          // Fetch hint
          const res = await api.get(`/lesson/${lessonId}?showHint=true`, {
            headers: { Authorization: `Bearer ${user?.token}` },
          });
          if (res.status === 200 && res.data.hint) {
            setDynamicHint(res.data.hint);
          }
        } catch (e) {}
      })();
    }
  }, [showHint, canShowHint, dynamicHint, lessonId, user]);

  // Fetch solution from backend if needed and unlock it persistently
  useEffect(() => {
    if (showSolution && canShowSolution && !dynamicSolution) {
      (async () => {
        try {
          await api.post(
            `/lesson/${lessonId}/unlock-solution`,
            {},
            {
              headers: { Authorization: `Bearer ${user?.token}` },
            }
          );
          const res = await api.get(`/lesson/${lessonId}?showSolution=true`, {
            headers: { Authorization: `Bearer ${user?.token}` },
          });
          if (res.status === 200 && res.data.solution) {
            setDynamicSolution(res.data.solution);
          }
        } catch (e) {}
      })();
    }  }, [showSolution, canShowSolution, dynamicSolution, lessonId, user]);
  // Lazy load highlight.js CSS only when needed
  useEffect(() => {
    if (content && !highlightCSSLoaded) {
      // Check if content contains code blocks
      const hasCodeBlocks = content.includes('<pre') || content.includes('<code');
      if (hasCodeBlocks) {
        import('highlight.js/styles/srcery.css').then(() => {
          setHighlightCSSLoaded(true);
        }).catch(() => {
          // Fallback: load via loadCSSAsync
          loadCSSAsync('https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/styles/srcery.min.css');
          setHighlightCSSLoaded(true);
        });
      }
    }
  }, [content, highlightCSSLoaded]);
  // Load additional fonts asynchronously for better LCP
  useEffect(() => {
    // Delay font loading to prioritize critical content
    const timer = setTimeout(() => {
      loadAdditionalFonts();
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);
  // Detect if content is above the fold
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsAboveFold(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );

    const contentElement = document.querySelector('.lesson-content');
    if (contentElement) {
      observer.observe(contentElement);
    }

    return () => observer.disconnect();
  }, []);

  // Delay help section loading to improve LCP
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowHelpSection(true);
    }, isAboveFold ? 1000 : 100); // Longer delay if above fold
    
    return () => clearTimeout(timer);
  }, [isAboveFold]);

  // Use optimized syntax highlighting hook
  useOptimizedHighlighting([content, hint, solution]);

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
        const language = className.replace('language-', '') || 'plaintext';        return (
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
      }
    },
  };
  if (!content) return null;

  return (
    <div className="lesson-content">
      <div className="content-section" style={{ contain: 'layout style' }}>
        {parse(content, options)}
      </div>      {/* Defer help section loading to improve LCP */}
      {showHelpSection && (
        <div className="help-section" style={{ contain: 'layout style' }}>
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
            {showHint && canShowHint && (dynamicHint || hint) && (
              <div className="hint-content">{parse(dynamicHint || hint)}</div>
            )}
          </div>

          <div className={`solution-section ${!canShowSolution ? 'disabled' : ''}`}>
            <button
              onClick={() => setShowSolution(!showSolution)}
              className={`solution-button ${canShowSolution ? 'available' : ''}`}
              disabled={!canShowSolution}
            >
              ✨ {showSolution ? 'Hide Solution' : 'Show Solution'}
              {!canShowSolution && (
                <span className="attempts-needed">
                  {hintUnlocked && hintUnlockAttempt !== null
                    ? `(Available after ${
                        hintUnlockAttempt + 2 - failedAttempts
                      } more failed attempts)`
                    : `(Available after ${SOLUTION_THRESHOLD - failedAttempts} more failed attempts)`}
                </span>
              )}
            </button>
            {showSolution && canShowSolution && (dynamicSolution || solution) && (
              <div className="solution-content">{parse(dynamicSolution || solution)}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default memo(LessonContent);
