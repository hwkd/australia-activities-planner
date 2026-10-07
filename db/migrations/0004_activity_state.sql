-- D16 (spec §4.1, tracker M26.1): every activity is listed under a state. New South Wales is the one
-- live state, so existing activities get "state": "nsw" in their stored JSON (draft, published and
-- past revisions, so a restored revision still validates). A `state` column replaces `city` when a
-- second state goes live (spec §12.5).
UPDATE activities SET draft_json = json_set(draft_json, '$.state', 'nsw') WHERE json_extract(draft_json, '$.state') IS NULL;
UPDATE activities SET published_json = json_set(published_json, '$.state', 'nsw') WHERE published_json IS NOT NULL AND json_extract(published_json, '$.state') IS NULL;
UPDATE revisions SET json = json_set(json, '$.state', 'nsw') WHERE json_extract(json, '$.state') IS NULL;
