from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from db import supabase

router = APIRouter()

class StoreCreate(BaseModel):
    user_id: str
    name: str
    category: str
    currency: str = "USD"
    tax_rate: float = 0

@router.post("/")
def create_store(body: StoreCreate):
    res = supabase.table("stores").insert({
        "user_id": body.user_id,
        "name": body.name,
        "category": body.category,
        "currency": body.currency,
        "tax_rate": body.tax_rate,
    }).execute()
    return res.data[0] if res.data else {}

@router.get("/{store_id}")
def get_store(store_id: str):
    res = supabase.table("stores").select("*").eq("id", store_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Store not found")
    return res.data[0]

@router.get("/")
def list_stores():
    res = supabase.table("stores").select("*").order("created_at", desc=True).execute()
    return res.data or []
