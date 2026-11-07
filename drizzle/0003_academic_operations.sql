-- Academic operations: classes, subjects, assignments, journals, assessments and grading.
CREATE UNIQUE INDEX IF NOT EXISTS schools_tenant_id_uq ON schools(tenant_id, id);
CREATE UNIQUE INDEX IF NOT EXISTS academic_years_tenant_school_id_uq ON academic_years(tenant_id, school_id, id);
CREATE UNIQUE INDEX IF NOT EXISTS teachers_tenant_school_id_uq ON teachers(tenant_id, school_id, id);
CREATE UNIQUE INDEX IF NOT EXISTS students_tenant_school_id_uq ON students(tenant_id, school_id, id);

ALTER TABLE academic_years ADD CONSTRAINT academic_years_tenant_school_fk
  FOREIGN KEY (tenant_id, school_id) REFERENCES schools(tenant_id, id) ON DELETE CASCADE;
ALTER TABLE teachers ADD CONSTRAINT teachers_tenant_school_fk
  FOREIGN KEY (tenant_id, school_id) REFERENCES schools(tenant_id, id) ON DELETE CASCADE;
ALTER TABLE students ADD CONSTRAINT students_tenant_school_fk
  FOREIGN KEY (tenant_id, school_id) REFERENCES schools(tenant_id, id) ON DELETE CASCADE;
ALTER TABLE teaching_plans ADD CONSTRAINT teaching_plans_tenant_school_fk
  FOREIGN KEY (tenant_id, school_id) REFERENCES schools(tenant_id, id) ON DELETE CASCADE;
ALTER TABLE memberships ADD CONSTRAINT memberships_tenant_school_fk
  FOREIGN KEY (tenant_id, school_id) REFERENCES schools(tenant_id, id) ON DELETE CASCADE;
