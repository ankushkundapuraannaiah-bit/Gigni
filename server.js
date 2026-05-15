const express = require('express');
const app = require('./api/index');
const path = require('path');

const PORT = process.env.PORT || 3000;

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

app.listen(PORT, () => {
    console.log(`Node server running locally on http://localhost:${PORT}`);
    console.log(`Remember to hit http://localhost:${PORT}/api/init to create your table if it doesn't exist.`);
});