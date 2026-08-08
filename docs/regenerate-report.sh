#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
if ! command -v pandoc >/dev/null 2>&1; then
  echo "pandoc is required to regenerate DOCX/HTML from ASSESSMENT_REPORT.md" >&2
  exit 1
fi
pandoc ASSESSMENT_REPORT.md --from=gfm --to=docx --resource-path=. -o ASSESSMENT_REPORT.docx
pandoc ASSESSMENT_REPORT.md --from=gfm --to=html5 --standalone --metadata title='FKA ERP Technical Assessment Report' -o ASSESSMENT_REPORT.html
if command -v libreoffice >/dev/null 2>&1; then
  tmp="$(mktemp -d)"
  libreoffice --headless --convert-to pdf --outdir "$tmp" ASSESSMENT_REPORT.docx >/dev/null 2>&1 || true
  if [ -f "$tmp/ASSESSMENT_REPORT.pdf" ]; then cp "$tmp/ASSESSMENT_REPORT.pdf" ASSESSMENT_REPORT.pdf; fi
  rm -rf "$tmp"
fi
echo "Assessment report regenerated. Review the PDF visually before submission."
