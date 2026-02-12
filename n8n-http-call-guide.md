# n8n HTTP Call Guide — Presign API

Use this guide to call the Presign API from n8n to generate new presigned URLs and update Supabase.

---

## API overview

- **Base URL:** Your Railway deployment URL (e.g. `https://presign-api-production.up.railway.app`)
- **Auth:** Required. Send your API key in the `Authorization` header.
- **Endpoint:** `POST /presign`

---

## 1. HTTP Request node (n8n)

### Method and URL

- **Method:** `POST`
- **URL:** `https://YOUR-RAILWAY-URL/presign`

### Headers

| Name           | Value                    |
|----------------|---------------------------|
| `Authorization`| `Bearer YOUR_PRESIGN_API_KEY` |
| `Content-Type` | `application/json`        |

You can also send the raw key: `Authorization: YOUR_PRESIGN_API_KEY` (no `Bearer`).

### Body (JSON)

```json
{
  "key": "path/to/object.mp3"
}
```

- **`key`** (required): The S3 object key (path in the bucket). Get this from your SQL row (e.g. parsed from `song_url` or from a `song_object_key` column).

### Example n8n configuration

- **Authentication:** None (we send the header manually).
- **Request Body:** JSON, with `key` from a previous node, e.g. `{{ $json.object_key }}` or `{{ $json.song_object_key }}`.

---

## 2. Response

**Success (200)**

```json
{
  "url": "https://..."
}
```

Use `{{ $json.url }}` in the next node to update `song_url` in Supabase.

**Error (4xx/5xx)**

```json
{
  "error": "Bad Request",
  "message": "Body must include \"key\" (object key path)"
}
```

---

## 3. Suggested n8n flow (one row at a time)

1. **Trigger**  
   Schedule (e.g. every hour).

2. **Postgres / Supabase: get one row to refresh**  
   Run a SQL query that returns **one** row where the URL should be refreshed, e.g.:

   - `section_details`: `last_url_update IS NULL OR last_url_update < NOW() - INTERVAL '6 days'`
   - `library_vid_details`: same condition.

   Return columns: `id` (or primary key), `song_url`, and optionally `song_object_key` if you store it.  
   Order by `last_url_update ASC NULLS FIRST` and `LIMIT 1`.  
   If the query returns no rows, use an **IF** node to skip the rest.

3. **Code or Set node: get object key**  
   - If you have `song_object_key`, use it.  
   - Otherwise parse `song_url`: take the path before `?` and remove the bucket base URL to get the key.  
   Output something like: `{ "object_key": "path/to/file.mp3", "row_id": "...", "table": "section_details" }`.

4. **HTTP Request: call Presign API**  
   - **Method:** POST  
   - **URL:** `https://YOUR-RAILWAY-URL/presign`  
   - **Headers:**  
     - `Authorization`: `Bearer YOUR_PRESIGN_API_KEY`  
     - `Content-Type`: `application/json`  
   - **Body (JSON):**  
     ```json
     {
       "key": "{{ $json.object_key }}"
     }
     ```

5. **Supabase / Postgres: update row**  
   Update the row from step 2 using `row_id` and `table`:
   - Set `song_url` = `{{ $('HTTP Request').item.json.url }}`
   - Set `last_url_update` = `now()` (or equivalent).

---

## 4. Health check

- **Method:** `GET`
- **URL:** `https://YOUR-RAILWAY-URL/health`
- **Auth:** Same `Authorization` header as above.

**Response (200):** `{ "ok": true }`

Use this in n8n to verify the API is up before calling `/presign`.

---

## 5. Environment variables (Railway)

Set these in the Railway project for the Presign API service:

| Variable                 | Description                          |
|--------------------------|--------------------------------------|
| `PRESIGN_API_KEY`        | Secret key for the Authorization header. |
| `PRESIGN_EXPIRY_SECONDS` | Optional. Default 604800 (7 days).  |
| `S3_ENDPOINT`            | Railway S3 bucket endpoint URL.     |
| `S3_ACCESS_KEY_ID`       | Bucket access key.                  |
| `S3_SECRET_ACCESS_KEY`   | Bucket secret key.                  |
| `S3_BUCKET`              | Bucket name.                        |
| `S3_REGION`              | Optional. Default `us-east-1`.     |

Copy `.env.example` to `.env` locally and fill in values; on Railway, set the same variables in the service environment.
