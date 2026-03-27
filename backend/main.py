import os
import json
import asyncio
import pandas as pd
from typing import Optional
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

app = FastAPI(title="FlowBridge API", version="1.0.0")

# --- INITIALIZE OPENAI ---
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
client = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY and not OPENAI_API_KEY.startswith("sk-your") else None

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class SyncRequest(BaseModel):
    detected_entity: str
    recommended_record: dict
    admin_email: Optional[str] = ""


def build_pandas_summary(df, detected_duplicates):
    """Build a REAL ai_summary from the actual dataframe — universal for any dataset."""
    total_rows = len(df)
    columns = list(df.columns)
    points = [f"• Analyzed {total_rows} records across {len(columns)} columns: {', '.join(columns)}."]

    # Auto-detect name/identifier column
    name_col = next((c for c in df.columns if any(k in c.lower() for k in ['name', 'customer', 'client', 'vendor', 'company', 'employee', 'contact'])), None)

    # Auto-detect and summarize ALL categorical columns (low cardinality = likely a status/type)
    for col in df.columns:
        if df[col].dtype == 'object':
            nunique = df[col].nunique()
            if 2 <= nunique <= 15:  # likely a category/status column
                counts = df[col].value_counts()
                breakdown = ', '.join([f"{v}: {c}" for v, c in counts.head(8).items()])
                points.append(f"• Column '{col}' breakdown — {breakdown}.")
                # If there's a name column, list specifics for "bad" looking values
                if name_col and name_col != col:
                    for status in df[col].unique():
                        status_str = str(status).lower()
                        if any(flag in status_str for flag in ['unpaid', 'overdue', 'pending', 'failed', 'cancelled', 'rejected', 'late', 'expired', 'inactive', 'blocked']):
                            flagged = df[df[col] == status][name_col].head(10).tolist()
                            points.append(f"  ⚠ '{status}' ({len(df[df[col] == status])}): {', '.join(str(n) for n in flagged)}")

    # Auto-detect numeric columns — show totals/averages for money-like fields
    for col in df.columns:
        if df[col].dtype in ['int64', 'float64']:
            if any(k in col.lower() for k in ['amount', 'price', 'total', 'cost', 'revenue', 'salary', 'fee', 'balance', 'quantity', 'qty']):
                points.append(f"• Column '{col}': Total = {df[col].sum():,.2f}, Avg = {df[col].mean():,.2f}, Min = {df[col].min()}, Max = {df[col].max()}.")

    # Duplicates
    if detected_duplicates:
        points.append(f"• Found {len(detected_duplicates)} duplicate cluster(s):")
        for d in detected_duplicates[:5]:
            points.append(f"  - '{d['value']}' appears {d['occurrences']}x in column '{d['field']}'")
    else:
        points.append("• No duplicate rows detected.")

    # Missing data
    missing = df.isnull().sum()
    missing_cols = missing[missing > 0]
    if not missing_cols.empty:
        points.append("• Missing data found:")
        for col_name, cnt in missing_cols.items():
            pct = round(cnt / total_rows * 100, 1)
            points.append(f"  - '{col_name}': {cnt} empty ({pct}%)")
    else:
        points.append("• No missing data — all fields are fully populated.")

    return "\n".join(points)


