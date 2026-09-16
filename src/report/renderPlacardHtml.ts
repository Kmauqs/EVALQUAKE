import type { Evaluation, Language } from '../domain/evaluation';
import { en, es } from '../i18n/translations';
import { escapeHtml, wrapPrintableHtml } from './htmlChrome';

const escape = escapeHtml;

export function renderPlacardHtml(evaluation: Evaluation, language: Language) {
  const t = language === 'es' ? es : en;
  const p = t.placard;
  const inspector = evaluation.inspectors[0];
  const date =
    evaluation.placard.date || new Date(evaluation.inspectedAt).toLocaleDateString(language);
  const time =
    evaluation.placard.time ||
    new Date(evaluation.inspectedAt).toLocaleTimeString(language, {
      hour: '2-digit',
      minute: '2-digit',
    });
  const jurisdiction =
    evaluation.placard.jurisdiction ||
    inspector?.entity ||
    evaluation.identification.municipality ||
    '—';
  const inspectorLine =
    evaluation.placard.inspectorLine ||
    [inspector?.inspectorId, inspector?.name, inspector?.entity].filter(Boolean).join(' / ') ||
    '—';
  const facility = [evaluation.building.name, evaluation.building.address]
    .filter(Boolean)
    .join(' — ');
  const comments = evaluation.placard.comments || evaluation.comments || evaluation.globalStability.notes;
  const restrictions = evaluation.placard.restrictions || evaluation.recommendations.barriers;
  const interior =
    evaluation.inspection.type === 'complete' || evaluation.inspection.type === 'interior_affected';
  const theme = {
    habitable: { bg: '#2D7A45', title: p.inspected, subtitle: p.inspectedSubtitle },
    restricted: { bg: '#D69E00', title: p.restricted, subtitle: '' },
    unsafe: { bg: '#C43D32', title: p.unsafe, subtitle: p.unsafeSubtitle },
    collapsed: { bg: '#242824', title: p.collapsed, subtitle: p.unsafeSubtitle },
  }[evaluation.habitability];

  const left =
    evaluation.habitability === 'habitable'
      ? `<p>${escape(p.inspectedBody)}</p>
        <p><label><input type="checkbox" ${interior ? '' : 'checked'} disabled> ${escape(p.exterior)}</label><br>
        <label><input type="checkbox" ${interior ? 'checked' : ''} disabled> ${escape(p.interiorExterior)}</label></p>
        <p>${escape(p.reportUnsafe)}</p>
        <p><strong>${escape(t.fields.placardComments)}</strong><br>${escape(comments || '—')}</p>`
      : evaluation.habitability === 'restricted'
        ? `<p><strong>${escape(p.restrictedBody)}</strong></p>
          <p class="lines">${escape(comments || '—')}</p>
          <p><strong>${escape(p.restrictedAreas)}</strong></p>
          <p class="lines">${escape(restrictions || evaluation.placard.furtherActions || '—')}</p>`
        : `<p>${escape(p.unsafeBody)}</p>
          <p class="lines">${escape(comments || '—')}</p>
          <p><strong>${escape(p.notDemolition)}</strong></p>
          <p>${escape(p.unsafeWarning)}</p>`;

  const html = `<!doctype html>
<html lang="${language}"><head><meta charset="utf-8"><title>${escape(theme.title)} — EVALQUAKE</title>
<style>
@page{size:A4;margin:12mm}*{box-sizing:border-box}
body{font-family:Arial,sans-serif;color:#17251c;margin:0;background:#f5f8f3;padding:18px}
.placard{max-width:900px;margin:0 auto;border:8px double ${theme.bg};background:#fff;min-height:240mm}
.banner{background:${theme.bg};color:#fff;text-align:center;padding:18px 16px}
.banner h1{margin:0;font-size:42px;letter-spacing:2px}
.banner h2{margin:8px 0 0;font-size:18px;font-weight:700}
.grid{display:grid;grid-template-columns:1.3fr .9fr;gap:0}
.col{padding:18px 20px;border-top:2px solid ${theme.bg}}
.col+.col{border-left:2px solid ${theme.bg}}
p{font-size:13px;line-height:1.45;margin:0 0 12px}
.lines{min-height:64px;border-bottom:1px solid #c5d0c4;white-space:pre-wrap}
.meta label{display:block;color:#637068;font-size:11px;font-weight:700;margin-top:10px}
.meta .value{border-bottom:1px solid #17251c;min-height:22px;font-weight:700;padding:4px 0}
.foot{border-top:3px solid ${theme.bg};text-align:center;padding:12px 16px;font-weight:800;font-size:12px}
.caution{font-size:12px;color:#7a3b00;font-weight:700}
@media (max-width:700px){.grid{grid-template-columns:1fr}.col+.col{border-left:0}}
</style></head>
<body>
<article class="placard">
  <div class="banner"><h1>${escape(theme.title)}</h1>${
    theme.subtitle ? `<h2>${escape(theme.subtitle)}</h2>` : ''
  }</div>
  <div class="grid">
    <div class="col">
      ${left}
      <p><strong>${escape(p.facility)}</strong><br>${escape(facility || '—')}</p>
    </div>
    <div class="col meta">
      <label>${escape(t.fields.placardDate)}</label><div class="value">${escape(date)}</div>
      <label>${escape(t.fields.placardTime)}</label><div class="value">${escape(time)}</div>
      <p class="caution">${escape(p.aftershocks)}</p>
      <p>${escape(p.inspectedBy)}</p>
      <label>${escape(t.fields.placardJurisdiction)}</label><div class="value">${escape(jurisdiction)}</div>
      <label>${escape(t.fields.placardInspector)}</label><div class="value">${escape(inspectorLine)}</div>
    </div>
  </div>
  <div class="foot">${escape(p.doNotRemove)}</div>
</article>
</body></html>`;

  return wrapPrintableHtml(html, t.printPdf);
}
