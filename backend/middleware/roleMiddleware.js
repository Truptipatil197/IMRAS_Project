/**
 * Role-Based Access Control Middleware
 * Checks user roles for route protection
 */

/**
 * Only Admin role can access
 */
const isAdmin = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (req.user.role !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin role required.'
      });
    }

    next();
  } catch (error) {
    console.error('Admin check error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authorization error'
    });
  }
};

/**
 * Admin or Manager can access
 */
const isManager = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (req.user.role !== 'Admin' && req.user.role !== 'Manager') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Manager or Admin role required.'
      });
    }

    next();
  } catch (error) {
    console.error('Manager check error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authorization error'
    });
  }
};

/**
 * All roles can access (Admin, Manager, Staff)
 */
const isStaff = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const allowedRoles = ['Admin', 'Manager', 'Staff'];
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Invalid role.'
      });
    }

    next();
  } catch (error) {
    console.error('Staff check error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authorization error'
    });
  }
};

module.exports = {
  isAdmin,
  isManager,
  isStaff
};

