// """
// Wildfire Intelligence Platform — Backend
// =========================================
// Contains:
//   • SAINet detector (YOLOv8 wrapper + heuristic fallback)
//   • Event Engine (persistence, dedup)
//   • Incident Engine (severity model, correlation)
//   • Alert Engine (role-based, priority, dedup)
//   • Notification abstraction (Dev / Console)
//   • WebSocket broadcast
//   • REST API (typed via Pydantic)

// Principle:
//   AI SIGNAL → OBSERVATION → PERSISTENT DETECTION → INCIDENT → VERIFICATION → RESPONSE
//   Never auto-confirm a wildfire.
// """
// from __future__ import annotations

// import asyncio
// import json
// import os
// import time
// import uuid
// from collections import defaultdict
// from datetime import datetime, timezone
// from pathlib import Path
// from typing import Any, Dict, List, Optional, Set

// from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File, Form
// from fastapi.middleware.cors import CORSMiddleware
// from fastapi.responses import JSONResponse

// from schemas import (
//     Alert, AuditEntry, ChecklistItem, ConfigResponse, Detection,
//     GeoPoint, Incident, IncidentActionRequest, IncidentNote,
//     IncidentSource, PersistenceInfo, Recipient, TestAlertRequest,
//     TimelineEntry, UserReportRequest,
// )

// # ---------- Paths ----------
// BASE = Path(__file__).parent
// DETECTIONS_FILE = BASE / "detections.json"
// INCIDENTS_FILE = BASE / "incidents.json"

// # ---------- Config ----------
// CONFIG = {
//     "AI_SIGNAL_THRESHOLD": 0.35,
//     "PERSISTENCE_SECONDS": 3.0,
//     "CORRELATION_RADIUS_M": 2500,
//     "CORRELATION_WINDOW_S": 600,
//     "DEDUP_WINDOW_S": 30,
//     "ALERT_COOLDOWN_S": 60,
//     "ESCALATION": [
//         {"t": 0,   "action": "create_incident"},
//         {"t": 30,  "action": "notify_monitoring"},
//         {"t": 60,  "action": "notify_operator_if_persistent"},
//         {"t": 120, "action": "escalate_if_unacked"},
//         {"t": 300, "action": "escalate_to_next_group"},
//     ],
//     "NOTIFICATION_MODE": os.environ.get("WF_NOTIF_MODE", "DEV"),
// }

// SEVERITY: Dict[int, str] = {
//     0: "NORMAL",
//     1: "AI_OBSERVATION",
//     2: "PERSISTENT_DETECTION",
//     3: "POTENTIAL_WILDFIRE",
//     4: "VERIFIED_INCIDENT",
//     5: "ACTIVE_EMERGENCY",
// }

// PRIORITY: Dict[str, int] = {"INFO": 0, "WARNING": 1, "HIGH": 2, "CRITICAL": 3}

// ROLES = ["CITIZEN", "FIREFIGHTER", "FOREST_OFFICIAL",
//          "EMERGENCY_OPERATOR", "DISASTER_MANAGER", "ADMIN", "OBSERVER"]


// # =========================================================
// # Time helpers
// # =========================================================
// def _now_iso() -> str:
//     return datetime.now(timezone.utc).isoformat()


// def _haversine_m(lat1, lon1, lat2, lon2) -> float:
//     from math import radians, sin, cos, asin, sqrt
//     R = 6371000
//     dlat = radians(lat2 - lat1)
//     dlon = radians(lon2 - lon1)
//     a = sin(dlat/2)**2 + cos(radians(lat1))*cos(radians(lat2))*sin(dlon/2)**2
//     return 2 * R * asin(sqrt(a))


// # =========================================================
// # Notification providers
// # =========================================================
// class NotificationProvider:
//     name = "base"
//     async def send(self, alert: Dict[str, Any]) -> Dict[str, Any]:
//         raise NotImplementedError


// class DevConsoleProvider(NotificationProvider):
//     name = "DEV_CONSOLE"
//     async def send(self, alert: Dict[str, Any]) -> Dict[str, Any]:
//         recipients = alert.get("recipients", [])
//         lines = [
//             "",
//             "┌─── SIMULATED NOTIFICATION ─────────────────────────",
//             f"│ MODE     : {CONFIG['NOTIFICATION_MODE']}",
//             f"│ TITLE    : {alert.get('title')}",
//             f"│ PRIORITY : {alert.get('priority')}",
//             f"│ INCIDENT : {alert.get('incident_id')}",
//             f"│ BODY     : {alert.get('body','')[:120]}",
//             f"│ WOULD HAVE SENT TO ({len(recipients)}):",
//         ]
//         for r in recipients[:8]:
//             lines.append(f"│    • {r.get('role')} / {r.get('group','-')}")
//         if len(recipients) > 8:
//             lines.append(f"│    … +{len(recipients)-8} more")
//         lines.append("└────────────────────────────────────────────────────")
//         print("\n".join(lines))
//         return {"provider": self.name, "sent": False, "simulated": True,
//                 "recipient_count": len(recipients)}


