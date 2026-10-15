const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const path = require('path');
const crypto = require('crypto');

const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID || '';
const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || '';
const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || '';
const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'solarconnect-documents';
const publicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL || '';

const isR2Configured = Boolean(accountId && accessKeyId && secretAccessKey && bucketName);

let s3Client = null;
if (isR2Configured) {
  try {
    s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
    console.log('☁️ Cloudflare R2 Client initialized successfully for bucket:', bucketName);
  } catch (err) {
    console.warn('⚠️ Cloudflare R2 Client initialization warning:', err.message);
  }
} else {
  console.log('ℹ️ Cloudflare R2 credentials not provided in .env. Running in seamless Base64/Local storage mode.');
}

/**
 * Upload a document buffer to Cloudflare R2 (or fallback to Data URL if credentials pending)
 * @param {Object} params
 * @param {Buffer} params.buffer - The file buffer
 * @param {string} params.originalname - Original uploaded file name
 * @param {string} params.mimetype - MIME type of the file
 * @param {string} [params.folder='documents'] - Subfolder in R2 bucket
 * @returns {Promise<{ success: boolean, url: string, fileName: string, storage: string }>}
 */
async function uploadToR2({ buffer, originalname, mimetype, folder = 'documents' }) {
  if (!buffer || buffer.length === 0) {
    throw new Error('No file buffer provided for upload.');
  }

  const ext = path.extname(originalname) || '.jpg';
  const cleanBaseName = path.basename(originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
  const uniqueKey = `${folder}/${cleanBaseName}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`;

  if (isR2Configured && s3Client) {
    try {
      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: uniqueKey,
        Body: buffer,
        ContentType: mimetype || 'image/jpeg',
      });

      await s3Client.send(command);

      const fileUrl = publicUrl 
        ? `${publicUrl.replace(/\/+$/, '')}/${uniqueKey}`
        : `https://${bucketName}.${accountId}.r2.cloudflarestorage.com/${uniqueKey}`;

      return {
        success: true,
        url: fileUrl,
        key: uniqueKey,
        fileName: originalname,
        storage: 'CLOUDFLARE_R2',
      };
    } catch (r2Err) {
      console.error('Error uploading to Cloudflare R2, falling back to data URL:', r2Err.message);
    }
  }

  // Fallback: Data URL so the app continues working flawlessly before user adds credentials
  const base64Data = buffer.toString('base64');
  const mime = mimetype || 'image/jpeg';
  const dataUrl = `data:${mime};base64,${base64Data}`;

  return {
    success: true,
    url: dataUrl,
    key: uniqueKey,
    fileName: originalname,
    storage: 'LOCAL_DATA_URL',
  };
}

module.exports = {
  uploadToR2,
  isR2Configured,
  bucketName,
};
