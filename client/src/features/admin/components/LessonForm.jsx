import React, {
  Suspense,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  FiSave,
  FiTrash2,
  FiEdit2,
  FiPlus,
  FiFileText,
  FiBook,
  FiAward,
  FiCode,
  FiTerminal,
  FiHelpCircle,
  FiCheckCircle,
  FiX,
  FiEye,
  FiEyeOff,
  FiMonitor,
  FiSmartphone,
} from "react-icons/fi";
import "./AdminManage.css";
import TestCaseManager from "features/editor/components/TestCaseManager";
import LoadingSpinner from "shared/ui/LoadingSpinner";
import ErrorAlert from "./ErrorAlert";
import { decode as decodeEntities } from "entities";
import { languageMappings } from "features/lesson/utils/lessonConstants";
import { validateRequired, validateNumberRange } from "shared/utils/formValidation";
import apiClient from "shared/lib/apiClient";
import { useBeforeUnload } from "react-router-dom";

const CustomEditor = React.lazy(() => import("features/editor/components/CustomEditor"));
const SimpleMonacoEditor = React.lazy(
  () => import("features/editor/components/SimpleMonacoEditor")
);

const DEFAULT_LESSON_TEMPLATE = `<div class="lesson-template">
  <h1 class="lesson-template-heading">Exercise</h1>
... [truncated for brevity, keep existing constant]
</div>`;

