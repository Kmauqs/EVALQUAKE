import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { evaluatorAccountLabel, type Evaluation } from '@/domain/evaluation';
import { quantityCsvHeader, quantityCsvRows } from '@/domain/quantities';
import { en, es } from '@/i18n/translations';

function downloadWeb(contents: string, name: string, type: string) {
  const blob = new Blob([contents], { type });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = name;
  link.click();
  URL.revokeObjectURL(link.href);
}

async function shareNative(contents: string, name: string, mimeType: string) {
  const uri = `${FileSystem.cacheDirectory}${name}`;
  await FileSystem.writeAsStringAsync(uri, contents);
  if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType });
}

export async function exportJson(evaluations: Evaluation[]) {
  const contents = JSON.stringify(evaluations, null, 2);
  if (Platform.OS === 'web') downloadWeb(contents, 'evalquake-evaluations.json', 'application/json');
  else await shareNative(contents, 'evalquake-evaluations.json', 'application/json');
}

export async function exportCsv(evaluations: Evaluation[]) {
  const quote = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;
  const rows = [
    ['id', 'officialNumber', 'status', 'classification', 'department', 'municipality', 'neighborhood', 'address', 'evaluator', 'latitude', 'longitude', 'inspector', 'updatedAt'],
    ...evaluations.map((evaluation) => [
      evaluation.id,
      evaluation.officialNumber,
      evaluation.status,
      evaluation.habitability,
      evaluation.identification.department,
      evaluation.identification.municipality,
      evaluation.identification.neighborhood,
      evaluation.building.address,
      evaluatorAccountLabel(evaluation),
      evaluation.identification.coordinates?.latitude,
      evaluation.identification.coordinates?.longitude,
      evaluation.inspectors[0]?.name,
      evaluation.updatedAt,
    ]),
  ];
  const contents = rows.map((row) => row.map(quote).join(',')).join('\n');
  if (Platform.OS === 'web') downloadWeb(contents, 'evalquake-evaluations.csv', 'text/csv');
  else await shareNative(contents, 'evalquake-evaluations.csv', 'text/csv');
}

export async function exportSummaryHtml(
  evaluations: Evaluation[],
  filters: { damage: string; evaluator: string },
  language: 'es' | 'en' = 'es',
) {
  const t = language === 'es' ? es : en;
  const classifications = ['habitable', 'restricted', 'unsafe', 'collapsed'] as const;
  const byDamage = classifications
    .map(
      (value) =>
        `<tr><td>${t[value]}</td><td>${evaluations.filter((item) => item.habitability === value).length}</td></tr>`,
    )
    .join('');
  const evaluators = new Map<string, number>();
  for (const evaluation of evaluations) {
    const label = evaluatorAccountLabel(evaluation);
    evaluators.set(label, (evaluators.get(label) ?? 0) + 1);
  }
  const byEvaluator = [...evaluators.entries()]
    .sort((left, right) => right[1] - left[1])
    .map(([label, count]) => `<tr><td>${label}</td><td>${count}</td></tr>`)
    .join('');
  const rows = evaluations
    .map(
      (evaluation) => `<tr>
        <td>${evaluation.officialNumber ?? '—'}</td>
        <td>${evaluation.building.address || evaluation.id}</td>
        <td>${t[evaluation.habitability]}</td>
        <td>${evaluatorAccountLabel(evaluation)}</td>
        <td>${evaluation.identification.municipality}</td>
      </tr>`,
    )
    .join('');
  const html = `<!DOCTYPE html><html lang="${language}"><head><meta charset="utf-8"/><title>${t.exportSummary}</title>
    <style>body{font-family:sans-serif;padding:24px;color:#16302b} table{border-collapse:collapse;width:100%;margin:16px 0} th,td{border:1px solid #c5d4ce;padding:8px;text-align:left} h1{margin:0}</style>
    </head><body>
    <h1>EVALQUAKE — ${t.exportSummary}</h1>
    <p>${t.currentEvent}</p>
    <p>${t.filterByDamage}: ${filters.damage === 'all' ? t.allDamage : t[filters.damage as keyof typeof t]} · ${t.filterByEvaluator}: ${filters.evaluator === 'all' ? t.allEvaluators : filters.evaluator}</p>
    <p>${t.totalEvaluations}: ${evaluations.length}</p>
    <h2>${t.filterByDamage}</h2>
    <table><thead><tr><th>${t.filterByDamage}</th><th>${t.totalEvaluations}</th></tr></thead><tbody>${byDamage}</tbody></table>
    <h2>${t.filterByEvaluator}</h2>
    <table><thead><tr><th>${t.evaluatorAccount}</th><th>${t.totalEvaluations}</th></tr></thead><tbody>${byEvaluator}</tbody></table>
    <h2>${t.recentEvaluations}</h2>
    <table><thead><tr><th>#</th><th>${t.address}</th><th>${t.filterByDamage}</th><th>${t.evaluatorAccount}</th><th>${t.fields.municipality}</th></tr></thead><tbody>${rows}</tbody></table>
    </body></html>`;
  if (Platform.OS === 'web') downloadWeb(html, 'evalquake-resumen.html', 'text/html');
  else await shareNative(html, 'evalquake-resumen.html', 'text/html');
}

export async function exportQuantitiesCsv(evaluations: Evaluation[], language: 'es' | 'en' = 'es') {
  const t = language === 'es' ? es : en;
  const quote = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;
  const header = quantityCsvHeader(t);
  const body = evaluations.flatMap((evaluation) => quantityCsvRows(evaluation, t).slice(1));
  const contents = [header, ...body].map((row) => row.map(quote).join(',')).join('\n');
  const name =
    evaluations.length === 1
      ? `evalquake-cantidades-${evaluations[0]!.id}.csv`
      : 'evalquake-cantidades.csv';
  if (Platform.OS === 'web') downloadWeb(contents, name, 'text/csv');
  else await shareNative(contents, name, 'text/csv');
}
