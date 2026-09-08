const { body, validationResult } = require('express-validator');

// Validation results handle karne ke liye middleware helper
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation validation failed.',
      errors: errors.array().map(err => ({ field: err.path, message: err.msg }))
    });
  }
  next();
};

// Signup validations
const registerRules = () => {
  return [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Please enter a valid email address'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long'),
    body('phoneNumber')
      .trim()
      .notEmpty()
      .withMessage('Phone number is required')
      .isLength({ min: 10, max: 15 })
      .withMessage('Please enter a valid phone number'),
    body('role')
      .isIn(['Customer', 'Provider'])
      .withMessage('Role must be either Customer or Provider')
  ];
};

// Login validations
const loginRules = () => {
  return [
    body('email').isEmail().withMessage('Please enter a valid email address'),
    body('password').notEmpty().withMessage('Password is required')
  ];
};

module.exports = {
  registerRules,
  loginRules,
  validate
};
