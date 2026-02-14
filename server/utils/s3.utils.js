const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const sharp = require("sharp");
const { v4: uuidv4 } = require("uuid");

const DEFAULT_PUBLIC_BASE_URL = process.env.R2_PUBLIC_BASE_URL;

const getEnv = (key) => (process.env[key] || "").trim();

const R2_ACCESS_KEY_ID = getEnv("R2_ACCESS_KEY_ID");
const R2_SECRET_ACCESS_KEY = getEnv("R2_SECRET_ACCESS_KEY");
const R2_BUCKET_NAME = getEnv("R2_BUCKET_NAME");

const configuredEndpoint =
  getEnv("R2_API_ENDPOINT_URL") || getEnv("R2_ENDPOINT_URL");
const R2_ACCOUNT_ID = getEnv("R2_ACCOUNT_ID");

const isR2ApiEndpoint = (endpoint) => {
  if (!endpoint) return false;
  try {
    const host = new URL(endpoint).hostname.toLowerCase();
    return host.endsWith(".r2.cloudflarestorage.com");
  } catch {
    return false;
  }
};

const resolveApiEndpoint = () => {
  if (isR2ApiEndpoint(configuredEndpoint)) {
    return configuredEndpoint;
  }

  if (R2_ACCOUNT_ID) {
    return `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  }

  return configuredEndpoint;
};

const R2_API_ENDPOINT = resolveApiEndpoint();
const R2_PUBLIC_BASE_URL =
  getEnv("R2_PUBLIC_BASE_URL") || DEFAULT_PUBLIC_BASE_URL;

if (!isR2ApiEndpoint(R2_API_ENDPOINT)) {
  console.warn(
    "[R2] API endpoint likely misconfigured. Use https://<accountid>.r2.cloudflarestorage.com for S3 API calls.",
  );
}

const buildPublicUrl = (key) => {
  const base = R2_PUBLIC_BASE_URL.replace(/\/+$/, "");
  const normalizedKey = String(key || "").replace(/^\/+/, "");
  return `${base}/${normalizedKey}`;
};

const isLikelyR2AuthError = (error) => {
  const statusCode = error?.$metadata?.httpStatusCode;
  return (
    statusCode === 401 || /unauthorized/i.test(String(error?.message || ""))
  );
};

const s3Client = new S3Client({
  region: "auto",
  endpoint: R2_API_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true,
});

const uploadImageToS3 = async (file) => {
  const filename = `course_${uuidv4()}.png`;
  const processedBuffer = await sharp(file.buffer)
    .resize(800)
    .png({ quality: 80 })
    .toBuffer();

  const key = `uploads/${filename}`;

  const params = {
    Bucket: R2_BUCKET_NAME,
    Key: key,
    Body: processedBuffer,
    ContentType: "image/png",
  };

  const command = new PutObjectCommand(params);
  await s3Client.send(command);

  return buildPublicUrl(key);
};

module.exports = {
  uploadImageToS3,
  s3Client,
  R2_API_ENDPOINT,
  R2_PUBLIC_BASE_URL,
  buildPublicUrl,
  isLikelyR2AuthError,
};