@app.post("/analyze")
async def analyze_data(file: UploadFile = File(...)):
    print(f"\n🚀 [FLOWBRIDGE ANALYSIS] {file.filename}")
    
    # 1. Read file
    filename = file.filename
    if filename.endswith(".csv"):
        df = pd.read_csv(file.file)
    else:
        df = pd.read_excel(file.file, engine='openpyxl')
    
    total_rows = len(df)
    columns = list(df.columns)
    
    # 2. Universal duplicate scan — check ALL string/object columns with reasonable cardinality
    detected_duplicates = []
    for col in df.columns:
        if df[col].dtype == 'object' and df[col].nunique() < total_rows * 0.9:  # skip truly unique cols
            dupe_mask = df.duplicated(subset=[col], keep=False)
            dupes_found = df[dupe_mask]
            if not dupes_found.empty:
                unique_dupes = dupes_found[col].unique()
                for val in unique_dupes[:5]:
                    count = len(dupes_found[dupes_found[col] == val])
                    if count > 1:
                        detected_duplicates.append({"field": col, "value": str(val), "occurrences": count})

    # 3. Build Pandas summary from REAL data (used as fallback OR if no AI)
    pandas_summary = build_pandas_summary(df, detected_duplicates)
    fallback = {
        "detected_entity": "Dataset",
        "field_mappings": [{"source": c, "mapped_to": c, "analyzed_count": total_rows} for c in columns],
        "ai_summary": pandas_summary,
        "duplicates": detected_duplicates,
        "recommended_record": {},
        "total_rows": total_rows
    }

    # 4. Try AI for richer summary
    if not client:
        print("⚠️ No OpenAI client — using Pandas summary from real data")
        return fallback

    try:
        data_for_ai = df.head(200).to_json(orient="records")
        
        prompt = f"""You are looking at a business dataset with {total_rows} rows and columns: {columns}.

Here is the data (up to 200 rows):
{data_for_ai}

Duplicate scan results: {json.dumps(detected_duplicates)}

First, figure out WHAT KIND of data this is (invoices? employee records? orders? inventory? clients?).
Then write an "ai_summary" as SHORT BULLET POINTS (•) covering EVERYTHING relevant to THIS specific dataset. Adapt your analysis to the data — for example:
- If it has payment/status columns: break down Paid vs Unpaid vs Overdue, list specific names
- If it has dates: flag anything overdue or expired
- If it has amounts/prices: show totals, averages, outliers
- If it has categories: show the distribution
- Always mention: duplicates found, missing data, and any red flags
- End with 1 line of strategic advice

Be SPECIFIC — use actual names, values, and numbers from the data. No generic filler.

Return as JSON:
{{
  "detected_entity": "what kind of data this is",
  "field_mappings": [{{ "source": "original_column", "mapped_to": "clean_label", "analyzed_count": {total_rows} }}],
  "ai_summary": "• point 1\\n• point 2\\n• point 3...",
  "recommended_record": {{}},
  "total_rows": {total_rows}
}}"""

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a sharp data auditor. Write concise bullet points. Be specific — use actual names, numbers, and row counts from the data. No fluff."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            timeout=30.0
        )

        ai_result = json.loads(response.choices[0].message.content)
        ai_result["total_rows"] = total_rows
        ai_result["duplicates"] = detected_duplicates
        
        print(f"✅ AI audit complete")
        return ai_result

    except Exception as e:
        print(f"❌ AI failed ({str(e)}) — using Pandas summary from real data")
        return fallback


@app.post("/sync")
async def sync_to_xero(data: SyncRequest):
    """Simulates the actual business workflow: sync, invoice, and PDF store."""
    print(f"\n⚡ [SYNC] Generating Invoice for: {data.recommended_record.get('customer_name', 'Unknown')}")
    try:
        export_dir = "automated_invoices"
        if not os.path.exists(export_dir):
            os.makedirs(export_dir)

        await asyncio.sleep(2)
        invoice_no = f"INV-{100 + hash(str(data.recommended_record)) % 900}"
        
        with open(f"{export_dir}/{invoice_no}.json", "w") as f:
            json.dump(data.recommended_record, f)

        print(f"📄 [SUCCESS] Saved invoice {invoice_no}")

        return {
            "invoice_number": invoice_no,
            "xero_contact_id": "XERO-3329-ABC",
            "email_sent_to": data.recommended_record.get('email', 'N/A'),
            "pdf_path": f"./{export_dir}/{invoice_no}.json",
            "status": "fully_automated"
        }
    except Exception as e:
        print(f"❌ [ERROR] {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
