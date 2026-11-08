import { CustomFormsWorkspace } from "@/components/custom-forms-workspace";
import { StandardFormsWorkspace } from "@/components/standard-forms-workspace";
export const dynamic = "force-dynamic";
export default function FormsPage() {
  return <><StandardFormsWorkspace module="forms" /><CustomFormsWorkspace /></>;
}
