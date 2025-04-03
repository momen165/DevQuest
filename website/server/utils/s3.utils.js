const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const sharp = require("sharp");
const { v4: uuidv4 } = require("uuid");

// Configure Cloudflare R2 (S3 Compatible)
const s3Client = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT_URL,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const uploadImageToS3 = async (file, courseName) => {
  const filename = `course_${uuidv4()}.png`;
  const processedBuffer = await sharp(file.buffer)
    .resize(800)
    .png({ quality: 80 })
    .toBuffer();

  const key = `uploads/${filename}`;

  const params = {
    Bucket: process.env.R2_BUCKET_NAME,
    Key: key,
    Body: processedBuffer,
    ContentType: "image/png",
  };

  const command = new PutObjectCommand(params);
  await s3Client.send(command);

  // Generate a pre-signed URL for the uploaded object (valid for 7 days)
  const getObjectCommand = new GetObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: key,
  });

  // Make sure we're using a maximum expiration of 7 days (604800 seconds)
  const url = await getSignedUrl(s3Client, getObjectCommand, {
    expiresIn: 604800,
  });
  return url;
};

module.exports = {
  uploadImageToS3,
  s3Client, // Export the client for reuse
};
