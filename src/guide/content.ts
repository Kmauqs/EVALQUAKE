import type { Language } from '../domain/evaluation';

export interface GuideFigure {
  key: number;
  caption?: string;
}

export interface GuideFigureRow {
  title: string;
  labels: string[];
  keys: number[];
}

export interface GuideGroup {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
  figures?: GuideFigure[];
  figureRows?: GuideFigureRow[];
}

export interface GuideBlock {
  id: string;
  title: string;
  paragraphs?: string[];
  bullets?: string[];
  figures?: GuideFigure[];
  figureRows?: GuideFigureRow[];
  groups?: GuideGroup[];
}

const lms = {
  es: ['Leve', 'Moderado', 'Severo'],
  en: ['Slight', 'Moderate', 'Severe'],
};

const copy = {
  es: {
    introTitle: 'Guía gráfica de inspección postsismo',
    introP: [
      'Resumen operativo para evaluar y marcar edificaciones después de un sismo, basado en la guía gráfica de inspección y en el manual ATC-20-1. No reemplaza el criterio profesional ni la orden de la jurisdicción local.',
      'La evaluación rápida suele durar 10 a 30 minutos. La detallada, 1 a 4 horas. La evaluación ingenieril puede tomar días y la realiza un especialista.',
    ],
    hazardTitle: 'Amenaza sísmica del evento',
    hazardCaption: 'Mapa de simulación de aceleración máxima del terreno (fuente: INGENIAR).',
    methodsTitle: 'Métodos de evaluación (ATC-20)',
    methodsCaption: 'Diagrama de flujo para la evaluación y marcación de edificaciones.',
    rapidTitle: 'Evaluación rápida',
    rapidB: [
      'Inspectores de edificaciones, ingenieros civiles/estructurales o personal entrenado.',
      'Determinar con rapidez si la estructura aparentemente estable es ocupable y qué restricciones aplicar.',
    ],
    detailedTitle: 'Evaluación detallada',
    detailedB: [
      'Ingenieros civiles/estructurales. Inspección visual más completa.',
      'Usar cuando hay duda estructural, uso restringido o inseguro, o en instalaciones esenciales.',
    ],
    engineeringTitle: 'Evaluación ingenieril',
    engineeringB: [
      'Consultor estructural. Estabilizar o reparar estructuras gravemente afectadas.',
      'Requiere geotecnista o especialista en materiales peligrosos si hay movimiento de tierras o derrames.',
    ],
    processTitle: 'Proceso de inspección rápida',
    processB: [
      'Examinar todo el exterior de la edificación.',
      'Revisar suelo y pavimento: fisuras, asentamientos o movimiento de tierra.',
      'Entrar solo si no se ve suficiente desde afuera o hay sospecha de daño interior. Nunca entrar de frente a una estructura obviamente afectada.',
      'Aplicar los criterios de colapso, desplome, suelo, caída de elementos y otras amenazas.',
      'Completar el formulario, verificar salidas de emergencia y señalar restricciones.',
      'Colocar una sola pancarta visible en la entrada principal. Si es uso restringido o inseguro, repetir en las demás entradas (excepto vivienda unifamiliar).',
      'Explicar a ocupantes el significado de la pancarta, sin generar pánico.',
    ],
    postingTitle: 'Pancartas de marcación',
    postingCaption: 'Tipos de pancarta para marcación de edificaciones.',
    greenTitle: 'Inspeccionado (verde)',
    greenB: [
      'No hay peligro aparente. Pueden requerirse reparaciones leves.',
      'El sistema de cargas vertical y lateral está intacto. Sin restricción de uso.',
    ],
    yellowTitle: 'Uso restringido (amarillo)',
    yellowB: [
      'Hay una amenaza que obliga a limitar el ingreso o el uso de zonas.',
      'Las restricciones deben escribirse de forma explícita en la pancarta y en el formulario.',
    ],
    redTitle: 'Inseguro / peligro de colapso (rojo o negro)',
    redB: [
      'Amenazas inminentes o daño estructural severo. No ocupar ni ingresar, salvo personal calificado.',
      'Marcar inseguro no es una orden de demolición.',
    ],
    postingNote:
      'Barricadas: usar cinta o conos de forma temporal; luego vallas. No colocarlas pegadas a la fachada: vidrios y bloques pueden caer. En daños generalizados, restringir manzanas completas.',
    irrTitle: 'Parte 1 — Discontinuidades e irregularidades',
    irrP: ['Las configuraciones irregulares concentran daño. Identificarlas en campo y anotarlas en Sistema estructural.'],
    irrB: [
      'Piso blando o discontinuidad vertical (cambio brusco de rigidez o de muros).',
      'Planta irregular, alas, retranqueos o geometría en L / T / U.',
      'Columna corta (muro o antepecho que restringe la luz libre).',
      'Muros estructurales discontinuos entre pisos.',
    ],
    irrCap1: 'Sistemas estructurales con discontinuidades verticales o irregularidades.',
    irrCap2: 'Edificaciones con configuraciones de planta irregulares.',
    masonryTitle: 'Parte 2 — Mampostería',
    masonryP: ['Calificar el daño de cada elemento como leve, moderado o severo antes de decidir la marcación.'],
    masonryCap1: 'Tipos de fallas en edificaciones de mampostería sin refuerzo estructural.',
    masonryCap2: 'Puntos de inspección para edificaciones pequeñas de mampostería no reforzada.',
    urTitle: 'Mampostería no reforzada',
    urB: [
      'Muros cortos: rotación, deslizamiento de juntas, tensión diagonal.',
      'Dinteles y antepechos: rotación o desplazamiento entre apoyos.',
      'Muros fuertes: deslizamiento, rotura de base, flexión fuera de plano.',
    ],
    cfTitle: 'Mampostería confinada',
    cfB: [
      'Paneles: fisuras en esquinas, tensión diagonal, deslizamiento, efectos fuera de plano.',
      'Columnetas y nudos viga-columna: cortante, falla de traslapos, nudo dañado.',
    ],
    rmTitle: 'Mampostería reforzada',
    rmB: [
      'Muros fuertes: flexión dúctil, cortante, deslizamiento sísmico, inestabilidad fuera de plano.',
      'Muros y vigas débiles: cortante e interacción flexión-cortante.',
    ],
    woodTitle: 'Edificaciones de madera',
    woodB: [
      'Conexiones a cimentación y anclajes del diafragma.',
      'Pandeo o separación de muros, chimeneas y cubiertas.',
      'Daño cerca de apoyos de vigas y pérdida de capacidad vertical.',
    ],
    woodCaption: 'Puntos de inspección para viviendas de madera.',
    concreteTitle: 'Edificaciones de concreto',
    concreteB: [
      'Nudos viga-columna, confinamiento, columnas cortas y rótulas plásticas.',
      'Muros de corte: grietas en juntas de construcción y aplastamiento en extremos.',
      'Prefabricado: diafragmas, conectores, losas y separación de paneles.',
    ],
    concCap1: 'Puntos de inspección para muros de concreto estructural (muros vaciados).',
    concCap2: 'Puntos de inspección para pórticos de concreto reforzado vaciado in situ.',
    concCap3: 'Puntos de inspección para losas de concreto prefabricado.',
    concCap4: 'Puntos de inspección para concreto reforzado prefabricado.',
    concCap5: 'Puntos de inspección para edificaciones modulares prefabricadas.',
    steelTitle: 'Edificaciones de acero',
    steelB: [
      'Arriostramientos elongados o pandeados; abrazaderas y uniones.',
      'Naves de un nivel: columnas, cerchas, anclajes y cerramientos de mampostería.',
      'Revestimiento contra fuego desprendido que impida ver la conexión.',
    ],
    steelCap1: 'Puntos de inspección para pórticos de acero de un solo nivel (naves y bodegas).',
    steelCap2: 'Puntos de inspección para acero con revestimiento de mampostería.',
    elevatorTitle: 'Ascensores a tracción',
    elevatorB: [
      'Cables fuera de poleas, anclaje de maquinaria, guía fuera de rieles, puertas atascadas.',
      'Contrapeso fuera de carriles, rieles golpeados, abrazaderas rotas o dobladas.',
      'La fosa y la sala de máquinas solo las revisa personal calificado.',
    ],
    elevatorCaption: 'Puntos de inspección para ascensores a tracción.',
    sketchesTitle: 'Ejemplos de croquis de evaluación estructural',
    sketchCap1: 'Bosquejo de grietas, rupturas y zonas con refuerzo expuesto en muros.',
    sketchCap2: 'Evaluación de movimiento lateral de suelos (ejemplo Valley Juvenile, 1971, San Fernando, California).',
    entryTitle: 'Cuándo entrar a la edificación',
    entryB: [
      'Hay sospecha de daño interior o este es visible desde afuera.',
      'Desde el exterior no se ve suficientemente el interior.',
      'Hay que hablar con el administrador u ocupantes de un edificio grande.',
      'No entrar sin autorización del propietario, salvo orden de la jurisdicción.',
      'Si hay duda, esperar una evaluación detallada.',
    ],
    rows: {
      urRock: 'Muro corto. Rotación del muro',
      urSlide: 'Muro corto. Deslizamiento de las juntas horizontales',
      urDiag: 'Muro corto. Tensión diagonal',
      urLintRot: 'Dinteles y antepechos. Rotación de elementos de soporte',
      urLintDisp: 'Dinteles y antepechos. Desplazamiento entre elementos de soporte',
      urStrongSlide: 'Muro fuerte. Desplazamiento de las juntas horizontales',
      urStrongBase: 'Muro fuerte. Rotura de la base',
      urStrongOop: 'Muro fuerte. Flexión fuera del plano',
      cfCorner: 'Paneles. Rotura y fisuración en las esquinas',
      cfDiag: 'Paneles. Tensión diagonal',
      cfSlide: 'Paneles. Desplazamiento de las juntas horizontales',
      cfDiagCorner: 'Paneles. Rotura diagonal y rotura de las esquinas',
      cfOop: 'Paneles. Efectos fuera del plano del muro',
      cfColShear: 'Columnetas. Falla por cortante en columnas',
      cfColLap: 'Columnetas. Falla de los traslapos en la base',
      cfJoint: 'Columnetas. Falla del nudo entre viga y columnas',
      rmFlex: 'Muro fuerte. Flexión dúctil',
      rmShear: 'Muro fuerte. Cortante',
      rmSeismicSlide: 'Muro fuerte. Deslizamiento por cortante sísmico',
      rmOop: 'Muro fuerte. Inestabilidad fuera del plano',
      rmLap: 'Muro fuerte. Deslizamiento de uniones traslapadas',
      rmWeakShear: 'Muro débil. Cortante',
      rmWeakPure: 'Muro débil. Cortante puro',
      rmBeamFlex: 'Viga débil. Interacción entre flexión y cortante',
      rmBeamPure: 'Viga débil. Cortante puro',
    },
    beamLabels: ['Grietas < 3 mm', 'Leve / moderado', 'Grietas > 9 mm / severo'],
  },
  en: {
    introTitle: 'Post-earthquake graphic inspection guide',
    introP: [
      'Field summary for assessing and posting buildings after an earthquake, based on the graphic inspection guide and the ATC-20-1 manual. It does not replace professional judgment or local jurisdiction orders.',
      'Rapid evaluation usually takes 10–30 minutes. Detailed evaluation takes 1–4 hours. Engineering evaluation may take days and is done by a specialist.',
    ],
    hazardTitle: 'Seismic hazard of the event',
    hazardCaption: 'Peak ground acceleration simulation map (source: INGENIAR).',
    methodsTitle: 'ATC-20 evaluation methods',
    methodsCaption: 'Flowchart for building evaluation and posting.',
    rapidTitle: 'Rapid evaluation',
    rapidB: [
      'Building inspectors, civil/structural engineers, or trained disaster workers.',
      'Quickly decide whether an apparently stable building can be occupied and which restrictions apply.',
    ],
    detailedTitle: 'Detailed evaluation',
    detailedB: [
      'Civil/structural engineers. More complete visual inspection.',
      'Use when structural doubt remains, after restricted/unsafe posting, or for essential facilities.',
    ],
    engineeringTitle: 'Engineering evaluation',
    engineeringB: [
      'Structural consultant. Stabilize or repair severely damaged buildings.',
      'Bring a geotechnical or hazardous-materials specialist if ground movement or spills are present.',
    ],
    processTitle: 'Rapid inspection process',
    processB: [
      'Walk the entire exterior.',
      'Check soil and pavement for cracks, settlement, or ground movement.',
      'Enter only if the exterior view is insufficient or interior damage is suspected. Never walk straight into an obviously damaged building.',
      'Apply collapse, leaning, ground, falling-hazard, and other-threat criteria.',
      'Complete the form, check emergency exits, and record restrictions.',
      'Post a single placard at the main entrance. Repeat at other entries for restricted or unsafe buildings (except single-family houses).',
      'Explain the posting to occupants without creating panic.',
    ],
    postingTitle: 'Safety placards',
    postingCaption: 'Building safety posting placards.',
    greenTitle: 'Inspected (green)',
    greenB: [
      'No apparent hazard. Minor repairs may still be needed.',
      'Vertical and lateral load paths remain intact. No use restriction.',
    ],
    yellowTitle: 'Restricted use (yellow)',
    yellowB: [
      'A hazard limits entry or use of some areas.',
      'Write the restrictions explicitly on the placard and on the form.',
    ],
    redTitle: 'Unsafe / collapse hazard (red or black)',
    redB: [
      'Imminent threats or severe structural damage. Do not occupy, except qualified personnel.',
      'An unsafe posting is not a demolition order.',
    ],
    postingNote:
      'Barricades: use tape or cones first, then fences. Do not place them against the facade — glass and masonry can fall. For widespread damage, restrict whole blocks.',
    irrTitle: 'Part 1 — Discontinuities and irregularities',
    irrP: ['Irregular layouts concentrate damage. Identify them in the field and record them under Structural system.'],
    irrB: [
      'Soft story or vertical discontinuity (sudden change in stiffness or walls).',
      'Irregular plan, wings, setbacks, or L / T / U shapes.',
      'Short column (a wall or parapet that shortens the clear height).',
      'Structural walls that do not continue between stories.',
    ],
    irrCap1: 'Structural systems with vertical discontinuities or irregularities.',
    irrCap2: 'Buildings with irregular plan configurations.',
    masonryTitle: 'Part 2 — Masonry',
    masonryP: ['Rate each element as slight, moderate, or severe before choosing a posting.'],
    masonryCap1: 'Failure types in unreinforced masonry buildings.',
    masonryCap2: 'Inspection points for small unreinforced masonry buildings.',
    urTitle: 'Unreinforced masonry',
    urB: [
      'Short walls: rocking, bed-joint sliding, diagonal tension.',
      'Lintels and parapets: rotation or movement between supports.',
      'Strong walls: sliding, base failure, out-of-plane bending.',
    ],
    cfTitle: 'Confined masonry',
    cfB: [
      'Panels: corner cracks, diagonal tension, sliding, out-of-plane effects.',
      'Tie-columns and beam-column joints: shear, lap failure, damaged joint.',
    ],
    rmTitle: 'Reinforced masonry',
    rmB: [
      'Strong walls: ductile flexure, shear, seismic sliding, out-of-plane instability.',
      'Weak walls and beams: shear and flexure-shear interaction.',
    ],
    woodTitle: 'Timber buildings',
    woodB: [
      'Foundation connections and diaphragm anchors.',
      'Wall, chimney, and roof separation or buckling.',
      'Damage near beam supports and loss of vertical capacity.',
    ],
    woodCaption: 'Inspection points for timber dwellings.',
    concreteTitle: 'Concrete buildings',
    concreteB: [
      'Beam-column joints, confinement, short columns, and plastic hinges.',
      'Shear walls: construction-joint cracks and end crushing.',
      'Precast: diaphragms, connectors, slabs, and panel separation.',
    ],
    concCap1: 'Inspection points for cast-in-place structural concrete walls.',
    concCap2: 'Inspection points for cast-in-place reinforced concrete frames.',
    concCap3: 'Inspection points for precast concrete floor slabs.',
    concCap4: 'Inspection points for precast reinforced concrete buildings.',
    concCap5: 'Inspection points for modular precast buildings.',
    steelTitle: 'Steel buildings',
    steelB: [
      'Elongated or buckled braces; clamps and connections.',
      'Single-story frames: columns, trusses, anchors, and masonry cladding.',
      'Missing fireproofing that hides a connection.',
    ],
    steelCap1: 'Inspection points for single-story steel frames (industrial sheds and warehouses).',
    steelCap2: 'Inspection points for steel buildings with masonry cladding.',
    elevatorTitle: 'Traction elevators',
    elevatorB: [
      'Cables off sheaves, machinery anchorage, guides off rails, jammed doors.',
      'Counterweight off guides, pounded rails, broken or bent brackets.',
      'Pit and machine-room inspection only by qualified personnel.',
    ],
    elevatorCaption: 'Inspection points for traction elevators.',
    sketchesTitle: 'Example structural evaluation sketches',
    sketchCap1: 'Sketch of cracks, ruptures, and zones with exposed reinforcement in walls.',
    sketchCap2: 'Lateral ground movement evaluation (Valley Juvenile example, 1971, San Fernando, California).',
    entryTitle: 'When to enter the building',
    entryB: [
      'Interior damage is suspected or visible from outside.',
      'The exterior view is not enough.',
      'You need to speak with the manager or occupants of a large building.',
      'Do not enter without owner permission unless the jurisdiction orders it.',
      'If in doubt, wait for a detailed evaluation.',
    ],
    rows: {
      urRock: 'Short wall. Rocking',
      urSlide: 'Short wall. Bed-joint sliding',
      urDiag: 'Short wall. Diagonal tension',
      urLintRot: 'Lintels and parapets. Rotation of supporting elements',
      urLintDisp: 'Lintels and parapets. Displacement between supports',
      urStrongSlide: 'Strong wall. Bed-joint sliding',
      urStrongBase: 'Strong wall. Base failure',
      urStrongOop: 'Strong wall. Out-of-plane bending',
      cfCorner: 'Panels. Corner cracking and crushing',
      cfDiag: 'Panels. Diagonal tension',
      cfSlide: 'Panels. Bed-joint sliding',
      cfDiagCorner: 'Panels. Diagonal failure and corner crushing',
      cfOop: 'Panels. Out-of-plane wall effects',
      cfColShear: 'Tie-columns. Column shear failure',
      cfColLap: 'Tie-columns. Base lap-splice failure',
      cfJoint: 'Tie-columns. Beam-column joint failure',
      rmFlex: 'Strong wall. Ductile flexure',
      rmShear: 'Strong wall. Shear',
      rmSeismicSlide: 'Strong wall. Seismic shear sliding',
      rmOop: 'Strong wall. Out-of-plane instability',
      rmLap: 'Strong wall. Lap-splice sliding',
      rmWeakShear: 'Weak wall. Shear',
      rmWeakPure: 'Weak wall. Pure shear',
      rmBeamFlex: 'Weak beam. Flexure-shear interaction',
      rmBeamPure: 'Weak beam. Pure shear',
    },
    beamLabels: ['Cracks < 3 mm', 'Slight / moderate', 'Cracks > 9 mm / severe'],
  },
} as const;

