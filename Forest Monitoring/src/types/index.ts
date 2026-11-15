export interface FireDetection {
  id: string;
  latitude: number;
  longitude: number;
  confidence: number;
  detectedAt: string;
  temperature: number;
  humidity: number;
  windSpeed: number;
  windDirection: string;
  riskLevel: 'Critical' | 'High' | 'Medium' | 'Low';
  status: 'Active' | 'Contained' | 'Extinguished';
}

export interface SensorNode {
  id: string;
  name: string;
  location: string;
  latitude: number;
  longitude: number;
  temperature: number;
  humidity: number;
  smokeLevel: 'Normal' | 'Medium' | 'High';
  gasLevel: 'Normal' | 'Elevated' | 'High';
  batteryLevel: number;
  connectivity: 'Online' | 'Offline';
  lastUpdated: string;
  signalStrength: 'Excellent' | 'Good' | 'Fair' | 'Poor';
}

export interface DeforestationAlert {
  id: string;
  region: string;
  date: string;
  areaKm2: number;
  confidence: number;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  status: 'New' | 'Under Review' | 'Action Taken' | 'Resolved';
  latitude: number;
  longitude: number;
}

export interface Alert {
  id: string;
  type: 'Fire' | 'Smoke' | 'Deforestation' | 'Environmental Risk' | 'Sensor Failure' | 'Satellite Anomaly';
  location: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  timestamp: string;
  confidence: number;
  status: 'New' | 'Investigating' | 'Confirmed' | 'Resolved';
  message: string;
}

export interface EnvironmentalStats {
  temperature: number;
  humidity: number;
  windSpeed: number;
  windDirection: string;
  rainfallMm: number;
  fireWeatherIndex: number;
}

export interface AIDecision {
  id: string;
  timestamp: string;
  event: string;
  source: string;
  details: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low' | 'Normal';
}

export interface AIRecommendation {
  id: string;
  recommendation: string;
  rationale: string;
  actions: string[];
  status: 'Pending' | 'Approved' | 'Executed' | 'Ignored';
  createdAt: string;
}
