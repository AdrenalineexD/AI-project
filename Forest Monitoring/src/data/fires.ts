import { FireDetection } from '../types';

export const mockFires: FireDetection[] = [
  {
    id: 'FIRE-024',
    latitude: 18.5204,
    longitude: 73.8567,
    confidence: 92.4,
    detectedAt: '18:42:31',
    temperature: 38,
    humidity: 27,
    windSpeed: 24,
    windDirection: 'NW',
    riskLevel: 'Critical',
    status: 'Active'
  },
  {
    id: 'FIRE-025',
    latitude: 18.5412,
    longitude: 73.8721,
    confidence: 88.7,
    detectedAt: '19:02:15',
    temperature: 36,
    humidity: 29,
    windSpeed: 21,
    windDirection: 'WNW',
    riskLevel: 'High',
    status: 'Active'
  },
  {
    id: 'FIRE-026',
    latitude: 18.5028,
    longitude: 73.8245,
    confidence: 76.5,
    detectedAt: '15:10:42',
    temperature: 34,
    humidity: 32,
    windSpeed: 18,
    windDirection: 'N',
    riskLevel: 'Medium',
    status: 'Contained'
  }
];
