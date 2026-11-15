# AETHER Stage 7 — React Dashboard Integration Report

## 1. Stage 7 Objective
The objective of Stage 7 is to build a modern, high-performance React + TypeScript + Vite frontend dashboard inside `AETHER-Deforestation/frontend/`. The dashboard connects directly to the live Stage 6 FastAPI backend (`http://127.0.0.1:8000`) to present real-time bi-temporal satellite image inference, Early-Fusion U-Net change detection predictions, 8-connectivity region intelligence, 4×4 hotspot grid decomposition, and priority scoring.

---

## 2. Scope
- Develop a responsive, environmental-monitoring React dashboard isolated in `AETHER-Deforestation/frontend/`.
- Provide bi-temporal satellite image dropzones with client-side 480×480 RGB dimension validation.
- Implement a 1-click **"Load Sample Pair (test_000011)"** loader using standard read-only dataset sample assets.
- Render Deforestation Summary KPI cards, priority score badges (`Critical`, `High`, `Moderate`, `Low`), 4×4 hotspot grid decomposition with interactive cell inspector, and sortable connected region data tables.
- Render interactive visualization viewers with tabbed modes and a mask opacity overlay slider.
- Implement automated Vitest unit/contract tests (`npm test`) and zero-error TypeScript build verification (`npm run build`).

---

## 3. Stage 6 Backend Dependency
The frontend dashboard consumes the Stage 6 FastAPI REST API without modifying any backend code:
- `GET /health`: Backend health status, model loaded flag, device (`CPU`/`CUDA`), and checkpoint SHA-256 integrity.
- `GET /api/v1/model`: Technical specifications of the locked Stage 2B model.
- `POST /api/v1/deforestation/analyze`: Main analysis endpoint accepting `before_image` and `after_image` uploads.
- `GET /api/v1/deforestation/mask/{mask_id}`: Serves binary prediction PNG masks.

**Integrity Guarantee**: The Stage 6 backend (`backend/`), locked model weights (`checkpoints/stage2b/best_model.pth`), U-Net architecture (`models/unet.py`), original dataset, and previous stage outputs were 100% untouched.

---

## 4. Frontend Architecture
The frontend follows a modular component-driven architecture:
1. **API Client Layer (`src/services/apiService.ts`)**: Encapsulates `fetch` operations with relative paths proxied by Vite dev server (`http://127.0.0.1:8000`).
2. **Type Layer (`src/types/api.ts`)**: TypeScript interfaces strictly matching FastAPI Pydantic schemas.
3. **Component Layer (`src/components/`)**:
   - `Header.tsx`: System health, device status, threshold `0.25`, and shortened SHA-256 hash badge.
   - `ImageUploader.tsx`: Dual upload dropzones with 480×480 validation and sample pair loader.
   - `SummaryCards.tsx`: KPI metrics and priority score display.
   - `VisualizationViewer.tsx`: Before/After/Mask tabs and opacity slider overlay.
   - `HotspotGrid.tsx`: Interactive 16-cell 4×4 hotspot grid with cell detail inspector.
   - `RegionTable.tsx`: Sortable connected region intelligence table.
4. **App Shell (`src/App.tsx`)**: Global state orchestration for uploads, loading spinners, and error banners.

---

## 5. Directory Structure
```
AETHER-Deforestation/frontend/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── index.html
├── public/
│   └── samples/
│       ├── test_000011_A.png
│       └── test_000011_B.png
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── index.css
    ├── types/
    │   └── api.ts
    ├── services/
    │   └── apiService.ts
    ├── components/
    │   ├── Header.tsx
    │   ├── ImageUploader.tsx
    │   ├── SummaryCards.tsx
    │   ├── VisualizationViewer.tsx
    │   ├── HotspotGrid.tsx
    │   └── RegionTable.tsx
    └── test/
        └── apiService.test.ts
```

---

## 6. Technology Stack
- **Framework**: React 19 + TypeScript + Vite 6
- **Styling**: TailwindCSS + PostCSS + Autoprefixer
- **Icons**: Lucide React
- **Testing**: Vitest 3
- **Dev Proxy**: Vite proxying `/health` and `/api` to `http://127.0.0.1:8000`

---

## 7. API Integration
The frontend client uses relative URL paths mapped via Vite dev server proxying:
```typescript
// vite.config.ts proxy configuration
server: {
  port: 5173,
  proxy: {
    '/health': { target: 'http://127.0.0.1:8000', changeOrigin: true },
    '/api': { target: 'http://127.0.0.1:8000', changeOrigin: true },
  }
}
```

---

## 8. TypeScript Schema Alignment
Frontend interfaces in `src/types/api.ts` directly correspond to Stage 6 Pydantic schemas:
- `DeforestationSummary`: `predicted_percentage`, `predicted_pixels`, `region_count`, `largest_region_percentage`, `concentration`, `priority_score`, `priority_level`.
- `PriorityDetail`: `normalized_deforestation_score`, `normalized_largest_region_score`, `normalized_region_count_score`, `priority_score`, `priority_level`.
- `RegionDetail`: `region_id`, `pixel_count`, `percentage_of_image`, `centroid_x`, `centroid_y`, `bbox_x_min`, `bbox_y_min`, `bbox_x_max`, `bbox_y_max`, `region_contribution_percent`, `rank`.
- `GridCellDetail`: `grid_id`, `grid_row`, `grid_col`, `x_min`, `y_min`, `x_max`, `y_max`, `predicted_deforestation_pixels`, `predicted_deforestation_percent_of_cell`, `hotspot_score`, `hotspot_level`.

