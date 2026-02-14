export const cleanEmptyParagraphs = (html) => {
  if (!html) return html;

  return html
    .replace(/<p[^>]*>(\s|&nbsp;|<br\s*\/?>)*<\/p>/g, "")
    .replace(/<p><span>(\s|&nbsp;)*<\/span><\/p>/g, "")
    .replace(/<p[^>]*>\s*<\/p>/g, "");
};

export const normalizeLegacyCkHtml = (html) => {
  if (!html) return html;

  return html
    .replace(/<figure[^>]*class=["'][^"']*table[^"']*["'][^>]*>\s*(<table[\s\S]*?<\/table>)\s*<\/figure>/gi, "$1")
    .replace(/<figure[^>]*class=["'][^"']*image[^"']*["'][^>]*>\s*(<img[^>]*>)\s*(<figcaption>[\s\S]*?<\/figcaption>)?\s*<\/figure>/gi, "$1");
};

export const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
