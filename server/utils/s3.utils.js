const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
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

  // 👇 This is now correct
  const url = `https://cdn.dev-quest.tech/${key}`;

  return url;
};

module.exports = {
  uploadImageToS3,
  s3Client, // Export the client for reuse
};
