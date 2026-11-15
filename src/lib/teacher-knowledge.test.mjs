import test from "node:test";
import assert from "node:assert/strict";
import { searchTeacherKnowledge } from "./teacher-knowledge.ts";
import { searchAdditionalTeacherKnowledge } from "./teacher-knowledge-extra.ts";

const combined = (query) => [
  ...searchTeacherKnowledge(query),
  ...searchAdditionalTeacherKnowledge(query),
].sort((a, b) => b.relevance - a.relevance)
  .filter((item, index, all) => all.findIndex((candidate) => candidate.id === item.id) === index)
  .slice(0, 5);

test("CP dan TP menemukan panduan analisis CP, TP, dan ATP", () => {
  const results = searchAdditionalTeacherKnowledge("CP dan TP");
  assert.ok(results.some((item) => item.id === "cp-tp-atp-design"));
});

test("pertanyaan penyusunan ATP memprioritaskan panduan CP-TP-ATP", () => {
  const results = searchAdditionalTeacherKnowledge("bagaimana menyusun ATP?");
  assert.equal(results[0]?.id, "cp-tp-atp-design");
});

test("asesmen diagnostik menemukan materi asesmen formatif", () => {
  const results = combined("asesmen diagnostik");
  assert.ok(results.some((item) => item.id === "formative-assessment-feedback"));
});

test("literasi AI siswa menemukan kerangka kompetensi peserta didik", () => {
  const results = combined("literasi AI siswa");
  assert.ok(results.some((item) => item.id === "unesco-ai-student-competencies"));
});

test("kompetensi AI guru menemukan kerangka kompetensi pendidik", () => {
  const results = combined("kompetensi AI guru");
  assert.ok(results.some((item) => item.id === "unesco-ai-teacher-competencies" || item.id === "teacher-ai-literacy"));
});

test("akronim UDL tetap dapat dicari sebagai istilah pendek", () => {
  const results = searchTeacherKnowledge("UDL");
  assert.ok(results.some((item) => item.id === "inclusive-udl"));
});

test("pencarian lokal mengembalikan dokumen beserta sumber dan status", () => {
  const result = combined("CP dan TP").find((item) => item.id === "cp-tp-atp-design");
  assert.ok(result);
  assert.ok(result.source.url.startsWith("https://"));
  assert.ok(["official", "research", "framework"].includes(result.source.status));
});

test("standar proses 2026 menemukan regulasi yang berlaku", () => {
  const results = searchAdditionalTeacherKnowledge("standar proses 2026");
  assert.equal(results[0]?.id, "permendikdasmen-1-2026-standard-process");
  assert.equal(results[0]?.source.status, "official");
});

test("dokumen perencanaan pembelajaran menemukan komponen minimum terbaru", () => {
  const result = searchAdditionalTeacherKnowledge("dokumen perencanaan pembelajaran");
  const regulation = result.find((item) => item.id === "permendikdasmen-1-2026-standard-process");
  assert.ok(regulation);
  assert.match(regulation.summary, /tujuan pembelajaran, langkah pembelajaran, dan penilaian atau asesmen/);
  assert.ok(regulation.source.url.includes("peraturan.bpk.go.id"));
});

test("perencanaan kinerja guru menemukan panduan resmi PKG", () => {
  const results = searchAdditionalTeacherKnowledge("bagaimana mengisi perencanaan kinerja guru di Ruang GTK");
  assert.equal(results[0]?.id, "teacher-performance-planning-pkg");
  assert.equal(results[0]?.source.status, "official");
  assert.ok(results[0]?.guidance.some((item) => item.includes("surat keputusan atau surat tugas")));
});

test("panduan PKG mengingatkan variasi untuk guru pendidikan khusus dan sekolah swasta", () => {
  const result = searchAdditionalTeacherKnowledge("PKG guru pendidikan khusus sekolah swasta")
    .find((item) => item.id === "teacher-performance-planning-pkg");
  assert.ok(result);
  assert.ok(result.summary.includes("dapat berbeda"));
  assert.ok(result.source.url.includes("pusatinformasi.ult.kemendikdasmen.go.id"));
});
