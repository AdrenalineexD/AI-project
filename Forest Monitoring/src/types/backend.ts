// ============================================================
// AETHER — Backend types (mirrors Forest-management/backend/schemas.py)
// ============================================================

export type ActiveTab =
  | 'landing'
  | 'dashboard'
  | 'incidents'
  | 'map'
  | 'heatmap'
  | 'alerts'
  | 'guide'
  | 'admin';

export type Role =
  | 'CITIZEN'
  | 'FIREFIGHTER'
  | 'FOREST_OFFICIAL'
  | 'EMERGENCY_OPERATOR'
  | 'DISASTER_MANAGER'
  | 'ADMIN'
  | 'OBSERVER';

export type IncidentState =
  | 'CREATED'
  | 'OBSERVING'
  | 'PERSISTENT'
  | 'AWAITING_VERIFICATION'
  | 'ACKNOWLEDGED'
  | 'ESCALATED'
  | 'VERIFIED_INCIDENT'
  | 'ACTIVE_EMERGENCY'
  | 'RESOLVED'
  | 'FALSE_POSITIVE';

export type SeverityLabel =
  | 'NORMAL'
  | 'AI_OBSERVATION'
  | 'PERSISTENT_DETECTION'
  | 'POTENTIAL_WILDFIRE'
  | 'VERIFIED_INCIDENT'
  | 'ACTIVE_EMERGENCY';

export type SeverityLevel = 0 | 1 | 2 | 3 | 4 | 5;

export type AlertPriority = 'INFO' | 'WARNING' | 'HIGH' | 'CRITICAL';

export type DetectionClass = 'smoke' | 'fire' | string;

export interface GeoPoint {
  lat: number;
  lon: number;
}

export interface BEDetection {
  id: string;
  ts: string;
  source_id: string;
  source_type?: 'camera' | 'user' | 'sensor';
  class: DetectionClass;
  confidence: number;
  location: GeoPoint;
  bbox?: number[] | null;
  note?: string | null;
}

export interface IncidentSource {
  detection_id: string;
  source_id: string;
  class: DetectionClass;
  confidence: number;
  ts: string;
  relation: 'primary' | 'corroborating';
}

export interface TimelineEntry {
  ts: string;
  event: string;
  detail: string;
}

export interface ChecklistItem {
  key: string;
  label: string;
  done: boolean;
}

export interface IncidentNote {
  ts: string;
  actor: string;
  text: string;
}

export interface PersistenceInfo {
  persistent: boolean;
  duration: number;
  count: number;
}

export interface Incident {
  id: string;
  created_at: string;
  updated_at: string;
  state: IncidentState;
  severity: SeverityLevel;
  severity_label: SeverityLabel;
  location: GeoPoint;
  primary_class: DetectionClass;
  confidence: number;
  persistence: PersistenceInfo;
  sources: IncidentSource[];
  timeline: TimelineEntry[];
  checklist: ChecklistItem[];
  notes: IncidentNote[];
  acknowledged_by: string | null;
  assigned_to: string | null;
  ai_summary: string | null;
}

export interface Recipient {
  role: Role;
  group: string;
  reason: string;
}

export interface BEAlert {
  id: string;
  incident_id: string;
  priority: AlertPriority;
  reason: string;
  role: Role;
  recipients: Recipient[];
  title: string;
  body: string;
  actions: string[];
  created_at: string;
}

export interface AuditEntry {
  ts: string;
  event: string;
  incident_id?: string;
  source?: string;
  role?: Role;
  [k: string]: unknown;
}

export interface AppConfig {
  severity_model: Record<number, SeverityLabel>;
  priorities: Record<AlertPriority, number>;
  roles: Role[];
  escalation: { t: number; action: string }[];
  notification_mode: 'DEV' | 'PROD';
  persistence_seconds: number;
  correlation_radius_m: number;
}

// ---------- WebSocket envelopes ----------
export type WSMessage =
  | {
      type: 'snapshot';
      payload: {
        incidents: Incident[];
        audit: AuditEntry[];
        config?: Partial<AppConfig>;
      };
      ts: string;
    }
  | { type: 'detections'; payload: BEDetection[]; ts: string }
  | { type: 'incident'; payload: Incident; ts: string }
  | { type: 'alert'; payload: BEAlert; ts: string }
  | { type: 'user_report'; payload: unknown; ts: string }
  | {
      type: 'simulation';
      payload: { status: 'started' | 'completed' };
      ts: string;
    };
