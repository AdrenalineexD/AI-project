import { Alert } from '../types';

export const mockAlerts: Alert[] = [
  {
    id: 'ALT-101',
    type: 'Fire',
    location: 'Western Zone (Block F)',
    severity: 'Critical',
    timestamp: '2026-08-16 18:42:34',
    confidence: 92.4,
    status: 'New',
    message: 'Active fire detected via YOLO CAM-01 inference and validated by elevated temperature in Node Alpha.'
  },
  {
    id: 'ALT-102',
    type: 'Smoke',
    location: 'Western Zone (Block F)',
    severity: 'High',
    timestamp: '2026-08-16 18:42:31',
    confidence: 87.0,
    status: 'Investigating',
    message: 'Dense smoke signature detected by optical camera feed. Cross-checking with thermal scans.'
  },
  {
    id: 'ALT-103',
    type: 'Deforestation',
    location: 'Northern Reserve (Sector 4)',
    severity: 'Medium',
    timestamp: '2026-08-16 14:15:00',
    confidence: 88.0,
    status: 'New',
    message: 'Satellite canopy analysis indicates anomaly in coverage. Estimated loss: 1.8 km².'
  },
  {
    id: 'ALT-104',
    type: 'Environmental Risk',
    location: 'Southern Buffer Zone',
    severity: 'High',
    timestamp: '2026-08-16 12:00:00',
    confidence: 91.0,
    status: 'Confirmed',
    message: 'Fire Weather Index (FWI) climbed to 31.4 due to high temperature (38°C) and low humidity (27%).'
  },
  {
    id: 'ALT-105',
    type: 'Sensor Failure',
    location: 'Forest Zone C (South Creek)',
    severity: 'Low',
    timestamp: '2026-08-16 17:30:00',
    confidence: 100.0,
    status: 'Investigating',
    message: 'Sensor ESP32-004 has failed to report telemetry. Battery level recorded low (14%) on last check.'
  },
  {
    id: 'ALT-106',
    type: 'Satellite Anomaly',
    location: 'Entire Monitored Canopy',
    severity: 'Low',
    timestamp: '2026-08-15 03:22:00',
    confidence: 95.0,
    status: 'Resolved',
    message: 'Sentinel-2 imagery gap detected for orbit 432. Automated retry successfully loaded fallback imagery.'
  }
];
