import { sql } from "drizzle-orm";
import { pgTable, uuid, varchar, text, timestamp, boolean, jsonb, integer, uniqueIndex, index } from "drizzle-orm/pg-core";

export const tenants = pgTable("tenants", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 180 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  status: varchar("status", { length: 24 }).notNull().default("trial"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});

export const schools = pgTable("schools", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 180 }).notNull(),
  npsn: varchar("npsn", { length: 20 }),
  level: varchar("level", { length: 30 }).notNull(),
  status: varchar("status", { length: 24 }).notNull().default("active"),
  settings: jsonb("settings").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
}, (t) => [index("schools_tenant_idx").on(t.tenantId), uniqueIndex("schools_tenant_npsn_uq").on(t.tenantId, t.npsn)]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 254 }).notNull().unique(),
  authUserId: varchar("auth_user_id", { length: 64 }),
  fullName: varchar("full_name", { length: 180 }).notNull(),
  phone: varchar("phone", { length: 30 }),
  avatarUrl: text("avatar_url"),
  status: varchar("status", { length: 24 }).notNull().default("invited"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
}, (t) => [uniqueIndex("users_auth_user_id_uq").on(t.authUserId).where(sql`${t.authUserId} IS NOT NULL`)]);

export const memberships = pgTable("memberships", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  schoolId: uuid("school_id").references(() => schools.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 40 }).notNull(),
  scope: jsonb("scope").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
}, (t) => [index("memberships_tenant_user_idx").on(t.tenantId, t.userId), uniqueIndex("memberships_scope_role_uq").on(t.tenantId, t.schoolId, t.userId, t.role)]);

export const academicYears = pgTable("academic_years", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  schoolId: uuid("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 30 }).notNull(),
  startsOn: timestamp("starts_on", { withTimezone: true }).notNull(),
  endsOn: timestamp("ends_on", { withTimezone: true }).notNull(),
  isActive: boolean("is_active").notNull().default(false)
}, (t) => [uniqueIndex("academic_year_school_name_uq").on(t.schoolId, t.name), index("academic_year_tenant_idx").on(t.tenantId)]);

export const teachers = pgTable("teachers", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  schoolId: uuid("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  employeeNumber: varchar("employee_number", { length: 50 }),
  fullName: varchar("full_name", { length: 180 }).notNull(),
  employmentStatus: varchar("employment_status", { length: 30 }).notNull().default("active"),
  education: varchar("education", { length: 80 }),
  subjectSpecialties: jsonb("subject_specialties").$type<string[]>().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
}, (t) => [index("teachers_school_idx").on(t.tenantId, t.schoolId), uniqueIndex("teachers_school_employee_uq").on(t.schoolId, t.employeeNumber)]);

export const students = pgTable("students", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  schoolId: uuid("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  studentNumber: varchar("student_number", { length: 50 }),
  fullName: varchar("full_name", { length: 180 }).notNull(),
  birthDate: timestamp("birth_date", { withTimezone: true }),
  status: varchar("status", { length: 24 }).notNull().default("active"),
  profile: jsonb("profile").$type<Record<string, unknown>>().notNull().default({})
}, (t) => [index("students_school_idx").on(t.tenantId, t.schoolId), uniqueIndex("students_school_number_uq").on(t.schoolId, t.studentNumber)]);

export const curriculumVersions = pgTable("curriculum_versions", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  schoolId: uuid("school_id").references(() => schools.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 160 }).notNull(),
  framework: varchar("framework", { length: 100 }).notNull(),
  version: integer("version").notNull().default(1),
  status: varchar("status", { length: 24 }).notNull().default("draft"),
  definition: jsonb("definition").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
}, (t) => [index("curriculum_tenant_school_idx").on(t.tenantId, t.schoolId)]);

export const teachingPlans = pgTable("teaching_plans", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  schoolId: uuid("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  teacherId: uuid("teacher_id").references(() => teachers.id, { onDelete: "set null" }),
  title: varchar("title", { length: 200 }).notNull(),
  subject: varchar("subject", { length: 120 }),
  gradeLevel: varchar("grade_level", { length: 50 }),
  status: varchar("status", { length: 24 }).notNull().default("draft"),
  content: jsonb("content").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
}, (t) => [index("teaching_plans_school_idx").on(t.tenantId, t.schoolId)]);

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "set null" }),
  schoolId: uuid("school_id").references(() => schools.id, { onDelete: "set null" }),
  actorUserId: uuid("actor_user_id").references(() => users.id, { onDelete: "set null" }),
  action: varchar("action", { length: 100 }).notNull(),
  resourceType: varchar("resource_type", { length: 100 }).notNull(),
  resourceId: varchar("resource_id", { length: 100 }),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
}, (t) => [index("audit_logs_tenant_created_idx").on(t.tenantId, t.createdAt)]);
