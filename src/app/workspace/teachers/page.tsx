import { RegistryWorkspace } from "@/components/registry-workspace";
import { StandardFormsWorkspace } from "@/components/standard-forms-workspace";
export const dynamic = "force-dynamic";
export default function TeachersPage() {
  return <><RegistryWorkspace resource="teachers" /><StandardFormsWorkspace module="teachers" /></>;
}
