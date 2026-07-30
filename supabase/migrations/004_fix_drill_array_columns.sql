-- ─── Fix instructions & equipment column types ──────────────
-- These columns were originally created as `text` instead of `text[]`.
-- The 003 migration's ADD COLUMN IF NOT EXISTS couldn't fix them
-- because the columns already existed with the wrong type.
--
-- This migration converts existing string data → text[] arrays
-- by splitting on sensible delimiters.

-- Convert equipment: "Inline skates, protective gear" → {"Inline skates","protective gear"}
ALTER TABLE drills
    ALTER COLUMN equipment TYPE text[]
    USING CASE
        WHEN equipment IS NULL THEN '{}'::text[]
        WHEN equipment = ''    THEN '{}'::text[]
        ELSE string_to_array(equipment::text, ', ')
    END;

ALTER TABLE drills ALTER COLUMN equipment SET DEFAULT '{}';
ALTER TABLE drills ALTER COLUMN equipment SET NOT NULL;

-- Convert instructions: "Step one. Step two. Step three." → {"Step one","Step two","Step three"}
ALTER TABLE drills
    ALTER COLUMN instructions TYPE text[]
    USING CASE
        WHEN instructions IS NULL THEN '{}'::text[]
        WHEN instructions = ''    THEN '{}'::text[]
        ELSE array_remove(
            string_to_array(regexp_replace(instructions::text, '\.\s*$', ''), '. '),
            ''
        )
    END;

ALTER TABLE drills ALTER COLUMN instructions SET DEFAULT '{}';
ALTER TABLE drills ALTER COLUMN instructions SET NOT NULL;