ALTER TABLE curriculum_versions ADD CONSTRAINT curriculum_tenant_school_fk
  FOREIGN KEY (tenant_id, school_id) REFERENCES schools(tenant_id, id) ON DELETE CASCADE;
ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_tenant_school_fk
  FOREIGN KEY (tenant_id, school_id) REFERENCES schools(tenant_id, id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  school_id uuid NOT NULL,
  academic_year_id uuid NOT NULL,
  name varchar(100) NOT NULL,
  grade_level varchar(50) NOT NULL,
  homeroom_teacher_id uuid,
  status varchar(24) NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT classes_tenant_school_id_uq UNIQUE (tenant_id, school_id, id),
  CONSTRAINT classes_school_fk FOREIGN KEY (tenant_id, school_id) REFERENCES schools(tenant_id, id) ON DELETE CASCADE,
  CONSTRAINT classes_academic_year_fk FOREIGN KEY (tenant_id, school_id, academic_year_id) REFERENCES academic_years(tenant_id, school_id, id) ON DELETE CASCADE,
  CONSTRAINT classes_homeroom_teacher_fk FOREIGN KEY (tenant_id, school_id, homeroom_teacher_id) REFERENCES teachers(tenant_id, school_id, id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS classes_school_year_idx ON classes(tenant_id, school_id, academic_year_id);

CREATE TABLE IF NOT EXISTS subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  school_id uuid NOT NULL,
  code varchar(40),
  name varchar(140) NOT NULL,
  category varchar(80),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT subjects_tenant_school_id_uq UNIQUE (tenant_id, school_id, id),
  CONSTRAINT subjects_school_fk FOREIGN KEY (tenant_id, school_id) REFERENCES schools(tenant_id, id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS subjects_school_idx ON subjects(tenant_id, school_id);

CREATE TABLE IF NOT EXISTS teaching_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  school_id uuid NOT NULL,
  class_id uuid NOT NULL,
  subject_id uuid NOT NULL,
  teacher_id uuid NOT NULL,
  academic_year_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT teaching_assignments_tenant_school_id_uq UNIQUE (tenant_id, school_id, id),
  CONSTRAINT teaching_assignments_class_fk FOREIGN KEY (tenant_id, school_id, class_id) REFERENCES classes(tenant_id, school_id, id) ON DELETE CASCADE,
  CONSTRAINT teaching_assignments_subject_fk FOREIGN KEY (tenant_id, school_id, subject_id) REFERENCES subjects(tenant_id, school_id, id) ON DELETE CASCADE,
  CONSTRAINT teaching_assignments_teacher_fk FOREIGN KEY (tenant_id, school_id, teacher_id) REFERENCES teachers(tenant_id, school_id, id) ON DELETE RESTRICT,
  CONSTRAINT teaching_assignments_year_fk FOREIGN KEY (tenant_id, school_id, academic_year_id) REFERENCES academic_years(tenant_id, school_id, id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS teaching_assignments_school_idx ON teaching_assignments(tenant_id, school_id, academic_year_id);

CREATE TABLE IF NOT EXISTS student_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  school_id uuid NOT NULL,
  student_id uuid NOT NULL,
  class_id uuid NOT NULL,
  academic_year_id uuid NOT NULL,
  status varchar(24) NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT student_enrollments_year_student_uq UNIQUE (academic_year_id, student_id),
  CONSTRAINT student_enrollments_student_fk FOREIGN KEY (tenant_id, school_id, student_id) REFERENCES students(tenant_id, school_id, id) ON DELETE CASCADE,
  CONSTRAINT student_enrollments_class_fk FOREIGN KEY (tenant_id, school_id, class_id) REFERENCES classes(tenant_id, school_id, id) ON DELETE CASCADE,
  CONSTRAINT student_enrollments_year_fk FOREIGN KEY (tenant_id, school_id, academic_year_id) REFERENCES academic_years(tenant_id, school_id, id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS student_enrollments_class_idx ON student_enrollments(tenant_id, school_id, class_id);

CREATE TABLE IF NOT EXISTS teaching_journals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  school_id uuid NOT NULL,
  assignment_id uuid NOT NULL,
  teacher_id uuid NOT NULL,
  journal_date timestamptz NOT NULL,
  topic varchar(200) NOT NULL,
  reflection text,
  status varchar(24) NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT teaching_journals_assignment_fk FOREIGN KEY (tenant_id, school_id, assignment_id) REFERENCES teaching_assignments(tenant_id, school_id, id) ON DELETE CASCADE,
  CONSTRAINT teaching_journals_teacher_fk FOREIGN KEY (tenant_id, school_id, teacher_id) REFERENCES teachers(tenant_id, school_id, id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS teaching_journals_teacher_date_idx ON teaching_journals(tenant_id, school_id, teacher_id, journal_date);

CREATE TABLE IF NOT EXISTS assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  school_id uuid NOT NULL,
  assignment_id uuid NOT NULL,
  title varchar(180) NOT NULL,
  assessment_type varchar(40) NOT NULL,
  max_score integer NOT NULL DEFAULT 100 CHECK (max_score > 0),
  due_at timestamptz,
  status varchar(24) NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT assessments_tenant_school_id_uq UNIQUE (tenant_id, school_id, id),
  CONSTRAINT assessments_assignment_fk FOREIGN KEY (tenant_id, school_id, assignment_id) REFERENCES teaching_assignments(tenant_id, school_id, id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS assessments_school_status_idx ON assessments(tenant_id, school_id, status);

CREATE TABLE IF NOT EXISTS assessment_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  school_id uuid NOT NULL,
  assessment_id uuid NOT NULL,
  student_id uuid NOT NULL,
  score integer CHECK (score >= 0),
  feedback text,
  graded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT assessment_results_student_uq UNIQUE (assessment_id, student_id),
  CONSTRAINT assessment_results_assessment_fk FOREIGN KEY (tenant_id, school_id, assessment_id) REFERENCES assessments(tenant_id, school_id, id) ON DELETE CASCADE,
  CONSTRAINT assessment_results_student_fk FOREIGN KEY (tenant_id, school_id, student_id) REFERENCES students(tenant_id, school_id, id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS assessment_results_student_idx ON assessment_results(tenant_id, school_id, student_id);

ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE teaching_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE teaching_journals ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY classes_tenant_scope ON classes FOR ALL USING (tenant_id = tms_current_tenant_id()) WITH CHECK (tenant_id = tms_current_tenant_id());
CREATE POLICY subjects_tenant_scope ON subjects FOR ALL USING (tenant_id = tms_current_tenant_id()) WITH CHECK (tenant_id = tms_current_tenant_id());
CREATE POLICY teaching_assignments_tenant_scope ON teaching_assignments FOR ALL USING (tenant_id = tms_current_tenant_id()) WITH CHECK (tenant_id = tms_current_tenant_id());
CREATE POLICY student_enrollments_tenant_scope ON student_enrollments FOR ALL USING (tenant_id = tms_current_tenant_id()) WITH CHECK (tenant_id = tms_current_tenant_id());
CREATE POLICY teaching_journals_tenant_scope ON teaching_journals FOR ALL USING (tenant_id = tms_current_tenant_id()) WITH CHECK (tenant_id = tms_current_tenant_id());
CREATE POLICY assessments_tenant_scope ON assessments FOR ALL USING (tenant_id = tms_current_tenant_id()) WITH CHECK (tenant_id = tms_current_tenant_id());
CREATE POLICY assessment_results_tenant_scope ON assessment_results FOR ALL USING (tenant_id = tms_current_tenant_id()) WITH CHECK (tenant_id = tms_current_tenant_id());
