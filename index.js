require('dotenv').config();

const express = require('express');
const { S3Client, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const app = express();
app.use(express.json());

const PRESIGN_API_KEY = process.env.PRESIGN_API_KEY;
const PRESIGN_EXPIRY_SECONDS = Number(process.env.PRESIGN_EXPIRY_SECONDS) || 604800; // 7 days default

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