// class ProviderRegistry:
//     def __init__(self):
//         self.providers: List[NotificationProvider] = [DevConsoleProvider()]
//     def add(self, p: NotificationProvider):
//         self.providers.append(p)
//     async def dispatch(self, alert: Dict[str, Any]) -> List[Dict[str, Any]]:
//         results = []
//         for p in self.providers:
//             try:
//                 results.append(await p.send(alert))
//             except Exception as e:
//                 results.append({"provider": p.name, "error": str(e)})
//         return results


// NOTIF_REGISTRY = ProviderRegistry()
// # Future: NOTIF_REGISTRY.add(WebPushProvider()); MobilePushProvider(); SMSProvider()...


// # =========================================================
// # State
// # =========================================================
// class State:
//     def __init__(self):
//         self.detections: List[Dict[str, Any]] = self._load(DETECTIONS_FILE)
//         self.incidents: List[Dict[str, Any]] = self._load(INCIDENTS_FILE)
//         self.audit: List[Dict[str, Any]] = []
//         self.ws_clients: Set[WebSocket] = set()
//         self.source_state: Dict[str, Dict[str, Any]] = {}
//         self.simulation_task: Optional[asyncio.Task] = None

//     @staticmethod
//     def _load(p: Path) -> List[Dict[str, Any]]:
//         try:
//             return json.loads(p.read_text()) if p.exists() else []
//         except Exception:
//             return []

//     def save(self):
//         DETECTIONS_FILE.write_text(json.dumps(self.detections[-500:], indent=2))
//         INCIDENTS_FILE.write_text(json.dumps(self.incidents[-200:], indent=2))

//     def audit_log(self, event: str, **kw):
//         entry = {"ts": _now_iso(), "event": event, **kw}
//         self.audit.append(entry)
//         print(f"[AUDIT] {entry['ts']}  {event}  {kw}")
//         return entry


// STATE = State()


// # =========================================================
// # Broadcast
// # =========================================================
// async def broadcast(event_type: str, payload: Any):
//     msg = json.dumps({"type": event_type, "payload": payload, "ts": _now_iso()})
//     dead = []
//     for ws in list(STATE.ws_clients):
//         try:
//             await ws.send_text(msg)
//         except Exception:
//             dead.append(ws)
//     for d in dead:
//         STATE.ws_clients.discard(d)


// # =========================================================
// # SAINet
// # =========================================================
// class SAINet:
//     def __init__(self):
//         self.model = None
//         self.names: Dict[int, str] = {}
//         try:
//             from ultralytics import YOLO
//             self.model = YOLO("yolov8n.pt")
//             self.names = self.model.names
//             print("[SAINet] YOLOv8 loaded.")
//         except Exception as e:
//             print(f"[SAINet] Model unavailable ({e}); using heuristic fallback.")

//     def infer(self, img_bytes: bytes) -> List[Dict[str, Any]]:
//         import numpy as np
//         import cv2
//         arr = np.frombuffer(img_bytes, dtype=np.uint8)
//         frame = cv2.imdecode(arr, cv2.IMREAD_COLOR)
//         if frame is None:
//             return []
//         if self.model is None:
//             return self._heuristic(frame)

//         results = self.model.predict(frame, verbose=False, conf=0.25)
//         out: List[Dict[str, Any]] = []
//         for r in results:
//             for b in r.boxes:
//                 cls = int(b.cls[0]); conf = float(b.conf[0])
//                 label = self.names.get(cls, str(cls))
//                 out.append({"class": label, "confidence": conf,
//                             "bbox": [float(x) for x in b.xyxy[0].tolist()]})
//         out.extend(self._heuristic(frame))
//         return [d for d in out if d["class"] in ("smoke", "fire") or d["confidence"] >= 0.5]

// #     @staticmethod
// #     def _heuristic(frame) -> List[Dict[str, Any]]:
// #         import cv2
// #         import numpy as np
// #         hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
// #         fire = cv2.inRange(hsv, (5, 120, 180), (35, 255, 255))
// #         smoke = cv2.inRange(hsv, (0, 0, 90), (180, 60, 230))
// #         def score(mask, label):
// #             ratio = float(np.count_nonzero(mask)) / mask.size
// #             if ratio < 0.01:
// #                 return None
// #             conf = min(0.95, 0.30 + ratio * 8)
// #             return {"class": label, "confidence": conf,
// #                     "bbox": [0, 0, frame.shape[1], frame.shape[0]],
// #                     "note": "colour-heuristic"}
// #         return [s for s in (score(fire, "fire"), score(smoke, "smoke")) if s]

