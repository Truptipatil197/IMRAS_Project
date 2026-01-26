const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const { User } = require('../models');
const { authenticate, authorizeRole } = require('../middleware/authMiddleware');

// Get all users (Admin only)
router.get('/', authenticate, authorizeRole(['Admin']), async (req, res) => {
    try {
        const users = await User.findAll({
            attributes: { exclude: ['password_hash'] },
            order: [['full_name', 'ASC']]
        });
        
        res.json({ success: true, users });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch users' });
    }
});

// Get user stats (Admin only)
router.get('/stats', authenticate, authorizeRole(['Admin']), async (req, res) => {
    try {
        const total = await User.count();
        const active = await User.count({ where: { is_active: true } });
        const admins = await User.count({ where: { role: 'Admin' } });
        const managers = await User.count({ where: { role: 'Manager' } });
        const staff = await User.count({ where: { role: 'Staff' } });
        
        res.json({
            success: true,
            stats: { total, active, admins, managers, staff }
        });
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch stats' });
    }
});

// Get single user (Admin only)
router.get('/:id', authenticate, authorizeRole(['Admin']), async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id, {
            attributes: { exclude: ['password_hash'] }
        });
        
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        
        res.json({ success: true, user });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch user' });
    }
});

// Create user (Admin only)
router.post('/', authenticate, authorizeRole(['Admin']), async (req, res) => {
    try {
        const { username, email, password, full_name, role, phone, department, is_active } = req.body;
        
        // Validate required fields
        if (!username || !email || !password || !full_name || !role) {
            return res.status(400).json({ 
                success: false, 
                message: 'Missing required fields' 
            });
        }
        
        // Check if username or email already exists
        const existing = await User.findOne({
            where: {
                [Op.or]: [{ username }, { email }]
            }
        });
        
        if (existing) {
            return res.status(400).json({ 
                success: false, 
                message: 'Username or email already exists' 
            });
        }
        
        // Hash password
        const password_hash = await bcrypt.hash(password, 10);
        
        // Prepare user data
        const userData = {
            username,
            email,
            password_hash,
            full_name,
            role,
            is_active: is_active !== undefined ? (is_active === 1 || is_active === true) : true
        };
        
        // Add optional fields if they exist in the model
        // Note: These fields may not exist in the User model, so we'll only add them if provided
        if (phone !== undefined) {
            userData.phone = phone;
        }
        if (department !== undefined) {
            userData.department = department;
        }
        
        const user = await User.create(userData);
        
        res.status(201).json({ 
            success: true, 
            message: 'User created successfully',
            user_id: user.user_id
        });
    } catch (error) {
        console.error('Create user error:', error);
        
        // Handle Sequelize validation errors
        if (error.name === 'SequelizeValidationError') {
            return res.status(400).json({ 
                success: false, 
                message: error.errors.map(e => e.message).join(', ') 
            });
        }
        
        // Handle unique constraint errors
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ 
                success: false, 
                message: 'Username or email already exists' 
            });
        }
        
        res.status(500).json({ success: false, message: 'Failed to create user' });
    }
});

// Update user (Admin only)
router.put('/:id', authenticate, authorizeRole(['Admin']), async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id);
        
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        
        const { username, email, password, full_name, role, phone, department, is_active } = req.body;
        
        // Check for duplicate username/email (excluding current user)
        if (username || email) {
            const whereClause = {
                user_id: { [Op.ne]: req.params.id }
            };
            
            const orConditions = [];
            if (username) orConditions.push({ username });
            if (email) orConditions.push({ email });
            
            if (orConditions.length > 0) {
                whereClause[Op.or] = orConditions;
                
                const existing = await User.findOne({ where: whereClause });
                
                if (existing) {
                    return res.status(400).json({ 
                        success: false, 
                        message: 'Username or email already exists' 
                    });
                }
            }
        }
        
        // Prepare update data
        const updateData = {};
        
        if (username) updateData.username = username;
        if (email) updateData.email = email;
        if (full_name) updateData.full_name = full_name;
        if (role) updateData.role = role;
        if (is_active !== undefined) {
            updateData.is_active = is_active === 1 || is_active === true;
        }
        if (phone !== undefined) updateData.phone = phone;
        if (department !== undefined) updateData.department = department;
        
        if (password) {
            updateData.password_hash = await bcrypt.hash(password, 10);
        }
        
        await user.update(updateData);
        
        res.json({ success: true, message: 'User updated successfully' });
    } catch (error) {
        console.error('Update user error:', error);
        
        // Handle Sequelize validation errors
        if (error.name === 'SequelizeValidationError') {
            return res.status(400).json({ 
                success: false, 
                message: error.errors.map(e => e.message).join(', ') 
            });
        }
        
        // Handle unique constraint errors
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ 
                success: false, 
                message: 'Username or email already exists' 
            });
        }
        
        res.status(500).json({ success: false, message: 'Failed to update user' });
    }
});

// Delete user (Admin only)
router.delete('/:id', authenticate, authorizeRole(['Admin']), async (req, res) => {
    try {
        // Prevent self-deletion
        if (parseInt(req.params.id) === req.user.user_id) {
            return res.status(400).json({ 
                success: false, 
                message: 'Cannot delete your own account' 
            });
        }
        
        const user = await User.findByPk(req.params.id);
        
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        
        await user.destroy();
        
        res.json({ success: true, message: 'User deleted successfully' });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete user' });
    }
});

// Reset password (Admin only)
router.put('/:id/reset-password', authenticate, authorizeRole(['Admin']), async (req, res) => {
    try {
        const { password } = req.body;
        
        if (!password || password.length < 6) {
            return res.status(400).json({ 
                success: false, 
                message: 'Password must be at least 6 characters' 
            });
        }
        
        const user = await User.findByPk(req.params.id);
        
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        
        const password_hash = await bcrypt.hash(password, 10);
        await user.update({ password_hash });
        
        res.json({ success: true, message: 'Password reset successfully' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ success: false, message: 'Failed to reset password' });
    }
});

module.exports = router;

