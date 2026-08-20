import { Download, Plus, Trash2 } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  FRAME_MATERIALS,
  FRAME_REPAIRS,
  QUANTITY_DAMAGE_LEVELS,
  ROOF_REPAIRS,
  ROOF_STRUCTURE_TYPES,
  WALL_REPAIRS,
  WALL_TYPES,
} from '@/domain/catalog';
import type { Evaluation } from '@/domain/evaluation';
import {
  createQuantityMember,
  createQuantityRoof,
  createQuantityWall,
  formatMeasure,
  memberVolume,
  roofArea,
  totalMemberLength,
  totalMemberVolume,
  totalRoofArea,
  totalWallArea,
  wallArea,
  type QuantityMember,
  type QuantityRoof,
  type QuantityWall,
  type RepairQuantities,
} from '@/domain/quantities';
import { useI18n } from '@/i18n/I18nProvider';
import { colors } from '@/theme';
import { Button, Field, SelectRow } from './ui';

interface Props {
  evaluation: Evaluation;
  onChange: (evaluation: Evaluation) => void;
  onExport: () => void;
}

export function QuantitySurvey({ evaluation, onChange, onExport }: Props) {
  const { t } = useI18n();
  const quantities = evaluation.repairQuantities;
  const update = (repairQuantities: RepairQuantities) => onChange({ ...evaluation, repairQuantities });

  return (
    <View style={styles.stack}>
      <Text style={styles.hint}>{t.hints.quantitiesOptional}</Text>
      <Button
        variant="secondary"
        icon={<Download size={18} color={colors.primary} />}
        onPress={onExport}
      >
        {t.exportQuantitiesCsv}
      </Button>

      <Group
        title={t.quantityWalls}
        empty={quantities.walls.length === 0}
        onAdd={() => update({ ...quantities, walls: [...quantities.walls, createQuantityWall()] })}
        addLabel={t.addWall}
        totalLabel={`${t.fields.quantityTotalWallArea}: ${formatMeasure(totalWallArea(quantities.walls))}`}
      >
        {quantities.walls.map((wall, index) => (
          <WallEditor
            key={wall.id}
            wall={wall}
            index={index}
            onChange={(next) =>
              update({
                ...quantities,
                walls: quantities.walls.map((item) => (item.id === wall.id ? next : item)),
              })
            }
            onRemove={() =>
              update({ ...quantities, walls: quantities.walls.filter((item) => item.id !== wall.id) })
            }
          />
        ))}
      </Group>

      <Group
        title={t.quantityRoofs}
        empty={quantities.roofs.length === 0}
        onAdd={() => update({ ...quantities, roofs: [...quantities.roofs, createQuantityRoof()] })}
        addLabel={t.addRoof}
        totalLabel={`${t.fields.quantityTotalRoofArea}: ${formatMeasure(totalRoofArea(quantities.roofs))}`}
      >
        {quantities.roofs.map((roof) => (
          <RoofEditor
            key={roof.id}
            roof={roof}
            onChange={(next) =>
              update({
                ...quantities,
                roofs: quantities.roofs.map((item) => (item.id === roof.id ? next : item)),
              })
            }
            onRemove={() =>
              update({ ...quantities, roofs: quantities.roofs.filter((item) => item.id !== roof.id) })
            }
          />
        ))}
      </Group>

      <Group
        title={t.quantityBeams}
        empty={quantities.beams.length === 0}
        onAdd={() => update({ ...quantities, beams: [...quantities.beams, createQuantityMember()] })}
        addLabel={t.addBeam}
        totalLabel={`${t.fields.quantityTotalLength}: ${formatMeasure(totalMemberLength(quantities.beams))} · ${t.fields.quantityTotalVolume}: ${formatMeasure(totalMemberVolume(quantities.beams))}`}
      >
        {quantities.beams.map((beam) => (
          <MemberEditor
            key={beam.id}
            member={beam}
            onChange={(next) =>
              update({
                ...quantities,
                beams: quantities.beams.map((item) => (item.id === beam.id ? next : item)),
              })
            }
            onRemove={() =>
              update({ ...quantities, beams: quantities.beams.filter((item) => item.id !== beam.id) })
            }
          />
        ))}
      </Group>

      <Group
        title={t.quantityColumns}
        empty={quantities.columns.length === 0}
        onAdd={() =>
          update({ ...quantities, columns: [...quantities.columns, createQuantityMember()] })
        }
        addLabel={t.addColumn}
        totalLabel={`${t.fields.quantityTotalLength}: ${formatMeasure(totalMemberLength(quantities.columns))} · ${t.fields.quantityTotalVolume}: ${formatMeasure(totalMemberVolume(quantities.columns))}`}
      >
        {quantities.columns.map((column) => (
          <MemberEditor
            key={column.id}
            member={column}
            onChange={(next) =>
              update({
                ...quantities,
                columns: quantities.columns.map((item) => (item.id === column.id ? next : item)),
              })
            }
            onRemove={() =>
              update({
                ...quantities,
                columns: quantities.columns.filter((item) => item.id !== column.id),
              })
            }
          />
        ))}
      </Group>
    </View>
  );
}

