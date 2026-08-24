import { describe, expect, it } from 'vitest';

import { guideBlocks, guideFigureKeys } from './content';
import { parseGuideMarkdown, serializeGuideMarkdown } from './markdown';

function normalize(blocks: ReturnType<typeof guideBlocks>) {
  return blocks.map((block) => ({
    id: block.id,
    title: block.title,
    paragraphs: block.paragraphs ?? [],
    bullets: block.bullets ?? [],
    figures: block.figures ?? [],
    figureRows: block.figureRows ?? [],
    groups: (block.groups ?? []).map((group) => ({
      title: group.title,
      paragraphs: group.paragraphs ?? [],
      bullets: group.bullets ?? [],
      figures: group.figures ?? [],
      figureRows: group.figureRows ?? [],
    })),
  }));
}

describe('guide markdown', () => {
  it('round-trips the bundled Spanish and English guides', () => {
    for (const language of ['es', 'en'] as const) {
      const original = guideBlocks(language);
      const parsed = parseGuideMarkdown(serializeGuideMarkdown(original));
      expect(normalize(parsed)).toEqual(normalize(original));
      expect(guideFigureKeys(parsed)).toEqual(guideFigureKeys(original));
    }
  });

  it('accepts HTML headings, lists, breaks and figure tags', () => {
    const parsed = parseGuideMarkdown(`
      <h2 id="intro">Guía <strong>rápida</strong></h2>
      <p>Primer párrafo.<br/>Segunda línea.</p>
      <ul><li>Uno</li><li>Dos</li></ul>
      <img src="guide:1" alt="Mapa" />
      <h3>Grupo</h3>
      <figure-row title="Fallas" keys="8,9,10" labels="Leve|Moderado|Severo" />
    `);
    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toMatchObject({
      id: 'intro',
      title: 'Guía rápida',
      bullets: ['Uno', 'Dos'],
      figures: [{ key: 1, caption: 'Mapa' }],
    });
    expect(parsed[0]?.paragraphs?.[0]).toContain('Primer párrafo');
    expect(parsed[0]?.groups?.[0]).toMatchObject({
      title: 'Grupo',
      figureRows: [
        {
          title: 'Fallas',
          keys: [8, 9, 10],
          labels: ['Leve', 'Moderado', 'Severo'],
        },
      ],
    });
  });
});
