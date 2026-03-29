# FlowBridge — AI Automation Gateway

FlowBridge is a premium, intelligent data ingestion and automation platform designed to bridge the gap between raw data and actionable business workflows. FlowBridge leverages a high-performance React frontend and a robust FastAPI backend to provide AI-powered auditing, data reconciliation, and automated communications.

## 🌟 Key Features

- **AI-Powered Data Auditing**: Automatically analyze complex datasets (CSV, XLS, XLSX) for duplicates, missing fields, and anomalies using GPT-4o-mini.
- **Strategic Business Insights**: Get real-time summaries of financial data in Indian Rupees (₹) and categorical breakdowns of business processes.
- **Smart Reconciliation**: Intelligently identify and reconcile duplicate records into a unified master view.
- **Automated Workflow Execution**: Trigger real-world events like automated invoicing and email reminders directly from the audit reports.
- **Live Activity Log**: Maintain a local, persistent feed of all data synchronization and automation activities.
- **Configurable Backend Integration**: Seamlessly switch between local and cloud-based API endpoints with a built-in proxy and dashboard settings.

## 🏗️ Technical Architecture

- **Frontend**: Built with **React 19** and **Vite**, utilizing **Lucide React** for premium iconography and a custom glassmorphic UI system.
- **Backend**: Powering logic with **FastAPI** (Python), integrating **Pandas** for high-efficiency data processing and **OpenAI** for strategic AI auditing.
- **Automation**: Integrated **SMTP** (Gmail/SendGrid compatible) for enterprise-grade automated notifications.

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js** (v18+)
- **Python** (v3.9+)
- **OpenAI API Key** (for AI Auditor)
- **SMTP Credentials** (for automated invoicing)

### 2. Frontend Configuration
The frontend serves as the primary dashboard and is pre-configured with a Vite proxy for seamless API communication.

```bash
# Navigate to project root
npm install

# Start the development server
npm run dev
# Dashboard launches on http://localhost:3000
```

### 3. Backend Setup
The backend handles deep data auditing and processing.

```bash
# Navigate to backend folder
cd backend

# Setup virtual environment
python -m venv venv
# Windows: venv\Scripts\activate | Mac/Linux: source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start the API server
python main.py
# Runs on http://127.0.0.1:8000


## 📂 Project Structure

- `src/` — React application source code and modern UI components.
- `backend/` — FastAPI application, AI logic, and automation handlers.
- `public/` — Static assets and global resources.
- `index.html` — High-performance entry point.

---
*FlowBridge — Consolidating enterprise data into seamless workflows.*
