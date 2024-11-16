const express = require('express');
const router = express.Router();
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const { Pool } = require('pg');
const authenticateToken = require('../middlewares/authenticateToken');
const logActivity = require('../utils/logActivity');

const db = new Pool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    ssl: { rejectUnauthorized: false }
});

const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: function (req, file, cb) {
        const filetypes = /jpeg|jpg|png|webp/;
        const mimetype = filetypes.test(file.mimetype.toLowerCase());
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only images are allowed (jpeg, jpg, png)'));
        }
    },
});

router.post('/addCourses', authenticateToken, upload.single('image'), async (req, res) => {
    try {
        const { title, description, status, difficulty } = req.body;

        if (!title || !description || !status || !difficulty) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        let imagePath = null;
        if (req.file) {
            const filename = `course_${Date.now()}_${req.file.originalname.replace(/\s/g, '_')}`;
            imagePath = `/uploads/${filename}`;
            await sharp(req.file.buffer)
                .resize(800)
                .png({ quality: 80 })
                .toFile(`uploads/${filename}`);
        }

        const query = `
            INSERT INTO course (name, description, status, difficulty, image)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *;
        `;
        const result = await db.query(query, [title, description, status, difficulty, imagePath]);

        if (result.rowCount === 0) {
            return res.status(400).json({ error: 'Failed to add course' });
        }

        res.status(201).json(result.rows[0]);
        await logActivity('Course', `New course added: ${title}`, req.user.userId);
    } catch (err) {
        console.error('Error adding course:', err);
        res.status(500).json({ error: 'Failed to add course' });
    }
});

router.put('/editCourses/:course_id', authenticateToken, upload.single('image'), async (req, res) => {
    const { course_id } = req.params;
    const { title, description, status, difficulty } = req.body;

    if (!course_id || isNaN(course_id)) {
        return res.status(400).json({ error: 'Invalid course ID' });
    }

    try {
        let imagePath = null;

        if (req.file) {
            const filename = `course_${Date.now()}_${req.file.originalname.replace(/\s/g, '_')}`;
            imagePath = `/uploads/${filename}`;
            await sharp(req.file.buffer)
                .resize(800)
                .png({ quality: 80 })
                .toFile(`uploads/${filename}`);
        }

        const query = `
            UPDATE course SET name = $1, description = $2, status = $3, difficulty = $4, image = COALESCE($5, image) WHERE course_id = $6 RETURNING *;
        `;
        const result = await db.query(query, [title, description, status, difficulty, imagePath, course_id]);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Course not found' });
        }

        res.status(200).json(result.rows[0]);
    } catch (err) {
        console.error('Error updating course:', err);
        res.status(500).json({ error: 'Failed to update course' });
    }
});

router.get('/courses', async (req, res) => {
    try {
        const query = `
            SELECT 
                course.course_id, 
                course.name AS title, 
                course.description, 
                course.difficulty AS level, 
                course.image,
                COUNT(enrollment.user_id) AS users
            FROM course
            LEFT JOIN enrollment ON course.course_id = enrollment.course_id
            GROUP BY course.course_id;
        `;
        const result = await db.query(query);
        res.status(200).json(result.rows);
    } catch (err) {
        console.error('Error fetching courses:', err);
        res.status(500).json({ error: 'Failed to fetch courses' });
    }
});

router.get('/courses/:courseId', async (req, res) => {
    const { courseId } = req.params;

    try {
        const query = `
            SELECT 
                course.course_id, 
                course.name AS title, 
                course.description, 
                course.difficulty AS level, 
                course.image, 
                COUNT(enrollment.user_id) AS users
            FROM course
            LEFT JOIN enrollment ON course.course_id = enrollment.course_id
            WHERE course.course_id = $1
            GROUP BY course.course_id;
        `;
        const result = await db.query(query, [courseId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Course not found' });
        }

        res.status(200).json(result.rows[0]);
    } catch (err) {
        console.error('Error fetching course:', err);
        res.status(500).json({ error: 'Failed to fetch course data' });
    }
});

router.delete('/courses/:courseId', authenticateToken, async (req, res) => {
    const { courseId } = req.params;

    try {
        await db.query('DELETE FROM enrollment WHERE course_id = $1', [courseId]);
        await db.query('DELETE FROM course WHERE course_id = $1', [courseId]);

        res.status(200).json({ message: 'Course and related enrollments deleted successfully.' });
    } catch (err) {
        console.error('Error deleting course:', err);
        res.status(500).json({ error: 'Failed to delete course' });
    }
});

module.exports = router;