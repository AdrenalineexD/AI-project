# 🌲 AI Project: Forest Monitoring & Management System

An intelligent, AI-powered system for forest conservation, automated deforestation tracking, satellite change detection, and real-time wildfire monitoring.

---

## 📌 Repository Overview

This repository contains two core integrated systems:

```
AI-project/
├── Forest Monitoring/           # Real-time monitoring dashboard & AETHER Deforestation AI
│   ├── AETHER-Deforestation/   # U-Net & Temporal CNN-LSTM change detection pipeline
│   │   ├── backend/            # FastAPI inference & spatial services
│   │   ├── frontend/           # AETHER analytical interface
│   │   ├── models/             # PyTorch neural network architectures
│   │   └── *.py                # Training, evaluation & visualization pipelines
│   └── src/                    # Live forest monitoring web application
│
├── Forest-management/          # Wildfire & hazard detection system
│   ├── backend/                # FastAPI backend with dual-model detection (SAINet + YOLOv8)
│   └── frontend/               # Interactive 3D incident response web dashboard
│
└── README.md
```

---

## 🌟 Modules & Features

### 1. Forest Monitoring & AETHER Deforestation
- **Live Monitoring Dashboard:** Real-time analytics, zone status indicators, weather telemetry, and satellite overlay mapping built with React, Vite, and Tailwind CSS.
- **AETHER AI Deforestation Pipeline:**
  - **U-Net Segmentation:** High-resolution semantic segmentation for canopy loss and deforestation masking.
  - **Temporal CNN-LSTM:** Spatio-temporal change detection across multi-period satellite imagery.
  - **Spatial Intelligence:** Georeferenced hotspot clustering and regional risk scoring.
  - **FastAPI Backend:** Asynchronous endpoints for running predictions and spatial queries.

### 2. Forest Management System
- **Dual-Model Hazard Detection:**
  - **SAINet:** Specialized lightweight fire and smoke detection model.
  - **YOLOv8:** Environmental context detection (vehicles, persons, machinery).
- **Incident Management:** Incident logging, severity evaluation, and alert dispatch.
- **Interactive UI:** Dynamic 3D visualization, interactive camera feeds, and real-time detection telemetry.

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js** (v18+) & **npm**
- **Python** (v3.9+) & `pip`
- (Optional) CUDA-compatible GPU for accelerated deep learning inference

---

### Running the Forest Monitoring App

1. **Install dependencies:**
   ```bash
   cd "Forest Monitoring"
   npm install
   ```

2. **Start the development server:**
   ```bash
   npm run dev
   ```

3. **(Optional) Run AETHER Deforestation Backend:**
   ```bash
   cd "Forest Monitoring/AETHER-Deforestation/backend"
   python main.py
   ```

---

### Running the Forest Management System

1. **Backend Setup:**
   ```bash
   cd "Forest-management/backend"
   pip install -r requirements.txt
   python main.py
   ```

2. **Frontend Setup:**
   ```bash
   cd "Forest-management/frontend"
   npm install
   npm run dev
   ```

---

## 📦 Model Weights & Data Policy

To keep the repository lightweight and follow Git best practices:
- Large deep learning model weights (`.pt`, `.pth`, `.onnx`, `.h5`), checkpoints, and datasets are excluded from Git tracking via `.gitignore`.
- YOLOv8 weights (`yolov8n.pt`) are automatically fetched by the Ultralytics runtime on first start.
- Custom checkpoint weights (`best_model.pth`, `SAINet_v11.1.pt`) should be placed in their respective `checkpoints/` or `model/` directories before running offline inference.

---

## 📄 License

This project is licensed under the MIT License - see the repository documentation for details.