function row(title: string, keys: number[], labels: readonly string[]): GuideFigureRow {
  return { title, labels: [...labels], keys };
}

export function guideBlocks(language: Language): GuideBlock[] {
  const t = copy[language];
  const damage = lms[language];
  return [
    { id: 'intro', title: t.introTitle, paragraphs: [...t.introP] },
    {
      id: 'hazard',
      title: t.hazardTitle,
      figures: [{ key: 1, caption: t.hazardCaption }],
    },
    {
      id: 'methods',
      title: t.methodsTitle,
      figures: [{ key: 2, caption: t.methodsCaption }],
      groups: [
        { title: t.rapidTitle, bullets: [...t.rapidB] },
        { title: t.detailedTitle, bullets: [...t.detailedB] },
        { title: t.engineeringTitle, bullets: [...t.engineeringB] },
      ],
    },
    { id: 'process', title: t.processTitle, bullets: [...t.processB] },
    {
      id: 'posting',
      title: t.postingTitle,
      figures: [{ key: 3, caption: t.postingCaption }],
      groups: [
        { title: t.greenTitle, bullets: [...t.greenB] },
        { title: t.yellowTitle, bullets: [...t.yellowB] },
        { title: t.redTitle, bullets: [...t.redB] },
      ],
      paragraphs: [t.postingNote],
    },
    {
      id: 'irregularities',
      title: t.irrTitle,
      paragraphs: [...t.irrP],
      bullets: [...t.irrB],
      figures: [
        { key: 4, caption: t.irrCap1 },
        { key: 5, caption: t.irrCap2 },
      ],
    },
    {
      id: 'masonry',
      title: t.masonryTitle,
      paragraphs: [...t.masonryP],
      figures: [
        { key: 6, caption: t.masonryCap1 },
        { key: 7, caption: t.masonryCap2 },
      ],
      groups: [
        {
          title: t.urTitle,
          bullets: [...t.urB],
          figureRows: [
            row(t.rows.urRock, [8, 9, 10], damage),
            row(t.rows.urSlide, [11, 12, 13], damage),
            row(t.rows.urDiag, [14, 15, 16], damage),
            row(t.rows.urLintRot, [17, 18, 19], damage),
            row(t.rows.urLintDisp, [20, 21, 22], damage),
            row(t.rows.urStrongSlide, [23, 24, 25], damage),
            row(t.rows.urStrongBase, [26, 27, 28], damage),
            row(t.rows.urStrongOop, [29, 30, 31], damage),
          ],
        },
        {
          title: t.cfTitle,
          bullets: [...t.cfB],
          figureRows: [
            row(t.rows.cfCorner, [32, 33, 34], damage),
            row(t.rows.cfDiag, [35, 36, 37], damage),
            row(t.rows.cfSlide, [38, 39, 40], damage),
            row(t.rows.cfDiagCorner, [41, 42, 43], damage),
            row(t.rows.cfOop, [44, 45, 46], damage),
            row(t.rows.cfColShear, [47, 48, 49], damage),
            row(t.rows.cfColLap, [50, 51, 52], damage),
            row(t.rows.cfJoint, [53, 54, 55], damage),
          ],
        },
        {
          title: t.rmTitle,
          bullets: [...t.rmB],
          figureRows: [
            row(t.rows.rmFlex, [56, 57, 58], damage),
            row(t.rows.rmShear, [59, 60, 61], damage),
            row(t.rows.rmSeismicSlide, [62, 63, 64], damage),
            row(t.rows.rmOop, [65, 66, 67], damage),
            row(t.rows.rmLap, [68, 69, 70], damage),
            row(t.rows.rmWeakShear, [71, 72, 73], damage),
            row(t.rows.rmWeakPure, [74, 75, 76], damage),
            row(t.rows.rmBeamFlex, [77, 78, 79], t.beamLabels),
            row(t.rows.rmBeamPure, [80, 81, 82], damage),
          ],
        },
      ],
    },
    {
      id: 'wood',
      title: t.woodTitle,
      bullets: [...t.woodB],
      figures: [{ key: 83, caption: t.woodCaption }],
    },
    {
      id: 'concrete',
      title: t.concreteTitle,
      bullets: [...t.concreteB],
      figures: [
        { key: 84, caption: t.concCap1 },
        { key: 85, caption: t.concCap2 },
        { key: 86, caption: t.concCap3 },
        { key: 87, caption: t.concCap4 },
        { key: 88, caption: t.concCap5 },
      ],
    },
    {
      id: 'steel',
      title: t.steelTitle,
      bullets: [...t.steelB],
      figures: [
        { key: 89, caption: t.steelCap1 },
        { key: 90, caption: t.steelCap2 },
      ],
    },
    {
      id: 'elevators',
      title: t.elevatorTitle,
      bullets: [...t.elevatorB],
      figures: [{ key: 91, caption: t.elevatorCaption }],
    },
    {
      id: 'sketches',
      title: t.sketchesTitle,
      figures: [
        { key: 92, caption: t.sketchCap1 },
        { key: 93, caption: t.sketchCap2 },
      ],
    },
    { id: 'entry', title: t.entryTitle, bullets: [...t.entryB] },
  ];
}