function Group({
  title,
  empty,
  onAdd,
  addLabel,
  totalLabel,
  children,
}: React.PropsWithChildren<{
  title: string;
  empty: boolean;
  onAdd: () => void;
  addLabel: string;
  totalLabel: string;
}>) {
  const { t } = useI18n();
  return (
    <View style={styles.group}>
      <Text style={styles.groupTitle}>{title}</Text>
      {empty ? <Text style={styles.empty}>{t.quantityEmpty}</Text> : children}
      <View style={styles.groupFooter}>
        <Button variant="secondary" icon={<Plus size={17} color={colors.primary} />} onPress={onAdd}>
          {addLabel}
        </Button>
        <Text style={styles.total}>{totalLabel}</Text>
      </View>
    </View>
  );
}

function WallEditor({
  wall,
  index,
  onChange,
  onRemove,
}: {
  wall: QuantityWall;
  index: number;
  onChange: (wall: QuantityWall) => void;
  onRemove: () => void;
}) {
  const { t } = useI18n();
  return (
    <View style={styles.card}>
      <ItemHeader title={`${t.quantityWalls} ${index + 1}`} onRemove={onRemove} />
      <View style={styles.grid}>
        <Field
          label={t.fields.quantityLocation}
          value={wall.location}
          onChangeText={(location) => onChange({ ...wall, location })}
        />
        <Field
          label={t.fields.quantityLength}
          keyboardType="decimal-pad"
          value={wall.length}
          onChangeText={(length) => onChange({ ...wall, length })}
        />
        <Field
          label={t.fields.quantityHeight}
          keyboardType="decimal-pad"
          value={wall.height}
          onChangeText={(height) => onChange({ ...wall, height })}
        />
        <Field
          label={t.fields.quantityThickness}
          keyboardType="decimal-pad"
          value={wall.thickness}
          onChangeText={(thickness) => onChange({ ...wall, thickness })}
        />
      </View>
      <SelectRow
        label={t.fields.quantityWallType}
        value={wall.wallType}
        options={WALL_TYPES.map((value) => ({ value, label: t.catalogs.wallTypes[value] }))}
        onChange={(wallType) => onChange({ ...wall, wallType })}
      />
      {wall.wallType === 'other' && (
        <Field
          label={t.fields.quantityOther}
          value={wall.wallTypeOther}
          onChangeText={(wallTypeOther) => onChange({ ...wall, wallTypeOther })}
        />
      )}
      <SelectRow
        label={t.fields.quantityDamage}
        value={wall.damage}
        options={QUANTITY_DAMAGE_LEVELS.map((value) => ({
          value,
          label: t.catalogs.quantityDamage[value],
        }))}
        onChange={(damage) => onChange({ ...wall, damage })}
      />
      <MultiSelect
        label={t.fields.quantityRepair}
        values={wall.repairs}
        options={WALL_REPAIRS.map((value) => ({ value, label: t.catalogs.wallRepairs[value] }))}
        onChange={(repairs) => onChange({ ...wall, repairs })}
      />
      {wall.repairs.includes('change_typology') && (
        <>
          <SelectRow
            label={t.fields.quantityRecommendedType}
            value={wall.recommendedWallType}
            options={WALL_TYPES.map((value) => ({ value, label: t.catalogs.wallTypes[value] }))}
            onChange={(recommendedWallType) => onChange({ ...wall, recommendedWallType })}
          />
          {wall.recommendedWallType === 'other' && (
            <Field
              label={t.fields.quantityOther}
              value={wall.recommendedWallTypeOther}
              onChangeText={(recommendedWallTypeOther) =>
                onChange({ ...wall, recommendedWallTypeOther })
              }
            />
          )}
        </>
      )}
      <Text style={styles.computed}>
        {t.fields.quantityArea}: {formatMeasure(wallArea(wall))}
      </Text>
    </View>
  );
}

