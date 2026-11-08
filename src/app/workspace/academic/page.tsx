import { AcademicSetupWorkspace } from "@/components/academic-setup-workspace";
import { StandardFormsWorkspace } from "@/components/standard-forms-workspace";
export const dynamic = "force-dynamic";
export default function AcademicPage() {
  return <><StandardFormsWorkspace module="academic" /><AcademicSetupWorkspace /></>;
}
