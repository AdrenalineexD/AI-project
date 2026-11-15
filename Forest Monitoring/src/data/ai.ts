import { AIDecision, AIRecommendation } from '../types';

export const mockAIDecisions: AIDecision[] = [
  {
    id: 'DEC-001',
    timestamp: '18:42:31',
    event: 'Smoke Signature Detected',
    source: 'Optical Feed CAM-01',
    details: 'YOLOv8 smoke detection confidence rating at 87% in Sector F.',
    severity: 'Medium'
  },
  {
    id: 'DEC-002',
    timestamp: '18:42:33',
    event: 'YOLO Fire Confirmation',
    source: 'Thermal Camera CAM-01',
    details: 'YOLOv8 fire detection confidence rating at 92.4%. Thermal hotspot confirmed.',
    severity: 'High'
  },
  {
    id: 'DEC-003',
    timestamp: '18:42:35',
    event: 'IoT Telemetry Corroboration',
    source: 'Sensor Node ESP32-001',
    details: 'Temperature spike to 38.0°C and smoke detection level flag "HIGH".',
    severity: 'Critical'
  },
  {
    id: 'DEC-004',
    timestamp: '18:42:40',
    event: 'Meteorological Risk Assessment',
    source: 'Weather Station NW-12',
    details: 'Wind speed 24 km/h NW, relative humidity 27%. FWI calculated at 31.4 (Critical spread conditions).',
    severity: 'High'
  },
  {
    id: 'DEC-005',
    timestamp: '18:42:42',
    event: 'Multi-Source Fusion Analysis',
    source: 'AETHER Agent Engine',
    details: 'Sensor telemetry, camera vision, and meteorological indices fused. Wildfire probability: 98.4%.',
    severity: 'Critical'
  },
  {
    id: 'DEC-006',
    timestamp: '18:42:45',
    event: 'Forest Fire Risk Escalation',
    source: 'AETHER Agent Engine',
    details: 'Overall region threat level escalated to CRITICAL.',
    severity: 'Critical'
  },
  {
    id: 'DEC-007',
    timestamp: '18:42:46',
    event: 'Emergency Dispatch Verification',
    source: 'Notification Engine',
    details: 'Critical fire alert ALT-101 created and queued for immediate dispatch.',
    severity: 'Critical'
  }
];

export const mockAIRecommendations: AIRecommendation[] = [
  {
    id: 'REC-301',
    recommendation: 'Escalate Monitoring Frequency on Adjacent Nodes',
    rationale: 'High wind speeds (24 km/h NW) threaten to spread the fire toward Sector G. Active ESP32 nodes in the wind path (ESP32-002, ESP32-005) must report every 5 seconds.',
    actions: [
      'Increase ESP32-002 reporting frequency to 5s',
      'Increase ESP32-005 reporting frequency to 5s',
      'Activate thermal tracking on backup camera CAM-03'
    ],
    status: 'Executed',
    createdAt: '2026-08-16 18:43:00'
  },
  {
    id: 'REC-302',
    recommendation: 'Trigger Autonomous Satellite Scan Request',
    rationale: 'Confirm fire perimeter boundaries and detect underlying hotspot expansion obscured by heavy smoke plume.',
    actions: [
      'Queue ESA Sentinel-2 tasking request',
      'Request NASA FIRMS MODIS/VIIRS latest pass comparison data'
    ],
    status: 'Pending',
    createdAt: '2026-08-16 18:44:12'
  },
  {
    id: 'REC-303',
    recommendation: 'Initialize Proactive Local Firebreak Strategy',
    rationale: 'The fire is situated 400m from a high-density pine zone. Suggest dispatching ground crews to secure buffer Zone C.',
    actions: [
      'Send telemetry details to ground emergency dispatch',
      'Activate local forest edge agricultural water mist valves'
    ],
    status: 'Pending',
    createdAt: '2026-08-16 18:45:00'
  }
];
