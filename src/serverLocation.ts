// import express from 'express';
// import cors from 'cors';
// import helmet from 'helmet';
// import dotenv from 'dotenv';
// import rateLimit from 'express-rate-limit';
// import { connectDB } from './utils/database';

// // Import routes
// import authRoutes from './routes/auth';
// import shalaRoutes from './routes/shalas';
// import bookingRoutes from './routes/bookings';
// import userRoutes from './routes/users';

// // Load environment variables
// dotenv.config();

// const app = express();
// const PORT = process.env.PORT || 5000;

// // Connect to MongoDB
// connectDB();

// // Rate limiting
// const limiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 100, // Limit each IP to 100 requests per windowMs
//   message: 'Too many requests from this IP, please try again later.'
// });

// // Middleware
// app.use(helmet());
// app.use(cors({
//   origin: process.env.CLIENT_URL || 'http://localhost:3000',
//   credentials: true
// }));
// app.use(limiter);
// app.use(express.json({ limit: '10mb' }));
// app.use(express.urlencoded({ extended: true }));

// // Serve static files
// app.use('/uploads', express.static('public/uploads'));

// // Routes
// app.use('/api/auth', authRoutes);
// app.use('/api/shalas', shalaRoutes);
// app.use('/api/bookings', bookingRoutes);
// app.use('/api/users', userRoutes);

// // Health check
// app.get('/api/health', (req, res) => {
//   res.json({ status: 'OK', timestamp: new Date().toISOString() });
// });

// // Error handling middleware
// app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
//   console.error(err.stack);
//   res.status(500).json({
//     success: false,
//     message: 'Something went wrong!',
//     ...(process.env.NODE_ENV === 'development' && { error: err.message })
//   });
// });

// // 404 handler
// app.use((req, res) => {
//   res.status(404).json({ success: false, message: 'Route not found' });
// });

// app.listen(PORT, () => {
//   console.log(`🚀 Server running on port ${PORT}`);
//   console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
// });
