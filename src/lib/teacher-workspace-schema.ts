import { z } from "zod";

const itemSchema = z.object({
  id: z.string().uuid(),
  itemType: z.enum(["lesson_plan", "teaching_journal", "learning_material", "assessment_draft", "reflection", "personal_note"]),
  title: z.string().trim().min(1).max(200),
  content: z.record(z.string(), z.unknown()).refine(
    value => JSON.stringify(value).length <= 100_000,
    "Ukuran dokumen melebihi batas 100 KB."
  ),
  schemaVersion: z.number().int().min(1).max(100),
  clientUpdatedAt: z.string().datetime()
});

export const syncSchema = z.object({
  items: z.array(itemSchema).min(1).max(25)
}).superRefine(({ items }, context) => {
  const seen = new Set<string>();
  items.forEach((item, index) => {
    if (seen.has(item.id)) {
      context.addIssue({
        code: "custom",
        path: ["items", index, "id"],
        message: "ID dokumen duplikat dalam satu paket sinkronisasi."
      });
    }
    seen.add(item.id);
  });
});
