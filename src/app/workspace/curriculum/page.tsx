import { CurriculumWorkspace } from "@/components/curriculum-workspace";
import { StandardFormsWorkspace } from "@/components/standard-forms-workspace";
export const dynamic = "force-dynamic";
export default function CurriculumPage() {
  return <><StandardFormsWorkspace module="curriculum" /><CurriculumWorkspace /></>;
}
