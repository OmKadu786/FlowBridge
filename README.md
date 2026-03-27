# FlowBridge

FlowBridge is an intelligent data ingestion and processing application. It consists of a React frontend for file dragging, mapping, and reviewing, and a Python FastAPI backend for AI-powered auditing, duplicate detection, and automated syncing.

## Project Structure

- `src/` - React frontend (Vite, Tailwind-like custom CSS)
- `backend/` - Python FastAPI backend

## 🚀 Setup Instructions

### 1. Frontend (React + Vite)
The front end handles file uploads, mapping verification, and the sync confirmation UI.

```bash
# Install dependencies
npm install

# Start the development server
npm run dev
```

### 2. Backend (FastAPI + Python)
The backend processes CSV/Excel files using Pandas and OpenAI to generate automated data summaries, detect duplicates, and simulate business workflows (like Xero syncing).

```bash
# Navigate to the backend folder
cd backend

# Create a virtual environment (optional but recommended)
python -m venv venv
### Windows:
venv\Scripts\activate
### Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Set up OpenAI (Required for AI Summary generation)
# Create a .env file inside the backend/ folder:
echo "OPENAI_API_KEY=sk-your-key-here" > .env

# Start the API server
python main.py
# (Runs on http://127.0.0.1:8000)
```

## Features
- **Smart Data Auditing:** Automatically detects duplicates and missing fields across datasets.
- **AI Summary:** Uses `gpt-4o-mini` to classify the uploaded dataset and generate a specific, row-aware summary (e.g., highlighting overdue invoices or flagging unpaid statuses).
- **Graceful Fallbacks:** If the OpenAI API key is missing or fails, it falls back to a locally generated algorithmic Pandas summary.
- **Automated Syncing:** Simulates syncing to external services by generating JSON invoice payloads locally in `backend/automated_invoices`.

## Integration
The FlowBridge React App is pre-configured to point to `http://127.0.0.1:8000` for analysis and syncing:
- **`POST /analyze`**: For file uploads and AI auditing.
- **`POST /sync`**: For final confirmation and payload delivery.
