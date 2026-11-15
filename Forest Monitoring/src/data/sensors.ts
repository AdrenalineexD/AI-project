import { SensorNode } from '../types';

export const mockSensors: SensorNode[] = [
  {
    id: 'ESP32-001',
    name: 'Sensor Node Alpha',
    location: 'Forest Zone A (North Ridge)',
    latitude: 18.5284,
    longitude: 73.8492,
    temperature: 34.6,
    humidity: 41,
    smokeLevel: 'High',
    gasLevel: 'Elevated',
    batteryLevel: 87,
    connectivity: 'Online',
    lastUpdated: '10 sec ago',
    signalStrength: 'Excellent'
  },
  {
    id: 'ESP32-002',
    name: 'Sensor Node Beta',
    location: 'Forest Zone A (Valley)',
    latitude: 18.5215,
    longitude: 73.8612,
    temperature: 31.2,
    humidity: 45,
    smokeLevel: 'Normal',
    gasLevel: 'Normal',
    batteryLevel: 92,
    connectivity: 'Online',
    lastUpdated: '45 sec ago',
    signalStrength: 'Good'
  },
  {
    id: 'ESP32-003',
    name: 'Sensor Node Gamma',
    location: 'Forest Zone B (West Slope)',
    latitude: 18.5350,
    longitude: 73.8340,
    temperature: 29.8,
    humidity: 48,
    smokeLevel: 'Normal',
    gasLevel: 'Normal',
    batteryLevel: 78,
    connectivity: 'Online',
    lastUpdated: '2 min ago',
    signalStrength: 'Good'
  },
  {
    id: 'ESP32-004',
    name: 'Sensor Node Delta',
    location: 'Forest Zone C (South Creek)',
    latitude: 18.5080,
    longitude: 73.8180,
    temperature: 28.5,
    humidity: 52,
    smokeLevel: 'Normal',
    gasLevel: 'Normal',
    batteryLevel: 14,
    connectivity: 'Offline',
    lastUpdated: '1 hour ago',
    signalStrength: 'Poor'
  },
  {
    id: 'ESP32-005',
    name: 'Sensor Node Epsilon',
    location: 'Forest Zone D (East Peak)',
    latitude: 18.5450,
    longitude: 73.8850,
    temperature: 33.4,
    humidity: 38,
    smokeLevel: 'Normal',
    gasLevel: 'Normal',
    batteryLevel: 64,
    connectivity: 'Online',
    lastUpdated: '12 sec ago',
    signalStrength: 'Excellent'
  }
];
