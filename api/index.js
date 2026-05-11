require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@vercel/postgres');
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Email Transporter Configuration
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
    }
});

app.use(cors());
app.use(express.json());

// Health Check
app.get('/api/health', async (req, res) => {
    let dbStatus = 'disconnected';
    let dbHost = 'none';
    try {
        const client = createClient();
        await client.connect();
        dbStatus = 'connected';
        const url = new URL(process.env.POSTGRES_URL);
        dbHost = url.hostname;
        await client.end();
    } catch (e) { dbStatus = 'error: ' + e.message; }

    res.json({ 
        status: 'ok', 
        timestamp: new Date(),
        database: {
            status: dbStatus,
            host: dbHost
        }
    });
});

// Authentication Middleware
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

// Input Validation Helper
const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const validatePassword = (password) => {
    return password && password.length >= 8;
};

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
            linkedin VARCHAR(255),
            github VARCHAR(255),
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

        // Robust Migrations
        const userCols = [
            { name: 'projects', type: 'JSONB DEFAULT \'[]\'' },
            { name: 'certificates', type: 'JSONB DEFAULT \'[]\'' },
            { name: 'hackathons', type: 'JSONB DEFAULT \'[]\'' },
            { name: 'year', type: 'VARCHAR(255)' },
            { name: 'field', type: 'VARCHAR(255)' },
            { name: 'interest', type: 'VARCHAR(255)' },
            { name: 'intro', type: 'TEXT' },
            { name: 'linkedin', type: 'VARCHAR(255)' },
            { name: 'github', type: 'VARCHAR(255)' }
        ];

        for (const col of userCols) {
            try {
                await client.query(`ALTER TABLE users ADD COLUMN ${col.name} ${col.type};`);
            } catch (e) { if (e.code !== '42701') console.error(`Error adding ${col.name}:`, e.message); }
        }

        try {
            await client.query(`ALTER TABLE zorus_applications ADD COLUMN score INTEGER;`);
        } catch (e) { if (e.code !== '42701') console.error(`Error adding score to zorus_applications:`, e.message); }


        // Force Reset/Ensure Admin User
        const hashedPassword = await bcrypt.hash('Ankushceo@2026', 10);
        const adminCheck = await client.query(`SELECT id FROM users WHERE email = $1;`, ['ankushka2089@gmail.com']);
        
        if (adminCheck.rows.length === 0) {
            await client.query(`
                INSERT INTO users (fname, lname, email, password, college)
                VALUES ($1, $2, $3, $4, $5);
            `, ['Ankush', 'Admin', 'ankushka2089@gmail.com', hashedPassword, 'Gigni Headquarters']);
        } else {
            await client.query(`UPDATE users SET password = $1 WHERE email = $2`, [hashedPassword, 'ankushka2089@gmail.com']);
        }

        res.status(200).json({ success: true, message: 'Database initialized and admin checked' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        if (client) await client.end();
    }
});

