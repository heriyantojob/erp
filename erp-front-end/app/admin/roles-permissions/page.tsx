import { redirect } from "next/navigation";

// Some production hosts serve the app without Next's locale proxy. Keep a
// concrete non-localized entry point so /admin/roles-permissions never falls
// through to a 404; the admin application's default locale is Indonesian.
export default function RolesPermissionsAliasPage() {
  redirect("/id/admin/roles-permissions");
}
