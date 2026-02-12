# SQL: Get one row to refresh (presigned URL)

Use these queries in n8n (Postgres or Supabase node) to fetch **one** row whose `song_url` should be refreshed. Run on a schedule; process one row per run.

Assumes both tables have a `last_url_update` (timestamptz) column. Refresh when it is null or older than 6 days.

---

## Option A: One table at a time (two separate workflows or a union)

**Section details (AI Vid) — one row:**

```sql
SELECT id, song_id, song_url, last_url_update
FROM section_details
WHERE song_url IS NOT NULL
  AND song_url != ''
  AND (last_url_update IS NULL OR last_url_update < NOW() - INTERVAL '6 days')
ORDER BY last_url_update ASC NULLS FIRST
LIMIT 1;
```

**Library vid details — one row:**

```sql
SELECT id, song_id, song_url, last_url_update
FROM library_vid_details
WHERE song_url IS NOT NULL
  AND song_url != ''
  AND (last_url_update IS NULL OR last_url_update < NOW() - INTERVAL '6 days')
ORDER BY last_url_update ASC NULLS FIRST
LIMIT 1;
```

Use the result `id` and table name when updating after calling the presign API.

---

## Option B: Single query returning one row from either table (using UNION)

Returns one row with a `source_table` so you know where to update.

```sql
SELECT id, song_id, song_url, last_url_update, 'section_details' AS source_table
FROM section_details
WHERE song_url IS NOT NULL
  AND song_url != ''
  AND (last_url_update IS NULL OR last_url_update < NOW() - INTERVAL '6 days')
ORDER BY last_url_update ASC NULLS FIRST
LIMIT 1

UNION ALL

SELECT id, song_id, song_url, last_url_update, 'library_vid_details' AS source_table
FROM library_vid_details
WHERE song_url IS NOT NULL
  AND song_url != ''
  AND (last_url_update IS NULL OR last_url_update < NOW() - INTERVAL '6 days')
ORDER BY last_url_update ASC NULLS FIRST
LIMIT 1
```

Note: With `UNION ALL` you get up to two rows (one per table). To get strictly **one** row across both tables, use a wrapper:

```sql
SELECT * FROM (
  SELECT id, song_id, song_url, last_url_update, 'section_details' AS source_table
  FROM section_details
  WHERE song_url IS NOT NULL AND song_url != ''
    AND (last_url_update IS NULL OR last_url_update < NOW() - INTERVAL '6 days')

  UNION ALL

  SELECT id, song_id, song_url, last_url_update, 'library_vid_details' AS source_table
  FROM library_vid_details
  WHERE song_url IS NOT NULL AND song_url != ''
    AND (last_url_update IS NULL OR last_url_update < NOW() - INTERVAL '6 days')
) combined
ORDER BY last_url_update ASC NULLS FIRST
LIMIT 1;
```

Use `id` and `source_table` in the update step after you get the new presigned URL.
