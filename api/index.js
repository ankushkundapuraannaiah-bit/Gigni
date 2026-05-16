const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const { sql } = require('@vercel/postgres');

const app = express();
app.use(express.json());

const SECRET_KEY = process.env.JWT_SECRET || 'your-secret-key';

const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    req.user = jwt.verify(token, SECRET_KEY);
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

const adminMiddleware = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

app.get('/api/init', async (req, res) => {
  try {
    const queries = [
      `CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255),
        bio TEXT,
        skills VARCHAR(1000),
        profile_image VARCHAR(500),
        role VARCHAR(50) DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS user_items (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        item_type VARCHAR(50),
        title VARCHAR(255),
        description TEXT,
        link VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS zorus_applications (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        application_data JSON,
        assessment_score INT,
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    ];
    for (const query of queries) {
      await sql`${query}`;
    }
    res.json({ message: 'Database initialized successfully' });
  } catch (error) {
    console.error('Init error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await sql`
      INSERT INTO users (email, password_hash, name, role)
      VALUES (${email}, ${hashedPassword}, ${name}, 'user')
      RETURNING id, email, name
    `;
    res.json({ message: 'User registered successfully', user: result.rows[0] });
  } catch (error) {
    console.error('Register error:', error);
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    const result = await sql`
      SELECT id, email, password_hash, role FROM users WHERE email = ${email}
    `;
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const user = result.rows[0];
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, SECRET_KEY, { expiresIn: '7d' });
    res.json({ token, userId: user.id });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/user/:id', authMiddleware, async (req, res) => {
  try {
    const userId = req.params.id;
    const userResult = await sql`
      SELECT id, email, name, bio, skills, profile_image FROM users WHERE id = ${userId}
    `;
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const itemsResult = await sql`
      SELECT id, item_type, title, description, link FROM user_items WHERE user_id = ${userId}
    `;
    const user = userResult.rows[0];
    user.items = itemsResult.rows;
    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/user/update', authMiddleware, async (req, res) => {
  try {
    const { name, bio, skills, profile_image } = req.body;
    const userId = req.user.id;
    const result = await sql`
      UPDATE users
      SET name = ${name}, bio = ${bio}, skills = ${skills}, profile_image = ${profile_image}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${userId}
      RETURNING id, email, name, bio, skills, profile_image
    `;
    res.json({ message: 'Profile updated successfully', user: result.rows[0] });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/user/add-item', authMiddleware, async (req, res) => {
  try {
    const { item_type, title, description, link } = req.body;
    const userId = req.user.id;
    const result = await sql`
      INSERT INTO user_items (user_id, item_type, title, description, link)
      VALUES (${userId}, ${item_type}, ${title}, ${description}, ${link})
      RETURNING id, item_type, title, description, link
    `;
    res.json({ message: 'Item added successfully', item: result.rows[0] });
  } catch (error) {
    console.error('Add item error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/zorus-apply', authMiddleware, async (req, res) => {
  try {
    const { application_data } = req.body;
    const userId = req.user.id;
    const result = await sql`
      INSERT INTO zorus_applications (user_id, application_data, status)
      VALUES (${userId}, ${JSON.stringify(application_data)}, 'pending')
      RETURNING id, user_id, status, created_at
    `;
    res.json({ message: 'Application submitted successfully', application: result.rows[0] });
  } catch (error) {
    console.error('Zorus apply error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/zorus-submit-score', authMiddleware, async (req, res) => {
  try {
    const { application_id, assessment_score } = req.body;
    const userId = req.user.id;
    const result = await sql`
      UPDATE zorus_applications
      SET assessment_score = ${assessment_score}, status = 'scored', updated_at = CURRENT_TIMESTAMP
      WHERE id = ${application_id} AND user_id = ${userId}
      RETURNING id, assessment_score, status
    `;
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }
    res.json({ message: 'Score submitted successfully', application: result.rows[0] });
  } catch (error) {
    console.error('Submit score error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/users', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const result = await sql`
      SELECT id, email, name, role, created_at FROM users ORDER BY created_at DESC
    `;
    res.json({ users: result.rows });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/zorus-applications', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const result = await sql`
      SELECT za.id, za.user_id, u.email, u.name, za.assessment_score, za.status, za.created_at
      FROM zorus_applications za
      JOIN users u ON za.user_id = u.id
      ORDER BY za.created_at DESC
    `;
    res.json({ applications: result.rows });
  } catch (error) {
    console.error('Get applications error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/send-bulk-email', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { subject, message, recipient_type } = req.body;
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });
    let recipients = [];
    if (recipient_type === 'all') {
      const result = await sql`SELECT email FROM users`;
      recipients = result.rows.map(r => r.email);
    }
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: recipients.join(','),
      subject: subject,
      text: message
    };
    await transporter.sendMail(mailOptions);
    res.json({ message: 'Bulk email sent successfully', count: recipients.length });
  } catch (error) {
    console.error('Send bulk email error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/send-collaboration-email', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { user_id, company_name, collaboration_details } = req.body;
    const userResult = await sql`
      SELECT email, name FROM users WHERE id = ${user_id}
    `;
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const user = userResult.rows[0];
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: `Collaboration Opportunity with ${company_name}`,
      text: `Dear ${user.name},\n\nWe have a collaboration opportunity for you:\n\n${collaboration_details}\n\nBest regards`
    };
    await transporter.sendMail(mailOptions);
    res.json({ message: 'Collaboration email sent successfully', recipient: user.email });
  } catch (error) {
    console.error('Send collaboration email error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = app;
