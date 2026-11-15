-- Add explicit links from supporting forms to canonical teacher/student records and review notes.
ALTER TABLE standard_module_records
  ADD COLUMN IF NOT EXISTS linked_entity_type varchar(20),
  ADD COLUMN IF NOT EXISTS linked_entity_id uuid,
  ADD COLUMN IF NOT EXISTS review_note text;
DO $$ BEGIN
  ALTER TABLE standard_module_records ADD CONSTRAINT standard_module_records_link_type_ck
    CHECK (linked_entity_type IS NULL OR linked_entity_type IN ('teacher','student'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE standard_module_records ADD CONSTRAINT standard_module_records_link_pair_ck
    CHECK ((linked_entity_type IS NULL AND linked_entity_id IS NULL) OR (linked_entity_type IS NOT NULL AND linked_entity_id IS NOT NULL));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS standard_module_records_linked_entity_idx
  ON standard_module_records(tenant_id, school_id, linked_entity_type, linked_entity_id)
  WHERE linked_entity_id IS NOT NULL;
