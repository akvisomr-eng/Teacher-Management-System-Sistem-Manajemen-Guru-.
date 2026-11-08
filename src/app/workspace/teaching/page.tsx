import { TeachingWorkspace } from "@/components/teaching-workspace";
import { StandardFormsWorkspace } from "@/components/standard-forms-workspace";
export const dynamic = "force-dynamic";
export default function TeachingPage() {
  return <><StandardFormsWorkspace module="teaching" /><TeachingWorkspace /></>;
}
