from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from db import supabase
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

router = APIRouter()

class OrderItem(BaseModel):
    product_id: str
    name: str
    price: float
    quantity: int

class OrderCreate(BaseModel):
    store_id: str
    items: list[OrderItem]
    subtotal: float
    tax: float
    total: float
    status: str = 'paid'
    customer_email: Optional[str] = None

@router.get("/")
def list_orders(store_id: str):
    res = supabase.table("orders").select("*").eq("store_id", store_id).order("created_at", desc=True).execute()
    return res.data or []

@router.post("/")
def create_order(body: OrderCreate):
    # 1. Insert order
    order_data = {
        "store_id": body.store_id,
        "items": [item.model_dump() for item in body.items],
        "subtotal": body.subtotal,
        "tax": body.tax,
        "total": body.total,
        "status": body.status,
        "customer_email": body.customer_email,
    }
    res = supabase.table("orders").insert(order_data).execute()
    order = res.data[0] if res.data else {}

    # 2. Deduct stock from products
    for item in body.items:
        prod = supabase.table("products").select("stock").eq("id", item.product_id).execute()
        if prod.data:
            new_stock = max(0, prod.data[0]["stock"] - item.quantity)
            supabase.table("products").update({"stock": new_stock}).eq("id", item.product_id).execute()

    # 3. Upsert customer if email provided
    if body.customer_email:
        existing = supabase.table("customers").select("*").eq("store_id", body.store_id).eq("email", body.customer_email).execute()
        if existing.data:
            c = existing.data[0]
            supabase.table("customers").update({
                "order_count": c["order_count"] + 1,
                "total_spent": float(c["total_spent"]) + body.total,
                "last_seen": "now()",
            }).eq("id", c["id"]).execute()
        else:
            supabase.table("customers").insert({
                "store_id": body.store_id,
                "email": body.customer_email,
                "order_count": 1,
                "total_spent": body.total,
            }).execute()

    return order

@router.post("/{order_id}/email")
def send_order_email(order_id: str):
    res = supabase.table("orders").select("*").eq("id", order_id).execute()
    if not res.data:
        return {"error": "Order not found"}
    order = res.data[0]
    
    if not order.get("customer_email"):
        return {"error": "No customer email associated with this order"}

    try:
        smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
        smtp_port = int(os.getenv("SMTP_PORT", 587))
        smtp_user = os.getenv("SMTP_USER")
        smtp_pass = os.getenv("SMTP_PASS")

        if smtp_user and smtp_pass:
            items_html = "".join([
                f"<tr><td style='padding:8px; border-bottom:1px solid #ddd;'>{i.get('name')} x{i.get('quantity')}</td>"
                f"<td style='padding:8px; border-bottom:1px solid #ddd; text-align:right;'>₹{float(i.get('price')) * int(i.get('quantity')):.2f}</td></tr>" 
                for i in order.get("items", [])
            ])

            html_content = f"""
            <html>
            <body style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #7c3aed;">FlowBridge Receipt</h2>
                <p>Thank you for your purchase!</p>
                <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                    {items_html}
                </table>
                <div style="margin-top: 20px; text-align: right;">
                    <p>Subtotal: ₹{order.get('subtotal'):.2f}</p>
                    <p>Tax: ₹{order.get('tax'):.2f}</p>
                    <h3 style="color: #1a1a1a;">Total: ₹{order.get('total'):.2f}</h3>
                </div>
            </body>
            </html>
            """

            msg = MIMEMultipart("alternative")
            msg["Subject"] = "Your Purchase Receipt from FlowBridge"
            msg["From"] = smtp_user
            msg["To"] = order.get("customer_email")
            msg.attach(MIMEText(html_content, "html"))

            server = smtplib.SMTP(smtp_server, smtp_port)
            server.starttls()
            server.login(smtp_user, smtp_pass)
            server.send_message(msg)
            server.quit()
            return {"success": True}
    except Exception as e:
        print(f"Failed to send email: {e}")
        return {"error": str(e)}

    return {"error": "SMTP credentials not configured"}

@router.post("/{order_id}/reminder")
def send_order_reminder(order_id: str):
    res = supabase.table("orders").select("*").eq("id", order_id).execute()
    if not res.data:
        return {"error": "Order not found"}
    order = res.data[0]
    
    if not order.get("customer_email"):
        return {"error": "No customer email associated with this order"}

    try:
        smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
        smtp_port = int(os.getenv("SMTP_PORT", 587))
        smtp_user = os.getenv("SMTP_USER")
        smtp_pass = os.getenv("SMTP_PASS")

        if smtp_user and smtp_pass:
            items_html = "".join([
                f"<tr><td style='padding:8px; border-bottom:1px solid #ddd;'>{i.get('name')} x{i.get('quantity')}</td>"
                f"<td style='padding:8px; border-bottom:1px solid #ddd; text-align:right;'>₹{float(i.get('price')) * int(i.get('quantity')):.2f}</td></tr>" 
                for i in order.get("items", [])
            ])

            html_content = f"""
            <html>
            <body style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #ef4444;">Payment Reminder: FlowBridge</h2>
                <p>Hello,</p>
                <p>This is a polite reminder that your recent payment of <strong>₹{order.get('total'):.2f}</strong> is currently due.</p>
                <table style="width: 100%; border-collapse: collapse; margin-top: 20px; margin-bottom: 20px;">
                    {items_html}
                </table>
                <p>Please complete this transaction at your earliest convenience. Thank you!</p>
            </body>
            </html>
            """

            msg = MIMEMultipart("alternative")
            msg["Subject"] = "Action Required: Payment Due for FlowBridge Order"
            msg["From"] = smtp_user
            msg["To"] = order.get("customer_email")
            msg.attach(MIMEText(html_content, "html"))

            server = smtplib.SMTP(smtp_server, smtp_port)
            server.starttls()
            server.login(smtp_user, smtp_pass)
            server.send_message(msg)
            server.quit()
            return {"success": True}
    except Exception as e:
        print(f"Failed to send reminder email: {e}")
        return {"error": str(e)}

    return {"error": "SMTP credentials not configured"}
