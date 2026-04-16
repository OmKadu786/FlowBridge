from fastapi import APIRouter
from pydantic import BaseModel
from openai import OpenAI
from db import supabase
import os

import json

router = APIRouter()
client = OpenAI(
    api_key=os.getenv("OPENAI_API_KEY"),
    base_url=os.getenv("OPENAI_BASE_URL", "https://api.deepseek.com")
)

class Msg(BaseModel):
    role: str
    content: str
    
class ChatMessage(BaseModel):
    store_id: str
    messages: list[Msg]

@router.post("/")
def chat(body: ChatMessage):
    store = supabase.table("stores").select("*").eq("id", body.store_id).execute()
    products = supabase.table("products").select("id,name,pid,stock,cost_price,sale_price,category").eq("store_id", body.store_id).execute()
    orders = supabase.table("orders").select("total,customer_email,created_at").eq("store_id", body.store_id).order("created_at", desc=True).limit(20).execute()

    store_info = store.data[0] if store.data else {}
    products_info = products.data or []
    orders_info = orders.data or []

    total_revenue = sum(float(o.get("total", 0)) for o in orders_info)
    low_stock = [p for p in products_info if p.get("stock", 0) < 5]

    system_prompt = f"""You are FlowBridge AI, an intelligent business assistant for a store management platform.
You have access to the following store data:

Store: {store_info.get('name', 'Unknown')} ({store_info.get('category', 'General')})
Currency: {store_info.get('currency', 'USD')}

Products ({len(products_info)} total):
{chr(10).join(f"- {p['name']} (PID: {p['pid']}) - Stock: {p['stock']}" for p in products_info)}

Answer concisely and helpfully. You are fully capable of managing the entire store.
IMPORTANT RULES:
1. To restock or update an item, ask for approval and call `update_inventory`.
2. To ADD completely new items, ask for approval of details (name, category, stock, price), and call `add_products`. You can securely bulk-add as many products as needed in one go!
3. To DELETE an item, vigorously warn them that it is permanent, ask for confirmation, and call `delete_product`.
4. To PROCESS A SALE (create an order), ask for the items being sold and customer email (optional), then call `create_order`. 

Make sure you get explicit "Yes" from the user before calling ANY of these tools."""

    tools = [
        {
            "type": "function",
            "function": {
                "name": "update_inventory",
                "description": "Updates or restocks the inventory of a specific product based on its PID.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "pid": {"type": "string", "description": "The PID (product id) of the product"},
                        "quantity": {"type": "number", "description": "Amount to add (positive) or subtract (negative) from current stock"}
                    },
                    "required": ["pid", "quantity"]
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "add_products",
                "description": "Creates one or completely new products in the store database.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "products": {
                            "type": "array",
                            "description": "List of products to add",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "name": {"type": "string", "description": "Name of the new product"},
                                    "category": {"type": "string", "description": "Category of the product (e.g. Laptops, Phones)"},
                                    "stock": {"type": "number", "description": "Initial stock quantity"},
                                    "sale_price": {"type": "number", "description": "Sale price"}
                                },
                                "required": ["name", "category", "stock", "sale_price"]
                            }
                        }
                    },
                    "required": ["products"]
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "delete_product",
                "description": "Permanently deletes a product from the database.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "pid": {"type": "string", "description": "The PID of the product to delete"}
                    },
                    "required": ["pid"]
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "create_order",
                "description": "Processes a point-of-sale transaction, deducting stock and creating an order record.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "items": {
                            "type": "array",
                            "description": "List of items the customer is buying",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "pid": {"type": "string"},
                                    "quantity": {"type": "number"}
                                },
                                "required": ["pid", "quantity"]
                            }
                        },
                        "customer_email": {"type": "string", "description": "Optional email of the customer"}
                    },
                    "required": ["items"]
                }
            }
        }
    ]

    chat_history = [{"role": "system", "content": system_prompt}]
    for m in body.messages:
        chat_history.append({"role": m.role, "content": m.content})

    try:
        response = client.chat.completions.create(
            model="deepseek-chat",
            messages=chat_history,
            max_tokens=4096,
            temperature=0.7,
            tools=tools,
            tool_choice="auto"
        )
        
        msg = response.choices[0].message
        
        # Check for tool call
        if msg.tool_calls:
            replies = []
            for tc in msg.tool_calls:
                if tc.function.name == "update_inventory":
                    args = json.loads(tc.function.arguments)
                    pid = args.get("pid")
                    qty = args.get("quantity")
                    
                    # Find product in db
                    prod = next((p for p in products_info if p["pid"].lower() == str(pid).lower()), None)
                    if prod:
                        new_stock = prod["stock"] + int(qty)
                        supabase.table("products").update({"stock": new_stock}).eq("id", prod["id"]).execute()
                        replies.append(f"✅ Fast-Track: I have updated the inventory for {prod['name']}. Your stock is now {new_stock}.")
                    else:
                        replies.append(f"❌ Could not find a product with PID '{pid}'.")
                elif tc.function.name == "add_products":
                    args = json.loads(tc.function.arguments)
                    prods = args.get("products", [])
                    inserted_names = []
                    for prod_args in prods:
                        supabase.table("products").insert({
                            "store_id": body.store_id,
                            "name": prod_args.get("name"),
                            "category": prod_args.get("category"),
                            "stock": int(prod_args.get("stock", 0)),
                            "sale_price": float(prod_args.get("sale_price", 0))
                        }).execute()
                        inserted_names.append(prod_args.get("name"))
                    
                    if len(inserted_names) == 1:
                        replies.append(f"✅ Magic! Securely added **{inserted_names[0]}** to your catalog.")
                    elif len(inserted_names) > 1:
                        replies.append(f"✅ Bulk Upload Complete! Successfully added {len(inserted_names)} new products to your catalog.")
                elif tc.function.name == "delete_product":
                    args = json.loads(tc.function.arguments)
                    pid = args.get("pid")
                    prod = next((p for p in products_info if p["pid"].lower() == str(pid).lower()), None)
                    if prod:
                        supabase.table("products").delete().eq("id", prod["id"]).execute()
                        replies.append(f"🗑️ Done. I have permanently deleted **{prod['name']}** from the database.")
                    else:
                        replies.append(f"❌ I couldn't find a product with PID '{pid}' to delete.")
                elif tc.function.name == "create_order":
                    args = json.loads(tc.function.arguments)
                    items = args.get("items", [])
                    email = args.get("customer_email", "")
                    
                    subtotal = 0
                    valid_items = []
                    error_msg = None
                    # Verify stock and calculate total
                    for i in items:
                        prod = next((p for p in products_info if p["pid"].lower() == str(i["pid"]).lower()), None)
                        if prod:
                            q = int(i["quantity"])
                            if prod["stock"] < q:
                                error_msg = f"❌ Not enough stock for {prod['name']}. You only have {prod['stock']} available."
                                break
                            
                            subtotal += prod["sale_price"] * q
                            valid_items.append({"id": prod["id"], "name": prod["name"], "pid": prod["pid"], "quantity": q, "price": prod["sale_price"]})
                    
                    if error_msg:
                        replies.append(error_msg)
                    elif not valid_items:
                        replies.append("❌ I couldn't match those PIDs to any valid products.")
                    else:
                        tax_rate = float(store_info.get("tax_rate", 0)) / 100
                        tax = round(subtotal * tax_rate, 2)
                        total = round(subtotal + tax, 2)
                        
                        # Deduct stock for all valid items
                        for vi in valid_items:
                            old_prod = next(p for p in products_info if p["id"] == vi["id"])
                            supabase.table("products").update({"stock": old_prod["stock"] - vi["quantity"]}).eq("id", vi["id"]).execute()
                            
                        # Create order
                        supabase.table("orders").insert({
                            "store_id": body.store_id,
                            "items": valid_items,
                            "subtotal": subtotal,
                            "tax": tax,
                            "total": total,
                            "customer_email": email
                        }).execute()
                        
                        replies.append(f"🛒 **Sale Processed Successfully!** The order total came out to **{store_info.get('currency', '$')}{total}**. Stock has been securely deducted.")

            reply = "\n\n".join(replies)
        else:
            reply = msg.content
    except Exception as e:
        reply = f"I'm having trouble connecting right now. Error: {str(e)[:100]}"

    return {"reply": reply}
