const multer = require('multer');
const sharp = require('sharp');
const path = require('path');

const storage = multer.memoryStorage();

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // Limit files to 5MB
    fileFilter: (req, file, cb) => {
        const allowedFileTypes = /jpeg|jpg|png|webp|svg/;
        const mimetype = allowedFileTypes.test(file.mimetype.toLowerCase());
        const extname = allowedFileTypes.test(path.extname(file.originalname).toLowerCase());

        if (mimetype && extname) {
            cb(null, true);
        } else {
            cb(new Error('Only images are allowed (jpeg, jpg, png, webp, svg).'));
        }
    },
});

module.exports = upload;
