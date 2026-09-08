const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const db = require('./models');
const errorHandler = require('./middlewares/error.middleware');
const logger = require('./utils/logger');

const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      // Dynamic request origin reflection to support credentials = true
      callback(null, true);
    },
    credentials: true
  }
});
app.set('io', io);

// WebSockets Connection Handler
io.on('connection', (socket) => {
  // Join a chat room
  socket.on('join_room', (data) => {
    const { roomId } = data;
    socket.join(roomId);
  });

  // Sending real-time messages
  socket.on('send_message', (data) => {
    const { roomId, senderId, receiverId, messageText, mediaUrl, isRead, id, createdAt } = data;
    io.to(roomId).emit('receive_message', {
      id,
      senderId,
      receiverId,
      messageText,
      mediaUrl,
      isRead,
      createdAt
    });

    // Trigger system-wide notification to receiver
    io.emit('new_notification', {
      receiverId,
      senderId,
      messageText: mediaUrl ? '📷 Sent an image attachment' : messageText
    });
  });

  // Typing states
  socket.on('typing', (data) => {
    const { roomId, senderId } = data;
    socket.to(roomId).emit('typing', { senderId });
  });

  socket.on('stop_typing', (data) => {
    const { roomId, senderId } = data;
    socket.to(roomId).emit('stop_typing', { senderId });
  });

  // Message read receipts
  socket.on('mark_as_read', (data) => {
    const { roomId, senderId } = data;
    socket.to(roomId).emit('mark_as_read', { senderId });
  });

  socket.on('disconnect', () => {
    // console.log('Socket disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;

// ==========================================
// SECURITY MIDDLEWARES
// ==========================================
app.use(helmet({
  crossOriginResourcePolicy: false,
  crossOriginEmbedderPolicy: false
})); // Set security HTTP headers
app.use(cors({
  origin: (origin, callback) => {
    // Dynamic request origin reflection to support credentials = true
    callback(null, true);
  },
  credentials: true
}));

// API Rate Limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes.'
  }
});
app.use('/api/', apiLimiter);

// ==========================================
// REQUEST PARSING & LOGGING
// ==========================================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev')); // Dev request logging

// Static file hosting for uploads (profile pictures, Aadhaar, certificates)
app.use('/uploads', express.static('uploads'));

// ==========================================
// API ROUTES
// ==========================================
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is healthy and running.',
    timestamp: new Date()
  });
});

// Auth Routes
const authRoutes = require('./routes/auth.routes');
app.use('/api/auth', authRoutes);

// Category Routes
const categoryRoutes = require('./routes/category.routes');
app.use('/api/categories', categoryRoutes);

// Service Routes
const serviceRoutes = require('./routes/service.routes');
app.use('/api/services', serviceRoutes);

// Booking Routes
const bookingRoutes = require('./routes/booking.routes');
app.use('/api/bookings', bookingRoutes);

// Customer Routes
const customerRoutes = require('./routes/customer.routes');
app.use('/api/customers', customerRoutes);

// Provider Routes
const providerRoutes = require('./routes/provider.routes');
app.use('/api/providers', providerRoutes);

// Admin Routes
const adminRoutes = require('./routes/admin.routes');
app.use('/api/admin', adminRoutes);

// Settings Routes
const settingRoutes = require('./routes/setting.routes');
app.use('/api/settings', settingRoutes);

// Chat Routes
const chatRoutes = require('./routes/chat.routes');
app.use('/api/chat', chatRoutes);

// ==========================================
// GLOBAL ERROR HANDLER
// ==========================================
app.use(errorHandler);

