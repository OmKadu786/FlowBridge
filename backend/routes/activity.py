from fastapi import APIRouter
from pydantic import BaseModel
from db import supabase

router = APIRouter()

class LogCreate(BaseModel):
    store_id: str
    type: str  # system, sale, restock, product, email
    message: str

@router.get("/")
def list_activity(store_id: str):
    res = supabase.table("activity_log").select("*").eq("store_id", store_id).order("created_at", desc=True).limit(100).execute()
    return res.data or []

@router.post("/")
def create_log(body: LogCreate):
    res = supabase.table("activity_log").insert({
        "store_id": body.store_id,
        "type": body.type,
        "message": body.message,
    }).execute()
    return res.data[0] if res.data else {}
