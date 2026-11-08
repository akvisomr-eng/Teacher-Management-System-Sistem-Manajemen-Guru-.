import { AssessmentWorkspace } from "@/components/assessment-workspace";
import { StandardFormsWorkspace } from "@/components/standard-forms-workspace";
export const dynamic = "force-dynamic";
export default function AssessmentsPage() {
  return <><StandardFormsWorkspace module="assessments" /><AssessmentWorkspace /></>;
}
