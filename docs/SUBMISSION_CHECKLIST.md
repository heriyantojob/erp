# FKA Assessment Submission Checklist

- [x] Task 1 - end-to-end process analysis and assumptions (`PROCESS_FLOW.md`).
- [x] Task 2 - ERD/database explanation and data dictionary (`DATA_DICTIONARY.md`, schema source).
- [x] Task 3.1 - Current Stock SQL.
- [x] Task 3.2 - Stock Ledger + running balance SQL.
- [x] Task 3.3 - Expiring Materials SQL.
- [x] Task 3.4 - two-way Raw Material <-> Finished Goods traceability SQL.
- [x] Task 3.5 - Ledger vs Current Stock reconciliation SQL.
- [x] Task 4 - FIFO 50 L Alcohol explanation and transaction safety.
- [x] Task 5 - mandatory mini-web flow and API endpoints.
- [x] Task 6 - architecture + maintainability/scalability/security/cost/integration explanation.
- [x] Task 7 - five-role RBAC + security controls explanation.
- [x] Task 8 - backup/DR proposal including off-site, encryption, retention, restore, ransomware, RPO/RTO.
- [x] Task 9 - requirements gathering, Excel migration, UAT/training, implementation phases, future Customs/ERP integration.
- [x] Simulation data seed from the assessment.
- [x] README and local installation steps.
- [x] Sanitized API/frontend `.env.example` templates.
- [x] Prototype screenshots currently available under `docs/screenshots/`.
- [x] Technology list and AI-use disclosure.

## Final manual checks before sending

1. Run `npm run migrate` and both dev servers from a clean database/environment.
2. Login with every demo role and verify expected access/403 behavior.
3. Demonstrate Goods Receipt -> QA/release where applicable -> Material Issue -> Current Stock -> Stock Ledger.
4. Demonstrate the 50 L Alcohol FIFO scenario or explain it directly from the transaction service.
5. Run the SQL in `ASSESSMENT_SQL.sql` against the final database and save screenshots/results if useful.
6. Review real `.env` files before external submission; this working package intentionally retains them at the user's request.
7. Be ready to identify AI-assisted sections and modify one validation rule during the interview.
