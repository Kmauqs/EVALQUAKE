import { describe, expect, it } from 'vitest';

import { createEvaluation } from '../domain/evaluation';
import { en, es } from '../i18n/translations';
import { renderPlacardHtml } from './renderPlacardHtml';
import { renderReportHtml } from './renderReportHtml';

describe('bilingual report renderer', () => {
  it('keeps matching catalogs and section names in both languages', () => {
    expect(Object.keys(es.sections)).toEqual(Object.keys(en.sections));
    expect(Object.keys(es.fields)).toEqual(Object.keys(en.fields));
    expect(Object.keys(es.damage)).toEqual(Object.keys(en.damage));
    expect(Object.keys(es.catalogs)).toEqual(Object.keys(en.catalogs));
    expect(Object.keys(es.hints)).toEqual(Object.keys(en.hints));
    expect(Object.keys(es.catalogs.irregularities)).toEqual(Object.keys(en.catalogs.irregularities));
    expect(Object.keys(es.catalogs.typicalRestrictions)).toEqual(
      Object.keys(en.catalogs.typicalRestrictions),
    );
    expect(Object.keys(es.catalogs.furtherActions)).toEqual(Object.keys(en.catalogs.furtherActions));
    expect(es.sections).not.toHaveProperty('8');
  });

  it('renders escaped evaluation data in Spanish and English with a print-to-PDF control', () => {
    const evaluation = createEvaluation('EQ-TEST');
    evaluation.building.address = '<Casa & Hogar>';
    evaluation.building.nsrGroup = 'group_i';
    const spanish = renderReportHtml(evaluation, 'es');
    const english = renderReportHtml(evaluation, 'en');
    expect(spanish).toContain('Identificación catastral');
    expect(english).toContain('Cadastral identification');
    expect(spanish).toContain('Área en planta');
    expect(spanish).toContain('Pisos bajo rasante');
    expect(spanish).toContain('Se informó a ocupantes');
    expect(spanish).toContain('Imprimir en PDF');
    expect(english).toContain('Print to PDF');
    expect(spanish).toContain('window.print()');
    expect(spanish).toContain('&lt;Casa &amp; Hogar&gt;');
    expect(spanish).not.toContain('<Casa & Hogar>');
    expect(spanish).not.toContain('Criterios ATC-20 en campo');
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

  it('includes the equipment section for complete inspections of essential buildings', () => {
    const evaluation = createEvaluation('EQ-EQUIP');
    evaluation.inspection.type = 'complete';
    evaluation.building.nsrGroup = 'group_iii';
    evaluation.equipmentReview.items[0]!.damage = 'severe';
    const html = renderReportHtml(evaluation, 'es');
    expect(html).toContain('Lista de revisión de equipos');
    expect(html).toContain('Calefactores principales');
  });

  it('renders ATC-20 occupancy placards with print-to-PDF', () => {
    const evaluation = createEvaluation('EQ-PLACARD');
    evaluation.habitability = 'restricted';
    evaluation.building.address = 'Calle 10 # 20-30';
    evaluation.placard.restrictions = 'No usar la chimenea';
    const html = renderPlacardHtml(evaluation, 'es');
    expect(html).toContain('USO RESTRINGIDO');
    expect(html).toContain('Calle 10 # 20-30');
    expect(html).toContain('No usar la chimenea');
    expect(html).toContain('Imprimir en PDF');
    expect(html).toContain('@media print');
  });
});
