require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── DATABASE CONNECTION ─────────────────────────────────────────────────────
// Neon/Vercel can inject the DB URL under several names — try them all.
let DB_URL =
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.DATABASE_URL ||
    process.env.NEON_DATABASE_URL ||
    process.env.NEON_POSTGRES_URL;

if (!DB_URL) {
    console.error('⛔  No database URL found. Set POSTGRES_URL in your environment / Vercel settings.');
} else {
    // Strip channel_binding=require as it causes connection timeouts in the pg driver
    DB_URL = DB_URL.replace(/channel_binding=[^&]+/g, '')
                   .replace(/&&+/g, '&')
                   .replace(/\?&/, '?')
                   .replace(/\?$/, '');
}

const pool = new Pool({
    connectionString: DB_URL,
    // Neon requires SSL in production; skip cert check for simplicity
    ssl: DB_URL && DB_URL.includes('neon.tech') ? { rejectUnauthorized: false } : false,
    // Critical for Vercel serverless: limit pool size and set timeouts
    // to avoid connection exhaustion across cold starts
    max: 1,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 10000
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

        await pool.query(`CREATE TABLE IF NOT EXISTS project_submissions (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id),
            user_email VARCHAR(255),
            user_name VARCHAR(255),
            project_name VARCHAR(255),
            code_content TEXT,
            code_file_name VARCHAR(255),
            video_url TEXT,
            video_file_name VARCHAR(255),
            video_data TEXT,
            readme_content TEXT,
            readme_file_name VARCHAR(255),
            status VARCHAR(50) DEFAULT 'Under Verification',
            submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            verified_at TIMESTAMP,
            certificate_data TEXT 
        );`);

        await pool.query(`CREATE TABLE IF NOT EXISTS issued_certificates (
            id SERIAL PRIMARY KEY,
            certificate_no VARCHAR(255) UNIQUE NOT NULL,
            recipient_name VARCHAR(255) NOT NULL,
            recipient_email VARCHAR(255),
            course_name VARCHAR(255) NOT NULL,
            date_of_issue VARCHAR(255) NOT NULL,
            certificate_data TEXT NOT NULL,
            certificate_file_name VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );`);

        await pool.query(`CREATE TABLE IF NOT EXISTS developer_projects (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id),
            user_email VARCHAR(255),
            user_name VARCHAR(255),
            project_name VARCHAR(255) NOT NULL,
            description TEXT,
            uniqueness TEXT,
            github_url VARCHAR(512),
            live_url VARCHAR(512),
            slug VARCHAR(255) UNIQUE,
            tags VARCHAR(255),
            submission_id INTEGER,
            published_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
            { table: 'zorus_applications', name: 'score', type: 'INTEGER' },
            { table: 'project_submissions', name: 'code_file_name', type: 'VARCHAR(255)' },
            { table: 'project_submissions', name: 'video_file_name', type: 'VARCHAR(255)' },
            { table: 'project_submissions', name: 'video_data', type: 'TEXT' },
            { table: 'project_submissions', name: 'readme_file_name', type: 'VARCHAR(255)' },
            { table: 'developer_projects', name: 'submission_id', type: 'INTEGER' },
            { table: 'developer_projects', name: 'slug', type: 'VARCHAR(255) UNIQUE' },
            { table: 'developer_projects', name: 'uniqueness', type: 'TEXT' },
            { table: 'developer_projects', name: 'live_url', type: 'VARCHAR(512)' },
            { table: 'developer_projects', name: 'tags', type: 'VARCHAR(255)' }
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

        // Seed Featured Repositories — exactly the 6 repos requested by Gigni
        const featuredRepos = [
            {
                name: 'CopilotKit',
                url: 'https://github.com/CopilotKit/CopilotKit',
                desc: 'CopilotKit is the open-source framework for building deeply integrated AI Copilots and agentic UI components into any React application. It bridges the gap between LLMs and real application state.',
                unique: 'First-of-its-kind framework that lets AI agents read and write your app\'s live state — turning passive chatbots into truly active co-pilots with bidirectional context.',
                tags: 'AI, React, Agents, LLM, Framework'
            },
            {
                name: 'Open Notebook',
                url: 'https://github.com/lfnovo/open-notebook',
                desc: 'Open Notebook is a powerful open-source knowledge management and AI notebook tool that lets you capture, organize, and interact with your ideas using AI — inspired by Google NotebookLM.',
                unique: 'Enables private, local-first AI-powered notebooks where your data never leaves your machine — combining RAG, multi-source ingestion, and conversational intelligence in one elegant tool.',
                tags: 'AI, Python, LLM, RAG, Productivity'
            },
            {
                name: 'PaddleOCR',
                url: 'https://github.com/PaddlePaddle/PaddleOCR',
                desc: 'PaddleOCR is an ultra-lightweight, production-grade OCR system supporting 80+ languages. Built on PaddlePaddle deep learning, it delivers state-of-the-art accuracy for text recognition at scale.',
                unique: 'Combines detection, direction classification, and recognition into a single ultra-compact pipeline — achieving near-human text extraction accuracy on mobile hardware with a 8.1MB model.',
                tags: 'AI, Computer Vision, OCR, Deep Learning, Python'
            },
            {
                name: 'OpenAI Plugins',
                url: 'https://github.com/openai/plugins',
                desc: 'The official OpenAI repository showcasing the ChatGPT Plugins ecosystem — the standard for connecting large language models to external APIs, live data, and real-world actions.',
                unique: 'Defined the universal plugin specification for LLMs — enabling any developer to extend ChatGPT\'s intelligence with custom APIs, creating the foundation of the agentic internet.',
                tags: 'AI, OpenAI, Plugins, LLM, APIs'
            },
            {
                name: 'Coding Interview University',
                url: 'https://github.com/jwasham/coding-interview-university',
                desc: 'A comprehensive, battle-tested multi-month study plan for becoming a software engineer at a major tech company. Covers data structures, algorithms, system design, and behavioral prep.',
                unique: 'The most starred educational repository on GitHub — a self-taught developer\'s complete roadmap used by hundreds of thousands to land jobs at FAANG and top-tier engineering teams worldwide.',
                tags: 'Education, Computer Science, Algorithms, Career'
            },
            {
                name: 'GitHub Copilot SDK',
                url: 'https://github.com/github/copilot-sdk',
                desc: 'The official GitHub Copilot SDK empowers developers to build custom extensions, agents, and tools that integrate directly with GitHub Copilot — the world\'s most widely used AI pair programmer.',
                unique: 'Unlocks the ability to extend and customize GitHub Copilot with domain-specific knowledge and tools — turning the world\'s most popular AI coding assistant into a fully programmable platform.',
                tags: 'AI, GitHub, Copilot, SDK, DevTools'
            }
        ];

        // Remove old featured repos that are no longer in the list
        const currentSlugs = featuredRepos.map(r => r.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
        await pool.query(
            `DELETE FROM developer_projects WHERE user_name = 'Gigni Featured' AND slug NOT IN (${currentSlugs.map((_, i) => `$${i+1}`).join(',')})`,
            currentSlugs
        ).catch(() => {}); // non-fatal if it fails

        for (const r of featuredRepos) {
            const slug = r.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
            const check = await pool.query('SELECT id FROM developer_projects WHERE slug = $1', [slug]);
            if (check.rows.length === 0) {
                await pool.query(`
                    INSERT INTO developer_projects (user_name, project_name, description, uniqueness, github_url, tags, slug)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                `, ['Gigni Featured', r.name, r.desc, r.unique, r.url, r.tags, slug]);
            } else {
                // Update existing entry with richer data
                await pool.query(`
                    UPDATE developer_projects SET description = $1, uniqueness = $2, github_url = $3, tags = $4
                    WHERE slug = $5 AND user_name = 'Gigni Featured'
                `, [r.desc, r.unique, r.url, r.tags, slug]);
            }
        }

        console.log('✅  Database schema ready.');
    } catch (err) {
        console.error('❌  Database init failed:', err.message);
    }
}

// Run immediately on cold start
initializeDatabase();

// ─── LAZY TABLE GUARD ────────────────────────────────────────────────────────
// The production DB may already be initialised from an older deployment that
// didn't include issued_certificates.  This helper creates the table on demand
// so certificate endpoints are self-healing without manual /api/init calls.
let _certTableReady = false;
async function ensureIssuedCertificatesTable() {
    if (_certTableReady) return;
    await pool.query(`CREATE TABLE IF NOT EXISTS issued_certificates (
        id SERIAL PRIMARY KEY,
        certificate_no VARCHAR(255) UNIQUE NOT NULL,
        recipient_name VARCHAR(255) NOT NULL,
        recipient_email VARCHAR(255),
        course_name VARCHAR(255) NOT NULL,
        date_of_issue VARCHAR(255) NOT NULL,
        certificate_data TEXT NOT NULL,
        certificate_file_name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`);
    _certTableReady = true;
}


// ─── EMAIL TRANSPORTER ────────────────────────────────────────────────────────
// Gmail App Passwords are shown with spaces ("xxxx xxxx xxxx xxxx") but SMTP
// requires the raw 16-char string — strip any whitespace defensively.
const gmailPass = (process.env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, '');

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // STARTTLS
    auth: {
        user: process.env.GMAIL_USER,
        pass: gmailPass
    },
    tls: {
        rejectUnauthorized: false // allow self-signed certs in some environments
    }
});

// Verify email connection on cold start — logs errors without blocking startup
if (process.env.GMAIL_USER && gmailPass) {
    transporter.verify((err) => {
        if (err) {
            console.error('❌  Email transporter verification failed:', err.message);
        } else {
            console.log('✅  Email transporter ready — SMTP connection verified.');
        }
    });
} else {
    console.warn('⚠️  GMAIL_USER or GMAIL_APP_PASSWORD not set — emails will not be sent.');
}

// ─── MIDDLEWARE ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '35mb' }));
app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    next();
});

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

// ─── ADMIN: SYSTEM DEBUG ──────────────────────────────────────────────────────
// Lets admin check DB connectivity, table counts, and email config without logs.
app.get('/api/debug', authenticateToken, async (req, res) => {
    if (req.user.email !== 'ankushka2089@gmail.com') {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    const report = {
        db_url_set: !!DB_URL,
        email_user_set: !!process.env.GMAIL_USER,
        email_pass_set: !!gmailPass,
        jwt_secret_custom: !!process.env.JWT_SECRET,
        db: 'unknown',
        user_count: null,
        zorus_count: null,
        email_verify: 'not_checked'
    };
    try {
        await pool.query('SELECT 1;');
        report.db = 'connected';
        const uc = await pool.query('SELECT COUNT(*) FROM users;');
        report.user_count = parseInt(uc.rows[0].count);
        const zc = await pool.query('SELECT COUNT(*) FROM zorus_applications;');
        report.zorus_count = parseInt(zc.rows[0].count);
    } catch (e) {
        report.db = 'error: ' + e.message;
    }
    // Non-blocking email verify
    try {
        await transporter.verify();
        report.email_verify = 'ok';
    } catch (e) {
        report.email_verify = 'error: ' + e.message;
    }
    res.json(report);
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

        // Send welcome email (must be awaited in Vercel before res.json, but failure must NOT break registration)
        if (process.env.GMAIL_USER && gmailPass) {
            try {
                await transporter.sendMail({
                    from: `"Gigni Community" <${process.env.GMAIL_USER}>`,
                    to: email,
                    subject: 'Welcome to the Gigni Community — Your Journey Begins',
                    html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#030712;">
<div style="font-family:'Outfit',Helvetica,Arial,sans-serif;background:#030712;color:#f3f4f6;max-width:600px;margin:auto;border:1px solid rgba(255,255,255,0.08);border-radius:24px;overflow:hidden;">
  <div style="background:linear-gradient(135deg,#3b5bdb,#8b5cf6);padding:50px 40px;text-align:center;">
    <p style="font-size:12px;color:rgba(255,255,255,0.6);text-transform:uppercase;letter-spacing:3px;margin:0 0 10px;">Welcome to the Community</p>
    <h1 style="font-size:48px;color:#fff;margin:0;letter-spacing:2px;">GIGNI</h1>
    <p style="font-size:16px;color:rgba(255,255,255,0.75);margin-top:12px;">The Agentic Revolution Starts Here</p>
  </div>
  <div style="padding:44px;">
    <p style="font-size:18px;color:#9ca3af;">Dear ${fname},</p>
    <p style="font-size:16px;line-height:1.8;color:#f3f4f6;">Welcome to <strong>Gigni</strong> — the student-driven AI community built for the agentic era. Your profile is live and your journey has officially begun.</p>
    <div style="margin:36px 0;background:rgba(255,255,255,0.03);border-radius:20px;padding:30px;border:1px solid rgba(255,255,255,0.06);">
      <h3 style="color:#f97316;margin-top:0;text-transform:uppercase;font-size:13px;letter-spacing:1px;">What's Next?</h3>
      <ul style="padding-left:0;list-style:none;">
        <li style="margin-bottom:14px;display:flex;align-items:flex-start;gap:10px;color:#d1d5db;"><span style="color:#3b5bdb;font-size:18px;">✓</span> <span>Complete your profile to unlock full community access</span></li>
        <li style="margin-bottom:14px;display:flex;align-items:flex-start;gap:10px;color:#d1d5db;"><span style="color:#3b5bdb;font-size:18px;">✓</span> <span>Explore the <strong>Zorus 2.1</strong> internship programme — applications open now</span></li>
        <li style="margin-bottom:0;display:flex;align-items:flex-start;gap:10px;color:#d1d5db;"><span style="color:#3b5bdb;font-size:18px;">✓</span> <span>Connect with builders, get verified credentials, and build your agentic portfolio</span></li>
      </ul>
    </div>
    <div style="text-align:center;margin:40px 0;">
      <a href="https://www.gigniconnect.space/dashboard.html" style="background:linear-gradient(135deg,#3b5bdb,#8b5cf6);color:#fff;padding:18px 52px;border-radius:100px;text-decoration:none;font-weight:800;font-size:17px;display:inline-block;">Access Your Dashboard →</a>
    </div>
    <p style="font-size:13px;color:#4b5563;text-align:center;margin-top:40px;">Warm regards,<br><strong style="color:#fff;">Team Gigni</strong><br><span style="font-size:11px;">gigniconnect@gmail.com · gigniconnect.space</span></p>
  </div>
</div></body></html>`
                });
                console.log(`✅  Welcome email sent to ${email}`);
            } catch (err) {
                console.error(`❌  Welcome email failed for ${email}:`, err.message);
            }
        } else {
            console.warn('⚠️  Skipping welcome email — email credentials not configured.');
        }

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

