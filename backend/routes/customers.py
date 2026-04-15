from fastapi import APIRouter
from db import supabase

router = APIRouter()

@router.get("/")
def list_customers(store_id: str):
    res = supabase.table("customers").select("*").eq("store_id", store_id).order("last_seen", desc=True).execute()
    return res.data or []
