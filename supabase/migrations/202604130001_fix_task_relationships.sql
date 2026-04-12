-- Migration: Explicitly name foreign key relationships on the tasks table
--
-- The application code explicitly targets `tasks_assigned_to_fkey`,
-- `tasks_created_by_fkey`, and `tasks_event_id_fkey` in its queries
-- to disambiguate relations (e.g. when querying the profiles table twice).
-- Supabase/PostgreSQL auto-generates names that might be different.

-- Give the relationships matching explicit names
DO $$ 
DECLARE
  old_fk_name text;
BEGIN
  -- 1. Find and rename the 'assigned_to' foreign key
  SELECT constraint_name INTO old_fk_name
  FROM information_schema.table_constraints
  WHERE table_name = 'tasks'
    AND constraint_type = 'FOREIGN KEY'
    AND constraint_name LIKE '%assigned_to%';
    
  IF old_fk_name IS NOT NULL AND old_fk_name != 'tasks_assigned_to_fkey' THEN
    EXECUTE 'ALTER TABLE tasks RENAME CONSTRAINT ' || quote_ident(old_fk_name) || ' TO tasks_assigned_to_fkey;';
  END IF;

  -- 2. Find and rename the 'created_by' foreign key
  SELECT constraint_name INTO old_fk_name
  FROM information_schema.table_constraints
  WHERE table_name = 'tasks'
    AND constraint_type = 'FOREIGN KEY'
    AND constraint_name LIKE '%created_by%';
    
  IF old_fk_name IS NOT NULL AND old_fk_name != 'tasks_created_by_fkey' THEN
    EXECUTE 'ALTER TABLE tasks RENAME CONSTRAINT ' || quote_ident(old_fk_name) || ' TO tasks_created_by_fkey;';
  END IF;

  -- 3. Find and rename the 'event_id' foreign key
  SELECT constraint_name INTO old_fk_name
  FROM information_schema.table_constraints
  WHERE table_name = 'tasks'
    AND constraint_type = 'FOREIGN KEY'
    AND constraint_name LIKE '%event_id%';
    
  IF old_fk_name IS NOT NULL AND old_fk_name != 'tasks_event_id_fkey' THEN
    EXECUTE 'ALTER TABLE tasks RENAME CONSTRAINT ' || quote_ident(old_fk_name) || ' TO tasks_event_id_fkey;';
  END IF;
END $$;
