import type { Language } from '../domain/evaluation';

import {
  guideBlocks,
  type GuideBlock,
  type GuideFigure,
  type GuideFigureRow,
  type GuideGroup,
} from './content';

function escapeAttr(value: string) {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

function unescapeAttr(value: string) {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function parseAttrs(raw: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const pattern = /([:\w-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s/>]+)))?/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(raw))) {
    const key = match[1];
    if (!key) continue;
    attrs[key.toLowerCase()] = unescapeAttr(match[2] ?? match[3] ?? match[4] ?? 'true');
  }
  return attrs;
}

function figureTag(figure: GuideFigure) {
  const caption = figure.caption ? ` caption="${escapeAttr(figure.caption)}"` : '';
  return `<figure key="${figure.key}"${caption} />`;
}

function figureRowTag(row: GuideFigureRow) {
  return `<figure-row title="${escapeAttr(row.title)}" keys="${row.keys.join(',')}" labels="${row.labels
    .map(escapeAttr)
    .join('|')}" />`;
}

function writeParagraphs(lines: string[], paragraphs?: string[]) {
  for (const paragraph of paragraphs ?? []) {
    lines.push(paragraph, '');
  }
}

function writeBullets(lines: string[], bullets?: string[]) {
  for (const item of bullets ?? []) lines.push(`- ${item}`);
  if (bullets?.length) lines.push('');
}

function writeFigures(lines: string[], figures?: GuideFigure[]) {
  for (const figure of figures ?? []) lines.push(figureTag(figure), '');
}

function writeRows(lines: string[], rows?: GuideFigureRow[]) {
  for (const row of rows ?? []) lines.push(figureRowTag(row), '');
}

function writeGroup(lines: string[], group: GuideGroup) {
  lines.push(`### ${group.title}`, '');
  writeParagraphs(lines, group.paragraphs);
  writeBullets(lines, group.bullets);
  writeFigures(lines, group.figures);
  writeRows(lines, group.figureRows);
}

export function serializeGuideMarkdown(blocks: GuideBlock[]): string {
  const lines: string[] = [];
  for (const block of blocks) {
    lines.push(`## ${block.title} {#${block.id}}`, '');
    writeParagraphs(lines, block.paragraphs);
    writeBullets(lines, block.bullets);
    writeFigures(lines, block.figures);
    writeRows(lines, block.figureRows);
    for (const group of block.groups ?? []) writeGroup(lines, group);
  }
  return `${lines.join('\n').trim()}\n`;
}

function stripTags(value: string) {
  return value
    .replace(/<\/?(?:strong|b|em|i|u|span|div|code)[^>]*>/gi, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .trim();
}

function slugify(title: string) {
  const slug = title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'section';
}

function uniqueId(base: string, used: Set<string>) {
  let id = base || 'section';
  let n = 2;
  while (used.has(id)) {
    id = `${base}-${n}`;
    n += 1;
  }
  used.add(id);
  return id;
}

function parseKeys(value: string | undefined): number[] {
  if (!value) return [];
  return value
    .split(/[,\s]+/)
    .map((item) => Number.parseInt(item, 10))
    .filter((item) => Number.isInteger(item) && item > 0);
}

function parseLabels(value: string | undefined, fallbackCount: number): string[] {
  if (!value) return Array.from({ length: fallbackCount }, () => '');
  const parts = value.includes('|') ? value.split('|') : value.split(',');
  return parts.map((item) => item.trim());
}

function guideKeyFromSrc(src?: string) {
  if (!src) return '';
  const match = src.match(/(?:guide:|image)(\d+)/i);
  return match?.[1] ?? '';
}

function figureFromAttrs(attrs: Record<string, string>): GuideFigure | null {
  const key = Number.parseInt(attrs.key || attrs['data-key'] || guideKeyFromSrc(attrs.src), 10);
  if (!Number.isInteger(key) || key < 1) return null;
  const caption = attrs.caption || attrs.alt || undefined;
  return caption ? { key, caption } : { key };
}

function figureRowFromAttrs(attrs: Record<string, string>): GuideFigureRow | null {
  const keys = parseKeys(attrs.keys);
  if (!keys.length) return null;
  return {
    title: attrs.title || attrs['aria-label'] || '',
    keys,
    labels: parseLabels(attrs.labels, keys.length),
  };
}

function normalizeMarkup(source: string): string {
  let text = source.replace(/\r\n/g, '\n');
  text = text.replace(/<!--[\s\S]*?-->/g, '');
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(
    /<h2([^>]*)>([\s\S]*?)<\/h2>/gi,
    (_, attrs: string, title: string) => {
      const id = parseAttrs(attrs).id;
      const heading = stripTags(title);
      return `\n## ${heading}${id ? ` {#${id}}` : ''}\n`;
    },
  );
  text = text.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, (_, title: string) => `\n### ${stripTags(title)}\n`);
  text = text.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, (_, title: string) => `\n## ${stripTags(title)}\n`);
  text = text.replace(/<\/p>\s*<p[^>]*>/gi, '\n\n');
  text = text.replace(/<\/?p[^>]*>/gi, '\n');
  text = text.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_, item: string) => `\n- ${stripTags(item)}`);
  text = text.replace(/<\/?(?:ul|ol)[^>]*>/gi, '\n');
  text = text.replace(/<img\b([^>]*)\/?>/gi, (_, attrs: string) => {
    const figure = figureFromAttrs(parseAttrs(attrs));
    if (!figure) return '';
    return `\n${figureTag(figure)}\n`;
  });
  return text;
}

