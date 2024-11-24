const multer = require('multer');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { v4: uuidv4 } = require('uuid');
const sharp = require('sharp');
// Set up Multer with file validation
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|svg/;
    const isValidType = allowedTypes.test(file.mimetype.toLowerCase());
    if (isValidType) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images are allowed.'));
    }
  },
});

// Configure AWS S3
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Test Route
const testRoute = async (req, res) => {
  try {
    const command = new ListBucketsCommand({});
    const response = await s3Client.send(command);
    res.send('S3 is connected! Buckets: ' + response.Buckets.map((b) => b.Name).join(', '));
  } catch (error) {
    res.status(500).send('S3 connection failed: ' + error.message);
  }
};

// File Upload Route
const uploadFile = [
  upload.single('file'),
  async (req, res) => {
    console.log('Upload route hit!');
    try {
      // Validate file existence
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded.' });
      }

      const file = req.file;
      const fileKey = `uploads/${uuidv4()}_${file.originalname}`;

      console.log(`Processing file: ${file.originalname}`);

      // Process the image using sharp (resize, convert, or optimize)
      const processedBuffer = await sharp(file.buffer)
        .toFormat('png', { quality: 90 }) // Convert to PNG and preserve transparency
        .toBuffer();

      console.log(`Uploading processed file: ${fileKey} to S3`);

      // Prepare S3 upload parameters
      const params = {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: fileKey,
        Body: processedBuffer,
        ContentType: 'image/png', // Ensure correct content type
      };

      try {
        // Upload to S3
        const command = new PutObjectCommand(params);
        await s3Client.send(command);

        // Generate file URL
        const fileUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileKey}`;

        console.log(`File uploaded successfully: ${fileUrl}`);

        // Send success response
        res.status(200).json({
          message: 'File uploaded successfully.',
          fileUrl,
        });
      } catch (s3Error) {
        console.error('S3 Upload Error:', s3Error);
        res.status(500).json({ error: `Failed to upload file to S3: ${s3Error.message}` });
      }
    } catch (error) {
      console.error('Unexpected Upload Error:', error);
      res.status(500).json({ error: 'An unexpected error occurred during the upload process.' });
    }
  },
];

module.exports = {
  testRoute,
  uploadFile,
};
