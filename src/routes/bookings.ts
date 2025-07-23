import express from 'express';
import { body, query, validationResult } from 'express-validator';
import Booking from '../models/Booking';
import YogaShala, { IYogaShala } from '../models/YogaShala';
import User from '../models/User';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { Request, Response } from 'express';

const router = express.Router();

// Create a new booking
router.post('/', authenticate, [
  body('shala').isMongoId().withMessage('Valid shala ID is required'),
  body('className').trim().notEmpty().withMessage('Class name is required'),
  body('instructor').trim().notEmpty().withMessage('Instructor name is required'),
  body('date').isISO8601().withMessage('Valid date is required'),
  body('startTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Valid start time required (HH:MM format)'),
  body('endTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Valid end time required (HH:MM format)'),
  body('paymentMethod').isIn(['package', 'drop_in', 'trial', 'free']).withMessage('Valid payment method required'),
  body('amountPaid').isFloat({ min: 0 }).withMessage('Amount paid must be a positive number'),
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { shala, className, instructor, date, startTime, endTime, paymentMethod, amountPaid, notes, specialRequests } = req.body;

    // Verify shala exists
    const yogaShala = await YogaShala.findById(shala);
    if (!yogaShala || !yogaShala.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Shala not found or inactive'
      });
    }

    // Check for existing booking at the same time
    const existingBooking = await Booking.findOne({
      user: req.userId,
      date: new Date(date),
      startTime,
      status: { $in: ['confirmed', 'pending'] }
    });

    if (existingBooking) {
      return res.status(400).json({
        success: false,
        message: 'You already have a booking at this time'
      });
    }

    // Create booking
    const booking = new Booking({
      user: req.userId,
      shala,
      className,
      instructor,
      date: new Date(date),
      startTime,
      endTime,
      paymentMethod,
      amountPaid,
      notes,
      specialRequests,
      status: paymentMethod === 'free' ? 'confirmed' : 'pending'
    });

    await booking.save();

    // Populate booking data
    const populatedBooking = await Booking.findById(booking._id)
      .populate('shala', 'name address phone')
      .populate('user', 'name email phone');

    res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      data: populatedBooking
    });
  } catch (error) {
    console.error('Booking creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating booking'
    });
  }
});

// Get user's bookings
router.get('/my-bookings', authenticate, [
  query('status').optional().isIn(['confirmed', 'pending', 'cancelled', 'completed', 'no_show']),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { status, page = 1, limit = 10 } = req.query;

    let query: any = { user: req.userId };
    if (status) {
      query.status = status;
    }

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const bookings = await Booking.find(query)
      .populate('shala', 'name address phone images')
      .sort({ date: -1, startTime: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await Booking.countDocuments(query);

    res.json({
      success: true,
      data: bookings,
      pagination: {
        current: pageNum,
        pages: Math.ceil(total / limitNum),
        total,
        limit: limitNum
      }
    });
  } catch (error) {
    console.error('Bookings fetch error:', error);
    res.status(500).json({
      success: false, 
      message: 'Server error while fetching bookings'
    });
  }
});

// Get booking by ID
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('shala') // Ensure this populates the entire shala object
      .populate('user', 'name email phone');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check if user owns the booking or is shala owner/admin
    const isOwner = booking.user._id.toString() === req.userId;
    // const isShalaOwner = req.user?.role === 'shala_owner' && (booking.shala as IYogaShala).owner.toString() === req.userId;
    const isAdmin = req.user?.role === 'admin';

    // if (!isOwner && !isShalaOwner && !isAdmin) {
    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this booking'
      });
    }

    res.json({
      success: true,
      data: booking
    });
  } catch (error) {
    console.error('Booking fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching booking'
    });
  }
});

// Cancel booking
router.patch('/:id/cancel', authenticate, [
  body('cancellationReason').optional().trim().isLength({ max: 500 }).withMessage('Cancellation reason too long'),
], async (req: AuthRequest, res: Response) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check if user owns the booking
    if (booking.user.toString() !== req.userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to cancel this booking'
      });
    }

    // Check if booking can be cancelled
    if (booking.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Booking is already cancelled'
      });
    }

    if (booking.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel completed booking'
      });
    }

    // Calculate refund (basic logic - 24 hours before class)
    const classDateTime = new Date(`${booking.date.toISOString().split('T')[0]}T${booking.startTime}`);
    const now = new Date();
    const hoursUntilClass = (classDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    let refundAmount = 0;
    if (hoursUntilClass >= 24) {
      refundAmount = booking.amountPaid; // Full refund
    } else if (hoursUntilClass >= 2) {
      refundAmount = booking.amountPaid * 0.5; // 50% refund
    }

    booking.status = 'cancelled';
    booking.cancellationReason = req.body.cancellationReason;
    booking.cancelledAt = new Date();
    booking.refundAmount = refundAmount;
    booking.updatedAt = new Date();

    await booking.save();

    res.json({
      success: true,
      message: 'Booking cancelled successfully',
      data: {
        booking,
        refundAmount
      }
    });
  } catch (error) {
    console.error('Booking cancellation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while cancelling booking'
    });
  }
});

// Check-in to class (shala owner/instructor)
router.patch('/:id/checkin', authenticate, authorize('shala_owner', 'instructor', 'admin'), async (req: AuthRequest, res: Response) => {
  try {
    const booking = await Booking.findById(req.params.id).populate('shala');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check authorization (shala owner or admin)
    // if (req.user?.role !== 'admin' && (booking.shala as IYogaShala).owner.toString() !== req.userId) {
    if (req.user?.role !== 'admin' && (booking.shala as unknown as IYogaShala).owner.toString() !== req.userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to check-in for this booking'
      });
    }

    if (booking.checkedIn) {
      return res.status(400).json({
        success: false,
        message: 'User already checked in'
      });
    }

    booking.checkedIn = true;
    booking.checkInTime = new Date();
    booking.status = 'confirmed';
    booking.updatedAt = new Date();

    await booking.save();

    res.json({
      success: true,
      message: 'Check-in successful',
      data: booking
    });
  } catch (error) {
    console.error('Check-in error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during check-in'
    });
  }
});

export default router; 