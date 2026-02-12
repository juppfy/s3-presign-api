# Presign API

Small API that generates Railway S3 presigned URLs. Used by n8n to refresh `song_url` in Supabase before URLs expire.

## Deploy on Railway

1. Create a new service and connect this repo (or a monorepo with this folder).
2. Set **Root Directory** to `presign-api`.
3. **Build command:** `npm install`
4. **Start command:** `npm start` (default)
5. Add environment variables (see `.env.example` or `n8n-http-call-guide.md`).

## Local

```bash
cd presign-api
cp .env.example .env
# Edit .env with your credentials
npm install
npm start
```

## Endpoints

- `POST /presign` — Body: `{ "key": "path/to/object" }`. Returns `{ "url": "..." }`. Requires `Authorization` header.
- `DELETE /delete` — Body: `{ "key": "path/to/object" }`. Deletes the specified file from S3. Returns `{ "success": true, "message": "...", "key": "..." }`. Requires `Authorization` header.
- `GET /health` — Returns `{ "ok": true }`. Same auth.

See **n8n-http-call-guide.md** for n8n HTTP node setup and workflow steps.
See **DELETE-ENDPOINT.md** for detailed DELETE endpoint documentation and curl examples.
