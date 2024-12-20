const xss = require('xss');

function sanitizeInput(req, res, next) {
    const sanitize = (value) =>
        typeof value === 'string' ? xss(value) : value;

    const sanitizeObject = (obj) =>
        Object.keys(obj).forEach((key) => {
            obj[key] = sanitize(obj[key]);
        });

    if (req.body) {
        // Special handling for lesson content to preserve HTML and styles
        if (req.body.content) {
            // Don't sanitize the content field for lessons
            const contentValue = req.body.content;
            sanitizeObject(req.body);
            req.body.content = contentValue;
        } else {
            sanitizeObject(req.body);
        }
    }
    if (req.query) sanitizeObject(req.query);
    if (req.params) sanitizeObject(req.params);

    next();
}

const escape = (str) => {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
};

module.exports = sanitizeInput;
