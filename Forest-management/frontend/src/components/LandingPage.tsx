/**
 * Wildfire Intelligence — Landing Page
 * Scroll-driven rotating 3D Earth + cursor fire + full-screen fire.mp4 background.
 * Same onEnter contract as before — main.tsx needs no changes.
 */
import React, {
  Suspense, useEffect, useMemo, useRef, useState,
} from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Sphere, MeshDistortMaterial } from "@react-three/drei";
import * as THREE from "three";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  Flame, Shield, MapPin, Activity, Bell, Radio, Zap,
  Eye, Globe, ArrowRight, Cpu, AlertTriangle, Users, BookOpen,
  Crosshair, Layers, Sparkles, ChevronDown, ShieldAlert, Satellite,
  Waves, Thermometer, Lock, Gauge,
} from "lucide-react";
import type { ActiveTab } from "../types";
import "./LandingPage.css";

interface LandingProps {
  onEnter: () => void;
}

// Named export for backward-compat with main.tsx which passes { incidents, onNavigate }
export function LandingPage({ onNavigate }: { incidents?: unknown[]; onNavigate: (tab: ActiveTab) => void }) {
  return <Landing onEnter={() => onNavigate("dashboard")} />;
}

// ======================================================================
// ROOT
// ======================================================================
export default function Landing({ onEnter }: LandingProps) {
  const { scrollYProgress } = useScroll();
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const unsub = scrollYProgress.on("change", (v) => setScrollProgress(v));
    return () => unsub();
  }, [scrollYProgress]);

  return (
    <div className="lp-root">
      <FireBackgroundVideo />
      <CursorFire />
      <ScrollProgressBar progress={scrollYProgress} />
      <TopBar onEnter={onEnter} />
      <Hero scrollProgress={scrollProgress} onEnter={onEnter} />
      <StatsStrip />
      <FeaturesSection />
      <PipelineSection />
      <RolesSection />
      <SafetySection />
      <ClosingCTA onEnter={onEnter} />
      <Footer />
    </div>
  );
}

// ======================================================================
// Fire background video (fixed, behind everything)
// ======================================================================
function FireBackgroundVideo() {
  return (
    <div className="lp-fire-bg" aria-hidden="true">
      <video
        className="lp-fire-bg-video"
        src="/fire.mp4"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
      />
      <div className="lp-fire-bg-tint" />
      <div className="lp-fire-bg-vignette" />
      <div className="lp-fire-bg-grain" />
    </div>
  );
}

// ======================================================================
// Scroll progress bar at top
// ======================================================================
function ScrollProgressBar({ progress }: { progress: any }) {
  const scaleX = useTransform(progress, [0, 1], [0, 1]);
  return (
    <motion.div
      className="lp-progress-bar"
      style={{ scaleX, transformOrigin: "0% 50%" }}
    />
  );
}

// ======================================================================
// Top bar
// ======================================================================
function TopBar({ onEnter }: { onEnter: () => void }) {
  return (
    <header className="lp-topbar">
      <div className="lp-topbar-brand">
        <span className="lp-topbar-mark"><Flame size={18} /></span>
        <span className="lp-topbar-name">WILDFIRE INTELLIGENCE</span>
        <span className="lp-topbar-tag">v1.0 · DEV</span>
      </div>
      <nav className="lp-topbar-nav">
        <a href="#features">Features</a>
        <a href="#pipeline">Pipeline</a>
        <a href="#roles">Roles</a>
        <a href="#safety">Safety</a>
      </nav>
      <button className="lp-topbar-cta" onClick={onEnter}>
        <Zap size={14} /> Enter Command Center
      </button>
    </header>
  );
}

