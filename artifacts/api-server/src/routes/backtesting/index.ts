import { Router, type IRouter } from "express";
import { RunBacktestBody } from "@workspace/api-zod";

const router: IRouter = Router();

interface OHLC {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

function generateOHLC(symbol: string, candles: number): OHLC[] {
  const result: OHLC[] = [];
  const isGold = symbol.toUpperCase().includes("XAU") || symbol.toUpperCase().includes("GOLD");
  const isJpy = symbol.toUpperCase().includes("JPY");

  let price = isGold ? 1980 : isJpy ? 150.5 : 1.0850;
  const volatility = isGold ? 8 : isJpy ? 0.4 : 0.0015;
  const trend = isGold ? 0.002 : 0.0001;

  const now = new Date();
  now.setMinutes(0, 0, 0);

  for (let i = candles - 1; i >= 0; i--) {
    const t = new Date(now.getTime() - i * 60 * 60 * 1000);
    const hour = t.getUTCHours();
    const sessionMult = hour >= 8 && hour <= 16 ? 1.2 : 0.7;

    const change = (Math.random() - 0.499 + trend) * volatility * sessionMult;
    const open = price;
    price = Math.max(price * (1 + change), 0.0001);
    const close = price;
    const swingHigh = Math.random() * volatility * 0.8 * sessionMult;
    const swingLow = Math.random() * volatility * 0.8 * sessionMult;
    const high = Math.max(open, close) + Math.abs(swingHigh) * open;
    const low = Math.min(open, close) - Math.abs(swingLow) * open;

    result.push({
      time: t.toISOString(),
      open: parseFloat(open.toFixed(isGold ? 2 : isJpy ? 3 : 5)),
      high: parseFloat(high.toFixed(isGold ? 2 : isJpy ? 3 : 5)),
      low: parseFloat(low.toFixed(isGold ? 2 : isJpy ? 3 : 5)),
      close: parseFloat(close.toFixed(isGold ? 2 : isJpy ? 3 : 5)),
    });
  }
  return result;
}

function sma(prices: number[], period: number, idx: number): number | null {
  if (idx < period - 1) return null;
  let sum = 0;
  for (let i = idx - period + 1; i <= idx; i++) sum += prices[i];
  return sum / period;
}

function rsi(prices: number[], period: number, idx: number): number | null {
  if (idx < period) return null;
  let gains = 0;
  let losses = 0;
  for (let i = idx - period + 1; i <= idx; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff > 0) gains += diff;
    else losses -= diff;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

router.post("/backtesting/run", async (req, res): Promise<void> => {
  const parsed = RunBacktestBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const {
    symbol,
    strategy,
    initialBalance,
    lotSize = 0.1,
    stopLoss = 0,
    takeProfit = 0,
    fastPeriod = 9,
    slowPeriod = 21,
    rsiPeriod = 14,
    rsiOverbought = 70,
    rsiOversold = 30,
    candles = 500,
  } = parsed.data;

  const isGold = symbol.toUpperCase().includes("XAU") || symbol.toUpperCase().includes("GOLD");
  const isJpy = symbol.toUpperCase().includes("JPY");
  const pipValue = isGold ? 0.1 : isJpy ? 0.01 : 0.0001;
  const pointValue = isGold ? 1.0 : isJpy ? 0.1 : 1.0;
  const contractSize = isGold ? 100 : 100000;

  const ohlc = generateOHLC(symbol, Math.min(candles, 2000));
  const closes = ohlc.map((c) => c.close);

  type Position = {
    type: "buy" | "sell";
    entryIdx: number;
    entryPrice: number;
    lots: number;
    sl: number;
    tp: number;
  };

  let balance = initialBalance;
  let equity = initialBalance;
  let peakEquity = initialBalance;
  let maxDrawdown = 0;
  let position: Position | null = null;
  const trades: {
    id: number;
    type: string;
    entryTime: string;
    exitTime: string;
    entryPrice: number;
    exitPrice: number;
    lots: number;
    pnl: number;
    pips: number;
  }[] = [];
  const equityCurve: { time: string; equity: number; balance: number }[] = [];
  let tradeId = 1;

  const pip = pipValue;
  const slPips = stopLoss > 0 ? stopLoss * pip : 0;
  const tpPips = takeProfit > 0 ? takeProfit * pip : 0;

  const strat = strategy.toLowerCase();

  for (let i = Math.max(fastPeriod, slowPeriod, rsiPeriod) + 1; i < ohlc.length; i++) {
    const bar = ohlc[i];
    const prevBar = ohlc[i - 1];

    let signal: "buy" | "sell" | null = null;

    if (strat.includes("ma") || strat.includes("crossover") || strat.includes("moving")) {
      const fast = sma(closes, fastPeriod, i);
      const fastPrev = sma(closes, fastPeriod, i - 1);
      const slow = sma(closes, slowPeriod, i);
      const slowPrev = sma(closes, slowPeriod, i - 1);
      if (fast && slow && fastPrev && slowPrev) {
        if (fastPrev <= slowPrev && fast > slow) signal = "buy";
        else if (fastPrev >= slowPrev && fast < slow) signal = "sell";
      }
    } else if (strat.includes("rsi")) {
      const r = rsi(closes, rsiPeriod, i);
      const rPrev = rsi(closes, rsiPeriod, i - 1);
      if (r && rPrev) {
        if (rPrev <= rsiOversold && r > rsiOversold) signal = "buy";
        else if (rPrev >= rsiOverbought && r < rsiOverbought) signal = "sell";
      }
    } else {
      const fast = sma(closes, fastPeriod, i);
      const fastPrev = sma(closes, fastPeriod, i - 1);
      const slow = sma(closes, slowPeriod, i);
      const slowPrev = sma(closes, slowPeriod, i - 1);
      if (fast && slow && fastPrev && slowPrev) {
        if (fastPrev <= slowPrev && fast > slow) signal = "buy";
        else if (fastPrev >= slowPrev && fast < slow) signal = "sell";
      }
    }

    if (position) {
      let exitPrice: number | null = null;
      let exitReason = "";

      if (position.type === "buy") {
        if (slPips > 0 && bar.low <= position.sl) {
          exitPrice = position.sl;
          exitReason = "sl";
        } else if (tpPips > 0 && bar.high >= position.tp) {
          exitPrice = position.tp;
          exitReason = "tp";
        } else if (signal === "sell") {
          exitPrice = bar.open;
          exitReason = "signal";
        }
      } else {
        if (slPips > 0 && bar.high >= position.sl) {
          exitPrice = position.sl;
          exitReason = "sl";
        } else if (tpPips > 0 && bar.low <= position.tp) {
          exitPrice = position.tp;
          exitReason = "tp";
        } else if (signal === "buy") {
          exitPrice = bar.open;
          exitReason = "signal";
        }
      }

      if (exitPrice !== null) {
        const priceDiff =
          position.type === "buy"
            ? exitPrice - position.entryPrice
            : position.entryPrice - exitPrice;
        const pips = priceDiff / pip;
        const pnl = priceDiff * contractSize * position.lots * pointValue;

        balance += pnl;
        trades.push({
          id: tradeId++,
          type: position.type,
          entryTime: ohlc[position.entryIdx].time,
          exitTime: bar.time,
          entryPrice: position.entryPrice,
          exitPrice,
          lots: position.lots,
          pnl: parseFloat(pnl.toFixed(2)),
          pips: parseFloat(pips.toFixed(1)),
        });
        position = null;
      }
    }

    if (!position && signal) {
      const entryPrice = bar.close;
      const sl =
        slPips > 0
          ? signal === "buy"
            ? entryPrice - slPips
            : entryPrice + slPips
          : 0;
      const tp =
        tpPips > 0
          ? signal === "buy"
            ? entryPrice + tpPips
            : entryPrice - tpPips
          : 0;
      position = {
        type: signal,
        entryIdx: i,
        entryPrice,
        lots: lotSize,
        sl,
        tp,
      };
    }

    equity = balance + (position ? (position.type === "buy"
      ? (bar.close - position.entryPrice)
      : (position.entryPrice - bar.close)) * contractSize * position.lots * pointValue
      : 0);
    if (equity > peakEquity) peakEquity = equity;
    const dd = peakEquity - equity;
    if (dd > maxDrawdown) maxDrawdown = dd;

    if (i % 24 === 0 || i === ohlc.length - 1) {
      equityCurve.push({
        time: bar.time,
        equity: parseFloat(equity.toFixed(2)),
        balance: parseFloat(balance.toFixed(2)),
      });
    }
  }

  const winning = trades.filter((t) => t.pnl > 0);
  const losing = trades.filter((t) => t.pnl <= 0);
  const grossProfit = winning.reduce((s, t) => s + t.pnl, 0);
  const grossLoss = Math.abs(losing.reduce((s, t) => s + t.pnl, 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 999 : 0;
  const avgWin = winning.length > 0 ? grossProfit / winning.length : 0;
  const avgLoss = losing.length > 0 ? grossLoss / losing.length : 0;
  const totalPnl = balance - initialBalance;

  res.json({
    symbol,
    strategy,
    initialBalance,
    finalBalance: parseFloat(balance.toFixed(2)),
    totalPnl: parseFloat(totalPnl.toFixed(2)),
    totalPnlPct: parseFloat(((totalPnl / initialBalance) * 100).toFixed(2)),
    totalTrades: trades.length,
    winningTrades: winning.length,
    losingTrades: losing.length,
    winRate: trades.length > 0 ? parseFloat(((winning.length / trades.length) * 100).toFixed(1)) : 0,
    maxDrawdown: parseFloat(maxDrawdown.toFixed(2)),
    maxDrawdownPct: parseFloat(((maxDrawdown / peakEquity) * 100).toFixed(2)),
    profitFactor: parseFloat(profitFactor.toFixed(2)),
    averageWin: parseFloat(avgWin.toFixed(2)),
    averageLoss: parseFloat(avgLoss.toFixed(2)),
    trades: trades.slice(-50),
    equityCurve,
  });
});

export default router;
