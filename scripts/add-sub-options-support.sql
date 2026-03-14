-- Add parent_choice_id to support sub-options (like cover colors for binder types)
ALTER TABLE item_option_choices
ADD COLUMN IF NOT EXISTS parent_choice_id uuid REFERENCES item_option_choices(id) ON DELETE CASCADE;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_item_option_choices_parent 
ON item_option_choices(parent_choice_id);
