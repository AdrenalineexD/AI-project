# 🌲 Forest Management System

An AI-powered forest monitoring and fire-detection application designed to help monitor forest areas, identify potential fire incidents, and visualize detection information through a web interface.

## 📌 Project Overview

The Forest Management System combines a Python backend with a React and TypeScript frontend. It includes machine-learning model files for detection, a web-based user interface, and backend components for handling detections and incidents.

### Key Components

- **Frontend:** React, TypeScript, and Vite.
- **Backend:** Python application with API endpoints.
- **AI/ML Models:** PyTorch model weights and YOLOv8 model weights.
- **Detection and incident data:** JSON files used to store or manage application data.

> Note: Actual detection capabilities depend on the trained model, backend implementation, available inputs, and configuration.

---

## 📁 Project Structure

```text
Forest-management/
│
├── backend/
│   ├── main.py
│   ├── schemas.py
│   ├── requirements.txt
│   ├── detections.json
│   ├── incidents.json
│   ├── yolov8n.pt             # Model file; distribute separately
│   └── model/
│       └── SAINet_v11.1.pt    # Model file; distribute separately
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── main.tsx
│   │   ├── styles.css
│   │   └── types.ts
│   ├── package.json
│   ├── package-lock.json
│   └── vite.config.ts
│
├── requirements.txt
├── .gitignore
└── README.md
```

Some files, including the model weights, may be distributed separately and will not necessarily appear in the GitHub repository.

---

## 🛠️ Prerequisites

Install the following software before running the project:

1. **Git** — to clone the repository.
2. **Python** — use a version compatible with the backend dependencies and PyTorch.
3. **Node.js (LTS)** — includes npm for frontend dependencies.
4. **Visual Studio Code** — recommended code editor.

Verify the installations in a terminal:

```powershell
git --version
python --version
node --version
npm --version
```

---

## 🚀 Installation and Setup

### Step 1: Clone the repository

Open PowerShell or the VS Code terminal and run:

```powershell
git clone https://github.com/shaivijaiswal123/Forest-management.git
cd Forest-management
```

### Step 2: Set up the Python backend

Create a virtual environment from the project root:

```powershell
python -m venv .venv
```

Activate it:

```powershell
.\.venv\Scripts\Activate.ps1
```

If PowerShell prevents activation, you can use Command Prompt instead:

```cmd
.venv\Scripts\activate.bat
```

Install the dependencies:

```powershell
python -m pip install --upgrade pip
pip install -r requirements.txt
pip install -r backend/requirements.txt
```

The repository contains two requirements files. If the dependency versions conflict, reconcile the two files and install a compatible set of packages.

### Step 3: Add the AI model files

The model weights are large files and may not be included in the GitHub repository. Obtain them from the project owner or the designated download location.

Place the files in the paths expected by the backend:

```text
backend/
├── model/
│   └── SAINet_v11.1.pt
└── yolov8n.pt
```

**Important:**
- Do not rename the model files.
- Ensure the downloaded files are complete.
- Check `backend/main.py` for the exact model-loading paths before starting the application.
- Do not substitute a different model unless the code supports it.

### Step 4: Configure environment variables

If the backend requires environment variables, create a local `.env` file using the project's documented configuration.

For example, if you need to configure the notification mode:

```dotenv
WF_NOTIF_MODE=DEV
```

The backend code defaults this setting to `DEV` when it is not provided through the process environment.

Do not upload real API keys, passwords, tokens, or private credentials to GitHub. Use `.env.example` to document required variable names and placeholder values.

### Step 5: Start the backend

From the project root, with the virtual environment activated, run:

```powershell
python -m uvicorn main:app --reload --app-dir backend
```

If Uvicorn is missing, install it:

```powershell
pip install uvicorn
```

Keep the backend terminal open while using the application.

If the server fails to start, verify that `backend/main.py` exposes a FastAPI application named `app`. If the application uses a different framework or object name, adjust the startup command accordingly.

### Step 6: Start the frontend

Open a **second terminal** in VS Code.

Navigate to the frontend directory:

```powershell
cd frontend
```

Install the frontend dependencies:

```powershell
npm install
```

Start the development server:

```powershell
npm run dev
```

Vite will display a local URL in the terminal, commonly:

```text
http://localhost:5173
```

Open the exact URL displayed in your browser.

---

## 🔌 Frontend and Backend Connection

The frontend must communicate with the backend API for any features that rely on server-side detection or incident data.

- Ensure the backend is running before testing backend-dependent features.
- Check the API base URL configured in the frontend.
- Configure the appropriate environment variable if the frontend expects one.
- Ensure backend CORS settings permit requests from the frontend's local development URL.
- Confirm that the API endpoints called by the frontend match those exposed by the backend.

Do not assume a specific API URL or endpoint without checking the project configuration and backend routes.

---

## 🧪 Testing the Application

After starting both servers, verify the following:

1. The frontend loads successfully in the browser.
2. The backend starts without import errors.
3. Required model files load successfully.
4. The frontend can communicate with the backend.
5. Detection-related features work with supported input data.
6. Incident and detection information is displayed or updated as intended.

The actual results depend on the model files, supported inputs, and implemented functionality.

---

## 🐛 Troubleshooting

| Problem | Possible solution |
|---|---|
| `python` is not recognized | Install Python and ensure it is available on PATH. |
| `npm` is not recognized | Install Node.js LTS and restart the terminal. |
| `ModuleNotFoundError` | Activate the virtual environment and install the required Python dependencies. |
| Model file not found | Verify that the model has been downloaded and placed at the path expected by the backend. |
| Backend fails to start | Check the application entry point, imports, dependency versions, and terminal error messages. |
| Frontend cannot connect to backend | Check the API URL, backend status, CORS settings, and endpoint paths. |
| `npm install` fails | Check the Node.js version, network connection, and package-lock consistency. |
| Port already in use | Stop the process using the port or configure another available port. |
| PowerShell blocks virtual environment activation | Use Command Prompt or follow your organization's approved Python environment activation procedure. |

---

## 🔐 Security and File Management

- Never commit `.env` files containing secrets.
- Keep virtual environments, Python caches, and generated build files out of Git.
- Keep large model weights out of ordinary Git history if they exceed GitHub's file-size limit.
- Distribute large model files through an authorized cloud-storage link or Git LFS.
- Avoid sharing private credentials or sensitive incident data.
- Keep the model filenames and directory structure consistent with the backend code.

---

## 👩‍💻 Development Workflow

To obtain the latest code:

```powershell
git pull origin main
```

After making changes, commit and push them:

```powershell
git add .
git commit -m "Describe your changes"
git push
```

Ensure `.gitignore` excludes sensitive files and model weights before staging changes.

---

## 📌 Notes for Contributors

Before contributing, please:

1. Read the setup instructions carefully.
2. Install the backend and frontend dependencies.
3. Obtain the required model files.
4. Test the application locally.
5. Keep credentials and large binary files out of ordinary Git commits.
6. Document any additional setup requirements or configuration changes.

---

## 📄 License

No license has been specified in this README. Confirm the project's intended license and the licensing terms of any included datasets or pretrained models before distributing the project.

---

**Repository:** https://github.com/shaivijaiswal123/Forest-management

**Maintainer:** Project team
