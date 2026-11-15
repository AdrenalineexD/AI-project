"""
Wildfire Intelligence Platform — Backend
=========================================
Dual-model detector:
  • SAINet v11.1 (YOLO26m)  → smoke + fire  → incident pipeline + alerts
  • YOLOv8n (COCO, 80 cls)  → person, car, truck, bus, motorcycle,
                              bicycle, animals, etc. → situational context

SAINet source: https://github.com/AlterMundi/sai-sainet-latest
SAINet license: AGPL-3.0

Principle:
  AI SIGNAL → OBSERVATION → PERSISTENT DETECTION → INCIDENT → VERIFICATION → RESPONSE
  Never auto-confirm a wildfire. Only SAINet fire/smoke signals create incidents.
  Everything else is context.
"""
from __future__ import annotations

import asyncio
import json
import os
import time
import uuid
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Set

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from schemas import (
    Alert, AuditEntry, ChecklistItem, ConfigResponse, Detection,
    GeoPoint, Incident, IncidentActionRequest, IncidentNote,
    IncidentSource, PersistenceInfo, Recipient, TestAlertRequest,
    TimelineEntry, UserReportRequest,
)

# ---------- Paths ----------
BASE = Path(__file__).parent
DETECTIONS_FILE = BASE / "detections.json"
INCIDENTS_FILE = BASE / "incidents.json"
SAINET_WEIGHTS = BASE / "model" / "SAINet_v11.1.pt"

# ---------- Config ----------
CONFIG = {
    # SAINet detection settings (recall-first per model README)
    "SAINET_CONF": 0.25,
    "SAINET_IOU": 0.10,

    # Context model (YOLOv8n) settings
    "CONTEXT_CONF": 0.35,
    "CONTEXT_IOU": 0.5,

    # Incident pipeline thresholds
    "AI_SIGNAL_THRESHOLD": 0.25,
    "PERSISTENCE_SECONDS": 3.0,
    "CORRELATION_RADIUS_M": 2500,
    "CORRELATION_WINDOW_S": 600,
    "DEDUP_WINDOW_S": 10,
    "ALERT_COOLDOWN_S": 60,

    "ESCALATION": [
        {"t": 0,   "action": "create_incident"},
        {"t": 30,  "action": "notify_monitoring"},
        {"t": 60,  "action": "notify_operator_if_persistent"},
        {"t": 120, "action": "escalate_if_unacked"},
        {"t": 300, "action": "escalate_to_next_group"},
    ],
    "NOTIFICATION_MODE": os.environ.get("WF_NOTIF_MODE", "DEV"),
}

SEVERITY: Dict[int, str] = {
    0: "NORMAL",
    1: "AI_OBSERVATION",
    2: "PERSISTENT_DETECTION",
    3: "POTENTIAL_WILDFIRE",
    4: "VERIFIED_INCIDENT",
    5: "ACTIVE_EMERGENCY",
}

PRIORITY: Dict[str, int] = {"INFO": 0, "WARNING": 1, "HIGH": 2, "CRITICAL": 3}

ROLES = ["CITIZEN", "FIREFIGHTER", "FOREST_OFFICIAL",
         "EMERGENCY_OPERATOR", "DISASTER_MANAGER", "ADMIN", "OBSERVER"]


# =========================================================
# Time helpers
# =========================================================
def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _haversine_m(lat1, lon1, lat2, lon2) -> float:
    from math import radians, sin, cos, asin, sqrt
    R = 6371000
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    a = sin(dlat/2)**2 + cos(radians(lat1))*cos(radians(lat2))*sin(dlon/2)**2
    return 2 * R * asin(sqrt(a))


# =========================================================
# Notification providers
# =========================================================
class NotificationProvider:
    name = "base"
    async def send(self, alert: Dict[str, Any]) -> Dict[str, Any]:
        raise NotImplementedError


class DevConsoleProvider(NotificationProvider):
    name = "DEV_CONSOLE"
    async def send(self, alert: Dict[str, Any]) -> Dict[str, Any]:
        recipients = alert.get("recipients", [])
        lines = [
            "",
            "┌─── SIMULATED NOTIFICATION ─────────────────────────",
            f"│ MODE     : {CONFIG['NOTIFICATION_MODE']}",
            f"│ TITLE    : {alert.get('title')}",
            f"│ PRIORITY : {alert.get('priority')}",
            f"│ INCIDENT : {alert.get('incident_id')}",
            f"│ BODY     : {alert.get('body','')[:120]}",
            f"│ WOULD HAVE SENT TO ({len(recipients)}):",
        ]
        for r in recipients[:8]:
            lines.append(f"│    • {r.get('role')} / {r.get('group','-')}")
        if len(recipients) > 8:
            lines.append(f"│    … +{len(recipients)-8} more")
        lines.append("└────────────────────────────────────────────────────")
        print("\n".join(lines))
        return {"provider": self.name, "sent": False, "simulated": True,
                "recipient_count": len(recipients)}


