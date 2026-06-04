// server.js — Gigni Compiler Backend
// Proxies code execution requests to JDoodle API
// Requires JDOODLE_CLIENT_ID and JDOODLE_CLIENT_SECRET in .env

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch'); // npm install node-fetch@2

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use(require('./api/index.js'));

// Serve compiler HTML pages from public/ folder and support clean paths
const path = require('path');
const fs = require('fs');

const HTML_FILES = [
  'index', 'about', 'compiler', 'zorus',
  'c-compiler', 'cpp-compiler', 'java-compiler',
  'python-compiler', 'javascript-compiler', 'zorus-test',
  'admin', 'dashboard', 'hosting', 'verify-certificate',
  'zorus-course', 'zorus-month1'
];

HTML_FILES.forEach(name => {
  app.get([`/${name}`, `/${name}.html`], (req, res) => {
    const filePath = path.join(__dirname, 'public', `${name}.html`);
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.status(404).send('Not found');
    }
  });
});

// ── JDoodle language map ──
// Maps frontend language strings to JDoodle API language identifiers
const JDOODLE_LANGUAGE_MAP = {
  'c':       { language: 'c',       versionIndex: '5' },
  'cpp':     { language: 'cpp17',   versionIndex: '1' },
  'cpp17':   { language: 'cpp17',   versionIndex: '1' },
  'cpp14':   { language: 'cpp14',   versionIndex: '3' },
  'java':    { language: 'java',    versionIndex: '4' },
  'python':  { language: 'python3', versionIndex: '4' },
  'python3': { language: 'python3', versionIndex: '4' },
  'nodejs':  { language: 'nodejs',  versionIndex: '4' },
  'javascript': { language: 'nodejs', versionIndex: '4' },
  'js':      { language: 'nodejs',  versionIndex: '4' },
};

// ── /api/compile ──
app.post('/api/compile', async (req, res) => {
  const { language, versionIndex, script, stdin } = req.body;

  if (!script) {
    return res.status(400).json({ error: 'Missing code (script field required)' });
  }

  const clientId     = process.env.JDOODLE_CLIENT_ID;
  const clientSecret = process.env.JDOODLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error('Missing JDOODLE credentials in .env');
    return res.status(500).json({
      output: '',
      error: 'Server configuration error: Missing JDoodle API credentials. Please set JDOODLE_CLIENT_ID and JDOODLE_CLIENT_SECRET in your .env file.',
      statusCode: 500
    });
  }

  // Resolve language
  const langKey = (language || '').toLowerCase();
  const langConfig = JDOODLE_LANGUAGE_MAP[langKey];

  if (!langConfig) {
    return res.status(400).json({
      output: '',
      error: `Unsupported language: "${language}". Supported: ${Object.keys(JDOODLE_LANGUAGE_MAP).join(', ')}`,
      statusCode: 400
    });
  }

  const payload = {
    clientId,
    clientSecret,
    script,
    stdin:        stdin || '',
    language:     langConfig.language,
    versionIndex: versionIndex || langConfig.versionIndex,
  };

  try {
    const response = await fetch('https://api.jdoodle.com/v1/execute', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
      timeout: 15000,
    });

    const data = await response.json();

    // Forward JDoodle response directly — shape: { output, statusCode, memory, cpuTime, error }
    res.json(data);

  } catch (err) {
    console.error('JDoodle API error:', err.message);
    res.status(502).json({
      output: '',
      error:  `Failed to reach JDoodle API: ${err.message}`,
      statusCode: 502
    });
  }
});

// ── /api/credit-spent — check daily quota ──
app.get('/api/credit-spent', async (req, res) => {
  const clientId     = process.env.JDOODLE_CLIENT_ID;
  const clientSecret = process.env.JDOODLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return res.status(500).json({ error: 'Missing credentials' });
  }

  try {
    const response = await fetch('https://api.jdoodle.com/v1/credit-spent', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ clientId, clientSecret }),
    });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Gigni compiler server running on port ${PORT}`);
  if (!process.env.JDOODLE_CLIENT_ID) {
    console.warn('⚠  WARNING: JDOODLE_CLIENT_ID not set in .env — compilation will fail!');
  }
});
