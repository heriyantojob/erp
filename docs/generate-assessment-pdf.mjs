import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const require = createRequire(resolve("erp-api/package.json"));
const { createCanvas } = require("canvas");
// node-canvas in this workspace does not expose PDF page switching. A tall PDF
// keeps this report as one valid, printable document without an extra runtime
// dependency.
const canvas = createCanvas(595, 3370, "pdf");
const ctx = canvas.getContext("2d");
const margin = 48;
let y = margin;

function page() { ctx.fillStyle = "#d1d5db"; ctx.fillRect(margin, y + 15, 500, 1); y += 46; }
function wrap(text, width, font = "10.5px Helvetica") {
  ctx.font = font;
  const words = text.split(/\s+/); const lines = []; let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width > width && line) { lines.push(line); line = word; } else line = candidate;
  }
  if (line) lines.push(line); return lines;
}
function title(text) { if (y > 710) page(); ctx.fillStyle = "#176b3a"; ctx.font = "bold 17px Helvetica"; ctx.fillText(text, margin, y); y += 27; }
function heading(text) { if (y > 720) page(); ctx.fillStyle = "#176b3a"; ctx.font = "bold 12.5px Helvetica"; ctx.fillText(text, margin, y); y += 19; }
function paragraph(text, bullet = false) {
  const lines = wrap(text, 499 - (bullet ? 15 : 0));
  if (y + lines.length * 15 > 790) page();
  ctx.fillStyle = "#1f2937"; ctx.font = "10.5px Helvetica";
  lines.forEach((line, index) => { if (bullet && index === 0) ctx.fillText("•", margin, y); ctx.fillText(line, margin + (bullet ? 15 : 0), y); y += 15; });
  y += 5;
}
function footer(_number) { /* Sections are separated visually in the continuous PDF. */ }

ctx.fillStyle = "#176b3a"; ctx.font = "bold 26px Helvetica"; ctx.fillText("FKA ERP Assessment Report", margin, 145);
ctx.fillStyle = "#374151"; ctx.font = "13px Helvetica"; ctx.fillText("Business process, ERD, FIFO, architecture, security and prototype", margin, 176);
ctx.font = "11px Helvetica"; ctx.fillText("Prepared 5 August 2026", margin, 210);
ctx.fillStyle = "#176b3a"; ctx.fillRect(margin, 242, 500, 4);
ctx.fillStyle = "#374151"; ctx.font = "11px Helvetica"; ctx.fillText("Scope: Material Master • Goods Receipt • Material Issue • Stock • FIFO • RBAC", margin, 278);
footer(1);

page(); title("1. Business Process and Assumptions");
paragraph("Workflow: Supplier / Material Master → Goods Receipt → Batch / Lot → Current Stock → Production Request → FIFO Material Issue → Stock Ledger and Audit Log.");
paragraph("Goods receipt creates or reuses a batch, increases current stock, posts an immutable ledger entry and records an audit event.");
paragraph("Material issue validates stock, reduces the selected balance atomically and records its ledger/audit entry.");
paragraph("FIFO uses released batches in received-date order. Quantities allow three decimal places. Posted transactions are never deleted; they are corrected with a reasoned reversal.");
heading("2. ERD and Database Design");
paragraph("Better Auth user/session/account tables provide identity. roles, permissions, user_roles and role_permissions form flexible many-to-many RBAC.");
paragraph("Materials, suppliers/customers, warehouses, locations and batch_lots hold master and traceability data. Header/detail tables support multiple transaction lines and batches.");
paragraph("stock_balances stores current quantity by material/batch/warehouse/location; stock_transactions is the immutable movement ledger; audit_logs preserves actor and before/after data.");
heading("3. FIFO and SQL Logic");
paragraph("The stock query joins stock_balances to batch_lots, warehouses and locations, filters positive on-hand quantity, then orders by material and oldest receipt date.");
paragraph("Allocation locks the production order and eligible balance rows with FOR UPDATE, allocates oldest batches first, rejects insufficient stock, writes issue/ledger/audit records, then commits as one database transaction.");
paragraph("Example: request 50 L Alcohol consumes 40 L from AL-26001 then 10 L from AL-26002, leaving 70 L in the second batch."); footer(2);

page(); title("4. System Architecture");
paragraph("Next.js frontend → Express API → Better Auth and RBAC middleware → FIFO/stock services → PostgreSQL via Drizzle ORM. Audit records are written as part of business changes.");
heading("5. Security and RBAC");
paragraph("Access is deny-by-default. Users authenticate through Better Auth, then API middleware resolves permissions from user roles. Input is validated with Zod and SQL is parameterized through Drizzle.");
paragraph("System Administrator: user/configuration/role/permission/audit management.", true);
paragraph("Warehouse User: goods receipt, material issue, current stock and ledger viewing.", true);
paragraph("Production User: production requests and BOM/status; no direct warehouse balance change.", true);
paragraph("Supervisor/Approver: review, approve or reverse with a recorded reason.", true);
paragraph("Management/Auditor: read-only reports, traceability, stock and audit trail.", true);
paragraph("Additional controls: rate limiting, trusted origins, password hashing/session management, row locks, no silent deletion, immutable ledger and recorded reversal.");
heading("6. Disaster Recovery");
paragraph("Nightly encrypted logical backups, point-in-time/WAL retention, separate storage, migration-version capture and quarterly restore drills are recommended. Prototype targets: RPO ≤ 24 h and RTO ≤ 4 h pending business agreement.");
heading("7. Implementation and Prototype");
paragraph("Implementation sequence: model schema/migrations; build CRUD; post receipt/issue inside database transactions; implement FIFO; add RBAC/audit; seed roles/demo users; build bilingual Next.js admin pages; validate production builds.");
paragraph("Submission screenshots should include dashboard, material master, goods receipt, current stock, material issue, stock ledger, FIFO batch allocation, BOM and role-protected API response."); footer(3);

page(); title("8. Technology and AI-use Disclosure");
paragraph("Frontend: Next.js 16, React 19, TypeScript, Tailwind CSS, React Select. Backend: Node.js, Express 5, TypeScript, Zod. Authentication: Better Auth with email/password and optional Google OAuth. Database: PostgreSQL and Drizzle ORM.");
paragraph("AI assistance accelerated code scaffolding, report drafting and review suggestions. The developer reviewed results, chose the business assumptions, ran migrations/seed scripts and verified production builds. No confidential production data was supplied to AI.");
heading("Appendix: Default Local Demo Accounts");
paragraph("These accounts are assessment-only. Passwords are hashed by Better Auth. Change or remove all accounts before shared/production deployment.");
[
  "System Administrator — admin@erp.test — 1234asdf",
  "Warehouse User — warehouse@erp.test — asdf1234",
  "Production User — production@erp.test — asdf1234",
  "Supervisor/Approver — approver@erp.test — asdf1234",
  "Management/Auditor — auditor@erp.test — asdf1234",
].forEach((line) => paragraph(line, true));
paragraph("Provision: npm run seed:rbac then npm run seed:demo-users (run from erp-api). The detailed Markdown report is docs/ASSESSMENT_REPORT.md.");
footer(4);

mkdirSync("docs", { recursive: true });
writeFileSync("docs/ASSESSMENT_REPORT.pdf", canvas.toBuffer("application/pdf"));
console.log("Created docs/ASSESSMENT_REPORT.pdf");
