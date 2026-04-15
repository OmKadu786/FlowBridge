import os
import sys
import json
import asyncio
import smtplib
from email.mime.text import MIMEText

# Fix for Windows console emoji printing
sys.stdout.reconfigure(encoding='utf-8')

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


# --- GLOBAL DATA STORE (for /ask endpoint) ---
GLOBAL_DATA = {"df": None, "filename": None}


class AskRequest(BaseModel):
    question: str
    history: Optional[List[dict]] = []


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
                points.append(f"• Column '{col}': Total = ₹{df[col].sum():,.2f}, Avg = ₹{df[col].mean():,.2f}, Min = ₹{df[col].min()}, Max = ₹{df[col].max()}.")

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
- If it has amounts/prices: show totals, averages, outliers (Format all currency amounts in Indian Rupees with the ₹ symbol)
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



@app.post("/clean")
async def clean_data(file: UploadFile = File(...)):
    """Clean and standardize uploaded data using AI-guided rules."""
    print(f"\n🧹 [FLOWBRIDGE CLEAN] {file.filename}")

    # 1. Read file
    filename = file.filename
    if filename.endswith(".csv"):
        try:
            df = pd.read_csv(file.file)
        except UnicodeDecodeError:
            file.file.seek(0)
            df = pd.read_csv(file.file, encoding='cp1252')
    else:
        df = pd.read_excel(file.file, engine='openpyxl')

    columns_before = list(df.columns)
    total_before = len(df)
    preview_before = df.head(10).fillna("").astype(str).to_dict(orient="records")

    # 2. Ask AI for cleaning rules (50 rows max)
    column_mapping = {}
    cleaning_rules = ["drop_duplicates", "fill_nulls"]

    if client:
        try:
            sample = df.head(50).fillna("").astype(str).to_json(orient="records")
            prompt = f"""Analyze this dataset with columns: {columns_before}

Sample data (first 50 rows):
{sample}

Return a JSON object with:
1. "column_mapping": a dict mapping current column names to clean, readable names (e.g., "cust_nm" -> "Customer Name"). Only include columns that need renaming.
2. "cleaning_rules": an array of rule strings from this set:
   - "lowercase_emails" (if there are email columns)
   - "parse_dates:col1,col2" (if there are date columns — list the ORIGINAL column names after the colon)
   - "drop_duplicates"
   - "fill_nulls"

Return ONLY valid JSON. Example:
{{
  "column_mapping": {{"cust_nm": "Customer Name", "eml": "Email"}},
  "cleaning_rules": ["lowercase_emails", "parse_dates:order_date", "drop_duplicates", "fill_nulls"]
}}"""
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are a data cleaning expert. Return only valid JSON."},
                    {"role": "user", "content": prompt}
                ],
                response_format={"type": "json_object"},
                timeout=20.0
            )
            ai_rules = json.loads(response.choices[0].message.content)
            column_mapping = ai_rules.get("column_mapping", {})
            cleaning_rules = ai_rules.get("cleaning_rules", ["drop_duplicates", "fill_nulls"])
            print(f"🤖 AI suggested: {len(column_mapping)} renames, {len(cleaning_rules)} rules")
        except Exception as e:
            print(f"⚠️ AI cleaning rules failed ({e}) — using defaults")

    # 3. Execute cleaning with Pandas
    # Rename columns
    if column_mapping:
        valid_mapping = {k: v for k, v in column_mapping.items() if k in df.columns}
        df.rename(columns=valid_mapping, inplace=True)

    # Drop duplicates
    rows_before_dedup = len(df)
    df.drop_duplicates(inplace=True)
    duplicates_removed = rows_before_dedup - len(df)

    # Lowercase + strip email columns
    for col in df.columns:
        if any(k in col.lower() for k in ['email', 'e-mail', 'mail']):
            df[col] = df[col].astype(str).str.lower().str.strip()

    # Parse date columns
    for rule in cleaning_rules:
        if rule.startswith("parse_dates") and ":" in rule:
            date_cols = [c.strip() for c in rule.split(":", 1)[1].split(",")]
            for dc in date_cols:
                target = column_mapping.get(dc, dc)
                if target in df.columns:
                    df[target] = pd.to_datetime(df[target], errors='coerce')

    # Count nulls before filling
    nulls_filled = int(df.isnull().sum().sum())

    # Fill all remaining nulls safely (avoiding Pandas 3.0 strict TypeError on float64)
    for col in df.columns:
        if df[col].isnull().any():
            df[col] = df[col].astype(object).fillna("N/A")


    columns_after = list(df.columns)
    preview_after = df.head(10).astype(str).to_dict(orient="records")

    # 4. Health score
    bad_count = int(df.isin(["N/A", "", "nan", "NaT", "None"]).sum().sum())
    remaining_dupes = int(df.duplicated().sum())
    health_score = max(0, round(100 - (bad_count * 0.5) - (remaining_dupes * 2)))

    # 5. Store in GLOBAL_DATA for /ask
    GLOBAL_DATA["df"] = df.copy()
    GLOBAL_DATA["filename"] = filename

    # 6. Generate chart data inline (avoids race conditions with separate endpoint)
    charts = _generate_chart_data(df)

    print(f"✅ Clean complete: score={health_score}, dupes_removed={duplicates_removed}, nulls_filled={nulls_filled}, charts={len(charts)}")

    return {
        "health_score": health_score,
        "columns_before": columns_before,
        "columns_after": columns_after,
        "column_mapping": column_mapping,
        "preview_before": preview_before,
        "preview_after": preview_after,
        "total_rows": len(df),
        "total_before": total_before,
        "duplicates_removed": duplicates_removed,
        "nulls_filled": nulls_filled,
        "cleaning_rules": cleaning_rules,
        "charts": charts
    }


