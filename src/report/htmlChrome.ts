const PRINT_STYLES = `
.print-bar{position:sticky;bottom:0;display:flex;justify-content:center;padding:14px 12px;background:linear-gradient(180deg,transparent,#eef3ec 28%);margin-top:18px}
.print-bar button{background:#176235;color:#fff;border:0;border-radius:10px;padding:12px 22px;font-size:15px;font-weight:800;cursor:pointer}
@media print{.print-bar,.no-print{display:none!important}body{background:#fff}}
`;

export function wrapPrintableHtml(html: string, printLabel: string) {
  const button = `<div class="print-bar no-print"><button type="button" onclick="window.print()">${escapeHtml(
    printLabel,
  )}</button></div>`;
  if (html.includes('</body>')) {
    return html
      .replace('</head>', `<style>${PRINT_STYLES}</style></head>`)
      .replace('</body>', `${button}</body>`);
  }
  return `${html}${button}<style>${PRINT_STYLES}</style>`;
}

export function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}
