-- Enforce duplicate-safe academic assignment writes.
-- Co-teaching remains supported because teacher_id is part of the unique key.
CREATE UNIQUE INDEX IF NOT EXISTS teaching_assignments_exact_assignment_uq
  ON teaching_assignments (tenant_id, school_id, academic_year_id, class_id, subject_id, teacher_id);

-- Support school-scoped enrollment lookups by year and class.
CREATE INDEX IF NOT EXISTS student_enrollments_school_year_class_idx
  ON student_enrollments (tenant_id, school_id, academic_year_id, class_id);
