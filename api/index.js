require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── DATABASE CONNECTION ─────────────────────────────────────────────────────
// Neon/Vercel can inject the DB URL under several names — try them all.
const DB_URL =
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.DATABASE_URL ||
    process.env.NEON_DATABASE_URL ||
    process.env.NEON_POSTGRES_URL;

if (!DB_URL) {
    console.error('⛔  No database URL found. Set POSTGRES_URL in your environment / Vercel settings.');
}

const pool = new Pool({
    connectionString: DB_URL,
    // Neon requires SSL in production; skip cert check for simplicity
    ssl: DB_URL && DB_URL.includes('neon.tech') ? { rejectUnauthorized: false } : false
});

const JWT_SECRET = process.env.JWT_SECRET || 'gigni-secret-key-change-in-production';

// ─── AUTO-INITIALIZE DATABASE SCHEMA ─────────────────────────────────────────
// Runs once on cold start so tables always exist before any request is served.
async function initializeDatabase() {
    if (!DB_URL) {
        console.warn('⚠️  Skipping DB init — no database URL configured.');
        return;
    }
    try {
        await pool.query(`CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            fname VARCHAR(255),
            lname VARCHAR(255),
            email VARCHAR(255) UNIQUE,
            password VARCHAR(255),
            college VARCHAR(255),
            year VARCHAR(255),
            field VARCHAR(255),
            interest VARCHAR(255),
            intro TEXT,
            linkedin VARCHAR(255),
            github VARCHAR(255),
            projects JSONB DEFAULT '[]',
            certificates JSONB DEFAULT '[]',
            hackathons JSONB DEFAULT '[]'
        );`);

        await pool.query(`CREATE TABLE IF NOT EXISTS zorus_applications (
            id SERIAL PRIMARY KEY,
            user_id INTEGER,
            email VARCHAR(255),
            fname VARCHAR(255),
            lname VARCHAR(255),
            score INTEGER,
            applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );`);

        // Run any missing column migrations safely
        const migrations = [
            { table: 'users', name: 'projects',      type: "JSONB DEFAULT '[]'" },
            { table: 'users', name: 'certificates',  type: "JSONB DEFAULT '[]'" },
            { table: 'users', name: 'hackathons',    type: "JSONB DEFAULT '[]'" },
            { table: 'users', name: 'year',          type: 'VARCHAR(255)' },
            { table: 'users', name: 'field',         type: 'VARCHAR(255)' },
            { table: 'users', name: 'interest',      type: 'VARCHAR(255)' },
            { table: 'users', name: 'intro',         type: 'TEXT' },
            { table: 'users', name: 'linkedin',      type: 'VARCHAR(255)' },
            { table: 'users', name: 'github',        type: 'VARCHAR(255)' },
            { table: 'zorus_applications', name: 'score', type: 'INTEGER' }
        ];
        for (const m of migrations) {
            try {
                await pool.query(`ALTER TABLE ${m.table} ADD COLUMN IF NOT EXISTS ${m.name} ${m.type};`);
            } catch (e) {
                if (e.code !== '42701') console.warn(`Migration warning (${m.name}):`, e.message);
            }
        }

        // Ensure the admin account exists
        const adminCheck = await pool.query(`SELECT id FROM users WHERE email = $1;`, ['ankushka2089@gmail.com']);
        if (adminCheck.rows.length === 0) {
            const hashedPassword = await bcrypt.hash('AdminPassword@2026', 10);
            await pool.query(`
                INSERT INTO users (fname, lname, email, password, college)
                VALUES ($1, $2, $3, $4, $5);
            `, ['Ankush', 'Admin', 'ankushka2089@gmail.com', hashedPassword, 'Gigni Headquarters']);
            console.log('✅  Admin user created.');
        }

        console.log('✅  Database schema ready.');
    } catch (err) {
        console.error('❌  Database init failed:', err.message);
    }
}

// Run immediately on cold start
initializeDatabase();

// ─── EMAIL TRANSPORTER ────────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
    }
});

// ─── MIDDLEWARE ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ─── AUTH MIDDLEWARE ──────────────────────────────────────────────────────────
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid token' });
        req.user = user;
        next();
    });
};

// ─── VALIDATION HELPERS ───────────────────────────────────────────────────────
const validateEmail    = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const validatePassword = (password) => password && password.length >= 8;

// ─── PUBLIC: HEALTH CHECK ─────────────────────────────────────────────────────
app.get('/api/health', async (req, res) => {
    try {
        await pool.query('SELECT 1;');
        res.json({ ok: true, db: 'connected', env: !!DB_URL });
    } catch (err) {
        res.status(500).json({ ok: false, db: 'disconnected', error: err.message, envSet: !!DB_URL });
    }
});