class ProviderRegistry:
    def __init__(self):
        self.providers: List[NotificationProvider] = [DevConsoleProvider()]
    def add(self, p: NotificationProvider):
        self.providers.append(p)
    async def dispatch(self, alert: Dict[str, Any]) -> List[Dict[str, Any]]:
        results = []
        for p in self.providers:
            try:
                results.append(await p.send(alert))
            except Exception as e:
                results.append({"provider": p.name, "error": str(e)})
        return results


NOTIF_REGISTRY = ProviderRegistry()


# =========================================================
# State
# =========================================================
class State:
    def __init__(self):
        self.detections: List[Dict[str, Any]] = self._load(DETECTIONS_FILE)
        self.incidents: List[Dict[str, Any]] = self._load(INCIDENTS_FILE)
        self.audit: List[Dict[str, Any]] = []
        self.ws_clients: Set[WebSocket] = set()
        self.source_state: Dict[str, Dict[str, Any]] = {}
        self.simulation_task: Optional[asyncio.Task] = None

    @staticmethod
    def _load(p: Path) -> List[Dict[str, Any]]:
        try:
            return json.loads(p.read_text()) if p.exists() else []
        except Exception:
            return []

    def save(self):
        DETECTIONS_FILE.write_text(json.dumps(self.detections[-500:], indent=2))
        INCIDENTS_FILE.write_text(json.dumps(self.incidents[-200:], indent=2))

    def audit_log(self, event: str, **kw):
        entry = {"ts": _now_iso(), "event": event, **kw}
        self.audit.append(entry)
        print(f"[AUDIT] {entry['ts']}  {event}  {kw}")
        return entry


STATE = State()


# =========================================================
# Broadcast
# =========================================================
async def broadcast(event_type: str, payload: Any):
    msg = json.dumps({"type": event_type, "payload": payload, "ts": _now_iso()})
    dead = []
    for ws in list(STATE.ws_clients):
        try:
            await ws.send_text(msg)
        except Exception:
            dead.append(ws)
    for d in dead:
        STATE.ws_clients.discard(d)


# =========================================================
# Detector — dual model (SAINet + YOLOv8n)
# =========================================================
class Detector:
    """
    Two models, one frame, one merged result list.

      1. SAINet v11.1 (YOLO26m)   → smoke + fire
                                     These are the ONLY detections that
                                     feed the incident pipeline.

      2. YOLOv8n (COCO, 80 cls)   → person, car, truck, bus, motorcycle,
                                     bicycle, animals, bags, etc.
                                     These are attached to incidents as
                                     situational "context" — responders see
                                     them in the alert body.
    """

    # Which general-purpose classes to keep as context. Everything else
    # (toothbrush, hair drier, etc.) is dropped to keep the alert clean.
    CONTEXT_WHITELIST = {
        # People
        "person",
        # Vehicles
        "bicycle", "car", "motorcycle", "bus", "truck", "train", "boat",
        # Animals
        "bird", "cat", "dog", "horse", "sheep", "cow", "elephant",
        "bear", "zebra", "giraffe",
        # Items commonly carried or present at a scene
        "backpack", "umbrella", "handbag", "suitcase",
    }

    def __init__(self):
        self.fire_model = None
        self.fire_names: Dict[int, str] = {}

        self.ctx_model = None
        self.ctx_names: Dict[int, str] = {}

        # --- SAINet (fire / smoke) ---
        if not SAINET_WEIGHTS.exists():
            print(f"[SAINet] Weights not found at {SAINET_WEIGHTS}.")
        else:
            try:
                from ultralytics import YOLO
                self.fire_model = YOLO(str(SAINET_WEIGHTS))
                self.fire_names = self.fire_model.names
                print(f"[SAINet] Loaded v11.1. Classes: {self.fire_names}")
            except Exception as e:
                print(f"[SAINet] Failed to load: {e}")

        # --- YOLOv8n (context) ---
        try:
            from ultralytics import YOLO
            self.ctx_model = YOLO("yolov8n.pt")
            self.ctx_names = self.ctx_model.names
            print(f"[Context] Loaded YOLOv8n. {len(self.ctx_names)} classes.")
        except Exception as e:
            print(f"[Context] Model unavailable: {e}")

    # ---- Compatibility accessors ----
    @property
    def model(self):
        return self.fire_model

    @property
    def names(self):
        return self.fire_names

    # ------------------------------------------------------------------
    # Inference
    # ------------------------------------------------------------------
    def infer(self, img_bytes: bytes) -> List[Dict[str, Any]]:
        """
        Returns a merged list of detections. Each item has a `source`
        field:
            "sainet"   → fire / smoke  (feeds incidents)
            "context"  → people / vehicles / animals  (attached as context)
        """
        import numpy as np
        import cv2

        arr = np.frombuffer(img_bytes, dtype=np.uint8)
        frame = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        if frame is None:
            return []

        out: List[Dict[str, Any]] = []

        # ---------- SAINet: fire + smoke ----------
        if self.fire_model is not None:
            try:
                results = self.fire_model.predict(
                    frame,
                    verbose=False,
                    conf=CONFIG["SAINET_CONF"],
                    iou=CONFIG["SAINET_IOU"],
                )
                for r in results:
                    if r.boxes is None:
                        continue
                    for b in r.boxes:
                        cls = int(b.cls[0])
                        conf = float(b.conf[0])
                        raw = self.fire_names.get(cls, str(cls)).lower()
                        if raw in ("flames", "flame"):
                            label = "fire"
                        elif raw in ("smoke", "fire"):
                            label = raw
                        else:
                            continue
                        x1, y1, x2, y2 = [float(v) for v in b.xyxy[0].tolist()]
                        if x2 <= x1 or y2 <= y1:
                            continue
                        out.append({
                            "class": label,
                            "confidence": round(conf, 4),
                            "bbox": [x1, y1, x2, y2],
                            "source": "sainet",
                        })
            except Exception as e:
                print(f"[SAINet.infer] {e}")

        # ---------- YOLOv8n: context objects ----------
        if self.ctx_model is not None:
            try:
                results = self.ctx_model.predict(
                    frame,
                    verbose=False,
                    conf=CONFIG["CONTEXT_CONF"],
                    iou=CONFIG["CONTEXT_IOU"],
                )
                for r in results:
                    if r.boxes is None:
                        continue
                    for b in r.boxes:
                        cls = int(b.cls[0])
                        conf = float(b.conf[0])
                        label = self.ctx_names.get(cls, str(cls)).lower()
                        if label not in self.CONTEXT_WHITELIST:
                            continue
                        x1, y1, x2, y2 = [float(v) for v in b.xyxy[0].tolist()]
                        if x2 <= x1 or y2 <= y1:
                            continue
                        out.append({
                            "class": label,
                            "confidence": round(conf, 4),
                            "bbox": [x1, y1, x2, y2],
                            "source": "context",
                        })
            except Exception as e:
                print(f"[Context.infer] {e}")

        return out