function finishGroup(block: GuideBlock, group: GuideGroup | null) {
  if (!group) return;
  if (!block.groups) block.groups = [];
  block.groups.push(group);
}

function pushParagraph(target: { paragraphs?: string[] }, text: string) {
  const value = stripTags(text).replace(/\s+/g, ' ').trim();
  if (!value) return;
  if (!target.paragraphs) target.paragraphs = [];
  target.paragraphs.push(value);
}

function pushBullet(target: { bullets?: string[] }, text: string) {
  const value = stripTags(text).replace(/^\s*[-*]\s+/, '').trim();
  if (!value) return;
  if (!target.bullets) target.bullets = [];
  target.bullets.push(value);
}

function pushFigure(target: { figures?: GuideFigure[] }, figure: GuideFigure) {
  if (!target.figures) target.figures = [];
  target.figures.push(figure);
}

function pushRow(target: { figureRows?: GuideFigureRow[] }, row: GuideFigureRow) {
  if (!target.figureRows) target.figureRows = [];
  target.figureRows.push(row);
}

const TAG_LINE = /^\s*<(figure-row|figure)\b([\s\S]*?)\/?>\s*$/i;
const HEADING_LINE = /^(#{1,3})\s+(.+?)(?:\s+\{#([a-z0-9_-]+)\})?\s*$/i;

export function parseGuideMarkdown(source: string): GuideBlock[] {
  const usedIds = new Set<string>();
  const blocks: GuideBlock[] = [];
  let current: GuideBlock | null = null;
  let group: GuideGroup | null = null;

  const ensureBlock = (): GuideBlock => {
    if (current) return current;
    current = { id: uniqueId('section', usedIds), title: '' };
    blocks.push(current);
    return current;
  };

  const target = () => group ?? ensureBlock();

  for (const rawLine of normalizeMarkup(source).split('\n')) {
    const line = rawLine.trim();
    if (!line) continue;

    const heading = line.match(HEADING_LINE);
    if (heading) {
      const marks = heading[1];
      const rawTitle = heading[2];
      if (!marks || !rawTitle) continue;
      const level = marks.length;
      const title = stripTags(rawTitle).trim();
      if (level <= 2) {
        if (current) finishGroup(current, group);
        group = null;
        current = {
          id: uniqueId(heading[3] || slugify(title), usedIds),
          title,
        };
        blocks.push(current);
      } else {
        const block = ensureBlock();
        finishGroup(block, group);
        group = { title };
      }
      continue;
    }

    const tag = line.match(TAG_LINE);
    if (tag) {
      const rawName = tag[1];
      if (!rawName) continue;
      const name = rawName.toLowerCase();
      const attrs = parseAttrs(tag[2] ?? '');
      if (name === 'figure-row') {
        const row = figureRowFromAttrs(attrs);
        if (row) pushRow(target(), row);
      } else {
        const figure = figureFromAttrs(attrs);
        if (figure) pushFigure(target(), figure);
      }
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      pushBullet(target(), line);
      continue;
    }

    pushParagraph(target(), line);
  }

  if (current) finishGroup(current, group);
  return blocks.filter((block) => block.title || block.paragraphs || block.bullets || block.figures || block.groups);
}

export function bundledGuideMarkdown(language: Language): string {
  return serializeGuideMarkdown(guideBlocks(language));
}

export function resolveGuideBlocks(language: Language, markdown?: string | null): GuideBlock[] {
  if (!markdown?.trim()) return guideBlocks(language);
  const parsed = parseGuideMarkdown(markdown);
  return parsed.length ? parsed : guideBlocks(language);
}

export function tryParseGuideMarkdown(source: string) {
  try {
    return { blocks: parseGuideMarkdown(source), error: null as string | null };
  } catch (error) {
    return {
      blocks: [] as GuideBlock[],
      error: error instanceof Error ? error.message : 'Invalid guide markup',
    };
  }
}
