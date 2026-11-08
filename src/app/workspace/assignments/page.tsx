import { AcademicAssignmentsWorkspace } from "@/components/academic-assignments-workspace";
import { StandardFormsWorkspace } from "@/components/standard-forms-workspace";
export const dynamic = "force-dynamic";
export default function AssignmentsPage() {
  return <><StandardFormsWorkspace module="assignments" /><AssignmentsWorkspace /></>;
}
