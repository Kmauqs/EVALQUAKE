import type { Language } from '../domain/evaluation';

export interface GuideBlock {
  id: string;
  title: string;
  paragraphs?: string[];
  bullets?: string[];
  groups?: { title: string; bullets: string[] }[];
}

const es: GuideBlock[] = [
  {
    id: 'intro',
    title: 'Guía gráfica de inspección postsismo',
    paragraphs: [
      'Resumen operativo para evaluar y marcar edificaciones después de un sismo, basado en la guía gráfica de inspección y en el manual ATC-20-1. No reemplaza el criterio profesional ni la orden de la jurisdicción local.',
      'La evaluación rápida suele durar 10 a 30 minutos. La detallada, 1 a 4 horas. La evaluación ingenieril puede tomar días y la realiza un especialista.',
    ],
  },
  {
    id: 'methods',
    title: 'Métodos de evaluación (ATC-20)',
    groups: [
      {
        title: 'Evaluación rápida',
        bullets: [
          'Inspectores de edificaciones, ingenieros civiles/estructurales o personal entrenado.',
          'Determinar con rapidez si la estructura aparentemente estable es ocupable y qué restricciones aplicar.',
        ],
      },
      {
        title: 'Evaluación detallada',
        bullets: [
          'Ingenieros civiles/estructurales. Inspección visual más completa.',
          'Usar cuando hay duda estructural, uso restringido o inseguro, o en instalaciones esenciales.',
        ],
      },
      {
        title: 'Evaluación ingenieril',
        bullets: [
          'Consultor estructural. Estabilizar o reparar estructuras gravemente afectadas.',
          'Requiere geotecnista o especialista en materiales peligrosos si hay movimiento de tierras o derrames.',
        ],
      },
    ],
  },
  {
    id: 'process',
    title: 'Proceso de inspección rápida',
    bullets: [
      'Examinar todo el exterior de la edificación.',
      'Revisar suelo y pavimento: fisuras, asentamientos o movimiento de tierra.',
      'Entrar solo si no se ve suficiente desde afuera o hay sospecha de daño interior. Nunca entrar de frente a una estructura obviamente afectada.',
      'Aplicar los criterios de colapso, desplome, suelo, caída de elementos y otras amenazas.',
      'Completar el formulario, verificar salidas de emergencia y señalar restricciones.',
      'Colocar una sola pancarta visible en la entrada principal. Si es uso restringido o inseguro, repetir en las demás entradas (excepto vivienda unifamiliar).',
      'Explicar a ocupantes el significado de la pancarta, sin generar pánico.',
    ],
  },
  {
    id: 'posting',
    title: 'Pancartas de marcación',
    groups: [
      {
        title: 'Inspeccionado (verde)',
        bullets: [
          'No hay peligro aparente. Pueden requerirse reparaciones leves.',
          'El sistema de cargas vertical y lateral está intacto. Sin restricción de uso.',
        ],
      },
      {
        title: 'Uso restringido (amarillo)',
        bullets: [
          'Hay una amenaza que obliga a limitar el ingreso o el uso de zonas.',
          'Las restricciones deben escribirse de forma explícita en la pancarta y en el formulario.',
        ],
      },
      {
        title: 'Inseguro / peligro de colapso (rojo o negro)',
        bullets: [
          'Amenazas inminentes o daño estructural severo. No ocupar ni ingresar, salvo personal calificado.',
          'Marcar inseguro no es una orden de demolición.',
        ],
      },
    ],
    paragraphs: [
      'Barricadas: usar cinta o conos de forma temporal; luego vallas. No colocarlas pegadas a la fachada: vidrios y bloques pueden caer. En daños generalizados, restringir manzanas completas.',
    ],
  },
  {
    id: 'irregularities',
    title: 'Parte 1 — Discontinuidades e irregularidades',
    paragraphs: [
      'Las configuraciones irregulares concentran daño. Identificarlas en campo y anotarlas en Sistema estructural.',
    ],
    bullets: [
      'Piso blando o discontinuidad vertical (cambio brusco de rigidez o de muros).',
      'Planta irregular, alas, retranqueos o geometría en L / T / U.',
      'Columna corta (muro o antepecho que restringe la luz libre).',
      'Muros estructurales discontinuos entre pisos.',
    ],
  },
  {
    id: 'points',
    title: 'Parte 2 — Puntos de inspección según el sistema',
    groups: [
      {
        title: 'Mampostería no reforzada',
        bullets: [
          'Muros cortos: rotación, deslizamiento de juntas, tensión diagonal.',
          'Dinteles y antepechos: rotación o desplazamiento entre apoyos.',
          'Muros fuertes: deslizamiento, rotura de base, flexión fuera de plano.',
          'Grietas de corte en X, desplome y desprendimiento de paños.',
        ],
      },
      {
        title: 'Mampostería confinada o reforzada',
        bullets: [
          'Paneles: fisuras en esquinas, tensión diagonal, deslizamiento, efectos fuera de plano.',
          'Columnetas y nudos viga-columna: aplastamiento, falla de traslapos, nudo dañado.',
          'Muros reforzados: flexión dúctil, cortante, deslizamiento sísmico, inestabilidad fuera de plano.',
        ],
      },
      {
        title: 'Madera',
        bullets: [
          'Conexiones a cimentación y anclajes del diafragma.',
          'Pandeo o separación de muros, chimeneas y cubiertas.',
          'Daño cerca de apoyos de vigas y pérdida de capacidad vertical.',
        ],
      },
      {
        title: 'Concreto (pórticos, muros, prefabricado)',
        bullets: [
          'Nudos viga-columna, confinamiento, columnas cortas y rótulas plásticas.',
          'Muros de corte: grietas en juntas de construcción y aplastamiento en extremos.',
          'Prefabricado: diafragmas, conectores, losas y separación de paneles.',
          'Bosquejar grietas, rupturas y zonas con refuerzo expuesto.',
        ],
      },
      {
        title: 'Acero',
        bullets: [
          'Arriostramientos elongados o pandeados; abrazaderas y uniones.',
          'Naves de un nivel: columnas, cerchas, anclajes y cerramientos de mampostería.',
          'Revestimiento contra fuego desprendido que impida ver la conexión.',
        ],
      },
      {
        title: 'Ascensores a tracción',
        bullets: [
          'Cables fuera de poleas, anclaje de maquinaria, guía fuera de rieles, puertas atascadas.',
          'Contrapeso fuera de carriles, rieles golpeados, abrazaderas rotas o dobladas.',
          'La fosa y la sala de máquinas solo las revisa personal calificado.',
        ],
      },
    ],
  },
  {
    id: 'entry',
    title: 'Cuándo entrar a la edificación',
    bullets: [
      'Hay sospecha de daño interior o este es visible desde afuera.',
      'Desde el exterior no se ve suficientemente el interior.',
      'Hay que hablar con el administrador u ocupantes de un edificio grande.',
      'No entrar sin autorización del propietario, salvo orden de la jurisdicción.',
      'Si hay duda, esperar una evaluación detallada.',
    ],
  },
];

