from datetime import datetime

# In-memory cache dictionary
stock_cache = {}

def update_stock_cache(symbol: str, data: dict):
    """Store fetched stock data in cache"""
    stock_cache[symbol] = {
        "data": data,
        "updated_at": datetime.now().isoformat()
    }

def get_cached_stock(symbol: str):
    """Retrieve stock data from cache if available"""
    return stock_cache.get(symbol)
