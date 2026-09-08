const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../models');
const authConfig = require('../config/auth.config');
const logger = require('../utils/logger');

// Generate JWT Access Token
const generateAccessToken = (user, roleName) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: roleName },
    authConfig.secret,
    { expiresIn: authConfig.jwtExpiration }
  );
};

// Generate JWT Refresh Token
const generateRefreshToken = (user) => {
  return jwt.sign(
    { id: user.id },
    authConfig.refreshSecret,
    { expiresIn: authConfig.jwtRefreshExpiration }
  );
};

// Helper to parse cookies manually without cookie-parser
const getCookieByName = (cookieHeader, name) => {
  if (!cookieHeader) return null;
  const cookies = Object.fromEntries(
    cookieHeader.split('; ').map(c => {
      const parts = c.split('=');
      return [parts[0], parts.slice(1).join('=')];
    })
  );
  return cookies[name] || null;
};

// 1. SIGNUP / REGISTER
exports.register = async (req, res, next) => {
  const transaction = await db.sequelize.transaction();
  try {
    const { name, email, password, phoneNumber, role } = req.body;

    // Check if user already exists
    const existingUser = await db.User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'Email is already registered.'
      });
    }

    // Get Role ID
    const roleRecord = await db.Role.findOne({ where: { name: role } });
    if (!roleRecord) {
      return res.status(400).json({
        success: false,
        message: 'Invalid registration role.'
      });
    }

    // Hash Password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create User
    const newUser = await db.User.create({
      roleId: roleRecord.id,
      name,
      email,
      passwordHash,
      phoneNumber,
      status: 'Active'
    }, { transaction });

    // Auto-create Profile depending on the role
    if (role === 'Customer') {
      await db.Customer.create({
        userId: newUser.id
      }, { transaction });
    } else if (role === 'Provider') {
      await db.Provider.create({
        userId: newUser.id,
        availabilityStatus: 'Offline',
        kycStatus: 'Pending'
      }, { transaction });
    }

    await transaction.commit();
    logger.info(`User registered successfully: ${email} as ${role}`);

    res.status(201).json({
      success: true,
      message: `${role} registered successfully. You can now login.`
    });

  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

// 2. LOGIN
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find user with role
    const user = await db.User.findOne({
      where: { email },
      include: [{ model: db.Role }]
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    // Validate Password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    // Check account status
    if (user.status !== 'Active') {
      return res.status(403).json({
        success: false,
        message: `Your account is ${user.status}. Please contact support.`
      });
    }

    const roleName = user.Role.name;

    // Fetch related profile details
    let profile = null;
    if (roleName === 'Customer') {
      profile = await db.Customer.findOne({ where: { userId: user.id } });
    } else if (roleName === 'Provider') {
      profile = await db.Provider.findOne({ where: { userId: user.id } });
    }

    // Generate tokens
    const accessToken = generateAccessToken(user, roleName);
    const refreshToken = generateRefreshToken(user);

    // Save refresh token in database
    user.refreshToken = refreshToken;
    await user.save();

    logger.info(`User logged in successfully: ${email}`);

    // Set refresh token as httpOnly secure cookie
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie = `refreshToken=${refreshToken}; HttpOnly; Path=/api/auth/refresh; Max-Age=${authConfig.jwtRefreshExpiration}; SameSite=Lax${isProd ? '; Secure' : ''}`;
    res.setHeader('Set-Cookie', [res.cookie]);

    res.status(200).json({
      success: true,
      message: 'Login successful.',
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: roleName,
        profile
      }
    });

  } catch (error) {
    next(error);
  }
};

// 3. REFRESH TOKEN FLOW
exports.refreshToken = async (req, res, next) => {
  try {
    const refreshToken = getCookieByName(req.headers.cookie, 'refreshToken') || req.body.refreshToken;

    if (!refreshToken) {
      return res.status(403).json({
        success: false,
        message: 'Refresh token is required.'
      });
    }

    // Verify token
    jwt.verify(refreshToken, authConfig.refreshSecret, async (err, decoded) => {
      if (err) {
        return res.status(403).json({
          success: false,
          message: 'Refresh token is expired or invalid. Please login again.'
        });
      }

      // Check if user has this refresh token active
      const user = await db.User.findByPk(decoded.id, {
        include: [{ model: db.Role }]
      });

      if (!user || user.refreshToken !== refreshToken || user.status !== 'Active') {
        return res.status(403).json({
          success: false,
          message: 'Invalid token state or suspended account.'
        });
      }

      // Generate new access token
      const newAccessToken = generateAccessToken(user, user.Role.name);

      res.status(200).json({
        success: true,
        accessToken: newAccessToken
      });
    });

  } catch (error) {
    next(error);
  }
};

// 4. LOGOUT
exports.logout = async (req, res, next) => {
  try {
    const refreshToken = getCookieByName(req.headers.cookie, 'refreshToken') || req.body.refreshToken;

    if (refreshToken) {
      // Find user and wipe refresh token
      const user = await db.User.findOne({ where: { refreshToken } });
      if (user) {
        user.refreshToken = null;
        await user.save();
      }
    }

    // Clear the httpOnly Cookie
    res.setHeader('Set-Cookie', [
      'refreshToken=; HttpOnly; Path=/api/auth/refresh; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT'
    ]);

    res.status(200).json({
      success: true,
      message: 'Logged out successfully.'
    });
  } catch (error) {
    next(error);
  }
};

// 5. CHANGE PASSWORD
exports.changePassword = async (req, res, next) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const userId = req.userId;

    const user = await db.User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    // Validate old password
    const isPasswordValid = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Old password is incorrect.'
      });
    }

    // Hash and update new password
    user.passwordHash = await bcrypt.hash(newPassword, 10);
    // Clear all active sessions/refresh tokens on password change for security
    user.refreshToken = null;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password changed successfully. Please login again with your new credentials.'
    });

  } catch (error) {
    next(error);
  }
};
