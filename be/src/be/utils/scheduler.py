import threading
import time
import logging
from ..services.finnhub_service import get_stock_price

# Configure logging to both console and file
logging.basicConfig(
    filename="stock_updates.log",
    level=logging.INFO,
    format="%(asctime)s - %(message)s"
)

# Symbols to automatically track
STOCKS = ["AAPL", "MSFT", "GOOGL"]

def fetch_stocks():
    """Fetch stock prices and log them"""
    for symbol in STOCKS:
        data = get_stock_price(symbol)
        if "error" not in data:
            msg = f"Updated {symbol}: ${data['current']}"
            print(msg)
            logging.info(msg)
        else:
            print(f"Error fetching {symbol}: {data['error']}")
            logging.error(f"Error fetching {symbol}: {data['error']}")

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
