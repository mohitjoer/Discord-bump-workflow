from fastapi import FastAPI
from be.services.finnhub_service import get_stock_price
from be.utils.scheduler import start_scheduler

app = FastAPI(title="X-Stock API")

@app.on_event("startup")
def startup_event():
    start_scheduler()

@app.get("/stock/{symbol}")
def read_stock(symbol: str):
    return get_stock_price(symbol)
