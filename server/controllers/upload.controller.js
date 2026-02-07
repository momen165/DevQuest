const multer = require("multer");
const {
  PutObjectCommand,
  DeleteObjectCommand,
  ListBucketsCommand,
} = require("@aws-sdk/client-s3"); // Removed unused S3Client and GetObjectCommand imports
const { v4: uuidv4 } = require("uuid");
const sharp = require("sharp");
const prisma = require("../config/prisma");
const { s3Client } = require("../utils/s3.utils"); // Import the shared S3 client

const R2_PUBLIC_BASE_URL =
  "https://pub-7f487491f13f461f98c43d8f13580a44.r2.dev";

const getR2KeyFromPublicUrl = (url) => {
  if (!url || typeof url !== "string") return null;
  const prefix = `${R2_PUBLIC_BASE_URL}/`;
  if (!url.startsWith(prefix)) return null;
  const key = url.slice(prefix.length);
  return key || null;
};

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

      // Prepare R2 upload parameters
      const params = {
        Bucket: process.env.R2_BUCKET_NAME,
        Key: fileKey,
        Body: processedBuffer,
        ContentType: "image/png", // Ensure correct content type
      };

      try {
        // Upload to R2
        const command = new PutObjectCommand(params);
        await s3Client.send(command);

        // Use the CDN URL directly
        const fileUrl = `https://pub-7f487491f13f461f98c43d8f13580a44.r2.dev/${fileKey}`;

        // Send success response
        res.status(200).json({
          message: "File uploaded successfully.",
          fileUrl,
        });
      } catch (s3Error) {
        console.error("R2 Upload Error:", s3Error);
        res
          .status(500)
          .json({ error: `Failed to upload file to R2: ${s3Error.message}` });
      }
    } catch (error) {
      console.error("Unexpected Upload Error:", error);
      res.status(500).json({
        error: "An unexpected error occurred during the upload process.",
      });
    }
  },
];

// Profile Pic Upload Route
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

      // Delete previous profile image (best-effort) to avoid orphaned files
      const existingUser = await prisma.users.findUnique({
        where: { user_id: Number(userId) },
        select: { profileimage: true },
      });
      const previousProfileUrl = existingUser?.profileimage;
      const previousKey = getR2KeyFromPublicUrl(previousProfileUrl);
      if (previousKey) {
        try {
          const deleteCommand = new DeleteObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: previousKey,
          });
          await s3Client.send(deleteCommand);
        } catch (deleteError) {
          console.warn(
            "[uploadProfilePic] Failed to delete previous profile image:",
            deleteError?.message || deleteError,
          );
        }
      }

      // Set the folder path and filename
      const folderPath = `user_images/`;
      // Use a unique key per upload to avoid CDN/browser caching old content.
      const filename = `profile_${userId}_${Date.now()}_${uuidv4()}.png`;
      const fullKey = `${folderPath}${filename}`; // Reverted: Removed base path prepend

      const processedBuffer = await sharp(req.file.buffer)
        .resize(400, 400)
        .toFormat("png", { quality: 90 })
        .toBuffer();

      // Define R2 upload parameters
      const params = {
        Bucket: process.env.R2_BUCKET_NAME,
        Key: fullKey,
        Body: processedBuffer,
        ContentType: "image/png", // Explicitly set ContentType to PNG
      };

      // Upload to R2
      const command = new PutObjectCommand(params);
      await s3Client.send(command);

      // Direct CDN URL
      const profileimage = `${R2_PUBLIC_BASE_URL}/${fullKey}`;

      // Save the URL in the database
      await prisma.users.update({
        where: { user_id: Number(userId) },
        data: { profileimage },
      });

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