//     @staticmethod
//     def _heuristic(frame) -> List[Dict[str, Any]]:
//         """
//         Colour-based fire/smoke detector.

//         Fires when a reasonably large, strongly coloured region is present:
//         - fire  : saturated orange/yellow, bright
//         - smoke : dark, low-saturation, greyish
//         Requires ≥ 1.5% of the frame for fire, ≥ 5% for smoke. Also drops
//         shapes with extreme aspect ratios (thin lines / long strips).
//         """
//         import cv2
//         import numpy as np

//         h, w = frame.shape[:2]
//         frame_area = float(h * w)
//         hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)

//         # Fire: orange/yellow, saturated, bright.
//         # Slightly looser than the strict version so a lighter flame is caught,
//         # but still requires real saturation (S ≥ 140) so pale walls don't fire.
//         fire_mask = cv2.inRange(hsv, (5, 140, 180), (35, 255, 255))

//         # Smoke: dark grey. Value range 30–150 catches real smoke plumes,
//         # but a bright wall (V > 170) still fails.
//         smoke_mask = cv2.inRange(hsv, (0, 0, 30), (180, 60, 150))

//         out: List[Dict[str, Any]] = []

//         def blobs(mask, label: str, min_ratio: float):
//             # Clean up the mask so we get solid blobs, not speckles
//             kernel = np.ones((5, 5), np.uint8)
//             mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)
//             mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)

//             n, _, stats, _ = cv2.connectedComponentsWithStats(mask, 8)
//             results: List[Dict[str, Any]] = []
//             for i in range(1, n):  # skip index 0 (background)
//                 x, y, bw, bh, area = stats[i]
//                 ratio = area / frame_area
//                 if ratio < min_ratio:
//                     continue

//                 # Reject shapes that are too thin or too wide
//                 aspect = bw / max(1, bh)
//                 if aspect < 0.15 or aspect > 6.0:
//                     continue

//                 # Confidence scales with the size of the blob
//                 conf = min(0.95, 0.30 + ratio * 6)

//                 results.append({
//                     "class": label,
//                     "confidence": conf,
//                     "bbox": [float(x), float(y), float(x + bw), float(y + bh)],
//                     "note": "colour-heuristic",
//                     "source": "heuristic",
//                 })
//             return results

//         out.extend(blobs(fire_mask, "fire", 0.015))
//         out.extend(blobs(smoke_mask, "smoke", 0.05))
//         return out
// SAINET = SAINet()


// # =========================================================
// # Event Engine
// # =========================================================
// class EventEngine:
//     def __init__(self):
//         self._last_by_source: Dict[str, float] = defaultdict(float)

//     def process(self, detections: List[Dict[str, Any]],
//                 source_id: str, lat: float, lon: float) -> List[Dict[str, Any]]:
//         now = time.time()
//         created: List[Dict[str, Any]] = []
//         # Per-class thresholds. Heuristic fire/smoke must be very strong
// # to become an incident; otherwise only YOLO detections count.
//         CLASS_THRESHOLDS = {
//             "fire":  0.55,
//             "smoke": 0.65,
//         }
//         DEFAULT_THRESHOLD = CONFIG["AI_SIGNAL_THRESHOLD"]

//         for d in detections:
//             conf = float(d.get("confidence", 0))
//             cls = d.get("class", "").lower()
//             # skip everything except fire / smoke for the incident pipeline
//             if cls not in ("fire", "smoke"):
//                 continue
//             threshold = CLASS_THRESHOLDS.get(cls, DEFAULT_THRESHOLD)
//             if conf < threshold:
//                 continue
//             key = f"{source_id}:{d['class']}"
//             if now - self._last_by_source[key] < CONFIG["DEDUP_WINDOW_S"]:
//                 self._touch_persistence(source_id, d["class"])
//                 continue
//             self._last_by_source[key] = now

//             obs = {
//                 "id": str(uuid.uuid4()),
//                 "ts": _now_iso(),
//                 "source_id": source_id,
//                 "source_type": "camera",
//                 "class": d["class"],
//                 "confidence": round(conf, 3),
//                 "location": {"lat": lat, "lon": lon},
//                 "bbox": d.get("bbox"),
//                 "note": d.get("note"),
//             }
//             STATE.detections.append(obs)
//             created.append(obs)
//             STATE.audit_log("ai_detection_created",
//                             detection_id=obs["id"], source=source_id,
//                             cls=d["class"], confidence=obs["confidence"])
//             self._touch_persistence(source_id, d["class"])
//         return created

//     def _touch_persistence(self, source_id: str, cls: str):
//         key = f"{source_id}:{cls}"
//         st = STATE.source_state.setdefault(key, {
//             "first_seen": time.time(), "last_seen": time.time(),
//             "count": 0, "persistent": False,
//         })
//         st["last_seen"] = time.time()
//         st["count"] += 1
//         if not st["persistent"] and (st["last_seen"] - st["first_seen"]) >= CONFIG["PERSISTENCE_SECONDS"]:
//             st["persistent"] = True
//             STATE.audit_log("persistence_confirmed", source=source_id, cls=cls,
//                             duration=round(st["last_seen"] - st["first_seen"], 2))

