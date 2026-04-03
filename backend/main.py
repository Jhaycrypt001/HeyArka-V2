from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
import numpy as np
from statsmodels.tsa.holtwinters import ExponentialSmoothing
import time
import yfinance as yf

app = FastAPI(title="HeyArka Universal Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class SubscribeRequest(BaseModel):
    email: str

# --- 1. PREDICTIVE FORECAST ENGINE ---
@app.get("/api/forecast/{ticker}")
def get_forecast(ticker: str):
    try:
        yf_ticker = f"{ticker.upper()}-USD"
        df = yf.Ticker(yf_ticker).history(period="2y")
        if df.empty:
            raise HTTPException(status_code=404, detail="Ticker not found")

        ohlc = []
        for ts, row in df.iterrows():
            ohlc.append({
                "time": int(ts.timestamp()),
                "open": float(row['Open']),
                "high": float(row['High']),
                "low": float(row['Low']),
                "close": float(row['Close'])
            })

        close_prices = pd.Series([x['close'] for x in ohlc])
        current_price = close_prices.iloc[-1]

        # Quant Logic
        delta = close_prices.diff()
        gain = (delta.where(delta > 0, 0)).rolling(14).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(14).mean()
        rsi = 100 - (100 / (1 + (gain / loss).iloc[-1]))

        # Holt-Winters 5-Day Prediction
        model = ExponentialSmoothing(close_prices, trend="add", damped_trend=True).fit()
        forecast = model.forecast(5)
        
        # Connect the prediction line to the last historical candle
        prediction_data = [{"time": ohlc[-1]["time"], "value": current_price}]
        for i, val in enumerate(forecast):
            prediction_data.append({
                "time": ohlc[-1]["time"] + ((i + 1) * 86400), 
                "value": float(val)
            })

        return {
            "status": f"RSI: {rsi:.1f} | Bias: {'Bullish' if rsi > 50 else 'Bearish'}",
            "current_price": current_price,
            "forecast_target_price": prediction_data[-1]["value"],
            "quant_metrics": {"vwap": float(current_price * 0.998)},
            "ohlc_data": ohlc,
            "prediction_data": prediction_data
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

# --- 2. GLOBAL LIQUIDITY PULSE ---
@app.get("/api/global-pulse")
async def get_global_pulse():
    return {
        "status": "success",
        "data": [
            {"pair": "BTC/USD", "liquidity": "1.2B", "flow": "+45.2M", "trend": "Accumulation", "color": "#f7931a"},
            {"pair": "ETH/USD", "liquidity": "840M", "flow": "+12.8M", "trend": "Bullish", "color": "#627eea"},
            {"pair": "SOL/USD", "liquidity": "142.5M", "flow": "+2.4M", "trend": "High Vel", "color": "#14f195"},
            {"pair": "TOTAL/MKT", "liquidity": "2.4T", "flow": "+1.1B", "trend": "Expansion", "color": "#00f6ff"}
        ]
    }

# --- 3. NEWSLETTER ---
@app.post("/api/subscribe")
async def subscribe(req: SubscribeRequest):
    print(f"New Alpha Lead: {req.email}")
    return {"status": "success"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)