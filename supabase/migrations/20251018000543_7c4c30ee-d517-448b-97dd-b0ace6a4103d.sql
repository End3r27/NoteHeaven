-- Update RLS policy for shared folders visibility
-- This allows users to see folders they own OR folders shared with them

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can manage own folders" ON folders;

-- Create new policy for viewing folders (own + shared)
CREATE POLICY "Users can view own and shared folders"
ON folders
FOR SELECT
USING (
  auth.uid() = user_id
  OR auth.uid() IN (
    SELECT user_id 
    FROM shared_folders 
    WHERE shared_folders.folder_id = folders.id 
    AND shared_folders.accepted = true
  )
);

-- Create policy for inserting own folders
CREATE POLICY "Users can insert own folders"
ON folders
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create policy for updating own folders
CREATE POLICY "Users can update own folders"
ON folders
FOR UPDATE
USING (auth.uid() = user_id);

-- Create policy for deleting own folders
CREATE POLICY "Users can delete own folders"
ON folders
FOR DELETE
USING (auth.uid() = user_id);