// ======================================================================
// HERO
// ======================================================================
function Hero({
  scrollProgress, onEnter,
}: { scrollProgress: number; onEnter: () => void }) {
  return (
    <section className="lp-hero">
      <div className="lp-hero-inner">
        <motion.div
          className="lp-hero-copy"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="lp-badge">
            <Sparkles size={12} />
            AI-POWERED WILDFIRE INTELLIGENCE PLATFORM
          </div>

          <h1 className="lp-title">
            Detect. Verify.<br />
            Alert. <span className="lp-title-accent">Respond.</span>
          </h1>

          <p className="lp-lede">
            A next-generation early-warning engine combining real-time AI vision,
            spatio-temporal persistence verification, role-based alert routing,
            and a full incident command pipeline — connecting citizens,
            firefighters, forest officials and emergency operators on one platform.
          </p>

          <div className="lp-hero-cta">
            <button className="lp-cta lp-cta-primary" onClick={onEnter}>
              <Activity size={16} />
              Launch Command Center
              <ArrowRight size={16} />
            </button>
            <a className="lp-cta lp-cta-ghost" href="#features">
              See capabilities
              <ChevronDown size={16} />
            </a>
          </div>

          <div className="lp-hero-micro">
            <span><Radio size={11} /> Live monitoring</span>
            <span><Shield size={11} /> Development-safe by default</span>
            <span><Lock size={11} /> Human-in-the-loop verification</span>
          </div>
        </motion.div>

        <motion.div
          className="lp-hero-earth"
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="lp-earth-frame">
            <div className="lp-earth-chip lp-earth-chip-top">
              <span className="lp-chip-dot" />
              GLOBAL WILDFIRE MONITORING
            </div>
            <div className="lp-earth-chip lp-earth-chip-bottom">
              <Satellite size={12} />
              Scroll to orbit · Drag to inspect
            </div>

            <Canvas
              className="lp-earth-canvas"
              camera={{ position: [0, 0, 5.6], fov: 45 }}
              dpr={[1, 2]}
              gl={{ antialias: true, alpha: true }}
            >
              <ambientLight intensity={0.55} />
              <pointLight position={[8, 8, 8]} intensity={1.4} color="#ffe6b4" />
              <pointLight position={[-8, -8, -8]} intensity={0.7} color="#ff3300" />
              <Suspense fallback={null}>
                <ThreeEarth scrollProgress={scrollProgress} />
              </Suspense>
              <OrbitControls
                enableZoom={false}
                enablePan={false}
                rotateSpeed={0.4}
                enableDamping
                dampingFactor={0.08}
              />
            </Canvas>

            <div className="lp-earth-corner tl" />
            <div className="lp-earth-corner tr" />
            <div className="lp-earth-corner bl" />
            <div className="lp-earth-corner br" />
          </div>
        </motion.div>
      </div>

      <div className="lp-scroll-hint">
        <span>Scroll to explore</span>
        <ChevronDown size={14} className="lp-scroll-chev" />
      </div>
    </section>
  );
}

