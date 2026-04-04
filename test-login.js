const axios = require('axios');

// Since we don't have axios installed, let's use the built-in http or fetch equivalent
// Actually, let's just start the server and use curl or create a simple test with fetch

// First, let's check if we can start the server
const { exec } = require('child_process');

console.log('Starting server...');

// Start the server in the background
const server = exec('node api/index.js', (error, stdout, stderr) => {
    if (error) {
        console.error(`Error starting server: ${error}`);
        return;
    }
    console.log(`Server stdout: ${stdout}`);
    console.error(`Server stderr: ${stderr}`);
});

// Wait a bit for server to start, then test login
setTimeout(() => {
    console.log('Testing login endpoint...');
    
    // We'll use fetch if available, otherwise we need to install something
    // Since we're in Node.js, let's use the built-in http module
    const https = require('https');
    
    const data = JSON.stringify({
        email: 'test@example.com', // Using a test email
        password: 'testpass123'
    });
    
    const options = {
        hostname: 'localhost',
        port: 3000,
        path: '/api/login',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': data.length
        }
    };
    
    const req = https.request(options, (res) => {
        console.log(`Status code: ${res.statusCode}`);
        res.on('data', (d) => {
            process.stdout.write(d);
        });
    });
    
    req.on('error', (error) => {
        console.error(error);
    });
    
    req.write(data);
    req.end();
    
}, 3000);

// Handle cleanup
process.on('SIGINT', () => {
    server.kill();
    process.exit();
});