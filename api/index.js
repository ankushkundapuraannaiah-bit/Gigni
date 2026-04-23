require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@vercel/postgres');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // Use SSL
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
    }
});

// Verify connection configuration
transporter.verify(function (error, success) {
    if (error) {
        console.error('SMTP Connection Error:', error);
    } else {
        console.log('Server is ready to take our messages');
    }
});

async function sendWelcomeEmail(to, fname) {
    const mailOptions = {
        from: `"Gigni Community" <${process.env.GMAIL_USER}>`,
        to: to,
        subject: 'Welcome to Gigni Community! 🚀',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                <h2 style="color: #3b5bdb;">Welcome to Gigni, ${fname}!</h2>
                <p>We are thrilled to have you join our community of verified, project-based interns.</p>
                <p>At <strong>Gigni</strong>, we connect ambitious students like you with real-world projects that help you build a professional profile and gain hands-on experience.</p>
                
                <div style="background: #f4f4f4; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="margin-top: 0;">What's Next?</h3>
                    <ul style="padding-left: 20px;">
                        <li><strong>Complete your profile:</strong> Fill in your college and field of study.</li>
                        <li><strong>Browse Internships:</strong> Look for projects that match your interests.</li>
                        <li><strong>Apply:</strong> Send your requests to verified companies.</li>
                    </ul>
                </div>
                
                <p>If you have any questions, feel free to reply to this email or reach out to our support team.</p>
                <p>Best regards,<br><strong>The Gigni Team</strong></p>
                <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="font-size: 12px; color: #777; text-align: center;">&copy; 2026 Gigni. All rights reserved.</p>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('Welcome email sent to:', to);
    } catch (error) {
        console.error('Error sending welcome email:', error);
    }
}

async function sendZorusTestEmail(to, fname) {
    const mailOptions = {
        from: `"Gigni Internships" <${process.env.GMAIL_USER}>`,
        to: to,
        subject: 'Zorus 2.1 Internship - Important Test Link 🚀',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                <h2 style="color: #3b5bdb;">Hello, ${fname}!</h2>
                <p>Thank you for applying to the <strong>Zorus 2.1 Internship</strong> at Gigni.</p>
                <p>To proceed with your application and evaluate your baseline Python skills, we require you to complete a mandatory selection test.</p>
                
                <div style="background: #f4f4f4; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #f97316;">Test Details</h3>
                    <ul style="padding-left: 20px;">
                        <li><strong>Format:</strong> 25 Multiple Choice Questions (MCQ)</li>
                        <li><strong>Duration:</strong> 50 Minutes (Strict Timer)</li>
                        <li><strong>Focus Area:</strong> Python, Machine Learning, and Data Science Fundamentals</li>
                    </ul>
                </div>
                
                <p style="text-align: center; margin: 30px 0;">
                    <a href="https://gigniconnect.space/zorus-test.html" style="background: #3b5bdb; color: #fff; padding: 14px 28px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">Take the Test Now</a>
                </p>

                <p>Please ensure you have a stable internet connection before starting, as the timer cannot be paused.</p>
                <p>Best of luck!<br><strong>The Gigni Team</strong></p>
                <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="font-size: 12px; color: #777; text-align: center;">&copy; 2026 Gigni. All rights reserved.</p>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('Zorus test email sent to:', to);
    } catch (error) {
        console.error('Error sending Zorus test email:', error);
    }
}

// Serve local files when running locally
app.use(express.static(__dirname));

// Utility endpoint to initialize Vercel Postgres table
app.get('/api/init', async (req, res) => {
    let client;
    try {
        client = createClient();
        await client.connect();
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
            profile_pic TEXT
        );`);

        // Migration: Ensure profile_pic column exists
        await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_pic TEXT;`);
        await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS projects JSONB DEFAULT '[]';`);
        await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS certificates JSONB DEFAULT '[]';`);
        await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS hackathons JSONB DEFAULT '[]';`);
        await client.query(`CREATE TABLE IF NOT EXISTS zorus_applications (
            id SERIAL PRIMARY KEY,
            user_id INTEGER,
            email VARCHAR(255),
            fname VARCHAR(255),
            lname VARCHAR(255),
            applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );`);
        await client.query(`ALTER TABLE zorus_applications ADD COLUMN IF NOT EXISTS score INTEGER;`);

        res.status(200).json({ success: true, message: 'Table initialized and updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        if (client) await client.end();
    }
});

app.post('/api/register', async (req, res) => {
    const { fname, lname, email, password, college, year, field, interest, intro } = req.body;
    
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    let client;
    try {
        client = createClient();
        await client.connect();

        // Ensure the table and column exists before attempting to insert
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
            profile_pic TEXT
        );`);
        await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_pic TEXT;`);
        await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS projects JSONB DEFAULT '[]';`);
        await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS certificates JSONB DEFAULT '[]';`);
        await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS hackathons JSONB DEFAULT '[]';`);
        await client.query(`CREATE TABLE IF NOT EXISTS zorus_applications (
            id SERIAL PRIMARY KEY,
            user_id INTEGER,
            email VARCHAR(255),
            fname VARCHAR(255),
            lname VARCHAR(255),
            applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );`);
        await client.query(`ALTER TABLE zorus_applications ADD COLUMN IF NOT EXISTS score INTEGER;`);

        const query = `
            INSERT INTO users (fname, lname, email, password, college, year, field, interest, intro, profile_pic)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING id;
        `;
        const values = [fname, lname, email, password, college, year, field, interest, intro, null];
        
        const result = await client.query(query, values);
        
        // CRITICAL: Must await in serverless (Vercel) or the function kills the process before email sends
        try {
            await sendWelcomeEmail(email, fname);
        } catch (e) {
            console.error("Welcome email failed to send:", e);
        }

        res.status(201).json({ success: true, id: result.rows[0].id });
    } catch (err) {
        // Handle Postgres unique constraint error (code 23505)
        if (err.code === '23505' || (err.message && err.message.toLowerCase().includes('unique'))) {
            return res.status(400).json({ error: "Email already exists" });
        }
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
        
        if (!user || user.password !== password) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        
        const { password: userPassword, ...safeUser } = user;


        res.status(200).json({ success: true, user: safeUser });
    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        if (client) await client.end();
    }
});

