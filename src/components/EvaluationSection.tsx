import { Camera, ImagePlus, LocateFixed, X } from 'lucide-react-native';
import { type Href, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  CONSTRUCTION_PERIODS,
  periodFromConstructionYear,
  EQUIPMENT_DAMAGE_LEVELS,
  FLOOR_SUBTYPES,
  FLOOR_TYPES,
  FURTHER_ACTIONS,
  GLOBAL_CONDITIONS,
  GLOBAL_DAMAGE_RANGES,
  INSPECTION_POINT_GROUPS,
  INSPECTION_TYPES,
  NON_STRUCTURAL_ELEMENTS,
  NSR_GROUPS,
  PHENOMENON_ORIGINS,
  ROOF_GEOMETRIES,
  ROOF_STRUCTURES,
  SETTLEMENT_LEVELS,
  SITE_MORPHOLOGIES,
  SLOPE_FAILURE_LEVELS,
  STRUCTURAL_ELEMENTS,
  STRUCTURAL_IRREGULARITIES,
  STRUCTURAL_SYSTEMS,
  TYPICAL_RESTRICTIONS,
  UTILITY_CUTOFFS,
  habitabilityPanelColor,
  habitabilityPanelFill,
  type EvaluationSectionKey,
} from '@/domain/catalog';
import {
  applyDerivedHabitability,
  composeBuildingDimensions,
  type Coordinates,
  type Evaluation,
  type Habitability,
  type RiskLevel,
} from '@/domain/evaluation';
import { inspectionPointHints } from '@/guide/content';
import { useI18n } from '@/i18n/I18nProvider';
import { exportQuantitiesCsv } from '@/services/exportData';
import {
  applyPlaceLookup,
  formatCadastralAddress,
  withBuildingAddressFromCadastral,
} from '@/domain/placeLookup';
import { lookupPlace } from '@/services/reverseGeocode';
import { colors } from '@/theme';
import { PersistentImage } from './PersistentImage';
import { QuantitySurvey } from './QuantitySurvey';
import { SignatureCapture } from './SignatureCapture';
import { Button, ClassificationBadge, Field, SelectRow, ToggleRow } from './ui';

interface Props {
  sectionKey: EvaluationSectionKey;
  evaluation: Evaluation;
  onChange: (evaluation: Evaluation) => void;
  onLocation: () => void;
  onPhoto: (source: 'camera' | 'library') => void;
  onSketch: (source: 'camera' | 'library') => void;
}

