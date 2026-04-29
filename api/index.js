require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@vercel/postgres');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname + '/..')); // Serve root files

// Initialize Database Schema
app.get('/api/init', async (req, res) => {
    let client;
    try {
        client = createClient();
        await client.connect();
        
        // Users Table
        await client.query(`CREATE TABLE IF NOT EXISTS users (
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
            projects JSONB DEFAULT '[]',
            certificates JSONB DEFAULT '[]',
            hackathons JSONB DEFAULT '[]'
        );`);

        // Zorus Applications Table
        await client.query(`CREATE TABLE IF NOT EXISTS zorus_applications (
            id SERIAL PRIMARY KEY,
            user_id INTEGER,
            email VARCHAR(255),
            fname VARCHAR(255),
            lname VARCHAR(255),
            score INTEGER,
            applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );`);
        // Zorus Access List Table (admin-managed)
        await client.query(`CREATE TABLE IF NOT EXISTS zorus_access (
            id SERIAL PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );`);

        // Migrations (Add columns if missing)
        await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS projects JSONB DEFAULT '[]';`);
        await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS certificates JSONB DEFAULT '[]';`);
        await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS hackathons JSONB DEFAULT '[]';`);
        await client.query(`ALTER TABLE zorus_applications ADD COLUMN IF NOT EXISTS score INTEGER;`);


        res.status(200).json({ success: true, message: 'Database initialized' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        if (client) await client.end();
    }
});

// Auth Endpoints
app.post('/api/register', async (req, res) => {
    const { fname, lname, email, password, college, year, field, interest, intro } = req.body;
    let client;
    try {
        client = createClient();
        await client.connect();
        const query = `
            INSERT INTO users (fname, lname, email, password, college, year, field, interest, intro)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id;
        `;
        const values = [fname, lname, email, password, college, year, field, interest, intro];
        const result = await client.query(query, values);
        res.status(201).json({ success: true, id: result.rows[0].id });
    } catch (err) {
        if (err.code === '23505') return res.status(400).json({ error: "Email already exists" });
        res.status(500).json({ error: err.message });
    } finally {
        if (client) await client.end();
    }
});

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    let client;
    try {
        client = createClient();
        await client.connect();
        const result = await client.query(`SELECT * FROM users WHERE email = $1;`, [email]);
        const user = result.rows[0];
        if (!user || user.password !== password) return res.status(401).json({ error: 'Invalid email or password' });
        res.status(200).json({ success: true, user });
    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        if (client) await client.end();
    }
});

// Get single user's full profile (for dashboard refresh)
app.get('/api/user/:id', async (req, res) => {
    const { id } = req.params;
    let client;
    try {
        client = createClient();
        await client.connect();
        const result = await client.query(
            `SELECT id, fname, lname, email, college, year, field, interest, intro, projects, certificates, hackathons FROM users WHERE id = $1;`,
            [id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
        res.status(200).json({ success: true, user: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        if (client) await client.end();
    }
});

// Admin Endpoints
app.get('/api/users', async (req, res) => {
    let client;
    try {
        client = createClient();
        await client.connect();
        const result = await client.query(`SELECT id, fname, lname, email, college, year, field, interest, intro FROM users ORDER BY id DESC;`);
        res.status(200).json({ success: true, users: result.rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        if (client) await client.end();
    }
});

app.post('/api/user/add-item', async (req, res) => {
    const { userId, type, item } = req.body;
    if (!['projects', 'certificates', 'hackathons'].includes(type + 's') && !['projects', 'certificates', 'hackathons'].includes(type)) {
        return res.status(400).json({ error: 'Invalid item type' });
    }
    const column = type.endsWith('s') ? type : type + 's';
    let client;
    try {
        client = createClient();
        await client.connect();
        const query = `UPDATE users SET ${column} = ${column} || $1::jsonb WHERE id = $2;`;
        await client.query(query, [JSON.stringify([item]), userId]);
        res.status(200).json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        if (client) await client.end();
    }
});

// Zorus Internship Endpoints
app.post('/api/zorus-apply', async (req, res) => {
    const { user_id, email, fname, lname } = req.body;
    let client;
    try {
        client = createClient();
        await client.connect();
        // Check if already applied
        const check = await client.query(`SELECT id FROM zorus_applications WHERE user_id = $1;`, [user_id]);
        if (check.rows.length > 0) return res.status(400).json({ error: 'Already applied' });
        
        await client.query(`INSERT INTO zorus_applications (user_id, email, fname, lname) VALUES ($1, $2, $3, $4);`, [user_id, email, fname, lname]);
        res.status(200).json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        if (client) await client.end();
    }
});

app.get('/api/zorus-applications', async (req, res) => {
    let client;
    try {
        client = createClient();
        await client.connect();
        const result = await client.query(`SELECT * FROM zorus_applications ORDER BY applied_at DESC;`);
        res.status(200).json({ success: true, applications: result.rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        if (client) await client.end();
    }
});

app.post('/api/zorus-submit-score', async (req, res) => {
    const { userId, score } = req.body;
    let client;
    try {
        client = createClient();
        await client.connect();
        await client.query(`UPDATE zorus_applications SET score = $1 WHERE user_id = $2;`, [score, userId]);
        res.status(200).json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        if (client) await client.end();
    }
});


// ─── User Search (for Admin) ──────────────────────────────────
app.get('/api/admin/search-users', async (req, res) => {
    const { q, adminEmail } = req.query;
    if (adminEmail !== 'ankushka2089@gmail.com') return res.status(403).json({ error: 'Unauthorized' });
    if (!q || q.length < 2) return res.json({ success: true, users: [] });

    let client;
    try {
        client = createClient();
        await client.connect();
        const searchTerm = `%${q.toLowerCase()}%`;
        const result = await client.query(
            `SELECT email, fname, lname FROM users WHERE LOWER(fname || ' ' || lname) LIKE $1 LIMIT 8;`,
            [searchTerm]
        );
        res.status(200).json({ success: true, users: result.rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        if (client) await client.end();
    }
});

// ─── Zorus 2.1 Access Management ──────────────────────────────
app.get('/api/zorus-access', async (req, res) => {
    let client;
    try {
        client = createClient();
        await client.connect();
        const result = await client.query(`SELECT email FROM zorus_access;`);
        res.status(200).json({ success: true, emails: result.rows.map(r => r.email.toLowerCase()) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        if (client) await client.end();
    }
});

app.get('/api/admin/zorus-access', async (req, res) => {
    const { adminEmail } = req.query;
    if (adminEmail !== 'ankushka2089@gmail.com') return res.status(403).json({ error: 'Unauthorized' });
    let client;
    try {
        client = createClient();
        await client.connect();
        const result = await client.query(`SELECT id, email, added_at FROM zorus_access ORDER BY added_at DESC;`);
        res.status(200).json({ success: true, list: result.rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        if (client) await client.end();
    }
});

app.post('/api/admin/zorus-access', async (req, res) => {
    const { email, adminEmail } = req.body;
    if (adminEmail !== 'ankushka2089@gmail.com') return res.status(403).json({ error: 'Unauthorized' });
    let client;
    try {
        client = createClient();
        await client.connect();
        await client.query(`INSERT INTO zorus_access (email) VALUES ($1) ON CONFLICT (email) DO NOTHING;`, [email.toLowerCase().trim()]);
        res.status(200).json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        if (client) await client.end();
    }
});

app.delete('/api/admin/zorus-access', async (req, res) => {
    const { email, adminEmail } = req.body;
    if (adminEmail !== 'ankushka2089@gmail.com') return res.status(403).json({ error: 'Unauthorized' });
    let client;
    try {
        client = createClient();
        await client.connect();
        await client.query(`DELETE FROM zorus_access WHERE email = $1;`, [email.toLowerCase().trim()]);
        res.status(200).json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        if (client) await client.end();
    }
});

// Bulk Email Sender with 20s Delay
app.post('/api/admin/send-bulk-email', async (req, res) => {
    const { emails, subject, htmlBody, adminEmail } = req.body;
    if (adminEmail !== 'ankushka2089@gmail.com') return res.status(403).json({ error: 'Unauthorized' });

    res.setHeader('Content-Type', 'application/x-ndjson');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
    res.flushHeaders(); // Flush headers immediately so streaming begins

    const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_APP_PASSWORD
        }
    });

    for (let i = 0; i < emails.length; i++) {
        const email = emails[i];
        
        try {
            await transporter.sendMail({
                from: `"Gigni Community" <${process.env.GMAIL_USER}>`,
                to: email,
                subject: subject,
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

// ─── External Email Discovery (Automated) ─────────────────────
// Scrapes public search snippets to find emails without a paid API
app.get('/api/admin/find-email-external', async (req, res) => {
    const { name, adminEmail } = req.query;
    if (adminEmail !== 'ankushka2089@gmail.com') return res.status(403).json({ error: 'Unauthorized' });
    if (!name) return res.status(400).json({ error: 'Name is required' });

    try {
        // Use DuckDuckGo HTML (less likely to block than Google/LinkedIn)
        const searchUrl = `https://duckduckgo.com/html/?q=${encodeURIComponent(name)}+linkedin+email+OR+"@gmail.com"`;
        const response = await fetch(searchUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        });
        const html = await response.text();

        // Extract emails using regex from the HTML snippets
        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
        const matches = html.match(emailRegex) || [];
        
        // Filter out common junk and duplicates
        const uniqueEmails = [...new Set(matches.map(e => e.toLowerCase()))]
            .filter(e => !e.includes('duckduckgo') && !e.includes('example') && !e.endsWith('.png') && !e.endsWith('.jpg'));

        res.status(200).json({ success: true, emails: uniqueEmails });
    } catch (err) {
        res.status(500).json({ error: 'Failed to perform external search' });
    }
});

module.exports = app;

if (require.main === module) {
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
}