app.post('/api/user/update', async (req, res) => {
    const { id, fname, lname, college, year, field, intro, profile_pic } = req.body;
    
    if (!id) return res.status(400).json({ error: 'User ID required' });

    let client;
    try {
        client = createClient();
        await client.connect();

        const query = `
            UPDATE users 
            SET fname = $1, lname = $2, college = $3, year = $4, field = $5, intro = $6, profile_pic = $7
            WHERE id = $8
            RETURNING *;
        `;
        const values = [fname, lname, college, year, field, intro, profile_pic, id];
        
        const result = await client.query(query, values);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        const { password, ...safeUser } = result.rows[0];
        res.status(200).json({ success: true, user: safeUser });
    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        if (client) await client.end();
    }
});

app.get('/api/users', async (req, res) => {
    let client;
    try {
        client = createClient();
        await client.connect();
        const result = await client.query(`SELECT id, fname, lname, email, college, year, field, interest, intro, profile_pic, projects, certificates, hackathons FROM users ORDER BY id DESC;`);
        res.status(200).json({ success: true, users: result.rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        if (client) await client.end();
    }
});

app.post('/api/user/add-item', async (req, res) => {
    const { userId, type, item } = req.body;
    if (!userId || !type || !item) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    let column;
    if (type === 'project') column = 'projects';
    else if (type === 'certificate') column = 'certificates';
    else if (type === 'hackathon') column = 'hackathons';
    else return res.status(400).json({ error: 'Invalid type' });

    let client;
    try {
        client = createClient();
        await client.connect();

        // Ensure table columns exist
        await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS projects JSONB DEFAULT '[]';`);
        await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS certificates JSONB DEFAULT '[]';`);
        await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS hackathons JSONB DEFAULT '[]';`);

        const query = `
            UPDATE users 
            SET ${column} = COALESCE(${column}, '[]'::jsonb) || $1::jsonb
            WHERE id = $2
            RETURNING *;
        `;
        const values = [JSON.stringify([item]), userId];
        
        const result = await client.query(query, values);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.status(200).json({ success: true /* returning partial or full user is optional */ });
    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        if (client) await client.end();
    }
});

app.post('/api/zorus-apply', async (req, res) => {
    const { userId, email, fname, lname } = req.body;
    if (!userId || !email) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    let client;
    try {
        client = createClient();
        await client.connect();
        
        await client.query(`CREATE TABLE IF NOT EXISTS zorus_applications (
            id SERIAL PRIMARY KEY,
            user_id INTEGER,
            email VARCHAR(255),
            fname VARCHAR(255),
            lname VARCHAR(255),
            applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );`);
        await client.query(`ALTER TABLE zorus_applications ADD COLUMN IF NOT EXISTS score INTEGER;`);

        // Check if already applied
        const check = await client.query(`SELECT id FROM zorus_applications WHERE user_id = $1`, [userId]);
        if (check.rows.length > 0) {
            return res.status(400).json({ error: 'You have already applied for Zorus 2.1' });
        }

        const query = `
            INSERT INTO zorus_applications (user_id, email, fname, lname)
            VALUES ($1, $2, $3, $4)
            RETURNING id;
        `;
        await client.query(query, [userId, email, fname, lname]);
        
        try {
            await sendZorusTestEmail(email, fname);
        } catch (e) {
            console.error("Zorus test email failed to send:", e);
        }
        
        res.status(200).json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        if (client) await client.end();
    }
});

// Get Zorus Applications
app.get('/api/zorus-applications', async (req, res) => {
    let client;
    try {
        client = createClient();
        await client.connect();
        
        await client.query(`CREATE TABLE IF NOT EXISTS zorus_applications (
            id SERIAL PRIMARY KEY,
            user_id INTEGER,
            email VARCHAR(255),
            fname VARCHAR(255),
            lname VARCHAR(255),
            applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );`);
        await client.query(`ALTER TABLE zorus_applications ADD COLUMN IF NOT EXISTS score INTEGER;`);

        const result = await client.query(`SELECT id, user_id, email, fname, lname, score, applied_at FROM zorus_applications ORDER BY applied_at DESC;`);
        res.status(200).json({ success: true, applications: result.rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        if (client) await client.end();
    }
});

// Submit Zorus test score
app.post('/api/zorus-submit-score', async (req, res) => {
    const { userId, score } = req.body;
    if (userId === undefined || score === undefined) {
        return res.status(400).json({ error: 'Missing userId or score' });
    }

    let client;
    try {
        client = createClient();
        await client.connect();
        await client.query(
            `UPDATE zorus_applications SET score = $1 WHERE user_id = $2;`,
            [score, userId]
        );
        res.status(200).json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        if (client) await client.end();
    }
});

// Important: Vercel expects an exported app for serverless functions
module.exports = app;

// Fallback: If this file is executed directly (e.g. `node server.js`), start listener
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Node server running locally on http://localhost:${PORT}`);
        console.log(`Remember to hit http://localhost:${PORT}/api/init to create your table if it doesn't exist.`);
    });
}
