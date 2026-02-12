-- Add last_url_update columns and backfill existing rows to 7 days ago
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query → Run)

-- 1. Add column to section_details
ALTER TABLE section_details
ADD COLUMN IF NOT EXISTS last_url_update timestamptz;

-- 2. Add column to library_vid_details
ALTER TABLE library_vid_details
ADD COLUMN IF NOT EXISTS last_url_update timestamptz;

-- 3. Set all existing rows with a song_url to 7 days ago (so they get refreshed)
UPDATE section_details
SET last_url_update = NOW() - INTERVAL '7 days'
WHERE song_url IS NOT NULL AND song_url != '';

UPDATE library_vid_details
SET last_url_update = NOW() - INTERVAL '7 days'
WHERE song_url IS NOT NULL AND song_url != '';
