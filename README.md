# FlowBridge — AI Automation Gateway

FlowBridge is a premium, intelligent data ingestion and processing platform. It features a stunning **White & Light Blue** professional theme and a robust local architecture that combines a high-performance React frontend with a powerful FastAPI backend for AI-powered auditing and automated business workflows.

## Project Structure

- `index.html` - Premium Landing Page (Standalone)
- `src/` - React Dashboard (Vite, Modern UI)
- `backend/` - Python FastAPI backend (AI Logic & SMTP)

## 🚀 Setup Instructions

### 1. Frontend (React + Vite)
The frontend serves both the landing page and the dashboard. It is pre-configured to proxy API requests to the backend.

```bash
# Install dependencies
npm install

# Start the development server
npm run dev
# (Runs on http://localhost:3000)
```

### 2. Backend (FastAPI + Python)
The backend handles deep data auditing using OpenAI and processes invoice delivery via Gmail SMTP.

```bash
# Navigate to the backend folder
cd backend

# Create and activate virtual environment
python -m venv venv
### Windows:
venv\Scripts\activate
### Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start the API server
python main.py
# (Runs on http://127.0.0.1:8000)
```

## Features
- **Modern "White & Sky Blue" Aesthetic:** A clean, professional UI optimized for hackathon-winning demos.
- **AI-Powered Data Auditing:** Automatically detects duplicates, classifies datasets, and generates row-aware summaries using `gpt-4o-mini`.
- **Integrated API Proxy:** Uses Vite's internal proxy to route `/api` requests to the backend on port 8000, eliminating CORS issues.
- **Automated Workflow Execution:** Sends real-world emails to customers with unpaid records directly from the audit report.

## Integration
The system is unified via the Vite dev server at **port 3000**:
- **Landing Page & Wizard**: [http://localhost:3000/](http://localhost:3000/)
- **API Proxy**: All frontend calls to `/api` are automatically routed to the backend for seamless communication.
