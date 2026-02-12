# Delete File Endpoint

This document provides instructions for using the DELETE endpoint to remove files from S3 storage.

## Endpoint

```
DELETE /delete
```

## Authentication

Requires `Authorization` header with your API key:
- Format: `Bearer YOUR_API_KEY` or just `YOUR_API_KEY`

## Request Body

```json
{
  "key": "path/to/file.ext"
}
```

- `key` (string, required): The S3 object key (file path) to delete

## Response

### Success (200 OK)

```json
{
  "success": true,
  "message": "File \"path/to/file.ext\" deleted successfully",
  "key": "path/to/file.ext"
}
```

### Error Responses

**400 Bad Request** - Missing or invalid key
```json
{
  "error": "Bad Request",
  "message": "Body must include \"key\" (object key path)"
}
```

**401 Unauthorized** - Missing or invalid API key
```json
{
  "error": "Unauthorized",
  "message": "Valid Authorization header required"
}
```

**500 Internal Server Error** - S3 operation failed
```json
{
  "error": "Internal Server Error",
  "message": "Failed to delete file"
}
```

## curl Examples

### Basic Usage

```bash
curl -X DELETE https://your-api-domain.com/delete \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{"key": "uploads/example.pdf"}'
```

### With Bearer Token

```bash
curl -X DELETE https://your-api-domain.com/delete \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{"key": "path/to/file.txt"}'
```

### With Direct API Key (No Bearer Prefix)

```bash
curl -X DELETE https://your-api-domain.com/delete \
  -H "Content-Type: application/json" \
  -H "Authorization: YOUR_API_KEY" \
  -d '{"key": "images/photo.jpg"}'
```

### Delete Audio File

```bash
curl -X DELETE https://your-api-domain.com/delete \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{"key": "audio/song.mp3"}'
```

### Delete File with Spaces in Path

```bash
curl -X DELETE https://your-api-domain.com/delete \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{"key": "documents/my file with spaces.pdf"}'
```

### Verbose Output (See Full Response)

```bash
curl -X DELETE https://your-api-domain.com/delete \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{"key": "temp/test.txt"}' \
  -v
```

### Local Testing (Development)

```bash
curl -X DELETE http://localhost:3000/delete \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{"key": "test/file.txt"}'
```

## Notes

- The endpoint will return success even if the file doesn't exist (S3 behavior)
- Make sure the key matches exactly the path used when uploading
- Leading/trailing whitespace in the key is automatically trimmed
- The API key must match the `PRESIGN_API_KEY` environment variable

## Integration Examples

### Using with n8n

1. Add an **HTTP Request** node
2. Set **Method**: `DELETE`
3. Set **URL**: `https://your-api-domain.com/delete`
4. Add **Authentication**: Header Auth
   - Name: `Authorization`
   - Value: `Bearer YOUR_API_KEY`
5. Set **Body Content Type**: JSON
6. Add **Body Parameters**:
   - Name: `key`
   - Value: `{{$json["file_path"]}}`

### Using with JavaScript

```javascript
const deleteFile = async (fileKey) => {
  const response = await fetch('https://your-api-domain.com/delete', {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer YOUR_API_KEY'
    },
    body: JSON.stringify({ key: fileKey })
  });
  
  const result = await response.json();
  console.log(result);
  return result;
};

// Usage
deleteFile('uploads/old-file.pdf');
```

### Using with Python

```python
import requests
import json

def delete_file(file_key):
    url = 'https://your-api-domain.com/delete'
    headers = {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_API_KEY'
    }
    data = {'key': file_key}
    
    response = requests.delete(url, headers=headers, json=data)
    return response.json()

# Usage
result = delete_file('uploads/old-file.pdf')
print(result)
```

## Security Considerations

- Keep your API key secret and never commit it to version control
- Use environment variables to store the API key
- Consider implementing rate limiting for production use
- Use HTTPS in production to protect the API key in transit
