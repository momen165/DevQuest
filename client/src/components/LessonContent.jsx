// LessonContent.js
import React, { useEffect, useState, memo } from 'react';
import parse, { domToReact } from 'html-react-parser';
import 'styles/LessonContent.css';

import { getFontClass } from 'utils/editorUtils';
import { useOptimizedHighlighting } from 'hooks/useOptimizedHighlighting';
import { loadCSSAsync } from 'utils/performanceUtils';
import { loadAdditionalFonts } from 'utils/fontLoader';

import CodeBlock from './CodeBlock'; // Import the new CodeBlock component
import HelpSection from './HelpSection'; // Import the new HelpSection component

const LessonContent = ({ content, hint, solution, failedAttempts = 0, currentLessonProgress, onRequestProgressRefresh }) => {
  const [highlightCSSLoaded, setHighlightCSSLoaded] = useState(false);
  const [isAboveFold, setIsAboveFold] = useState(true);
  const [showHelpSection, setShowHelpSection] = useState(false);

  // Lazy load highlight.js CSS only when needed
  useEffect(() => {
    if (content && !highlightCSSLoaded) {
      const hasCodeBlocks = content.includes('<pre') || content.includes('<code');
      if (hasCodeBlocks) {
        loadCSSAsync('https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/styles/srcery.min.css');
        setHighlightCSSLoaded(true);
      }
    }
  }, [content, highlightCSSLoaded]);

  // Load additional fonts asynchronously for better LCP
  useEffect(() => {
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
    }, isAboveFold ? 1000 : 100);
    return () => clearTimeout(timer);
  }, [isAboveFold]);

  // Use optimized syntax highlighting hook
  useOptimizedHighlighting([content, hint, solution]);

  const replaceParagraphs = (node) => {
    if (!node.children || node.children.length === 0) {
      return null;
    }

    let hasContent = false;
    for (const child of node.children) {
      if (child.type === 'text') {
        if (child.data && child.data.replace(/\s|\u00A0/g, '').length > 0) {
          hasContent = true;
          break;
        }
      } else if (child.name === 'br') {
        continue;
      } else if (child.name) {
        if (
          child.attribs &&
          (Object.keys(child.attribs).length > 1 ||
            (child.attribs.class && child.attribs.class !== 'empty'))
        ) {
          hasContent = true;
          break;
        }
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
    return hasContent ? undefined : null; // undefined means keep the node, null means remove
  };

  const replaceFigures = (node) => {
    if (node.attribs && node.attribs.class === 'table') {
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
    return undefined;
  };

  const applyFontClasses = (node) => {
    if (node.attribs && node.attribs.style && node.attribs.style.includes('font-family')) {
      const fontFamily = node.attribs.style.match(/font-family:\s*([^;]+)/)[1];
      const fontClass = getFontClass(fontFamily.split(',')[0].replace(/['"]/g, '').trim());

      if (fontClass) {
        node.attribs.class = node.attribs.class
          ? `${node.attribs.class} ${fontClass}`
          : fontClass;
      }
    }
    return undefined;
  };

  const replaceTables = (node) => {
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
    return undefined;
  };

  const replaceCodeBlocks = (node) => {
    if (node.name === 'pre' && node.children?.length > 0) {
      const codeNode = node.children[0];
      if (!codeNode) return;

      let codeText = '';
      if (codeNode.children && codeNode.children.length > 0) {
        codeText = codeNode.children[0]?.data || '';
      } else if (typeof codeNode === 'string') {
        codeText = codeNode;
      }

      if (!codeText && node.children[0]?.data) {
        codeText = node.children[0].data;
      }

      const className = codeNode.attribs?.class || '';
      const language = className.replace('language-', '') || 'plaintext';
      return <CodeBlock codeText={codeText} language={language} />;
    }
    return undefined;
  };

  const options = {
    replace: (node) => {
      if (!node || !node.name) return;

      // Order matters for replacements
      const replacements = [
        { name: 'p', handler: replaceParagraphs },
        { name: 'figure', handler: replaceFigures },
        { name: 'table', handler: replaceTables },
        { name: 'thead', handler: replaceTables },
        { name: 'tbody', handler: replaceTables },
        { name: 'tr', handler: replaceTables },
        { name: 'th', handler: replaceTables },
        { name: 'td', handler: replaceTables },
        { name: 'pre', handler: replaceCodeBlocks },
      ];

      for (const replacement of replacements) {
        if (node.name === replacement.name) {
          const result = replacement.handler(node);
          if (result !== undefined) {
            return result;
          }
        }
      }

      // Apply font classes to span elements with inline styles
      if (node.name === 'span' && node.attribs && node.attribs.style) {
        applyFontClasses(node);
      }

      return undefined;
    },
  };

  return (
    <div className="lesson-content">
      <div className="content-section" style={{ contain: 'layout style' }}>
        {parse(content, options)}
      </div>      {showHelpSection && (
        <HelpSection
          hint={hint}
          solution={solution}
          failedAttempts={failedAttempts}
          currentLessonProgress={currentLessonProgress}
          onRequestProgressRefresh={onRequestProgressRefresh}
        />
      )}
    </div>
  );
};

export default memo(LessonContent);
