from ..services.finnhub_service import get_stock_price
from .connections import active_connections
import json
import asyncio
import threading
import time
import logging

logging.basicConfig(
    filename="stock_updates.log",
    level=logging.INFO,
    format="%(asctime)s - %(message)s"
)

STOCKS = ["AAPL", "MSFT", "GOOGL"]
LATEST_STOCKS = {}

async def notify_clients():
    if not active_connections:
        return
    data = json.dumps({"type": "update", "stocks": LATEST_STOCKS})
    for conn in active_connections[:]:  # Create a copy to avoid modification during iteration
        try:
            await conn.send_text(data)
        except Exception as e:
            print("⚠️ Error sending to client:", e)
            # Remove disconnected client
            if conn in active_connections:
                active_connections.remove(conn)

def fetch_stocks():
    global LATEST_STOCKS
    for symbol in STOCKS:
        data = get_stock_price(symbol)
        if "error" not in data:
            LATEST_STOCKS[symbol] = data
            print(f"Updated {symbol}: ${data['current']}")
        else:
            print(f"Error fetching {symbol}: {data['error']}")

    # Run notify_clients asynchronously
    try:
        asyncio.run(notify_clients())
    except Exception as e:
        print(f"Error notifying clients: {e}")

def _scheduler_loop():
    """Background loop that runs every minute"""
    while True:
        fetch_stocks()
        time.sleep(60)  # Wait 1 minute

def start_scheduler():
    """Start background scheduler using threading"""
    scheduler_thread = threading.Thread(target=_scheduler_loop, daemon=True)
    scheduler_thread.start()
    print("✅ Scheduler started: Fetching stock data every 1 minute.")
