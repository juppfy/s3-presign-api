# PlaylistCraft S3 Server Endpoints

All endpoints are protected with the same API key:

- Header: `Authorization`
- Format: `Bearer YOUR_API_KEY` or `YOUR_API_KEY`

If the header is missing or invalid, the API returns:

```json
{
  "error": "Unauthorized",
  "message": "Valid Authorization header required"
}
```

---

## 1. Upload From URL

Downloads a file from a public URL, uploads it into the configured S3 bucket, and returns a presigned URL.

### Endpoint

```http
POST /upload-from-url
```

### Request Body

```json
{
  "url": "https://example.com/path/to/file.mp3",
  "keyPrefix": "optional/prefix"
}
```

**Fields**

- `url` (string, required): Publicly accessible URL of the file to download.
- `keyPrefix` (string, optional): Folder/prefix in your bucket. Defaults to `uploads`.

The final S3 key will be:

```text
<keyPrefix>/<random-hex>-<original-filename>
```

Example:

```text
uploads/9f3a1c0b4d8e23d1d2f9f01a2b3c4d5e-song.mp3
```

### Response (Success)

```json
{
  "key": "uploads/9f3a1c0b4d8e23d1d2f9f01a2b3c4d5e-song.mp3",
  "url": "https://bucket-url/presigned-url...",
  "bucket": "your-bucket-name",
  "expiresInSeconds": 7776000
}
```

Notes:

- `expiresInSeconds` is the presigned URL expiry in seconds.
- Default is 90 days (7,776,000 seconds, Railway max) unless overridden by `PRESIGN_EXPIRY_SECONDS`.
- If `PRESIGN_EXPIRY_SECONDS` is set higher than 90 days, it will be clamped down to 90 days.

### Error Responses

**400 Bad Request** – Missing or invalid body:

```json
{
  "error": "Bad Request",
  "message": "Body must include \"url\" (source file URL to download)"
}
```

**400 Bad Request** – Invalid URL:

```json
{
  "error": "Bad Request",
  "message": "Invalid URL provided in \"url\""
}
```

**401 Unauthorized** – Missing/invalid API key

```json
{
  "error": "Unauthorized",
  "message": "Valid Authorization header required"
}
```

**502 Bad Gateway** – Failed to download the file:

```json
{
  "error": "Bad Gateway",
  "message": "Failed to download file from URL (status 404)"
}
```

**500 Internal Server Error** – Any other unexpected error:

```json
{
  "error": "Internal Server Error",
  "message": "Failed to upload file from URL"
}
```

### curl Examples

#### Basic Upload From URL

```bash
curl -X POST https://your-api-domain.com/upload-from-url \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "url": "https://example.com/audio/song.mp3"
  }'
```

#### With Custom Prefix

```bash
curl -X POST https://your-api-domain.com/upload-from-url \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "url": "https://example.com/audio/song.mp3",
    "keyPrefix": "playlistcraft/tracks"
  }'
```

#### Local Testing

```bash
curl -X POST http://localhost:3000/upload-from-url \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "url": "https://example.com/audio/song.mp3",
    "keyPrefix": "test"
  }'
```

---

## 2. Generate Presigned URL

Generates a presigned URL for an existing object in the S3 bucket.

### Endpoint

```http
POST /presign
```

### Request Body

```json
{
  "key": "path/to/object.ext"
}
```

### Response (Success)

```json
{
  "url": "https://bucket-url/presigned-url..."
}
```

The expiry is controlled by:

- `PRESIGN_EXPIRY_SECONDS` environment variable, or
- Default value: 90 days (7,776,000 seconds, Railway max)
- Any configured value above 90 days is clamped down to 90 days.

### curl Example

```bash
curl -X POST https://your-api-domain.com/presign \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "key": "playlistcraft/tracks/track-123.mp3"
  }'
```

---

## 3. Delete File

Deletes a file from the S3 bucket.

### Endpoint

```http
DELETE /delete
```

### Request Body

```json
{
  "key": "path/to/file.ext"
}
```

### Response (Success)

```json
{
  "success": true,
  "message": "File \"path/to/file.ext\" deleted successfully",
  "key": "path/to/file.ext"
}
```

Note: S3 `DeleteObject` is idempotent – you may get success even if the object did not exist.

### curl Example

```bash
curl -X DELETE https://your-api-domain.com/delete \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "key": "playlistcraft/tracks/track-123.mp3"
  }'
```

---

## 4. Health Check

Simple health endpoint (also protected by API key).

### Endpoint

```http
GET /health
```

### Response

```json
{
  "ok": true
}
```

### curl Example

```bash
curl -X GET https://your-api-domain.com/health \
  -H "Authorization: Bearer YOUR_API_KEY"
```

---

## Environment Variables

Key variables used by the server:

- `PRESIGN_API_KEY` – Required. API key used for all endpoints.
- `PRESIGN_EXPIRY_SECONDS` – Optional. Presign expiry in seconds (defaults to 7,776,000 = 90 days, Railway max). Values above 7,776,000 are clamped.
- `S3_ENDPOINT` – S3-compatible endpoint URL.
- `S3_ACCESS_KEY_ID` – Access key.
- `S3_SECRET_ACCESS_KEY` – Secret key.
- `S3_BUCKET` – Bucket name.
- `S3_REGION` – Region (e.g. `us-east-1` or `auto`).