//     def persistence(self, source_id: str, cls: str) -> Dict[str, Any]:
//         st = STATE.source_state.get(f"{source_id}:{cls}")
//         if not st:
//             return {"persistent": False, "duration": 0.0, "count": 0}
//         return {"persistent": st["persistent"],
//                 "duration": round(st["last_seen"] - st["first_seen"], 2),
//                 "count": st["count"]}


// EVENT_ENGINE = EventEngine()


// # =========================================================
// # Incident Engine
// # =========================================================
// class IncidentEngine:
//     def __init__(self):
//         self._counter = 0

//     def _next_id(self) -> str:
//         self._counter += 1
//         return f"WF-{datetime.now().year}-{self._counter:05d}"

//     def _find_correlated(self, obs: Dict[str, Any]) -> Optional[Dict[str, Any]]:
//         lat = obs["location"]["lat"]; lon = obs["location"]["lon"]
//         now = time.time()
//         best, best_dist = None, float("inf")
//         for inc in STATE.incidents:
//             if inc["state"] in ("RESOLVED", "FALSE_POSITIVE"):
//                 continue
//             try:
//                 t0 = datetime.fromisoformat(
//                     inc["created_at"].replace("Z", "+00:00")
//                 ).timestamp()
//             except Exception:
//                 t0 = now
//             if now - t0 > CONFIG["CORRELATION_WINDOW_S"]:
//                 continue
//             c = inc["location"]
//             dist = _haversine_m(lat, lon, c["lat"], c["lon"])
//             if dist <= CONFIG["CORRELATION_RADIUS_M"] and dist < best_dist:
//                 best, best_dist = inc, dist
//         return best

//     def ingest(self, obs: Dict[str, Any]) -> Dict[str, Any]:
//         correlated = self._find_correlated(obs)
//         if correlated:
//             self._attach(correlated, obs)
//             return correlated

//         inc = {
//             "id": self._next_id(),
//             "created_at": _now_iso(),
//             "updated_at": _now_iso(),
//             "state": "CREATED",
//             "severity": 1,
//             "severity_label": SEVERITY[1],
//             "location": obs["location"],
//             "primary_class": obs["class"],
//             "confidence": obs["confidence"],
//             "persistence": {"duration": 0.0, "persistent": False, "count": 1},
//             "sources": [{
//                 "detection_id": obs["id"], "source_id": obs["source_id"],
//                 "class": obs["class"], "confidence": obs["confidence"],
//                 "ts": obs["ts"], "relation": "primary",
//             }],
//             "timeline": [{"ts": obs["ts"], "event": "incident_created",
//                           "detail": f"{obs['class']} from {obs['source_id']}"}],
//             "checklist": self._default_checklist(),
//             "notes": [],
//             "acknowledged_by": None,
//             "assigned_to": None,
//             "ai_summary": None,
//         }
//         STATE.incidents.append(inc)
//         STATE.audit_log("incident_created", incident_id=inc["id"])
//         return inc

//     def _attach(self, inc: Dict[str, Any], obs: Dict[str, Any]):
//         if any(s["detection_id"] == obs["id"] for s in inc["sources"]):
//             return
//         inc["sources"].append({
//             "detection_id": obs["id"], "source_id": obs["source_id"],
//             "class": obs["class"], "confidence": obs["confidence"],
//             "ts": obs["ts"], "relation": "corroborating",
//         })
//         inc["updated_at"] = _now_iso()
//         inc["timeline"].append({
//             "ts": obs["ts"], "event": "corroborating_detection",
//             "detail": f"{obs['class']} from {obs['source_id']}",
//         })
//         STATE.audit_log("incident_corroborated",
//                         incident_id=inc["id"], source=obs["source_id"])

//     def recompute_severity(self, inc: Dict[str, Any]) -> Dict[str, Any]:
//         sources = inc["sources"]
//         classes = {s["class"] for s in sources}
//         max_conf = max((s["confidence"] for s in sources), default=0)
//         distinct_sources = len({s["source_id"] for s in sources})
//         persistent = inc.get("persistence", {}).get("persistent", False)

//         if inc["state"] in ("RESOLVED", "FALSE_POSITIVE"):
//             sev = 0
//         elif inc["state"] == "VERIFIED_INCIDENT":
//             sev = 4
//         elif inc["state"] == "ACTIVE_EMERGENCY":
//             sev = 5
//         elif persistent and ("fire" in classes or max_conf >= 0.75) and distinct_sources >= 1:
//             sev = 3
//         elif persistent:
//             sev = 2
//         else:
//             sev = 1

