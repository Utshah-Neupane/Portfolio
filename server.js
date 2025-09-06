require('dotenv').config();
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

let transporter;

// Create reusable transporter object using Gmail SMTP
const createTransporter = () => {
    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_APP_PASSWORD  // Use App Password, not your regular password
        }
    });
};

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '/')));

// Initialize and start the server
async function startServer() {
    try {
        // Check for required environment variables
        if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
            throw new Error('Missing required Gmail configuration. Please set GMAIL_USER and GMAIL_APP_PASSWORD environment variables.');
        }

        // Create Gmail transporter
        transporter = createTransporter();
        
        // Test email configuration
        await new Promise((resolve, reject) => {
            transporter.verify((error, success) => {
                if (error) {
                    console.error('Error with Gmail configuration:', error);
                    console.error('Please ensure:');
                    console.error('1. You have enabled 2-Step Verification for your Gmail account');
                    console.error('2. You have created an App Password for this application');
                    console.error('3. The GMAIL_USER and GMAIL_APP_PASSWORD environment variables are set correctly');
                    reject(error);
                } else {
                    console.log('Gmail SMTP is ready to send emails');
                    resolve(success);
                }
            });
        });
        
        // Start the server
        const server = app.listen(PORT, '0.0.0.0', () => {
            console.log(`Server is running on http://localhost:${PORT}`);
            console.log('Using Gmail SMTP with account:', process.env.GMAIL_USER);
        });
        
        // Handle server errors
        server.on('error', (error) => {
            if (error.code === 'EADDRINUSE') {
                console.error(`Port ${PORT} is already in use. Please stop the other process or use a different port.`);
            } else {
                console.error('Server error:', error);
            }
            process.exit(1);
        });
        
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Start the server
startServer();

// API endpoint to handle form submissions
app.post('/api/send-email', async (req, res) => {
    try {
        const { name, email, subject, message } = req.body;
        
        if (!transporter) {
            throw new Error('Email service not initialized');
        }
        
        // Email options
        const mailOptions = {
            from: `"${name}" <${process.env.GMAIL_USER}>`,
            to: process.env.GMAIL_USER, // Send to your own email
            replyTo: email,
            subject: `[Portfolio Contact] ${subject}`,
            text: `
                You have received a new message from your portfolio contact form.
                
                Name: ${name}
                Email: ${email}
                Subject: ${subject}
                
                Message:
                ${message}
            `,
            html: `
                <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                    <h2 style="color: #5d4037;">New Message from Portfolio Contact Form</h2>
                    <p><strong>Name:</strong> ${name}</p>
                    <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
                    <p><strong>Subject:</strong> ${subject}</p>
                    <div style="margin-top: 20px; padding: 15px; background-color: #f9f5f0; border-left: 4px solid #5d4037;">
                        <p style="white-space: pre-line; margin: 0;">${message}</p>
                    </div>
                    <p style="margin-top: 20px; color: #666; font-size: 0.9em;">
                        This message was sent from your portfolio website.
                    </p>
                </div>
            `
        };

        // Send email
        await transporter.sendMail(mailOptions);
        
        res.status(200).json({ 
            success: true, 
            message: 'Your message has been sent successfully! I will get back to you soon.'
        });
    } catch (error) {
        console.error('Error sending email:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to send message. Please try again later.',
            error: error.message
        });
    }
});

// Serve the main HTML file for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
