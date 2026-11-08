import { ReportsWorkspace } from "@/components/reports-workspace";
import { StandardFormsWorkspace } from "@/components/standard-forms-workspace";
export const dynamic = "force-dynamic";
export default function ReportsPage() {
  return <><StandardFormsWorkspace module="reports" /><ReportsWorkspace /></>;
}
