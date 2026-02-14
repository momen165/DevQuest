const xss = require("xss");

const RICH_TEXT_FIELDS = new Set(["content", "hint", "solution"]);

const richHtmlOptions = {
  whiteList: {
    a: ["href", "title", "target", "rel", "download", "class", "style"],
    img: ["src", "alt", "title", "width", "height", "class", "style"],
    p: ["class", "style"],
    div: ["class", "style"],
    span: ["class", "style"],
    h1: ["class", "style"],
    h2: ["class", "style"],
    h3: ["class", "style"],
    h4: ["class", "style"],
    h5: ["class", "style"],
    h6: ["class", "style"],
    blockquote: ["class", "style"],
    ul: ["class", "style"],
    ol: ["class", "style"],
    li: ["class", "style"],
    table: ["class", "style", "width", "border", "cellpadding", "cellspacing"],
    thead: ["class", "style"],
    tbody: ["class", "style"],
    tr: ["class", "style"],
    th: ["class", "style", "colspan", "rowspan", "scope"],
    td: ["class", "style", "colspan", "rowspan"],
    pre: ["class", "style"],
    code: ["class", "style"],
    hr: ["class", "style"],
    br: ["class", "style"],
    figure: ["class", "style"],
    figcaption: ["class", "style"],
    strong: ["class", "style"],
    b: ["class", "style"],
    em: ["class", "style"],
    i: ["class", "style"],
    u: ["class", "style"],
    s: ["class", "style"],
    strike: ["class", "style"],
    sub: ["class", "style"],
    sup: ["class", "style"],
    mark: ["class", "style"],
  },
  stripIgnoreTag: true,
  stripIgnoreTagBody: ["script", "style"],
  allowCommentTag: false,
  css: {
    whiteList: {
      color: true,
      "background-color": true,
      "font-size": true,
      "font-family": true,
      "font-weight": true,
      "font-style": true,
      "text-align": true,
      "text-decoration": true,
      "line-height": true,
      width: true,
      height: true,
      "max-width": true,
      "min-width": true,
      margin: true,
      "margin-left": true,
      "margin-right": true,
      "margin-top": true,
      "margin-bottom": true,
      padding: true,
      border: true,
      "border-color": true,
      "border-width": true,
      "border-style": true,
      "border-collapse": true,
      "border-radius": true,
      float: true,
      display: true,
      "vertical-align": true,
      "word-break": true,
      "white-space": true,
    },
  },
};

const sanitizeString = (key, value) => {
  if (typeof value !== "string") return value;
  if (RICH_TEXT_FIELDS.has(key)) {
    return xss(value, richHtmlOptions);
  }
  return xss(value);
};

const sanitizeUnknown = (value, parentKey = "") => {
  if (typeof value === "string") {
    return sanitizeString(parentKey, value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeUnknown(item));
  }

  if (value && typeof value === "object") {
    const next = {};
    Object.keys(value).forEach((key) => {
      next[key] = sanitizeUnknown(value[key], key);
    });
    return next;
  }

  return value;
};

function sanitizeInput(req, res, next) {
  if (req.body) {
    req.body = sanitizeUnknown(req.body);
  }

  if (req.query) {
    req.query = sanitizeUnknown(req.query);
  }

  if (req.params) {
    req.params = sanitizeUnknown(req.params);
  }

  next();
}

module.exports = sanitizeInput;
