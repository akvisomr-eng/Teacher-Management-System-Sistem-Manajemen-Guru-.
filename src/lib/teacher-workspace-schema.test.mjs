import test from "node:test";
import assert from "node:assert/strict";
import { syncSchema } from "./teacher-workspace-schema.ts";

const validItem = (overrides = {}) => ({
  id: "c0a80101-0000-4000-8000-000000000001",
  itemType: "lesson_plan",
  title: "Rencana pembelajaran",
  content: { body: "Tujuan pembelajaran" },
  schemaVersion: 2,
  clientUpdatedAt: "2026-11-15T09:00:00.000Z",
  ...overrides
});

test("menerima paket sinkronisasi yang valid", () => {
  const result = syncSchema.safeParse({ items: [validItem()] });
  assert.equal(result.success, true);
});

test("menolak ID dokumen duplikat dalam satu paket agar tidak saling menimpa", () => {
  const item = validItem();
  const result = syncSchema.safeParse({ items: [item, { ...item, title: "Versi kedua" }] });
  assert.equal(result.success, false);
  assert.ok(result.error.issues.some(issue => issue.message.includes("ID dokumen duplikat")));
});

test("menolak paket kosong dan lebih dari 25 dokumen", () => {
  assert.equal(syncSchema.safeParse({ items: [] }).success, false);
  const items = Array.from({ length: 26 }, (_, index) => validItem({
    id: `c0a80101-0000-4000-8000-${String(index + 1).padStart(12, "0")}`
  }));
  assert.equal(syncSchema.safeParse({ items }).success, false);
});

test("menolak jenis dokumen yang tidak dikenal", () => {
  assert.equal(syncSchema.safeParse({ items: [validItem({ itemType: "student_master" })] }).success, false);
});

test("menolak judul kosong dan judul di atas 200 karakter", () => {
  assert.equal(syncSchema.safeParse({ items: [validItem({ title: " " })] }).success, false);
  assert.equal(syncSchema.safeParse({ items: [validItem({ title: "x".repeat(201) })] }).success, false);
});

test("menolak konten dokumen di atas 100 KB", () => {
  assert.equal(syncSchema.safeParse({ items: [validItem({ content: { body: "x".repeat(100_001) } })] }).success, false);
});

test("menolak timestamp yang bukan ISO datetime", () => {
  assert.equal(syncSchema.safeParse({ items: [validItem({ clientUpdatedAt: "kemarin" })] }).success, false);
});

test("mengabaikan field kepemilikan yang dikirim klien", () => {
  const result = syncSchema.safeParse({ items: [validItem({ tenantId: "attacker", teacherId: "someone-else", ownerUserId: "other-user" })] });
  assert.equal(result.success, true);
  if (result.success) {
    assert.equal("tenantId" in result.data.items[0], false);
    assert.equal("teacherId" in result.data.items[0], false);
    assert.equal("ownerUserId" in result.data.items[0], false);
  }
});