const en: GuideBlock[] = [
  {
    id: 'intro',
    title: 'Post-earthquake graphic inspection guide',
    paragraphs: [
      'Field summary for assessing and posting buildings after an earthquake, based on the graphic inspection guide and the ATC-20-1 manual. It does not replace professional judgment or local jurisdiction orders.',
      'Rapid evaluation usually takes 10–30 minutes. Detailed evaluation takes 1–4 hours. Engineering evaluation may take days and is done by a specialist.',
    ],
  },
  {
    id: 'methods',
    title: 'ATC-20 evaluation methods',
    groups: [
      {
        title: 'Rapid evaluation',
        bullets: [
          'Building inspectors, civil/structural engineers, or trained disaster workers.',
          'Quickly decide whether an apparently stable building can be occupied and which restrictions apply.',
        ],
      },
      {
        title: 'Detailed evaluation',
        bullets: [
          'Civil/structural engineers. More complete visual inspection.',
          'Use when structural doubt remains, after restricted/unsafe posting, or for essential facilities.',
        ],
      },
      {
        title: 'Engineering evaluation',
        bullets: [
          'Structural consultant. Stabilize or repair severely damaged buildings.',
          'Bring a geotechnical or hazardous-materials specialist if ground movement or spills are present.',
        ],
      },
    ],
  },
  {
    id: 'process',
    title: 'Rapid inspection process',
    bullets: [
      'Walk the entire exterior.',
      'Check soil and pavement for cracks, settlement, or ground movement.',
      'Enter only if the exterior view is insufficient or interior damage is suspected. Never walk straight into an obviously damaged building.',
      'Apply collapse, leaning, ground, falling-hazard, and other-threat criteria.',
      'Complete the form, check emergency exits, and record restrictions.',
      'Post a single placard at the main entrance. Repeat at other entries for restricted or unsafe buildings (except single-family houses).',
      'Explain the posting to occupants without creating panic.',
    ],
  },
  {
    id: 'posting',
    title: 'Safety placards',
    groups: [
      {
        title: 'Inspected (green)',
        bullets: [
          'No apparent hazard. Minor repairs may still be needed.',
          'Vertical and lateral load paths remain intact. No use restriction.',
        ],
      },
      {
        title: 'Restricted use (yellow)',
        bullets: [
          'A hazard limits entry or use of some areas.',
          'Write the restrictions explicitly on the placard and on the form.',
        ],
      },
      {
        title: 'Unsafe / collapse hazard (red or black)',
        bullets: [
          'Imminent threats or severe structural damage. Do not occupy, except qualified personnel.',
          'An unsafe posting is not a demolition order.',
        ],
      },
    ],
    paragraphs: [
      'Barricades: use tape or cones first, then fences. Do not place them against the facade — glass and masonry can fall. For widespread damage, restrict whole blocks.',
    ],
  },
  {
    id: 'irregularities',
    title: 'Part 1 — Discontinuities and irregularities',
    paragraphs: [
      'Irregular layouts concentrate damage. Identify them in the field and record them under Structural system.',
    ],
    bullets: [
      'Soft story or vertical discontinuity (sudden change in stiffness or walls).',
      'Irregular plan, wings, setbacks, or L / T / U shapes.',
      'Short column (a wall or parapet that shortens the clear height).',
      'Structural walls that do not continue between stories.',
    ],
  },
  {
    id: 'points',
    title: 'Part 2 — Inspection points by structural system',
    groups: [
      {
        title: 'Unreinforced masonry',
        bullets: [
          'Short walls: rocking, bed-joint sliding, diagonal tension.',
          'Lintels and parapets: rotation or movement between supports.',
          'Strong walls: sliding, base failure, out-of-plane bending.',
          'X-shaped shear cracks, lean, and fallen wythes.',
        ],
      },
      {
        title: 'Confined or reinforced masonry',
        bullets: [
          'Panels: corner cracks, diagonal tension, sliding, out-of-plane effects.',
          'Tie-columns and beam-column joints: crushing, lap failure, damaged joint.',
          'Reinforced walls: ductile flexure, shear, seismic sliding, out-of-plane instability.',
        ],
      },
      {
        title: 'Timber',
        bullets: [
          'Foundation connections and diaphragm anchors.',
          'Wall, chimney, and roof separation or buckling.',
          'Damage near beam supports and loss of vertical capacity.',
        ],
      },
      {
        title: 'Concrete (frames, walls, precast)',
        bullets: [
          'Beam-column joints, confinement, short columns, and plastic hinges.',
          'Shear walls: construction-joint cracks and end crushing.',
          'Precast: diaphragms, connectors, slabs, and panel separation.',
          'Sketch cracks, ruptures, and exposed reinforcement.',
        ],
      },
      {
        title: 'Steel',
        bullets: [
          'Elongated or buckled braces; clamps and connections.',
          'Single-story frames: columns, trusses, anchors, and masonry cladding.',
          'Missing fireproofing that hides a connection.',
        ],
      },
      {
        title: 'Traction elevators',
        bullets: [
          'Cables off sheaves, machinery anchorage, guides off rails, jammed doors.',
          'Counterweight off guides, pounded rails, broken or bent brackets.',
          'Pit and machine-room inspection only by qualified personnel.',
        ],
      },
    ],
  },
  {
    id: 'entry',
    title: 'When to enter the building',
    bullets: [
      'Interior damage is suspected or visible from outside.',
      'The exterior view is not enough.',
      'You need to speak with the manager or occupants of a large building.',
      'Do not enter without owner permission unless the jurisdiction orders it.',
      'If in doubt, wait for a detailed evaluation.',
    ],
  },
];

export function guideBlocks(language: Language): GuideBlock[] {
  return language === 'en' ? en : es;
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