DETECTOR = Detector()
# Backwards-compatible alias (kept for any lingering references)
SAINET = DETECTOR


# =========================================================
# Event Engine — fire/smoke only
# =========================================================
class EventEngine:
    def __init__(self):
        self._last_by_source: Dict[str, float] = defaultdict(float)

    def process(self, detections: List[Dict[str, Any]],
                source_id: str, lat: float, lon: float) -> List[Dict[str, Any]]:
        now = time.time()
        created: List[Dict[str, Any]] = []

        for d in detections:
            # ONLY SAINet fire/smoke feeds the incident pipeline.
            if d.get("source") != "sainet":
                continue
            cls = (d.get("class") or "").lower()
            if cls not in ("fire", "smoke"):
                continue
            conf = float(d.get("confidence", 0))
            if conf < CONFIG["AI_SIGNAL_THRESHOLD"]:
                continue

            key = f"{source_id}:{cls}"
            if now - self._last_by_source[key] < CONFIG["DEDUP_WINDOW_S"]:
                self._touch_persistence(source_id, cls)
                continue
            self._last_by_source[key] = now

            obs = {
                "id": str(uuid.uuid4()),
                "ts": _now_iso(),
                "source_id": source_id,
                "source_type": "camera",
                "class": cls,
                "confidence": round(conf, 4),
                "location": {"lat": lat, "lon": lon},
                "bbox": d.get("bbox"),
                "note": d.get("note"),
            }
            STATE.detections.append(obs)
            created.append(obs)
            STATE.audit_log("ai_detection_created",
                            detection_id=obs["id"], source=source_id,
                            cls=cls, confidence=obs["confidence"])
            self._touch_persistence(source_id, cls)

        return created

    def _touch_persistence(self, source_id: str, cls: str):
        key = f"{source_id}:{cls}"
        st = STATE.source_state.setdefault(key, {
            "first_seen": time.time(), "last_seen": time.time(),
            "count": 0, "persistent": False,
        })
        st["last_seen"] = time.time()
        st["count"] += 1
        if not st["persistent"] and (st["last_seen"] - st["first_seen"]) >= CONFIG["PERSISTENCE_SECONDS"]:
            st["persistent"] = True
            STATE.audit_log("persistence_confirmed", source=source_id, cls=cls,
                            duration=round(st["last_seen"] - st["first_seen"], 2))

    def persistence(self, source_id: str, cls: str) -> Dict[str, Any]:
        st = STATE.source_state.get(f"{source_id}:{cls}")
        if not st:
            return {"persistent": False, "duration": 0.0, "count": 0}
        return {"persistent": st["persistent"],
                "duration": round(st["last_seen"] - st["first_seen"], 2),
                "count": st["count"]}


EVENT_ENGINE = EventEngine()


