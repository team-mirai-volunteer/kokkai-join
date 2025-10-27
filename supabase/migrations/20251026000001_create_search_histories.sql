-- Create search_histories table
-- This table stores user search history with results

-- Create the table
CREATE TABLE IF NOT EXISTS search_histories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  providers TEXT[] NOT NULL,
  result_summary TEXT,
  result_markdown TEXT,
  file_names TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_search_histories_user_id
  ON search_histories(user_id);

CREATE INDEX IF NOT EXISTS idx_search_histories_created_at
  ON search_histories(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_search_histories_user_created
  ON search_histories(user_id, created_at DESC);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for auto-updating updated_at
DROP TRIGGER IF EXISTS update_search_histories_updated_at ON search_histories;
CREATE TRIGGER update_search_histories_updated_at
  BEFORE UPDATE ON search_histories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE search_histories ENABLE ROW LEVEL SECURITY;

-- Create RLS policies

-- SELECT policy: Users can view their own search histories
DROP POLICY IF EXISTS "Users can view own search histories" ON search_histories;
CREATE POLICY "Users can view own search histories"
  ON search_histories
  FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT policy: Users can create their own search histories
DROP POLICY IF EXISTS "Users can create own search histories" ON search_histories;
CREATE POLICY "Users can create own search histories"
  ON search_histories
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- UPDATE policy: Users can update their own search histories
DROP POLICY IF EXISTS "Users can update own search histories" ON search_histories;
CREATE POLICY "Users can update own search histories"
  ON search_histories
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE policy: Users can delete their own search histories
DROP POLICY IF EXISTS "Users can delete own search histories" ON search_histories;
CREATE POLICY "Users can delete own search histories"
  ON search_histories
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add comment on table
COMMENT ON TABLE search_histories IS 'Stores user search queries and results for history tracking';
COMMENT ON COLUMN search_histories.user_id IS 'Foreign key to auth.users - owner of this search history';
COMMENT ON COLUMN search_histories.query IS 'Search query string';
COMMENT ON COLUMN search_histories.providers IS 'Array of provider IDs used for this search (e.g., [''kokkai'', ''web'', ''gov''])';
COMMENT ON COLUMN search_histories.result_summary IS 'First ~200 characters of result for list display';
COMMENT ON COLUMN search_histories.result_markdown IS 'Full search result in markdown format';
COMMENT ON COLUMN search_histories.file_names IS 'Array of uploaded file names used in this search';
