"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { TrendingUp, TrendingDown, Activity } from "lucide-react";
import axios from "axios";

type StockData = {
  symbol: string;
  current: number;
  high: number;
  low: number;
  open: number;
  previous_close: number;
};

export default function Home() {
  const [stocks, setStocks] = useState<Record<string, StockData>>({});
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch initial data
  const fetchInitialData = useCallback(async () => {
    try {
      console.log("🔄 Fetching initial stock data...");
      const symbols = ["AAPL", "MSFT", "GOOGL"];
      const responses = await Promise.all(
        symbols.map((symbol) => 
          axios.get(`http://127.0.0.1:8000/stock/${symbol}`)
        )
      );

      const stockData: Record<string, StockData> = {};
      responses.forEach((response) => {
        if (!response.data.error) {
          stockData[response.data.symbol] = response.data;
          console.log(`✅ Loaded ${response.data.symbol}: $${response.data.current}`);
        } else {
          console.error(`❌ Error loading ${response.config?.url}:`, response.data.error);
        }
      });

      setStocks(stockData);
      setLastUpdate(new Date());
      setLoading(false);
      console.log("✅ Initial data loaded successfully");
    } catch (error) {
      console.error("❌ Failed to fetch initial stock data:", error);
      setLoading(false);
    }
  }, []);

  // Polling fallback function
  const pollStockData = useCallback(async () => {
    try {
      console.log("🔄 Polling stock data...");
      await fetchInitialData();
    } catch (error) {
      console.error("❌ Polling failed:", error);
    }
  }, [fetchInitialData]);

  // Start polling as fallback
  const startPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }
    pollingRef.current = setInterval(pollStockData, 60000); // Poll every 60 seconds
    console.log("🔄 Started polling fallback (60s intervals)");
  }, [pollStockData]);

  // Stop polling
  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
      console.log("⏹️ Stopped polling fallback");
    }
  }, []);

  // Setup WebSocket connection
  const setupWebSocket = useCallback(() => {
    try {
      // Use NEXT_PUBLIC_ prefix for client-side env vars, with fallback
      const wsUrl = process.env.NEXT_PUBLIC_API_DOMAIN;
      console.log("🔗 Connecting to WebSocket:", wsUrl);

      if (!wsUrl) {
        console.error("❌ WebSocket URL is undefined. Cannot connect.");
        startPolling(); // Use polling if WebSocket URL is missing
        return;
      }

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("✅ Connected to WebSocket");
        setConnected(true);
        stopPolling(); // Stop polling when WebSocket connects
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === "update" && message.stocks) {
            setStocks(message.stocks);
            setLastUpdate(new Date());
            console.log("📈 Received WebSocket stock updates:", message.stocks);
          }
        } catch (error) {
          console.error("❌ Error parsing WebSocket message:", error);
        }
      };

      ws.onclose = () => {
        console.log("❌ Disconnected from WebSocket");
        setConnected(false);
        startPolling(); // Start polling when WebSocket disconnects
      };

      ws.onerror = (e) => {
        console.error("⚠️ WebSocket error:", e);
        setConnected(false);
        startPolling(); // Start polling on WebSocket error
      };
    } catch (error) {
      console.error("❌ Failed to setup WebSocket:", error);
      startPolling(); // Use polling if WebSocket setup fails
    }
  }, [startPolling, stopPolling]);

  useEffect(() => {
    // Fetch initial data
    fetchInitialData();

    // Setup WebSocket
    setupWebSocket();

    // Start polling as initial fallback
    startPolling();

    // Cleanup on unmount
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      stopPolling();
    };
  }, [fetchInitialData, setupWebSocket, startPolling, stopPolling]);

  const getChangePercent = (current: number, previous: number) => {
    return (((current - previous) / previous) * 100).toFixed(2);
  };

  const isPositive = (current: number, previous: number) => current >= previous;

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 sm:p-10">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <Activity className="w-8 h-8 text-emerald-400 animate-pulse" />
            <h1 className="text-4xl font-bold text-white">X-Stock</h1>
          </div>
          <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-12 text-center">
            <Activity className="w-16 h-16 text-slate-600 mx-auto mb-4 animate-spin" />
            <h3 className="text-xl font-semibold text-slate-400 mb-2">
              Loading market data...
            </h3>
            <p className="text-slate-500 text-sm">
              Fetching latest stock prices
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 sm:p-10">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 mb-2">
            <Activity className="w-8 h-8 text-emerald-400" />
            <h1 className="text-4xl font-bold text-white">X-Stock</h1>
          </div>
          {/* Connection Status */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div 
                className={`w-2 h-2 rounded-full ${
                  connected ? 'bg-emerald-400' : 'bg-yellow-400'
                }`}
              />
              <span className="text-slate-400 text-sm">
                {connected ? 'WebSocket Live' : 'Polling Mode'}
              </span>
            </div>
            {lastUpdate && (
              <div className="text-slate-500 text-xs">
                Updated: {lastUpdate.toLocaleTimeString()}
              </div>
            )}
          </div>
        </div>
        <p className="text-slate-400 text-sm">Real-time market tracking</p>
      </div>

      {/* Stock Grid */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Object.values(stocks).map((stock) => {
          const changePercent = getChangePercent(stock.current, stock.previous_close);
          const positive = isPositive(stock.current, stock.previous_close);

          return (
            <div
              key={stock.symbol}
              className="group relative bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 hover:bg-slate-800/70 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-emerald-500/10"
            >
              {/* Glow effect */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-emerald-500/0 via-emerald-500/5 to-emerald-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              {/* Content */}
              <div className="relative">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-1">
                      {stock.symbol}
                    </h2>
                    <div className="flex items-center gap-2">
                      {positive ? (
                        <TrendingUp className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-red-400" />
                      )}
                      <span
                        className={`text-sm font-semibold ${
                          positive ? "text-emerald-400" : "text-red-400"
                        }`}
                      >
                        {positive ? "+" : ""}{changePercent}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Current Price */}
                <div className="mb-6">
                  <div className="text-4xl font-bold text-white mb-1">
                    ${stock.current.toFixed(2)}
                  </div>
                  <div className="text-slate-400 text-xs">Current Price</div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/30">
                    <div className="text-slate-400 text-xs mb-1">High</div>
                    <div className="text-white font-semibold">
                      ${stock.high.toFixed(2)}
                    </div>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/30">
                    <div className="text-slate-400 text-xs mb-1">Low</div>
                    <div className="text-white font-semibold">
                      ${stock.low.toFixed(2)}
                    </div>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/30">
                    <div className="text-slate-400 text-xs mb-1">Open</div>
                    <div className="text-white font-semibold">
                      ${stock.open.toFixed(2)}
                    </div>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/30">
                    <div className="text-slate-400 text-xs mb-1">Prev Close</div>
                    <div className="text-white font-semibold">
                      ${stock.previous_close.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {Object.keys(stocks).length === 0 && !loading && (
        <div className="max-w-7xl mx-auto">
          <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-12 text-center">
            <Activity className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-400 mb-2">
              No market data available
            </h3>
            <p className="text-slate-500 text-sm">
              Markets may be closed or there&apos;s a connection issue
            </p>
            <button 
              onClick={fetchInitialData}
              className="mt-4 px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      )}
    </main>
  );
}