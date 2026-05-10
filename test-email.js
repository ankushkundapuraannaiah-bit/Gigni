require('dotenv').config();
const nodemailer = require('nodemailer');

console.log('Testing email configuration...');
console.log('GMAIL_USER:', process.env.GMAIL_USER);
console.log('GMAIL_APP_PASSWORD:', process.env.GMAIL_APP_PASSWORD);

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
    }
});

const mailOptions = {
    from: `"Gigni Community" <${process.env.GMAIL_USER}>`,
    to: process.env.GMAIL_USER, // Send to yourself for testing
    subject: 'Test Email from Gigni',
    html: '<h1>Test Email</h1><p>This is a test email from the Gigni application.</p>'
};

transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
        console.error('Error sending email:', error);
        return;
    }
    console.log('Email sent: ' + info.response);
});