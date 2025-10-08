import os
import asyncio
from fastapi import FastAPI, WebSocket
from pathlib import Path
from .services.finnhub_service import get_stock_price
from .utils.scheduler import start_scheduler
from .utils.connections import active_connections
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

app = FastAPI(title="X-Stock API")

# Load environment variables
env_path = Path(__file__).parent / '.env'
load_dotenv(env_path)

domain = os.getenv("FE_DOMAIN")

@app.websocket("/ws/stocks")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    active_connections.append(websocket)
    print("✅ Client connected")

    try:
        while True:
            await asyncio.sleep(10)  # keep connection alive
    except Exception as e:
        print("❌ Client disconnected:", e)
    finally:
        if websocket in active_connections:
            active_connections.remove(websocket)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[f"{domain}"] if domain else ["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_event():
    start_scheduler()

@app.get("/stock/{symbol}")
def read_stock(symbol: str):
    return get_stock_price(symbol)
