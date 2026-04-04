require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@vercel/postgres');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Nodemailer setup
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
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
            intro TEXT
        );`);
        res.status(200).json({ success: true, message: 'Table initialized' });
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

        // Ensure the table exists before attempting to insert
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
            intro TEXT
        );`);

        const query = `
            INSERT INTO users (fname, lname, email, password, college, year, field, interest, intro)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id;
        `;
        const values = [fname, lname, email, password, college, year, field, interest, intro];
        
        const result = await client.query(query, values);
        
        // Send welcome email asynchronously (don't Wait for it to avoid registration delay)
        sendWelcomeEmail(email, fname).catch(err => console.error("Email fail:", err));

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

        // Send welcome email asynchronously (don't wait to avoid login delay)
        sendWelcomeEmail(email, user.fname).catch(err => console.error("Email fail:", err));

        res.status(200).json({ success: true, user: safeUser });
    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        if (client) await client.end();
    }
});

app.post('/api/user/update', async (req, res) => {
    const { id, fname, lname, college, year, field, intro } = req.body;
    
    if (!id) return res.status(400).json({ error: 'User ID required' });

    let client;
    try {
        client = createClient();
        await client.connect();

        const query = `
            UPDATE users 
            SET fname = $1, lname = $2, college = $3, year = $4, field = $5, intro = $6
            WHERE id = $7
            RETURNING *;
        `;
        const values = [fname, lname, college, year, field, intro, id];
        
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

// Important: Vercel expects an exported app for serverless functions
module.exports = app;

// Fallback: If this file is executed directly (e.g. `node server.js`), start listener
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Node server running locally on http://localhost:${PORT}`);
        console.log(`Remember to hit http://localhost:${PORT}/api/init to create your table if it doesn't exist.`);
    });
}
