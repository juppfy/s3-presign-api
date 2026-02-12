# Quick Start Guide

## What Was Added

### New DELETE Endpoint
A new `DELETE /delete` endpoint has been added to the API that allows you to delete files from your S3 bucket.

### Features
- ✅ Secure authentication using API key
- ✅ Simple JSON request/response format
- ✅ Comprehensive error handling
- ✅ Works with Railway S3 and any S3-compatible storage

## Quick Test

### 1. Basic DELETE Request

```bash
curl -X DELETE https://your-api-domain.com/delete \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{"key": "path/to/file.txt"}'
```

### 2. Expected Response

**Success:**
```json
{
  "success": true,
  "message": "File \"path/to/file.txt\" deleted successfully",
  "key": "path/to/file.txt"
}
```

**Error (Missing Key):**
```json
{
  "error": "Bad Request",
  "message": "Body must include \"key\" (object key path)"
}
```

**Error (Unauthorized):**
```json
{
  "error": "Unauthorized",
  "message": "Valid Authorization header required"
}
```

## All Available Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/presign` | Generate presigned URL for downloading a file |
| DELETE | `/delete` | Delete a file from S3 storage |
| GET | `/health` | Health check endpoint |

## Code Changes

### Updated Files
1. **index.js** - Added `DeleteObjectCommand` and new DELETE endpoint
2. **README.md** - Updated with DELETE endpoint documentation
3. **DELETE-ENDPOINT.md** - Comprehensive guide with curl examples

### What Changed in index.js

```javascript
// Added DeleteObjectCommand import
const { S3Client, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');

// New DELETE endpoint
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
```

## Deployment

No additional configuration needed! The DELETE endpoint uses the same:
- S3 credentials
- Authentication (API key)
- Error handling
- Security measures

Just deploy as usual to Railway.

## Documentation

For more detailed information:
- **DELETE-ENDPOINT.md** - Full DELETE endpoint documentation with examples
- **README.md** - General API documentation
- **n8n-http-call-guide.md** - n8n integration guide

## Repository

GitHub: https://github.com/juppfy/s3-presign-api

All code has been pushed and is ready to use!