export function EvaluationSection({
  sectionKey,
  evaluation,
  onChange,
  onLocation,
  onPhoto,
  onSketch,
}: Props) {
  const { t, language } = useI18n();
  const router = useRouter();
  const update = <K extends keyof Evaluation>(key: K, value: Evaluation[K]) =>
    onChange({ ...evaluation, [key]: value });
  const patchBuilding = (patch: Partial<Evaluation['building']>) => {
    const building = { ...evaluation.building, ...patch };
    update('building', { ...building, dimensions: composeBuildingDimensions(building) });
  };
  const updateRisk = (next: Evaluation) => onChange(applyDerivedHabitability(next));
  const risks: { value: RiskLevel; label: string }[] = [
    { value: 'none', label: t.none },
    { value: 'low', label: t.low },
    { value: 'moderate', label: t.moderate },
    { value: 'high', label: t.high },
    { value: 'severe', label: t.severe },
  ];
  const classifications: { value: Habitability; label: string }[] = [
    { value: 'habitable', label: t.habitable },
    { value: 'restricted', label: t.restricted },
    { value: 'unsafe', label: t.unsafe },
    { value: 'collapsed', label: t.collapsed },
  ];

  switch (sectionKey) {
    case 'cadastral':
      return (
        <CadastralSection evaluation={evaluation} onChange={onChange} onLocation={onLocation} />
      );
    case 'inspection':
      return (
        <View style={styles.stack}>
          <SelectRow
            label={t.fields.inspectionType}
            value={evaluation.inspection.type}
            options={INSPECTION_TYPES.map((value) => ({
              value,
              label: t.catalogs.inspectionTypes[value],
            }))}
            onChange={(type) => update('inspection', { ...evaluation.inspection, type })}
          />
          <Field
            label={t.fields.notInspectedReason}
            multiline
            value={evaluation.inspection.notInspectedReason}
            onChangeText={(notInspectedReason) =>
              update('inspection', { ...evaluation.inspection, notInspectedReason })
            }
          />
          <SelectRow
            label={t.fields.preliminaryClassification}
            value={(evaluation.inspection.preliminaryClassification || 'habitable') as Habitability}
            options={classifications}
            onChange={(preliminaryClassification) =>
              update('inspection', { ...evaluation.inspection, preliminaryClassification })
            }
          />
          <Hint>{t.hints.rapidProcess}</Hint>
          <ToggleRow
            label={t.fields.occupantsNotified}
            value={evaluation.inspection.occupantsNotified}
            onChange={(occupantsNotified) =>
              update('inspection', { ...evaluation.inspection, occupantsNotified })
            }
          />
        </View>
      );
    case 'building':
      return (
        <FormGrid>
          <BuildingAddressField evaluation={evaluation} onChange={onChange} />
          <Field
            label={t.fields.buildingName}
            value={evaluation.building.name}
            onChangeText={(name) => update('building', { ...evaluation.building, name })}
          />
          <SelectRow
            label={t.fields.nsrGroup}
            value={evaluation.building.nsrGroup}
            options={NSR_GROUPS.map((value) => ({ value, label: t.catalogs.nsrGroups[value] }))}
            onChange={(nsrGroup) => update('building', { ...evaluation.building, nsrGroup })}
          />
          {evaluation.building.nsrGroup ? (
            <Hint>{t.catalogs.nsrGroupHints[evaluation.building.nsrGroup]}</Hint>
          ) : null}
          <Field
            label={t.fields.floors}
            keyboardType="numeric"
            value={evaluation.building.floors}
            onChangeText={(floors) => update('building', { ...evaluation.building, floors })}
          />
          <Field
            label={t.fields.storiesBelowGrade}
            keyboardType="numeric"
            value={evaluation.building.storiesBelowGrade}
            onChangeText={(storiesBelowGrade) =>
              update('building', { ...evaluation.building, storiesBelowGrade })
            }
          />
          <Field
            label={t.fields.predominantUse}
            value={evaluation.building.predominantUse}
            onChangeText={(predominantUse) =>
              update('building', { ...evaluation.building, predominantUse })
            }
          />
          <View style={styles.location}>
            <Text style={styles.groupTitle}>{t.fields.dimensions}</Text>
            <View style={styles.coordFields}>
              <Field
                label={t.fields.dimensionLength}
                keyboardType="numbers-and-punctuation"
                value={evaluation.building.length}
                onChangeText={(length) => patchBuilding({ length })}
                style={styles.dimensionField}
              />
              <Field
                label={t.fields.dimensionWidth}
                keyboardType="numbers-and-punctuation"
                value={evaluation.building.width}
                onChangeText={(width) => patchBuilding({ width })}
                style={styles.dimensionField}
              />
              <Field
                label={t.fields.dimensionHeight}
                keyboardType="numbers-and-punctuation"
                value={evaluation.building.height}
                onChangeText={(height) => patchBuilding({ height })}
                style={styles.dimensionField}
              />
            </View>
          </View>
          <Field
            label={t.fields.footprintArea}
            keyboardType="numeric"
            value={evaluation.building.footprintArea}
            onChangeText={(footprintArea) =>
              update('building', { ...evaluation.building, footprintArea })
            }
          />
          <Field
            label={t.fields.estimatedOccupants}
            keyboardType="numeric"
            value={evaluation.building.estimatedOccupants}
            onChangeText={(estimatedOccupants) =>
              update('building', { ...evaluation.building, estimatedOccupants })
            }
          />
          <Field
            label={t.fields.units}
            keyboardType="numeric"
            value={evaluation.building.units}
            onChangeText={(units) => update('building', { ...evaluation.building, units })}
          />
        </FormGrid>
      );
    case 'structure': {
      const subtypes = evaluation.structure.floorType
        ? FLOOR_SUBTYPES[evaluation.structure.floorType]
        : [];
      return (
        <View style={styles.stack}>
          <SelectRow
            label={t.fields.structuralSystem}
            value={evaluation.structure.structuralSystem}
            options={STRUCTURAL_SYSTEMS.map((value) => ({
              value,
              label: t.catalogs.structuralSystems[value],
            }))}
            onChange={(structuralSystem) =>
              update('structure', { ...evaluation.structure, structuralSystem })
            }
          />
          {(evaluation.structure.structuralSystem === 's60' ||
            evaluation.structure.roofGeometry === 'other' ||
            evaluation.structure.roofStructure === 'other' ||
            evaluation.structure.floorType === 'mixed') && (
            <Hint>{t.hints.specifyInComments}</Hint>
          )}
          {evaluation.structure.structuralSystem ? (
            <>
              <Hint>
                {
                  inspectionPointHints[language][
                    INSPECTION_POINT_GROUPS[evaluation.structure.structuralSystem] as keyof typeof inspectionPointHints.es
                  ]
                }
              </Hint>
              <Pressable onPress={() => router.push('/guide' as Href)} style={styles.guideLink}>
                <Text style={styles.guideLinkText}>{t.hints.openGuide}</Text>
              </Pressable>
            </>
          ) : null}
          <Text style={styles.groupTitle}>{t.fields.irregularities}</Text>
          {STRUCTURAL_IRREGULARITIES.map((item) => {
            const current =
              evaluation.structure.irregularities.find((entry) => entry.item === item) ?? {
                item,
                checked: false,
                notes: '',
              };
            const patchIrregularity = (patch: { checked?: boolean; notes?: string }) =>
              update('structure', {
                ...evaluation.structure,
                irregularities: STRUCTURAL_IRREGULARITIES.map((id) => {
                  const entry = evaluation.structure.irregularities.find((row) => row.item === id) ?? {
                    item: id,
                    checked: false,
                    notes: '',
                  };
                  return id === item ? { ...entry, ...patch } : entry;
                }),
              });
            return (
              <View key={item} style={styles.conditionCard}>
                <ToggleRow
                  label={t.catalogs.irregularities[item]}
                  value={current.checked}
                  onChange={(checked) => patchIrregularity({ checked })}
                />
                {current.checked && (
                  <Field
                    label={t.fields.notes}
                    multiline
                    value={current.notes}
                    onChangeText={(notes) => patchIrregularity({ notes })}
                  />
                )}
              </View>
            );
          })}
          <SelectRow
            label={t.fields.floorType}
            value={evaluation.structure.floorType}
            options={FLOOR_TYPES.map((value) => ({ value, label: t.catalogs.floorTypes[value] }))}
            onChange={(floorType) =>
              update('structure', {
                ...evaluation.structure,
                floorType,
                floorSubtype: '',
                floorSystem: t.catalogs.floorTypes[floorType],
              })
            }
          />
          {subtypes.length > 0 && (
            <SelectRow
              label={t.fields.floorSubtype}
              value={evaluation.structure.floorSubtype}
              options={subtypes.map((value) => ({
                value,
                label: t.catalogs.floorSubtypes[value as keyof typeof t.catalogs.floorSubtypes],
              }))}
              onChange={(floorSubtype) =>
                update('structure', { ...evaluation.structure, floorSubtype })
              }
            />
          )}
          <SelectRow
            label={t.fields.roofGeometry}
            value={evaluation.structure.roofGeometry}
            options={ROOF_GEOMETRIES.map((value) => ({
              value,
              label: t.catalogs.roofGeometries[value],
            }))}
            onChange={(roofGeometry) => update('structure', { ...evaluation.structure, roofGeometry })}
          />
          <SelectRow
            label={t.fields.roofStructure}
            value={evaluation.structure.roofStructure}
            options={ROOF_STRUCTURES.map((value) => ({
              value,
              label: t.catalogs.roofStructures[value],
            }))}
            onChange={(roofStructure) =>
              update('structure', { ...evaluation.structure, roofStructure })
            }
          />
          <Field
            label={t.fields.constructionYear}
            keyboardType="numeric"
            value={evaluation.structure.constructionYear}
            onChangeText={(constructionYear) => {
              const constructionPeriod =
                periodFromConstructionYear(constructionYear) ?? evaluation.structure.constructionPeriod;
              update('structure', { ...evaluation.structure, constructionYear, constructionPeriod });
            }}
          />
          <Hint>{t.hints.constructionPeriodFromYear}</Hint>
          <SelectRow
            label={t.fields.constructionPeriod}
            value={evaluation.structure.constructionPeriod}
            options={CONSTRUCTION_PERIODS.map((value) => ({
              value,
              label: t.catalogs.constructionPeriods[value],
            }))}
            onChange={(constructionPeriod) =>
              update('structure', { ...evaluation.structure, constructionPeriod })
            }
          />
          {evaluation.structure.constructionPeriod ? (
            <Hint>{t.catalogs.constructionPeriodHints[evaluation.structure.constructionPeriod]}</Hint>
          ) : null}
        </View>
      );
    }
    case 'globalStability':
      return (
        <View style={styles.stack}>
          <SelectRow
            label={t.fields.risk}
            value={evaluation.globalStability.risk}
            options={risks}
            onChange={(risk) =>
              updateRisk({
                ...evaluation,
                globalStability: { ...evaluation.globalStability, risk },
              })
            }
          />
          {evaluation.globalStability.risk !== 'none' && (
            <Hint>{t.riskHints[evaluation.globalStability.risk]}</Hint>
          )}
          <Text style={styles.groupTitle}>{t.fields.observedConditions}</Text>
          {GLOBAL_CONDITIONS.map((item) => {
            const current =
              evaluation.globalStability.conditions.find((entry) => entry.item === item) ?? {
                item,
                checked: false,
                notes: '',
              };
            return (
              <View key={item} style={styles.conditionCard}>
                <ToggleRow
                  label={t.catalogs.globalConditions[item]}
                  value={current.checked}
                  onChange={(checked) =>
                    update('globalStability', {
                      ...evaluation.globalStability,
                      conditions: evaluation.globalStability.conditions.map((entry) =>
                        entry.item === item ? { ...entry, checked } : entry,
                      ),
                    })
                  }
                />
                {current.checked && (
                  <Field
                    label={t.fields.notes}
                    multiline
                    value={current.notes}
                    onChangeText={(notes) =>
                      update('globalStability', {
                        ...evaluation.globalStability,
                        conditions: evaluation.globalStability.conditions.map((entry) =>
                          entry.item === item ? { ...entry, notes } : entry,
                        ),
                      })
                    }
                  />
                )}
              </View>
            );
          })}
          <Field
            label={t.fields.comments}
            multiline
            value={evaluation.globalStability.notes}
            onChangeText={(notes) => update('globalStability', { ...evaluation.globalStability, notes })}
          />
        </View>
      );
    case 'geotechnical':
      return (
        <View style={styles.stack}>
          <SelectRow
            label={t.fields.morphology}
            value={evaluation.geotechnicalDamage.morphology}
            options={SITE_MORPHOLOGIES.map((value) => ({
              value,
              label: t.catalogs.morphologies[value],
            }))}
            onChange={(morphology) =>
              update('geotechnicalDamage', { ...evaluation.geotechnicalDamage, morphology })
            }
          />
          <SelectRow
            label={t.fields.settlement}
            value={evaluation.geotechnicalDamage.settlement}
            options={SETTLEMENT_LEVELS.map((value) => ({
              value,
              label: t.catalogs.settlementLevels[value],
            }))}
            onChange={(settlement) =>
              update('geotechnicalDamage', { ...evaluation.geotechnicalDamage, settlement })
            }
          />
          <SelectRow
            label={t.fields.slopeFailure}
            value={evaluation.geotechnicalDamage.slopeFailure}
            options={SLOPE_FAILURE_LEVELS.map((value) => ({
              value,
              label: t.catalogs.slopeFailureLevels[value],
            }))}
            onChange={(slopeFailure) =>
              update('geotechnicalDamage', { ...evaluation.geotechnicalDamage, slopeFailure })
            }
          />
          <SelectRow
            label={t.fields.origin}
            value={evaluation.geotechnicalDamage.origin}
            options={PHENOMENON_ORIGINS.map((value) => ({
              value,
              label: t.catalogs.origins[value],
            }))}
            onChange={(origin) =>
              update('geotechnicalDamage', { ...evaluation.geotechnicalDamage, origin })
            }
          />
          <SelectRow
            label={t.fields.risk}
            value={evaluation.geotechnicalDamage.risk}
            options={risks}
            onChange={(risk) =>
              updateRisk({
                ...evaluation,
                geotechnicalDamage: { ...evaluation.geotechnicalDamage, risk },
              })
            }
          />
          {evaluation.geotechnicalDamage.risk !== 'none' && <Hint>{t.hints.geotechSpecialist}</Hint>}
        </View>
      );
    case 'structuralDamage':
      return (
        <DamageEditor
          elements={ensureTypes(evaluation.structuralDamage.elements, STRUCTURAL_ELEMENTS)}
          risks={risks}
          onChange={(elements) =>
            update('structuralDamage', { ...evaluation.structuralDamage, elements })
          }
          header={<Hint>{t.hints.structuralDamage}</Hint>}
          footer={
            <>
              <Field
                label={t.fields.worstFloor}
                value={evaluation.structuralDamage.worstFloor}
                onChangeText={(worstFloor) =>
                  update('structuralDamage', { ...evaluation.structuralDamage, worstFloor })
                }
              />
              <SelectRow
                label={t.fields.risk}
                value={evaluation.structuralDamage.risk}
                options={risks}
                onChange={(risk) =>
                  updateRisk({
                    ...evaluation,
                    structuralDamage: { ...evaluation.structuralDamage, risk },
                  })
                }
              />
            </>
          }
        />
      );
    case 'nonStructural':
      return (
        <DamageEditor
          elements={ensureTypes(evaluation.nonStructuralDamage.elements, NON_STRUCTURAL_ELEMENTS)}
          risks={risks}
          onChange={(elements) =>
            update('nonStructuralDamage', { ...evaluation.nonStructuralDamage, elements })
          }
          showElevatorReference
          footer={
            <SelectRow
              label={t.fields.risk}
              value={evaluation.nonStructuralDamage.risk}
              options={risks}
              onChange={(risk) =>
                updateRisk({
                  ...evaluation,
                  nonStructuralDamage: { ...evaluation.nonStructuralDamage, risk },
                })
              }
            />
          }
        />
      );
    case 'habitability': {
      const panel = habitabilityPanelColor(evaluation.habitability);
      const panelFill = habitabilityPanelFill(evaluation.habitability);
      return (
        <View style={styles.stack}>
          <SelectRow
            label={t.fields.globalDamage}
            value={evaluation.globalDamagePercentage}
            options={GLOBAL_DAMAGE_RANGES.map((value) => ({
              value,
              label: t.catalogs.damageRanges[value],
            }))}
            onChange={(globalDamagePercentage) => update('globalDamagePercentage', globalDamagePercentage)}
          />
          <View style={[styles.classPanel, { backgroundColor: panelFill, borderColor: panel }]}>
            <ClassificationBadge value={evaluation.habitability} />
            <SelectRow
              label={t.classification}
              value={evaluation.habitability}
              options={classifications}
              onChange={(habitability) => update('habitability', habitability)}
            />
            <Text style={styles.classHint}>{t.habitabilityHints[evaluation.habitability]}</Text>
          </View>
          <Field
            label={t.fields.placardComments}
            multiline
            value={evaluation.placard.comments}
            onChangeText={(comments) => update('placard', { ...evaluation.placard, comments })}
          />
          <Field
            label={t.fields.placardRestrictions}
            multiline
            value={evaluation.placard.restrictions}
            onChangeText={(restrictions) => update('placard', { ...evaluation.placard, restrictions })}
          />
          <Field
            label={t.fields.placardActions}
            multiline
            value={evaluation.placard.furtherActions}
            onChangeText={(furtherActions) =>
              update('placard', { ...evaluation.placard, furtherActions })
            }
          />
          <FormGrid>
            <Field
              label={t.fields.placardDate}
              value={evaluation.placard.date}
              onChangeText={(date) => update('placard', { ...evaluation.placard, date })}
              placeholder="YYYY-MM-DD"
            />
            <Field
              label={t.fields.placardTime}
              value={evaluation.placard.time}
              onChangeText={(time) => update('placard', { ...evaluation.placard, time })}
            />
            <Field
              label={t.fields.placardJurisdiction}
              value={evaluation.placard.jurisdiction}
              onChangeText={(jurisdiction) =>
                update('placard', { ...evaluation.placard, jurisdiction })
              }
            />
            <Field
              label={t.fields.placardInspector}
              value={evaluation.placard.inspectorLine}
              onChangeText={(inspectorLine) =>
                update('placard', { ...evaluation.placard, inspectorLine })
              }
            />
          </FormGrid>
        </View>
      );
    }
    case 'preExisting':
      return (
        <View style={styles.stack}>
          <ToggleRow
            label={t.fields.preExisting}
            value={evaluation.preExistingConditions.present}
            onChange={(present) =>
              update('preExistingConditions', { ...evaluation.preExistingConditions, present })
            }
          />
          <Field
            label={t.fields.description}
            multiline
            value={evaluation.preExistingConditions.description}
            onChangeText={(description) =>
              update('preExistingConditions', { ...evaluation.preExistingConditions, description })
            }
          />
          <Field
            label={t.fields.priorInterventions}
            multiline
            value={evaluation.preExistingConditions.priorInterventions}
            onChangeText={(priorInterventions) =>
              update('preExistingConditions', {
                ...evaluation.preExistingConditions,
                priorInterventions,
              })
            }
          />
        </View>
      );
    case 'recommendations':
      return (
        <View style={styles.stack}>
          <Text style={styles.groupTitle}>{t.fields.typicalRestrictions}</Text>
          {TYPICAL_RESTRICTIONS.map((item) => (
            <ToggleRow
              key={item}
              label={t.catalogs.typicalRestrictions[item]}
              value={evaluation.recommendations.typicalRestrictions.includes(item)}
              onChange={(checked) =>
                update('recommendations', {
                  ...evaluation.recommendations,
                  typicalRestrictions: checked
                    ? [...evaluation.recommendations.typicalRestrictions, item]
                    : evaluation.recommendations.typicalRestrictions.filter((value) => value !== item),
                })
              }
            />
          ))}
          <Text style={styles.groupTitle}>{t.fields.furtherActions}</Text>
          {FURTHER_ACTIONS.map((item) => (
            <ToggleRow
              key={item}
              label={t.catalogs.furtherActions[item]}
              value={evaluation.recommendations.furtherActions.includes(item)}
              onChange={(checked) =>
                update('recommendations', {
                  ...evaluation.recommendations,
                  furtherActions: checked
                    ? [...evaluation.recommendations.furtherActions, item]
                    : evaluation.recommendations.furtherActions.filter((value) => value !== item),
                })
              }
            />
          ))}
          <Text style={styles.groupTitle}>{t.fields.utilitiesIsolated}</Text>
          {UTILITY_CUTOFFS.map((item) => (
            <ToggleRow
              key={item}
              label={t.catalogs.utilities[item]}
              value={evaluation.recommendations.utilitiesIsolated[item]}
              onChange={(value) =>
                update('recommendations', {
                  ...evaluation.recommendations,
                  utilitiesIsolated: {
                    ...evaluation.recommendations.utilitiesIsolated,
                    [item]: value,
                  },
                })
              }
            />
          ))}
          <ToggleRow
            label={t.fields.adjacentFallingHazard}
            value={evaluation.recommendations.adjacentFallingHazard}
            onChange={(adjacentFallingHazard) =>
              update('recommendations', { ...evaluation.recommendations, adjacentFallingHazard })
            }
          />
          {evaluation.recommendations.adjacentFallingHazard && (
            <Field
              label={t.fields.notes}
              multiline
              value={evaluation.recommendations.adjacentNotes}
              onChangeText={(adjacentNotes) =>
                update('recommendations', { ...evaluation.recommendations, adjacentNotes })
              }
            />
          )}
          <FormGrid>
            <Field
              label={t.fields.safetyMeasures}
              multiline
              value={evaluation.recommendations.safetyMeasures.join('\n')}
              onChangeText={(text) =>
                update('recommendations', {
                  ...evaluation.recommendations,
                  safetyMeasures: text.split('\n').filter(Boolean),
                })
              }
            />
            <Field
              label={t.fields.specialistVisits}
              multiline
              value={evaluation.recommendations.specialistVisits.join('\n')}
              onChangeText={(text) =>
                update('recommendations', {
                  ...evaluation.recommendations,
                  specialistVisits: text.split('\n').filter(Boolean),
                })
              }
            />
            <Field
              label={t.fields.barriers}
              multiline
              value={evaluation.recommendations.barriers}
              onChangeText={(barriers) =>
                update('recommendations', { ...evaluation.recommendations, barriers })
              }
            />
            <Field
              label={t.fields.others}
              multiline
              value={evaluation.recommendations.others}
              onChangeText={(others) =>
                update('recommendations', { ...evaluation.recommendations, others })
              }
            />
          </FormGrid>
        </View>
      );
    case 'occupants':
      return (
        <FormGrid>
          <Field
            label={t.fields.injured}
            keyboardType="numeric"
            value={evaluation.occupantImpact.injured}
            onChangeText={(injured) => update('occupantImpact', { ...evaluation.occupantImpact, injured })}
          />
          <Field
            label={t.fields.deceased}
            keyboardType="numeric"
            value={evaluation.occupantImpact.deceased}
            onChangeText={(deceased) =>
              update('occupantImpact', { ...evaluation.occupantImpact, deceased })
            }
          />
        </FormGrid>
      );
    case 'occupancy':
      return (
        <View style={styles.stack}>
          <ToggleRow
            label={t.fields.inhabited}
            value={evaluation.occupancy.inhabited}
            onChange={(inhabited) => update('occupancy', { ...evaluation.occupancy, inhabited })}
          />
          <FormGrid>
            <Field
              label={t.fields.existingUnits}
              keyboardType="numeric"
              value={evaluation.occupancy.existingUnits}
              onChangeText={(existingUnits) =>
                update('occupancy', { ...evaluation.occupancy, existingUnits })
              }
            />
            <Field
              label={t.fields.uninhabitableUnits}
              keyboardType="numeric"
              value={evaluation.occupancy.uninhabitableUnits}
              onChangeText={(uninhabitableUnits) =>
                update('occupancy', { ...evaluation.occupancy, uninhabitableUnits })
              }
            />
          </FormGrid>
        </View>
      );
    case 'contact':
      return (
        <FormGrid>
          <Field
            label={t.fields.contactName}
            value={evaluation.contact.name}
            onChangeText={(name) => update('contact', { ...evaluation.contact, name })}
          />
          <Field
            label={t.fields.identification}
            value={evaluation.contact.identification}
            onChangeText={(identification) =>
              update('contact', { ...evaluation.contact, identification })
            }
          />
          <Field
            label={t.fields.phone}
            keyboardType="phone-pad"
            value={evaluation.contact.phone}
            onChangeText={(phone) => update('contact', { ...evaluation.contact, phone })}
          />
          <Field
            label={t.fields.contactAddress}
            value={evaluation.contact.address}
            onChangeText={(address) => update('contact', { ...evaluation.contact, address })}
          />
          <Field
            label={t.fields.comments}
            multiline
            value={evaluation.comments}
            onChangeText={(comments) => update('comments', comments)}
          />
        </FormGrid>
      );
    case 'inspectors': {
      const inspector = evaluation.inspectors[0]!;
      const setInspector = (value: Partial<typeof inspector>) =>
        update('inspectors', [{ ...inspector, ...value }]);
      return (
        <FormGrid>
          <Field
            label={t.fields.inspectorName}
            value={inspector.name}
            onChangeText={(name) => setInspector({ name })}
          />
          <Field
            label={t.fields.profession}
            value={inspector.profession}
            onChangeText={(profession) => setInspector({ profession })}
          />
          <Field
            label={t.fields.license}
            value={inspector.license}
            onChangeText={(license) => setInspector({ license })}
          />
          <Field
            label={t.fields.inspectorId}
            value={inspector.inspectorId}
            onChangeText={(inspectorId) => setInspector({ inspectorId })}
          />
          <Field
            label={t.fields.entity}
            value={inspector.entity}
            onChangeText={(entity) => setInspector({ entity })}
          />
        </FormGrid>
      );
    }
    case 'quantities':
      return (
        <QuantitySurvey
          evaluation={evaluation}
          onChange={onChange}
          onExport={() => void exportQuantitiesCsv([evaluation], language)}
        />
      );
    case 'equipment':
      return (
        <View style={styles.stack}>
          <Text style={styles.groupTitle}>{t.generalThreats}</Text>
          {evaluation.equipmentReview.items
            .filter((item) => item.group === 'general')
            .map((item) => (
              <EquipmentRowEditor
                key={item.type}
                item={item}
                onChange={(next) =>
                  update('equipmentReview', {
                    ...evaluation.equipmentReview,
                    items: evaluation.equipmentReview.items.map((entry) =>
                      entry.type === item.type ? next : entry,
                    ),
                  })
                }
              />
            ))}
          <Text style={styles.groupTitle}>{t.hospitalConsiderations}</Text>
          {evaluation.equipmentReview.items
            .filter((item) => item.group === 'hospital')
            .map((item) => (
              <EquipmentRowEditor
                key={item.type}
                item={item}
                onChange={(next) =>
                  update('equipmentReview', {
                    ...evaluation.equipmentReview,
                    items: evaluation.equipmentReview.items.map((entry) =>
                      entry.type === item.type ? next : entry,
                    ),
                  })
                }
              />
            ))}
          <Field
            label={t.fields.equipmentRecommendations}
            multiline
            value={evaluation.equipmentReview.recommendations}
            onChangeText={(recommendations) =>
              update('equipmentReview', { ...evaluation.equipmentReview, recommendations })
            }
          />
        </View>
      );
    case 'media':
      return (
        <View style={styles.stack}>
          <View style={styles.drawGrid}>
            <View style={styles.sketchPicker}>
              <View style={styles.mediaHeader}>
                <Text style={styles.mediaLabel}>{t.sketch}</Text>
                {evaluation.sketchUri && (
                  <Pressable
                    onPress={() =>
                      onChange({
                        ...evaluation,
                        sketchUri: undefined,
                        sketchStoragePath: undefined,
                      })
                    }
                  >
                    <Text style={styles.clear}>{t.clear}</Text>
                  </Pressable>
                )}
              </View>
              <View style={styles.sketchPreview}>
                {evaluation.sketchUri ? (
                  <PersistentImage
                    uri={evaluation.sketchUri}
                    storagePath={evaluation.sketchStoragePath}
                    resizeMode="contain"
                    style={styles.sketchImage}
                  />
                ) : (
                  <Text style={styles.sketchPlaceholder}>{t.sketchImagePlaceholder}</Text>
                )}
              </View>
              <View style={styles.sketchButtons}>
                <Button
                  variant="secondary"
                  icon={<Camera size={17} color={colors.primary} />}
                  onPress={() => onSketch('camera')}
                >
                  {t.takePhoto}
                </Button>
                <Button
                  variant="ghost"
                  icon={<ImagePlus size={17} color={colors.primary} />}
                  onPress={() => onSketch('library')}
                >
                  {t.choosePhoto}
                </Button>
              </View>
            </View>
            <SignatureCapture
              value={evaluation.signatureUri}
              onChange={(signatureUri) => update('signatureUri', signatureUri)}
            />
          </View>
          <View style={styles.photoRegistry}>
            <View style={styles.photoRegistryHeader}>
              <View style={styles.photoRegistryTitle}>
                <Text style={styles.mediaLabel}>{t.photoRecord}</Text>
                <Text style={styles.photoCount}>
                  {evaluation.photos.length} {t.photosSaved}
                </Text>
              </View>
              <View style={styles.photoButtons}>
                <Button
                  variant="secondary"
                  icon={<Camera size={18} color={colors.primary} />}
                  onPress={() => onPhoto('camera')}
                >
                  {t.takePhoto}
                </Button>
                <Button
                  variant="ghost"
                  icon={<ImagePlus size={18} color={colors.primary} />}
                  onPress={() => onPhoto('library')}
                >
                  {t.choosePhotos}
                </Button>
              </View>
            </View>
            {evaluation.photos.length ? (
              <View style={styles.photos}>
                {evaluation.photos.map((photo) => (
                  <View key={photo.id} style={styles.photoCard}>
                    <View style={styles.photoPreview}>
                      <PersistentImage
                        uri={photo.localUri}
                        storagePath={photo.storagePath}
                        resizeMode="cover"
                        style={styles.photo}
                      />
                      <Pressable
                        accessibilityLabel={t.removePhoto}
                        onPress={() =>
                          update(
                            'photos',
                            evaluation.photos.filter((item) => item.id !== photo.id),
                          )
                        }
                        style={styles.removePhoto}
                      >
                        <X size={16} color={colors.white} />
                      </Pressable>
                    </View>
                    <Field
                      label={t.photoCaption}
                      value={photo.caption ?? ''}
                      onChangeText={(caption) =>
                        update(
                          'photos',
                          evaluation.photos.map((item) =>
                            item.id === photo.id ? { ...item, caption } : item,
                          ),
                        )
                      }
                      placeholder={t.photoCaptionPlaceholder}
                      style={styles.photoCaptionField}
                    />
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyPhotos}>
                <ImagePlus size={30} color={colors.textMuted} />
                <Text style={styles.sketchPlaceholder}>{t.noPhotos}</Text>
              </View>
            )}
          </View>
        </View>
      );
    default:
      return null;
  }
}

function BuildingAddressField({
  evaluation,
  onChange,
}: {
  evaluation: Evaluation;
  onChange: (evaluation: Evaluation) => void;
}) {
  const { t } = useI18n();
  const evaluationRef = useRef(evaluation);
  const onChangeRef = useRef(onChange);
  evaluationRef.current = evaluation;
  onChangeRef.current = onChange;

  useEffect(() => {
    const next = withBuildingAddressFromCadastral(evaluationRef.current);
    if (next !== evaluationRef.current) onChangeRef.current(next);
  }, [
    evaluation.identification.sector,
    evaluation.identification.neighborhood,
    evaluation.identification.commune,
    evaluation.identification.municipality,
    evaluation.identification.department,
    evaluation.building.address,
  ]);

  return (
    <>
      <Field
        label={t.address}
        value={evaluation.building.address || formatCadastralAddress(evaluation)}
        onChangeText={(address) =>
          onChange({
            ...evaluation,
            building: { ...evaluation.building, address },
          })
        }
      />
      <Hint>{t.hints.addressFromCadastral}</Hint>
    </>
  );
}

const lastCadastralLookups = new Map<string, string>();

function CadastralSection({
  evaluation,
  onChange,
  onLocation,
}: {
  evaluation: Evaluation;
  onChange: (evaluation: Evaluation) => void;
  onLocation: () => void;
}) {
  const { t } = useI18n();
  const evaluationRef = useRef(evaluation);
  const onChangeRef = useRef(onChange);
  evaluationRef.current = evaluation;
  onChangeRef.current = onChange;
  const lastLookup = useRef(lastCadastralLookups.get(evaluation.id) ?? '');
  const [lookup, setLookup] = useState<'idle' | 'loading' | 'ok' | 'error'>(
    lastLookup.current ? 'ok' : 'idle',
  );

  useEffect(() => {
    const coordinates = evaluation.identification.coordinates;
    if (!coordinates) {
      lastLookup.current = '';
      lastCadastralLookups.delete(evaluation.id);
      setLookup('idle');
      return;
    }
    const key = `${coordinates.latitude.toFixed(5)},${coordinates.longitude.toFixed(5)}`;
    if (lastLookup.current === key) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      lastLookup.current = key;
      setLookup('loading');
      void lookupPlace(coordinates)
        .then((place) => {
          if (cancelled) return;
          if (!place) {
            setLookup('error');
            return;
          }
          lastCadastralLookups.set(evaluation.id, key);
          setLookup('ok');
          onChangeRef.current(applyPlaceLookup(evaluationRef.current, place));
        })
        .catch(() => {
          if (!cancelled) setLookup('error');
        });
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [evaluation.id, evaluation.identification.coordinates?.latitude, evaluation.identification.coordinates?.longitude]);

  const patchIdentification = (patch: Partial<Evaluation['identification']>) =>
    onChange({
      ...evaluation,
      identification: { ...evaluation.identification, ...patch },
    });

  const lookupMessage =
    lookup === 'loading'
      ? t.locationLookup
      : lookup === 'error'
        ? t.locationLookupFailed
        : t.locationLookupHint;

  return (
    <FormGrid>
      <CoordinateCapture
        coordinates={evaluation.identification.coordinates}
        onCaptureGps={onLocation}
        onChange={(coordinates) => patchIdentification({ coordinates })}
      />
      <Text style={styles.hint}>{lookupMessage}</Text>
      <Field
        label={t.fields.department}
        value={evaluation.identification.department}
        onChangeText={(department) => patchIdentification({ department })}
      />
      <Field
        label={t.fields.municipality}
        value={evaluation.identification.municipality}
        onChangeText={(municipality) => patchIdentification({ municipality })}
      />
      <Field
        label={t.fields.commune}
        value={evaluation.identification.commune}
        onChangeText={(commune) => patchIdentification({ commune })}
      />
      <Field
        label={t.fields.neighborhood}
        value={evaluation.identification.neighborhood}
        onChangeText={(neighborhood) => patchIdentification({ neighborhood })}
      />
      <Field
        label={t.address}
        value={evaluation.identification.sector}
        onChangeText={(sector) => {
          const previous = evaluation.identification.sector.trim();
          const currentBuilding = evaluation.building.address.trim();
          const shouldSyncBuilding =
            !currentBuilding ||
            currentBuilding === previous ||
            currentBuilding === formatCadastralAddress(evaluation);
          onChange({
            ...evaluation,
            identification: { ...evaluation.identification, sector },
            building: shouldSyncBuilding
              ? { ...evaluation.building, address: sector }
              : evaluation.building,
          });
        }}
      />
      <Field
        label={t.fields.cadastralCode}
        value={evaluation.identification.cadastralCode}
        onChangeText={(cadastralCode) => patchIdentification({ cadastralCode })}
      />
      <Field
        label={t.fields.propertyRegistration}
        value={evaluation.identification.propertyRegistration}
        onChangeText={(propertyRegistration) => patchIdentification({ propertyRegistration })}
      />
    </FormGrid>
  );
}

function formatCoord(value?: number) {
  return value == null || !Number.isFinite(value) ? '' : String(value);
}

function parseCoordinate(text: string): number | undefined {
  const normalized = text.trim().replace(/\s/g, '').replace(',', '.');
  if (!normalized || normalized === '-' || normalized === '.' || normalized === '-.') return undefined;
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) return undefined;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : undefined;
}

function CoordinateCapture({
  coordinates,
  onCaptureGps,
  onChange,
}: {
  coordinates?: Coordinates;
  onCaptureGps: () => void;
  onChange: (coordinates: Coordinates | undefined) => void;
}) {
  const { t } = useI18n();
  const [latitudeText, setLatitudeText] = useState(() => formatCoord(coordinates?.latitude));
  const [longitudeText, setLongitudeText] = useState(() => formatCoord(coordinates?.longitude));

  useEffect(() => {
    setLatitudeText(formatCoord(coordinates?.latitude));
    setLongitudeText(formatCoord(coordinates?.longitude));
  }, [coordinates?.latitude, coordinates?.longitude]);

  const commit = (nextLat: string, nextLng: string) => {
    setLatitudeText(nextLat);
    setLongitudeText(nextLng);
    if (!nextLat.trim() && !nextLng.trim()) {
      if (coordinates) onChange(undefined);
      return;
    }
    const latitude = parseCoordinate(nextLat);
    const longitude = parseCoordinate(nextLng);
    if (
      latitude == null ||
      longitude == null ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      return;
    }
    if (coordinates?.latitude === latitude && coordinates?.longitude === longitude) return;
    onChange({ latitude, longitude });
  };

  return (
    <View style={styles.location}>
      <Button
        variant="secondary"
        icon={<LocateFixed size={18} color={colors.primary} />}
        onPress={onCaptureGps}
      >
        {coordinates ? t.locationCaptured : t.captureLocation}
      </Button>
      <View style={styles.coordFields}>
        <Field
          label={t.fields.latitude}
          value={latitudeText}
          onChangeText={(text) => commit(text, longitudeText)}
          keyboardType="numbers-and-punctuation"
          autoCorrect={false}
          autoCapitalize="none"
          placeholder="4.65000"
        />
        <Field
          label={t.fields.longitude}
          value={longitudeText}
          onChangeText={(text) => commit(latitudeText, text)}
          keyboardType="numbers-and-punctuation"
          autoCorrect={false}
          autoCapitalize="none"
          placeholder="-74.05000"
        />
      </View>
    </View>
  );
}

function FormGrid({ children }: React.PropsWithChildren) {
  return <View style={styles.grid}>{children}</View>;
}

function Hint({ children }: { children: string }) {
  return <Text style={styles.hint}>{children}</Text>;
}

function ensureTypes(elements: Evaluation['structuralDamage']['elements'], types: readonly string[]) {
  const byType = new Map(elements.map((item) => [item.type, item]));
  return types.map(
    (type) => byType.get(type) ?? { type, severity: 'none' as const, affectedPercentage: '' },
  );
}

function DamageEditor({
  elements,
  risks,
  onChange,
  footer,
  header,
  showElevatorReference,
}: {
  elements: Evaluation['structuralDamage']['elements'];
  risks: { value: RiskLevel; label: string }[];
  onChange: (elements: Evaluation['structuralDamage']['elements']) => void;
  footer: React.ReactNode;
  header?: React.ReactNode;
  showElevatorReference?: boolean;
}) {
  const { t } = useI18n();
  return (
    <View style={styles.stack}>
      {header}
      {elements.map((element, index) => (
        <View key={element.type} style={styles.conditionCard}>
          <SelectRow
            label={t.damage[element.type as keyof typeof t.damage] ?? element.type}
            value={element.severity}
            options={risks}
            onChange={(severity) => {
              const next = [...elements];
              next[index] = { ...element, severity };
              onChange(next);
            }}
          />
          <Field
            label={t.fields.affectedPercentage}
            keyboardType="numeric"
            value={element.affectedPercentage}
            onChangeText={(affectedPercentage) => {
              const next = [...elements];
              next[index] = { ...element, affectedPercentage };
              onChange(next);
            }}
          />
          {showElevatorReference && element.type === 'elevators' && (
            <>
              <Text style={styles.hint}>{t.elevatorReference}</Text>
              <Image
                source={require('../../assets/elevator-atc20.png')}
                resizeMode="contain"
                style={styles.elevatorImage}
              />
              <Field
                label={t.fields.notes}
                multiline
                value={element.notes ?? ''}
                onChangeText={(notes) => {
                  const next = [...elements];
                  next[index] = { ...element, notes };
                  onChange(next);
                }}
              />
            </>
          )}
        </View>
      ))}
      {footer}
    </View>
  );
}

function EquipmentRowEditor({
  item,
  onChange,
}: {
  item: Evaluation['equipmentReview']['items'][number];
  onChange: (item: Evaluation['equipmentReview']['items'][number]) => void;
}) {
  const { t } = useI18n();
  const label = item.custom
    ? t.otherEquipment
    : (t.catalogs.equipment[item.type as keyof typeof t.catalogs.equipment] ?? item.type);
  return (
    <View style={styles.conditionCard}>
      {item.custom ? (
        <Field
          label={t.fields.equipmentName}
          value={item.name}
          onChangeText={(name) => onChange({ ...item, name })}
          placeholder={label}
        />
      ) : (
        <Text style={styles.equipmentLabel}>{label}</Text>
      )}
      <SelectRow
        label={t.fields.equipmentDamage}
        value={item.damage}
        options={EQUIPMENT_DAMAGE_LEVELS.map((value) => ({
          value,
          label: t.catalogs.equipmentDamage[value],
        }))}
        onChange={(damage) => onChange({ ...item, damage })}
      />
      <Field
        label={t.fields.equipmentComments}
        value={item.comments}
        onChangeText={(comments) => onChange({ ...item, comments })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, width: '100%' },
  stack: { gap: 16, width: '100%' },
  location: { flexBasis: '100%', width: '100%', minWidth: 0, maxWidth: '100%', gap: 10 },
  coordFields: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  dimensionField: { flexBasis: 140, flexGrow: 1 },
  hint: { color: colors.textMuted, fontSize: 12, lineHeight: 17, width: '100%' },
  groupTitle: { color: colors.text, fontSize: 15, fontWeight: '800', width: '100%' },
  guideLink: { alignSelf: 'flex-start' },
  guideLinkText: { color: colors.primary, fontWeight: '800', fontSize: 13 },
  conditionCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    gap: 12,
    backgroundColor: colors.white,
    width: '100%',
    flexShrink: 0,
  },
  classPanel: {
    borderRadius: 14,
    padding: 14,
    gap: 12,
    borderWidth: 2,
    borderLeftWidth: 6,
    width: '100%',
  },
  classHint: { color: colors.text, fontSize: 12, lineHeight: 18, fontWeight: '600' },
  equipmentLabel: { color: colors.text, fontSize: 14, fontWeight: '700' },
  elevatorImage: { width: '100%', height: 280, backgroundColor: colors.surfaceMuted, borderRadius: 8 },
  drawGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  sketchPicker: { flexGrow: 1, flexBasis: 280, minWidth: 0, maxWidth: '100%', gap: 8 },
  mediaHeader: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8 },
  mediaLabel: { color: colors.text, fontSize: 13, fontWeight: '700' },
  clear: { color: colors.primary, fontWeight: '800', fontSize: 13 },
  sketchPreview: {
    height: 180,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: 12,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    padding: 8,
  },
  sketchImage: { width: '100%', height: '100%' },
  sketchPlaceholder: { color: colors.textMuted, fontSize: 13, textAlign: 'center' },
  sketchButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  photoRegistry: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    backgroundColor: colors.surfaceMuted,
    padding: 14,
    gap: 14,
  },
  photoRegistryHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  photoRegistryTitle: { gap: 3 },
  photoCount: { color: colors.textMuted, fontSize: 12 },
  photoButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  photos: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  photoCard: {
    flexGrow: 1,
    flexBasis: 240,
    maxWidth: 360,
    minWidth: 0,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.white,
    padding: 9,
    gap: 9,
  },
  photoPreview: { height: 170, borderRadius: 9, overflow: 'hidden', position: 'relative' },
  photo: { width: '100%', height: '100%', backgroundColor: colors.surfaceMuted },
  removePhoto: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#14271ECC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoCaptionField: { minWidth: 0 },
  emptyPhotos: {
    minHeight: 150,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: 12,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 18,
  },
});
