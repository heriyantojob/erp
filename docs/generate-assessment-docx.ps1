Add-Type -AssemblyName System.IO.Compression.FileSystem
Add-Type -AssemblyName System.IO.Compression
$out = Join-Path $PSScriptRoot 'ASSESSMENT_REPORT.docx'
$tmp = Join-Path ([System.IO.Path]::GetTempPath()) ('fka-docx-' + [guid]::NewGuid())
New-Item -ItemType Directory -Force -Path "$tmp\_rels", "$tmp\word", "$tmp\docProps" | Out-Null
function Escape([string]$s) { [System.Security.SecurityElement]::Escape($s) }
function P([string]$s, [int]$size = 22, [bool]$bold = $false) { $b = if ($bold) { '<w:b/>' } else { '' }; "<w:p><w:r><w:rPr>$b<w:sz w:val='$size'/></w:rPr><w:t xml:space='preserve'>$(Escape $s)</w:t></w:r></w:p>" }
function Table([object[]]$rows) { $x = '<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/><w:tblBorders><w:top w:val="single"/><w:left w:val="single"/><w:bottom w:val="single"/><w:right w:val="single"/><w:insideH w:val="single"/><w:insideV w:val="single"/></w:tblBorders></w:tblPr>'; foreach($row in $rows){$x+='<w:tr>';foreach($cell in $row){$x+="<w:tc><w:tcPr><w:tcW w:w='3000' w:type='dxa'/></w:tcPr>$(P $cell 18 $false)</w:tc>"};$x+='</w:tr>'};$x+='</w:tbl>';return $x }
$body = ''
$body += P 'FKA ERP Assessment Report' 42 $true
$body += P 'PT French Korean Aromatics | Prepared 5 August 2026' 22
$body += P 'Business process, ERD, FIFO, architecture, security, prototype and technology disclosure.' 22
$body += P '1. Business-process Flow and Assumptions' 30 $true
$body += P 'Flow: Supplier / Material Master to Goods Receipt to Batch / Lot to Current Stock to Production Request to FIFO Material Issue to Stock Ledger and Audit.'
$body += P 'A goods receipt creates or reuses a batch, increases stock, posts an immutable ledger entry and writes an audit record. Material issue validates availability, reduces the balance atomically, and writes its ledger/audit entry.'
$body += P 'Assumptions: quantities use three decimal places; MAIN and MAIN-01 are default demo storage; batch is unique by material and batch number; FIFO sorts by receipt date; posted movements are reversed rather than deleted.'
$body += P '2. ERD and Database Explanation' 30 $true
$body += P 'Better Auth tables manage identity and sessions. roles, permissions, user_roles and role_permissions provide flexible many-to-many RBAC. Materials, suppliers, customers, warehouses, locations and batch_lots hold master/traceability data. Header/detail tables support multiple transaction lines. stock_balances holds current quantity; stock_transactions is the immutable ledger; audit_logs preserves actor and before/after data.'
$body += P '3. SQL Queries and FIFO Logic' 30 $true
$body += P 'Current stock joins stock_balances, batch_lots, warehouses and locations; it filters positive quantity and orders by material, received date and batch.'
$body += P 'FIFO steps: lock production order; read released batches oldest first; lock balances with FOR UPDATE; allocate outstanding quantity; reject insufficient stock; update balances and write issue, ledger and audit records in one transaction. Example: 50 L Alcohol takes 40 L from AL-26001 then 10 L from AL-26002.'
$body += P '4. System Architecture' 30 $true
$body += P 'Next.js Admin UI to Express API to Better Auth and RBAC Middleware to FIFO / Stock Services to PostgreSQL via Drizzle ORM. The frontend uses bilingual routes and API-driven selectors; the API exposes authentication, ERP, stock, FIFO and security endpoints.'
$body += P '5. Security, RBAC and Disaster Recovery' 30 $true
$body += Table @(@('Role','Minimum access concept'),@('System Administrator','Manage users, configuration, roles, permissions and audit.'),@('Warehouse User','Create receipt/issue; view stock and ledger.'),@('Production User','Create/view production requests; view materials and BOM.'),@('Supervisor/Approver','Review, approve or reverse with recorded reason.'),@('Management/Auditor','Read-only reports, traceability, stock and audit.'))
$body += P 'Controls: deny-by-default permission middleware, password hashing, session management, authentication rate limiting, trusted origins, Zod validation, parameterized SQL, row locks, immutable ledger and audited reversal.'
$body += P 'Disaster recovery: nightly encrypted backup, point-in-time/WAL retention, offsite copy, migration/release capture and quarterly restore drills. Prototype target: RPO ≤ 24 hours and RTO ≤ 4 hours.'
$body += P '6. Implementation, Screenshots, Technology and AI Disclosure' 30 $true
$body += P 'Approach: model schema and migrations; implement CRUD; post receipt/issue in one transaction; implement FIFO; add RBAC/audit; seed roles/demo users; build bilingual UI; validate production builds.'
$body += P 'Screenshot checklist: dashboard, Material Master, Goods Receipt, Current Stock, Material Issue, Stock Ledger, FIFO allocation, BOM and role-protected API response.'
$body += P 'Technology: Next.js 16, React 19, TypeScript, Tailwind CSS, React Select, Node.js, Express 5, Zod, Better Auth, PostgreSQL and Drizzle ORM.'
$body += P 'AI disclosure: AI assisted scaffolding, report drafting and review suggestions. The developer reviewed output, selected assumptions, ran scripts and verified builds. No confidential production data was supplied to AI.'
$body += P 'Appendix A. Default Local Demo Accounts' 30 $true
$body += Table @(@('Role','Email','Password'),@('System Administrator','admin@erp.test','1234asdf'),@('Warehouse User','warehouse@erp.test','asdf1234'),@('Production User','production@erp.test','asdf1234'),@('Supervisor/Approver','approver@erp.test','asdf1234'),@('Management/Auditor','auditor@erp.test','asdf1234'))
$body += P 'Assessment-only accounts. Better Auth stores password hashes. Change or remove these accounts before production deployment.'
$doc = "<?xml version='1.0' encoding='UTF-8' standalone='yes'?><w:document xmlns:w='http://schemas.openxmlformats.org/wordprocessingml/2006/main'><w:body>$body<w:sectPr><w:pgSz w:w='11906' w:h='16838'/><w:pgMar w:top='900' w:right='900' w:bottom='900' w:left='900'/></w:sectPr></w:body></w:document>"
[IO.File]::WriteAllText("$tmp\[Content_Types].xml", "<?xml version='1.0'?><Types xmlns='http://schemas.openxmlformats.org/package/2006/content-types'><Default Extension='rels' ContentType='application/vnd.openxmlformats-package.relationships+xml'/><Default Extension='xml' ContentType='application/xml'/><Override PartName='/word/document.xml' ContentType='application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml'/></Types>")
[IO.File]::WriteAllText("$tmp\_rels\.rels", "<?xml version='1.0'?><Relationships xmlns='http://schemas.openxmlformats.org/package/2006/relationships'><Relationship Id='rId1' Type='http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument' Target='word/document.xml'/></Relationships>")
[IO.File]::WriteAllText("$tmp\word\document.xml", $doc)
if(Test-Path $out){Remove-Item -LiteralPath $out -Force}; $zip = [System.IO.Compression.ZipFile]::Open($out,[System.IO.Compression.ZipArchiveMode]::Create); foreach($part in @('[Content_Types].xml','_rels/.rels','word/document.xml')) { $entry = $zip.CreateEntry($part); $source = Join-Path $tmp ($part -replace '/', '\'); $input = [IO.File]::OpenRead($source); $output = $entry.Open(); $input.CopyTo($output); $output.Dispose(); $input.Dispose() }; $zip.Dispose(); Remove-Item -LiteralPath $tmp -Recurse -Force; Get-Item $out | Select Name,Length,LastWriteTime
