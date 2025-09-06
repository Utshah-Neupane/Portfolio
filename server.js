require('dotenv').config();
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '/')));

// Create a test account using ethereal.email (for development only)
// In production, replace this with your actual email service
const createTestAccount = async () => {
    try {
        const testAccount = await nodemailer.createTestAccount();
        console.log('Test account created:', testAccount.user);
        console.log('Test account password:', testAccount.pass);
        
        return nodemailer.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            secure: false,
            auth: {
                user: testAccount.user,
                pass: testAccount.pass
            }
        });
    } catch (error) {
        console.error('Error creating test account:', error);
        throw error;
    }
};

// Initialize transporter and start server
async function startServer() {
    try {
        // Create test email account
        const transporter = await createTestAccount();
        
        // Test email configuration
        await new Promise((resolve, reject) => {
            transporter.verify((error, success) => {
                if (error) {
                    console.error('Error with email configuration:', error);
                    reject(error);
                } else {
                    console.log('Server is ready to send emails');
                    resolve(success);
                }
            });
        });
        
        // Start the server
        app.listen(PORT, () => {
            console.log(`Server is running on http://localhost:${PORT}`);
        });
        
        // Make transporter available to route handlers
        app.set('transporter', transporter);
        
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
        const transporter = app.get('transporter');

        // Get test account info for demonstration
        const testAccount = await nodemailer.createTestAccount();
        
        // Email options
        const mailOptions = {
            from: `"${name}" <${testAccount.user}>`,
            to: testAccount.user, // Using test account for demo
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
                        This is a test email from your portfolio website. In production, this would be sent to your actual email.
                    </p>
                </div>
            `
        };

        // Send email
        const info = await transporter.sendMail(mailOptions);
        
        // Log the test email URL (ethereal.email)
        console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
        
        res.status(200).json({ 
            success: true, 
            message: 'Test message sent successfully!',
            previewUrl: nodemailer.getTestMessageUrl(info)
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