export function guideFigureKeys(blocks: GuideBlock[]): number[] {
  const keys: number[] = [];
  const push = (items?: GuideFigure[]) => items?.forEach((item) => keys.push(item.key));
  const pushRows = (rows?: GuideFigureRow[]) => rows?.forEach((row) => keys.push(...row.keys));
  for (const block of blocks) {
    push(block.figures);
    pushRows(block.figureRows);
    for (const group of block.groups ?? []) {
      push(group.figures);
      pushRows(group.figureRows);
    }
  }
  return keys;
}

export const inspectionPointHints = {
  es: {
    masonry_unreinforced:
      'Revisar muros cortos y fuertes, dinteles, tensión diagonal, deslizamiento de juntas y flexión fuera de plano.',
    masonry_confined:
      'Revisar paneles, columnetas, nudos viga-columna, fisuras en esquinas y efectos fuera de plano.',
    masonry_reinforced:
      'Revisar flexión dúctil, cortante, deslizamiento sísmico e inestabilidad fuera de plano.',
    wood: 'Revisar anclajes a cimentación, diafragma, chimeneas y daño junto a apoyos de vigas.',
    concrete_frames:
      'Revisar nudos, confinamiento, columnas cortas, rótulas plásticas y grietas cerca de apoyos.',
    concrete_walls: 'Revisar juntas de construcción, aplastamiento en extremos y grietas de corte.',
    precast: 'Revisar conectores, diafragmas, losas prefabricadas y separación de paneles.',
    steel: 'Revisar arriostramientos, pandeo, uniones, naves de un nivel y cerramientos de mampostería.',
    vernacular: 'Revisar muros de bahareque, tapia o adobe: grietas, desplomes y desprendimientos fuera de plano.',
    mixed: 'Indicar el sistema predominante y los puntos de inspección de cada material en comentarios.',
  },
  en: {
    masonry_unreinforced:
      'Check short and strong walls, lintels, diagonal tension, bed-joint sliding, and out-of-plane bending.',
    masonry_confined:
      'Check panels, tie-columns, beam-column joints, corner cracks, and out-of-plane effects.',
    masonry_reinforced:
      'Check ductile flexure, shear, seismic sliding, and out-of-plane instability.',
    wood: 'Check foundation anchors, diaphragm, chimneys, and damage near beam supports.',
    concrete_frames:
      'Check joints, confinement, short columns, plastic hinges, and cracks near supports.',
    concrete_walls: 'Check construction joints, end crushing, and shear cracks.',
    precast: 'Check connectors, diaphragms, precast slabs, and panel separation.',
    steel: 'Check braces, buckling, connections, single-story frames, and masonry cladding.',
    vernacular: 'Check bahareque, rammed-earth, or adobe walls for cracks, lean, and out-of-plane loss.',
    mixed: 'Note the predominant system and inspection points for each material in comments.',
  },
} as const;
