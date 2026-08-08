import "server-only";
import type { Locale } from "./i18n-config";

const loaders = {
  en: () => Promise.all([import("./dictionaries/en/common.json"), import("./dictionaries/en/admin.json"), import("./dictionaries/en/modules.json"), import("./dictionaries/en/crud.json"), import("./dictionaries/en/dashboard.json"), import("./dictionaries/en/stock.json"), import("./dictionaries/en/process-analysis.json"), import("./dictionaries/en/home.json"), import("./dictionaries/en/auth.json"), import("./dictionaries/en/users.json"), import("./dictionaries/en/workflow.json")]),
  ko: () => Promise.all([import("./dictionaries/ko/common.json"), import("./dictionaries/ko/admin.json"), import("./dictionaries/ko/modules.json"), import("./dictionaries/ko/crud.json"), import("./dictionaries/ko/dashboard.json"), import("./dictionaries/ko/stock.json"), import("./dictionaries/ko/process-analysis.json"), import("./dictionaries/ko/home.json"), import("./dictionaries/ko/auth.json"), import("./dictionaries/ko/users.json"), import("./dictionaries/ko/workflow.json")]),
  id: () => Promise.all([import("./dictionaries/id/common.json"), import("./dictionaries/id/admin.json"), import("./dictionaries/id/modules.json"), import("./dictionaries/id/crud.json"), import("./dictionaries/id/dashboard.json"), import("./dictionaries/id/stock.json"), import("./dictionaries/id/process-analysis.json"), import("./dictionaries/id/home.json"), import("./dictionaries/id/auth.json"), import("./dictionaries/id/users.json"), import("./dictionaries/id/workflow.json")]),
} as const;

export async function getDictionary(locale: Locale) {
  const [common, admin, modules, crud, dashboard, stock, processAnalysis, home, auth, users, workflow] = await loaders[locale]();
  return { common: common.default, admin: admin.default, modules: modules.default, crud: crud.default, dashboard: dashboard.default, stock: stock.default, processAnalysis: processAnalysis.default, home: home.default, auth: auth.default, users: users.default, workflow: workflow.default };
}

export type Dictionary = Awaited<ReturnType<typeof getDictionary>>;
