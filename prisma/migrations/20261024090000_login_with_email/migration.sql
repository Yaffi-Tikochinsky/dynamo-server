-- Users now log in with an email address instead of a username.
-- Rename the column (keeping existing rows) and widen it to the maximum email length.
ALTER TABLE "User" RENAME COLUMN "username" TO "email";
ALTER TABLE "User" ALTER COLUMN "email" TYPE VARCHAR(254);
ALTER INDEX "User_username_key" RENAME TO "User_email_key";
