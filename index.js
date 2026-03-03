require('dotenv').config();

const express = require('express');
const crypto = require('crypto');
const path = require('path');
const { S3Client, GetObjectCommand, DeleteObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const app = express();
app.use(express.json());

const PRESIGN_API_KEY = process.env.PRESIGN_API_KEY;
const MAX_PRESIGN_EXPIRY_SECONDS = 90 * 24 * 60 * 60; // 90 days (Railway max)
const PRESIGN_EXPIRY_SECONDS = Math.min(
  Number(process.env.PRESIGN_EXPIRY_SECONDS) || MAX_PRESIGN_EXPIRY_SECONDS,
  MAX_PRESIGN_EXPIRY_SECONDS,
);

if (!PRESIGN_API_KEY) {
  console.error('PRESIGN_API_KEY is required');
  process.exit(1);
}

const s3Client = new S3Client({
  region: process.env.S3_REGION || 'us-east-1',
  endpoint: process.env.S3_ENDPOINT || undefined,
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
  },
});

const BUCKET = process.env.S3_BUCKET;
if (!BUCKET) {
  console.error('S3_BUCKET is required');
  process.exit(1);
}

function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  const token = auth && (auth.startsWith('Bearer ') ? auth.slice(7) : auth);
  if (!token || token !== PRESIGN_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Valid Authorization header required' });
  }
  next();
}

app.use(requireAuth);

app.post('/upload-from-url', async (req, res) => {
  try {
    const { url, keyPrefix } = req.body;

    if (!url || typeof url !== 'string') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Body must include "url" (source file URL to download)',
      });
    }

    let parsed;
    try {
      parsed = new URL(url);
    } catch {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid URL provided in "url"',
      });
    }

    const filenameFromUrl = path.basename(parsed.pathname) || 'file';
    const randomId = crypto.randomBytes(16).toString('hex');
    const safePrefix =
      typeof keyPrefix === 'string' && keyPrefix.trim().length > 0
        ? keyPrefix.trim().replace(/^\/+|\/+$/g, '')
        : 'uploads';

    const objectKey = `${safePrefix}/${randomId}-${filenameFromUrl}`;

    const response = await fetch(url);

    if (!response.ok || !response.body) {
      return res.status(502).json({
        error: 'Bad Gateway',
        message: `Failed to download file from URL (status ${response.status})`,
      });
    }

    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const contentLengthHeader = response.headers.get('content-length');
    const contentLength = contentLengthHeader ? Number(contentLengthHeader) : undefined;

    const putCommand = new PutObjectCommand({
      Bucket: BUCKET,
      Key: objectKey,
      Body: response.body,
      ContentType: contentType,
      ContentLength: Number.isFinite(contentLength) ? contentLength : undefined,
    });

    await s3Client.send(putCommand);

    const getCommand = new GetObjectCommand({
      Bucket: BUCKET,
      Key: objectKey,
    });

    const presignedUrl = await getSignedUrl(s3Client, getCommand, { expiresIn: PRESIGN_EXPIRY_SECONDS });

    return res.json({
      key: objectKey,
      url: presignedUrl,
      bucket: BUCKET,
      expiresInSeconds: PRESIGN_EXPIRY_SECONDS,
    });
  } catch (err) {
    console.error('Upload-from-url error:', err);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: err.message || 'Failed to upload file from URL',
    });
  }
});

app.post('/presign', async (req, res) => {
  try {
    const { key } = req.body;
    if (!key || typeof key !== 'string') {
      return res.status(400).json({ error: 'Bad Request', message: 'Body must include "key" (object key path)' });
    }

    const command = new GetObjectCommand({
      Bucket: BUCKET,
      Key: key.trim(),
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn: PRESIGN_EXPIRY_SECONDS });
    return res.json({ url });
  } catch (err) {
    console.error('Presign error:', err);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: err.message || 'Failed to generate presigned URL',
    });
  }
});

app.delete('/delete', async (req, res) => {
  try {
    const { key } = req.body;
    if (!key || typeof key !== 'string') {
      return res.status(400).json({ error: 'Bad Request', message: 'Body must include "key" (object key path)' });
    }

    const command = new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: key.trim(),
    });

    await s3Client.send(command);
    return res.json({ 
      success: true, 
      message: `File "${key.trim()}" deleted successfully`,
      key: key.trim()
    });
  } catch (err) {
    console.error('Delete error:', err);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: err.message || 'Failed to delete file',
    });
  }
});

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Presign API listening on port ${PORT}`);
});