const escapeHtml = (value = "") =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const buildPreviewDocument = ({ lessonName, content }) => {
  const safeLessonName = escapeHtml(lessonName?.trim() || "Untitled lesson");
  const hasContent = Boolean(content?.trim());
  const previewContent = hasContent
    ? content
    : `<p class="lesson-empty-state">Start writing lesson content to see a live learner preview.</p>`;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1.0" />
    <link
      rel="stylesheet"
      href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css"
    />
    <style>
      :root {
        color-scheme: dark;
        --bg: #0f172a;
        --panel: #111827;
        --text: #e2e8f0;
        --muted: #94a3b8;
        --accent: #818cf8;
        --border: rgba(129, 140, 248, 0.25);
      }
      * {
        box-sizing: border-box;
      }
      body {
        margin: 0;
        background: radial-gradient(circle at top, #1e293b 0%, #0f172a 60%);
        color: var(--text);
        font-family: "Lato", "Segoe UI", sans-serif;
      }
      .lesson-shell {
        max-width: 860px;
        margin: 0 auto;
        padding: 28px 24px 36px;
      }
      .lesson-meta {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 6px 10px;
        border-radius: 999px;
        border: 1px solid var(--border);
        color: var(--accent);
        font-size: 12px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      .lesson-title {
        margin: 14px 0 18px;
        font-size: clamp(24px, 2.4vw, 32px);
        line-height: 1.2;
      }
      .lesson-content {
        background: linear-gradient(180deg, rgba(15, 23, 42, 0.8), rgba(2, 6, 23, 0.9));
        border: 1px solid rgba(148, 163, 184, 0.2);
        border-radius: 14px;
        padding: 22px;
      }
      .lesson-content h1,
      .lesson-content h2,
      .lesson-content h3 {
        color: #c7d2fe;
        margin-top: 0;
      }
      .lesson-content p {
        color: var(--text);
        line-height: 1.65;
      }
      .lesson-content pre {
        background: #020617;
        border: 1px solid rgba(148, 163, 184, 0.25);
        border-radius: 10px;
        padding: 14px;
        overflow-x: auto;
      }
      .lesson-content code {
        font-family: "Fira Code", "Consolas", monospace;
        font-size: 13px;
      }
      .lesson-content .hljs {
        background: #020617;
        border-radius: 10px;
      }
      .lesson-content table {
        width: 100%;
        border-collapse: collapse;
      }
      .lesson-content th,
      .lesson-content td {
        border: 1px solid rgba(148, 163, 184, 0.25);
        padding: 8px;
      }
      .lesson-content p.editor-warning-box {
        margin: 1em 0;
        padding: 12px 14px;
        border-radius: 10px;
        background: rgba(251, 146, 60, 0.15);
        border: 1px solid rgba(251, 146, 60, 0.4);
        color: #fdba74;
      }
      .lesson-empty-state {
        margin: 0;
        color: var(--muted);
      }
    </style>
  </head>
  <body>
    <main class="lesson-shell">
      <span class="lesson-meta">Learner View</span>
      <h1 class="lesson-title">${safeLessonName}</h1>
      <section class="lesson-content">${previewContent}</section>
    </main>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
    <script>
      (function applySyntaxHighlighting() {
        if (!window.hljs) return;

        document.querySelectorAll("pre").forEach(function(pre) {
          const code = pre.querySelector("code");
          if (!code) return;

          const preClass = pre.className || "";
          const preLanguage = preClass.match(/language-([a-z0-9_+-]+)/i);
          if (preLanguage && !code.className.includes("language-")) {
            code.classList.add("language-" + preLanguage[1]);
          }

          window.hljs.highlightElement(code);
        });
      })();
    </script>
  </body>
</html>`;
};

const createDraftSnapshot = ({
  lessonName,
  editorData,
  xp,
  templateCode,
  hint,
  solution,
  testCases,
}) =>
  JSON.stringify({
    lessonName,
    editorData,
    xp: Number.isNaN(Number(xp)) ? 0 : Number(xp),
    templateCode,
    hint,
    solution,
    testCases: (testCases || []).map((testCase) => ({
      input: testCase.input || "",
      expected_output: testCase.expected_output || "",
      auto_detect: Boolean(testCase.auto_detect),
      use_pattern: Boolean(testCase.use_pattern),
      pattern: testCase.pattern || "",
    })),
  });

const LessonForm = ({ section, lesson = null, languageId, onSave, onCancel, onDelete }) => {
  // Helper function for default test case
  const getDefaultTestCase = () => ({
    input: "",
    expected_output: "",
    auto_detect: false,
    use_pattern: false,
    pattern: "",
  });

  // Group related state together
  const [lessonName, setLessonName] = useState(lesson?.name || "");
  const [editorData, setEditorData] = useState(() => lesson?.content || DEFAULT_LESSON_TEMPLATE);
  const [xp, setXp] = useState(lesson?.xp || 0);
  const [templateCode, setTemplateCode] = useState(() => {
    if (lesson?.template_code) {
      return decodeEntities(lesson.template_code);
    }
    return "";
  });
  const [hint, setHint] = useState(lesson?.hint || "");
  const [solution, setSolution] = useState(lesson?.solution || "");
  const [previewViewport, setPreviewViewport] = useState("desktop");
  const [isPreviewEnabled, setIsPreviewEnabled] = useState(true);
  const [isSyncScrollEnabled, setIsSyncScrollEnabled] = useState(true);
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [previewFrameReadyTick, setPreviewFrameReadyTick] = useState(0);

  // UI state
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const previewFrameRef = useRef(null);
  const editorScrollRef = useRef(null);
  const isSyncingScrollRef = useRef(false);
  const lastScrollRatioRef = useRef(0);

  // Test cases state
  const [test_cases, setTestCases] = useState(() => {
    if (lesson?.test_cases) {
      try {
        const cases = Array.isArray(lesson.test_cases)
          ? lesson.test_cases
          : JSON.parse(lesson.test_cases);
        return cases.map((test) => ({
          input: test.input || "",
          expected_output: test.auto_detect ? "" : test.expected_output || "",
          auto_detect: test.auto_detect === true,
          use_pattern: test.use_pattern === true,
          pattern: test.pattern || "",
        }));
      } catch (error) {
        console.error("Error parsing test cases:", error);
        return [getDefaultTestCase()];
      }
    }
    return [getDefaultTestCase()];
  });

  const courseCodeLanguage = useMemo(() => {
    if (!languageId) return "plaintext";
    return languageMappings[languageId] || "plaintext";
  }, [languageId]);

  const draftSnapshot = useMemo(
    () =>
      createDraftSnapshot({
        lessonName,
        editorData,
        xp,
        templateCode,
        hint,
        solution,
        testCases: test_cases,
      }),
    [lessonName, editorData, xp, templateCode, hint, solution, test_cases]
  );

  const [savedSnapshot, setSavedSnapshot] = useState(draftSnapshot);
  const isDirty = draftSnapshot !== savedSnapshot;

  useBeforeUnload(
    useCallback(
      (event) => {
        if (!isDirty) return;
        event.preventDefault();
        event.returnValue = "";
      },
      [isDirty]
    )
  );

  useEffect(() => {
    if (!isDirty) return undefined;

    const handleLinkNavigation = (event) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const target = event.target;
      if (!(target instanceof Element)) return;

      const anchor = target.closest("a[href]");
      if (!anchor) return;
      if (anchor.getAttribute("target") === "_blank") return;

      const nextUrl = new URL(anchor.href, window.location.href);
      const currentUrl = new URL(window.location.href);
      const isSameLocation =
        nextUrl.pathname === currentUrl.pathname &&
        nextUrl.search === currentUrl.search &&
        nextUrl.hash === currentUrl.hash;

      if (isSameLocation) return;

      const shouldLeave = window.confirm(
        "You have unsaved changes. Are you sure you want to leave this page?"
      );
      if (!shouldLeave) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    document.addEventListener("click", handleLinkNavigation, true);
    return () => document.removeEventListener("click", handleLinkNavigation, true);
  }, [isDirty]);

  useEffect(() => {
    if (!isPreviewEnabled || !isSyncScrollEnabled) return;

    const editorScrollElement = editorScrollRef.current;
    const previewDocument = previewFrameRef.current?.contentDocument;
    const previewScrollElement =
      previewDocument?.scrollingElement ||
      previewDocument?.documentElement ||
      previewDocument?.body;

    if (!editorScrollElement || !previewScrollElement) return;

    const getScrollRatio = (element) => {
      const maxScroll = element.scrollHeight - element.clientHeight;
      if (maxScroll <= 0) return 0;
      return Math.min(1, Math.max(0, element.scrollTop / maxScroll));
    };

    const applyRatio = (element, ratio) => {
      const maxScroll = element.scrollHeight - element.clientHeight;
      if (maxScroll <= 0) return;
      element.scrollTop = ratio * maxScroll;
    };

    const syncFromEditor = () => {
      if (isSyncingScrollRef.current) return;
      isSyncingScrollRef.current = true;
      const ratio = getScrollRatio(editorScrollElement);
      lastScrollRatioRef.current = ratio;
      applyRatio(previewScrollElement, ratio);
      window.requestAnimationFrame(() => {
        isSyncingScrollRef.current = false;
      });
    };

    const syncFromPreview = () => {
      if (isSyncingScrollRef.current) return;
      isSyncingScrollRef.current = true;
      const ratio = getScrollRatio(previewScrollElement);
      lastScrollRatioRef.current = ratio;
      applyRatio(editorScrollElement, ratio);
      window.requestAnimationFrame(() => {
        isSyncingScrollRef.current = false;
      });
    };

    editorScrollElement.addEventListener("scroll", syncFromEditor, { passive: true });
    previewScrollElement.addEventListener("scroll", syncFromPreview, { passive: true });

    // Keep preview aligned after iframe reloads/content updates.
    window.requestAnimationFrame(() => {
      applyRatio(previewScrollElement, lastScrollRatioRef.current);
    });

    return () => {
      editorScrollElement.removeEventListener("scroll", syncFromEditor);
      previewScrollElement.removeEventListener("scroll", syncFromPreview);
    };
  }, [isPreviewEnabled, isSyncScrollEnabled, previewFrameReadyTick, previewViewport]);

  // Validation function
  const validate = () => {
    const nameValidation = validateRequired(lessonName, "Lesson name");
    if (!nameValidation.isValid) {
      setError(nameValidation.error);
      return false;
    }

    const xpValidation = validateNumberRange(xp, { min: 0, fieldName: "XP" });
    if (!xpValidation.isValid) {
      setError(xpValidation.error);
      return false;
    }

    for (let i = 0; i < test_cases.length; i++) {
      const testCase = test_cases[i];
      if (!testCase.auto_detect && !testCase.use_pattern && !testCase.expected_output.trim()) {
        setError(
          `Test case ${i + 1}: Expected output is required when not using auto-detect or pattern validation`
        );
        return false;
      }

      if (testCase.use_pattern && !testCase.pattern.trim()) {
        setError(`Test case ${i + 1}: Pattern is required when pattern validation is enabled`);
        return false;
      }
    }

    return true;
  };

  const handleSave = async () => {
    if (!validate()) {
      return;
    }

    setIsSaving(true);
    setError("");

    const processedTestCases = test_cases.map((test) => ({
      input: test.input || "",
      auto_detect: test.auto_detect === true,
      use_pattern: test.use_pattern === true,
      pattern: test.pattern || "",
      expected_output: test.auto_detect ? "" : test.expected_output || "",
    }));

    try {
      const lessonData = {
        section_id: section.section_id,
        name: lessonName,
        content: editorData,
        xp: parseInt(xp),
        test_cases: processedTestCases,
        template_code: templateCode,
        hint,
        solution,
        auto_detect: test_cases[0]?.auto_detect || false,
      };

      const url = lesson ? `/lesson/${lesson.lesson_id}` : "/lesson";

      const method = lesson ? "put" : "post";

      const response = await apiClient[method](url, lessonData, {
        headers: { "Content-Type": "application/json" },
      });

      if (response.status === 200 || response.status === 201) {
        setSavedSnapshot(draftSnapshot);
        setLastSavedAt(new Date());
        onSave(response.data);
      } else {
        setError(`Failed to ${lesson ? "update" : "create"} lesson`);
      }
    } catch (err) {
      console.error("Error saving lesson:", err);
      setError(err.response?.data?.message || "An error occurred while saving the lesson");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!lesson?.lesson_id) return;
    if (!window.confirm("Are you sure you want to delete this lesson?")) return;
    try {
      await apiClient.delete(`/lesson/${lesson.lesson_id}`);
      setSavedSnapshot(null);
      onDelete(lesson.lesson_id);
    } catch (err) {
      console.error("Error deleting lesson:", err);
      alert("Failed to delete lesson.");
    }
  };

  const handleCancel = () => {
    if (isDirty) {
      const shouldDiscard = window.confirm(
        "You have unsaved changes. Discard them and leave the editor?"
      );
      if (!shouldDiscard) return;
    }
    onCancel();
  };

  const editorFallback = <LoadingSpinner center={false} message="Loading editor..." />;
  const deferredEditorData = useDeferredValue(editorData);
  const previewDocument = useMemo(
    () => buildPreviewDocument({ lessonName, content: deferredEditorData }),
    [lessonName, deferredEditorData]
  );
  const saveStatusText = isDirty
    ? "Unsaved changes"
    : lastSavedAt
      ? `Saved ${lastSavedAt.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })}`
      : "All changes saved";

  return (
    <div className={`form-container ${isSaving ? "form-loading" : ""}`}>
      {isSaving && <LoadingSpinner message="Saving lesson..." fullScreen />}
      {error && <ErrorAlert message={error} onClose={() => setError("")} />}

      <div className="form-header">
        <h3 className="form-title">
          {lesson ? <FiEdit2 size={20} /> : <FiPlus size={20} />}
          {lesson ? "Edit Lesson" : "Add New Lesson"}
        </h3>
      </div>

      <form className="lesson-form">
        <div className="lesson-context-bar">
          <div className="lesson-context-bar-main">
            <p className="lesson-context-path">
              {section?.name || "Section"} / {lessonName?.trim() || "Untitled lesson"}
            </p>
            <p className={`lesson-context-status ${isDirty ? "dirty" : "saved"}`}>
              {saveStatusText}
            </p>
          </div>
          <div className="lesson-context-bar-actions">
            <button
              type="button"
              className={`preview-toggle-btn ${isPreviewEnabled ? "active" : ""}`}
              onClick={() => setIsPreviewEnabled((prev) => !prev)}
            >
              {isPreviewEnabled ? <FiEyeOff size={14} /> : <FiEye size={14} />}
              {isPreviewEnabled ? "Hide Preview" : "Show Preview"}
            </button>
            <button
              type="button"
              className={`preview-toggle-btn ${isSyncScrollEnabled ? "active" : ""}`}
              onClick={() => setIsSyncScrollEnabled((prev) => !prev)}
              disabled={!isPreviewEnabled}
            >
              Sync Scroll {isSyncScrollEnabled ? "On" : "Off"}
            </button>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">
            <FiFileText size={14} /> Lesson Name
          </label>
          <input
            type="text"
            className="form-input"
            value={lessonName}
            onChange={(e) => setLessonName(e.target.value)}
            placeholder="Enter a descriptive name for the lesson"
          />
        </div>

        <div className="form-group">
          <label className="form-label">
            <FiBook size={14} /> Lesson Content
          </label>
          <div
            className={`lesson-content-workspace ${!isPreviewEnabled ? "preview-disabled" : ""}`}
          >
            <div className="lesson-content-editor">
              <div className="editor-container">
                <Suspense fallback={editorFallback}>
                  <CustomEditor
                    initialData={editorData}
                    onChange={setEditorData}
                    className="lesson-editor"
                    onEditorReady={(editorElement) => {
                      const candidate =
                        editorElement?.querySelector?.(".ProseMirror") || editorElement || null;
                      editorScrollRef.current = candidate;
                    }}
                    config={{
                      placeholder: "Start writing your lesson content here...",
                      codeBlock: {
                        defaultLanguage: courseCodeLanguage,
                      },
                    }}
                  />
                </Suspense>
              </div>
            </div>
            {isPreviewEnabled && (
              <aside className="lesson-preview-panel">
                <div className="lesson-preview-header">
                  <p className="lesson-preview-title">
                    <FiEye size={14} /> Live Learner Preview
                  </p>
                  <div className="preview-mode-tabs" role="tablist" aria-label="Preview viewport">
                    <button
                      type="button"
                      role="tab"
                      aria-selected={previewViewport === "desktop"}
                      className={`preview-mode-tab ${previewViewport === "desktop" ? "active" : ""}`}
                      onClick={() => setPreviewViewport("desktop")}
                    >
                      <FiMonitor size={14} />
                      Desktop
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={previewViewport === "mobile"}
                      className={`preview-mode-tab ${previewViewport === "mobile" ? "active" : ""}`}
                      onClick={() => setPreviewViewport("mobile")}
                    >
                      <FiSmartphone size={14} />
                      Mobile
                    </button>
                  </div>
                </div>
                <div className={`lesson-preview-viewport ${previewViewport}`}>
                  <iframe
                    ref={previewFrameRef}
                    title="Live learner preview"
                    className={`lesson-preview-frame ${previewViewport}`}
                    srcDoc={previewDocument}
                    onLoad={() => setPreviewFrameReadyTick((prev) => prev + 1)}
                    sandbox="allow-scripts"
                  />
                </div>
              </aside>
            )}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">
            <FiAward size={14} /> Experience Points (XP)
          </label>
          <input
            type="number"
            className="form-input"
            value={xp}
            onChange={(e) => setXp(Number(e.target.value))}
            placeholder="Enter XP value"
            min="0"
          />
        </div>

        <div className="form-group">
          <label className="form-label">
            <FiTerminal size={14} /> Test Cases
          </label>
          <TestCaseManager testCases={test_cases} onChange={setTestCases} />
        </div>

        <div className="form-group">
          <label className="form-label">
            <FiCode size={14} /> Starter Template Code
          </label>
          <div className="editor-container" style={{ height: "400px", marginBottom: "1rem" }}>
            <Suspense fallback={editorFallback}>
              <SimpleMonacoEditor
                code={templateCode}
                setCode={setTemplateCode}
                language={languageId ? languageMappings[languageId] || "plaintext" : "plaintext"}
              />
            </Suspense>
          </div>
          <small className="form-text text-muted">
            This code will be provided as a starting point for students.
            {languageId && languageMappings[languageId] && (
              <span> (Language: {languageMappings[languageId]})</span>
            )}
          </small>
        </div>

        <div className="form-group">
          <label className="form-label">
            <FiHelpCircle size={14} /> Hint
          </label>
          <div className="editor-container">
            <Suspense fallback={editorFallback}>
              <CustomEditor
                initialData={hint}
                onChange={setHint}
                config={{
                  codeBlock: {
                    defaultLanguage: courseCodeLanguage,
                  },
                }}
              />
            </Suspense>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">
            <FiCheckCircle size={14} /> Solution
          </label>
          <div className="editor-container">
            <Suspense fallback={editorFallback}>
              <CustomEditor
                initialData={solution}
                onChange={setSolution}
                config={{
                  codeBlock: {
                    defaultLanguage: courseCodeLanguage,
                  },
                }}
              />
            </Suspense>
          </div>
        </div>

        <div className="form-actions">
          <button type="button" onClick={handleCancel} className="btn btn-secondary">
            <FiX size={16} />
            Cancel
          </button>
          {lesson?.lesson_id && (
            <button type="button" onClick={handleDelete} className="btn btn-danger">
              <FiTrash2 size={16} /> Delete
            </button>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="btn btn-primary"
          >
            <FiSave size={16} /> {isSaving ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default LessonForm;
