const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure destination directories exist dynamically
const ensureDirExists = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

// Common storage configuration factory
const configureStorage = (folderName) => {
  const targetDir = path.join(__dirname, '..', 'uploads', folderName);
  ensureDirExists(targetDir);

  return multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, targetDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname).toLowerCase()}`);
    }
  });
};

// Check file formats (Images and PDFs allowed for KYC)
const fileFilter = (req, file, cb) => {
  const allowedExtensions = /jpeg|jpg|png|pdf/;
  const isMimeValid = allowedExtensions.test(file.mimetype);
  const isExtensionValid = allowedExtensions.test(path.extname(file.originalname).toLowerCase());

  if (isMimeValid && isExtensionValid) {
    return cb(null, true);
  }
  cb(new Error('File upload failed. Only JPEG, JPG, PNG, and PDF extensions are allowed.'));
};

// Middlewares for different upload scenarios
const uploadProfile = multer({
  storage: configureStorage('profiles'),
  limits: { fileSize: 2 * 1024 * 1024 }, // Max 2MB for profile pics
  fileFilter
});

const uploadDocument = multer({
  storage: configureStorage('documents'),
  limits: { fileSize: 5 * 1024 * 1024 }, // Max 5MB for Aadhaar/PAN/Certificates
  fileFilter
});

const uploadService = multer({
  storage: configureStorage('services'),
  limits: { fileSize: 3 * 1024 * 1024 }, // Max 3MB for service banner images
  fileFilter
});

const uploadChat = multer({
  storage: configureStorage('chats'),
  limits: { fileSize: 5 * 1024 * 1024 }, // Max 5MB for chat attachments
  fileFilter: (req, file, cb) => {
    const allowedExtensions = /jpeg|jpg|png|webp/;
    const isMimeValid = allowedExtensions.test(file.mimetype);
    const isExtensionValid = allowedExtensions.test(path.extname(file.originalname).toLowerCase());

    if (isMimeValid && isExtensionValid) {
      return cb(null, true);
    }
    cb(new Error('File upload failed. Only JPEG, JPG, PNG, and WEBP images are allowed.'));
  }
});

module.exports = {
  uploadProfile,
  uploadDocument,
  uploadService,
  uploadChat
};