// ==========================================
// DATABASE CONNECTION & START SERVER
// ==========================================
db.sequelize.authenticate()
  .then(() => {
    logger.info('Database connection established successfully.');
    return db.sequelize.sync({ alter: true }); // Safely alter tables to create new columns if they do not exist
  })
  .then(() => {
    logger.info('Database tables synced.');
    return db.SystemSetting.findOne();
  })
  .then((settings) => {
    const defaultFeatures = [
      { "title": "Easy Booking Submission", "description": "Book issues with categories, specific dates and time slots in just a few clicks.", "icon": "🛠️" },
      { "title": "Real-time Tracking", "description": "Track status in real-time from booking to resolution with live updates.", "icon": "📍" },
      { "title": "Role-based Access", "description": "Separate dashboards for Customers, Providers, and Admins with secure access.", "icon": "👥" },
      { "title": "Smart Notifications", "description": "Get instant email and in-app notifications for booking updates and assignments.", "icon": "🔔" },
      { "title": "Analytics & Reports", "description": "Detailed reports and charts to monitor booking performance and service history.", "icon": "📊" },
      { "title": "Verified Partners", "description": "All local service providers are KYC-verified by administrators to ensure safety.", "icon": "✅" }
    ];

    const defaultModules = [
      { "title": "Customer", "description": "Submit service bookings, track status, give feedback and resolve maintenance issues easily.", "image": "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=500&auto=format&fit=crop&q=60", "icon": "👤" },
      { "title": "Service Provider", "description": "View assigned bookings, update status, manage services list and resolve requests efficiently.", "image": "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=500&auto=format&fit=crop&q=60", "icon": "🔧" },
      { "title": "Administrator", "description": "Manage users, approve KYC, monitor reports, and ensure smooth business operations across the platform.", "image": "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=500&auto=format&fit=crop&q=60", "icon": "💼" }
    ];

    const defaultStats = [
      { "value": "12K+", "label": "Services Completed", "icon": "⚙️" },
      { "value": "5K+", "label": "Happy Customers", "icon": "😊" },
      { "value": "800+", "label": "Active Partners", "icon": "🤝" },
      { "value": "15+", "label": "Cities Connected", "icon": "🌐" }
    ];

    const defaultWorkflow = [
      { "step": "1", "title": "Select & Book Service", "description": "Customers search and select a verified provider and request a service slot." },
      { "step": "2", "title": "Provider Reviews", "description": "The service provider receives notifications, reviews, and accepts the booking." },
      { "step": "3", "title": "Service Delivery", "description": "The provider visits your address at the selected time slot and completes the job." },
      { "step": "4", "title": "Resolve & Rate", "description": "Get notified on completion, make payments, and rate the provider's performance." }
    ];

    if (!settings) {
      return db.SystemSetting.create({
        logo: null,
        contactPhone: '9999999999',
        contactEmail: 'support@localservice.com',
        contactAddress: 'Maithon Dam Road, near bypass, Dhanbad, Jharkhand, Pin: 828207',
        facebookLink: 'https://facebook.com',
        instagramLink: 'https://instagram.com',
        privacyPolicy: 'Your privacy is important to us. This policy explains how we collect and use your personal information...',
        termsConditions: 'By using this platform, you agree to these terms of service and our operational policies...',
        heroSubtitle: 'SMART LOCAL SOLUTION',
        heroTitle: 'LOCAL SERVICES & MAINTENANCE SYSTEM',
        heroDescription: 'A modern platform to book, track & resolve local maintenance and home service issues efficiently. Built for customers, service providers, and administrators.',
        heroBgImage: null,
        featuresJson: JSON.stringify(defaultFeatures, null, 2),
        modulesJson: JSON.stringify(defaultModules, null, 2),
        statsJson: JSON.stringify(defaultStats, null, 2),
        workflowJson: JSON.stringify(defaultWorkflow, null, 2)
      });
    } else {
      // Seed missing homepage custom columns if they are currently null/undefined in existing DB record
      const updates = {};
      let needsUpdate = false;

      if (!settings.heroSubtitle) {
        updates.heroSubtitle = 'SMART LOCAL SOLUTION';
        needsUpdate = true;
      }
      if (!settings.heroTitle) {
        updates.heroTitle = 'LOCAL SERVICES & MAINTENANCE SYSTEM';
        needsUpdate = true;
      }
      if (!settings.heroDescription) {
        updates.heroDescription = 'A modern platform to book, track & resolve local maintenance and home service issues efficiently. Built for customers, service providers, and administrators.';
        needsUpdate = true;
      }
      if (!settings.featuresJson) {
        updates.featuresJson = JSON.stringify(defaultFeatures, null, 2);
        needsUpdate = true;
      }
      if (!settings.modulesJson) {
        updates.modulesJson = JSON.stringify(defaultModules, null, 2);
        needsUpdate = true;
      }
      if (!settings.statsJson) {
        updates.statsJson = JSON.stringify(defaultStats, null, 2);
        needsUpdate = true;
      }
      if (!settings.workflowJson) {
        updates.workflowJson = JSON.stringify(defaultWorkflow, null, 2);
        needsUpdate = true;
      }

      if (needsUpdate) {
        logger.info('Updating existing system settings with homepage defaults.');
        return settings.update(updates);
      }
    }
  })
  .then(() => {
    server.listen(PORT, () => {
      logger.info(`Server is running in ${process.env.NODE_ENV} mode on port ${PORT}`);
    });
  })
  .catch(err => {
    logger.error(`Unable to connect or sync the database: ${err.message}`);
    process.exit(1);
  });
