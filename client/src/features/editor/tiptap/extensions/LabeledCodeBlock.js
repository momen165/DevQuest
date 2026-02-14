import { mergeAttributes } from "@tiptap/core";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { CODE_BLOCK_LANGUAGES } from "features/editor/tiptap/constants";

const LANGUAGE_LABEL_MAP = CODE_BLOCK_LANGUAGES.reduce((acc, item) => {
  acc[item.language] = item.label;
  return acc;
}, {});

const fallbackLabel = (language) => {
  if (!language) return "Plain text";
  return language
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

export const LabeledCodeBlock = CodeBlockLowlight.extend({
  renderHTML({ node, HTMLAttributes }) {
    const languageId = node.attrs.language || "plaintext";
    const languageLabel = LANGUAGE_LABEL_MAP[languageId] || fallbackLabel(languageId);

    return [
      "pre",
      mergeAttributes(HTMLAttributes, {
        "data-language": languageLabel,
        "data-language-id": languageId,
      }),
      ["code", { class: `hljs language-${languageId}` }, 0],
    ];
  },
});