function RoofEditor({
  roof,
  onChange,
  onRemove,
}: {
  roof: QuantityRoof;
  onChange: (roof: QuantityRoof) => void;
  onRemove: () => void;
}) {
  const { t } = useI18n();
  return (
    <View style={styles.card}>
      <ItemHeader title={t.quantityRoofs} onRemove={onRemove} />
      <View style={styles.grid}>
        <Field
          label={t.fields.quantityLength}
          keyboardType="decimal-pad"
          value={roof.length}
          onChangeText={(length) => onChange({ ...roof, length })}
        />
        <Field
          label={t.fields.quantityWidth}
          keyboardType="decimal-pad"
          value={roof.width}
          onChangeText={(width) => onChange({ ...roof, width })}
        />
      </View>
      <SelectRow
        label={t.fields.quantityRoofStructure}
        value={roof.structureType}
        options={ROOF_STRUCTURE_TYPES.map((value) => ({
          value,
          label: t.catalogs.roofStructureTypes[value],
        }))}
        onChange={(structureType) => onChange({ ...roof, structureType })}
      />
      {roof.structureType === 'other' && (
        <Field
          label={t.fields.quantityOther}
          value={roof.structureTypeOther}
          onChangeText={(structureTypeOther) => onChange({ ...roof, structureTypeOther })}
        />
      )}
      <Field
        label={t.fields.quantityRoofCovering}
        value={roof.covering}
        onChangeText={(covering) => onChange({ ...roof, covering })}
      />
      <SelectRow
        label={t.fields.quantityDamage}
        value={roof.damage}
        options={QUANTITY_DAMAGE_LEVELS.map((value) => ({
          value,
          label: t.catalogs.quantityDamage[value],
        }))}
        onChange={(damage) => onChange({ ...roof, damage })}
      />
      <MultiSelect
        label={t.fields.quantityRepair}
        values={roof.repairs}
        options={ROOF_REPAIRS.map((value) => ({ value, label: t.catalogs.roofRepairs[value] }))}
        onChange={(repairs) => onChange({ ...roof, repairs })}
      />
      {roof.repairs.includes('change_typology') && (
        <Field
          label={t.fields.quantityTypologyChange}
          value={roof.typologyChange}
          onChangeText={(typologyChange) => onChange({ ...roof, typologyChange })}
        />
      )}
      <Text style={styles.computed}>
        {t.fields.quantityArea}: {formatMeasure(roofArea(roof))}
      </Text>
    </View>
  );
}

