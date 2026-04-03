"use client";
import { motion, useScroll, useSpring, useTransform, AnimatePresence } from "framer-motion";
import { useEffect, useState, useRef } from "react";
import { Activity, TrendingUp, Search, Calendar, ChevronDown, ArrowUpRight, ArrowDownRight, Target, Zap, CheckCircle2, AlertCircle, X, Mail, Send } from "lucide-react";
import { createChart, ColorType, CandlestickSeries, LineSeries, ISeriesApi } from "lightweight-charts";

const SUPPORTED_COINS = ["ETH","SOL","XRP","ADA","DOGE","AVAX","DOT","LINK","TON","SHIB","LTC","BCH","TRX","ATOM","XMR","ETC","ICP","NEAR","FIL","INJ","OP","ARB","VET","MKR","ALGO","AAVE","SNX","THETA","GALA","SAND","MANA","ENJ"];

// =====================================================================
// DATA SANITIZER FUNCTION
// =====================================================================
function applySafePredictionData(chart: any, predictionSeries: any, rawForecastData: any) {
  if (!rawForecastData || !Array.isArray(rawForecastData)) return;
  const cleanData = [];
  for (const item of rawForecastData) {
      if (item.value === undefined || isNaN(item.value) || item.value === null) continue; 
      let safeTime = item.time;
      if (safeTime > 1000000000000) { safeTime = Math.floor(safeTime / 1000); }
      cleanData.push({ time: safeTime, value: item.value });
  }
  if (cleanData.length > 0) {
      predictionSeries.setData(cleanData);
      chart.timeScale().applyOptions({ rightOffset: 35 });
  }
}

// =====================================================================
// MAGNETIC BUTTON COMPONENT
// =====================================================================
const MagneticButton = ({ children, type, disabled, style, onClick }: any) => {
  const ref = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouse = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!ref.current) return;
    const { clientX, clientY } = e;
    const { height, width, left, top } = ref.current.getBoundingClientRect();
    const middleX = clientX - (left + width / 2);
    const middleY = clientY - (top + height / 2);
    setPosition({ x: middleX * 0.15, y: middleY * 0.15 }); 
  };

  const reset = () => {
    setPosition({ x: 0, y: 0 });
  };

  return (
    <motion.button
      ref={ref}
      type={type}
      disabled={disabled}
      onClick={onClick}
      style={{ ...style, position: "relative" }}
      onMouseMove={handleMouse}
      onMouseLeave={reset}
      animate={{ x: position.x, y: position.y }}
      transition={{ type: "spring", stiffness: 150, damping: 15, mass: 0.1 }}
      whileTap={{ scale: 0.95 }}
    >
      {children}
    </motion.button>
  );
};

