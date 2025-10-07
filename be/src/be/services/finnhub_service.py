import os
import requests
from dotenv import load_dotenv
from pathlib import Path

# Load .env from be/src/be/ directory (where the .env file actually is)
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(env_path)

API_KEY = os.getenv("FINNHUB_API_KEY")

def get_stock_price(symbol: str):
    """Fetch live stock data from Finnhub"""
    if not API_KEY:
        return {"error": "FINNHUB_API_KEY not found in environment variables"}
    
    # Use the correct REST API endpoint for stock quotes
    url = f"https://finnhub.io/api/v1/quote?symbol={symbol}&token={API_KEY}"
    
    try:
        response = requests.get(url, timeout=10)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            
            # Check if the response contains valid data
            if "c" not in data or data["c"] is None or data["c"] == 0:
                return {
                    "error": f"No data found for symbol {symbol}. Market might be closed or invalid symbol.",
                    "response": data
                }
            
            return {
                "symbol": symbol,
                "current": data["c"],
                "high": data["h"],
                "low": data["l"],
                "open": data["o"],
                "previous_close": data["pc"]
            }
        else:
            return {
                "error": f"API request failed with status {response.status_code}",
                "response": response.text
            }
    except requests.exceptions.RequestException as e:
        return {"error": f"Request failed: {str(e)}"}

