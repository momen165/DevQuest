const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const app = express();
const PORT = process.env.PORT || 5000;
require('dotenv').config();

app.use(cors());
app.use(express.json());

const db = new Pool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
});

// Middleware to verify token
const authenticateToken = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// Sample route to test database connection
app.get('/data', authenticateToken, async (req, res) => {
    try {
        const { rows } = await db.query('SELECT * FROM Devquest.student;');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Failed to retrieve data' });
    }
});

app.post('/api/insert', authenticateToken, async (req, res) => {
    const { name, age } = req.body;
    const query = 'INSERT INTO Devquest.student (name, age) VALUES ($1, $2)';
    try {
        await db.query(query, [name, age]);
        res.status(200).send('Data inserted successfully');
    } catch (err) {
        console.error('Failed to insert data:', err);
        res.status(500).send('Failed to insert data');
    }
});

app.post('/api/signup', async (req, res) => {
    const { name, email, password, country } = req.body;

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const query = 'INSERT INTO student (name, email, password, country) VALUES ($1, $2, $3, $4)';
        await db.query(query, [name, email, hashedPassword, country]);
        res.status(201).json({ message: 'User created successfully' });
    } catch (err) {
        console.error('Failed to create user:', err);
        res.status(500).json({ error: 'Failed to create user' });
    }
});

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const query = 'SELECT * FROM student WHERE email = $1';
        const { rows } = await db.query(query, [email]);

        if (rows.length === 0) {
            return res.status(400).json({ error: 'User not found' });
        }

        const user = rows[0];
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.status(200).json({ message: 'Login successful', token });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Failed to login' });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
