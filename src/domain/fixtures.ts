import { createEvaluation, type Evaluation } from './evaluation';

function demo(
  id: string,
  address: string,
  neighborhood: string,
  habitability: Evaluation['habitability'],
  coordinates: { latitude: number; longitude: number },
  inspector: string,
): Evaluation {
  const evaluation = createEvaluation(id);
  return {
    ...evaluation,
    status: 'synced',
    syncState: 'synced',
    officialNumber: Number(id.replace(/\D/g, '')),
    currentSection: 16,
    identification: {
      ...evaluation.identification,
      department: 'Cundinamarca',
      municipality: 'Bogotá D.C.',
      neighborhood,
      coordinates,
    },
    building: {
      ...evaluation.building,
      address,
      name: 'Edificación inspeccionada',
      floors: '3',
      predominantUse: 'Residencial',
      estimatedOccupants: '12',
      units: '4',
    },
    structure: {
      structuralSystem: 'Pórticos de concreto reforzado',
      floorSystem: 'Losa de concreto',
      constructionYear: '1998',
    },
    habitability,
    globalDamagePercentage:
      habitability === 'habitable' ? '8' : habitability === 'restricted' ? '28' : '62',
    inspectors: [
      {
        name: inspector,
        profession: 'Ingeniería civil',
        license: 'DEMO-0000',
        inspectorId: 'EV-DEMO',
        entity: 'CMGRD',
      },
    ],
    signatureUri: 'demo-signature',
    comments: 'Registro de demostración para visualizar el panel de coordinación.',
  };
}

export const demoEvaluations: Evaluation[] = [
  demo('EQ-1042', 'Carrera 7 # 72-41', 'Chapinero', 'habitable', { latitude: 4.655, longitude: -74.058 }, 'Laura Gómez'),
  demo('EQ-1041', 'Calle 22 Sur # 18-05', 'Restrepo', 'restricted', { latitude: 4.584, longitude: -74.102 }, 'Mateo Ruiz'),
  demo('EQ-1040', 'Avenida 1 de Mayo # 38-20', 'Kennedy', 'unsafe', { latitude: 4.621, longitude: -74.142 }, 'Ana Torres'),
  demo('EQ-1039', 'Calle 80 # 94-12', 'Engativá', 'habitable', { latitude: 4.704, longitude: -74.11 }, 'Diego León'),
  demo('EQ-1038', 'Diagonal 48 Sur # 7-32', 'San Cristóbal', 'collapsed', { latitude: 4.551, longitude: -74.088 }, 'Sofía Díaz'),
];