export default function HeyArkaPro() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCoin, setActiveCoin] = useState("BTC");
  const [searchInput, setSearchInput] = useState("");
  const [livePrice, setLivePrice] = useState<number | null>(null);
  const [isPriceFlashing, setIsPriceFlashing] = useState<"up" | "down" | null>(null);
  const [timeframe, setTimeframe] = useState<string>("ALL");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  
  // NEWSLETTER & TOAST STATES
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "submitting">("idle");
  const [showToast, setShowToast] = useState(false);

  const chartContainerRef = useRef<HTMLDivElement>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const latestCandleRef = useRef<any>(null);

  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30 });
  const bgScale = useTransform(scrollYProgress, [0, 1], [1, 1.5]);
  const bgOpacity = useTransform(scrollYProgress, [0, 1], [0.7, 0.2]);

  useEffect(() => {
    setData(null); setError(null); setLivePrice(null); setTimeframe("ALL"); setStartDate(""); setEndDate(""); setIsLoading(true);
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'}/api/forecast/${activeCoin}`)
      .then((res) => { if (!res.ok) throw new Error("Backend connection failed"); return res.json(); })
      .then((d) => { if (d.status === "error") setError(d.message); else { setData(d); setLivePrice(d.current_price); } })
      .catch((err) => setError(`Engine Offline: Cannot connect to backend.`))
      .finally(() => setIsLoading(false));
  }, [activeCoin]);

  useEffect(() => {
    if (!data || !data.ohlc_data || !chartContainerRef.current) return;
    const chart = createChart(chartContainerRef.current, {
      layout: { background: { type: ColorType.Solid, color: 'transparent' }, textColor: '#9ca3af' },
      grid: { vertLines: { color: 'rgba(255,255,255,0.02)' }, horzLines: { color: 'rgba(255,255,255,0.02)' } },
      width: chartContainerRef.current.clientWidth, height: 500, timeScale: { timeVisible: true, secondsVisible: false },
    });
    
    let filteredOhlc = data.ohlc_data;
    const now = Math.floor(Date.now() / 1000);
    let startTs = 0; let endTs = Number.MAX_SAFE_INTEGER;
    
    if (timeframe === "1M") startTs = now - (30 * 86400);
    else if (timeframe === "YTD") startTs = Math.floor(new Date(`${new Date().getFullYear()}-01-01T00:00:00Z`).getTime() / 1000);
    else if (timeframe === "CUSTOM_RANGE") {
      if (startDate) startTs = Math.floor(new Date(startDate).getTime() / 1000);
      if (endDate) endTs = Math.floor(new Date(endDate).getTime() / 1000); 
    }
    
    filteredOhlc = data.ohlc_data.filter((d: any) => d.time >= startTs && d.time <= endTs);
    if (filteredOhlc.length > 0) latestCandleRef.current = filteredOhlc[filteredOhlc.length - 1];
    
    candlestickSeriesRef.current = chart.addSeries(CandlestickSeries, { upColor: '#10b981', downColor: '#ef4444', borderVisible: false, wickUpColor: '#10b981', wickDownColor: '#ef4444' });
    candlestickSeriesRef.current.setData(filteredOhlc);
    
    const lineSeries = chart.addSeries(LineSeries, { color: '#a855f7', lineWidth: 2, lineStyle: 2 });
    chart.timeScale().fitContent();
    applySafePredictionData(chart, lineSeries, data.prediction_data);

    const handleResize = () => { if (chartContainerRef.current) chart.applyOptions({ width: chartContainerRef.current.clientWidth }); };
    window.addEventListener('resize', handleResize);
    return () => { window.removeEventListener('resize', handleResize); chart.remove(); candlestickSeriesRef.current = null; };
  }, [data, timeframe, startDate, endDate]);

  useEffect(() => {
    if (!data) return; 
    const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${activeCoin.toLowerCase()}usdt@trade`);
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      const newPrice = parseFloat(message.p);
      setLivePrice((prev) => {
        if (prev !== null && prev !== newPrice) { setIsPriceFlashing(newPrice > prev ? "up" : "down"); setTimeout(() => setIsPriceFlashing(null), 300); }
        return newPrice;
      });
      if (candlestickSeriesRef.current && latestCandleRef.current) {
        const c = latestCandleRef.current;
        const up = { ...c, close: newPrice, high: Math.max(c.high, newPrice), low: Math.min(c.low, newPrice) };
        candlestickSeriesRef.current.update(up); latestCandleRef.current = up; 
      }
    };
    return () => ws.close();
  }, [data, activeCoin]);

  const validateEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  
  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError(null);
    if (!validateEmail(email)) { setEmailError("Please enter a valid email address"); return; }
    
    setStatus("submitting");
    setTimeout(() => { 
        setStatus("idle"); 
        setEmail(""); 
        setShowToast(true);
        setTimeout(() => setShowToast(false), 4000);
    }, 1500);
  };

  const formatPrice = (p: number | null) => !p ? "---" : p >= 1000 ? p.toLocaleString(undefined, { minimumFractionDigits: 2 }) : p.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 });
  
  const cardStyle = { padding: '2rem', borderRadius: '24px', background: 'linear-gradient(145deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.01) 100%)', border: '1px solid rgba(255, 255, 255, 0.08)', backdropFilter: 'blur(30px)', position: 'relative' as const, overflow: 'hidden' as const, transition: 'all 0.2s ease-out' };
  const valStyle = { fontSize: 'clamp(2rem, 3vw, 2.5rem)', fontWeight: '700', color: '#ffffff', fontFamily: '"JetBrains Mono", "Space Mono", "Courier New", monospace', letterSpacing: '-0.02em' };

  return (
    <div style={{ backgroundColor: '#030308', minHeight: '200vh', color: 'white', fontFamily: 'system-ui, sans-serif', margin: 0, padding: 0, position: 'relative', overflowX: 'hidden' }}>
      
      {/* TOAST NOTIFICATION UI */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            style={{
              position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 1000,
              background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)',
              backdropFilter: 'blur(20px)', padding: '1rem 1.5rem', borderRadius: '16px',
              display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#10b981', fontWeight: 600,
              boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
            }}
          >
            <CheckCircle2 size={20} />
            <span>Alpha Access Granted</span>
            <button onClick={() => setShowToast(false)} style={{ background: 'transparent', border: 'none', color: '#10b981', cursor: 'pointer', marginLeft: '1rem', display: 'flex' }}>
                <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{` a[href*="tradingview.com"], #tv-attr-logo, .tv-lightweight-charts-watermark { display: none !important; } `}</style>
      <motion.div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: '4px', background: 'linear-gradient(to right, #a855f7, #ec4899)', transformOrigin: 'left', zIndex: 100, scaleX }} />
      <motion.div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0, pointerEvents: 'none', scale: bgScale, opacity: bgOpacity, backgroundImage: `radial-gradient(circle at 15% 50%, rgba(168, 85, 247, 0.08), transparent 40%), radial-gradient(circle at 85% 30%, rgba(236, 72, 153, 0.08), transparent 40%), linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px)`, backgroundSize: '100% 100%, 100% 100%, 50px 50px, 50px 50px', backgroundPosition: 'center center' }} animate={{ opacity: [0.6, 0.8, 0.6] }} transition={{ repeat: Infinity, duration: 8, ease: "easeInOut" }} />

      <div style={{ position: 'relative', zIndex: 10 }}>
        <section style={{ minHeight: '50vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: '4rem' }}>
          <motion.div initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: false, amount: 0.1 }} transition={{ duration: 0.8, ease: "easeOut" }} style={{ textAlign: 'center' }}>
            <h1 style={{ fontSize: '8vw', fontWeight: 900, margin: 0, letterSpacing: '-0.05em' }}><span style={{ color: '#a855f7' }}>H</span>eyArka</h1>
            <p style={{ color: '#9ca3af', letterSpacing: '0.4em', textTransform: 'uppercase', fontSize: '0.75rem', marginTop: '1rem', fontWeight: '600' }}>Predictive Liquidity Engine</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: false, amount: 0.1 }} transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}>
            <form onSubmit={(e) => { e.preventDefault(); if (searchInput.trim()) { setActiveCoin(searchInput.toUpperCase().trim()); setSearchInput(""); } }} style={{ marginTop: '3rem', display: 'flex', gap: '1rem', background: 'rgba(255,255,255,0.05)', padding: '0.5rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(20px)' }}>
              <div style={{ display: 'flex', alignItems: 'center', paddingLeft: '1rem' }}><Search color="#6b7280" size={18} /></div>
              <input type="text" placeholder="Ticker..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)} style={{ background: 'transparent', border: 'none', color: 'white', outline: 'none', width: '200px', textTransform: 'uppercase', fontFamily: '"JetBrains Mono", monospace' }} />
              <MagneticButton type="submit" style={{ background: '#ffffff', color: '#000000', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
                  Predict
              </MagneticButton>
            </form>
          </motion.div>
        </section>

        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 24px', width: '100%' }}>
            {isLoading ? (
                <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: false }} style={{ width: '100%', height: '500px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.01)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.04)', backdropFilter: 'blur(10px)' }}>
                    <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                        <Activity color="#a855f7" size={40} />
                        <p style={{ color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.2em', fontSize: '0.8rem', fontWeight: 600 }}>Syncing AI Engine...</p>
                    </motion.div>
                </motion.div>
            ) : error ? (
                <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: false }} style={{ width: '100%', padding: '4rem 2rem', textAlign: 'center', background: 'linear-gradient(145deg, rgba(239, 68, 68, 0.05) 0%, rgba(0,0,0,0) 100%)', borderRadius: '24px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                    <AlertCircle color="#ef4444" size={48} style={{ margin: '0 auto 1rem auto' }} />
                    <h2 style={{ fontSize: '2rem', fontWeight: 800, margin: '0 0 0.5rem 0' }}>Engine Offline</h2>
                    <p style={{ color: '#9ca3af', maxWidth: '500px', margin: '0 auto' }}>{error}</p>
                </motion.div>
            ) : data ? (
                <AnimatePresence>
                    <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: false, amount: 0.1 }} transition={{ duration: 0.6, ease: "easeOut" }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                            <motion.div style={{ ...cardStyle, boxShadow: isPriceFlashing === 'up' ? '0 0 30px rgba(16, 185, 129, 0.2)' : isPriceFlashing === 'down' ? '0 0 30px rgba(239, 68, 68, 0.2)' : 'none', borderColor: isPriceFlashing === 'up' ? 'rgba(16, 185, 129, 0.4)' : isPriceFlashing === 'down' ? 'rgba(239, 68, 68, 0.4)' : 'rgba(255, 255, 255, 0.08)' }} animate={{ scale: isPriceFlashing ? 1.02 : 1 }} transition={{ duration: 0.15 }}>
                              <TrendingUp color="#a855f7" size={24} style={{ marginBottom: '1rem' }} />
                              <h3 style={{ color: '#9ca3af', textTransform: 'uppercase', fontSize: '0.75rem', margin: 0 }}>Live {activeCoin} Price</h3>
                              <h2 style={{ ...valStyle, color: isPriceFlashing === 'up' ? '#10b981' : isPriceFlashing === 'down' ? '#ef4444' : '#ffffff' }}>${formatPrice(livePrice || data.current_price)}</h2>
                            </motion.div>
                            <motion.div style={cardStyle}><Target color="#facc15" size={24} style={{ marginBottom: '1rem' }} /><h3 style={{ color: '#9ca3af', textTransform: 'uppercase', fontSize: '0.75rem', margin: 0 }}>5-Day AI Target</h3><h2 style={valStyle}>${formatPrice(data.forecast_target_price)}</h2></motion.div>
                            <motion.div style={cardStyle}><Activity color="#10b981" size={24} style={{ marginBottom: '1rem' }} /><h3 style={{ color: '#9ca3af', textTransform: 'uppercase', fontSize: '0.75rem', margin: 0 }}>Market Sentiment</h3><h2 style={valStyle}>{data.status?.split('|')[0] || "Neutral"}</h2></motion.div>
                        </div>
                        <div style={{ width: '100%', height: '500px', background: 'linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(30px)', overflow: 'hidden' }}>
                          <div ref={chartContainerRef} style={{ width: '100%', height: '100%' }} />
                        </div>
                    </motion.div>
                </AnimatePresence>
            ) : null}
        </div>

        <section style={{ padding: '10rem 2rem', display: 'flex', justifyContent: 'center' }}>
          <motion.div initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: false, amount: 0.2 }} transition={{ duration: 0.8 }} style={{ width: '100%', maxWidth: '800px', padding: '4rem', borderRadius: '40px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(40px)', textAlign: 'center' }}>
            <div style={{ width: '64px', height: '64px', background: 'rgba(168, 85, 247, 0.1)', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem auto' }}><Zap color="#a855f7" size={32} /></div>
            <h2 style={{ fontSize: 'clamp(2rem, 4vw, 3.5rem)', fontWeight: 900, letterSpacing: '-0.04em', margin: '0 0 1rem 0' }}>Join the Alpha.</h2>
            <p style={{ color: '#9ca3af', fontSize: '1.2rem', marginBottom: '3.5rem', maxWidth: '600px', marginInline: 'auto' }}>Get proprietary liquidity reports and market-wide volatility alerts before the breakout.</p>

            <form onSubmit={handleSubscribe} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '500px', margin: '0 auto' }}>
              <div style={{ position: 'relative' }}>
                  <input type="text" placeholder="Email address" value={email} onChange={(e) => { setEmail(e.target.value); if(emailError) setEmailError(null); }} style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: `1px solid ${emailError ? '#ef4444' : 'rgba(255,255,255,0.1)'}`, color: 'white', padding: '1.2rem 1.5rem', outline: 'none', fontSize: '1rem', borderRadius: '18px', transition: 'all 0.2s' }} />
                  {emailError && (<motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} style={{ position: 'absolute', top: '105%', left: '5px', color: '#ef4444', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}><AlertCircle size={14} /> {emailError}</motion.div>)}
              </div>
              
              <MagneticButton type="submit" disabled={status === "submitting"} style={{ width: '100%', background: '#ffffff', color: '#000000', border: 'none', padding: '1.2rem', borderRadius: '18px', fontWeight: '800', cursor: 'pointer', transition: 'all 0.2s', marginTop: '1rem', opacity: status === "submitting" ? 0.5 : 1 }}>
                {status === "submitting" ? "Syncing..." : "Get Alpha Access"}
              </MagneticButton>

            </form>
          </motion.div>
        </section>

        {/* --- NEW MODERN FOOTER --- */}
        <section style={{ padding: '4rem 2rem', borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: '4rem', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', maxWidth: '1280px', margin: '0 auto' }}>
          
          {/* Footer Branding */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 900, margin: 0, letterSpacing: '-0.05em', color: '#ffffff' }}><span style={{ color: '#a855f7' }}>H</span>eyArka</h3>
            <p style={{ color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.2em', fontSize: '0.65rem', fontWeight: '600', margin: 0 }}>© 2026 HeyArka Labs. All rights reserved.</p>
          </div>

          {/* Footer Links */}
          <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
            <motion.a 
              whileHover={{ y: -2, color: '#a855f7' }} 
              href="mailto:heyarka@gmail.com" 
              style={{ color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 500, transition: 'color 0.2s' }}
            >
              <Mail size={18} />
              heyarka@gmail.com
            </motion.a>
            <motion.a 
              whileHover={{ y: -2, color: '#0088cc' }} 
              href="https://t.me/heyarka" 
              target="_blank" 
              rel="noopener noreferrer" 
              style={{ color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 500, transition: 'color 0.2s' }}
            >
              <Send size={18} />
              @heyarka
            </motion.a>
          </div>

        </section>
        {/* --- END FOOTER --- */}

      </div>
    </div>
  );
}