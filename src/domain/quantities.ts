import type { Dictionary } from '@/i18n/translations';

import type { Evaluation } from './evaluation';
import type {
  FrameMaterial,
  FrameRepair,
  QuantityDamageLevel,
  RoofRepair,
  RoofStructureType,
  WallRepair,
  WallType,
} from './catalog';

function newQuantityId() {
  return `qty-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export interface QuantityWall {
  id: string;
  location: string;
  length: string;
  height: string;
  thickness: string;
  wallType: WallType | '';
  wallTypeOther: string;
  damage: QuantityDamageLevel | '';
  repairs: WallRepair[];
  recommendedWallType: WallType | '';
  recommendedWallTypeOther: string;
}

export interface QuantityRoof {
  id: string;
  location: string;
  length: string;
  width: string;
  structureType: RoofStructureType | '';
  structureTypeOther: string;
  covering: string;
  damage: QuantityDamageLevel | '';
  repairs: RoofRepair[];
  typologyChange: string;
}

export interface QuantityMember {
  id: string;
  location: string;
  width: string;
  depth: string;
  length: string;
  material: FrameMaterial | '';
  materialOther: string;
  damage: QuantityDamageLevel | '';
  repairs: FrameRepair[];
  typologyChange: string;
  otherRepair: string;
}

export interface RepairQuantities {
  walls: QuantityWall[];
  roofs: QuantityRoof[];
  beams: QuantityMember[];
  columns: QuantityMember[];
}

export function emptyRepairQuantities(): RepairQuantities {
  return { walls: [], roofs: [], beams: [], columns: [] };
}

export function normalizeRepairQuantities(raw?: RepairQuantities): RepairQuantities {
  return {
    walls: (raw?.walls ?? []).map((wall) => ({ ...wall, location: wall.location ?? '' })),
    roofs: (raw?.roofs ?? []).map((roof) => ({ ...roof, location: roof.location ?? '' })),
    beams: (raw?.beams ?? []).map((beam) => ({ ...beam, location: beam.location ?? '' })),
    columns: (raw?.columns ?? []).map((column) => ({ ...column, location: column.location ?? '' })),
  };
}

export function createQuantityWall(): QuantityWall {
  return {
    id: newQuantityId(),
    location: '',
    length: '',
    height: '',
    thickness: '',
    wallType: '',
    wallTypeOther: '',
    damage: '',
    repairs: [],
    recommendedWallType: '',
    recommendedWallTypeOther: '',
  };
}

export function createQuantityRoof(): QuantityRoof {
  return {
    id: newQuantityId(),
    location: '',
    length: '',
    width: '',
    structureType: '',
    structureTypeOther: '',
    covering: '',
    damage: '',
    repairs: [],
    typologyChange: '',
  };
}

export function createQuantityMember(): QuantityMember {
  return {
    id: newQuantityId(),
    location: '',
    width: '',
    depth: '',
    length: '',
    material: '',
    materialOther: '',
    damage: '',
    repairs: [],
    typologyChange: '',
    otherRepair: '',
  };
}

export function parseMeasure(text: string): number {
  const normalized = text.trim().replace(/\s/g, '').replace(',', '.');
  if (!normalized) return 0;
  const value = Number(normalized);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

export function formatMeasure(value: number): string {
  return value.toFixed(2);
}

export function wallArea(wall: QuantityWall): number {
  return parseMeasure(wall.length) * parseMeasure(wall.height);
}

export function roofArea(roof: QuantityRoof): number {
  return parseMeasure(roof.length) * parseMeasure(roof.width);
}

export function memberVolume(member: QuantityMember): number {
  return parseMeasure(member.width) * parseMeasure(member.depth) * parseMeasure(member.length);
}

export function totalWallArea(walls: QuantityWall[]): number {
  return walls.reduce((sum, wall) => sum + wallArea(wall), 0);
}

export function totalRoofArea(roofs: QuantityRoof[]): number {
  return roofs.reduce((sum, roof) => sum + roofArea(roof), 0);
}

export function totalMemberLength(members: QuantityMember[]): number {
  return members.reduce((sum, member) => sum + parseMeasure(member.length), 0);
}

export function totalMemberVolume(members: QuantityMember[]): number {
  return members.reduce((sum, member) => sum + memberVolume(member), 0);
}

export function hasRepairQuantities(quantities: RepairQuantities | undefined): boolean {
  if (!quantities) return false;
  return (
    quantities.walls.length +
      quantities.roofs.length +
      quantities.beams.length +
      quantities.columns.length >
    0
  );
}

function catalogLabel(record: Record<string, string> | undefined, value: string) {
  if (!value) return '';
  return record?.[value] || value;
}

function joinRepairs(labels: Record<string, string>, values: string[]) {
  return values.map((value) => labels[value] || value).join('; ');
}

export function quantityCsvHeader(t: Dictionary): string[] {
  return [
    t.fields.quantityCategory,
    t.fields.quantityLocation,
    t.fields.quantityLength,
    t.fields.quantityHeight,
    t.fields.quantityWidth,
    t.fields.quantityThickness,
    t.fields.quantityDepth,
    t.fields.quantityType,
    t.fields.quantityOther,
    t.fields.quantityRoofCovering,
    t.fields.quantityMaterial,
    t.fields.quantityDamage,
    t.fields.quantityRepair,
    t.fields.quantityRecommendedType,
    t.fields.quantityTypologyChange,
    t.fields.quantityArea,
    t.fields.quantityVolume,
    'id',
    t.address,
    t.officialPending,
  ];
}

export function quantityCsvRows(evaluation: Evaluation, t: Dictionary): string[][] {
  const quantities = evaluation.repairQuantities;
  const header = quantityCsvHeader(t);
  const meta = [
    evaluation.id,
    evaluation.building.address,
    evaluation.officialNumber == null ? '' : String(evaluation.officialNumber),
  ];
  const rows: string[][] = [header];

  for (const wall of quantities.walls) {
    const typeLabel =
      wall.wallType === 'other' && wall.wallTypeOther
        ? wall.wallTypeOther
        : catalogLabel(t.catalogs.wallTypes, wall.wallType);
    const recommended =
      wall.recommendedWallType === 'other' && wall.recommendedWallTypeOther
        ? wall.recommendedWallTypeOther
        : catalogLabel(t.catalogs.wallTypes, wall.recommendedWallType);
    rows.push([
      t.quantityWalls,
      wall.location,
      wall.length,
      wall.height,
      '',
      wall.thickness,
      '',
      typeLabel,
      wall.wallTypeOther,
      '',
      '',
      catalogLabel(t.catalogs.quantityDamage, wall.damage),
      joinRepairs(t.catalogs.wallRepairs, wall.repairs),
      recommended,
      '',
      formatMeasure(wallArea(wall)),
      '',
      ...meta,
    ]);
  }

  for (const roof of quantities.roofs) {
    const typeLabel =
      roof.structureType === 'other' && roof.structureTypeOther
        ? roof.structureTypeOther
        : catalogLabel(t.catalogs.roofStructureTypes, roof.structureType);
    rows.push([
      t.quantityRoofs,
      roof.location,
      roof.length,
      '',
      roof.width,
      '',
      '',
      typeLabel,
      roof.structureTypeOther,
      roof.covering,
      '',
      catalogLabel(t.catalogs.quantityDamage, roof.damage),
      joinRepairs(t.catalogs.roofRepairs, roof.repairs),
      '',
      roof.typologyChange,
      formatMeasure(roofArea(roof)),
      '',
      ...meta,
    ]);
  }

  const pushMember = (category: string, member: QuantityMember) => {
    const material =
      member.material === 'other' && member.materialOther
        ? member.materialOther
        : catalogLabel(t.catalogs.frameMaterials, member.material);
    rows.push([
      category,
      member.location,
      member.length,
      '',
      member.width,
      '',
      member.depth,
      material,
      member.materialOther,
      '',
      material,
      catalogLabel(t.catalogs.quantityDamage, member.damage),
      joinRepairs(t.catalogs.frameRepairs, member.repairs),
      '',
      member.typologyChange || member.otherRepair,
      '',
      formatMeasure(memberVolume(member)),
      ...meta,
    ]);
  };

  for (const beam of quantities.beams) pushMember(t.quantityBeams, beam);
  for (const column of quantities.columns) pushMember(t.quantityColumns, column);

  return rows;
}
