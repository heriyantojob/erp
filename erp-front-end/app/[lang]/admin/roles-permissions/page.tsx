import AdminShell from "../_components/AdminShell";
import RolesPermissionsClient from "./roles-permissions-client";

export default function Page() {
  return <AdminShell title="Roles & Permissions"><RolesPermissionsClient /></AdminShell>;
}