// ─── PROJECT SUBMISSIONS ─────────────────────────────────────────────────────
app.post('/api/project/submit', authenticateToken, async (req, res) => {
    const {
        projectName,
        codeContent,
        codeFileName,
        videoUrl,
        videoFileName,
        videoData,
        readmeContent,
        readmeFileName
    } = req.body;
    const userId = req.user.id;
    const userEmail = req.user.email;

    if (!projectName || !codeContent || !readmeContent || (!videoUrl && !videoData)) {
        return res.status(400).json({ error: 'Project, code, demo video, and README are required' });
    }

    try {
        const userRes = await pool.query('SELECT fname, lname FROM users WHERE id = $1', [userId]);
        if (userRes.rows.length === 0) return res.status(404).json({ error: 'User not found' });
        const userName = `${userRes.rows[0].fname || ''} ${userRes.rows[0].lname || ''}`.trim() || userEmail;

        await pool.query(
            `INSERT INTO project_submissions (
                user_id, user_email, user_name, project_name,
                code_content, code_file_name, video_url, video_file_name, video_data,
                readme_content, readme_file_name
             )
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
            [
                userId,
                userEmail,
                userName,
                projectName,
                codeContent,
                codeFileName || 'work-code.txt',
                videoUrl || null,
                videoFileName || null,
                videoData || null,
                readmeContent,
                readmeFileName || 'README.md'
            ]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/project/submissions', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT * FROM project_submissions WHERE user_id = $1 ORDER BY submitted_at DESC`,
            [req.user.id]
        );
        res.json({ success: true, submissions: result.rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── ADMIN: SUBMISSIONS & VERIFICATION ───────────────────────────────────────
app.get('/api/admin/submissions', authenticateToken, async (req, res) => {
    if (req.user.email !== 'ankushka2089@gmail.com') return res.status(403).json({ error: 'Unauthorized' });
    try {
        const result = await pool.query(`SELECT * FROM project_submissions ORDER BY submitted_at DESC`);
        res.json({ success: true, submissions: result.rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/admin/verify-submission', authenticateToken, async (req, res) => {
    if (req.user.email !== 'ankushka2089@gmail.com') return res.status(403).json({ error: 'Unauthorized' });
    const { submissionId, certificateBase64 } = req.body;
    if (!submissionId || !certificateBase64) {
        return res.status(400).json({ error: 'Submission ID and certificate file are required' });
    }

    try {
        const result = await pool.query(
            `UPDATE project_submissions 
             SET status = 'Verified', verified_at = CURRENT_TIMESTAMP, certificate_data = $1 
             WHERE id = $2 RETURNING user_email, user_name, project_name`,
            [certificateBase64, submissionId]
        );

        const sub = result.rows[0];
        if (!sub) return res.status(404).json({ error: 'Submission not found' });
        if (process.env.GMAIL_USER && gmailPass) {
            await transporter.sendMail({
                from: `"Gigni Verification" <${process.env.GMAIL_USER}>`,
                to: sub.user_email,
                subject: `Credential Issued: ${sub.project_name}`,
                html: `<!DOCTYPE html><html><body style="background:#030712;color:#f3f4f6;font-family:sans-serif;padding:40px;text-align:center;">
                    <div style="border:1px solid rgba(255,255,255,0.1);padding:40px;border-radius:24px;">
                        <h1 style="color:#3b5bdb;">GIGNI VERIFIED</h1>
                        <p>Congratulations ${sub.user_name},</p>
                        <p>Your submission for <strong>${sub.project_name}</strong> has passed our manual audit.</p>
                        <div style="margin:30px 0;">
                            <a href="https://www.gigniconnect.space/dashboard.html" style="background:#3b5bdb;color:#fff;padding:15px 30px;border-radius:100px;text-decoration:none;font-weight:bold;">View Certificate</a>
                        </div>
                    </div>
                </body></html>`
            });
        }
        res.json({ success: true });
    } catch (err) {
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
        
        const user = result.rows[0];
        
        // Fetch Zorus 2.1 application status
        const zorusCheck = await pool.query(`SELECT score FROM zorus_applications WHERE user_id = $1;`, [id]);
        if (zorusCheck.rows.length > 0) {
            user.zorus_applied = true;
            user.zorus_score = zorusCheck.rows[0].score;
        } else {
            user.zorus_applied = false;
            user.zorus_score = null;
        }

        res.status(200).json({ success: true, user });
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
app.post('/api/zorus-apply', authenticateToken, (req, res) => {
    res.status(403).json({ error: 'Zorus 2.1 Applications are now closed. Stay tuned for future cohorts!' });
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
app.post('/api/zorus-submit-score', authenticateToken, (req, res) => {
    res.status(403).json({ error: 'Assessment submission is closed.' });
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

// ─── ADMIN: ISSUE STAND-ALONE CERTIFICATE ───────────────────────────────────
app.post('/api/admin/issue-certificate', authenticateToken, async (req, res) => {
    if (req.user.email !== 'ankushka2089@gmail.com') {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    const {
        certificate_no,
        recipient_name,
        recipient_email,
        course_name,
        date_of_issue,
        certificate_data,
        certificate_file_name
    } = req.body;

    if (!certificate_no || !recipient_name || !course_name || !date_of_issue || !certificate_data || !certificate_file_name) {
        return res.status(400).json({ error: 'Missing required certificate details' });
    }

    try {
        await ensureIssuedCertificatesTable();
        const result = await pool.query(
            `INSERT INTO issued_certificates (
                certificate_no, recipient_name, recipient_email, course_name,
                date_of_issue, certificate_data, certificate_file_name
             )
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING id, certificate_no, recipient_name, recipient_email, course_name, date_of_issue, certificate_file_name, created_at`,
            [
                certificate_no.trim(),
                recipient_name.trim(),
                recipient_email ? recipient_email.trim() : null,
                course_name.trim(),
                date_of_issue.trim(),
                certificate_data,
                certificate_file_name
            ]
        );
        res.json({ success: true, certificate: result.rows[0] });
    } catch (err) {
        if (err.code === '23505') {
            return res.status(400).json({ error: 'Certificate number already exists' });
        }
        res.status(500).json({ error: err.message });
    }
});

// ─── ADMIN: GET ALL ISSUED CERTIFICATES ─────────────────────────────────────
app.get('/api/admin/issued-certificates', authenticateToken, async (req, res) => {
    if (req.user.email !== 'ankushka2089@gmail.com') {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    try {
        await ensureIssuedCertificatesTable();
        const result = await pool.query(
            `SELECT id, certificate_no, recipient_name, recipient_email, course_name, date_of_issue, certificate_file_name, created_at 
             FROM issued_certificates ORDER BY created_at DESC`
        );
        res.json({ success: true, certificates: result.rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── ADMIN: DELETE ISSUED CERTIFICATE ───────────────────────────────────────
app.delete('/api/admin/delete-certificate/:id', authenticateToken, async (req, res) => {
    if (req.user.email !== 'ankushka2089@gmail.com') {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    const { id } = req.params;
    try {
        await ensureIssuedCertificatesTable();
        const result = await pool.query(`DELETE FROM issued_certificates WHERE id = $1 RETURNING id`, [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Certificate not found' });
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── PUBLIC: VERIFY CERTIFICATE BY NUMBER ───────────────────────────────────
app.get('/api/certificate/verify/:certificate_no', async (req, res) => {
    const { certificate_no } = req.params;
    if (!certificate_no) {
        return res.status(400).json({ error: 'Certificate number is required' });
    }
    try {
        await ensureIssuedCertificatesTable();
        const result = await pool.query(
            `SELECT id, certificate_no, recipient_name, recipient_email, course_name, date_of_issue, certificate_data, certificate_file_name, created_at 
             FROM issued_certificates WHERE UPPER(certificate_no) = UPPER($1)`,
            [certificate_no.trim()]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Certificate not found' });
        }
        res.json({ success: true, certificate: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── COMPILER PROXY ENDPOINT ──────────────────────────────────────────────────
// Uses Wandbox API (wandbox.org) for compilation - free, keyless, and highly stable.
app.post('/api/execute', async (req, res) => {
    const { language, source_code, stdin } = req.body;

    console.log(`[compiler] Execution request: lang='${language}', codeLen=${source_code?.length || 0}`);

    if (!language || !source_code) {
        return res.status(400).json({ error: 'Language and source_code are required.' });
    }

    // Try stable versions first, then head compilers if Wandbox rotates versions.
    // ── Wandbox compiler map ─────────────────────────────────────────────────
    const WANDBOX_COMPILERS = {
        'c':          'gcc-13.2.0-c',
        'cpp':        'gcc-13.2.0',
        'c++':        'gcc-13.2.0',
        'java':       'openjdk-jdk-21+35',
        'python':     'cpython-3.10.15',
        'python3':    'cpython-3.10.15',
        'javascript': 'nodejs-18.20.4',
        'js':         'nodejs-18.20.4'
    };

    const compilerName = WANDBOX_COMPILERS[language.toLowerCase()];
    if (!compilerName) {
        return res.status(400).json({ error: `Language '${language}' is not supported by the Gigni compiler.` });
    }

    // Clean up Java Main class (Wandbox compiles prog.java, so 'public class Main' fails)
    let codeToSend = source_code;
    if (language.toLowerCase() === 'java') {
        codeToSend = source_code.replace(/\bpublic\s+class\s+Main\b/, 'class Main');
    }

    const payload = {
        compiler: compilerName,
        code:     codeToSend,
        stdin:    stdin || '',
        options:  language.toLowerCase() === 'c' || language.toLowerCase() === 'cpp' || language.toLowerCase() === 'c++' 
                    ? 'warning' 
                    : ''
    };

    try {
        const t0 = Date.now();
        // Use native https for bulletproof compatibility on Vercel
        const data = await new Promise((resolve, reject) => {
            const dataStr = JSON.stringify(payload);
            const reqOptions = {
                hostname: 'wandbox.org',
                port: 443,
                path: '/api/compile.json',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(dataStr)
                },
                timeout: 20000
            };

            const req = https.request(reqOptions, (wandboxRes) => {
                let resBody = '';
                wandboxRes.on('data', (chunk) => resBody += chunk);
                wandboxRes.on('end', () => {
                    if (wandboxRes.statusCode < 200 || wandboxRes.statusCode >= 300) {
                        reject(new Error(`Wandbox HTTP error ${wandboxRes.statusCode}: ${resBody}`));
                    } else {
                        try {
                            resolve(JSON.parse(resBody));
                        } catch (e) {
                            reject(new Error(`Failed to parse Wandbox response: ${e.message}`));
                        }
                    }
                });
            });

            req.on('error', (err) => reject(err));
            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Connection timed out'));
            });

            req.write(dataStr);
            req.end();
        });

        const elapsed = ((Date.now() - t0) / 1000).toFixed(3);

        // ── Parse Wandbox response ───────────────────────────────────────────
        // In Wandbox, status !== "0" means compilation or execution failed.
        // If compilation fails, program_message/program_output is empty and compiler_error has details.
        const isCompileError = data.status !== '0' && !data.program_message && data.compiler_error;
        const compileOutput = isCompileError ? (data.compiler_error || data.compiler_output || '') : '';
        
        const stdout = data.program_output || '';
        const stderr = isCompileError ? '' : (data.program_error || '');
        const runCode = (data.status !== '0' && !isCompileError) ? parseInt(data.status || '1') : 0;

        const statusDescription = isCompileError
            ? 'Compilation Error'
            : runCode !== 0
                ? 'Runtime Error'
                : 'Accepted';

        console.log(`✅  [compiler] ${language} via Wandbox (${compilerName}) — ${elapsed}s`);

        return res.json({
            success:         true,
            status:          { id: isCompileError || runCode !== 0 ? 6 : 3, description: statusDescription },
            stdout,
            stderr,
            compile_output:  compileOutput,
            message:         '',
            time:            elapsed,
            memory:          null
        });

    } catch (err) {
        console.error('❌  [compiler] Wandbox execution failed:', err.message);
        res.status(500).json({
            error:   'Failed to run code. The cloud compiler is temporarily unavailable — please try again in a moment.',
            details: err.message || 'Unknown error'
        });
    }
});

// ─── DEVELOPER PUBLISHER: GET SINGLE PROJECT BY SLUG ─────────────────────────
app.get('/api/dev/project/:slug', async (req, res) => {
    const { slug } = req.params;
    try {
        const result = await pool.query(
            `SELECT user_name, project_name, description, uniqueness, github_url, live_url, tags, published_at
             FROM developer_projects WHERE slug = $1`,
            [slug]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Project not found' });
        res.json({ success: true, project: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── DEVELOPER PUBLISHER: PUBLISH A PROJECT ──────────────────────────────────
app.post('/api/dev/publish', authenticateToken, async (req, res) => {
    const { projectName, description, uniqueness, githubUrl, liveUrl, tags, submissionId } = req.body;
    const userId = req.user.id;
    const userEmail = req.user.email;

    if (!projectName) {
        return res.status(400).json({ error: 'Project name is required' });
    }
    if (!githubUrl && !submissionId) {
        return res.status(400).json({ error: 'Provide a GitHub URL or select an existing project submission' });
    }
    const slug = projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Math.random().toString(36).substring(2, 7);

    try {
        const userRes = await pool.query('SELECT fname, lname FROM users WHERE id = $1', [userId]);
        if (userRes.rows.length === 0) return res.status(404).json({ error: 'User not found' });
        const userName = `${userRes.rows[0].fname || ''} ${userRes.rows[0].lname || ''}`.trim() || userEmail;

        const result = await pool.query(
            `INSERT INTO developer_projects
             (user_id, user_email, user_name, project_name, description, uniqueness, github_url, live_url, tags, submission_id, slug)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
             RETURNING id`,
            [userId, userEmail, userName, projectName, description || null, uniqueness || null,
             githubUrl || null, liveUrl || null, tags || null,
             submissionId || null, slug]
        );
        res.json({ success: true, id: result.rows[0].id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── DEVELOPER PUBLISHER: GET ALL PROJECTS (public) ──────────────────────────
app.get('/api/dev/projects', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id, user_name, project_name, description, uniqueness, slug, github_url, live_url, tags, published_at
             FROM developer_projects
             ORDER BY published_at DESC
             LIMIT 100`
        );
        res.json({ success: true, projects: result.rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── DEVELOPER PUBLISHER: GET MY PROJECTS ────────────────────────────────────
app.get('/api/dev/my-projects', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id, project_name, description, github_url, live_url, tags, submission_id, published_at
             FROM developer_projects
             WHERE user_id = $1
             ORDER BY published_at DESC`,
            [req.user.id]
        );
        res.json({ success: true, projects: result.rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── DEVELOPER PUBLISHER: DELETE A PROJECT ───────────────────────────────────
app.delete('/api/dev/project/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        const check = await pool.query(`SELECT user_id FROM developer_projects WHERE id = $1`, [id]);
        if (check.rows.length === 0) return res.status(404).json({ error: 'Project not found' });
        if (check.rows[0].user_id !== req.user.id && req.user.email !== 'ankushka2089@gmail.com') {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        await pool.query(`DELETE FROM developer_projects WHERE id = $1`, [id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── EXPORT / START ───────────────────────────────────────────────────────────
module.exports = app;

if (require.main === module) {
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
}
