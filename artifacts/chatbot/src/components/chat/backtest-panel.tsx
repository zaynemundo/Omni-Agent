import { useState } from "react";
import { useRunBacktest } from "@workspace/api-client-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Loader2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface BacktestPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BacktestPanel({ open, onOpenChange }: BacktestPanelProps) {
  const [symbol, setSymbol] = useState("XAUUSD");
  const [strategy, setStrategy] = useState("MA Crossover");
  const [initialBalance, setInitialBalance] = useState("10000");
  const [lotSize, setLotSize] = useState("0.1");
  const [stopLoss, setStopLoss] = useState("0");
  const [takeProfit, setTakeProfit] = useState("0");
  const [fastPeriod, setFastPeriod] = useState("9");
  const [slowPeriod, setSlowPeriod] = useState("21");
  const [candles, setCandles] = useState("500");

  const runBacktest = useRunBacktest();

  const handleRun = () => {
    runBacktest.mutate({
      data: {
        symbol,
        strategy,
        initialBalance: Number(initialBalance),
        lotSize: Number(lotSize),
        stopLoss: Number(stopLoss),
        takeProfit: Number(takeProfit),
        fastPeriod: Number(fastPeriod),
        slowPeriod: Number(slowPeriod),
        candles: Number(candles),
      }
    });
  };

  const results = runBacktest.data;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto" side="right">
        <SheetHeader className="mb-6">
          <SheetTitle>Backtesting Panel</SheetTitle>
        </SheetHeader>
        
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="space-y-2">
            <Label>Symbol</Label>
            <Input value={symbol} onChange={e => setSymbol(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Strategy</Label>
            <Select value={strategy} onValueChange={setStrategy}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MA Crossover">MA Crossover</SelectItem>
                <SelectItem value="RSI">RSI</SelectItem>
                <SelectItem value="Custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Initial Balance</Label>
            <Input type="number" value={initialBalance} onChange={e => setInitialBalance(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Lot Size</Label>
            <Input type="number" step="0.01" value={lotSize} onChange={e => setLotSize(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Stop Loss (pips)</Label>
            <Input type="number" value={stopLoss} onChange={e => setStopLoss(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Take Profit (pips)</Label>
            <Input type="number" value={takeProfit} onChange={e => setTakeProfit(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Fast Period</Label>
            <Input type="number" value={fastPeriod} onChange={e => setFastPeriod(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Slow Period</Label>
            <Input type="number" value={slowPeriod} onChange={e => setSlowPeriod(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Candles</Label>
            <Input type="number" value={candles} onChange={e => setCandles(e.target.value)} />
          </div>
        </div>

        <Button onClick={handleRun} disabled={runBacktest.isPending} className="w-full mb-8">
          {runBacktest.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Run Backtest
        </Button>

        {results && (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-muted/30 rounded-lg">
                <div className="text-sm text-muted-foreground mb-1">Final Balance</div>
                <div className="text-xl font-bold">${results.finalBalance.toFixed(2)}</div>
              </div>
              <div className="p-4 bg-muted/30 rounded-lg">
                <div className="text-sm text-muted-foreground mb-1">Total P&L %</div>
                <div className={`text-xl font-bold ${results.totalPnlPct >= 0 ? "text-green-500" : "text-red-500"}`}>
                  {results.totalPnlPct.toFixed(2)}%
                </div>
              </div>
              <div className="p-4 bg-muted/30 rounded-lg">
                <div className="text-sm text-muted-foreground mb-1">Win Rate</div>
                <div className="text-xl font-bold">{results.winRate.toFixed(2)}%</div>
              </div>
              <div className="p-4 bg-muted/30 rounded-lg">
                <div className="text-sm text-muted-foreground mb-1">Total Trades</div>
                <div className="text-xl font-bold">{results.totalTrades}</div>
              </div>
              <div className="p-4 bg-muted/30 rounded-lg">
                <div className="text-sm text-muted-foreground mb-1">Max Drawdown</div>
                <div className="text-xl font-bold text-red-500">-{results.maxDrawdownPct.toFixed(2)}%</div>
              </div>
              <div className="p-4 bg-muted/30 rounded-lg">
                <div className="text-sm text-muted-foreground mb-1">Profit Factor</div>
                <div className="text-xl font-bold">{results.profitFactor.toFixed(2)}</div>
              </div>
            </div>

            {results.equityCurve && results.equityCurve.length > 0 && (
              <div className="h-[300px] w-full mt-6">
                <div className="text-sm font-semibold mb-2">Equity Curve</div>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={results.equityCurve}>
                    <XAxis dataKey="time" hide />
                    <YAxis domain={['auto', 'auto']} />
                    <Tooltip />
                    <Line type="monotone" dataKey="equity" stroke="#3b82f6" dot={false} strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {results.trades && results.trades.length > 0 && (
              <div className="mt-8">
                <div className="text-sm font-semibold mb-2">Last 20 Trades</div>
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Entry Price</TableHead>
                        <TableHead>Exit Price</TableHead>
                        <TableHead>P&L</TableHead>
                        <TableHead>Pips</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {results.trades.slice(-20).reverse().map((trade, i) => (
                        <TableRow key={i}>
                          <TableCell className={trade.type === 'buy' ? 'text-green-500' : 'text-red-500'}>
                            {trade.type.toUpperCase()}
                          </TableCell>
                          <TableCell>{trade.entryPrice.toFixed(5)}</TableCell>
                          <TableCell>{trade.exitPrice.toFixed(5)}</TableCell>
                          <TableCell className={trade.pnl >= 0 ? 'text-green-500' : 'text-red-500'}>
                            ${trade.pnl.toFixed(2)}
                          </TableCell>
                          <TableCell>{trade.pips.toFixed(1)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}