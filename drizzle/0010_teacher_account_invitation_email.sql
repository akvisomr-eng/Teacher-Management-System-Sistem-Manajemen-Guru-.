-- Store the teacher's intended sign-in email separately from an authenticated user.
-- A teacher can register with this email first; the school manager links the
-- verified/authenticated account afterwards through /api/teacher-access.
ALTER TABLE teachers
  ADD COLUMN IF NOT EXISTS account_email varchar(254);

-- Backfill already-linked accounts without changing ownership or memberships.
UPDATE teachers t
SET account_email = u.email
FROM users u
WHERE t.user_id = u.id
  AND t.account_email IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS teachers_school_account_email_uq
  ON teachers (school_id, lower(account_email))
  WHERE account_email IS NOT NULL;
