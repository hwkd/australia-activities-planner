-- Events and seasonal highlights (spec §11.4, tracker M15): editor-curated, 3–10 a fortnight. Same
-- draft / published / version pattern as activities; see src/content/eventSchema.ts for the JSON.
CREATE TABLE events (
  id              TEXT PRIMARY KEY,            -- e-kebab-case; never changes (plans and share links use it)
  name            TEXT NOT NULL,
  start_date      TEXT NOT NULL,               -- mirrors the draft, for the admin list
  end_date        TEXT NOT NULL,
  draft_json      TEXT NOT NULL CHECK (json_valid(draft_json)),
  published_json  TEXT CHECK (published_json IS NULL OR json_valid(published_json)),
  published_end   TEXT,                        -- the published end date, so old events drop off the site
  published_card  TEXT,                        -- EventCard (Discover's On soon row, planning)
  published_export TEXT,                       -- place + link (Add to your calendar)
  version         INTEGER NOT NULL DEFAULT 1,
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_by      INTEGER REFERENCES users(id),
  published_at    TEXT,
  published_by    INTEGER REFERENCES users(id)
);
CREATE INDEX events_published ON events (published_end) WHERE published_json IS NOT NULL;

CREATE TABLE event_revisions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id    TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  version     INTEGER NOT NULL,
  action      TEXT NOT NULL CHECK (action IN ('create', 'save', 'publish', 'unpublish', 'restore')),
  json        TEXT NOT NULL CHECK (json_valid(json)),
  user_id     INTEGER REFERENCES users(id),
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX event_revisions_event ON event_revisions (event_id, id DESC);