def _generate_chart_data(df, max_charts=6):
    """Generate chart configs from a dataframe. Returns at most `max_charts` items."""
    charts = []
    JUNK_VALUES = {"N/A", "nan", "NaT", "None", "", "n/a", "none", "null"}
    # Column names to skip for categorical pie charts (they look like data, not categories)
    SKIP_NAME_KEYWORDS = ['email', 'e-mail', 'phone', 'address', 'id', 'date', 'url', 'link', 'description', 'notes', 'comment']

    # 1. Categorical columns → Pie Charts
    for col in df.columns:
        if len(charts) >= max_charts:
            break
        if df[col].dtype != 'object':
            continue
        # Skip columns whose names suggest non-categorical data
        if any(kw in col.lower() for kw in SKIP_NAME_KEYWORDS):
            continue

        # Filter out junk values before counting
        clean_series = df[col][~df[col].astype(str).isin(JUNK_VALUES)]
        nunique = clean_series.nunique()
        if 2 <= nunique <= 12:
            counts = clean_series.value_counts().head(8)
            if counts.empty:
                continue
            data = [{"name": str(k), "value": int(v)} for k, v in counts.items()]
            charts.append({
                "id": f"pie_{col}",
                "type": "pie",
                "title": f"{col} Distribution",
                "data": data,
                "dataKey": "value",
                "nameKey": "name"
            })

    # 2. Numeric columns → Bar Charts
    # Recover numeric columns that the cleaner may have cast to object (via N/A fill)
    numeric_candidates = {}
    for col in df.columns:
        if col.lower().endswith('id'):
            continue
        if df[col].dtype in ['int64', 'float64']:
            numeric_candidates[col] = df[col]
        elif df[col].dtype == 'object':
            coerced = pd.to_numeric(df[col], errors='coerce')
            if coerced.notna().sum() > len(df) * 0.5:  # At least half the rows are numeric
                numeric_candidates[col] = coerced

    # Find a grouping key: prefer name-like columns, fall back to any low-cardinality string column
    name_col = next((c for c in df.columns if any(k in c.lower() for k in ['name', 'customer', 'client', 'vendor', 'product', 'company', 'employee'])), None)
    if not name_col:
        # Fallback: pick any string column with reasonable cardinality
        for c in df.columns:
            if df[c].dtype == 'object':
                clean_vals = df[c][~df[c].astype(str).isin(JUNK_VALUES)]
                n = clean_vals.nunique()
                if 2 <= n <= 30:
                    name_col = c
                    break

    if name_col and numeric_candidates:
        for col, series in numeric_candidates.items():
            if len(charts) >= max_charts:
                break
            total = series.sum()
            if pd.isna(total) or total <= 0:
                continue
            temp_df = df[[name_col]].copy()
            temp_df["_val"] = series
            grouped = temp_df.groupby(name_col)["_val"].sum().reset_index()
            grouped = grouped[grouped["_val"] > 0]
            top = grouped.nlargest(7, "_val")
            if top.empty:
                continue
            data = [{"name": str(row[name_col]), "value": round(float(row["_val"]), 2)} for _, row in top.iterrows()]
            charts.append({
                "id": f"bar_{col}",
                "type": "bar",
                "title": f"Top by {col}",
                "data": data,
                "dataKey": "value",
                "nameKey": "name"
            })

    return charts


