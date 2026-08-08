import AdminShell from "../_components/AdminShell";
import WorkflowStepClient from "../_components/WorkflowStepClient";
import { getDictionary } from "@/get-dictionary";
import { normalizeLocale } from "@/lib/i18n/client";
export default async function Page({params}:{params:Promise<{lang:string}>}){const {lang}=await params;const d=await getDictionary(normalizeLocale(lang));return <AdminShell title={d.workflow.steps["customer-delivery"].title}><WorkflowStepClient step="customer-delivery"/></AdminShell>}
