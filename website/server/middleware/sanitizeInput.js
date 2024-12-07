const xss = require('xss');

function sanitizeInput(req, res, next) {
    const sanitize = (value) =>
        typeof value === 'string' ? xss(value) : value;

    const sanitizeObject = (obj) =>
        Object.keys(obj).forEach((key) => {
            obj[key] = sanitize(obj[key]);
        });

    if (req.body) sanitizeObject(req.body);
    if (req.query) sanitizeObject(req.query);
    if (req.params) sanitizeObject(req.params);

    next();
}

module.exports = sanitizeInput;