@app.post("/ask")
async def ask_data(data: AskRequest):
    """Answer natural language questions about the cleaned data."""
    if GLOBAL_DATA["df"] is None:
        raise HTTPException(status_code=400, detail="No data loaded. Please clean a file first.")

    df = GLOBAL_DATA["df"]
    question = data.question
    history = data.history
    print(f"\n💬 [ASK] {question}")

    # Build history context
    history_context = ""
    if history:
        history_context = "Previous Conversation Context:\n"
        # Use up to last 4 messages to save context but keep prompt reasonable
        for msg in history[-4:]:
            role_label = "User" if msg.get("role") == "user" else "Assistant"
            text = msg.get("text", "")
            history_context += f"{role_label}: {text}\n"
        history_context += "\n"

    # Build sample for AI (max 50 rows)
    sample = df.head(50).astype(str).to_json(orient="records")
    columns = list(df.columns)
    dtypes = {col: str(df[col].dtype) for col in df.columns}

    fallback = {"answer": "I couldn't process that question. Try asking about totals, counts, or filtering by specific values.", "rows": []}

    if not client:
        print("⚠️ No OpenAI client — returning fallback")
        return fallback

    try:
        prompt = f"""You have a dataset with {len(df)} rows.
Columns and types: {json.dumps(dtypes)}

Sample (first 50 rows):
{sample}

{history_context}
User question: "{question}"

Respond with JSON:
{{
  "answer": "A concise natural language answer to the question",
  "operation": "filter" | "sum" | "count" | "top" | "none",
  "column": "the exact column name to operate on",
  "value": "the filter value if applicable"
}}

Guidelines:
- For "total revenue" questions: use operation "sum" on the appropriate money/amount column
- For "unpaid invoices" questions: use operation "filter" with the status column and value like "Unpaid"
- For "top customers" questions: use operation "top" on a money/amount column
- For counting questions: use operation "count"
- Use EXACT column names from the dataset. Available columns: {columns}"""

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a data analyst. Return only valid JSON. Use exact column names from the dataset."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            timeout=15.0
        )

        ai_result = json.loads(response.choices[0].message.content)
    except Exception as e:
        print(f"❌ AI ask failed: {e}")
        return fallback

    # Execute the operation with Pandas
    answer = ai_result.get("answer", "")
    operation = ai_result.get("operation", "none")
    column = ai_result.get("column", "")
    value = ai_result.get("value", "")
    result_rows = []

    try:
        if operation == "filter" and column and column in df.columns:
            filtered = df[df[column].astype(str).str.contains(str(value), case=False, na=False)]
            result_rows = filtered.head(20).astype(str).to_dict(orient="records")
        elif operation == "sum" and column and column in df.columns:
            numeric_col = pd.to_numeric(df[column], errors='coerce')
            total = numeric_col.sum()
            answer = f"{answer}\n\nTotal: ₹{total:,.2f}"
        elif operation == "count" and column and column in df.columns:
            if value:
                count = len(df[df[column].astype(str).str.contains(str(value), case=False, na=False)])
            else:
                count = len(df)
            answer = f"{answer}\n\nCount: {count}"
        elif operation == "top" and column and column in df.columns:
            numeric_col = pd.to_numeric(df[column], errors='coerce')
            df_temp = df.copy()
            df_temp["_sort_col"] = numeric_col
            top = df_temp.nlargest(5, "_sort_col").drop(columns=["_sort_col"])
            result_rows = top.astype(str).to_dict(orient="records")
    except Exception as e:
        print(f"⚠️ Pandas operation failed: {e}")
        answer += f"\n\n(Could not execute data operation: {e})"

    print(f"✅ Answer: {answer[:100]}...")
    return {"answer": answer, "rows": result_rows}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)

