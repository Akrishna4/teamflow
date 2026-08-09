const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const { AppError } = require('../../utils/errors');

// Safe file types
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
  'text/csv',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(process.cwd(), 'uploads'));
  },
  filename: function (req, file, cb) {
    // Generate unique storage key: timestamp-randomHex.ext
    const randomHex = crypto.randomBytes(8).toString('hex');
    const ext = path.extname(file.originalname).toLowerCase();
    
    // Explicitly sanitize extensions, avoiding double extensions or null bytes
    const safeExt = /^[a-z0-9]+$/i.test(ext.slice(1)) ? ext : '';
    const safeFilename = `${Date.now()}-${randomHex}${safeExt}`;
    
    cb(null, safeFilename);
  }
});

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError('Invalid file type. Only standard documents and images are allowed.', 400), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
});

module.exports = upload;
