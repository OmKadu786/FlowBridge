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
    invoice_amount: "$4,200.00",
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
