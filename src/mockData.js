export const MOCK_ANALYZE_RESPONSE = {
  detected_entity: "Customers",
  field_mappings: [
    { source: "cust_name", mapped_to: "Customer Name", confidence: 97 },
    { source: "email_addr", mapped_to: "Email Address", confidence: 93 },
    { source: "inv_amt", mapped_to: "Invoice Amount", confidence: 88 },
    { source: "ph_no", mapped_to: "Phone Number", confidence: 82 },
    { source: "addr_line1", mapped_to: "Street Address", confidence: 79 },
    { source: "cntry", mapped_to: "Country", confidence: 74 },
  ],
  duplicates: [
    { field: "email_addr", value: "alice@example.com", occurrences: 2 },
    { field: "cust_name", value: "Acme Corp", occurrences: 3 },
  ],
  recommended_record: {
    customer_name: "Alice Johnson",
    email: "alice@example.com",
    invoice_amount: "₹4,200.00",
  },
  cleaned_rows: 47,
  total_rows: 50,
};

export const MOCK_SYNC_RESPONSE = {
  status: "success",
  message: "Invoice created, emailed, and saved locally",
  invoice_number: "INV-2024-00812",
  xero_contact_id: "xc_3f8a2b1d9e",
  email_sent_to: "alice@example.com",
  pdf_path: "./invoices/invoice_INV-2024-00812.pdf",
};

export const MOCK_CLEAN_RESPONSE = {
  health_score: 85,
  columns_before: ["cust_name", "email_addr", "inv_amt", "status", "date"],
  columns_after: ["Customer Name", "Email Address", "Invoice Amount", "Status", "Date"],
  column_mapping: { cust_name: "Customer Name", email_addr: "Email Address", inv_amt: "Invoice Amount" },
  preview_before: [
    { cust_name: "Alice Johnson", email_addr: "ALICE@example.com", inv_amt: "4200", status: "Paid", date: "2024-01-15" },
    { cust_name: "Bob Smith", email_addr: "bob@corp.com ", inv_amt: "3100", status: "Unpaid", date: "2024-02-20" },
    { cust_name: "Alice Johnson", email_addr: "alice@example.com", inv_amt: "4200", status: "Paid", date: "2024-01-15" },
    { cust_name: "Carol Davis", email_addr: "carol@biz.io", inv_amt: "", status: "Overdue", date: "invalid" },
    { cust_name: "Dave Wilson", email_addr: "Dave@Work.COM", inv_amt: "5800", status: "Paid", date: "2024-03-10" },
  ],
  preview_after: [
    { "Customer Name": "Alice Johnson", "Email Address": "alice@example.com", "Invoice Amount": "4200", Status: "Paid", Date: "2024-01-15" },
    { "Customer Name": "Bob Smith", "Email Address": "bob@corp.com", "Invoice Amount": "3100", Status: "Unpaid", Date: "2024-02-20" },
    { "Customer Name": "Carol Davis", "Email Address": "carol@biz.io", "Invoice Amount": "N/A", Status: "Overdue", Date: "NaT" },
    { "Customer Name": "Dave Wilson", "Email Address": "dave@work.com", "Invoice Amount": "5800", Status: "Paid", Date: "2024-03-10" },
  ],
  total_rows: 47,
  total_before: 50,
  duplicates_removed: 3,
  nulls_filled: 4,
  cleaning_rules: ["lowercase_emails", "parse_dates:date", "drop_duplicates", "fill_nulls"],
  charts: [
    {
      id: "pie_Status",
      type: "pie",
      title: "Status Distribution",
      data: [
        { name: "Paid", value: 28 },
        { name: "Unpaid", value: 12 },
        { name: "Overdue", value: 7 },
      ],
      dataKey: "value",
      nameKey: "name"
    },
    {
      id: "bar_Invoice Amount",
      type: "bar",
      title: "Top by Invoice Amount",
      data: [
        { name: "Dave Wilson", value: 5800 },
        { name: "Alice Johnson", value: 4200 },
        { name: "Bob Smith", value: 3100 },
        { name: "Carol Davis", value: 2750 },
        { name: "Eve Brown", value: 1900 },
      ],
      dataKey: "value",
      nameKey: "name"
    }
  ],
};

export const MOCK_ASK_RESPONSE = {
  answer: "Based on the dataset, the total revenue from all invoices is ₹47,500.00. This includes both paid and unpaid records.",
  rows: [
    { "Customer Name": "Dave Wilson", "Invoice Amount": "5800", Status: "Paid" },
    { "Customer Name": "Alice Johnson", "Invoice Amount": "4200", Status: "Paid" },
    { "Customer Name": "Bob Smith", "Invoice Amount": "3100", Status: "Unpaid" },
  ],
};