---

## 9. Image Upload Workflow
1. User drops or selects Before and After image files.
2. Client-side validation verifies exact 480 × 480 pixel dimensions using HTML5 `Image` elements.
3. If dimensions mismatch (e.g. 256×256), upload is rejected with clear error message `"Expected image dimensions: 480×480 pixels."`.
4. "Analyze Deforestation" button enables only when both inputs are valid.

---

## 10. Sample Pair Workflow
Clicking **"Load Sample Pair (test_000011)"**:
1. Fetches read-only sample PNG assets `/samples/test_000011_A.png` and `test_000011_B.png`.
2. Converts blobs into `File` objects.
3. Validates dimensions (480×480) and sets preview thumbnails.
4. Enables instant 1-click execution for testing.

---

## 11. Inference Workflow
$$\text{Frontend Upload} \xrightarrow{\text{FormData}} \text{POST /api/v1/deforestation/analyze} \xrightarrow{\text{FastAPI}} \text{Locked U-Net} \xrightarrow{\text{DSU Spatial Service}} \text{JSON Response} \xrightarrow{\text{React State}} \text{Dashboard Render}$$

---

## 12. Summary Dashboard
Renders KPI metric cards:
- **Deforestation Loss**: Percentage (`19.717%`) and pixel count (`45,428 / 230,400 px`).
- **Engineering Priority**: Score (`78.28`) and level badge (`Critical`).
- **Detected Regions**: Count (`32` clusters) and largest region area (`4.9905%`).
- **Spatial Concentration**: Classification badge (`Dispersed`).
- **Engineering Diagnostics**: Regions per 100k pixels (`13.89`) and fragmentation ratio (`0.000704`).

---

## 13. Mask Visualization
- **Tabbed Views**: Before Image, After Image, Prediction Mask PNG (`GET /api/v1/deforestation/mask/{mask_id}`).
- **Interactive Overlay Mode**: Overlays binary prediction mask PNG over the After satellite image with an interactive opacity slider (0% to 100%).

---

## 14. Region Intelligence
Sortable data table rendering all 32 connected regions:
- Rank, Region ID, Pixel Area, Image %, Centroid X/Y, Bounding Box coordinates, and Contribution %.

---

## 15. 4×4 Hotspot Grid
- 16-cell interactive grid (120×120 px cells) color-coded by severity (`Low`, `Moderate`, `High`, `Critical`).
- Interactive cell selection displays detailed cell bounding box, cell deforestation %, intersecting region count, largest region in cell, and hotspot score.

---

## 16. Priority Visualization
Score computed by backend using fixed Stage 4B reference bounds ($0.50 \text{Norm}_P + 0.35 \text{Norm}_L + 0.15 \text{Norm}_C$). Displayed with engineering priority level badge (`Critical`).

---

## 17. Error Handling
Displays clear error banners for:
- Image dimension mismatches (`480×480` required)
- Backend connection failures
- HTTP 400 / 422 / 500 responses

---

## 18. Testing
Ran `npm test` using Vitest:
- Verifies `checkHealth()`, `getModelInfo()`, `analyzeDeforestation()`, `getMaskUrl()`, and HTTP error handling.
- All 5 test cases **PASS**.

---

## 19. Build Verification
Ran `npm run build`:
- **0 TypeScript errors**, **0 build errors**. Production bundle compiled cleanly.

---

## 20. End-to-End Verification (`test_000011.png`)
Ran full end-to-end workflow:

| Metric | Stage 4B Benchmark | Backend Response | Dashboard Rendered Value | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Deforestation %** | 19.717% | 19.717% | `19.717%` | **PASS** |
| **Deforestation Pixels** | 45,428 | 45,428 | `45,428` | **PASS** |
| **Region Count** | 32 | 32 | `32` | **PASS** |
| **Largest Region %** | 4.9905% | 4.9905% | `4.9905%` | **PASS** |
| **Priority Score** | 78.28 | 78.28 | `78.28` | **PASS** |
| **Priority Level** | Critical | Critical | `Critical` | **PASS** |
| **Spatial Concentration** | Dispersed | Dispersed | `Dispersed` | **PASS** |
| **Grid Cell Count** | 16 | 16 | `16` | **PASS** |

---

## 21. Limitations
1. **Frontend Does Not Perform Inference**: Inference is performed exclusively by the FastAPI backend model service.
2. **Image-Space Coordinates**: All bounding boxes and centroids are in image-space pixels. No geographic coordinates or physical area estimates ($km^2$, hectares) are claimed.
3. **Engineering Classifications**: Priority and hotspot levels are UI decision-support classifications.

---

## 22. Conclusion
Stage 7 implementation is **COMPLETE and VERIFIED (PASS)**. The React dashboard seamlessly connects to the Stage 6 FastAPI backend, displaying real-time bi-temporal deforestation intelligence with 100% schema accuracy.