// Auth Endpoints
app.post(['/api/register', '/register'], async (req, res) => {
    const { fname, lname, email, password, college, year, field, interest, intro, linkedin, github } = req.body;
    
    // Input validation
    if (!fname || !lname || !email || !password || !college) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    if (!validateEmail(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
    }
    if (!validatePassword(password)) {
        return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    
    let client;
    try {
        client = createClient();
        await client.connect();
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const query = `
            INSERT INTO users (fname, lname, email, password, college, year, field, interest, intro, linkedin, github)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING id;
        `;
        const values = [fname, lname, email, hashedPassword, college, year, field, interest, intro, linkedin, github];
        const result = await client.query(query, values);
        
        // Send Welcome Email
        try {
            await transporter.sendMail({
                from: `"Gigni Community" <${process.env.GMAIL_USER}>`,
                to: email,
                subject: "Welcome to Gigni Community - Your Professional Journey Begins",
                html: `
                <div style="font-family: 'Inter', sans-serif; background-color: #000; color: #fff; padding: 40px; border-radius: 20px; max-width: 600px; margin: auto; border: 1px solid #333;">
                    <h1 style="color: #3b5bdb; font-size: 32px; margin-bottom: 20px;">Welcome to Gigni Community</h1>
                    <p style="font-size: 18px; color: #ccc;">Dear ${fname},</p>
                    <p style="font-size: 16px; line-height: 1.6; color: #aaa;">
                        We are pleased to welcome you to the Gigni community. Your professional profile has been successfully created, opening doors to exclusive opportunities in technology and innovation.
                    </p>
                    <p style="font-size: 16px; line-height: 1.6; color: #aaa;">
                        As a member of our community, you will have access to:
                    </p>
                    <ul style="color: #ccc; font-size: 14px; line-height: 1.8;">
                        <li>Industry-relevant mentorship programs</li>
                        <li>AI-powered career development tools</li>
                        <li>Exclusive internship opportunities with leading organizations</li>
                        <li>Professional networking events and workshops</li>
                    </ul>
                    <div style="text-align: center; margin-top: 30px;">
                        <a href="https://www.gigniconnect.space/dashboard.html" style="background: #3b5bdb; color: #fff; padding: 15px 30px; text-decoration: none; border-radius: 50px; font-weight: bold; display: inline-block;">Access Your Professional Dashboard</a>
                    </div>
                    <p style="font-size: 14px; color: #666; margin-top: 40px; text-align: center;">
                        Together, we are shaping the future of technology. Welcome aboard.
                    </p>
                    <p style="font-size: 12px; color: #555; margin-top: 20px; text-align: center;">
                        If you have any questions, please don't hesitate to contact our support team.
                    </p>
                </div>`
            });
        } catch (mailErr) {
            console.error("Welcome email failed to send:", mailErr);
        }

        // Create JWT token
        const token = jwt.sign(
            { id: result.rows[0].id, email: email },
            JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        res.status(201).json({ 
            success: true, 
            id: result.rows[0].id,
            token,
            user: {
                id: result.rows[0].id,
                fname,
                lname,
                email,
                college
            }
        });
    } catch (err) {
        if (err.code === '23505') return res.status(400).json({ error: "Email already exists" });
        res.status(500).json({ error: err.message });
    } finally {
        if (client) await client.end();
    }
});

app.post(['/api/login', '/login'], async (req, res) => {
    const { email, password } = req.body;
    
    // Input validation
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }
    
    let client;
    try {
        client = createClient();
        await client.connect();
        const result = await client.query(`SELECT * FROM users WHERE email = $1;`, [email]);
        const user = result.rows[0];
        
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        
        // Compare hashed password
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        
        // Create JWT token
        const token = jwt.sign(
            { id: user.id, email: user.email },
            JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        res.status(200).json({ 
            success: true, 
            token,
            user: {
                id: user.id,
                fname: user.fname,
                lname: user.lname,
                email: user.email,
                college: user.college
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        if (client) await client.end();
    }
});

// Get single user's full profile (for dashboard refresh)
app.get('/api/user/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    
    // Verify user is accessing their own profile or is admin
    if (req.user.id != id && req.user.email !== 'ankushka2089@gmail.com') {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    
    let client;
    try {
        client = createClient();
        await client.connect();
        const result = await client.query(
            `SELECT id, fname, lname, email, college, year, field, interest, intro, linkedin, github, projects, certificates, hackathons FROM users WHERE id = $1;`,
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
app.get('/api/users', authenticateToken, async (req, res) => {
    // Only admin can view all users
    if (req.user.email !== 'ankushka2089@gmail.com') {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    
    let client;
    try {
        client = createClient();
        await client.connect();
        const result = await client.query(`SELECT id, fname, lname, email, college, year, field, interest, intro, linkedin, github FROM users ORDER BY id DESC;`);
        res.status(200).json({ success: true, users: result.rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        if (client) await client.end();
    }
});

app.post('/api/user/add-item', authenticateToken, async (req, res) => {
    const { userId, type, item } = req.body;
    
    // Verify user is updating their own profile
    if (req.user.id != userId) {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    
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

app.post('/api/user/update', authenticateToken, async (req, res) => {
    const { userId, fname, lname, college, year, field, interest, intro, linkedin, github } = req.body;
    
    // Verify user is updating their own profile
    if (req.user.id != userId) {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    
    let client;
    try {
        client = createClient();
        await client.connect();
        const query = `
            UPDATE users 
            SET fname = $1, lname = $2, college = $3, year = $4, field = $5, interest = $6, intro = $7, linkedin = $8, github = $9
            WHERE id = $10;
        `;
        const values = [fname, lname, college, year, field, interest, intro, linkedin, github, userId];
        await client.query(query, values);
        res.status(200).json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        if (client) await client.end();
    }
});

// Zorus Internship Endpoints
app.post('/api/zorus-apply', authenticateToken, async (req, res) => {
    const { userId, email, fname, lname } = req.body;
    
    // Verify user is applying as themselves
    if (req.user.id != userId) {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    
    let client;
    try {
        client = createClient();
        await client.connect();
        // Check if already applied
        const check = await client.query(`SELECT id FROM zorus_applications WHERE user_id = $1;`, [userId]);
        if (check.rows.length > 0) return res.status(400).json({ error: 'Already applied' });
        
        await client.query(`INSERT INTO zorus_applications (user_id, email, fname, lname) VALUES ($1, $2, $3, $4);`, [userId, email, fname, lname]);
        
        // Send Zorus Test Invitation Email
        try {
            await transporter.sendMail({
                from: `"Gigni Community" <${process.env.GMAIL_USER}>`,
                to: email,
                subject: "Zorus 2.1 Internship Program - Technical Assessment Invitation",
                html: `
                <div style="font-family: 'Inter', sans-serif; background-color: #000; color: #fff; padding: 40px; border-radius: 20px; max-width: 600px; margin: auto; border: 1px solid #333;">
                    <h1 style="color: #f97316; font-size: 32px; margin-bottom: 20px;">Zorus 2.1 - Technical Assessment</h1>
                    <p style="font-size: 18px; color: #ccc;">Dear ${fname},</p>
                    <p style="font-size: 16px; line-height: 1.6; color: #aaa;">
                        Thank you for your interest in the <strong>Zorus 2.1 Python Internship Program</strong>.
                        We have reviewed your application and would like to invite you to participate in our technical assessment as the next step in the selection process.
                    </p>
                    <div style="background: rgba(249, 115, 22, 0.1); border-left: 4px solid #f97316; padding: 20px; margin: 25px 0;">
                        <p style="margin: 0; color: #f97316; font-weight: bold;">Assessment Specifications:</p>
                        <ul style="color: #ccc; margin-top: 10px; font-size: 14px; line-height: 1.8;">
                            <li><strong>Format:</strong> 25 Multiple Choice Questions</li>
                            <li><strong>Time Allocated:</strong> 50 Minutes</li>
                            <li><strong>Minimum Passing Score:</strong> 85%</li>
                            <li><strong>Topics:</strong> Python Fundamentals, Data Structures, Algorithms</li>
                        </ul>
                    </div>
                    <p style="font-size: 14px; line-height: 1.6; color: #aaa; margin: 20px 0;">
                        <strong>Preparation Guidelines:</strong><br>
                        • Ensure you have a quiet, distraction-free environment<br>
                        • Review basic Python concepts and syntax<br>
                        • Practice with similar technical assessments if possible<br>
                        • Have scratch paper and pen ready for calculations
                    </p>
                    <div style="text-align: center; margin-top: 30px;">
                        <a href="https://www.gigniconnect.space/zorus-test.html" style="background: #f97316; color: #fff; padding: 15px 35px; text-decoration: none; border-radius: 50px; font-weight: bold; display: inline-block; font-size: 18px;">Begin Technical Assessment</a>
                    </div>
                    <p style="font-size: 14px; color: #666; margin-top: 40px; text-align: center;">
                        Important: Please ensure you have a stable internet connection and complete the assessment in one sitting. The test will automatically submit when time expires.
                    </p>
                    <p style="font-size: 12px; color: #555; margin-top: 20px; text-align: center;">
                        Should you have any questions regarding the assessment, please contact our recruitment team.
                    </p>
                </div>`
            });
        } catch (mailErr) {
            console.error("Zorus test email failed to send:", mailErr);
        }

        res.status(200).json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        if (client) await client.end();
    }
});

app.get('/api/zorus-applications', authenticateToken, async (req, res) => {
    // Only admin can view applications
    if (req.user.email !== 'ankushka2089@gmail.com') {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    
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

app.post('/api/zorus-submit-score', authenticateToken, async (req, res) => {
    const { userId, score } = req.body;
    
    // Verify user is submitting their own score
    if (req.user.id != userId) {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    
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

// Bulk Email Sender with 20s Delay
app.post('/api/admin/send-bulk-email', authenticateToken, async (req, res) => {
    const { emails, subject, htmlBody } = req.body;
    
    // Only admin can send bulk emails
    if (req.user.email !== 'ankushka2089@gmail.com') {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    
    // Validate input
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

// Single Email Endpoint (Helper for reliable bulk sending from client)
app.post('/api/admin/send-single-email', authenticateToken, async (req, res) => {
    const { email, subject, htmlBody } = req.body;
    
    // Only admin can send emails
    if (req.user.email !== 'ankushka2089@gmail.com') return res.status(403).json({ error: 'Unauthorized' });
    
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
        return res.status(500).json({ success: false, error: "Email service credentials not configured on server." });
    }

    try {
        await transporter.sendMail({
            from: `"Gigni Community" <${process.env.GMAIL_USER}>`,
            to: email,
            subject: subject,
            html: htmlBody
        });
        res.status(200).json({ success: true });
    } catch (error) {
        console.error(`Email delivery failed to ${email}:`, error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});


module.exports = app;

if (require.main === module) {
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
}
