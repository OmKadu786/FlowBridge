from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

load_dotenv()

from routes.store import router as store_router
from routes.products import router as products_router
from routes.orders import router as orders_router
from routes.customers import router as customers_router
from routes.activity import router as activity_router
from routes.chat import router as chat_router
from routes.auth import router as auth_router

import httpx
from fastapi.responses import JSONResponse

app = FastAPI(title="FlowBridge API", version="1.0.0")

@app.exception_handler(httpx.HTTPStatusError)
async def httpx_exception_handler(request, exc: httpx.HTTPStatusError):
    headers = {"Access-Control-Allow-Origin": "*"}
    if exc.response.status_code == 404:
        return JSONResponse(status_code=400, content={"detail": "Database error: Please ensure you ran schema.sql in Supabase!"}, headers=headers)
    return JSONResponse(status_code=400, content={"detail": f"Database error ({exc.response.status_code}): {exc.response.text}"}, headers=headers)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api/auth", tags=["auth"])
app.include_router(store_router, prefix="/api/store", tags=["store"])
app.include_router(products_router, prefix="/api/products", tags=["products"])
app.include_router(orders_router, prefix="/api/orders", tags=["orders"])
app.include_router(customers_router, prefix="/api/customers", tags=["customers"])
app.include_router(activity_router, prefix="/api/activity", tags=["activity"])
app.include_router(chat_router, prefix="/api/chat", tags=["chat"])

@app.get("/")
def health():
    return {"status": "ok", "app": "FlowBridge API"}
