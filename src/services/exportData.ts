import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import type { Evaluation } from '@/domain/evaluation';
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
    ['id', 'officialNumber', 'status', 'classification', 'department', 'municipality', 'neighborhood', 'address', 'latitude', 'longitude', 'inspector', 'updatedAt'],
    ...evaluations.map((evaluation) => [
      evaluation.id,
      evaluation.officialNumber,
      evaluation.status,
      evaluation.habitability,
      evaluation.identification.department,
      evaluation.identification.municipality,
      evaluation.identification.neighborhood,
      evaluation.building.address,
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
