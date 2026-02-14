import { memo } from "react";
import { FaRegCopy, FaCheck } from "react-icons/fa";

const toLanguageLabel = (language) => {
  if (!language) return "Plain text";

  const labels = {
    plaintext: "Plain text",
    javascript: "JavaScript",
    typescript: "TypeScript",
    python: "Python",
    html: "HTML",
    css: "CSS",
    sql: "SQL",
    bash: "Bash",
    powershell: "PowerShell",
    cpp: "C++",
    csharp: "C#",
  };

  return (
    labels[language] ||
    language
      .replace(/[-_]+/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase())
  );
};

const CodeBlock = memo(({ codeText, language }) => {
  const languageLabel = toLanguageLabel(language);

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

  return (
    <div className="code-block" style={{ contain: "layout style paint" }}>
      <span className="code-language-label">{languageLabel}</span>
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
      <pre style={{ willChange: "contents" }}>
        <code className={`hljs language-${language}`}>{codeText}</code>
      </pre>
    </div>
  );
});

CodeBlock.displayName = "CodeBlock";

export default CodeBlock;