// ======================================================================
// 3D Earth — Three.js via @react-three/fiber
// ======================================================================
function ThreeEarth({ scrollProgress }: { scrollProgress: number }) {
  const globeRef = useRef<THREE.Group>(null);
  const atmoRef = useRef<THREE.Mesh>(null);
  const ringsRef = useRef<THREE.Group>(null);
  const baseRotRef = useRef(0);

  // Hotspots — illustrative global fire anchors
  const hotspots = useMemo(() => {
    const pins = [
      { lat: 19.076, lon: 72.878, sev: 4 },   // Mumbai
      { lat: 34.05, lon: -118.24, sev: 5 },  // LA
      { lat: -33.87, lon: 151.21, sev: 3 },   // Sydney
      { lat: 37.77, lon: -122.42, sev: 4 },  // SF
      { lat: 40.71, lon: -74.01, sev: 2 },  // NY
      { lat: -23.55, lon: -46.63, sev: 4 },  // São Paulo
      { lat: 55.75, lon: 37.62, sev: 3 },  // Moscow
      { lat: 39.90, lon: 116.40, sev: 3 },  // Beijing
      { lat: -1.29, lon: 36.82, sev: 4 },  // Nairobi
      { lat: 35.68, lon: 139.69, sev: 2 },  // Tokyo
    ];
    const radius = 2.05;
    return pins.map((h, i) => {
      const phi = (90 - h.lat) * (Math.PI / 180);
      const theta = (h.lon + 180) * (Math.PI / 180);
      const x = -(radius * Math.sin(phi) * Math.cos(theta));
      const z = radius * Math.sin(phi) * Math.sin(theta);
      const y = radius * Math.cos(phi);
      return { id: `h-${i}`, pos: [x, y, z] as [number, number, number], sev: h.sev };
    });
  }, []);

  useFrame((_, delta) => {
    baseRotRef.current += delta * 0.08;
    if (globeRef.current) {
      globeRef.current.rotation.y =
        baseRotRef.current + scrollProgress * Math.PI * 1.2;
      globeRef.current.rotation.x =
        Math.sin(scrollProgress * Math.PI) * 0.22;
    }
    if (atmoRef.current) {
      atmoRef.current.rotation.y -= delta * 0.06;
    }
    if (ringsRef.current) {
      ringsRef.current.rotation.z += delta * 0.05;
    }
  });

  return (
    <group ref={globeRef}>
      {/* Core sphere */}
      <Sphere args={[2, 64, 64]}>
        <meshStandardMaterial
          color="#0f1926"
          emissive="#081624"
          emissiveIntensity={0.5}
          roughness={0.65}
          metalness={0.35}
        />
      </Sphere>

      {/* Wireframe lat/lon grid */}
      <Sphere args={[2.01, 36, 24]}>
        <meshBasicMaterial
          color="#1e3a5f"
          wireframe
          transparent
          opacity={0.32}
        />
      </Sphere>

      {/* Inner glow */}
      <Sphere args={[1.96, 48, 48]}>
        <meshBasicMaterial
          color="#0b2a44"
          transparent
          opacity={0.35}
        />
      </Sphere>

      {/* Atmosphere — distorted orange shell */}
      <mesh ref={atmoRef}>
        <sphereGeometry args={[2.22, 48, 48]} />
        <MeshDistortMaterial
          color="#ff4500"
          emissive="#ff2200"
          emissiveIntensity={0.9}
          transparent
          opacity={0.22}
          distort={0.28}
          speed={1.8}
          roughness={0.4}
        />
      </mesh>

      {/* Second faint outer halo */}
      <mesh>
        <sphereGeometry args={[2.45, 32, 32]} />
        <meshBasicMaterial
          color="#ff6a3d"
          transparent
          opacity={0.05}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Orbital ring */}
      <group ref={ringsRef}>
        <mesh rotation={[Math.PI / 2.6, 0, 0]}>
          <torusGeometry args={[2.6, 0.004, 8, 128]} />
          <meshBasicMaterial color="#ff8a3d" transparent opacity={0.4} />
        </mesh>
        <mesh rotation={[Math.PI / 1.6, Math.PI / 5, 0]}>
          <torusGeometry args={[2.9, 0.003, 8, 128]} />
          <meshBasicMaterial color="#ffb703" transparent opacity={0.25} />
        </mesh>
      </group>

      {/* Hotspots */}
      {hotspots.map((h) => (
        <group key={h.id} position={h.pos}>
          <mesh>
            <sphereGeometry args={[0.055, 14, 14]} />
            <meshBasicMaterial color={h.sev >= 4 ? "#ff2d2d" : "#ffaa00"} />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.085, 0.135, 32]} />
            <meshBasicMaterial
              color={h.sev >= 4 ? "#ff3300" : "#ffb703"}
              transparent
              opacity={0.75}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ======================================================================
// Stats strip
// ======================================================================
function StatsStrip() {
  const stats = [
    { v: "99.4%", l: "Detection accuracy", i: Gauge, c: "#ffb703" },
    { v: "< 3 s", l: "Persistence gate", i: Activity, c: "#ff6a3d" },
    { v: "7", l: "Role-scoped views", i: Users, c: "#6ab0ff" },
    { v: "24/7", l: "Vision monitoring", i: Eye, c: "#a78bfa" },
  ];
  return (
    <section className="lp-stats">
      {stats.map((s, i) => (
        <motion.div
          key={s.l}
          className="lp-stat"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ delay: i * 0.08, duration: 0.6 }}
        >
          <s.i size={18} style={{ color: s.c }} />
          <div>
            <div className="lp-stat-v" style={{ color: s.c }}>{s.v}</div>
            <div className="lp-stat-l">{s.l}</div>
          </div>
        </motion.div>
      ))}
    </section>
  );
}

