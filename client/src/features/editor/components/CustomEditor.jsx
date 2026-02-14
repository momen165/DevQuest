import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import Link from "@tiptap/extension-link";
import TextStyle from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import FontFamily from "@tiptap/extension-font-family";
import Placeholder from "@tiptap/extension-placeholder";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import { createLowlight, common } from "lowlight";
import { marked } from "marked";
import DOMPurify from "dompurify";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  ChevronDown,
  CheckSquare,
  CircleHelp,
  Code2,
  Download,
  Eraser,
  Eye,
  ImagePlus,
  IndentDecrease,
  IndentIncrease,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  Paintbrush2,
  Palette,
  Pilcrow,
  Quote,
  Redo2,
  Search,
  Sigma,
  Strikethrough,
  Subscript as SubscriptIcon,
  Superscript as SuperscriptIcon,
  Table2,
  Type,
  Underline as UnderlineIcon,
  Undo2,
} from "lucide-react";

import { useAuth } from "app/AuthContext";
import {
  CODE_BLOCK_LANGUAGES,
  FONT_FAMILIES,
  FONT_SIZES,
  SPECIAL_CHARACTERS,
  STYLE_DEFINITIONS,
} from "features/editor/tiptap/constants";
import { DraggableImage } from "features/editor/tiptap/extensions/DraggableImage";
import { FontSize } from "features/editor/tiptap/extensions/FontSize";
import { GlobalClassStyle } from "features/editor/tiptap/extensions/GlobalClassStyle";
import { LabeledCodeBlock } from "features/editor/tiptap/extensions/LabeledCodeBlock";
import { StyledTableCell } from "features/editor/tiptap/extensions/StyledTableCell";
import { StyledTableHeader } from "features/editor/tiptap/extensions/StyledTableHeader";
import {
  cleanEmptyParagraphs,
  escapeRegExp,
  normalizeLegacyCkHtml,
} from "features/editor/tiptap/utils/editorHtml";

import "highlight.js/styles/github-dark.css";
import "./CustomEditor.css";

const lowlight = createLowlight(common);

const DEFAULT_CONFIG = {
  codeBlock: {
    languages: CODE_BLOCK_LANGUAGES,
    defaultLanguage: "javascript",
  },
  fontFamily: {
    options: FONT_FAMILIES,
    defaultValue: "Source Sans Pro, sans-serif",
  },
  fontSize: {
    options: FONT_SIZES,
  },
  style: {
    definitions: STYLE_DEFINITIONS,
  },
  placeholder: "Type or paste your content here!",
  initialData: "",
};

const looksLikeMarkdown = (text) => {
  if (!text || typeof text !== "string") return false;
  return /(^#{1,6}\s)|(^\s*[-*+]\s)|(^\s*\d+\.\s)|(```)|(`[^`]+`)|(\[[^\]]+\]\([^)]+\))/m.test(
    text
  );
};

const normalizeUrl = (value) => {
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
};

const mergeConfig = (config = {}) => ({
  ...DEFAULT_CONFIG,
  ...config,
  codeBlock: {
    ...DEFAULT_CONFIG.codeBlock,
    ...(config.codeBlock || {}),
  },
  fontFamily: {
    ...DEFAULT_CONFIG.fontFamily,
    ...(config.fontFamily || {}),
  },
  fontSize: {
    ...DEFAULT_CONFIG.fontSize,
    ...(config.fontSize || {}),
  },
  style: {
    ...DEFAULT_CONFIG.style,
    ...(config.style || {}),
  },
});

const IMAGE_ALIGNMENT_CLASS_MAP = {
  left: "image-style-align-left",
  center: "image-style-align-center",
  right: "image-style-align-right",
  inline: "image-style-inline",
};

const IMAGE_ALIGNMENT_CLASSES = Object.values(IMAGE_ALIGNMENT_CLASS_MAP);

