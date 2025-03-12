const multer = require("multer");
const {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");
const { v4: uuidv4 } = require("uuid");
const sharp = require("sharp");
const db = require("../config/database"); // Adjust as per your project

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
      cb(new Error("Invalid file type. Only images are allowed."));
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
    res.send(
      "S3 is connected! Buckets: " +
        response.Buckets.map((b) => b.Name).join(", "),
    );
  } catch (error) {
    res.status(500).send("S3 connection failed: " + error.message);
  }
};

// File Upload Route
const uploadFile = [
  upload.single("file"),
  async (req, res) => {
    try {
      // Validate file existence
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded." });
      }

      const file = req.file;
      const fileKey = `uploads/${uuidv4()}_${file.originalname}`;

      // Process the image using sharp (resize, convert, or optimize)
      const processedBuffer = await sharp(file.buffer)
        .toFormat("png", { quality: 90 }) // Convert to PNG and preserve transparency
        .toBuffer();

      // Prepare S3 upload parameters
      const params = {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: fileKey,
        Body: processedBuffer,
        ContentType: "image/png", // Ensure correct content type
      };

      try {
        // Upload to S3
        const command = new PutObjectCommand(params);
        await s3Client.send(command);

        // Generate file URL
        const fileUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileKey}`;

        // Send success response
        res.status(200).json({
          message: "File uploaded successfully.",
          fileUrl,
        });
      } catch (s3Error) {
        console.error("S3 Upload Error:", s3Error);
        res
          .status(500)
          .json({ error: `Failed to upload file to S3: ${s3Error.message}` });
      }
    } catch (error) {
      console.error("Unexpected Upload Error:", error);
      res
        .status(500)
        .json({
          error: "An unexpected error occurred during the upload process.",
        });
    }
  },
];

const uploadProfilePic = [
  upload.single("profilePic"),
  async (req, res) => {
    try {
      const userId = req.user.user_id;

      if (!userId) {
        console.error("[uploadProfilePic] User ID missing from token");
        return res
          .status(400)
          .json({ error: "User ID is missing from the token" });
      }

      if (!req.file) {
        console.error("[uploadProfilePic] No file uploaded");
        return res.status(400).json({ error: "No file uploaded." });
      }

      // Set the folder path and filename
      const folderPath = `user_images/`;
      const filename = `profile_${userId}.png`;
      const fullKey = `${folderPath}${filename}`;

      const processedBuffer = await sharp(req.file.buffer)
        .resize(400, 400)
        .toFormat("png", { quality: 90 })
        .toBuffer();

      // Define S3 upload parameters
      const params = {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: fullKey,
        Body: processedBuffer,
        ContentType: "image/*",
      };

      // Upload to S3

      const command = new PutObjectCommand(params);
      await s3Client.send(command);

      // Generate the public S3 URL
      const profileimage = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fullKey}`;

      // Save the URL in the database

      const query = "UPDATE users SET profileimage = $1 WHERE user_id = $2";
      await db.query(query, [profileimage, userId]);

      res.status(200).json({
        message: "Profile picture uploaded successfully",
        profileimage,
      });
    } catch (error) {
      console.error("[uploadProfilePic] Error:", error);
      console.error("[uploadProfilePic] Stack trace:", error.stack);
      res.status(500).json({ error: "Failed to upload profile picture" });
    }
  },
];

const removeProfilePic = async (req, res) => {
  try {
    if (!req.user || !req.user.user_id) {
      console.error("[removeProfilePic] User information missing in token");
      return res
        .status(400)
        .json({ error: "User information missing in token" });
    }

    const userId = req.user.user_id;

    // Fetch the current profile picture URL

    const querySelect = "SELECT profileimage FROM users WHERE user_id = $1";
    const { rows } = await db.query(querySelect, [userId]);

    if (rows.length === 0) {
      console.error("[removeProfilePic] User not found in database");
      return res.status(404).json({ error: "User not found" });
    }

    const profileimage = rows[0].profileimage;

    if (profileimage) {
      // Extract the S3 key
      const keyPrefix = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/`;
      const key = profileimage.replace(keyPrefix, "");

      try {
        const command = new DeleteObjectCommand({
          Bucket: process.env.S3_BUCKET_NAME,
          Key: key,
        });
        await s3Client.send(command);
      } catch (s3Error) {
        console.error("[removeProfilePic] S3 deletion error:", s3Error);
        console.error("[removeProfilePic] S3 error stack:", s3Error.stack);
        return res
          .status(500)
          .json({ error: "Failed to delete profile picture from S3" });
      }

      // Update database

      const queryUpdate =
        "UPDATE users SET profileimage = NULL WHERE user_id = $1";
      await db.query(queryUpdate, [userId]);

      res.status(200).json({ message: "Profile picture removed successfully" });
    } else {
      res.status(400).json({ error: "No profile picture to remove" });
    }
  } catch (error) {
    console.error("[removeProfilePic] Error:", error);
    console.error("[removeProfilePic] Stack trace:", error.stack);
    res.status(500).json({ error: "Failed to remove profile picture" });
  }
};

// Add new controller for editor uploads
const uploadEditorImage = [
  upload.single("file"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          error: "No file uploaded.",
          uploaded: 0,
        });
      }

      const file = req.file;
      const fileKey = `editor-uploads/${uuidv4()}_${file.originalname}`;

      // Process the image using sharp
      let processedBuffer;
      try {
        processedBuffer = await sharp(file.buffer)
          .resize(1200, null, {
            withoutEnlargement: true,
            fit: "inside",
          })
          .toBuffer();
      } catch (sharpError) {
        processedBuffer = file.buffer;
      }

      const params = {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: fileKey,
        Body: processedBuffer,
        ContentType: file.mimetype,
        ACL: "public-read",
      };

      try {
        const command = new PutObjectCommand(params);
        await s3Client.send(command);

        const fileUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileKey}`;

        res.status(200).json({
          uploaded: 1,
          url: fileUrl,
          fileUrl: fileUrl, // Keep both for compatibility
        });
      } catch (s3Error) {
        console.error("S3 Upload Error:", s3Error);
        res.status(500).json({
          uploaded: 0,
          error: `Failed to upload file to S3: ${s3Error.message}`,
        });
      }
    } catch (error) {
      console.error("Unexpected Upload Error:", error);
      res.status(500).json({
        uploaded: 0,
        error: "An unexpected error occurred during the upload process.",
      });
    }
  },
];

module.exports = {
  testRoute,
  uploadFile,
  uploadProfilePic,
  removeProfilePic,
  uploadEditorImage,
};