// Remove Profile Pic Route
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
    const user = await prisma.users.findUnique({
      where: { user_id: Number(userId) },
      select: { profileimage: true },
    });

    if (!user) {
      console.error("[removeProfilePic] User not found in database");
      return res.status(404).json({ error: "User not found" });
    }

    const profileimage = user.profileimage;

    if (profileimage) {
      // Extract the object key from the stored URL
      const key = getR2KeyFromPublicUrl(profileimage);
      if (!key) {
        return res.status(400).json({
          error: "Invalid profile picture URL stored for this user",
        });
      }

      try {
        const command = new DeleteObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME,
          Key: key,
        });
        await s3Client.send(command);
      } catch (s3Error) {
        console.error("[removeProfilePic] R2 deletion error:", s3Error);
        console.error("[removeProfilePic] R2 error stack:", s3Error.stack);
        return res
          .status(500)
          .json({ error: "Failed to delete profile picture from R2" });
      }

      // Update database
      await prisma.users.update({
        where: { user_id: Number(userId) },
        data: { profileimage: null },
      });

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
        console.error("Image processing error with sharp:", sharpError);
        processedBuffer = file.buffer;
      }

      const params = {
        Bucket: process.env.R2_BUCKET_NAME,
        Key: fileKey,
        Body: processedBuffer,
        ContentType: file.mimetype,
      };

      try {
        const command = new PutObjectCommand(params);
        await s3Client.send(command);

        // Use the CDN URL directly
        const fileUrl = `https://pub-7f487491f13f461f98c43d8f13580a44.r2.dev/${fileKey}`;

        res.status(200).json({
          uploaded: 1,
          url: fileUrl,
          fileUrl: fileUrl, // Keep both for compatibility
        });
      } catch (s3Error) {
        console.error("R2 Upload Error:", s3Error);
        res.status(500).json({
          uploaded: 0,
          error: `Failed to upload file to R2: ${s3Error.message}`,
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

// Upload badge image (admin only)
const uploadBadgeImage = [
  async (req, res) => {
    try {
      // Check if user is admin
      if (!req.user.admin) {
        return res.status(403).json({ error: "Access denied. Admin only." });
      }

      const { badgeType } = req.query;
      if (!badgeType) {
        return res.status(400).json({ error: "Badge type is required" });
      }

      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded." });
      }

      // Set the folder path and filename
      const folderPath = `badges/`;
      const filename = `${badgeType}.png`;
      const fullKey = `${folderPath}${filename}`;

      // Process the image - badges should be square and PNG with transparency
      const processedBuffer = await sharp(req.file.buffer)
        .resize(200, 200)
        .toFormat("png", { quality: 90 })
        .toBuffer();

      // Define R2 upload parameters
      const params = {
        Bucket: process.env.R2_BUCKET_NAME,
        Key: fullKey,
        Body: processedBuffer,
        ContentType: "image/png", // Explicitly set ContentType to PNG
      };

      // Upload to R2
      const command = new PutObjectCommand(params);
      await s3Client.send(command);

      // Direct CDN URL
      const badgeUrl = `https://pub-7f487491f13f461f98c43d8f13580a44.r2.dev/${fullKey}`;

      // Update the badge image in the database if it exists
      await prisma.badges.updateMany({
        where: { badge_type: badgeType },
        data: { image_path: badgeUrl },
      });

      res.status(200).json({
        message: "Badge image uploaded successfully",
        badgeUrl,
        badgeType,
      });
    } catch (error) {
      console.error("Error uploading badge image:", error);
      res.status(500).json({ error: "Failed to upload badge image" });
    }
  },
];

// Upload course image
const uploadCourseImage = [
  async (req, res) => {
    try {
      // Check if user is admin
      if (!req.user.admin) {
        return res.status(403).json({ error: "Access denied. Admin only." });
      }

      const { courseId } = req.query;
      if (!courseId) {
        return res.status(400).json({ error: "Course ID is required" });
      }

      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded." });
      }

      // Set the folder path and filename
      const folderPath = `course_images/`;
      const filename = `course_${courseId}.png`;
      const fullKey = `${folderPath}${filename}`;

      // Process the image for courses
      const processedBuffer = await sharp(req.file.buffer)
        .resize(800, 450, { fit: "cover" }) // 16:9 ratio for courses
        .toFormat("png", { quality: 90 })
        .toBuffer();

      // Define R2 upload parameters
      const params = {
        Bucket: process.env.R2_BUCKET_NAME,
        Key: fullKey,
        Body: processedBuffer,
        ContentType: "image/png",
      };

      // Upload to R2
      const command = new PutObjectCommand(params);
      await s3Client.send(command);

      // Direct CDN URL
      const imageUrl = `https://pub-7f487491f13f461f98c43d8f13580a44.r2.dev/${fullKey}`;

      // Update the course image in the database
      await prisma.course.update({
        where: { course_id: Number(courseId) },
        data: { image: imageUrl },
      });

      res.status(200).json({
        message: "Course image uploaded successfully",
        imageUrl,
        courseId,
      });
    } catch (error) {
      console.error("Error uploading course image:", error);
      res.status(500).json({ error: "Failed to upload course image" });
    }
  },
];

// Enhanced profile image upload with better error handling
const uploadProfileImage = [
  async (req, res) => {
    try {
      const userId = req.user.userId;

      if (!userId) {
        return res
          .status(400)
          .json({ error: "User ID is missing from the token" });
      }

      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded." });
      }

      // Set the folder path and filename
      const folderPath = `user_images/`;
      const filename = `profile_${userId}.png`;
      const fullKey = `${folderPath}${filename}`;

      const processedBuffer = await sharp(req.file.buffer)
        .resize(400, 400, { fit: "cover" }) // Square profile images
        .toFormat("png", { quality: 90 })
        .toBuffer();

      // Define R2 upload parameters
      const params = {
        Bucket: process.env.R2_BUCKET_NAME,
        Key: fullKey,
        Body: processedBuffer,
        ContentType: "image/png",
      };

      // Upload to R2
      const command = new PutObjectCommand(params);
      await s3Client.send(command);

      // Direct CDN URL
      const profileImage = `https://pub-7f487491f13f461f98c43d8f13580a44.r2.dev/${fullKey}`;

      // Save the URL in the database
      await prisma.users.update({
        where: { user_id: Number(userId) },
        data: { profileimage: profileImage },
      });

      res.status(200).json({
        message: "Profile image uploaded successfully",
        profileImage,
      });
    } catch (error) {
      console.error("Error uploading profile image:", error);
      res.status(500).json({ error: "Failed to upload profile image" });
    }
  },
];

module.exports = {
  testRoute,
  uploadFile,
  uploadProfilePic,
  removeProfilePic,
  uploadEditorImage,
  uploadProfileImage,
  uploadCourseImage,
  uploadBadgeImage,
};