//         inc["severity"] = sev
//         inc["severity_label"] = SEVERITY[sev]
//         inc["confidence"] = round(max_conf, 3)
//         return inc

//     @staticmethod
//     def _default_checklist() -> List[Dict[str, Any]]:
//         return [
//             {"key": "detection_reviewed",    "label": "Detection reviewed",             "done": False},
//             {"key": "location_verified",     "label": "Location verified",              "done": False},
//             {"key": "source_camera_checked", "label": "Source camera checked",          "done": False},
//             {"key": "additional_sources",    "label": "Additional sources checked",     "done": False},
//             {"key": "personnel_notified",    "label": "Appropriate personnel notified", "done": False},
//             {"key": "incident_acknowledged", "label": "Incident acknowledged",          "done": False},
//             {"key": "procedure_reviewed",    "label": "Official procedure reviewed",    "done": False},
//             {"key": "response_assigned",     "label": "Response assigned",              "done": False},
//             {"key": "situation_updated",     "label": "Situation updated",              "done": False},
//             {"key": "incident_resolved",     "label": "Incident resolved",              "done": False},
//         ]

//     def update_state(self, inc_id: str, new_state: str, actor: str = "system"):
//         inc = self._get(inc_id)
//         if not inc:
//             return None
//         inc["state"] = new_state
//         inc["updated_at"] = _now_iso()
//         inc["timeline"].append({"ts": _now_iso(), "event": f"state:{new_state}",
//                                 "detail": f"by {actor}"})
//         self.recompute_severity(inc)
//         STATE.audit_log("incident_state_changed",
//                         incident_id=inc_id, state=new_state, actor=actor)
//         return inc

//     def _get(self, inc_id: str) -> Optional[Dict[str, Any]]:
//         for i in STATE.incidents:
//             if i["id"] == inc_id:
//                 return i
//         return None


// INCIDENT_ENGINE = IncidentEngine()


// # =========================================================
// # Alert Engine
// # =========================================================
// class AlertEngine:
//     def __init__(self):
//         self._sent: Dict[str, float] = {}

//     def _priority_for(self, inc: Dict[str, Any]) -> str:
//         return {0: "INFO", 1: "INFO", 2: "WARNING",
//                 3: "HIGH", 4: "CRITICAL", 5: "CRITICAL"}[inc["severity"]]

//     def _recipients_for(self, inc: Dict[str, Any]) -> List[Dict[str, Any]]:
//         lat, lon = inc["location"]["lat"], inc["location"]["lon"]
//         out = [{"role": "CITIZEN",
//                 "group": f"near_{round(lat,2)}_{round(lon,2)}",
//                 "reason": "within_alert_radius"}]
//         if inc["severity"] >= 2:
//             out.append({"role": "FOREST_OFFICIAL", "group": "North Region",
//                         "reason": "jurisdiction_match"})
//         if inc["severity"] >= 3:
//             out.append({"role": "EMERGENCY_OPERATOR", "group": "Dispatch-01",
//                         "reason": "escalation_policy"})
//             out.append({"role": "FIREFIGHTER", "group": "Sector-4",
//                         "reason": "response_assignment"})
//         if inc["severity"] >= 4:
//             out.append({"role": "DISASTER_MANAGER", "group": "State-Cell",
//                         "reason": "verified_incident"})
//         return out

//     def _build_body(self, inc: Dict[str, Any], role: str) -> Dict[str, Any]:
//         loc = inc["location"]
//         if role == "CITIZEN":
//             return {
//                 "title": "⚠ Potential wildfire / smoke detected nearby",
//                 "body": (f"A possible wildfire or smoke event has been detected "
//                          f"near your area.\n\n"
//                          f"STATUS: AI DETECTION — VERIFICATION PENDING\n\n"
//                          f"WHAT TO DO:\n"
//                          f"• Stay away from the affected area.\n"
//                          f"• Keep windows closed if smoke is present.\n"
//                          f"• Follow instructions from local authorities.\n"
//                          f"• Do not approach the fire to investigate.\n"
//                          f"• Keep emergency routes clear."),
//                 "actions": ["VIEW_MAP", "SAFETY_GUIDE", "IM_SAFE", "REPORT_INFORMATION"],
//                 "location": loc,
//             }
//         if role in ("FIREFIGHTER", "FOREST_OFFICIAL", "EMERGENCY_OPERATOR"):
//             return {
//                 "title": f"🔥 {inc['severity_label'].replace('_',' ')} — {inc['id']}",
//                 "body": (f"INCIDENT {inc['id']}\n"
//                          f"STATUS: {inc['severity_label']}\n"
//                          f"LOCATION: {loc['lat']:.5f}, {loc['lon']:.5f}\n"
//                          f"DETECTION: {inc['primary_class']}\n"
//                          f"CONFIDENCE: {int(inc['confidence']*100)}%\n"
//                          f"PERSISTENCE: {inc['persistence'].get('duration',0):.1f}s\n"
//                          f"SOURCES: {len(inc['sources'])} "
//                          f"(distinct {len({s['source_id'] for s in inc['sources']})})\n"
//                          f"\nFOLLOW YOUR AGENCY'S INCIDENT COMMAND PROCEDURES."),
//                 "actions": ["ACKNOWLEDGE", "OPEN_RESPONSE_VIEW", "OPEN_INCIDENT_MAP"],
//                 "location": loc,
//             }
//         return {
//             "title": f"Incident update: {inc['id']}",
//             "body": f"State: {inc['state']}  Severity: {inc['severity_label']}",
//             "actions": ["OPEN"],
//             "location": loc,
//         }

