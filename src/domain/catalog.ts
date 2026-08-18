import type { Habitability, RiskLevel } from './evaluation';

export const INSPECTION_TYPES = [
  'exterior_only',
  'partial',
  'complete',
  'interior_affected',
] as const;
export type InspectionType = (typeof INSPECTION_TYPES)[number];

export const NSR_GROUPS = ['group_i', 'group_ii', 'group_iii', 'group_iv'] as const;
export type NsrGroup = (typeof NSR_GROUPS)[number];

export const STRUCTURAL_SYSTEMS = [
  's11',
  's12',
  's13',
  's14',
  's21',
  's22',
  's23',
  's31',
  's32',
  's33',
  's41',
  's42',
  's51',
  's52',
  's60',
] as const;
export type StructuralSystemCode = (typeof STRUCTURAL_SYSTEMS)[number];

export const FLOOR_TYPES = ['concrete', 'steel', 'wood', 'mixed'] as const;
export type FloorType = (typeof FLOOR_TYPES)[number];

export const FLOOR_SUBTYPES: Record<FloorType, readonly string[]> = {
  concrete: ['solid_slab', 'lightweight_slab', 'waffle_slab'],
  steel: ['beams_with_connectors', 'beams_without_connectors', 'trusses', 'composite_deck'],
  wood: ['joists', 'trusses'],
  mixed: ['other'],
};

export const ROOF_GEOMETRIES = [
  'flat',
  'single_pitch',
  'gable',
  'hip',
  'sawtooth',
  'other',
] as const;
export const ROOF_STRUCTURES = ['concrete_slab', 'steel_frame', 'other'] as const;

export const CONSTRUCTION_PERIODS = [
  'before_1984',
  '1984_1998',
  '1998_2010',
  'from_2010',
  'unknown',
] as const;
export type ConstructionPeriod = (typeof CONSTRUCTION_PERIODS)[number];

export const GLOBAL_CONDITIONS = [
  'total_or_partial_collapse',
  'building_or_story_lean',
  'building_settlement',
  'shear_cracking_walls',
  'falling_hazards_height',
  'surrounding_ground_movement',
] as const;
export type GlobalConditionId = (typeof GLOBAL_CONDITIONS)[number];

export const STRUCTURAL_IRREGULARITIES = [
  'soft_story',
  'plan_irregular',
  'short_column',
  'setback',
  'discontinuous_wall',
] as const;

export const TYPICAL_RESTRICTIONS = [
  'short_entry_belongings',
  'repair_only',
  'no_public',
  'no_specified_areas',
  'no_specified_exits',
  'no_chimney',
] as const;

export const FURTHER_ACTIONS = [
  'barricade',
  'shore',
  'detailed_eval',
  'engineering_eval',
  'geotech_visit',
  'hazmat',
] as const;

export const UTILITY_CUTOFFS = ['gas', 'electric', 'water'] as const;

export const INSPECTION_POINT_GROUPS: Record<string, string> = {
  s11: 'concrete_frames',
  s12: 'concrete_walls',
  s13: 'concrete_frames',
  s14: 'precast',
  s21: 'masonry_confined',
  s22: 'masonry_reinforced',
  s23: 'masonry_unreinforced',
  s31: 'steel',
  s32: 'steel',
  s33: 'steel',
  s41: 'wood',
  s42: 'wood',
  s51: 'vernacular',
  s52: 'vernacular',
  s60: 'mixed',
};


export const SITE_MORPHOLOGIES = [
  'divide',
  'crest',
  'hillside',
  'toe',
  'valley',
  'river_edge',
  'slope_cut',
] as const;

export const SETTLEMENT_LEVELS = ['none', 'punctual', 'general', 'uncertain'] as const;
export const SLOPE_FAILURE_LEVELS = ['none', 'punctual', 'general', 'evident'] as const;
export const PHENOMENON_ORIGINS = ['seismic', 'aggravated', 'preexisting', 'uncertain'] as const;

export const STRUCTURAL_ELEMENTS = [
  'columns',
  'beams',
  'structural_walls',
  'floors',
  'joints',
  'prefab_connections',
  'roof_structure',
  'foundations',
] as const;

export const NON_STRUCTURAL_ELEMENTS = [
  'partitions',
  'facades_parapets',
  'cladding_glass',
  'ceilings_lights',
  'roof_covering',
  'stairs_exits',
  'elevated_tanks',
  'gas_installations',
  'electrical_installations',
  'hazardous_spill',
  'elevators',
] as const;

export const GLOBAL_DAMAGE_RANGES = ['0-10', '11-30', '31-60', '61-100'] as const;

export const EQUIPMENT_DAMAGE_LEVELS = ['none', 'moderate', 'severe'] as const;
export type EquipmentDamageLevel = (typeof EQUIPMENT_DAMAGE_LEVELS)[number];

export const GENERAL_EQUIPMENT_ITEMS = [
  'main_heaters',
  'chillers',
  'auxiliary_generators',
  'fuel_tanks',
  'battery_storage',
  'fire_pumps',
  'water_reserves',
  'communication_equipment',
  'main_transformers',
  'main_electrical_panels',
  'traction_elevators',
] as const;

export const HOSPITAL_EQUIPMENT_ITEMS = [
  'radiation_equipment',
  'toxic_chemical_storage',
  'liquid_oxygen_tanks',
] as const;

export const SPECIAL_NSR_GROUPS: readonly NsrGroup[] = ['group_ii', 'group_iii', 'group_iv'];

export const BASE_SECTION_KEYS = [
  'cadastral',
  'inspection',
  'building',
  'structure',
  'globalStability',
  'geotechnical',
  'structuralDamage',
  'nonStructural',
  'habitability',
  'preExisting',
  'recommendations',
  'occupants',
  'occupancy',
  'contact',
  'inspectors',
  'media',
] as const;

export type EvaluationSectionKey = (typeof BASE_SECTION_KEYS)[number] | 'equipment';

export function needsEquipmentReview(inspectionType: string, nsrGroup: string) {
  return inspectionType === 'complete' && SPECIAL_NSR_GROUPS.includes(nsrGroup as NsrGroup);
}

export function evaluationSectionKeys(
  inspectionType: string,
  nsrGroup: string,
): EvaluationSectionKey[] {
  const keys: EvaluationSectionKey[] = [...BASE_SECTION_KEYS];
  if (needsEquipmentReview(inspectionType, nsrGroup)) {
    keys.splice(keys.indexOf('media'), 0, 'equipment');
  }
  return keys;
}

export function deriveHabitability(ratings: RiskLevel[]): Habitability | null {
  if (ratings.length < 4 || ratings.some((value) => value === 'none')) return null;
  const severe = ratings.filter((value) => value === 'severe').length;
  const high = ratings.filter((value) => value === 'high').length;
  if (severe >= 1 || high >= 2) return 'collapsed';
  if (high >= 1) return 'unsafe';
  if (ratings.some((value) => value === 'moderate')) return 'restricted';
  if (ratings.every((value) => value === 'low')) return 'habitable';
  return null;
}

export function habitabilityPanelColor(value: Habitability) {
  return {
    habitable: '#2D7A45',
    restricted: '#D69E00',
    unsafe: '#C43D32',
    collapsed: '#242824',
  }[value];
}

export function migrateInspectionType(value: string | undefined) {
  if (value === 'rapid') return 'exterior_only';
  if (value === 'detailed') return 'complete';
  if ((INSPECTION_TYPES as readonly string[]).includes(value ?? '')) return value as InspectionType;
  return '';
}
