import { DeforestationAlert } from '../types';

export const mockDeforestationAlerts: DeforestationAlert[] = [
  {
    id: 'DEF-018',
    region: 'Western Zone (Block F)',
    date: '2026-08-16',
    areaKm2: 2.4,
    confidence: 94,
    severity: 'High',
    status: 'Under Review',
    latitude: 18.4950,
    longitude: 73.8810
  },
  {
    id: 'DEF-017',
    region: 'Northern Reserve (Sector 4)',
    date: '2026-08-10',
    areaKm2: 1.8,
    confidence: 88,
    severity: 'Medium',
    status: 'Action Taken',
    latitude: 18.5580,
    longitude: 73.8650
  },
  {
    id: 'DEF-016',
    region: 'Eastern Buffer (Sector 9)',
    date: '2026-07-28',
    areaKm2: 4.1,
    confidence: 97,
    severity: 'Critical',
    status: 'Resolved',
    latitude: 18.5120,
    longitude: 73.9120
  },
  {
    id: 'DEF-015',
    region: 'Southern Corridor (Block B)',
    date: '2026-07-15',
    areaKm2: 0.9,
    confidence: 81,
    severity: 'Low',
    status: 'Resolved',
    latitude: 18.4720,
    longitude: 73.8050
  }
];

export const mockDeforestationStats = {
  totalForestArea: 12480,
  forestLossMonth: 2.4,
  forestLossYear: 18.6,
  estimatedAffectedArea: 34.2
};