# =========================================================
# Incident Engine
# =========================================================
class IncidentEngine:
    def __init__(self):
        # Continue the counter from the highest existing ID so we never
        # collide with persisted incidents across restarts.
        self._counter = self._highest_existing_counter()

    @staticmethod
    def _highest_existing_counter() -> int:
        highest = 0
        for inc in STATE.incidents:
            inc_id = inc.get("id", "")
            try:
                n = int(str(inc_id).rsplit("-", 1)[-1])
                if n > highest:
                    highest = n
            except Exception:
                continue
        return highest

    def _next_id(self) -> str:
        self._counter += 1
        return f"WF-{datetime.now().year}-{self._counter:05d}"

    def _find_correlated(self, obs: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        lat = obs["location"]["lat"]; lon = obs["location"]["lon"]
        now = time.time()
        best, best_dist = None, float("inf")
        for inc in STATE.incidents:
            if inc["state"] in ("RESOLVED", "FALSE_POSITIVE"):
                continue
            try:
                t0 = datetime.fromisoformat(
                    inc["created_at"].replace("Z", "+00:00")
                ).timestamp()
            except Exception:
                t0 = now
            if now - t0 > CONFIG["CORRELATION_WINDOW_S"]:
                continue
            c = inc.get("location") or {}
            if "lat" not in c or "lon" not in c:
                continue
            dist = _haversine_m(lat, lon, c["lat"], c["lon"])
            if dist <= CONFIG["CORRELATION_RADIUS_M"] and dist < best_dist:
                best, best_dist = inc, dist
        return best

    def ingest(self, obs: Dict[str, Any],
               context: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
        correlated = self._find_correlated(obs)
        if correlated:
            self._attach(correlated, obs)
            if context:
                self._merge_context(correlated, context)
            return correlated

        inc = {
            "id": self._next_id(),
            "created_at": _now_iso(),
            "updated_at": _now_iso(),
            "state": "CREATED",
            "severity": 1,
            "severity_label": SEVERITY[1],
            "location": obs["location"],
            "primary_class": obs["class"],
            "confidence": obs["confidence"],
            "persistence": {"duration": 0.0, "persistent": False, "count": 1},
            "sources": [{
                "detection_id": obs["id"], "source_id": obs["source_id"],
                "class": obs["class"], "confidence": obs["confidence"],
                "ts": obs["ts"], "relation": "primary",
            }],
            "timeline": [{"ts": obs["ts"], "event": "incident_created",
                          "detail": f"{obs['class']} from {obs['source_id']}"}],
            "checklist": self._default_checklist(),
            "notes": [],
            "context": context or [],
            "acknowledged_by": None,
            "assigned_to": None,
            "ai_summary": None,
        }
        STATE.incidents.append(inc)
        STATE.audit_log("incident_created", incident_id=inc["id"],
                        context_count=len(context or []))
        return inc

    def _attach(self, inc: Dict[str, Any], obs: Dict[str, Any]):
        if any(s["detection_id"] == obs["id"] for s in inc["sources"]):
            return
        inc["sources"].append({
            "detection_id": obs["id"], "source_id": obs["source_id"],
            "class": obs["class"], "confidence": obs["confidence"],
            "ts": obs["ts"], "relation": "corroborating",
        })
        inc["updated_at"] = _now_iso()
        inc["timeline"].append({
            "ts": obs["ts"], "event": "corroborating_detection",
            "detail": f"{obs['class']} from {obs['source_id']}",
        })
        STATE.audit_log("incident_corroborated",
                        incident_id=inc["id"], source=obs["source_id"])

    def _merge_context(self, inc: Dict[str, Any],
                       context: List[Dict[str, Any]]):
        """Union new context objects into the incident's context list."""
        existing = inc.setdefault("context", [])
        seen = {
            (c["class"], round(c["bbox"][0] / 40), round(c["bbox"][1] / 40))
            for c in existing
            if isinstance(c.get("bbox"), list) and len(c["bbox"]) == 4
        }
        added = 0
        for c in context:
            if not isinstance(c.get("bbox"), list) or len(c["bbox"]) != 4:
                continue
            key = (c["class"], round(c["bbox"][0] / 40), round(c["bbox"][1] / 40))
            if key in seen:
                continue
            existing.append(c)
            seen.add(key)
            added += 1
        if added:
            inc["updated_at"] = _now_iso()
            inc["timeline"].append({
                "ts": _now_iso(),
                "event": "context_updated",
                "detail": f"+{added} context object(s)",
            })

    def recompute_severity(self, inc: Dict[str, Any]) -> Dict[str, Any]:
        sources = inc["sources"]
        classes = {s["class"] for s in sources}
        max_conf = max((s["confidence"] for s in sources), default=0)
        distinct_sources = len({s["source_id"] for s in sources})
        persistent = inc.get("persistence", {}).get("persistent", False)

        if inc["state"] in ("RESOLVED", "FALSE_POSITIVE"):
            sev = 0
        elif inc["state"] == "VERIFIED_INCIDENT":
            sev = 4
        elif inc["state"] == "ACTIVE_EMERGENCY":
            sev = 5
        elif persistent and ("fire" in classes or max_conf >= 0.75) and distinct_sources >= 1:
            sev = 3
        elif persistent:
            sev = 2
        else:
            sev = 1

        inc["severity"] = sev
        inc["severity_label"] = SEVERITY[sev]
        inc["confidence"] = round(max_conf, 4)
        return inc

    @staticmethod
    def _default_checklist() -> List[Dict[str, Any]]:
        return [
            {"key": "detection_reviewed",    "label": "Detection reviewed",             "done": False},
            {"key": "location_verified",     "label": "Location verified",              "done": False},
            {"key": "source_camera_checked", "label": "Source camera checked",          "done": False},
            {"key": "additional_sources",    "label": "Additional sources checked",     "done": False},
            {"key": "personnel_notified",    "label": "Appropriate personnel notified", "done": False},
            {"key": "incident_acknowledged", "label": "Incident acknowledged",          "done": False},
            {"key": "procedure_reviewed",    "label": "Official procedure reviewed",    "done": False},
            {"key": "response_assigned",     "label": "Response assigned",              "done": False},
            {"key": "situation_updated",     "label": "Situation updated",              "done": False},
            {"key": "incident_resolved",     "label": "Incident resolved",              "done": False},
        ]

    def update_state(self, inc_id: str, new_state: str, actor: str = "system"):
        inc = self._get(inc_id)
        if not inc:
            return None
        inc["state"] = new_state
        inc["updated_at"] = _now_iso()
        inc["timeline"].append({"ts": _now_iso(), "event": f"state:{new_state}",
                                "detail": f"by {actor}"})
        self.recompute_severity(inc)
        STATE.audit_log("incident_state_changed",
                        incident_id=inc_id, state=new_state, actor=actor)
        return inc

    def _get(self, inc_id: str) -> Optional[Dict[str, Any]]:
        for i in STATE.incidents:
            if i["id"] == inc_id:
                return i
        return None


INCIDENT_ENGINE = IncidentEngine()


# =========================================================
# Alert Engine
# =========================================================
class AlertEngine:
    def __init__(self):
        self._sent: Dict[str, float] = {}

    def _priority_for(self, inc: Dict[str, Any]) -> str:
        return {0: "INFO", 1: "INFO", 2: "WARNING",
                3: "HIGH", 4: "CRITICAL", 5: "CRITICAL"}[inc["severity"]]

    def _recipients_for(self, inc: Dict[str, Any]) -> List[Dict[str, Any]]:
        loc = inc.get("location") or {}
        lat = loc.get("lat", 0.0); lon = loc.get("lon", 0.0)
        out = [{"role": "CITIZEN",
                "group": f"near_{round(lat,2)}_{round(lon,2)}",
                "reason": "within_alert_radius"}]
        if inc["severity"] >= 2:
            out.append({"role": "FOREST_OFFICIAL", "group": "North Region",
                        "reason": "jurisdiction_match"})
        if inc["severity"] >= 3:
            out.append({"role": "EMERGENCY_OPERATOR", "group": "Dispatch-01",
                        "reason": "escalation_policy"})
            out.append({"role": "FIREFIGHTER", "group": "Sector-4",
                        "reason": "response_assignment"})
        if inc["severity"] >= 4:
            out.append({"role": "DISASTER_MANAGER", "group": "State-Cell",
                        "reason": "verified_incident"})
        return out

    @staticmethod
    def _context_summary(inc: Dict[str, Any]) -> str:
        """One-line human-readable summary of context objects near the incident."""
        ctx = inc.get("context", [])
        if not ctx:
            return "CONTEXT: none detected"
        counts: Dict[str, int] = {}
        for c in ctx:
            cls = c.get("class")
            if not cls:
                continue
            counts[cls] = counts.get(cls, 0) + 1
        if not counts:
            return "CONTEXT: none detected"
        items = sorted(counts.items(), key=lambda kv: -kv[1])
        return "CONTEXT: " + ", ".join(f"{v}× {k}" for k, v in items)

    def _build_body(self, inc: Dict[str, Any], role: str) -> Dict[str, Any]:
        loc = inc.get("location") or {"lat": 0.0, "lon": 0.0}
        ctx_line = self._context_summary(inc)

        if role == "CITIZEN":
            return {
                "title": "⚠ Potential wildfire / smoke detected nearby",
                "body": (f"A possible wildfire or smoke event has been detected "
                         f"near your area.\n\n"
                         f"STATUS: AI DETECTION — VERIFICATION PENDING\n\n"
                         f"WHAT TO DO:\n"
                         f"• Stay away from the affected area.\n"
                         f"• Keep windows closed if smoke is present.\n"
                         f"• Follow instructions from local authorities.\n"
                         f"• Do not approach the fire to investigate.\n"
                         f"• Keep emergency routes clear."),
                "actions": ["VIEW_MAP", "SAFETY_GUIDE", "IM_SAFE", "REPORT_INFORMATION"],
                "location": loc,
            }
        if role in ("FIREFIGHTER", "FOREST_OFFICIAL", "EMERGENCY_OPERATOR",
                    "DISASTER_MANAGER", "ADMIN"):
            return {
                "title": f"🔥 {inc['severity_label'].replace('_',' ')} — {inc['id']}",
                "body": (f"INCIDENT {inc['id']}\n"
                         f"STATUS: {inc['severity_label']}\n"
                         f"LOCATION: {loc['lat']:.5f}, {loc['lon']:.5f}\n"
                         f"DETECTION: {inc['primary_class']}\n"
                         f"CONFIDENCE: {int(inc['confidence']*100)}%\n"
                         f"PERSISTENCE: {inc['persistence'].get('duration',0):.1f}s\n"
                         f"SOURCES: {len(inc['sources'])} "
                         f"(distinct {len({s['source_id'] for s in inc['sources']})})\n"
                         f"{ctx_line}\n"
                         f"\nFOLLOW YOUR AGENCY'S INCIDENT COMMAND PROCEDURES."),
                "actions": ["ACKNOWLEDGE", "OPEN_RESPONSE_VIEW", "OPEN_INCIDENT_MAP"],
                "location": loc,
            }
        return {
            "title": f"Incident update: {inc['id']}",
            "body": (f"State: {inc['state']}  Severity: {inc['severity_label']}\n"
                     f"{ctx_line}"),
            "actions": ["OPEN"],
            "location": loc,
        }

    async def dispatch_for(self, inc: Dict[str, Any], reason: str = "state_change"):
        priority = self._priority_for(inc)
        key = f"{inc['id']}:{priority}"
        now = time.time()
        cooldown = CONFIG["ALERT_COOLDOWN_S"]
        if key in self._sent and now - self._sent[key] < cooldown:
            return {"deduped": True, "priority": priority}
        self._sent[key] = now

        recipients = self._recipients_for(inc)
        grouped: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
        for r in recipients:
            grouped[r["role"]].append(r)

        results = []
        for role, recs in grouped.items():
            content = self._build_body(inc, role)
            alert = {
                "id": str(uuid.uuid4()),
                "incident_id": inc["id"],
                "priority": priority,
                "reason": reason,
                "role": role,
                "recipients": recs,
                "title": content["title"],
                "body": content["body"],
                "actions": content["actions"],
                "created_at": _now_iso(),
            }
            await broadcast("alert", alert)
            provider_results = await NOTIF_REGISTRY.dispatch(alert)
            results.append({"role": role, "alert_id": alert["id"],
                            "priority": priority,
                            "providers": provider_results})
            STATE.audit_log("alert_dispatched",
                            incident_id=inc["id"], role=role,
                            priority=priority, reason=reason)

        return {"deduped": False, "priority": priority, "dispatches": results}


ALERT_ENGINE = AlertEngine()


# =========================================================
# Escalation
# =========================================================
async def escalation_loop(inc_id: str):
    try:
        prev_t = 0
        for step in CONFIG["ESCALATION"]:
            delta = step["t"] - prev_t
            prev_t = step["t"]
            if delta > 0:
                await asyncio.sleep(delta)
            inc = INCIDENT_ENGINE._get(inc_id)
            if not inc or inc["state"] in ("RESOLVED", "FALSE_POSITIVE", "ACKNOWLEDGED"):
                return
            action = step["action"]
            if action == "notify_monitoring":
                await ALERT_ENGINE.dispatch_for(inc, reason="t+30 monitoring")
            elif action == "notify_operator_if_persistent" and inc["persistence"].get("persistent"):
                await ALERT_ENGINE.dispatch_for(inc, reason="t+60 persistent")
            elif action == "escalate_if_unacked":
                if not inc.get("acknowledged_by"):
                    INCIDENT_ENGINE.update_state(inc_id, "ESCALATED", actor="system")
                    await broadcast("incident", inc)
            elif action == "escalate_to_next_group":
                if not inc.get("acknowledged_by"):
                    await ALERT_ENGINE.dispatch_for(inc, reason="t+300 escalation")
    except asyncio.CancelledError:
        return


# =========================================================
# FastAPI
# =========================================================
app = FastAPI(title="Wildfire Intelligence Platform")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"],
)


@app.get("/api/health")
async def health():
    return {
        "ok": True,
        "notification_mode": CONFIG["NOTIFICATION_MODE"],
        "model_loaded": DETECTOR.fire_model is not None,
        "model_classes": DETECTOR.fire_names,
        "context_model_loaded": DETECTOR.ctx_model is not None,
        "context_class_count": len(DETECTOR.ctx_names) if DETECTOR.ctx_model else 0,
    }


@app.get("/api/config", response_model=ConfigResponse)
async def get_config():
    return {
        "severity_model": SEVERITY,
        "priorities": PRIORITY,
        "roles": ROLES,
        "escalation": CONFIG["ESCALATION"],
        "notification_mode": CONFIG["NOTIFICATION_MODE"],
        "persistence_seconds": CONFIG["PERSISTENCE_SECONDS"],
        "correlation_radius_m": CONFIG["CORRELATION_RADIUS_M"],
    }


@app.post("/api/frame")
async def ingest_frame(
    file: UploadFile = File(...),
    lat: float = Form(0.0),
    lon: float = Form(0.0),
    source_id: str = Form("CAMERA-001"),
):
    img_bytes = await file.read()
    detections = DETECTOR.infer(img_bytes)

    # Split detections: incident signals vs. situational context.
    fire_smoke = [d for d in detections if d.get("source") == "sainet"]
    context    = [d for d in detections if d.get("source") == "context"]

    observations = EVENT_ENGINE.process(fire_smoke, source_id, lat, lon)
    incidents_touched = []
    for obs in observations:
        inc = INCIDENT_ENGINE.ingest(obs, context=context)
        pers = EVENT_ENGINE.persistence(obs["source_id"], obs["class"])
        inc["persistence"] = pers
        INCIDENT_ENGINE.recompute_severity(inc)
        inc["updated_at"] = _now_iso()
        incidents_touched.append(inc)

    # Broadcast everything so the overlay draws all boxes.
    if detections:
        await broadcast("detections", detections)
    for inc in incidents_touched:
        await broadcast("incident", inc)
        await ALERT_ENGINE.dispatch_for(inc, reason="observation")

    STATE.save()
    return {
        "detections": detections,       # all boxes (fire/smoke + context)
        "observations": observations,   # fire/smoke only
        "context": context,             # people/cars/etc. this frame
        "incidents": incidents_touched,
    }


@app.get("/api/incidents", response_model=List[Incident])
async def list_incidents():
    return sorted(STATE.incidents, key=lambda i: i["created_at"], reverse=True)


@app.get("/api/incidents/{inc_id}", response_model=Incident)
async def get_incident(inc_id: str):
    inc = INCIDENT_ENGINE._get(inc_id)
    if not inc:
        return JSONResponse({"error": "not found"}, status_code=404)
    return inc


@app.post("/api/incidents/{inc_id}/action", response_model=Incident)
async def incident_action(inc_id: str, body: IncidentActionRequest):
    inc = INCIDENT_ENGINE._get(inc_id)
    if not inc:
        return JSONResponse({"error": "not found"}, status_code=404)

    action = body.action
    actor = body.actor
    role = body.role

    if action == "acknowledge":
        inc["acknowledged_by"] = actor
        INCIDENT_ENGINE.update_state(inc_id, "ACKNOWLEDGED", actor=actor)
    elif action == "assign":
        inc["assigned_to"] = body.assignee or actor
        inc["timeline"].append({"ts": _now_iso(), "event": "assigned",
                                "detail": f"to {inc['assigned_to']}"})
    elif action == "escalate":
        if role not in ("EMERGENCY_OPERATOR", "ADMIN", "DISASTER_MANAGER"):
            return JSONResponse({"error": "unauthorized"}, status_code=403)
        INCIDENT_ENGINE.update_state(inc_id, "ESCALATED", actor=actor)
    elif action == "verify":
        if role not in ("FOREST_OFFICIAL", "EMERGENCY_OPERATOR",
                        "ADMIN", "DISASTER_MANAGER"):
            return JSONResponse({"error": "unauthorized"}, status_code=403)
        INCIDENT_ENGINE.update_state(inc_id, "VERIFIED_INCIDENT", actor=actor)
        await ALERT_ENGINE.dispatch_for(inc, reason="verified")
    elif action == "false_positive":
        INCIDENT_ENGINE.update_state(inc_id, "FALSE_POSITIVE", actor=actor)
    elif action == "resolve":
        INCIDENT_ENGINE.update_state(inc_id, "RESOLVED", actor=actor)
        await ALERT_ENGINE.dispatch_for(inc, reason="resolved")
    elif action == "note":
        inc["notes"].append({"ts": _now_iso(), "actor": actor,
                             "text": body.text or ""})
    elif action == "checklist":
        for c in inc["checklist"]:
            if c["key"] == body.key:
                c["done"] = bool(body.done)
                break
    else:
        return JSONResponse({"error": f"unknown action {action}"}, status_code=400)

    STATE.save()
    await broadcast("incident", inc)
    return inc


@app.post("/api/reports")
async def submit_report(body: UserReportRequest):
    report = {
        "id": str(uuid.uuid4()),
        "ts": _now_iso(),
        "type": body.type,
        "description": body.description,
        "location": body.location.model_dump() if body.location else None,
        "source": "USER_REPORT",
        "verified": False,
    }
    STATE.detections.append({
        "id": report["id"], "ts": report["ts"], "source_id": "USER_REPORT",
        "source_type": "user", "class": report["type"],
        "confidence": 0.0,
        "location": report["location"] or {"lat": 0, "lon": 0},
        "note": report["description"],
    })
    STATE.audit_log("user_report_submitted", report_id=report["id"],
                    rtype=report["type"])
    await broadcast("user_report", report)
    STATE.save()
    return report


@app.get("/api/audit", response_model=List[AuditEntry])
async def get_audit(limit: int = 200):
    return STATE.audit[-limit:]


@app.post("/api/admin/test-alert")
async def test_alert(body: TestAlertRequest):
    if body.role != "ADMIN":
        return JSONResponse({"error": "admin only"}, status_code=403)
    inc = INCIDENT_ENGINE._get(body.incident_id) if body.incident_id else None
    if not inc:
        inc = {
            "id": "WF-TEST-00001", "severity": 3,
            "severity_label": "POTENTIAL_WILDFIRE",
            "location": {"lat": 19.076, "lon": 72.8777},
            "primary_class": "smoke", "confidence": 0.87,
            "persistence": {"duration": 5.2, "persistent": True, "count": 5},
            "sources": [{"source_id": "CAMERA-TEST", "class": "smoke",
                         "confidence": 0.87, "ts": _now_iso(),
                         "relation": "primary", "detection_id": "t"}],
            "context": [
                {"class": "person", "confidence": 0.91,
                 "bbox": [100, 100, 240, 400], "source": "context"},
                {"class": "car", "confidence": 0.88,
                 "bbox": [400, 200, 600, 380], "source": "context"},
            ],
        }
    result = await ALERT_ENGINE.dispatch_for(inc, reason="admin_test")
    return {"test_mode": True,
            "note": "Simulated — no real emergency contacts were made.",
            "result": result}


@app.websocket("/ws")
async def ws_endpoint(ws: WebSocket):
    await ws.accept()
    STATE.ws_clients.add(ws)
    try:
        await ws.send_text(json.dumps({
            "type": "snapshot",
            "payload": {
                "incidents": STATE.incidents[-50:],
                "audit": STATE.audit[-50:],
                "config": {"severity_model": SEVERITY,
                           "notification_mode": CONFIG["NOTIFICATION_MODE"]},
            },
            "ts": _now_iso(),
        }))
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        STATE.ws_clients.discard(ws)


# =========================================================
# Simulation
# =========================================================
async def run_simulation():
    try:
        await broadcast("simulation", {"status": "started", "ts": _now_iso()})
        print("\n=== SIMULATION START ===")

        lat, lon = 19.0760, 72.8777
        source = "CAMERA-SIM-01"

        sim_context = [
            {"class": "person", "confidence": 0.91,
             "bbox": [120.0, 90.0, 260.0, 420.0], "source": "context"},
            {"class": "car", "confidence": 0.86,
             "bbox": [430.0, 200.0, 620.0, 380.0], "source": "context"},
        ]

        for i in range(6):
            obs_det = {
                "id": str(uuid.uuid4()), "ts": _now_iso(),
                "source_id": source, "source_type": "camera",
                "class": "smoke", "confidence": 0.82 + i*0.02,
                "location": {"lat": lat, "lon": lon},
                "bbox": [40.0, 40.0, 600.0, 440.0], "note": "simulation",
            }
            STATE.detections.append(obs_det)
            EVENT_ENGINE._touch_persistence(source, "smoke")
            inc = INCIDENT_ENGINE.ingest(obs_det, context=sim_context)
            pers = EVENT_ENGINE.persistence(source, "smoke")
            inc["persistence"] = pers
            INCIDENT_ENGINE.recompute_severity(inc)
            inc["updated_at"] = _now_iso()
            await broadcast("detections", [obs_det])
            await broadcast("incident", inc)
            if i == 2:
                await ALERT_ENGINE.dispatch_for(inc, reason="simulation_early")
            if i == 5:
                await ALERT_ENGINE.dispatch_for(inc, reason="simulation_persistent")
                asyncio.create_task(escalation_loop(inc["id"]))
            await asyncio.sleep(1.2)

        await asyncio.sleep(2)
        obs2 = {
            "id": str(uuid.uuid4()), "ts": _now_iso(),
            "source_id": "CAMERA-SIM-02", "source_type": "camera",
            "class": "fire", "confidence": 0.79,
            "location": {"lat": lat + 0.002, "lon": lon + 0.001},
            "bbox": [80.0, 60.0, 560.0, 400.0], "note": "simulation corroboration",
        }
        STATE.detections.append(obs2)
        inc = INCIDENT_ENGINE.ingest(obs2, context=sim_context)
        INCIDENT_ENGINE.recompute_severity(inc)
        await broadcast("detections", [obs2])
        await broadcast("incident", inc)
        await ALERT_ENGINE.dispatch_for(inc, reason="corroboration")

        await broadcast("simulation", {"status": "completed", "ts": _now_iso()})
        STATE.save()
        print("=== SIMULATION COMPLETE ===\n")
    except asyncio.CancelledError:
        return
    except Exception as e:
        print(f"[SIMULATION ERROR] {e}")


@app.post("/api/simulation/start")
async def start_simulation():
    if STATE.simulation_task and not STATE.simulation_task.done():
        return {"status": "already_running"}
    STATE.simulation_task = asyncio.create_task(run_simulation())
    return {"status": "started"}


@app.post("/api/simulation/stop")
async def stop_simulation():
    if STATE.simulation_task:
        STATE.simulation_task.cancel()
    return {"status": "stopped"}


# =========================================================
# Entry
# =========================================================
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)