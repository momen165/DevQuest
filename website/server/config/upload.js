const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Ensure the upload directories exist
const ensureUploadDirs = () => {
    const uploadDir = 'uploads';
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }
};

// Save image with processing, preserving transparency
const processAndSaveImage = async (buffer, filename, format = 'png') => {
    ensureUploadDirs(); // Ensure directories exist
    const filePath = path.join('uploads', filename);

    // Use the correct format based on the input
    const imageProcessor = sharp(buffer);

    if (format === 'jpeg') {
        // Convert to JPEG (no transparency)
        await imageProcessor.jpeg({ quality: 80 }).toFile(filePath);
    } else if (format === 'png') {
        // Convert to PNG (preserves transparency)
        await imageProcessor.png({ quality: 80 }).toFile(filePath);
    } else if (format === 'webp') {
        // Convert to WebP (preserves transparency)
        await imageProcessor.webp({ quality: 80 }).toFile(filePath);
    } else {
        throw new Error('Unsupported image format');
    }

    return filePath;
};

// Delete an image by file path
const deleteImage = (filePath) => {
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }
};

module.exports = {
    processAndSaveImage,
    deleteImage,
};
