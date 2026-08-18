import { Camera, ImagePlus, LocateFixed, X } from 'lucide-react-native';
import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import type { Evaluation, Habitability, RiskLevel } from '@/domain/evaluation';
import { useI18n } from '@/i18n/I18nProvider';
import { colors } from '@/theme';
import { SignatureCapture } from './SignatureCapture';
import { Button, Field, SelectRow, ToggleRow } from './ui';

interface Props {
  section: number;
  evaluation: Evaluation;
  onChange: (evaluation: Evaluation) => void;
  onLocation: () => void;
  onPhoto: (source: 'camera' | 'library') => void;
  onSketch: (source: 'camera' | 'library') => void;
}

export function EvaluationSection({
  section,
  evaluation,
  onChange,
  onLocation,
  onPhoto,
  onSketch,
}: Props) {
  const { t } = useI18n();
  const update = <K extends keyof Evaluation>(key: K, value: Evaluation[K]) =>
    onChange({ ...evaluation, [key]: value });
  const risks: Array<{ value: RiskLevel; label: string }> = [
    { value: 'none', label: t.none },
    { value: 'low', label: t.low },
    { value: 'moderate', label: t.moderate },
    { value: 'high', label: t.high },
    { value: 'severe', label: t.severe },
  ];
  const classifications: Array<{ value: Habitability; label: string }> = [
    { value: 'habitable', label: t.habitable },
    { value: 'restricted', label: t.restricted },
    { value: 'unsafe', label: t.unsafe },
    { value: 'collapsed', label: t.collapsed },
  ];

  switch (section) {
    case 0:
      return (
        <FormGrid>
          <Field
            label={t.fields.department}
            value={evaluation.identification.department}
            onChangeText={(department) =>
              update('identification', { ...evaluation.identification, department })
            }
          />
          <Field
            label={t.fields.municipality}
            value={evaluation.identification.municipality}
            onChangeText={(municipality) =>
              update('identification', { ...evaluation.identification, municipality })
            }
          />
          <Field
            label={t.fields.commune}
            value={evaluation.identification.commune}
            onChangeText={(commune) => update('identification', { ...evaluation.identification, commune })}
          />
          <Field
            label={t.fields.neighborhood}
            value={evaluation.identification.neighborhood}
            onChangeText={(neighborhood) =>
              update('identification', { ...evaluation.identification, neighborhood })
            }
          />
          <Field
            label={t.fields.sector}
            value={evaluation.identification.sector}
            onChangeText={(sector) => update('identification', { ...evaluation.identification, sector })}
          />
          <Field
            label={t.fields.cadastralCode}
            value={evaluation.identification.cadastralCode}
            onChangeText={(cadastralCode) =>
              update('identification', { ...evaluation.identification, cadastralCode })
            }
          />
          <Field
            label={t.fields.propertyRegistration}
            value={evaluation.identification.propertyRegistration}
            onChangeText={(propertyRegistration) =>
              update('identification', { ...evaluation.identification, propertyRegistration })
            }
          />
          <View style={styles.location}>
            <Button
              variant="secondary"
              icon={<LocateFixed size={18} color={colors.primary} />}
              onPress={onLocation}
            >
              {evaluation.identification.coordinates ? t.locationCaptured : t.captureLocation}
            </Button>
            {evaluation.identification.coordinates && (
              <Text style={styles.coordinate}>
                {evaluation.identification.coordinates.latitude.toFixed(5)},{' '}
                {evaluation.identification.coordinates.longitude.toFixed(5)}
              </Text>
            )}
          </View>
        </FormGrid>
      );
    case 1:
      return (
        <View style={styles.stack}>
          <SelectRow
            label={t.fields.inspectionType}
            value={evaluation.inspection.type}
            options={[
              { value: 'rapid', label: t.rapid },
              { value: 'detailed', label: t.detailed },
            ]}
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
        </View>
      );
    case 2:
      return (
        <FormGrid>
          <Field
            label={t.address}
            value={evaluation.building.address}
            onChangeText={(address) => update('building', { ...evaluation.building, address })}
          />
          <Field
            label={t.fields.buildingName}
            value={evaluation.building.name}
            onChangeText={(name) => update('building', { ...evaluation.building, name })}
          />
          <Field
            label={t.fields.floors}
            keyboardType="numeric"
            value={evaluation.building.floors}
            onChangeText={(floors) => update('building', { ...evaluation.building, floors })}
          />
          <Field
            label={t.fields.predominantUse}
            value={evaluation.building.predominantUse}
            onChangeText={(predominantUse) =>
              update('building', { ...evaluation.building, predominantUse })
            }
          />
          <Field
            label={t.fields.dimensions}
            value={evaluation.building.dimensions}
            onChangeText={(dimensions) => update('building', { ...evaluation.building, dimensions })}
          />
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
    case 3:
      return (
        <FormGrid>
          <Field
            label={t.fields.structuralSystem}
            value={evaluation.structure.structuralSystem}
            onChangeText={(structuralSystem) =>
              update('structure', { ...evaluation.structure, structuralSystem })
            }
          />
          <Field
            label={t.fields.floorSystem}
            value={evaluation.structure.floorSystem}
            onChangeText={(floorSystem) =>
              update('structure', { ...evaluation.structure, floorSystem })
            }
          />
          <Field
            label={t.fields.constructionYear}
            keyboardType="numeric"
            value={evaluation.structure.constructionYear}
            onChangeText={(constructionYear) =>
              update('structure', { ...evaluation.structure, constructionYear })
            }
          />
        </FormGrid>
      );
    case 4:
      return (
        <View style={styles.stack}>
          <SelectRow
            label={t.fields.risk}
            value={evaluation.globalStability.risk}
            options={risks}
            onChange={(risk) => update('globalStability', { ...evaluation.globalStability, risk })}
          />
          <Field
            label={t.fields.observedConditions}
            multiline
            value={evaluation.globalStability.observedConditions.join('\n')}
            onChangeText={(text) =>
              update('globalStability', {
                ...evaluation.globalStability,
                observedConditions: text.split('\n').filter(Boolean),
              })
            }
          />
          <Field
            label={t.fields.notes}
            multiline
            value={evaluation.globalStability.notes}
            onChangeText={(notes) => update('globalStability', { ...evaluation.globalStability, notes })}
          />
        </View>
      );
    case 5:
      return (
        <View style={styles.stack}>
          <FormGrid>
            <Field
              label={t.fields.morphology}
              value={evaluation.geotechnicalDamage.morphology}
              onChangeText={(morphology) =>
                update('geotechnicalDamage', { ...evaluation.geotechnicalDamage, morphology })
              }
            />
            <Field
              label={t.fields.origin}
              value={evaluation.geotechnicalDamage.origin}
              onChangeText={(origin) =>
                update('geotechnicalDamage', { ...evaluation.geotechnicalDamage, origin })
              }
            />
          </FormGrid>
          <ToggleRow
            label={t.fields.settlement}
            value={evaluation.geotechnicalDamage.settlement}
            onChange={(settlement) =>
              update('geotechnicalDamage', { ...evaluation.geotechnicalDamage, settlement })
            }
          />
          <ToggleRow
            label={t.fields.slopeFailure}
            value={evaluation.geotechnicalDamage.slopeFailure}
            onChange={(slopeFailure) =>
              update('geotechnicalDamage', { ...evaluation.geotechnicalDamage, slopeFailure })
            }
          />
          <SelectRow
            label={t.fields.risk}
            value={evaluation.geotechnicalDamage.risk}
            options={risks}
            onChange={(risk) =>
              update('geotechnicalDamage', { ...evaluation.geotechnicalDamage, risk })
            }
          />
        </View>
      );
    case 6:
      return (
        <DamageEditor
          elements={evaluation.structuralDamage.elements}
          risks={risks}
          onChange={(elements) =>
            update('structuralDamage', { ...evaluation.structuralDamage, elements })
          }
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
                  update('structuralDamage', { ...evaluation.structuralDamage, risk })
                }
              />
            </>
          }
        />
      );
    case 7:
      return (
        <DamageEditor
          elements={evaluation.nonStructuralDamage.elements}
          risks={risks}
          onChange={(elements) =>
            update('nonStructuralDamage', { ...evaluation.nonStructuralDamage, elements })
          }
          footer={
            <SelectRow
              label={t.fields.risk}
              value={evaluation.nonStructuralDamage.risk}
              options={risks}
              onChange={(risk) =>
                update('nonStructuralDamage', { ...evaluation.nonStructuralDamage, risk })
              }
            />
          }
        />
      );
    case 8:
      return (
        <View style={styles.checklist}>
          {evaluation.fieldCriteria.map((criterion, index) => (
            <ToggleRow
              key={criterion.item}
              label={t.damage[criterion.item as keyof typeof t.damage] ?? criterion.item}
              value={criterion.checked}
              onChange={(checked) => {
                const fieldCriteria = [...evaluation.fieldCriteria];
                fieldCriteria[index] = { ...criterion, checked };
                update('fieldCriteria', fieldCriteria);
              }}
            />
          ))}
        </View>
      );
    case 9:
      return (
        <View style={styles.stack}>
          <Field
            label={t.fields.globalDamage}
            keyboardType="numeric"
            value={evaluation.globalDamagePercentage}
            onChangeText={(globalDamagePercentage) => update('globalDamagePercentage', globalDamagePercentage)}
          />
          <SelectRow
            label={t.classification}
            value={evaluation.habitability}
            options={classifications}
            onChange={(habitability) => update('habitability', habitability)}
          />
        </View>
      );
    case 10:
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
    case 11:
      return (
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
      );
    case 12:
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
    case 13:
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
    case 14:
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
    case 15: {
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
    case 16:
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
                  <Image
                    source={{ uri: evaluation.sketchUri }}
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
                      <Image
                        source={{ uri: photo.localUri }}
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

function FormGrid({ children }: React.PropsWithChildren) {
  return <View style={styles.grid}>{children}</View>;
}

function DamageEditor({
  elements,
  risks,
  onChange,
  footer,
}: {
  elements: Evaluation['structuralDamage']['elements'];
  risks: Array<{ value: RiskLevel; label: string }>;
  onChange: (elements: Evaluation['structuralDamage']['elements']) => void;
  footer: React.ReactNode;
}) {
  const { t } = useI18n();
  return (
    <View style={styles.stack}>
      {elements.map((element, index) => (
        <SelectRow
          key={element.type}
          label={t.damage[element.type as keyof typeof t.damage] ?? element.type}
          value={element.severity}
          options={risks}
          onChange={(severity) => {
            const next = [...elements];
            next[index] = { ...element, severity };
            onChange(next);
          }}
        />
      ))}
      {footer}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  stack: { gap: 20 },
  checklist: { gap: 5 },
  location: { flex: 1, minWidth: 240, gap: 8, justifyContent: 'flex-end' },
  coordinate: { color: colors.textMuted, fontSize: 12, textAlign: 'center' },
  drawGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  sketchPicker: { flex: 1, minWidth: 280, gap: 8 },
  mediaHeader: { flexDirection: 'row', justifyContent: 'space-between' },
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
    minWidth: 220,
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
