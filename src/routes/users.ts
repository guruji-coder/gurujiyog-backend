import express, { Request, Response } from 'express';
import { query, validationResult } from 'express-validator';
import User from '../models/User';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Get all users (admin only)
router.get('/', authenticate, authorize('admin'), [
  query('role').optional().isIn(['student', 'instructor', 'shala_owner', 'admin']),
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

    const { role, page = 1, limit = 10 } = req.query;

    let query: any = {};
    if (role) {
      query.role = role;
    }

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: users,
      pagination: {
        current: pageNum,
        pages: Math.ceil(total / limitNum),
        total,
        limit: limitNum
      }
    });
  } catch (error) {
    console.error('Users fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching users'
    });
  }
});

// Get user by ID
router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Users can only view their own profile unless they're admin
    if (req.user?.role !== 'admin' && req.userId !== req.params.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this profile'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('User fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching user'
    });
  }
});

// Update user role (admin only)
router.patch('/:id/role', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { role } = req.body;

    if (!['student', 'instructor', 'shala_owner', 'admin'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role specified'
      });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role, updatedAt: Date.now() },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User role updated successfully',
      data: user
    });
  } catch (error) {
    console.error('Role update error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating role'
    });
  }
});

// Deactivate user (admin only)
router.patch('/:id/deactivate', authenticate, authorize('admin'), async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: false, updatedAt: Date.now() },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User deactivated successfully',
      data: user
    });
  } catch (error) {
    console.error('User deactivation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deactivating user'
    });
  }
});

// Activate user (admin only)
router.patch('/:id/activate', authenticate, authorize('admin'), async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: true, updatedAt: Date.now() },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User activated successfully',
      data: user
    });
  } catch (error) {
    console.error('User activation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while activating user'
    });
  }
});

export default router; 