// ─── PROTECTED: MANUAL DB REPAIR (admin only) ─────────────────────────────────
app.get('/api/init', authenticateToken, async (req, res) => {
    if (req.user.email !== 'ankushka2089@gmail.com') {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    try {
        await initializeDatabase();
        res.status(200).json({ success: true, message: 'Database initialized and admin checked' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── REGISTER ─────────────────────────────────────────────────────────────────
app.post('/api/register', async (req, res) => {
    const { fname, lname, email, password, college, year, field, interest, intro, linkedin, github } = req.body;

    if (!fname || !lname || !email || !password || !college) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    if (!validateEmail(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
    }
    if (!validatePassword(password)) {
        return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await pool.query(`
            INSERT INTO users (fname, lname, email, password, college, year, field, interest, intro, linkedin, github)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING id;
        `, [fname, lname, email, hashedPassword, college, year, field, interest, intro, linkedin, github]);

        // Send welcome email (non-blocking)
        transporter.sendMail({
            from: `"Gigni Community" <${process.env.GMAIL_USER}>`,
            to: email,
            subject: 'Welcome to Gigni Community - Your Professional Journey Begins',
            html: `
            <div style="font-family: 'Inter', sans-serif; background-color: #000; color: #fff; padding: 40px; border-radius: 20px; max-width: 600px; margin: auto; border: 1px solid #333;">
                <h1 style="color: #3b5bdb; font-size: 32px; margin-bottom: 20px;">Welcome to Gigni Community</h1>
                <p style="font-size: 18px; color: #ccc;">Dear ${fname},</p>
                <p style="font-size: 16px; line-height: 1.6; color: #aaa;">
                    We are pleased to welcome you to the Gigni community. Your professional profile has been successfully created.
                </p>
                <div style="text-align: center; margin-top: 30px;">
                    <a href="https://www.gigniconnect.space/dashboard.html" style="background: #3b5bdb; color: #fff; padding: 15px 30px; text-decoration: none; border-radius: 50px; font-weight: bold; display: inline-block;">Access Your Dashboard</a>
                </div>
            </div>`
        }).catch(err => console.error('Welcome email failed:', err.message));

        const token = jwt.sign(
            { id: result.rows[0].id, email },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(201).json({
            success: true,
            id: result.rows[0].id,
            token,
            user: { id: result.rows[0].id, fname, lname, email, college, year, field, interest, intro, linkedin, github }
        });
    } catch (err) {
        if (err.code === '23505') return res.status(400).json({ error: 'Email already exists' });
        console.error('Register error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ─── LOGIN ────────────────────────────────────────────────────────────────────
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }
    try {
        const result = await pool.query(`SELECT * FROM users WHERE email = $1;`, [email]);
        const user = result.rows[0];
        if (!user) return res.status(401).json({ error: 'Invalid email or password' });

        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) return res.status(401).json({ error: 'Invalid email or password' });

        const token = jwt.sign(
            { id: user.id, email: user.email },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(200).json({
            success: true,
            token,
            user: { id: user.id, fname: user.fname, lname: user.lname, email: user.email, college: user.college }
        });
    } catch (err) {
        console.error('Login error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ─── GET SINGLE USER PROFILE ──────────────────────────────────────────────────
app.get('/api/user/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    if (req.user.id != id && req.user.email !== 'ankushka2089@gmail.com') {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    try {
        const result = await pool.query(
            `SELECT id, fname, lname, email, college, year, field, interest, intro, linkedin, github, projects, certificates, hackathons FROM users WHERE id = $1;`,
            [id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
        res.status(200).json({ success: true, user: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── ADMIN: GET ALL USERS ─────────────────────────────────────────────────────
app.get('/api/users', authenticateToken, async (req, res) => {
    if (req.user.email !== 'ankushka2089@gmail.com') {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    try {
        const result = await pool.query(
            `SELECT id, fname, lname, email, college, year, field, interest, intro, linkedin, github FROM users ORDER BY id DESC;`
        );
        res.status(200).json({ success: true, users: result.rows });
    } catch (err) {
        console.error('Fetch users error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ─── ADD ITEM (project / certificate / hackathon) ─────────────────────────────
app.post('/api/user/add-item', authenticateToken, async (req, res) => {
    const { userId, type, item } = req.body;
    if (req.user.id != userId && req.user.email !== 'ankushka2089@gmail.com') {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    const column = type.endsWith('s') ? type : type + 's';
    if (!['projects', 'certificates', 'hackathons'].includes(column)) {
        return res.status(400).json({ error: 'Invalid item type' });
    }
    try {
        await pool.query(
            `UPDATE users SET ${column} = ${column} || $1::jsonb WHERE id = $2;`,
            [JSON.stringify([item]), userId]
        );
        res.status(200).json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── UPDATE PROFILE ───────────────────────────────────────────────────────────
app.post('/api/user/update', authenticateToken, async (req, res) => {
    const { userId, fname, lname, college, year, field, interest, intro, linkedin, github } = req.body;
    if (req.user.id != userId) {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    try {
        await pool.query(`
            UPDATE users
            SET fname = $1, lname = $2, college = $3, year = $4, field = $5, interest = $6, intro = $7, linkedin = $8, github = $9
            WHERE id = $10;
        `, [fname, lname, college, year, field, interest, intro, linkedin, github, userId]);
        res.status(200).json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── ZORUS: APPLY ─────────────────────────────────────────────────────────────
app.post('/api/zorus-apply', authenticateToken, async (req, res) => {
    const { userId, email, fname, lname } = req.body;
    if (req.user.id != userId) {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    try {
        const check = await pool.query(`SELECT id FROM zorus_applications WHERE user_id = $1;`, [userId]);
        if (check.rows.length > 0) return res.status(400).json({ error: 'Already applied' });

        await pool.query(
            `INSERT INTO zorus_applications (user_id, email, fname, lname) VALUES ($1, $2, $3, $4);`,
            [userId, email, fname, lname]
        );

        // Send test invitation email (non-blocking)
        transporter.sendMail({
            from: `"Gigni Community" <${process.env.GMAIL_USER}>`,
            to: email,
            subject: 'Zorus 2.1 Internship Program - Technical Assessment Invitation',
            html: `
            <div style="font-family: 'Inter', sans-serif; background-color: #000; color: #fff; padding: 40px; border-radius: 20px; max-width: 600px; margin: auto; border: 1px solid #333;">
                <h1 style="color: #f97316; font-size: 32px; margin-bottom: 20px;">Zorus 2.1 - Technical Assessment</h1>
                <p style="font-size: 18px; color: #ccc;">Dear ${fname},</p>
                <p style="font-size: 16px; line-height: 1.6; color: #aaa;">
                    Thank you for your interest in the <strong>Zorus 2.1 Python Internship Program</strong>.
                    We invite you to participate in our technical assessment.
                </p>
                <div style="text-align: center; margin-top: 30px;">
                    <a href="https://www.gigniconnect.space/zorus-test.html" style="background: #f97316; color: #fff; padding: 15px 35px; text-decoration: none; border-radius: 50px; font-weight: bold; display: inline-block; font-size: 18px;">Begin Technical Assessment</a>
                </div>
            </div>`
        }).catch(err => console.error('Zorus email failed:', err.message));

        res.status(200).json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── ZORUS: GET ALL APPLICATIONS (admin) ─────────────────────────────────────
app.get('/api/zorus-applications', authenticateToken, async (req, res) => {
    if (req.user.email !== 'ankushka2089@gmail.com') {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    try {
        const result = await pool.query(`SELECT * FROM zorus_applications ORDER BY applied_at DESC;`);
        res.status(200).json({ success: true, applications: result.rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── ZORUS: SUBMIT SCORE ──────────────────────────────────────────────────────
app.post('/api/zorus-submit-score', authenticateToken, async (req, res) => {
    const { userId, score } = req.body;
    if (req.user.id != userId) {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    try {
        await pool.query(`UPDATE zorus_applications SET score = $1 WHERE user_id = $2;`, [score, userId]);
        res.status(200).json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── ADMIN: BULK EMAIL ────────────────────────────────────────────────────────
app.post('/api/admin/send-bulk-email', authenticateToken, async (req, res) => {
    if (req.user.email !== 'ankushka2089@gmail.com') {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    const { emails, subject, htmlBody } = req.body;
    if (!emails || !Array.isArray(emails) || emails.length === 0) {
        return res.status(400).json({ error: 'Invalid emails array' });
    }
    if (!subject || !htmlBody) {
        return res.status(400).json({ error: 'Subject and htmlBody are required' });
    }

    res.setHeader('Content-Type', 'application/x-ndjson');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    for (let i = 0; i < emails.length; i++) {
        const email = emails[i];
        try {
            await transporter.sendMail({
                from: `"Gigni Community" <${process.env.GMAIL_USER}>`,
                to: email,
                subject,
                html: htmlBody
            });
            res.write(JSON.stringify({ type: 'sent', email, index: i, total: emails.length }) + '\n');
        } catch (error) {
            res.write(JSON.stringify({ type: 'failed', email, index: i, total: emails.length, error: error.message }) + '\n');
        }
        if (i < emails.length - 1) {
            for (let s = 20; s > 0; s--) {
                res.write(JSON.stringify({ type: 'waiting', index: i + 1, secondsLeft: s }) + '\n');
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
    }
    res.end();
});

// ─── ADMIN: BRAND COLLAB EMAIL ────────────────────────────────────────────────
app.post('/api/admin/send-brand-collab', authenticateToken, async (req, res) => {
    if (req.user.email !== 'ankushka2089@gmail.com') {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    const { to, brand, contact, industry, htmlBody } = req.body;
    if (!to || !brand || !contact || !htmlBody) {
        return res.status(400).json({ error: 'Missing required fields: to, brand, contact, htmlBody' });
    }
    try {
        await transporter.sendMail({
            from: `"Gigni Community" <${process.env.GMAIL_USER}>`,
            to,
            subject: `Partnership Proposal: Gigni × ${brand} — Zorus 2.1 Talent Collaboration`,
            html: htmlBody
        });
        res.json({ success: true, message: `Proposal sent to ${to}` });
    } catch (err) {
        console.error('Brand collab email error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ─── EXPORT / START ───────────────────────────────────────────────────────────
module.exports = app;

if (require.main === module) {
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
}
