# FlowBridge Prompts

Perfect — now weʼre going to package your entire project into 2 powerful
prompts:

- Frontend Prompt (UI + behavior)
- n8n Backend Prompt (workflows + integrations)

You can paste these into ChatGPT / AI builder and get most of your system
generated.

---

## 🚀 1. FRONTEND PROMPT (FlowBridge UI)

You are an expert frontend developer and product designer.
Build a clean, modern, single-page web application called “FlowBridge”.

**GOAL:**
Create a SaaS-style interface that allows users to upload messy business data, analyze it using AI, and trigger automated workflows like invoice generation and email sending.

### UI REQUIREMENTS:

**1. Header:**
- Title: FlowBridge
- Subtitle: “Turn messy business data into automated actions instantly”

**2. File Upload Section:**
- Drag & drop or file input (CSV/Excel)
- Button: “Analyze Data”

**3. AI Processing State:**
- Show loading animation or text: “Analyzing data with AI…”
- Add slight delay for realism

**4. Results Section:**
Display:
- Detected Entity (e.g., Customers)
- Field Mapping (table format)
- Confidence Scores (percentages)
- Conflict Detection:
  - Show duplicates found
  - Show “Recommended record selected”

**5. Action Button:**
- “Sync & Generate Invoice”

**6. Final Status Section:**
After sync:
- Show:
  - “Invoice created successfully”
  - “Email sent to client”
  - “Invoice saved locally”

### FUNCTIONAL REQUIREMENTS:

**1. When user uploads file:**
- Send file via POST request to: `/webhook/analyze`

**2. Display JSON response nicely formatted**

**3. When user clicks “Sync & Generate Invoice”:**
- Send request to: `/webhook/sync`

**4. Show success message after response**

### TECH STACK:
- Pure HTML, CSS, JavaScript (no frameworks)
- Use fetch API for HTTP calls

### UX IMPROVEMENTS:
- Add loading spinner
- Add clean card layout
- Use colors: blue, white, light gray
- Add subtle animations

### IMPORTANT:
- Make it look like a real SaaS dashboard
- Prioritize clarity and visual impact over complexity
- Code should be clean and easy to run locally

### OUTPUT:
Provide complete working HTML + CSS + JS in a single file.

---

## ⚙ 2. n8n BACKEND PROMPT (FULL WORKFLOW)

You are an expert automation engineer using n8n.
Design a complete backend workflow system for a product called FlowBridge.

**GOAL:**
Build two n8n workflows:
1. Data Analysis Workflow
2. Sync & Automation Workflow

### WORKFLOW 1: `/webhook/analyze`
**STEPS:**
1. **Webhook Node (POST)**
   - Accept file upload (CSV/Excel)
2. **Parse File**
   - Convert to JSON
3. **OpenAI Node:**
   - Prompt: Analyze business data and return:
     - detected_entity
     - field mappings
     - confidence scores
     - cleaned data
     - duplicate/conflict detection
   - Return structured JSON.
4. **Respond to Webhook:**
   - Send JSON back to frontend

### WORKFLOW 2: `/webhook/sync`
**STEPS:**
1. **Webhook Node**
2. **Use processed data (or static demo data)**
3. **Create Contact in Xero:**
   - Map: name, email
4. **Create Invoice in Xero:**
   - Type: ACCREC
   - Status: AUTHORISED
   - Add line item: description, amount
5. **Get Invoice as PDF**
6. **Send Email:**
   - Attach PDF
   - Send to customer email
7. **Save PDF Locally:**
   - Use Write Binary File node
   - Path: `./invoices/invoice_{{$json.InvoiceNumber}}.pdf`
8. **Respond:**
   - Return:
     ```json
     {
       "status": "success",
       "message": "Invoice created, emailed, and saved locally"
     }
     ```

### INTEGRATIONS REQUIRED:
- OpenAI API (for AI processing)
- Xero API (OAuth2)
- Email (SMTP or Gmail)
- Local file system (Write Binary File node)

### IMPORTANT:
- Keep workflow simple and demo-friendly
- Ensure all steps are connected properly
- Use clear node names
- Add small delays for realism

### OUTPUT:
- Step-by-step node configuration
- Field mappings
- Example JSON input/output

---

## 🔗 HOW THEY CONNECT
| Frontend Action | n8n Endpoint |
| --- | --- |
| Upload file | `/webhook/analyze` |
| Click sync | `/webhook/sync` |

## 🧠 Final System Flow
Frontend UI
   ↓
Analyze → n8n → AI → Mapping → UI
   ↓
Sync → n8n → Xero + Email + Save PDF

---

## 🏆 What You Get
With these 2 prompts:
✅ Full frontend UI
✅ Working backend automation
✅ AI integration
✅ Invoice + email + local storage
✅ Real product demo

## 🔥 Pro Tip (Important)
- Before demo:
  - Replace real data with safe demo data
  - Keep internet stable
  - Pre-test entire flow

🚀 **One-line summary:** “Frontend shows the magic. n8n executes the magic.”
