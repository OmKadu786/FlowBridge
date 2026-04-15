from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from db import supabase

router = APIRouter()

class AuthBody(BaseModel):
    username: str
    password: str

@router.post("/register")
def register(body: AuthBody):
    # Check if username exists
    existing = supabase.table("users").select("id").eq("username", body.username).execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="Username already exists")

    # Create new user
    res = supabase.table("users").insert({
        "username": body.username,
        "password": body.password  # Stored unencrypted as requested
    }).execute()

    user = res.data[0]
    return {"user": user, "store": None}

@router.post("/login")
def login(body: AuthBody):
    # Find user
    res = supabase.table("users").select("*").eq("username", body.username).eq("password", body.password).execute()
    if not res.data:
        raise HTTPException(status_code=401, detail="Invalid username or password")

    user = res.data[0]
    
    # Check if user has a store
    store_res = supabase.table("stores").select("*").eq("user_id", user["id"]).execute()
    store = store_res.data[0] if store_res.data else None

    return {"user": user, "store": store}
