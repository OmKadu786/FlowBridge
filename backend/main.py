import os
import json
import asyncio
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import pandas as pd
from typing import Optional, List
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

# --- SMTP CONFIG ---
SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASS = os.getenv("SMTP_PASS", "")

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
    unpaid_records: Optional[list] = []


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


def extract_unpaid_records(df):
    """Find all unpaid/overdue records, group by customer name+email so each person gets ONE email."""
    # Find the status column
    status_col = next((c for c in df.columns if any(k in c.lower() for k in ['status', 'payment'])), None)
    if not status_col:
        return []

    # Find name and email columns
    name_col = next((c for c in df.columns if any(k in c.lower() for k in ['name', 'customer', 'client'])), None)
    email_col = next((c for c in df.columns if 'email' in c.lower()), None)
    
    if not name_col or not email_col:
        return []

    # Filter for unpaid/overdue/pending
    bad_statuses = ['unpaid', 'overdue', 'pending', 'failed', 'late']
    mask = df[status_col].astype(str).str.lower().isin(bad_statuses)
    unpaid_df = df[mask]

    if unpaid_df.empty:
        return []

    # Group by (name, email) — one email per person
    grouped = {}
    for _, row in unpaid_df.iterrows():
        name = str(row[name_col])
        email = str(row[email_col])
        key = (name, email)
        if key not in grouped:
            grouped[key] = {"name": name, "email": email, "items": []}
        # Collect all relevant columns for this row as a line item
        item = {col: str(row[col]) for col in df.columns if col != name_col and col != email_col}
        grouped[key]["items"].append(item)

    return list(grouped.values())


def send_invoice_email(recipient_name, recipient_email, items, sender_email):
    """Send a single HTML email listing all unpaid items for one customer."""
    # Build the items table rows
    if not items:
        return False
    
    # Get column headers from first item
    headers = list(items[0].keys())
    header_html = "".join(f"<th style='padding:8px 12px; text-align:left; border-bottom:2px solid #6366f1; color:#6366f1;'>{h}</th>" for h in headers)
    
    rows_html = ""
    for item in items:
        cells = "".join(f"<td style='padding:8px 12px; border-bottom:1px solid #eee;'>{item.get(h, '')}</td>" for h in headers)
        rows_html += f"<tr>{cells}</tr>"

    html_body = f"""
    <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9fafb; padding: 30px;">
        <div style="background: white; border-radius: 12px; padding: 30px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
            <div style="text-align: center; margin-bottom: 24px;">
                <h1 style="font-size: 22px; color: #111827; margin: 0;">FlowBridge Invoice Reminder</h1>
                <p style="color: #6b7280; font-size: 14px;">Automated Payment Notification</p>
            </div>
            
            <p style="font-size: 15px; color: #374151;">Dear <strong>{recipient_name}</strong>,</p>
            <p style="font-size: 14px; color: #4b5563; line-height: 1.6;">
                Our records indicate that the following {len(items)} item(s) remain unpaid. 
                Please review and process payment at your earliest convenience.
            </p>
            
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px;">
                <thead><tr>{header_html}</tr></thead>
                <tbody>{rows_html}</tbody>
            </table>
            
            <p style="font-size: 13px; color: #6b7280; margin-top: 20px;">
                If you have already made this payment, please disregard this email.
            </p>
            
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                <p style="font-size: 11px; color: #9ca3af;">Sent via FlowBridge Automated Invoicing System</p>
            </div>
        </div>
    </div>
    """

    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"Payment Reminder — {len(items)} Outstanding Item(s)"
    msg["From"] = sender_email
    msg["To"] = recipient_email
    msg.attach(MIMEText(html_body, "html"))

    try:
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASS)
            server.sendmail(sender_email, recipient_email, msg.as_string())
        print(f"  📧 Email sent to {recipient_name} <{recipient_email}> ({len(items)} items)")
        return True
    except Exception as e:
        print(f"  ❌ Failed to email {recipient_email}: {e}")
        return False


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
    
    # 2. Universal duplicate scan
    detected_duplicates = []
    for col in df.columns:
        if df[col].dtype == 'object' and df[col].nunique() < total_rows * 0.9:
            dupe_mask = df.duplicated(subset=[col], keep=False)
            dupes_found = df[dupe_mask]
            if not dupes_found.empty:
                unique_dupes = dupes_found[col].unique()
                for val in unique_dupes[:5]:
                    count = len(dupes_found[dupes_found[col] == val])
                    if count > 1:
                        detected_duplicates.append({"field": col, "value": str(val), "occurrences": count})

    # 3. Extract unpaid records (grouped by person)
    unpaid_records = extract_unpaid_records(df)
    print(f"📋 Found {len(unpaid_records)} unique customers with unpaid items")

    # 4. Build Pandas summary from REAL data
    pandas_summary = build_pandas_summary(df, detected_duplicates)
    fallback = {
        "detected_entity": "Dataset",
        "field_mappings": [{"source": c, "mapped_to": c, "analyzed_count": total_rows} for c in columns],
        "ai_summary": pandas_summary,
        "duplicates": detected_duplicates,
        "unpaid_records": unpaid_records,
        "recommended_record": {},
        "total_rows": total_rows
    }

    # 5. Try AI for richer summary
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
        ai_result["unpaid_records"] = unpaid_records
        
        print(f"✅ AI audit complete")
        return ai_result

    except Exception as e:
        print(f"❌ AI failed ({str(e)}) — using Pandas summary from real data")
        return fallback


@app.post("/sync")
async def sync_and_email(data: SyncRequest):
    """Send invoice reminder emails to all unpaid customers."""
    print(f"\n⚡ [SYNC] Sending invoice emails...")
    
    unpaid = data.unpaid_records or []
    if not unpaid:
        return {
            "emails_sent": 0,
            "email_results": [],
            "status": "no_unpaid_records"
        }

    if not SMTP_USER or not SMTP_PASS or SMTP_PASS.startswith("YOUR_"):
        print("⚠️ SMTP not configured — simulating email send")
        # Simulate for demo
        await asyncio.sleep(2)
        results = []
        for record in unpaid:
            results.append({
                "name": record.get("name", "Unknown"),
                "email": record.get("email", "N/A"),
                "items_count": len(record.get("items", [])),
                "status": "simulated"
            })
        return {
            "emails_sent": len(results),
            "email_results": results,
            "status": "simulated_demo"
        }

    # Real email send
    results = []
    for record in unpaid:
        name = record.get("name", "Customer")
        email = record.get("email", "")
        items = record.get("items", [])
        
        if not email or email == "nan":
            results.append({"name": name, "email": "missing", "items_count": len(items), "status": "skipped"})
            continue
        
        success = send_invoice_email(name, email, items, SMTP_USER)
        results.append({
            "name": name,
            "email": email,
            "items_count": len(items),
            "status": "sent" if success else "failed"
        })

    sent_count = sum(1 for r in results if r["status"] == "sent")
    print(f"📧 [DONE] {sent_count}/{len(results)} emails sent successfully")

    return {
        "emails_sent": sent_count,
        "email_results": results,
        "status": "completed"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)