const upsertInlineStyle = (styleValue, property, nextValue) => {
  const style = styleValue || "";
  const propertyPattern = new RegExp(`${property}\\s*:[^;]+;?`, "gi");
  const cleaned = style
    .replace(propertyPattern, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  const normalized = cleaned.replace(/;\s*$/, "");

  if (!nextValue) {
    return normalized || null;
  }

  return `${normalized}${normalized ? "; " : ""}${property}: ${nextValue};`;
};

const withImageAlignmentClass = (classValue, alignmentClass) => {
  const filtered = (classValue || "")
    .split(/\s+/)
    .filter(Boolean)
    .filter((className) => !IMAGE_ALIGNMENT_CLASSES.includes(className));

  return [...filtered, alignmentClass].join(" ");
};

const parseImageWidthPercent = (styleValue) => {
  const match = (styleValue || "").match(/width:\s*(\d+(?:\.\d+)?)%/i);
  if (!match) return 100;
  const width = Number(match[1]);
  if (Number.isNaN(width)) return 100;
  return Math.max(10, Math.min(100, Math.round(width)));
};

const ToolbarButton = ({
  active,
  disabled,
  onClick,
  children,
  title,
  icon: Icon,
  showLabel = true,
}) => (
  <button
    type="button"
    className={`toolbar-btn ${active ? "active" : ""} ${showLabel ? "" : "icon-only"}`}
    disabled={disabled}
    title={title}
    aria-label={title || (typeof children === "string" ? children : undefined)}
    onClick={onClick}
  >
    {Icon && <Icon size={14} />}
    {showLabel && children}
  </button>
);

const ToolbarMenu = ({ icon: Icon, label, children }) => (
  <details className="toolbar-menu">
    <summary className="toolbar-menu-trigger" aria-label={`${label} menu`}>
      {Icon && <Icon size={14} />}
      <span>{label}</span>
      <ChevronDown size={12} />
    </summary>
    <div className="toolbar-menu-panel">{children}</div>
  </details>
);

const CustomEditor = ({
  initialData = "",
  config = {},
  onChange,
  className,
  disabled,
  onEditorReady,
}) => {
  const { user } = useAuth();
  const fileInputRef = useRef(null);
  const editorRef = useRef(null);
  const commandInputRef = useRef(null);
  const [error, setError] = useState(null);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [showSpecialChars, setShowSpecialChars] = useState(false);
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [showBlocks, setShowBlocks] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [commandMode, setCommandMode] = useState("palette");
  const [commandQuery, setCommandQuery] = useState("");
  const [activeCommandIndex, setActiveCommandIndex] = useState(0);
  const [commandPalettePosition, setCommandPalettePosition] = useState({ top: 84, left: 20 });
  const [findValue, setFindValue] = useState("");
  const [replaceValue, setReplaceValue] = useState("");
  const [matchCase, setMatchCase] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [matchCount, setMatchCount] = useState(0);

  const mergedConfig = useMemo(() => mergeConfig(config), [config]);
  const preferredCodeLanguage = useMemo(() => {
    const configuredLanguage = String(mergedConfig.codeBlock.defaultLanguage || "").toLowerCase();
    const availableLanguages = new Set(
      mergedConfig.codeBlock.languages.map((language) => String(language.language).toLowerCase())
    );

    if (configuredLanguage && availableLanguages.has(configuredLanguage)) {
      return configuredLanguage;
    }

    if (availableLanguages.has("javascript")) return "javascript";
    return mergedConfig.codeBlock.languages[0]?.language?.toLowerCase() || "plaintext";
  }, [mergedConfig.codeBlock.defaultLanguage, mergedConfig.codeBlock.languages]);

  const preferredCodeLanguageLabel = useMemo(() => {
    const match = mergedConfig.codeBlock.languages.find(
      (language) => String(language.language).toLowerCase() === String(preferredCodeLanguage)
    );
    return match?.label || preferredCodeLanguage;
  }, [mergedConfig.codeBlock.languages, preferredCodeLanguage]);

  const uploadImage = useCallback(
    async (file) => {
      if (!file) return null;
      if (!user?.token) {
        throw new Error("Authentication token not found");
      }

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`${import.meta.env.VITE_API_URL}/editor`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const data = await response.json();
      return data?.fileUrl || data?.url || null;
    },
    [user]
  );

  const insertImageFromFile = useCallback(
    async (file) => {
      const currentEditor = editorRef.current;
      if (!currentEditor) return;
      try {
        const url = await uploadImage(file);
        if (!url) {
          throw new Error("No URL returned from upload");
        }

        currentEditor
          .chain()
          .focus()
          .setImage({
            src: url,
            alt: file?.name || "Uploaded image",
            class: "image-style-align-center",
          })
          .run();
      } catch (uploadError) {
        setError(uploadError);
      }
    },
    [uploadImage]
  );

  const extensions = useMemo(
    () => [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        codeBlock: false,
      }),
      LabeledCodeBlock.configure({ lowlight }),
      Underline,
      Subscript,
      Superscript,
      Highlight.configure({ multicolor: true }),
      TextStyle,
      Color,
      FontFamily,
      FontSize,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        defaultProtocol: "https",
        HTMLAttributes: {
          rel: "noopener noreferrer",
          target: "_blank",
        },
      }),
      Placeholder.configure({
        placeholder: mergedConfig.placeholder,
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      StyledTableHeader,
      StyledTableCell,
      DraggableImage,
      GlobalClassStyle,
    ],
    [mergedConfig.placeholder]
  );

  const editor = useEditor({
    immediatelyRender: false,
    extensions,
    content: normalizeLegacyCkHtml(initialData || mergedConfig.initialData),
    editable: !disabled,
    onUpdate: ({ editor: currentEditor }) => {
      if (!onChange) return;
      const cleaned = cleanEmptyParagraphs(currentEditor.getHTML());
      onChange(cleaned);
    },
    editorProps: {
      attributes: {
        class: "tiptap-prosemirror",
      },
      handlePaste: (view, event) => {
        const file = event.clipboardData?.files?.[0];
        if (file && file.type?.startsWith("image/")) {
          event.preventDefault();
          insertImageFromFile(file);
          return true;
        }

        const html = event.clipboardData?.getData("text/html");
        const text = event.clipboardData?.getData("text/plain") || "";

        if (!html && looksLikeMarkdown(text)) {
          event.preventDefault();
          const rendered = marked.parse(text, { async: false });
          const safeHtml = DOMPurify.sanitize(rendered);
          editorRef.current?.chain().focus().insertContent(safeHtml).run();
          return true;
        }

        return false;
      },
      handleDrop: (view, event) => {
        const file = event.dataTransfer?.files?.[0];
        if (file && file.type?.startsWith("image/")) {
          event.preventDefault();
          insertImageFromFile(file);
          return true;
        }
        return false;
      },
    },
  });

  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  useEffect(() => {
    if (!onEditorReady) return undefined;
    onEditorReady(editor?.view?.dom || null);
    return () => {
      if (onEditorReady) {
        onEditorReady(null);
      }
    };
  }, [editor, onEditorReady]);

  const closeCommandPalette = useCallback(() => {
    setShowCommandPalette(false);
    setCommandQuery("");
    setActiveCommandIndex(0);
    editor?.chain().focus().run();
  }, [editor]);

  const openCommandPalette = useCallback(
    (mode = "palette") => {
      if (!editor) return;

      setCommandMode(mode);
      setCommandQuery("");
      setActiveCommandIndex(0);

      if (mode === "slash") {
        const shellElement = editor.view?.dom?.closest(".editor-shell");
        const shellRect = shellElement?.getBoundingClientRect();
        const selectionPos = editor.state.selection?.from ?? 0;
        const caretCoords = editor.view.coordsAtPos(selectionPos);

        if (shellRect) {
          setCommandPalettePosition({
            top: Math.max(56, caretCoords.bottom - shellRect.top + 8),
            left: Math.max(16, caretCoords.left - shellRect.left),
          });
        }
      }

      setShowCommandPalette(true);
    },
    [editor]
  );

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [disabled, editor]);

  useEffect(() => {
    if (!editor) return;
    const normalized = normalizeLegacyCkHtml(initialData || "");
    const current = editor.getHTML();
    if (normalized !== current) {
      editor.commands.setContent(normalized, false);
    }
  }, [editor, initialData]);

  useEffect(() => {
    if (!editor) return;

    const handleShortcut = (event) => {
      const isPrimaryModifier = event.ctrlKey || event.metaKey;
      if (isPrimaryModifier && event.key.toLowerCase() === "k") {
        event.preventDefault();
        openCommandPalette("palette");
        return;
      }

      if (
        event.key === "/" &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey &&
        !showCommandPalette &&
        !editor.isActive("codeBlock")
      ) {
        const selection = editor.state.selection;
        if (!selection.empty) return;

        const charBefore =
          selection.from > 1
            ? editor.state.doc.textBetween(selection.from - 1, selection.from, "\n", "\n")
            : "";
        const canTriggerSlash = charBefore === "" || /\s/.test(charBefore);

        if (canTriggerSlash) {
          event.preventDefault();
          openCommandPalette("slash");
          return;
        }
      }

      if (!event.ctrlKey || !event.altKey) return;

      const key = event.key.toLowerCase();
      if (!["i", "j", "p", "h", "c"].includes(key)) return;

      event.preventDefault();

      if (key === "i") {
        fileInputRef.current?.click();
        return;
      }

      if (key === "j") {
        editor.chain().focus().toggleCodeBlock({ language: "javascript" }).run();
      }

      if (key === "p") {
        editor.chain().focus().toggleCodeBlock({ language: "python" }).run();
      }

      if (key === "h") {
        editor.chain().focus().toggleCodeBlock({ language: "html" }).run();
      }

      if (key === "c") {
        editor.chain().focus().toggleCodeBlock({ language: preferredCodeLanguage }).run();
      }
    };

    const domNode = editor.view?.dom;
    if (!domNode) return;

    domNode.addEventListener("keydown", handleShortcut);
    return () => {
      domNode.removeEventListener("keydown", handleShortcut);
    };
  }, [editor, openCommandPalette, preferredCodeLanguage, showCommandPalette]);

  useEffect(() => {
    if (!editor || !findValue.trim()) {
      setMatchCount(0);
      return;
    }

    try {
      const regex = useRegex
        ? new RegExp(findValue, matchCase ? "g" : "gi")
        : new RegExp(escapeRegExp(findValue), matchCase ? "g" : "gi");

      const text = editor.getText();
      const matches = text.match(regex);
      setMatchCount(matches ? matches.length : 0);
    } catch {
      setMatchCount(0);
    }
  }, [editor, findValue, matchCase, useRegex]);

  const handleHeadingChange = (value) => {
    if (!editor) return;
    if (value === "paragraph") {
      editor.chain().focus().setParagraph().run();
      return;
    }

    editor
      .chain()
      .focus()
      .setHeading({ level: Number(value) })
      .run();
  };

  const handleStyleDefinition = (name) => {
    if (!editor) return;
    const definition = mergedConfig.style.definitions.find((item) => item.name === name);
    if (!definition) return;

    if (definition.element === "span") {
      editor.chain().focus().setTextStyleClass(definition.className).run();
      return;
    }

    if (definition.element === "h2") {
      editor
        .chain()
        .focus()
        .setHeading({ level: 2 })
        .updateAttributes("heading", { class: definition.className || null })
        .run();
      return;
    }

    if (definition.element === "h3") {
      editor
        .chain()
        .focus()
        .setHeading({ level: 3 })
        .updateAttributes("heading", { class: definition.className || null })
        .run();
      return;
    }

    if (definition.element === "p") {
      editor
        .chain()
        .focus()
        .setParagraph()
        .updateAttributes("paragraph", { class: definition.className || null })
        .run();
      return;
    }

    if (definition.element === "blockquote") {
      editor
        .chain()
        .focus()
        .setBlockquote()
        .updateAttributes("blockquote", { class: definition.className || null })
        .run();
      return;
    }

    if (definition.element === "pre") {
      editor
        .chain()
        .focus()
        .toggleCodeBlock({ language: "plaintext" })
        .updateAttributes("codeBlock", { class: definition.className || null })
        .run();
    }
  };

  const handleSetLink = () => {
    if (!editor) return;

    const previous = editor.getAttributes("link")?.href || "";
    const raw = window.prompt("Enter URL", previous);

    if (raw === null) return;

    if (!raw.trim()) {
      editor.chain().focus().unsetLink().run();
      return;
    }

    const href = normalizeUrl(raw.trim());
    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href, target: "_blank", rel: "noopener noreferrer" })
      .run();
  };

  const handleToggleDownloadableLink = () => {
    if (!editor) return;
    editor.chain().focus().toggleLinkDownloadable().run();
  };

  const handleIndent = () => {
    if (!editor) return;
    if (editor.isActive("listItem")) {
      editor.chain().focus().sinkListItem("listItem").run();
      return;
    }

    const target = editor.isActive("heading") ? "heading" : "paragraph";
    const attributes = editor.getAttributes(target);
    const style = attributes.style || "";
    const match = style.match(/margin-left:\s*(\d+)px/);
    const current = match ? Number(match[1]) : 0;
    const next = Math.min(current + 40, 240);
    const updated = style.replace(/margin-left:\s*\d+px;?/g, "").trim();
    editor
      .chain()
      .focus()
      .updateAttributes(target, {
        style: `${updated}${updated ? "; " : ""}margin-left: ${next}px;`,
      })
      .run();
  };

  const handleOutdent = () => {
    if (!editor) return;
    if (editor.isActive("listItem")) {
      editor.chain().focus().liftListItem("listItem").run();
      return;
    }

    const target = editor.isActive("heading") ? "heading" : "paragraph";
    const attributes = editor.getAttributes(target);
    const style = attributes.style || "";
    const match = style.match(/margin-left:\s*(\d+)px/);
    const current = match ? Number(match[1]) : 0;
    const next = Math.max(current - 40, 0);
    const stripped = style.replace(/margin-left:\s*\d+px;?/g, "").trim();
    const composed =
      next > 0 ? `${stripped}${stripped ? "; " : ""}margin-left: ${next}px;` : stripped;

    editor
      .chain()
      .focus()
      .updateAttributes(target, { style: composed || null })
      .run();
  };

  const handleReplaceAll = () => {
    if (!editor || !findValue.trim()) return;

    try {
      const pattern = useRegex
        ? new RegExp(findValue, matchCase ? "g" : "gi")
        : new RegExp(escapeRegExp(findValue), matchCase ? "g" : "gi");

      const nextHtml = editor.getHTML().replace(pattern, replaceValue);
      editor.commands.setContent(nextHtml, true);
    } catch (replaceError) {
      setError(replaceError);
    }
  };

  const handleRemoveFormatting = () => {
    if (!editor) return;
    editor.chain().focus().unsetAllMarks().clearNodes().run();
  };

  const handleApplyAlignment = (alignment) => {
    if (!editor) return;
    editor.chain().focus().setTextAlign(alignment).run();
  };

  const handleImageFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    insertImageFromFile(file);
    event.target.value = "";
  };

  const insertCommandTemplate = useCallback(
    (content) => {
      if (!editor) return;
      editor.chain().focus().insertContent(content).run();
    },
    [editor]
  );

  const commandActions = useMemo(() => {
    if (!editor) return [];

    return [
      {
        id: "heading-2",
        label: "Heading 2",
        aliases: ["title", "h2"],
        showInSlash: true,
        run: () => editor.chain().focus().setHeading({ level: 2 }).run(),
      },
      {
        id: "heading-3",
        label: "Heading 3",
        aliases: ["subtitle", "h3"],
        showInSlash: true,
        run: () => editor.chain().focus().setHeading({ level: 3 }).run(),
      },
      {
        id: "paragraph",
        label: "Paragraph",
        aliases: ["text", "normal"],
        showInSlash: true,
        run: () => editor.chain().focus().setParagraph().run(),
      },
      {
        id: "bullet-list",
        label: "Bulleted List",
        aliases: ["list", "ul", "bullet"],
        showInSlash: true,
        run: () => editor.chain().focus().toggleBulletList().run(),
      },
      {
        id: "numbered-list",
        label: "Numbered List",
        aliases: ["ordered", "ol", "steps"],
        showInSlash: true,
        run: () => editor.chain().focus().toggleOrderedList().run(),
      },
      {
        id: "code-block-js",
        label: `/code ${preferredCodeLanguageLabel} Block`,
        aliases: [
          "code",
          "snippet",
          preferredCodeLanguage,
          preferredCodeLanguageLabel.toLowerCase(),
        ],
        showInSlash: true,
        run: () =>
          editor.chain().focus().toggleCodeBlock({ language: preferredCodeLanguage }).run(),
      },
      {
        id: "quiz-block",
        label: "/quiz Quiz Scaffold",
        aliases: ["quiz", "assessment", "mcq"],
        showInSlash: true,
        run: () =>
          insertCommandTemplate(
            `<h3>Quick Quiz</h3><ol><li><p>Question 1?</p></li><li><p>Question 2?</p></li></ol><p><strong>Answer key:</strong> Add the expected answers here.</p>`
          ),
      },
      {
        id: "tip-block",
        label: "/tip Tip Box",
        aliases: ["tip", "hint", "note"],
        showInSlash: true,
        run: () =>
          insertCommandTemplate(
            `<p class="editor-info-box"><strong>Tip:</strong> Add a practical hint for learners.</p>`
          ),
      },
      {
        id: "warning-block",
        label: "/warning Warning Box",
        aliases: ["warning", "caution", "important"],
        showInSlash: true,
        run: () =>
          insertCommandTemplate(
            `<p class="editor-warning-box"><strong>Warning:</strong> Call out a common mistake or safety note.</p>`
          ),
      },
      {
        id: "table",
        label: "Insert Table",
        aliases: ["table", "grid"],
        showInSlash: true,
        run: () =>
          editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
      },
      {
        id: "image-upload",
        label: "Upload Image",
        aliases: ["image", "photo", "media"],
        showInSlash: true,
        run: () => fileInputRef.current?.click(),
      },
      {
        id: "quote",
        label: "Block Quote",
        aliases: ["quote", "blockquote"],
        showInSlash: true,
        run: () => editor.chain().focus().toggleBlockquote().run(),
      },
      {
        id: "horizontal-rule",
        label: "Horizontal Divider",
        aliases: ["divider", "separator", "hr"],
        showInSlash: true,
        run: () => editor.chain().focus().setHorizontalRule().run(),
      },
    ];
  }, [editor, insertCommandTemplate, preferredCodeLanguage, preferredCodeLanguageLabel]);

  const filteredCommands = useMemo(() => {
    const normalizedQuery = commandQuery.trim().toLowerCase().replace(/^\//, "");
    const commandPool =
      commandMode === "slash"
        ? commandActions.filter((action) => action.showInSlash)
        : commandActions;

    if (!normalizedQuery) return commandPool;

    return commandPool.filter((command) => {
      const searchable = [command.label, ...(command.aliases || [])].join(" ").toLowerCase();
      return searchable.includes(normalizedQuery);
    });
  }, [commandActions, commandMode, commandQuery]);

  useEffect(() => {
    if (!showCommandPalette) return;
    setActiveCommandIndex(0);
  }, [commandQuery, showCommandPalette, commandMode]);

  useEffect(() => {
    if (!showCommandPalette) return;
    commandInputRef.current?.focus();
  }, [showCommandPalette]);

  useEffect(() => {
    if (!showCommandPalette) return undefined;

    const handleClickOutside = (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest(".command-palette")) return;
      closeCommandPalette();
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showCommandPalette, closeCommandPalette]);

  const executeCommand = useCallback((command) => {
    if (!command) return;
    command.run();
    setShowCommandPalette(false);
    setCommandQuery("");
    setActiveCommandIndex(0);
  }, []);

  const handleCommandInputKeyDown = (event) => {
    if (!showCommandPalette) return;

    if (event.key === "Escape") {
      event.preventDefault();
      closeCommandPalette();
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveCommandIndex((prev) => (prev + 1) % Math.max(filteredCommands.length, 1));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveCommandIndex(
        (prev) =>
          (prev - 1 + Math.max(filteredCommands.length, 1)) % Math.max(filteredCommands.length, 1)
      );
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      executeCommand(filteredCommands[activeCommandIndex]);
    }
  };

  const runMenuAction = (action) => (event) => {
    action();
    const details = event.currentTarget.closest("details");
    if (details) {
      details.open = false;
    }
  };

  const setImageAlignment = (alignment) => {
    if (!editor || !editor.isActive("image")) return;
    const alignmentClass = IMAGE_ALIGNMENT_CLASS_MAP[alignment];
    if (!alignmentClass) return;

    const imageAttrs = editor.getAttributes("image");
    editor
      .chain()
      .focus()
      .updateAttributes("image", {
        class: withImageAlignmentClass(imageAttrs.class, alignmentClass),
      })
      .run();
  };

  const setImageWidthPercent = (widthPercent) => {
    if (!editor || !editor.isActive("image")) return;
    const width = Math.max(10, Math.min(100, Number(widthPercent) || 100));
    const imageAttrs = editor.getAttributes("image");
    const styleWithWidth = upsertInlineStyle(imageAttrs.style, "width", `${width}%`);
    const nextStyle = upsertInlineStyle(styleWithWidth, "height", "auto");

    editor.chain().focus().updateAttributes("image", { style: nextStyle }).run();
  };

  const resetImageWidth = () => {
    if (!editor || !editor.isActive("image")) return;
    const imageAttrs = editor.getAttributes("image");
    const styleWithoutWidth = upsertInlineStyle(imageAttrs.style, "width", null);
    const nextStyle = upsertInlineStyle(styleWithoutWidth, "height", null);

    editor.chain().focus().updateAttributes("image", { style: nextStyle }).run();
  };

  const activeHeading = editor?.isActive("heading", { level: 1 })
    ? "1"
    : editor?.isActive("heading", { level: 2 })
      ? "2"
      : editor?.isActive("heading", { level: 3 })
        ? "3"
        : "paragraph";
  const isImageActive = editor?.isActive("image") ?? false;
  const imageAttrs = isImageActive ? editor.getAttributes("image") : {};
  const activeImageWidth = parseImageWidthPercent(imageAttrs.style);

  if (!editor) {
    return <div className={`custom-editor ${className || ""}`}>Loading editor...</div>;
  }

  return (
    <div className={`custom-editor ${className || ""} ${showBlocks ? "show-blocks" : ""}`}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden-file-input"
        onChange={handleImageFileChange}
      />

      <div className="main-container">
        <div className="editor-shell">
          <div className="editor-help-tooltip">
            <CircleHelp
              className="help-icon"
              onMouseEnter={() => setShowShortcutsHelp(true)}
              onMouseLeave={() => setShowShortcutsHelp(false)}
            />
            {showShortcutsHelp && (
              <div className="tooltip-content">
                <h4>Keyboard Shortcuts</h4>
                <ul>
                  <li>
                    <kbd>Ctrl/Cmd + K</kbd> Command Palette
                  </li>
                  <li>
                    <kbd>/</kbd> Slash Commands
                  </li>
                  <li>
                    <kbd>Ctrl + Alt + C</kbd> Course Language Code Block
                  </li>
                  <li>
                    <kbd>Ctrl + Alt + I</kbd> Insert Image
                  </li>
                  <li>
                    <kbd>Ctrl + Alt + J</kbd> JavaScript Code Block
                  </li>
                  <li>
                    <kbd>Ctrl + Alt + P</kbd> Python Code Block
                  </li>
                  <li>
                    <kbd>Ctrl + Alt + H</kbd> HTML Code Block
                  </li>
                </ul>
              </div>
            )}
          </div>

          <div className="editor-menubar" role="menubar" aria-label="Editor menu bar">
            <button
              type="button"
              className="menu-btn"
              onClick={() => setShowFindReplace((prev) => !prev)}
            >
              <Search size={13} />
              Edit
            </button>
            <button
              type="button"
              className="menu-btn"
              onClick={() => setShowBlocks((prev) => !prev)}
            >
              <Eye size={13} />
              View
            </button>
            <button
              type="button"
              className="menu-btn"
              onClick={() => fileInputRef.current?.click()}
            >
              <ImagePlus size={13} />
              Insert
            </button>
            <button
              type="button"
              className="menu-btn"
              onClick={() => handleStyleDefinition("Title")}
            >
              <Paintbrush2 size={13} />
              Format
            </button>
            <button
              type="button"
              className="menu-btn"
              onClick={() => openCommandPalette("palette")}
            >
              <Search size={13} />
              Command
            </button>
            <button
              type="button"
              className="menu-btn"
              onClick={() => setShowShortcutsHelp((prev) => !prev)}
            >
              <CircleHelp size={13} />
              Help
            </button>
          </div>

          <div className="editor-toolbar" role="toolbar" aria-label="Editor toolbar">
            <div className="toolbar-row toolbar-row--compact">
              <div className="toolbar-primary-controls">
                <ToolbarButton
                  title="Undo"
                  icon={Undo2}
                  showLabel={false}
                  onClick={() => editor.chain().focus().undo().run()}
                  disabled={!editor.can().undo()}
                />
                <ToolbarButton
                  title="Redo"
                  icon={Redo2}
                  showLabel={false}
                  onClick={() => editor.chain().focus().redo().run()}
                  disabled={!editor.can().redo()}
                />

                <span className="toolbar-divider" aria-hidden="true" />

                <select
                  value={activeHeading}
                  onChange={(event) => handleHeadingChange(event.target.value)}
                  className="toolbar-select compact"
                >
                  <option value="paragraph">Paragraph</option>
                  <option value="1">Heading 1</option>
                  <option value="2">Heading 2</option>
                  <option value="3">Heading 3</option>
                </select>

                <select
                  defaultValue=""
                  onChange={(event) =>
                    event.target.value && handleStyleDefinition(event.target.value)
                  }
                  className="toolbar-select compact"
                >
                  <option value="">Styles</option>
                  {mergedConfig.style.definitions.map((definition) => (
                    <option key={definition.name} value={definition.name}>
                      {definition.name}
                    </option>
                  ))}
                </select>

                <span className="toolbar-divider" aria-hidden="true" />

                <select
                  defaultValue=""
                  onChange={(event) =>
                    event.target.value &&
                    editor.chain().focus().setFontFamily(event.target.value).run()
                  }
                  className="toolbar-select compact"
                  title="Font family"
                >
                  <option value="">Font family</option>
                  {mergedConfig.fontFamily.options.map((font) => (
                    <option key={font} value={font}>
                      {font}
                    </option>
                  ))}
                </select>

                <select
                  defaultValue=""
                  onChange={(event) =>
                    event.target.value &&
                    editor.chain().focus().setFontSize(event.target.value).run()
                  }
                  className="toolbar-select compact toolbar-select--small"
                  title="Font size"
                >
                  <option value="">Size</option>
                  {mergedConfig.fontSize.options.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>

                <label className="toolbar-color" title="Text color">
                  <Type size={13} />
                  <input
                    type="color"
                    onChange={(event) => editor.chain().focus().setColor(event.target.value).run()}
                  />
                </label>
                <label className="toolbar-color" title="Highlight color">
                  <Palette size={13} />
                  <input
                    type="color"
                    onChange={(event) =>
                      editor.chain().focus().setHighlight({ color: event.target.value }).run()
                    }
                  />
                </label>

                <span className="toolbar-divider" aria-hidden="true" />

                <ToolbarButton
                  icon={Bold}
                  showLabel={false}
                  active={editor.isActive("bold")}
                  onClick={() => editor.chain().focus().toggleBold().run()}
                  title="Bold"
                />
                <ToolbarButton
                  icon={Italic}
                  showLabel={false}
                  active={editor.isActive("italic")}
                  onClick={() => editor.chain().focus().toggleItalic().run()}
                  title="Italic"
                />
                <ToolbarButton
                  icon={UnderlineIcon}
                  showLabel={false}
                  active={editor.isActive("underline")}
                  onClick={() => editor.chain().focus().toggleUnderline().run()}
                  title="Underline"
                />
                <ToolbarButton
                  icon={Strikethrough}
                  showLabel={false}
                  active={editor.isActive("strike")}
                  onClick={() => editor.chain().focus().toggleStrike().run()}
                  title="Strikethrough"
                />
                <ToolbarButton
                  icon={Code2}
                  showLabel={false}
                  active={editor.isActive("code")}
                  onClick={() => editor.chain().focus().toggleCode().run()}
                  title="Inline code"
                />
                <ToolbarButton
                  icon={SubscriptIcon}
                  showLabel={false}
                  active={editor.isActive("subscript")}
                  onClick={() => editor.chain().focus().toggleSubscript().run()}
                  title="Subscript"
                />
                <ToolbarButton
                  icon={SuperscriptIcon}
                  showLabel={false}
                  active={editor.isActive("superscript")}
                  onClick={() => editor.chain().focus().toggleSuperscript().run()}
                  title="Superscript"
                />

                <span className="toolbar-divider" aria-hidden="true" />

                <ToolbarButton
                  icon={List}
                  showLabel={false}
                  active={editor.isActive("bulletList")}
                  onClick={() => editor.chain().focus().toggleBulletList().run()}
                  title="Bulleted list"
                />
                <ToolbarButton
                  icon={ListOrdered}
                  showLabel={false}
                  active={editor.isActive("orderedList")}
                  onClick={() => editor.chain().focus().toggleOrderedList().run()}
                  title="Numbered list"
                />
                <ToolbarButton
                  icon={Link2}
                  showLabel={false}
                  active={editor.isActive("link")}
                  onClick={handleSetLink}
                  title="Link"
                />
                <ToolbarButton
                  icon={Download}
                  showLabel={false}
                  active={Boolean(editor.getAttributes("link")?.download)}
                  onClick={handleToggleDownloadableLink}
                  title="Toggle downloadable link"
                />
                <ToolbarButton
                  icon={Quote}
                  showLabel={false}
                  active={editor.isActive("blockquote")}
                  onClick={() => editor.chain().focus().toggleBlockquote().run()}
                  title="Block quote"
                />
                <ToolbarButton
                  icon={Minus}
                  showLabel={false}
                  onClick={() => editor.chain().focus().setHorizontalRule().run()}
                  title="Horizontal line"
                />

                <span className="toolbar-divider" aria-hidden="true" />

                <select
                  defaultValue="javascript"
                  onChange={(event) =>
                    editor.chain().focus().toggleCodeBlock({ language: event.target.value }).run()
                  }
                  className="toolbar-select compact toolbar-select--small"
                  title="Code block language"
                >
                  {mergedConfig.codeBlock.languages.map((language) => (
                    <option key={language.language} value={language.language}>
                      {language.label}
                    </option>
                  ))}
                </select>
                <span className="toolbar-divider" aria-hidden="true" />
              </div>

              <div className="toolbar-menus-right">
                <ToolbarMenu icon={AlignLeft} label="Align">
                  <button
                    type="button"
                    className="toolbar-menu-item"
                    onClick={runMenuAction(() => handleApplyAlignment("left"))}
                  >
                    <AlignLeft size={14} />
                    Align left
                  </button>
                  <button
                    type="button"
                    className="toolbar-menu-item"
                    onClick={runMenuAction(() => handleApplyAlignment("center"))}
                  >
                    <AlignCenter size={14} />
                    Align center
                  </button>
                  <button
                    type="button"
                    className="toolbar-menu-item"
                    onClick={runMenuAction(() => handleApplyAlignment("right"))}
                  >
                    <AlignRight size={14} />
                    Align right
                  </button>
                  <button
                    type="button"
                    className="toolbar-menu-item"
                    onClick={runMenuAction(() => handleApplyAlignment("justify"))}
                  >
                    <AlignJustify size={14} />
                    Align justify
                  </button>
                  <button
                    type="button"
                    className="toolbar-menu-item"
                    onClick={runMenuAction(handleOutdent)}
                  >
                    <IndentDecrease size={14} />
                    Outdent
                  </button>
                  <button
                    type="button"
                    className="toolbar-menu-item"
                    onClick={runMenuAction(handleIndent)}
                  >
                    <IndentIncrease size={14} />
                    Indent
                  </button>
                </ToolbarMenu>

                <ToolbarMenu icon={ImagePlus} label="Insert">
                  <button
                    type="button"
                    className="toolbar-menu-item"
                    onClick={runMenuAction(() => fileInputRef.current?.click())}
                  >
                    <ImagePlus size={14} />
                    Upload image
                  </button>
                  <button
                    type="button"
                    className="toolbar-menu-item"
                    onClick={runMenuAction(() =>
                      editor
                        .chain()
                        .focus()
                        .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                        .run()
                    )}
                  >
                    <Table2 size={14} />
                    Insert table
                  </button>
                  <button
                    type="button"
                    className={`toolbar-menu-item ${showSpecialChars ? "active" : ""}`}
                    onClick={runMenuAction(() => setShowSpecialChars((prev) => !prev))}
                  >
                    <Sigma size={14} />
                    Special chars
                  </button>
                </ToolbarMenu>

                <ToolbarMenu icon={Search} label="Tools">
                  <button
                    type="button"
                    className={`toolbar-menu-item ${showFindReplace ? "active" : ""}`}
                    onClick={runMenuAction(() => setShowFindReplace((prev) => !prev))}
                  >
                    <Search size={14} />
                    Find/replace
                  </button>
                  <button
                    type="button"
                    className="toolbar-menu-item"
                    onClick={runMenuAction(() => editor.chain().focus().selectAll().run())}
                  >
                    <CheckSquare size={14} />
                    Select all
                  </button>
                  <button
                    type="button"
                    className="toolbar-menu-item"
                    onClick={runMenuAction(handleRemoveFormatting)}
                  >
                    <Eraser size={14} />
                    Remove format
                  </button>
                  <button
                    type="button"
                    className={`toolbar-menu-item ${showBlocks ? "active" : ""}`}
                    onClick={runMenuAction(() => setShowBlocks((prev) => !prev))}
                  >
                    <Eye size={14} />
                    Show blocks
                  </button>
                </ToolbarMenu>
              </div>
            </div>

            {isImageActive && (
              <div className="toolbar-row image-toolbar">
                <span className="toolbar-label">Image</span>
                <ToolbarButton
                  title="Align left"
                  icon={AlignLeft}
                  active={(imageAttrs.class || "").includes("image-style-align-left")}
                  onClick={() => setImageAlignment("left")}
                >
                  Left
                </ToolbarButton>
                <ToolbarButton
                  title="Align center"
                  icon={AlignCenter}
                  active={(imageAttrs.class || "").includes("image-style-align-center")}
                  onClick={() => setImageAlignment("center")}
                >
                  Center
                </ToolbarButton>
                <ToolbarButton
                  title="Align right"
                  icon={AlignRight}
                  active={(imageAttrs.class || "").includes("image-style-align-right")}
                  onClick={() => setImageAlignment("right")}
                >
                  Right
                </ToolbarButton>
                <ToolbarButton
                  title="Inline image"
                  icon={Pilcrow}
                  active={(imageAttrs.class || "").includes("image-style-inline")}
                  onClick={() => setImageAlignment("inline")}
                >
                  Inline
                </ToolbarButton>
                <label className="toolbar-range">
                  Width
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="5"
                    value={activeImageWidth}
                    onChange={(event) => setImageWidthPercent(event.target.value)}
                  />
                  <span>{activeImageWidth}%</span>
                </label>
                <ToolbarButton onClick={() => setImageWidthPercent(25)}>25%</ToolbarButton>
                <ToolbarButton onClick={() => setImageWidthPercent(50)}>50%</ToolbarButton>
                <ToolbarButton onClick={() => setImageWidthPercent(75)}>75%</ToolbarButton>
                <ToolbarButton onClick={() => setImageWidthPercent(100)}>100%</ToolbarButton>
                <ToolbarButton title="Use intrinsic image size" onClick={resetImageWidth}>
                  Original
                </ToolbarButton>
              </div>
            )}

            {editor.isActive("table") && (
              <div className="toolbar-row table-toolbar">
                <ToolbarButton onClick={() => editor.chain().focus().addColumnBefore().run()}>
                  +Col Before
                </ToolbarButton>
                <ToolbarButton onClick={() => editor.chain().focus().addColumnAfter().run()}>
                  +Col After
                </ToolbarButton>
                <ToolbarButton onClick={() => editor.chain().focus().deleteColumn().run()}>
                  -Col
                </ToolbarButton>
                <ToolbarButton onClick={() => editor.chain().focus().addRowBefore().run()}>
                  +Row Before
                </ToolbarButton>
                <ToolbarButton onClick={() => editor.chain().focus().addRowAfter().run()}>
                  +Row After
                </ToolbarButton>
                <ToolbarButton onClick={() => editor.chain().focus().deleteRow().run()}>
                  -Row
                </ToolbarButton>
                <ToolbarButton onClick={() => editor.chain().focus().mergeCells().run()}>
                  Merge
                </ToolbarButton>
                <ToolbarButton onClick={() => editor.chain().focus().splitCell().run()}>
                  Split
                </ToolbarButton>
                <ToolbarButton onClick={() => editor.chain().focus().toggleHeaderRow().run()}>
                  Header Row
                </ToolbarButton>
                <ToolbarButton onClick={() => editor.chain().focus().toggleHeaderColumn().run()}>
                  Header Col
                </ToolbarButton>
                <ToolbarButton onClick={() => editor.chain().focus().deleteTable().run()}>
                  Delete Table
                </ToolbarButton>
                <label className="toolbar-color">
                  Cell BG
                  <input
                    type="color"
                    onChange={(event) =>
                      editor
                        .chain()
                        .focus()
                        .setCellAttribute("backgroundColor", event.target.value)
                        .run()
                    }
                  />
                </label>
              </div>
            )}
          </div>

          {showSpecialChars && (
            <div className="editor-popover">
              {Object.entries(SPECIAL_CHARACTERS).map(([group, chars]) => (
                <div key={group} className="char-group">
                  <h5>{group}</h5>
                  <div className="char-grid">
                    {chars.map((char) => (
                      <button
                        type="button"
                        key={`${group}-${char}`}
                        className="char-btn"
                        onClick={() => editor.chain().focus().insertContent(char).run()}
                      >
                        {char}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {showFindReplace && (
            <div className="editor-popover">
              <div className="find-grid">
                <input
                  type="text"
                  placeholder="Find"
                  value={findValue}
                  onChange={(event) => setFindValue(event.target.value)}
                />
                <input
                  type="text"
                  placeholder="Replace"
                  value={replaceValue}
                  onChange={(event) => setReplaceValue(event.target.value)}
                />
                <label>
                  <input
                    type="checkbox"
                    checked={matchCase}
                    onChange={(event) => setMatchCase(event.target.checked)}
                  />
                  Match case
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={useRegex}
                    onChange={(event) => setUseRegex(event.target.checked)}
                  />
                  Regex
                </label>
                <button type="button" onClick={handleReplaceAll}>
                  Replace All
                </button>
                <span>{matchCount} match(es)</span>
              </div>
            </div>
          )}

          {showCommandPalette && (
            <div
              className={`command-palette ${commandMode === "slash" ? "slash" : "modal"}`}
              style={commandMode === "slash" ? commandPalettePosition : undefined}
            >
              <div className="command-palette-header">
                <span>{commandMode === "slash" ? "Slash Commands" : "Command Palette"}</span>
                <button type="button" onClick={closeCommandPalette}>
                  Esc
                </button>
              </div>
              <input
                ref={commandInputRef}
                type="text"
                className="command-palette-input"
                value={commandQuery}
                onChange={(event) => setCommandQuery(event.target.value)}
                onKeyDown={handleCommandInputKeyDown}
                placeholder={
                  commandMode === "slash"
                    ? "Type a command (quiz, code, tip, warning...)"
                    : "Search commands..."
                }
              />
              <div className="command-palette-list" role="listbox">
                {filteredCommands.length === 0 ? (
                  <p className="command-palette-empty">No commands found.</p>
                ) : (
                  filteredCommands.map((command, index) => (
                    <button
                      type="button"
                      key={command.id}
                      className={`command-palette-item ${index === activeCommandIndex ? "active" : ""}`}
                      onMouseEnter={() => setActiveCommandIndex(index)}
                      onClick={() => executeCommand(command)}
                    >
                      <span className="command-palette-item-label">{command.label}</span>
                      <span className="command-palette-item-meta">
                        {(command.aliases || []).join(" · ")}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          <div className="tiptap-editor">
            <EditorContent editor={editor} />
          </div>
        </div>
      </div>

      {error && <div className="editor-error">Error: {error.message}</div>}
    </div>
  );
};

export default CustomEditor;