function MemberEditor({
  member,
  onChange,
  onRemove,
}: {
  member: QuantityMember;
  onChange: (member: QuantityMember) => void;
  onRemove: () => void;
}) {
  const { t } = useI18n();
  return (
    <View style={styles.card}>
      <ItemHeader title={t.fields.quantitySection} onRemove={onRemove} />
      <View style={styles.grid}>
        <Field
          label={t.fields.quantityWidth}
          keyboardType="decimal-pad"
          value={member.width}
          onChangeText={(width) => onChange({ ...member, width })}
        />
        <Field
          label={t.fields.quantityDepth}
          keyboardType="decimal-pad"
          value={member.depth}
          onChangeText={(depth) => onChange({ ...member, depth })}
        />
        <Field
          label={t.fields.quantityLength}
          keyboardType="decimal-pad"
          value={member.length}
          onChangeText={(length) => onChange({ ...member, length })}
        />
      </View>
      <SelectRow
        label={t.fields.quantityMaterial}
        value={member.material}
        options={FRAME_MATERIALS.map((value) => ({
          value,
          label: t.catalogs.frameMaterials[value],
        }))}
        onChange={(material) => onChange({ ...member, material })}
      />
      {member.material === 'other' && (
        <Field
          label={t.fields.quantityOther}
          value={member.materialOther}
          onChangeText={(materialOther) => onChange({ ...member, materialOther })}
        />
      )}
      <SelectRow
        label={t.fields.quantityDamage}
        value={member.damage}
        options={QUANTITY_DAMAGE_LEVELS.map((value) => ({
          value,
          label: t.catalogs.quantityDamage[value],
        }))}
        onChange={(damage) => onChange({ ...member, damage })}
      />
      <MultiSelect
        label={t.fields.quantityRepair}
        values={member.repairs}
        options={FRAME_REPAIRS.map((value) => ({ value, label: t.catalogs.frameRepairs[value] }))}
        onChange={(repairs) => onChange({ ...member, repairs })}
      />
      {member.repairs.includes('change_typology') && (
        <Field
          label={t.fields.quantityTypologyChange}
          value={member.typologyChange}
          onChangeText={(typologyChange) => onChange({ ...member, typologyChange })}
        />
      )}
      {member.repairs.includes('other') && (
        <Field
          label={t.fields.quantityOther}
          value={member.otherRepair}
          onChangeText={(otherRepair) => onChange({ ...member, otherRepair })}
        />
      )}
      <Text style={styles.computed}>
        {t.fields.quantityVolume}: {formatMeasure(memberVolume(member))}
      </Text>
    </View>
  );
}

function ItemHeader({ title, onRemove }: { title: string; onRemove: () => void }) {
  const { t } = useI18n();
  return (
    <View style={styles.itemHeader}>
      <Text style={styles.itemTitle}>{title}</Text>
      <Pressable accessibilityLabel={t.removeQuantity} onPress={onRemove} style={styles.remove}>
        <Trash2 size={16} color={colors.danger} />
        <Text style={styles.removeText}>{t.removeQuantity}</Text>
      </Pressable>
    </View>
  );
}

function MultiSelect<T extends string>({
  label,
  values,
  options,
  onChange,
}: {
  label: string;
  values: T[];
  options: { value: T; label: string }[];
  onChange: (values: T[]) => void;
}) {
  return (
    <View style={styles.multi}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.choiceWrap}>
        {options.map((option) => {
          const active = values.includes(option.value);
          return (
            <Pressable
              key={option.value}
              onPress={() =>
                onChange(
                  active ? values.filter((value) => value !== option.value) : [...values, option.value],
                )
              }
              style={[styles.choice, active && styles.choiceActive]}
            >
              <Text style={[styles.choiceText, active && styles.choiceTextActive]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 22, width: '100%' },
  hint: { color: colors.textMuted, fontSize: 12, lineHeight: 17 },
  group: { gap: 12 },
  groupTitle: { color: colors.text, fontSize: 16, fontWeight: '800' },
  empty: { color: colors.textMuted, fontSize: 13 },
  groupFooter: { gap: 10 },
  total: { color: colors.primaryDark, fontSize: 13, fontWeight: '800' },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    gap: 12,
    backgroundColor: colors.white,
    width: '100%',
    flexShrink: 0,
  },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  itemTitle: { color: colors.text, fontWeight: '800', fontSize: 14, flex: 1 },
  remove: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  removeText: { color: colors.danger, fontWeight: '800', fontSize: 13 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, width: '100%' },
  computed: { color: colors.primaryDark, fontSize: 13, fontWeight: '800' },
  multi: { gap: 7 },
  label: { color: colors.text, fontSize: 13, fontWeight: '700' },
  choiceWrap: {
    width: '100%',
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 8,
  },
  choice: {
    minHeight: 44,
    width: '100%',
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    justifyContent: 'center',
    backgroundColor: colors.white,
    flexShrink: 0,
  },
  choiceActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  choiceText: { color: colors.text, fontWeight: '600' },
  choiceTextActive: { color: colors.white },
});