// ======================================================================
// Features
// ======================================================================
interface Feature {
  icon: React.ComponentType<{ size?: number }>;
  kicker: string;
  title: string;
  body: string;
  bullets: string[];
  accent: string;
}

const FEATURES: Feature[] = [
  {
    icon: Eye,
    kicker: "01 · DETECT",
    title: "AI Vision & Bounding Box HUD",
    body:
      "Continuous per-frame inference identifies fire, smoke, people, vehicles, and animals. " +
      "Every detection is drawn as an on-screen HUD reticle with class, confidence, and " +
      "corner ticks that pulse when the object is fire or smoke.",
    bullets: [
      "YOLOv8 + colour-heuristic fallback",
      "Fire / smoke emphasized on top of all other boxes",
      "2 s frame cadence with per-source dedup",
      "Live confidence chips over the video feed",
    ],
    accent: "#ff6a3d",
  },
  {
    icon: Thermometer,
    kicker: "02 · VERIFY",
    title: "Spatio-temporal verification",
    body:
      "A single flicker is not an incident. Persistence gates, spatial correlation, and " +
      "multi-camera corroboration turn raw signals into a triaged, human-verifiable event.",
    bullets: [
      "6-level severity ladder with operator control",
      "Correlation radius + time-window grouping",
      "Multi-source corroboration boosts confidence",
      "Immutable event timeline per incident",
    ],
    accent: "#ffb703",
  },
  {
    icon: Bell,
    kicker: "03 · ALERT",
    title: "Role-customized alert routing",
    body:
      "Citizens get a short, safety-first message. Responders get coordinates, confidence, " +
      "and sources. Operators get the queue. Everyone sees exactly what their role needs — " +
      "nothing more, nothing less.",
    bullets: [
      "Per-role message templates",
      "Configurable escalation timeline (T+30s, T+60s, T+2m…)",
      "Deduplication and storm suppression",
      "Pluggable providers: Web Push, Mobile, Email, SMS",
    ],
    accent: "#e07b2b",
  },
  {
    icon: BookOpen,
    kicker: "04 · GUIDE",
    title: "Contextual response guide",
    body:
      "Every incident opens with a step-by-step guide answering: what happened, what is " +
      "known, what is unknown, who has been notified, and what to do next — always " +
      "distinguished from official organizational SOP.",
    bullets: [
      "Distinct guides per role and incident state",
      "AI-generated summary vs. official instruction",
      "Dynamic checklists per incident",
      "Never invents emergency information",
    ],
    accent: "#2ecc71",
  },
  {
    icon: Crosshair,
    kicker: "05 · VISUALISE",
    title: "AR, VR, and geospatial command",
    body:
      "Responders see incident anchors in the world. Operators inspect 3D terrain in a " +
      "VR-ready view. Citizens see their local alert radius on a dark basemap.",
    bullets: [
      "WebXR-ready AR overlay (experimental)",
      "3D terrain command view",
      "Layered map: incidents, detections, cameras, reports",
      "Live incident pulses on the map",
    ],
    accent: "#6ab0ff",
  },
  {
    icon: Shield,
    kicker: "06 · SAFETY",
    title: "Audit, RBAC, and production safety",
    body:
      "Every action is logged. Every role is scoped. Real emergency dispatch stays behind " +
      "an explicit authorization gate — never fired by an AI threshold crossing.",
    bullets: [
      "Append-only audit log for every state change",
      "Role-based access to every action",
      "Development notification mode — safe by default",
      "Explicit activation path to production providers",
    ],
    accent: "#a78bfa",
  },
];

