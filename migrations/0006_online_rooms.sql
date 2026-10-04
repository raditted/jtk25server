-- 0006: Support online sessions.
--
-- 1. Widen rooms.type to accept 'online'. SQLite cannot ALTER a CHECK
--    constraint, so the table is rebuilt. No foreign keys reference
--    rooms (schedules.room is plain TEXT), so the rebuild is safe.
-- 2. Seed the canonical virtual rooms used for online sessions.
-- 3. Backfill schedules.mode from the seeded rooms so an online session
--    cannot exist with mode='offline'.

-- ─── Rebuild rooms with the widened type check ───────────────────────────────

CREATE TABLE rooms_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ext_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  type TEXT CHECK(type IN ('kelas','lab','online'))
);

INSERT INTO rooms_new (id, ext_id, name, type)
  SELECT id, ext_id, name, type FROM rooms;

DROP TABLE rooms;

ALTER TABLE rooms_new RENAME TO rooms;

-- ─── Canonical virtual rooms for online sessions ─────────────────────────────

INSERT OR IGNORE INTO rooms (ext_id, name, type) VALUES
  ('Online-Google Meet', 'Online (Google Meet)', 'online');

-- ─── Backfill mode from the room type ────────────────────────────────────────

-- Any session already sitting in an online room becomes mode='online'.
-- Runs before the CHECK is relied upon, so the data is self-consistent.
UPDATE schedules
   SET mode = 'online'
 WHERE mode = 'offline'
   AND room IN (SELECT ext_id FROM rooms WHERE type = 'online');