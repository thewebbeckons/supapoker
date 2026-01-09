-- Change vote_value column type from integer to text
ALTER TABLE story_votes ALTER COLUMN vote_value TYPE text USING vote_value::text;

-- Update existing special values
-- -1 was '?'
-- -2 was 'coffee'
UPDATE story_votes SET vote_value = '?' WHERE vote_value = '-1';
UPDATE story_votes SET vote_value = 'coffee' WHERE vote_value = '-2';
