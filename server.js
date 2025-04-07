// server.js - A simple Express.js backend for a contact form

const express = require('express');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Connect to MongoDB (if you want to store messages)
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/contact_form', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('Connected to MongoDB');
}).catch(err => {
  console.error('MongoDB connection error:', err);
});

// Create a schema and model for contact messages
const MessageSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Message = mongoose.model('Message', MessageSchema);

// Configure email transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  secure: true, // Use SSL
  port: 465 // Gmail's secure SMTP port
});

// Validation middleware
const validateContactForm = (req, res, next) => {
  const { name, email, message } = req.body;
  
  // Basic validation
  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'Name is required' });
  }
  
  if (!email || !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
    return res.status(400).json({ error: 'Valid email is required' });
  }
  
  if (!message || message.trim() === '') {
    return res.status(400).json({ error: 'Message is required' });
  }
  
  next();
};

// Contact form endpoint
// Contact form endpoint
app.post('/api/contact', validateContactForm, async (req, res) => {
  try {
    const { name, email, message } = req.body;
    
    // 1. Save to database
    const newMessage = new Message({
      name,
      email,
      message
    });
    
    await newMessage.save();
    console.log('Message saved to MongoDB');
    
    // 2. Send email notification
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.ADMIN_EMAIL || process.env.EMAIL_USER,
      subject: `New Contact Form Submission from ${name}`,
      text: `
        Name: ${name}
        Email: ${email}
        Message: ${message}
      `
    };
    
    // Using Promise-based approach for better error handling
    try {
      const info = await transporter.sendMail(mailOptions);
      console.log('Email sent successfully:', info.response);
      res.status(200).json({ message: 'Your message has been saved and email notification sent!' });
    } catch (emailError) {
      console.error('Failed to send email:', emailError);
      // Still return success since we saved to DB, but note the email issue
      res.status(200).json({ 
        message: 'Your message has been saved but email notification failed',
        emailError: emailError.message
      });
    }
    
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Server error, please try again later' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});