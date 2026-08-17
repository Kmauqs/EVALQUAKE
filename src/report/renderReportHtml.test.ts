import { describe, expect, it } from 'vitest';

import { createEvaluation } from '../domain/evaluation';
import { en, es } from '../i18n/translations';
import { renderReportHtml } from './renderReportHtml';

describe('bilingual report renderer', () => {
  it('keeps all 17 section names in both languages', () => {
    expect(es.sections).toHaveLength(17);
    expect(en.sections).toHaveLength(17);
    expect(Object.keys(es.fields)).toEqual(Object.keys(en.fields));
    expect(Object.keys(es.damage)).toEqual(Object.keys(en.damage));
  });

  it('renders escaped evaluation data in Spanish and English', () => {
    const evaluation = createEvaluation('EQ-TEST');
    evaluation.building.address = '<Casa & Hogar>';
    const spanish = renderReportHtml(evaluation, 'es');
    const english = renderReportHtml(evaluation, 'en');
    expect(spanish).toContain('Identificación catastral');
    expect(english).toContain('Cadastral identification');
    expect(spanish).toContain('&lt;Casa &amp; Hogar&gt;');
    expect(spanish).not.toContain('<Casa & Hogar>');
  });

  it('embeds signatures, sketches, photographs, captions, and coordinates', () => {
    const evaluation = createEvaluation('EQ-EVIDENCE');
    evaluation.signatureUri = 'data:image/svg+xml,signature';
    evaluation.sketchUri = 'data:image/svg+xml,sketch';
    evaluation.photos = [
      {
        id: 'photo-1',
        localUri: 'data:image/jpeg;base64,PHOTO',
        sectionRef: 'photos',
        caption: 'Crack on north wall',
        coordinates: { latitude: 4.65, longitude: -74.05 },
        syncState: 'pending',
      },
    ];
    const html = renderReportHtml(evaluation, 'en');
    expect(html).toContain('data:image/svg+xml,signature');
    expect(html).toContain('data:image/svg+xml,sketch');
    expect(html).toContain('data:image/jpeg;base64,PHOTO');
    expect(html).toContain('Crack on north wall');
    expect(html).toContain('4.650000, -74.050000');
  });
});