//     async def dispatch_for(self, inc: Dict[str, Any], reason: str = "state_change"):
//         priority = self._priority_for(inc)
//         key = f"{inc['id']}:{priority}"
//         now = time.time()
//         cooldown = CONFIG["ALERT_COOLDOWN_S"]
//         if key in self._sent and now - self._sent[key] < cooldown:
//             return {"deduped": True, "priority": priority}
//         self._sent[key] = now

//         recipients = self._recipients_for(inc)
//         grouped: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
//         for r in recipients:
//             grouped[r["role"]].append(r)

//         results = []
//         for role, recs in grouped.items():
//             content = self._build_body(inc, role)
//             alert = {
//                 "id": str(uuid.uuid4()),
//                 "incident_id": inc["id"],
//                 "priority": priority,
//                 "reason": reason,
//                 "role": role,
//                 "recipients": recs,
//                 "title": content["title"],
//                 "body": content["body"],
//                 "actions": content["actions"],
//                 "created_at": _now_iso(),
//             }
//             await broadcast("alert", alert)
//             provider_results = await NOTIF_REGISTRY.dispatch(alert)
//             results.append({"role": role, "alert_id": alert["id"],
//                             "priority": priority,
//                             "providers": provider_results})
//             STATE.audit_log("alert_dispatched",
//                             incident_id=inc["id"], role=role,
//                             priority=priority, reason=reason)

//         return {"deduped": False, "priority": priority, "dispatches": results}


// ALERT_ENGINE = AlertEngine()


// # =========================================================
// # Escalation
// # =========================================================
// async def escalation_loop(inc_id: str):
//     try:
//         prev_t = 0
//         for step in CONFIG["ESCALATION"]:
//             delta = step["t"] - prev_t
//             prev_t = step["t"]
//             if delta > 0:
//                 await asyncio.sleep(delta)
//             inc = INCIDENT_ENGINE._get(inc_id)
//             if not inc or inc["state"] in ("RESOLVED", "FALSE_POSITIVE", "ACKNOWLEDGED"):
//                 return
//             action = step["action"]
//             if action == "notify_monitoring":
//                 await ALERT_ENGINE.dispatch_for(inc, reason="t+30 monitoring")
//             elif action == "notify_operator_if_persistent" and inc["persistence"].get("persistent"):
//                 await ALERT_ENGINE.dispatch_for(inc, reason="t+60 persistent")
//             elif action == "escalate_if_unacked":
//                 if not inc.get("acknowledged_by"):
//                     INCIDENT_ENGINE.update_state(inc_id, "ESCALATED", actor="system")
//                     await broadcast("incident", inc)
//             elif action == "escalate_to_next_group":
//                 if not inc.get("acknowledged_by"):
//                     await ALERT_ENGINE.dispatch_for(inc, reason="t+300 escalation")
//     except asyncio.CancelledError:
//         return


// # =========================================================
// # FastAPI
// # =========================================================
// app = FastAPI(title="Wildfire Intelligence Platform")
// app.add_middleware(
//     CORSMiddleware,
//     allow_origins=["*"], allow_credentials=True,
//     allow_methods=["*"], allow_headers=["*"],
// )


// @app.get("/api/health")
// async def health():
//     return {"ok": True,
//             "notification_mode": CONFIG["NOTIFICATION_MODE"],
//             "model_loaded": SAINET.model is not None}


// @app.get("/api/config", response_model=ConfigResponse)
// async def get_config():
//     return {
//         "severity_model": SEVERITY,
//         "priorities": PRIORITY,
//         "roles": ROLES,
//         "escalation": CONFIG["ESCALATION"],
//         "notification_mode": CONFIG["NOTIFICATION_MODE"],
//         "persistence_seconds": CONFIG["PERSISTENCE_SECONDS"],
//         "correlation_radius_m": CONFIG["CORRELATION_RADIUS_M"],
//     }


// @app.post("/api/frame")
// async def ingest_frame(
//     file: UploadFile = File(...),
//     lat: float = Form(0.0),
//     lon: float = Form(0.0),
//     source_id: str = Form("CAMERA-001"),
// ):
//     img_bytes = await file.read()
//     detections = SAINET.infer(img_bytes)

