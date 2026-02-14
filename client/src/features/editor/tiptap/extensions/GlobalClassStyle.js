import { Extension } from "@tiptap/core";

export const GlobalClassStyle = Extension.create({
  name: "globalClassStyle",

  addGlobalAttributes() {
    return [
      {
        types: [
          "paragraph",
          "heading",
          "blockquote",
          "codeBlock",
          "bulletList",
          "orderedList",
          "listItem",
          "table",
          "tableCell",
          "tableHeader",
          "image",
        ],
        attributes: {
          class: {
            default: null,
            parseHTML: (element) => element.getAttribute("class"),
            renderHTML: (attributes) => {
              if (!attributes.class) {
                return {};
              }

              return { class: attributes.class };
            },
          },
          style: {
            default: null,
            parseHTML: (element) => element.getAttribute("style"),
            renderHTML: (attributes) => {
              if (!attributes.style) {
                return {};
              }

              return { style: attributes.style };
            },
          },
        },
      },
      {
        types: ["textStyle"],
        attributes: {
          class: {
            default: null,
            parseHTML: (element) => element.getAttribute("class"),
            renderHTML: (attributes) => {
              if (!attributes.class) {
                return {};
              }

              return { class: attributes.class };
            },
          },
        },
      },
      {
        types: ["link"],
        attributes: {
          download: {
            default: null,
            parseHTML: (element) => element.getAttribute("download"),
            renderHTML: (attributes) => {
              if (!attributes.download) {
                return {};
              }

              return { download: attributes.download };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setNodeClass:
        (type, className) =>
        ({ editor, commands }) => {
          if (!editor.isActive(type)) {
            return false;
          }
          return commands.updateAttributes(type, { class: className || null });
        },
      setTextStyleClass:
        (className) =>
        ({ chain }) =>
          chain().setMark("textStyle", { class: className || null }).run(),
      toggleLinkDownloadable:
        () =>
        ({ editor, chain }) => {
          const attributes = editor.getAttributes("link");
          const current = attributes?.download;
          return chain()
            .focus()
            .extendMarkRange("link")
            .setLink({ ...attributes, download: current ? null : "file" })
            .run();
        },
    };
  },
});
