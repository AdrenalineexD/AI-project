"""
Wildfire Intelligence Platform — Pydantic schemas
Single source of truth for API contracts. Mirrors frontend/src/types.ts.
"""
from __future__ import annotations
from typing import Any, Dict, List, Literal, Optional, Union
from pydantic import BaseModel, Field

# ---------- Enums as Literals (matching frontend) ----------
Role = Literal[
    "CITIZEN", "FIREFIGHTER", "FOREST_OFFICIAL",
    "EMERGENCY_OPERATOR", "DISASTER_MANAGER", "ADMIN", "OBSERVER",
]

IncidentState = Literal[
    "CREATED", "OBSERVING", "PERSISTENT", "AWAITING_VERIFICATION",
    "ACKNOWLEDGED", "ESCALATED", "VERIFIED_INCIDENT",
    "ACTIVE_EMERGENCY", "RESOLVED", "FALSE_POSITIVE",
]

SeverityLabel = Literal[
    "NORMAL", "AI_OBSERVATION", "PERSISTENT_DETECTION",
    "POTENTIAL_WILDFIRE", "VERIFIED_INCIDENT", "ACTIVE_EMERGENCY",
]

SeverityLevel = Literal[0, 1, 2, 3, 4, 5]
AlertPriority = Literal["INFO", "WARNING", "HIGH", "CRITICAL"]
DetectionClass = str
SourceType = Literal["camera", "user", "sensor"]
Relation = Literal["primary", "corroborating"]


# ---------- Geo ----------
class GeoPoint(BaseModel):
    lat: float
    lon: float


# ---------- Detection ----------
class Detection(BaseModel):
    id: str
    ts: str
    source_id: str
    source_type: SourceType = "camera"
    cls: DetectionClass = Field(alias="class")
    confidence: float
    location: GeoPoint
    bbox: Optional[List[float]] = None
    note: Optional[str] = None

    class Config:
        populate_by_name = True


# ---------- Incident sub-structures ----------
class IncidentSource(BaseModel):
    detection_id: str
    source_id: str
    cls: DetectionClass = Field(alias="class")
    confidence: float
    ts: str
    relation: Relation = "corroborating"

    class Config:
        populate_by_name = True


class TimelineEntry(BaseModel):
    ts: str
    event: str
    detail: str


class ChecklistItem(BaseModel):
    key: str
    label: str
    done: bool = False


class IncidentNote(BaseModel):
    ts: str
    actor: str
    text: str


class PersistenceInfo(BaseModel):
    persistent: bool = False
    duration: float = 0.0
    count: int = 0


class Incident(BaseModel):
    id: str
    created_at: str
    updated_at: str
    state: IncidentState
    severity: SeverityLevel
    severity_label: SeverityLabel
    location: GeoPoint
    primary_class: DetectionClass
    confidence: float
    persistence: PersistenceInfo
    sources: List[IncidentSource]
    timeline: List[TimelineEntry]
    checklist: List[ChecklistItem]
    notes: List[IncidentNote] = []
    acknowledged_by: Optional[str] = None
    assigned_to: Optional[str] = None
    ai_summary: Optional[str] = None


# ---------- Alert ----------
class Recipient(BaseModel):
    role: Role
    group: str
    reason: str


class Alert(BaseModel):
    id: str
    incident_id: str
    priority: AlertPriority
    reason: str
    role: Role
    recipients: List[Recipient]
    title: str
    body: str
    actions: List[str]
    created_at: str


# ---------- Audit ----------
class AuditEntry(BaseModel):
    ts: str
    event: str
    incident_id: Optional[str] = None
    source: Optional[str] = None
    role: Optional[Role] = None
    extra: Optional[Dict[str, Any]] = None


# ---------- API request/response bodies ----------
class IncidentActionRequest(BaseModel):
    action: Literal[
        "acknowledge", "assign", "escalate", "verify",
        "false_positive", "resolve", "note", "checklist",
    ]
    actor: str
    role: Role
    assignee: Optional[str] = None
    text: Optional[str] = None
    key: Optional[str] = None
    done: Optional[bool] = None


class UserReportRequest(BaseModel):
    type: Literal[
        "smoke", "fire", "strong_smoke_smell",
        "blocked_road", "fallen_tree", "other",
    ]
    description: str = ""
    location: Optional[GeoPoint] = None


class TestAlertRequest(BaseModel):
    role: Role
    incident_id: Optional[str] = None


class ConfigResponse(BaseModel):
    severity_model: Dict[int, str]
    priorities: Dict[str, int]
    roles: List[Role]
    escalation: List[Dict[str, Any]]
    notification_mode: str
    persistence_seconds: float
    correlation_radius_m: float