//     observations = EVENT_ENGINE.process(detections, source_id, lat, lon)
//     incidents_touched = []
//     for obs in observations:
//         inc = INCIDENT_ENGINE.ingest(obs)
//         pers = EVENT_ENGINE.persistence(obs["source_id"], obs["class"])
//         inc["persistence"] = pers
//         INCIDENT_ENGINE.recompute_severity(inc)
//         inc["updated_at"] = _now_iso()
//         incidents_touched.append(inc)

//     if observations:
//         await broadcast("detections", observations)
//     for inc in incidents_touched:
//         await broadcast("incident", inc)
//         await ALERT_ENGINE.dispatch_for(inc, reason="observation")

//     STATE.save()
//     return {"detections": detections, "observations": observations,
//             "incidents": incidents_touched}


// @app.get("/api/incidents", response_model=List[Incident])
// async def list_incidents():
//     return sorted(STATE.incidents, key=lambda i: i["created_at"], reverse=True)


// @app.get("/api/incidents/{inc_id}", response_model=Incident)
// async def get_incident(inc_id: str):
//     inc = INCIDENT_ENGINE._get(inc_id)
//     if not inc:
//         return JSONResponse({"error": "not found"}, status_code=404)
//     return inc


// @app.post("/api/incidents/{inc_id}/action", response_model=Incident)
// async def incident_action(inc_id: str, body: IncidentActionRequest):
//     inc = INCIDENT_ENGINE._get(inc_id)
//     if not inc:
//         return JSONResponse({"error": "not found"}, status_code=404)

//     action = body.action
//     actor = body.actor
//     role = body.role

//     if action == "acknowledge":
//         inc["acknowledged_by"] = actor
//         INCIDENT_ENGINE.update_state(inc_id, "ACKNOWLEDGED", actor=actor)
//     elif action == "assign":
//         inc["assigned_to"] = body.assignee or actor
//         inc["timeline"].append({"ts": _now_iso(), "event": "assigned",
//                                 "detail": f"to {inc['assigned_to']}"})
//     elif action == "escalate":
//         if role not in ("EMERGENCY_OPERATOR", "ADMIN", "DISASTER_MANAGER"):
//             return JSONResponse({"error": "unauthorized"}, status_code=403)
//         INCIDENT_ENGINE.update_state(inc_id, "ESCALATED", actor=actor)
//     elif action == "verify":
//         if role not in ("FOREST_OFFICIAL", "EMERGENCY_OPERATOR",
//                         "ADMIN", "DISASTER_MANAGER"):
//             return JSONResponse({"error": "unauthorized"}, status_code=403)
//         INCIDENT_ENGINE.update_state(inc_id, "VERIFIED_INCIDENT", actor=actor)
//         await ALERT_ENGINE.dispatch_for(inc, reason="verified")
//     elif action == "false_positive":
//         INCIDENT_ENGINE.update_state(inc_id, "FALSE_POSITIVE", actor=actor)
//     elif action == "resolve":
//         INCIDENT_ENGINE.update_state(inc_id, "RESOLVED", actor=actor)
//         await ALERT_ENGINE.dispatch_for(inc, reason="resolved")
//     elif action == "note":
//         inc["notes"].append({"ts": _now_iso(), "actor": actor,
//                              "text": body.text or ""})
//     elif action == "checklist":
//         for c in inc["checklist"]:
//             if c["key"] == body.key:
//                 c["done"] = bool(body.done)
//                 break
//     else:
//         return JSONResponse({"error": f"unknown action {action}"}, status_code=400)

//     STATE.save()
//     await broadcast("incident", inc)
//     return inc


// @app.post("/api/reports")
// async def submit_report(body: UserReportRequest):
//     report = {
//         "id": str(uuid.uuid4()),
//         "ts": _now_iso(),
//         "type": body.type,
//         "description": body.description,
//         "location": body.location.model_dump() if body.location else None,
//         "source": "USER_REPORT",
//         "verified": False,
//     }
//     STATE.detections.append({
//         "id": report["id"], "ts": report["ts"], "source_id": "USER_REPORT",
//         "source_type": "user", "class": report["type"],
//         "confidence": 0.0,
//         "location": report["location"] or {"lat": 0, "lon": 0},
//         "note": report["description"],
//     })
//     STATE.audit_log("user_report_submitted", report_id=report["id"],
//                     rtype=report["type"])
//     await broadcast("user_report", report)
//     STATE.save()
//     return report


// @app.get("/api/audit", response_model=List[AuditEntry])
// async def get_audit(limit: int = 200):
//     return STATE.audit[-limit:]


