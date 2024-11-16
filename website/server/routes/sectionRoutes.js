const express = require('express');
const router = express.Router();
const authenticateToken = require('../middlewares/authenticateToken');
const db = require('../config/database');
const logActivity = require('../utils/logActivity');

router.post('/api/sections', authenticateToken, async (req, res) => {
    try {
        const { courseId, title } = req.body;

        const query = `
            INSERT INTO sections (course_id, title)
            VALUES ($1, $2) RETURNING section_id
        `;
        const { rows } = await db.query(query, [courseId, title]);

        // Log activity
        await logActivity('Section', `New section added: ${title}`, req.user.userId);

        res.status(201).json({ message: 'Section added successfully' });
    } catch (err) {
        console.error('Error adding section:', err.message || err);
        res.status(500).json({ error: 'Failed to add section' });
    }
});

router.put('/api/sections/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { title } = req.body;

        const query = `
            UPDATE sections SET title = $1 WHERE section_id = $2
        `;
        await db.query(query, [title, id]);

        // Log activity
        await logActivity('Section', `Section updated: ${title}`, req.user.userId);

        res.status(200).json({ message: 'Section updated successfully' });
    } catch (err) {
        console.error('Error updating section:', err.message || err);
        res.status(500).json({ error: 'Failed to update section' });
    }
});

module.exports = router;