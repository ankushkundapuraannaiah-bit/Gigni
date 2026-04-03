require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@vercel/postgres');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
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

        const query = `
            INSERT INTO users (fname, lname, email, password, college, year, field, interest, intro)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id;
        `;
        const values = [fname, lname, email, password, college, year, field, interest, intro];
        
        const result = await client.query(query, values);
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
        
        res.status(200).json({ success: true, user: { id: user.id, fname: user.fname, email: user.email } });
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
