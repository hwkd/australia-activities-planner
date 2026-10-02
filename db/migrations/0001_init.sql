-- Sydney Weekend Finder: content and admin schema (tracker M11).
-- Apply with: npx wrangler d1 migrations apply DB --local   (or --remote)

-- One row per activity. `draft_json` is the editors' working copy; `published_json` is what the public
-- site serves (NULL = not published). Both are a full activity validated by src/content/schema.ts.
-- The plain columns mirror the draft for the admin list and filters.
CREATE TABLE activities (
  id              TEXT PRIMARY KEY,            -- kebab-case; never changes (URLs, plans and pairings use it)
  name            TEXT NOT NULL,
  area            TEXT NOT NULL,
  category        TEXT NOT NULL,
  status          TEXT NOT NULL CHECK (status IN ('draft', 'verified')),
  draft_json      TEXT NOT NULL CHECK (json_valid(draft_json)),
  published_json  TEXT CHECK (published_json IS NULL OR json_valid(published_json)),
  -- Derived from published_json when publishing, so public pages read only what they need:
  published_status TEXT CHECK (published_status IN ('draft', 'verified')),
  published_card   TEXT,                       -- card fields (Discover, My plans, Add to a day)
  published_export TEXT,                       -- place + directions (Add to your calendar)
  version         INTEGER NOT NULL DEFAULT 1,  -- bumped on every save; used to stop two editors overwriting each other
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_by      INTEGER REFERENCES users(id),
  published_at    TEXT,
  published_by    INTEGER REFERENCES users(id)
);
CREATE INDEX activities_published ON activities (published_status, name) WHERE published_json IS NOT NULL;

-- Every save, publish, unpublish and restore, with the full activity at that point.
CREATE TABLE revisions (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  activity_id  TEXT NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  version      INTEGER NOT NULL,
  action       TEXT NOT NULL CHECK (action IN ('create', 'save', 'publish', 'unpublish', 'restore', 'import')),
  json         TEXT NOT NULL CHECK (json_valid(json)),
  user_id      INTEGER REFERENCES users(id),
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX revisions_activity ON revisions (activity_id, id DESC);

-- Admin accounts. Passwords are PBKDF2-SHA256 hashes (src/server/auth.ts); never stored in plain text.
CREATE TABLE users (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  email          TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name           TEXT NOT NULL,
  role           TEXT NOT NULL CHECK (role IN ('owner', 'editor')),
  password_hash  TEXT NOT NULL,
  disabled       INTEGER NOT NULL DEFAULT 0,
  created_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  last_login_at  TEXT
);

-- Sessions: the cookie holds a random token; only its SHA-256 is stored.
CREATE TABLE sessions (
  token_hash  TEXT PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  expires_at  TEXT NOT NULL
);
CREATE INDEX sessions_user ON sessions (user_id);

-- Invitations (and password resets) as one-time links; only the token's SHA-256 is stored.
CREATE TABLE invites (
  token_hash  TEXT PRIMARY KEY,
  kind        TEXT NOT NULL CHECK (kind IN ('invite', 'reset')),
  email       TEXT NOT NULL COLLATE NOCASE,
  role        TEXT CHECK (role IN ('owner', 'editor')),
  created_by  INTEGER REFERENCES users(id),
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  expires_at  TEXT NOT NULL,
  used_at     TEXT
);

-- Failed sign-ins, for rate limiting (per email and per IP).
CREATE TABLE login_attempts (
  id     INTEGER PRIMARY KEY AUTOINCREMENT,
  key    TEXT NOT NULL,
  at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX login_attempts_key ON login_attempts (key, at);