// @app.post("/api/admin/test-alert")
// async def test_alert(body: TestAlertRequest):
//     if body.role != "ADMIN":
//         return JSONResponse({"error": "admin only"}, status_code=403)
//     inc = INCIDENT_ENGINE._get(body.incident_id) if body.incident_id else None
//     if not inc:
//         inc = {
//             "id": "WF-TEST-00001", "severity": 3,
//             "severity_label": "POTENTIAL_WILDFIRE",
//             "location": {"lat": 19.076, "lon": 72.8777},
//             "primary_class": "smoke", "confidence": 0.87,
//             "persistence": {"duration": 5.2, "persistent": True, "count": 5},
//             "sources": [{"source_id": "CAMERA-TEST", "class": "smoke",
//                          "confidence": 0.87, "ts": _now_iso(),
//                          "relation": "primary", "detection_id": "t"}],
//         }
//     result = await ALERT_ENGINE.dispatch_for(inc, reason="admin_test")
//     return {"test_mode": True,
//             "note": "Simulated — no real emergency contacts were made.",
//             "result": result}


// @app.websocket("/ws")
// async def ws_endpoint(ws: WebSocket):
//     await ws.accept()
//     STATE.ws_clients.add(ws)
//     try:
//         await ws.send_text(json.dumps({
//             "type": "snapshot",
//             "payload": {
//                 "incidents": STATE.incidents[-50:],
//                 "audit": STATE.audit[-50:],
//                 "config": {"severity_model": SEVERITY,
//                            "notification_mode": CONFIG["NOTIFICATION_MODE"]},
//             },
//             "ts": _now_iso(),
//         }))
//         while True:
//             await ws.receive_text()
//     except WebSocketDisconnect:
//         pass
//     finally:
//         STATE.ws_clients.discard(ws)


// # =========================================================
// # Simulation
// # =========================================================
// async def run_simulation():
//     try:
//         await broadcast("simulation", {"status": "started", "ts": _now_iso()})
//         print("\n=== SIMULATION START ===")

//         lat, lon = 19.0760, 72.8777
//         source = "CAMERA-SIM-01"

//         for i in range(6):
//             obs_det = {
//                 "id": str(uuid.uuid4()), "ts": _now_iso(),
//                 "source_id": source, "source_type": "camera",
//                 "class": "smoke", "confidence": 0.82 + i*0.02,
//                 "location": {"lat": lat, "lon": lon},
//                 "bbox": [0, 0, 640, 480], "note": "simulation",
//             }
//             STATE.detections.append(obs_det)
//             EVENT_ENGINE._touch_persistence(source, "smoke")
//             inc = INCIDENT_ENGINE.ingest(obs_det)
//             pers = EVENT_ENGINE.persistence(source, "smoke")
//             inc["persistence"] = pers
//             INCIDENT_ENGINE.recompute_severity(inc)
//             inc["updated_at"] = _now_iso()
//             await broadcast("detections", [obs_det])
//             await broadcast("incident", inc)
//             if i == 2:
//                 await ALERT_ENGINE.dispatch_for(inc, reason="simulation_early")
//             if i == 5:
//                 await ALERT_ENGINE.dispatch_for(inc, reason="simulation_persistent")
//                 asyncio.create_task(escalation_loop(inc["id"]))
//             await asyncio.sleep(1.2)

//         await asyncio.sleep(2)
//         obs2 = {
//             "id": str(uuid.uuid4()), "ts": _now_iso(),
//             "source_id": "CAMERA-SIM-02", "source_type": "camera",
//             "class": "fire", "confidence": 0.79,
//             "location": {"lat": lat + 0.002, "lon": lon + 0.001},
//             "bbox": [0, 0, 640, 480], "note": "simulation corroboration",
//         }
//         STATE.detections.append(obs2)
//         inc = INCIDENT_ENGINE.ingest(obs2)
//         INCIDENT_ENGINE.recompute_severity(inc)
//         await broadcast("detections", [obs2])
//         await broadcast("incident", inc)
//         await ALERT_ENGINE.dispatch_for(inc, reason="corroboration")

//         await broadcast("simulation", {"status": "completed", "ts": _now_iso()})
//         STATE.save()
//         print("=== SIMULATION COMPLETE ===\n")
//     except asyncio.CancelledError:
//         return
//     except Exception as e:
//         print(f"[SIMULATION ERROR] {e}")


// @app.post("/api/simulation/start")
// async def start_simulation():
//     if STATE.simulation_task and not STATE.simulation_task.done():
//         return {"status": "already_running"}
//     STATE.simulation_task = asyncio.create_task(run_simulation())
//     return {"status": "started"}


// @app.post("/api/simulation/stop")
// async def stop_simulation():
//     if STATE.simulation_task:
//         STATE.simulation_task.cancel()
//     return {"status": "stopped"}


// # =========================================================
// # Entry
// # =========================================================
// if __name__ == "__main__":
//     import uvicorn
//     uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)