function FeaturesSection() {
  return (
    <section id="features" className="lp-features">
      <motion.div
        className="lp-section-head"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.7 }}
      >
        <div className="lp-badge"><Flame size={12} /> THE PLATFORM</div>
        <h2 className="lp-h2">
          From pixels to protocol —{" "}
          <span className="lp-title-accent">end to end.</span>
        </h2>
        <p className="lp-lede">
          Six subsystems. One shared backend. Every role sees only what they need.
        </p>
      </motion.div>

      <div className="lp-feature-list">
        {FEATURES.map((f, idx) => (
          <FeatureRow key={f.kicker} feature={f} index={idx} />
        ))}
      </div>
    </section>
  );
}

function FeatureRow({ feature, index }: { feature: Feature; index: number }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setVisible(true);
      },
      { threshold: 0.22 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const Icon = feature.icon;
  const reverse = index % 2 === 1;

  return (
    <motion.div
      ref={ref}
      className={
        "lp-feature-row " + (reverse ? "reverse " : "") + (visible ? "visible " : "")
      }
      style={{ ["--lp-accent" as any]: feature.accent }}
      initial={{ opacity: 0, y: 60 }}
      animate={visible ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="lp-feature-visual">
        <div className="lp-feature-glyph">
          <Icon size={64} />
        </div>
        <div className="lp-feature-orbit" />
        <div className="lp-feature-orbit small" />
        <div className="lp-feature-scan" />
      </div>
      <div className="lp-feature-copy">
        <div className="lp-feature-kicker">{feature.kicker}</div>
        <h3 className="lp-h3">{feature.title}</h3>
        <p className="lp-feature-body">{feature.body}</p>
        <ul className="lp-feature-bullets">
          {feature.bullets.map((b) => (
            <li key={b}>
              <span className="lp-dot" style={{ background: feature.accent }} />
              {b}
            </li>
          ))}
        </ul>
      </div>
    </motion.div>
  );
}

// ======================================================================
// Pipeline
// ======================================================================
function PipelineSection() {
  const steps = [
    { t: "DETECT", d: "SAINet vision + colour heuristics", i: Eye, c: "#ff6a3d" },
    { t: "VERIFY", d: "Persistence + correlation gates", i: Layers, c: "#ffb703" },
    { t: "ALERT", d: "Role-routed, deduped dispatch", i: Bell, c: "#e07b2b" },
    { t: "GUIDE", d: "Contextual response playbook", i: BookOpen, c: "#2ecc71" },
    { t: "RESPOND", d: "Official SOP + status updates", i: Shield, c: "#6ab0ff" },
    { t: "RESOLVE", d: "Audit + post-incident record", i: CheckCircleFilled, c: "#a78bfa" },
  ];
  return (
    <section id="pipeline" className="lp-pipeline">
      <motion.div
        className="lp-section-head"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.7 }}
      >
        <div className="lp-badge"><Waves size={12} /> THE PIPELINE</div>
        <h2 className="lp-h2">
          One signal. Six gates. <span className="lp-title-accent">Zero guesses.</span>
        </h2>
        <p className="lp-lede">
          The AI detects. The platform organises. Humans verify and decide. Responders act.
        </p>
      </motion.div>

      <div className="lp-pipeline-track">
        {steps.map((s, i) => (
          <motion.div
            key={s.t}
            className="lp-pipe-step"
            style={{ ["--lp-accent" as any]: s.c }}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ delay: i * 0.08, duration: 0.6 }}
          >
            <div className="lp-pipe-num">{String(i + 1).padStart(2, "0")}</div>
            <div className="lp-pipe-icon"><s.i size={22} /></div>
            <div className="lp-pipe-title">{s.t}</div>
            <div className="lp-pipe-desc">{s.d}</div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

// tiny helper component because lucide lacks CheckCircleFilled alias
function CheckCircleFilled({ size = 16 }: { size?: number }) {
  return <ShieldAlert size={size} />;
}

// ======================================================================
// Roles
// ======================================================================
function RolesSection() {
  const roles = [
    { name: "Citizen", icon: Users, c: "#6ab0ff", d: "Safety-first alerts, safety guide, reporting" },
    { name: "Firefighter", icon: Flame, c: "#ff6a3d", d: "Assigned incidents, situational awareness" },
    { name: "Forest Official", icon: Satellite, c: "#2ecc71", d: "Regional incidents, verification authority" },
    { name: "Emergency Operator", icon: Radio, c: "#ffb703", d: "Dispatch queue, escalation, coordination" },
    { name: "Disaster Manager", icon: ShieldAlert, c: "#a78bfa", d: "Cross-incident situational command" },
    { name: "Admin", icon: Cpu, c: "#f472b6", d: "Users, rules, providers, system config" },
  ];
  return (
    <section id="roles" className="lp-roles">
      <motion.div
        className="lp-section-head"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.7 }}
      >
        <div className="lp-badge"><Users size={12} /> ROLE-BASED ACCESS</div>
        <h2 className="lp-h2">
          Seven roles. <span className="lp-title-accent">One platform.</span>
        </h2>
        <p className="lp-lede">
          Every alert, every guide, every checklist is scoped to the person acting on it.
        </p>
      </motion.div>

      <div className="lp-roles-grid">
        {roles.map((r, i) => (
          <motion.div
            key={r.name}
            className="lp-role-card"
            style={{ ["--lp-accent" as any]: r.c }}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ delay: i * 0.06, duration: 0.55 }}
          >
            <div className="lp-role-icon"><r.icon size={22} /></div>
            <div className="lp-role-name">{r.name}</div>
            <div className="lp-role-desc">{r.d}</div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

// ======================================================================
// Safety
// ======================================================================
function SafetySection() {
  const points = [
    {
      i: Lock, c: "#2ecc71", t: "AI ≠ Confirmation",
      d: "A model crossing a threshold never becomes a confirmed wildfire. Only authorized roles can verify.",
    },
    {
      i: ShieldAlert, c: "#ff6a3d", t: "Dev mode is safe by default",
      d: "In development, all notifications are simulated — no SMS, no email, no government alert.",
    },
    {
      i: Layers, c: "#ffb703", t: "Every action is logged",
      d: "Append-only audit trail from first pixel to incident resolved. Fully reconstructible.",
    },
    {
      i: Crosshair, c: "#6ab0ff", t: "No hallucinated emergencies",
      d: "If the platform does not know the fire perimeter, weather, or response status, it says UNKNOWN.",
    },
  ];
  return (
    <section id="safety" className="lp-safety">
      <motion.div
        className="lp-section-head"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.7 }}
      >
        <div className="lp-badge"><Shield size={12} /> SAFETY PRINCIPLES</div>
        <h2 className="lp-h2">
          Serious system. <span className="lp-title-accent">Serious guarantees.</span>
        </h2>
      </motion.div>

      <div className="lp-safety-grid">
        {points.map((p, i) => (
          <motion.div
            key={p.t}
            className="lp-safety-card"
            style={{ ["--lp-accent" as any]: p.c }}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ delay: i * 0.07, duration: 0.6 }}
          >
            <div className="lp-safety-icon"><p.i size={22} /></div>
            <div className="lp-safety-title">{p.t}</div>
            <div className="lp-safety-desc">{p.d}</div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

// ======================================================================
// Closing CTA
// ======================================================================
function ClosingCTA({ onEnter }: { onEnter: () => void }) {
  return (
    <section className="lp-closing">
      <motion.div
        className="lp-closing-inner"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 0.8 }}
      >
        <div className="lp-badge"><Globe size={12} /> READY</div>
        <h2 className="lp-h2">
          The horizon is watched.{" "}
          <span className="lp-title-accent">Enter the command center.</span>
        </h2>
        <p className="lp-lede">
          Detect. Verify. Alert. Guide. Respond. Resolve — one platform, one source of truth.
        </p>
        <div className="lp-hero-cta">
          <button className="lp-cta lp-cta-primary" onClick={onEnter}>
            <Zap size={16} />
            Enter Command Center
            <ArrowRight size={16} />
          </button>
        </div>
        <div className="lp-closing-meta">
          <span><Radio size={12} /> Live monitoring</span>
          <span><Users size={12} /> 7 roles</span>
          <span><MapPin size={12} /> Geospatial</span>
          <span><AlertTriangle size={12} /> Development mode by default</span>
        </div>
      </motion.div>
    </section>
  );
}

// ======================================================================
// Footer
// ======================================================================
function Footer() {
  return (
    <footer className="lp-footer">
      <div className="lp-footer-inner">
        <div className="lp-footer-brand">
          <Flame size={16} />
          <span>WILDFIRE INTELLIGENCE</span>
        </div>
        <div className="lp-footer-meta">
          SAINet Detection · Spatio-temporal persistence · Human-in-the-loop
        </div>
        <div className="lp-footer-version">v1.0 · DEV MODE</div>
      </div>
    </footer>
  );
}

// ======================================================================
// Cursor fire + spark field
// ======================================================================
function CursorFire() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = window.innerWidth + "px";
      canvas.style.height = window.innerHeight + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const onMove = (e: MouseEvent) => { mouse.x = e.clientX; mouse.y = e.clientY; };
    const onTouch = (e: TouchEvent) => {
      if (e.touches[0]) {
        mouse.x = e.touches[0].clientX;
        mouse.y = e.touches[0].clientY;
      }
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("touchmove", onTouch, { passive: true });

    interface P {
      x: number; y: number;
      vx: number; vy: number;
      life: number; maxLife: number;
      size: number;
      hue: number;
      kind: "fire" | "spark";
    }
    const particles: P[] = [];
    const MAX = 280;

    const emit = () => {
      const n = 4;
      for (let i = 0; i < n; i++) {
        const spread = 26;
        const kind: P["kind"] = Math.random() < 0.82 ? "fire" : "spark";
        const life = kind === "fire"
          ? 420 + Math.random() * 260
          : 260 + Math.random() * 220;
        particles.push({
          x: mouse.x + (Math.random() - 0.5) * spread,
          y: mouse.y + (Math.random() - 0.5) * spread,
          vx: (Math.random() - 0.5) * 0.6,
          vy: -0.35 - Math.random() * 0.9,
          life,
          maxLife: life,
          size: kind === "fire"
            ? 2.4 + Math.random() * 3.2
            : 1.2 + Math.random() * 1.6,
          hue: 12 + Math.random() * 38,
          kind,
        });
      }
      if (particles.length > MAX) particles.splice(0, particles.length - MAX);
    };

    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(32, now - last) / 16.67;
      last = now;

      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      emit();

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy -= 0.008 * dt;
        p.vx *= 0.985;
        p.life -= 16.67 * dt;

        if (p.life <= 0) { particles.splice(i, 1); continue; }

        const t = p.life / p.maxLife;
        const alpha = t * t;
        const size = p.size * (0.4 + t * 0.9);

        if (p.kind === "fire") {
          const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, size * 3);
          grad.addColorStop(0, `hsla(${p.hue}, 100%, 62%, ${alpha * 0.9})`);
          grad.addColorStop(0.35, `hsla(${p.hue - 6}, 100%, 50%, ${alpha * 0.5})`);
          grad.addColorStop(1, `hsla(${p.hue - 12}, 100%, 35%, 0)`);
          ctx.globalCompositeOperation = "lighter";
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(p.x, p.y, size * 3, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.globalCompositeOperation = "lighter";
          ctx.fillStyle = `hsla(${p.hue + 10}, 100%, 78%, ${alpha})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, size * 0.9, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = `hsla(${p.hue + 5}, 100%, 60%, ${alpha * 0.5})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - p.vx * 6, p.y - p.vy * 6);
          ctx.stroke();
        }
      }

      ctx.globalCompositeOperation = "source-over";
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("touchmove", onTouch);
    };
  }, []);

  return <canvas ref={canvasRef} className="lp-cursor-fire" aria-hidden="true" />;
}