import Image from "@tiptap/extension-image";

export const DraggableImage = Image.extend({
  draggable: true,

  addAttributes() {
    return {
      ...this.parent?.(),
      class: {
        default: "image-style-align-center",
      },
      style: {
        default: null,
      },
    };
  },
});
