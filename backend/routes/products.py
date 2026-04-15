from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from db import supabase

router = APIRouter()

class ProductCreate(BaseModel):
    store_id: str
    name: str
    sku: str
    category: str = "General"
    stock: int = 0
    cost_price: float = 0
    sale_price: float = 0
    attributes: list = []

class RestockBody(BaseModel):
    quantity: int
    supplier: str
    cost_per_unit: Optional[float] = None

@router.get("/")
def list_products(store_id: str):
    res = supabase.table("products").select("*").eq("store_id", store_id).order("created_at", desc=True).execute()
    return res.data or []

@router.post("/")
def create_product(body: ProductCreate):
    # Check for duplicate SKU within the same store
    existing = supabase.table("products").select("id").eq("store_id", body.store_id).eq("sku", body.sku).execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="SKU already exists")
    res = supabase.table("products").insert({
        "store_id": body.store_id,
        "name": body.name,
        "sku": body.sku,
        "category": body.category,
        "stock": body.stock,
        "cost_price": body.cost_price,
        "sale_price": body.sale_price,
        "attributes": body.attributes,
    }).execute()
    return res.data[0] if res.data else {}

@router.patch("/{product_id}/restock")
def restock_product(product_id: str, body: RestockBody):
    prod = supabase.table("products").select("*").eq("id", product_id).execute()
    if not prod.data:
        raise HTTPException(status_code=404, detail="Product not found")
    new_stock = prod.data[0]["stock"] + body.quantity
    update_data = {"stock": new_stock}
    if body.cost_per_unit is not None:
        update_data["cost_price"] = body.cost_per_unit
    res = supabase.table("products").update(update_data).eq("id", product_id).execute()
    return res.data[0] if res.data else {}

@router.patch("/{product_id}")
def update_product_stock(product_id: str, stock: int):
    """Used internally when completing a sale"""
    res = supabase.table("products").update({"stock": stock}).eq("id", product_id).execute()
    return res.data[0] if res.data else {}

@router.delete("/{product_id}")
def delete_product(product_id: str):
    supabase.table("products").delete().eq("id", product_id).execute()
    return {"ok": True}
