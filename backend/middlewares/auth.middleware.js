const jwt = require('jsonwebtoken');
const authConfig = require('../config/auth.config');

const verifyToken = (req, res, next) => {
  let token = req.headers['authorization'] || req.headers['x-access-token'];

  if (!token) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. No token provided.'
    });
  }

  // Support for standard "Bearer <token>" header prefix
  if (token.startsWith('Bearer ')) {
    token = token.slice(7, token.length).trim();
  }

  jwt.verify(token, authConfig.secret, (err, decoded) => {
    if (err) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized. Access token is expired or invalid.'
      });
    }
    req.userId = decoded.id;
    req.userEmail = decoded.email;
    req.userRole = decoded.role;
    next();
  });
};

// Generic role verification middleware
const checkRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.userRole) {
      return res.status(403).json({
        success: false,
        message: 'Access Denied. User role not resolved.'
      });
    }

    if (!allowedRoles.includes(req.userRole)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden. Requires one of the following roles: ${allowedRoles.join(', ')}`
      });
    }
    next();
  };
};

module.exports = {
  verifyToken,
  isAdmin: checkRole(['Admin']),
  isProvider: checkRole(['Provider']),
  isCustomer: checkRole(['Customer']),
  hasAnyRole: (roles) => checkRole(roles)
};
