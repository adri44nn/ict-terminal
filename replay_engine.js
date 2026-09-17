/**
 * ICT Apex Replay & Backtest Engine + TradingView-Style Interactive Canvas
 * Features Full 24-Hour Multi-Session Context (Asia, London, Midnight Open, PDH/PDL),
 * Interactive Draggable SL/TP Brackets for Long/Short Tools, and Live Intrabar Execution.
 */

(function(window) {
  'use strict';

  class ReplayEngine {
    constructor() {
      this.scenario = null;
      this.raw1m = [];
      this.current1mIndex = 800; // Default to morning NY open with Asia & London pre-loaded
      this.isPlaying = false;
      this.playSpeed = 1.0;
      this.timerId = null;
      this.activeTf = '5m';
      this.cutMode = false;

      // Dual-Chart / SMT Split-Screen State
      this.layoutMode = 'single'; // 'single', 'dual', 'stacked'
      this.secondarySymbol = 'MES';
      this.secondaryTf = '5m';
      this.secondaryCanvas = null;
      this.secondaryCtx = null;
      this.secondaryWidth = 0;
      this.secondaryHeight = 0;
      this.cursorTimestamp = null; // Synchronized across both charts

      // Secondary SMT Vertical Price Scale & Gesture State
      this.secondaryPriceScaleMode = 'auto';
      this.secondaryManualPriceMin = 0;
      this.secondaryManualPriceMax = 0;
      this.secondaryPriceScaleDragging = false;
      this.secondaryPriceScaleDragStartY = 0;
      this.secondaryPriceScaleDragStartMin = 0;
      this.secondaryPriceScaleDragStartMax = 0;
      this.secondaryPanStartY = 0;
      this.secondaryPanStartPriceMin = 0;
      this.secondaryPanStartPriceMax = 0;
      this.secondaryIsPanning = false;
      this.secondaryPanStartX = 0;
      this.secondaryPanStartOffset = 0;
      this.secondaryIsPinching = false;
      this.secondaryPinchStartDist = 0;
      this.secondaryPinchStartBarsCount = 55;
      this.secondaryCursorPos = null;

      // Chart Drawing & View State
      this.drawings = [];
      this.activeTool = 'pointer';
      this.isDrawing = false;
      this.currentShape = null;
      this.selectedShape = null;
      this.activeDragHandle = null; // 'tp', 'sl', 'entry', 'body'
      this.undoStack = [];

      // Canvas Metrics
      this.canvas = null;
      this.ctx = null;
      this.width = 0;
      this.height = 0;
      this.pixelRatio = window.devicePixelRatio || 1;
      
      // Viewport Pan & Zoom
      this.visibleBarsCount = 55;
      this.panOffsetBars = 0;
      this.pricePadding = 0.08;

      // TradingView-style vertical price scale (drag right axis up/down to zoom price)
      this.priceScaleMode = 'auto';  // 'auto' = auto-fit visible candles, 'manual' = user-controlled
      this.manualPriceMin = 0;
      this.manualPriceMax = 0;
      this.priceScaleDragging = false;
      this.priceScaleDragStartY = 0;
      this.priceScaleDragStartMin = 0;
      this.priceScaleDragStartMax = 0;

      // iPad & Touch Gesture Tracking
      this.isTouchDevice = false;
      this.isPinching = false;
      this.pinchStartDist = 0;
      this.pinchStartBarsCount = 55;
      this.lastTouchCount = 0;

      // High-performance RAF render queue (prevents 120Hz touch event flooding & frame drops on iPad)
      this.rafId = null;
      this._cachedCandles = null;
      this._cachedCandlesKey = '';
      this._cachedSecCandles = null;
      this._cachedSecCandlesKey = '';

      // Replay Account & Positions
      this.account = {
        startingBalance: 25000.00,
        balance: 25000.00,
        equity: 25000.00,
        realizedPnL: 0.00,
        unrealizedPnL: 0.00,
        trades: [],
        openPositions: [],
        pendingOrders: []
      };

      // ICT Overlays & Multi-Session Structure
      this.autoMarkup = false;
      this.overlays = {
        sessions: true,    // Asia H/L, London H/L, Midnight Open visible by default!
        fvg: false,         // Algorithmic FVGs off by default for clean chart
        mss: false,
        sweeps: false,
        killzones: false,
        ote: false
      };

      // Callbacks
      this.onStateChange = null;
      this.onTradeEvent = null;
      this.onApplyBracket = null;
      this.onSmtDetected = null;
    }

    toggleSessions(enable) {
      if (typeof enable === 'boolean') {
        this.overlays.sessions = enable;
      } else {
        this.overlays.sessions = !this.overlays.sessions;
      }
      this.render();
      this.notifyState();
      return this.overlays.sessions;
    }

    toggleAutoMarkup(enable) {
      if (typeof enable === 'boolean') {
        this.autoMarkup = enable;
      } else {
        this.autoMarkup = !this.autoMarkup;
      }
      this.overlays.fvg = this.autoMarkup;
      this.overlays.mss = this.autoMarkup;
      this.overlays.sweeps = this.autoMarkup;
      this.render();
      this.notifyState();
      return this.autoMarkup;
    }

    setAutoMarkup(enable) {
      return this.toggleAutoMarkup(enable);
    }

    init(canvasElement, scenarioId) {
      this.canvas = canvasElement;
      this.ctx = this.canvas.getContext('2d');
      this.loadScenario(scenarioId || 'real-session-2026-09-11');
      this.bindEvents();
      this.resize();
      this.render();
    }

    initSecondary(secondaryCanvasElement) {
      if (!secondaryCanvasElement) return;
      this.secondaryCanvas = secondaryCanvasElement;
      this.secondaryCtx = this.secondaryCanvas.getContext('2d');
      this.bindSecondaryEvents();
      this.resize();
      this.render();
    }

    setLayoutMode(mode) {
      this.layoutMode = mode; // 'single', 'dual', 'stacked'
      const container = document.getElementById('replayChartsContainer');
      const secondaryWrapper = document.getElementById('replaySecondaryWrapper');
      
      if (container) {
        container.className = `replay-charts-container layout-${mode}`;
      }
      if (secondaryWrapper) {
        secondaryWrapper.style.display = mode === 'single' ? 'none' : 'flex';
      }

      setTimeout(() => {
        this.resize();
        this.render();
      }, 30);
    }

    setSecondarySymbol(sym) {
      this.clearCandleCache();
      this.secondarySymbol = sym;
      const tag = document.getElementById('secondaryPaneTag');
      if (tag) tag.textContent = `🔵 SMT COMPARISON: ${sym}`;
      this.secondaryPriceScaleMode = 'auto';
      this.render();
      this.notifyState();
    }

    setSecondaryTimeframe(tf) {
      this.clearCandleCache();
      this.secondaryTf = tf;
      this.render();
      this.notifyState();
    }

    getSecondaryCandles() {
      if (!this.scenario || !this.scenario.assets) return [];
      const raw = this.scenario.assets[this.secondarySymbol] || [];
      const curTime = this.getCurrentTime();
      if (!curTime) return [];
      
      const cacheKey = `${curTime}_${this.secondarySymbol}_${this.secondaryTf}_${raw.length}`;
      if (this._cachedSecCandles && this._cachedSecCandlesKey === cacheKey) {
        return this._cachedSecCandles;
      }

      // Slice secondary dataset to match exact current replay timestamp
      const sliced = raw.filter(b => b.time <= curTime);
      this._cachedSecCandles = window.REPLAY_SCENARIOS ? window.REPLAY_SCENARIOS.aggregate(sliced, this.secondaryTf) : [];
      this._cachedSecCandlesKey = cacheKey;
      return this._cachedSecCandles;
    }

    loadScenario(scenarioId) {
      this.clearCandleCache();
      this.scenario = window.REPLAY_SCENARIOS.getById(scenarioId);
      this.raw1m = this.scenario.raw1m || [];
      // Set starting playback index to Day-Of morning (~09:15 AM NY)
      if (this.scenario.initialPlaybackIndex !== undefined) {
        this.current1mIndex = Math.min(this.raw1m.length - 1, Math.max(30, this.scenario.initialPlaybackIndex));
      } else if (this.raw1m.length > 200) {
        this.current1mIndex = Math.min(this.raw1m.length - 1, Math.max(30, Math.floor(this.raw1m.length * 0.72)));
      } else {
        this.current1mIndex = Math.min(30, this.raw1m.length - 1);
      }
      this.pause();
      this.drawings = [];
      this.resetAccount();
      this.priceScaleMode = 'auto';
      this.manualPriceMin = 0;
      this.manualPriceMax = 0;
      this.secondaryPriceScaleMode = 'auto';
      this.secondaryManualPriceMin = 0;
      this.secondaryManualPriceMax = 0;
      this.panOffsetBars = 0;
      this.notifyState();
      this.render();
    }

    resetAccount() {
      this.account = {
        startingBalance: 25000.00,
        balance: 25000.00,
        equity: 25000.00,
        realizedPnL: 0.00,
        unrealizedPnL: 0.00,
        trades: [],
        openPositions: [],
        pendingOrders: []
      };
    }

    setTimeframe(tf) {
      // Preserve the user's viewport position by converting panOffsetBars proportionally
      const oldCandles = this.getVisibleCandles();
      const oldCandleCount = oldCandles.length;

      this.activeTf = tf;

      const newCandles = this.getVisibleCandles();
      const newCandleCount = newCandles.length;

      // Proportionally scale the pan offset to the new candle count
      if (oldCandleCount > 0 && newCandleCount > 0) {
        const fraction = this.panOffsetBars / Math.max(1, oldCandleCount);
        this.panOffsetBars = Math.max(0, Math.round(fraction * newCandleCount));
      } else {
        this.panOffsetBars = 0;
      }

      // Clamp panOffsetBars to valid range
      const maxPan = Math.max(0, newCandleCount - 1);
      this.panOffsetBars = Math.max(0, Math.min(this.panOffsetBars, maxPan));

      // Reset price scale mode to 'auto' so the new timeframe's candles fit properly
      this.priceScaleMode = 'auto';
      this.manualPriceMin = 0;
      this.manualPriceMax = 0;

      this.render();
      this.notifyState();
    }

    setSpeed(multiplier) {
      this.playSpeed = multiplier;
      if (this.isPlaying) {
        this.pause();
        this.play();
      }
      this.notifyState();
    }

    play() {
      if (this.isPlaying) return;
      if (this.current1mIndex >= this.raw1m.length - 1) {
        this.current1mIndex = Math.floor(this.raw1m.length * 0.3);
      }
      this.isPlaying = true;
      const intervalMs = Math.max(80, Math.round(1000 / this.playSpeed));
      this.timerId = setInterval(() => {
        this.stepForward(1);
      }, intervalMs);
      this.notifyState();
    }

    pause() {
      this.isPlaying = false;
      if (this.timerId) {
        clearInterval(this.timerId);
        this.timerId = null;
      }
      this.notifyState();
    }

    togglePlay() {
      if (this.isPlaying) this.pause();
      else this.play();
    }

    stepForward(bars = 1) {
      let minutesPerBar = 1;
      if (this.activeTf === '5m') minutesPerBar = 5;
      else if (this.activeTf === '15m') minutesPerBar = 15;
      else if (this.activeTf === '30m') minutesPerBar = 30;
      else if (this.activeTf === '1h') minutesPerBar = 60;
      else if (this.activeTf === '4h') minutesPerBar = 240;
      else if (this.activeTf === '1d') minutesPerBar = 1440;

      const advance = bars * minutesPerBar;
      const targetIndex = Math.min(this.raw1m.length - 1, this.current1mIndex + advance);

      for (let i = this.current1mIndex + 1; i <= targetIndex; i++) {
        this.processIntrabarOrders(this.raw1m[i]);
      }

      this.current1mIndex = targetIndex;

      if (this.current1mIndex >= this.raw1m.length - 1) {
        this.pause();
      }

      this.updateUnrealizedPnL();
      this.render();
      this.notifyState();
    }

    stepBackward(bars = 1) {
      let minutesPerBar = 1;
      if (this.activeTf === '5m') minutesPerBar = 5;
      else if (this.activeTf === '15m') minutesPerBar = 15;
      else if (this.activeTf === '30m') minutesPerBar = 30;
      else if (this.activeTf === '1h') minutesPerBar = 60;
      else if (this.activeTf === '4h') minutesPerBar = 240;
      else if (this.activeTf === '1d') minutesPerBar = 1440;

      const retreat = bars * minutesPerBar;
      this.current1mIndex = Math.max(10, this.current1mIndex - retreat);
      this.updateUnrealizedPnL();
      this.render();
      this.notifyState();
    }

    jumpToStart() {
      this.pause();
      this.current1mIndex = 30;
      this.updateUnrealizedPnL();
      this.render();
      this.notifyState();
    }

    jumpToEnd() {
      this.pause();
      this.current1mIndex = this.raw1m.length - 1;
      this.updateUnrealizedPnL();
      this.render();
      this.notifyState();
    }

    seekFraction(fraction) {
      const target = Math.floor(fraction * (this.raw1m.length - 1));
      this.current1mIndex = Math.max(10, Math.min(this.raw1m.length - 1, target));
      this.updateUnrealizedPnL();
      this.render();
      this.notifyState();
    }

    clearCandleCache() {
      this._cachedCandles = null;
      this._cachedCandlesKey = '';
    }

    requestRender() {
      if (!this.rafId) {
        this.rafId = requestAnimationFrame(() => {
          this.rafId = null;
          this.render();
        });
      }
    }

    getVisibleCandles() {
      const cacheKey = `${this.current1mIndex}_${this.activeTf}_${this.raw1m ? this.raw1m.length : 0}`;
      if (this._cachedCandles && this._cachedCandlesKey === cacheKey) {
        return this._cachedCandles;
      }
      const sliced1m = this.raw1m ? this.raw1m.slice(0, this.current1mIndex + 1) : [];
      this._cachedCandles = window.REPLAY_SCENARIOS ? window.REPLAY_SCENARIOS.aggregate(sliced1m, this.activeTf) : [];
      this._cachedCandlesKey = cacheKey;
      return this._cachedCandles;
    }

    getCurrentPrice() {
      if (!this.raw1m || this.raw1m.length === 0) return 0;
      const currentBar = this.raw1m[this.current1mIndex] || this.raw1m[this.raw1m.length - 1];
      return currentBar.close;
    }

    getCurrentTime() {
      if (!this.raw1m || this.raw1m.length === 0) return null;
      const currentBar = this.raw1m[this.current1mIndex] || this.raw1m[this.raw1m.length - 1];
      return currentBar.time;
    }

    // ========================================================================
    // STRUCTURED MULTI-SESSION CONTEXT (ASIA, LONDON, MIDNIGHT, PDH/PDL)
    // ========================================================================
    getSessionContext() {
      if (this.scenario && this.scenario.context) {
        return this.scenario.context;
      }

      // Dynamically compute from historical raw 1m bars
      let asiaH = -Infinity, asiaL = Infinity;
      let lonH = -Infinity, lonL = Infinity;
      let midnight = null;
      let pdh = -Infinity, pdl = Infinity;

      const sliced1m = this.raw1m.slice(0, this.current1mIndex + 1);
      sliced1m.forEach(c => {
        const ny = window.ICTEngine.getNyTime(c.time);
        const timeDec = ny.hour + ny.minute / 60;

        if (timeDec >= 20.0 || timeDec < 0) {
          if (c.high > asiaH) asiaH = c.high;
          if (c.low < asiaL) asiaL = c.low;
        }
        if (ny.hour === 0 && ny.minute === 0 && !midnight) {
          midnight = c.open;
        }
        if (timeDec >= 2.0 && timeDec < 5.0) {
          if (c.high > lonH) lonH = c.high;
          if (c.low < lonL) lonL = c.low;
        }
        if (c.high > pdh) pdh = c.high;
        if (c.low < pdl) pdl = c.low;
      });

      const curPrice = this.getCurrentPrice();
      return {
        asia: {
          high: asiaH !== -Infinity ? asiaH : curPrice + 20,
          low: asiaL !== Infinity ? asiaL : curPrice - 20,
          eq: (asiaH + asiaL) / 2
        },
        london: {
          high: lonH !== -Infinity ? lonH : curPrice + 35,
          low: lonL !== Infinity ? lonL : curPrice - 35,
          eq: (lonH + lonL) / 2
        },
        midnightOpen: midnight || curPrice,
        pdh: pdh !== -Infinity ? pdh : curPrice + 60,
        pdl: pdl !== Infinity ? pdl : curPrice - 60
      };
    }

    // ========================================================================
    // ORDER EXECUTION & BACKTEST SIMULATOR
    // ========================================================================
    placeOrder({ type, side, size = 1, price = null, sl = null, tp = null, model = "PB Trades Model" }) {
      const currentPrice = this.getCurrentPrice();
      const orderPrice = type === 'MARKET' ? currentPrice : (price || currentPrice);
      const pointVal = this.getPointValue();

      const order = {
        id: "ORD-" + Math.floor(Math.random() * 1000000),
        time: this.getCurrentTime(),
        type,
        side,
        size,
        entryPrice: orderPrice,
        sl: sl ? parseFloat(sl) : null,
        tp: tp ? parseFloat(tp) : null,
        model,
        status: type === 'MARKET' ? 'OPEN' : 'PENDING',
        initialRisk: sl ? Math.abs(orderPrice - sl) * pointVal * size : 0,
        initialReward: tp ? Math.abs(tp - orderPrice) * pointVal * size : 0
      };

      if (type === 'MARKET') {
        this.account.openPositions.push(order);
        if (this.onTradeEvent) this.onTradeEvent('ORDER_FILLED', order);
      } else {
        this.account.pendingOrders.push(order);
        if (this.onTradeEvent) this.onTradeEvent('ORDER_PLACED', order);
      }

      this.updateUnrealizedPnL();
      this.render();
      this.notifyState();
      return order;
    }

    closePosition(posId) {
      const idx = this.account.openPositions.findIndex(p => p.id === posId);
      if (idx === -1) return;
      const pos = this.account.openPositions[idx];
      const exitPrice = this.getCurrentPrice();
      const pointVal = this.getPointValue();
      const pts = pos.side === 'BUY' ? (exitPrice - pos.entryPrice) : (pos.entryPrice - exitPrice);
      const pnl = pts * pointVal * pos.size;

      pos.exitPrice = exitPrice;
      pos.exitTime = this.getCurrentTime();
      pos.pnl = pnl;
      pos.pts = pts;
      pos.status = 'CLOSED';
      pos.exitReason = 'MANUAL';

      this.account.balance += pnl;
      this.account.realizedPnL += pnl;
      this.account.trades.unshift(pos);
      this.account.openPositions.splice(idx, 1);

      if (this.onTradeEvent) this.onTradeEvent('POSITION_CLOSED', pos);
      this.updateUnrealizedPnL();
      this.render();
      this.notifyState();
    }

    processIntrabarOrders(bar) {
      if (!bar) return;
      const pointVal = this.getPointValue();

      // Check Pending Limit Orders
      for (let i = this.account.pendingOrders.length - 1; i >= 0; i--) {
        const order = this.account.pendingOrders[i];
        let filled = false;
        if (order.side === 'BUY' && bar.low <= order.entryPrice) filled = true;
        else if (order.side === 'SELL' && bar.high >= order.entryPrice) filled = true;

        if (filled) {
          order.status = 'OPEN';
          order.time = bar.time;
          this.account.openPositions.push(order);
          this.account.pendingOrders.splice(i, 1);
          if (this.onTradeEvent) this.onTradeEvent('ORDER_FILLED', order);
        }
      }

      // Check Open Positions for SL / TP
      for (let i = this.account.openPositions.length - 1; i >= 0; i--) {
        const pos = this.account.openPositions[i];
        let closed = false;
        let exitPrice = null;
        let reason = "";

        if (pos.side === 'BUY') {
          if (pos.sl && bar.low <= pos.sl) {
            closed = true;
            exitPrice = pos.sl;
            reason = "STOP_LOSS";
          } else if (pos.tp && bar.high >= pos.tp) {
            closed = true;
            exitPrice = pos.tp;
            reason = "TAKE_PROFIT";
          }
        } else { // SELL
          if (pos.sl && bar.high >= pos.sl) {
            closed = true;
            exitPrice = pos.sl;
            reason = "STOP_LOSS";
          } else if (pos.tp && bar.low <= pos.tp) {
            closed = true;
            exitPrice = pos.tp;
            reason = "TAKE_PROFIT";
          }
        }

        if (closed) {
          const pts = pos.side === 'BUY' ? (exitPrice - pos.entryPrice) : (pos.entryPrice - exitPrice);
          const pnl = pts * pointVal * pos.size;

          pos.exitPrice = exitPrice;
          pos.exitTime = bar.time;
          pos.pnl = pnl;
          pos.pts = pts;
          pos.status = reason;
          pos.exitReason = reason;

          this.account.balance += pnl;
          this.account.realizedPnL += pnl;
          this.account.trades.unshift(pos);
          this.account.openPositions.splice(i, 1);

          if (this.onTradeEvent) this.onTradeEvent(reason, pos);
        }
      }
    }

    updateUnrealizedPnL() {
      const currentPrice = this.getCurrentPrice();
      const pointVal = this.getPointValue();
      let totalUnrealized = 0;

      this.account.openPositions.forEach(pos => {
        const pts = pos.side === 'BUY' ? (currentPrice - pos.entryPrice) : (pos.entryPrice - currentPrice);
        pos.currentPts = pts;
        pos.unrealizedPnL = pts * pointVal * pos.size;
        totalUnrealized += pos.unrealizedPnL;
      });

      this.account.unrealizedPnL = totalUnrealized;
      this.account.equity = this.account.balance + totalUnrealized;
    }

    getPointValue() {
      if (!this.scenario) return 2.0;
      if (this.scenario.symbol === 'MNQ') return 2.00;
      if (this.scenario.symbol === 'MES') return 5.00;
      if (this.scenario.symbol === 'M2K') return 5.00;
      if (this.scenario.symbol === 'MGC') return 10.00;
      return 2.00;
    }

    getStats() {
      const trades = this.account.trades;
      const totalTrades = trades.length;
      if (totalTrades === 0) {
        return {
          totalTrades: 0,
          winRate: 0,
          wins: 0,
          losses: 0,
          profitFactor: 0,
          totalPnL: this.account.realizedPnL,
          balance: this.account.balance.toFixed(2),
          equity: this.account.equity.toFixed(2)
        };
      }

      const wins = trades.filter(t => t.pnl > 0);
      const losses = trades.filter(t => t.pnl <= 0);
      const winCount = wins.length;
      const lossCount = losses.length;
      const winRate = ((winCount / totalTrades) * 100).toFixed(1);

      const totalWinDollar = wins.reduce((acc, t) => acc + t.pnl, 0);
      const totalLossDollar = Math.abs(losses.reduce((acc, t) => acc + t.pnl, 0));
      const profitFactor = totalLossDollar > 0 ? (totalWinDollar / totalLossDollar).toFixed(2) : (totalWinDollar > 0 ? "MAX" : "0.00");

      return {
        totalTrades,
        winRate,
        wins: winCount,
        losses: lossCount,
        profitFactor,
        totalPnL: this.account.realizedPnL.toFixed(2),
        balance: this.account.balance.toFixed(2),
        equity: this.account.equity.toFixed(2)
      };
    }

    notifyState() {
      if (this.onStateChange) {
        this.onStateChange({
          isPlaying: this.isPlaying,
          current1mIndex: this.current1mIndex,
          total1mBars: this.raw1m.length,
          activeTf: this.activeTf,
          playSpeed: this.playSpeed,
          currentPrice: this.getCurrentPrice(),
          currentTime: this.getCurrentTime(),
          activeTool: this.activeTool,
          autoMarkup: this.autoMarkup,
          sessions: this.overlays.sessions,
          stats: this.getStats(),
          account: this.account,
          context: this.getSessionContext()
        });
      }
    }

    // ========================================================================
    // TRADINGVIEW-STYLE DRAWING & ADJUSTABLE SL/TP POSITION HANDLES
    // ========================================================================
    resize() {
      if (!this.canvas) return;
      const rect = this.canvas.getBoundingClientRect();
      this.width = rect.width;
      this.height = rect.height;
      this.pixelRatio = window.devicePixelRatio || 1;

      this.canvas.width = this.width * this.pixelRatio;
      this.canvas.height = this.height * this.pixelRatio;
      this.ctx.scale(this.pixelRatio, this.pixelRatio);
    }

    zoomIn() {
      const zoomDelta = Math.max(4, Math.round(this.visibleBarsCount * 0.18));
      this.visibleBarsCount = Math.max(10, this.visibleBarsCount - zoomDelta);
      this.render();
    }

    zoomOut() {
      const allCandles = this.getVisibleCandles();
      const maxBars = Math.max(2600, allCandles ? allCandles.length : 2600);
      const zoomDelta = Math.max(4, Math.round(this.visibleBarsCount * 0.18));
      this.visibleBarsCount = Math.min(maxBars, this.visibleBarsCount + zoomDelta);
      this.render();
    }

    resetZoom() {
      this.visibleBarsCount = 55;
      this.panOffsetBars = 0;
      this.priceScaleMode = 'auto';
      this.manualPriceMin = 0;
      this.manualPriceMax = 0;
      this.render();
    }

    setTool(toolName) {
      this.activeTool = toolName;
      if (toolName === 'clear') {
        this.undoStack.push([...this.drawings]);
        this.drawings = [];
        this.activeTool = 'pointer';
      }
      this.render();
      this.notifyState();
    }

    undo() {
      if (this.drawings.length > 0) {
        this.undoStack.push([...this.drawings]);
        this.drawings.pop();
        this.render();
      }
    }

    bindEvents() {
      if (!this.canvas) return;

      const getPos = (e) => {
        const rect = this.canvas.getBoundingClientRect();
        const clientX = (e.touches && e.touches.length > 0) ? e.touches[0].clientX : e.clientX;
        const clientY = (e.touches && e.touches.length > 0) ? e.touches[0].clientY : e.clientY;
        return {
          x: clientX - rect.left,
          y: clientY - rect.top
        };
      };

      const getTouchDist = (touches) => {
        if (touches.length < 2) return 0;
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        return Math.hypot(dx, dy);
      };

      const onPointerDown = (e) => {
        // Track touch usage for responsive touch handle hit radiuses
        if (e.touches) {
          this.isTouchDevice = true;
          if (e.cancelable) e.preventDefault(); // Stop iOS page rubberband bounce on chart touch

          // 2-Finger Pinch-to-Zoom Gesture Start (iPad / Mobile)
          if (e.touches.length === 2) {
            this.isPinching = true;
            this.isPanning = false;
            this.isDraggingHandle = false;
            this.isDrawing = false;
            this.pinchStartDist = getTouchDist(e.touches);
            this.pinchStartBarsCount = this.visibleBarsCount;
            return;
          }
          if (e.touches.length > 2) return;
        }

        const pos = getPos(e);
        const visibleCandles = this.getVisibleCandlesSlice();
        const { minPrice, maxPrice } = this.calculatePriceRange(visibleCandles);
        const priceInfo = this.screenToPrice(pos.x, pos.y, minPrice, maxPrice);

        if (this.cutMode) {
          const barIdx = this.screenToBarIndex(pos.x);
          if (barIdx !== null && visibleCandles[barIdx]) {
            const targetBar = visibleCandles[barIdx];
            const rawIdx = this.raw1m.findIndex(b => b.time >= targetBar.time);
            if (rawIdx !== -1) {
              this.current1mIndex = rawIdx;
              this.cutMode = false;
              this.render();
              this.notifyState();
              return;
            }
          }
          this.cutMode = false;
          return;
        }

        // 1. Check if clicking on an interactive draggable shape or handle
        const hitHandle = this.findDraggableShapeAt(pos.x, pos.y, minPrice, maxPrice);
        if (hitHandle) {
          this.activeDragHandle = hitHandle;
          this.isDraggingHandle = true;
          this.dragStartPos = { x: pos.x, y: pos.y };
          this.dragStartPrice = priceInfo.price;
          const s = hitHandle.shape;
          this.dragStartShapeSnapshot = {
            entryPrice: s.entryPrice,
            tpPrice: s.tpPrice,
            slPrice: s.slPrice,
            startX: s.startX,
            startY: s.startY,
            endX: s.endX,
            endY: s.endY,
            startPrice: s.startPrice,
            endPrice: s.endPrice,
            startTime: s.startTime,
            endTime: s.endTime
          };
          return;
        }

        // 2. Pointer Mode -> Check for price axis drag (right 75px) or smooth 2D chart pan
        if (this.activeTool === 'pointer') {
          const chartWidth = this.width - 75;
          // Right price axis: vertical zoom
          if (pos.x >= chartWidth) {
            this.priceScaleDragging = true;
            this.priceScaleDragStartY = pos.y;
            this.priceScaleDragStartMin = minPrice;
            this.priceScaleDragStartMax = maxPrice;
            return;
          }

          // Main chart area: 2D smooth pan (left/right to view past sessions, up/down to view vertical extremes)
          this.isPanning = true;
          this.panStartX = pos.x;
          this.panStartY = pos.y;
          this.panStartOffset = this.panOffsetBars;
          this.panStartPriceMin = minPrice;
          this.panStartPriceMax = maxPrice;
          return;
        }

        // 3. Start New Drawing
        this.isDrawing = true;
        const curPrice = priceInfo.price;
        const startTime = this.xToTime(pos.x);
        const barSec = this.getBarSeconds();
        const endTime = startTime + barSec * 8;
        const isLong = this.activeTool === 'long_pos';
        const isShort = this.activeTool === 'short_pos';
        const defaultRisk = (maxPrice - minPrice) * 0.12;

        this.currentShape = {
          type: this.activeTool,
          startX: pos.x,
          startY: pos.y,
          endX: pos.x + 160,
          endY: pos.y,
          entryPrice: curPrice,
          tpPrice: isLong ? curPrice + defaultRisk * 2.5 : (isShort ? curPrice - defaultRisk * 2.5 : curPrice),
          slPrice: isLong ? curPrice - defaultRisk : (isShort ? curPrice + defaultRisk : curPrice),
          startPrice: curPrice,
          endPrice: curPrice,
          startTime: startTime,
          endTime: endTime,
          points: [{ x: pos.x, y: pos.y, time: startTime, price: curPrice }]
        };
      };

      const onPointerMove = (e) => {
        // Prevent viewport scroll during touch interaction
        if (e.touches && e.cancelable) {
          e.preventDefault();
        }

        // Handle 2-Finger Pinch-to-Zoom on iPad / iPhone
        if (e.touches && e.touches.length === 2) {
          if (!this.isPinching) {
            this.isPinching = true;
            this.pinchStartDist = getTouchDist(e.touches);
            this.pinchStartBarsCount = this.visibleBarsCount;
            return;
          }
          const curDist = getTouchDist(e.touches);
          if (this.pinchStartDist > 10 && curDist > 10) {
            const pinchRatio = this.pinchStartDist / curDist;
            const newBarsCount = Math.round(this.pinchStartBarsCount * pinchRatio);
            this.visibleBarsCount = Math.max(10, Math.min(2600, newBarsCount));
            this.requestRender();
          }
          return;
        }

        // If pinching ended or only 1 finger remaining
        if (this.isPinching) {
          return;
        }

        const pos = getPos(e);

        // 1. FAST PATH: Chart Panning (Left/Right across time, Up/Down across price)
        // High-frequency touch pan: bypass cursor tooltip, candle slot iteration, and extra allocations
        if (this.isPanning) {
          const barWidth = this.getBarWidth();
          const dx = pos.x - this.panStartX;
          const dy = pos.y - this.panStartY;
          const barDelta = Math.round(dx / barWidth);
          const allCandles = this.getVisibleCandles();
          const totalCandles = allCandles ? allCandles.length : 0;
          const maxPan = Math.max(0, totalCandles - 1);

          // Horizontal pan:
          this.panOffsetBars = Math.min(maxPan, Math.max(-25, this.panStartOffset + barDelta));

          // Vertical pan:
          const chartHeight = this.height - 35;
          const priceSpan = this.panStartPriceMax - this.panStartPriceMin;
          if (priceSpan > 0 && chartHeight > 0) {
            const priceShift = (dy / chartHeight) * priceSpan * 0.9;
            this.priceScaleMode = 'manual';
            this.manualPriceMin = this.panStartPriceMin + priceShift;
            this.manualPriceMax = this.panStartPriceMax + priceShift;
          }

          this.requestRender();
          return;
        }

        // 2. FAST PATH: Price axis dragging (vertical scale zoom - calibrated for smooth Mac & desktop mouse)
        if (this.priceScaleDragging) {
          const dy = pos.y - this.priceScaleDragStartY;
          const range = this.priceScaleDragStartMax - this.priceScaleDragStartMin;
          const midPrice = (this.priceScaleDragStartMin + this.priceScaleDragStartMax) / 2;
          const scaleFactor = Math.max(0.15, Math.min(6.0, 1 + dy / 450));
          const newRange = range * scaleFactor;
          this.priceScaleMode = 'manual';
          this.manualPriceMin = midPrice - newRange / 2;
          this.manualPriceMax = midPrice + newRange / 2;
          this.requestRender();
          return;
        }

        // 3. FAST PATH: Dragging an interactive handle or position tool
        if (this.isDraggingHandle && this.activeDragHandle) {
          const visibleCandles = this.getVisibleCandlesSlice();
          const { minPrice, maxPrice } = this.calculatePriceRange(visibleCandles);
          const priceInfo = this.screenToPrice(pos.x, pos.y, minPrice, maxPrice);
          const { shape, handleType } = this.activeDragHandle;
          const snap = this.dragStartShapeSnapshot;
          const dx = pos.x - this.dragStartPos.x;
          const dy = pos.y - this.dragStartPos.y;
          const priceDelta = priceInfo.price - this.dragStartPrice;
          const curTime = this.xToTime(pos.x);
          const startTimeDelta = curTime - this.xToTime(this.dragStartPos.x);

          if (handleType === 'tp') {
            shape.tpPrice = priceInfo.price;
          } else if (handleType === 'sl') {
            shape.slPrice = priceInfo.price;
          } else if (handleType === 'entry') {
            shape.entryPrice = priceInfo.price;
          } else if (handleType === 'resize_width') {
            shape.endTime = curTime;
            shape.endX = Math.max(shape.startX + 60, pos.x);
          } else if (handleType === 'move_all') {
            shape.entryPrice = parseFloat((snap.entryPrice + priceDelta).toFixed(2));
            shape.tpPrice = parseFloat((snap.tpPrice + priceDelta).toFixed(2));
            shape.slPrice = parseFloat((snap.slPrice + priceDelta).toFixed(2));
            if (snap.startTime != null) shape.startTime = snap.startTime + startTimeDelta;
            if (snap.endTime != null) shape.endTime = snap.endTime + startTimeDelta;
            shape.startX = snap.startX + dx;
            shape.endX = snap.endX + dx;
          } else if (handleType === 'move_fvg') {
            if (snap.startPrice != null) shape.startPrice = parseFloat((snap.startPrice + priceDelta).toFixed(2));
            if (snap.endPrice != null) shape.endPrice = parseFloat((snap.endPrice + priceDelta).toFixed(2));
            if (snap.startTime != null) shape.startTime = snap.startTime + startTimeDelta;
            if (snap.endTime != null) shape.endTime = snap.endTime + startTimeDelta;
            shape.startX = snap.startX + dx;
            shape.endX = snap.endX + dx;
            shape.startY = snap.startY + dy;
            shape.endY = snap.endY + dy;
          } else if (handleType === 'move_liq' || handleType === 'liquidity_text') {
            shape.startPrice = priceInfo.price;
            shape.startY = snap.startY + dy;
          } else if (handleType === 'trendline_start') {
            shape.startTime = curTime;
            shape.startPrice = priceInfo.price;
            shape.startX = snap.startX + dx;
            shape.startY = snap.startY + dy;
          } else if (handleType === 'trendline_end') {
            shape.endTime = curTime;
            shape.endPrice = priceInfo.price;
            shape.endX = snap.endX + dx;
            shape.endY = snap.endY + dy;
          } else if (handleType === 'ote_start') {
            shape.startTime = curTime;
            shape.startPrice = priceInfo.price;
            shape.startX = snap.startX + dx;
            shape.startY = snap.startY + dy;
          } else if (handleType === 'ote_end') {
            shape.endTime = curTime;
            shape.endPrice = priceInfo.price;
            shape.endX = snap.endX + dx;
            shape.endY = snap.endY + dy;
          } else if (handleType === 'move_ote') {
            if (snap.startPrice != null) shape.startPrice = parseFloat((snap.startPrice + priceDelta).toFixed(2));
            if (snap.endPrice != null) shape.endPrice = parseFloat((snap.endPrice + priceDelta).toFixed(2));
            if (snap.startTime != null) shape.startTime = snap.startTime + startTimeDelta;
            if (snap.endTime != null) shape.endTime = snap.endTime + startTimeDelta;
            shape.startX = snap.startX + dx;
            shape.endX = snap.endX + dx;
            shape.startY = snap.startY + dy;
            shape.endY = snap.endY + dy;
          } else if (handleType === 'move_trendline' || handleType === 'trendline_text') {
            if (snap.startPrice != null) shape.startPrice = parseFloat((snap.startPrice + priceDelta).toFixed(2));
            if (snap.endPrice != null) shape.endPrice = parseFloat((snap.endPrice + priceDelta).toFixed(2));
            if (snap.startTime != null) shape.startTime = snap.startTime + startTimeDelta;
            if (snap.endTime != null) shape.endTime = snap.endTime + startTimeDelta;
            shape.startX = snap.startX + dx;
            shape.endX = snap.endX + dx;
            shape.startY = snap.startY + dy;
            shape.endY = snap.endY + dy;
          }

          this.requestRender();
          return;
        }

        // 4. Free Hover / Pointer Move (only when NOT dragging or panning)
        const visibleCandles = this.getVisibleCandlesSlice();
        const { minPrice, maxPrice } = this.calculatePriceRange(visibleCandles);
        const priceInfo = this.screenToPrice(pos.x, pos.y, minPrice, maxPrice);

        const barWidth = this.getBarWidth();
        const slot = Math.floor(pos.x / barWidth);
        let candle = null;
        if (visibleCandles.length > 0) {
          const rightMargin = Math.max(0, -this.panOffsetBars);
          const rightSlot = this.visibleBarsCount - 1 - rightMargin;
          const candleIdx = slot - rightSlot + visibleCandles.length - 1;
          if (candleIdx >= 0 && candleIdx < visibleCandles.length) {
            candle = visibleCandles[candleIdx];
          }
        }

        this.cursorPos = {
          x: pos.x,
          y: pos.y,
          price: priceInfo.price,
          time: candle ? candle.time : priceInfo.time,
          candle: candle
        };

        // 5. Drawing new shape
        if (this.isDrawing && this.currentShape) {
          this.currentShape.endX = pos.x;
          this.currentShape.endY = pos.y;
          this.currentShape.endPrice = priceInfo.price;
          this.currentShape.endTime = this.xToTime(pos.x);

          if (this.currentShape.type === 'brush') {
            this.currentShape.points.push({
              x: pos.x,
              y: pos.y,
              time: this.xToTime(pos.x),
              price: priceInfo.price
            });
          }
        }

        this.requestRender();
      };

      const onPointerUp = (e) => {
        if (e && e.touches && e.touches.length > 0) {
          if (e.touches.length === 1) {
            this.isPinching = false;
          }
          return;
        }
        if (this.rafId) {
          cancelAnimationFrame(this.rafId);
          this.rafId = null;
        }
        this.isPinching = false;
        this.isPanning = false;
        this.isDraggingHandle = false;
        this.activeDragHandle = null;
        this.dragStartShapeSnapshot = null;
        this.priceScaleDragging = false;

        if (this.isDrawing && this.currentShape) {
          const finishedShape = this.currentShape;
          const barSec = this.getBarSeconds();
          const visibleCandles = this.getVisibleCandlesSlice();
          const range = this.calculatePriceRange(visibleCandles);
          const priceSpan = range.maxPrice - range.minPrice || 50;

          if (finishedShape.type === 'ote') {
            if (Math.abs(finishedShape.endX - finishedShape.startX) < 25) {
              finishedShape.endX = finishedShape.startX + 180;
              finishedShape.endTime = this.xToTime(finishedShape.endX);
            }
            if (Math.abs(finishedShape.endPrice - finishedShape.startPrice) < 0.5) {
              finishedShape.endY = finishedShape.startY + 90;
              finishedShape.endPrice = finishedShape.startPrice - priceSpan * 0.12;
            }
          } else if (finishedShape.type === 'fvg') {
            if (Math.abs(finishedShape.endTime - finishedShape.startTime) < barSec * 0.5) {
              finishedShape.endTime = finishedShape.startTime + barSec * 5;
            }
            if (Math.abs(finishedShape.endPrice - finishedShape.startPrice) < 0.25) {
              finishedShape.endPrice = finishedShape.startPrice - priceSpan * 0.05;
            }
          } else if (finishedShape.type === 'long_pos' || finishedShape.type === 'short_pos') {
            if (Math.abs(finishedShape.endTime - finishedShape.startTime) < barSec * 0.5) {
              finishedShape.endTime = finishedShape.startTime + barSec * 12;
            }
          }
          this.undoStack.push([...this.drawings]);
          this.drawings.push(finishedShape);
          this.isDrawing = false;
          this.currentShape = null;
          this.render();

          // Auto-prompt to add a label when drawing trendline or liquidity ray
          if (finishedShape.type === 'trendline' || finishedShape.type === 'liquidity') {
            this.openLineLabelModal(finishedShape);
          }
          return;
        }

        this.render();
      };

      const onPointerLeave = () => {
        if (this.rafId) {
          cancelAnimationFrame(this.rafId);
          this.rafId = null;
        }
        this.cursorPos = null;
        this.isPinching = false;
        this.isPanning = false;
        this.isDraggingHandle = false;
        this.activeDragHandle = null;
        this.dragStartShapeSnapshot = null;
        this.priceScaleDragging = false;
        this.render();
      };

      this.canvas.addEventListener('mousedown', onPointerDown);
      this.canvas.addEventListener('mousemove', onPointerMove);
      this.canvas.addEventListener('mouseleave', onPointerLeave);
      window.addEventListener('mouseup', onPointerUp);

      this.canvas.addEventListener('touchstart', onPointerDown, { passive: false });
      this.canvas.addEventListener('touchmove', onPointerMove, { passive: false });
      this.canvas.addEventListener('touchend', onPointerUp, { passive: false });
      this.canvas.addEventListener('touchcancel', onPointerLeave);

      this.canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const chartWidth = this.width - 75;

        // Normalize delta values across Mac trackpad, Magic Mouse, and PC wheel
        let normY = e.deltaY;
        let normX = e.deltaX;
        if (e.deltaMode === 1) { normY *= 18; normX *= 18; }
        else if (e.deltaMode === 2) { normY *= 300; normX *= 300; }

        // Scrolling over the price axis = vertical price zoom (TradingView behavior)
        if (mouseX >= chartWidth) {
          const visibleCandles = this.getVisibleCandlesSlice();
          let min = Infinity, max = -Infinity;
          visibleCandles.forEach(c => { if (c.low < min) min = c.low; if (c.high > max) max = c.high; });
          const pad = (min === Infinity) ? 1 : (max - min) * (this.pricePadding || 0.08) || 1.0;
          const curMin = this.priceScaleMode === 'manual' ? this.manualPriceMin : min - pad;
          const curMax = this.priceScaleMode === 'manual' ? this.manualPriceMax : max + pad;
          const range = curMax - curMin;
          const mid = (curMin + curMax) / 2;

          // Smooth calibrated price zoom step (not jumping 15% per micro-tick)
          const zoomStep = Math.min(0.06, Math.max(0.015, Math.abs(normY) * 0.0008));
          const scale = 1 + (normY > 0 ? zoomStep : -zoomStep);
          const newRange = range * scale;
          this.priceScaleMode = 'manual';
          this.manualPriceMin = mid - newRange / 2;
          this.manualPriceMax = mid + newRange / 2;
          this.requestRender();
          return;
        }

        // Two-finger horizontal swipe on Mac trackpad = smooth horizontal chart pan
        if (Math.abs(normX) > Math.abs(normY) && Math.abs(normX) > 2) {
          const barWidth = this.getBarWidth();
          const panBars = Math.round(normX / (barWidth * 1.6));
          if (panBars !== 0) {
            const allCandles = this.getVisibleCandles();
            const maxPan = Math.max(0, (allCandles ? allCandles.length : 0) - 1);
            this.panOffsetBars = Math.min(maxPan, Math.max(-25, this.panOffsetBars - panBars));
            this.requestRender();
            return;
          }
        }

        // Scrolling over chart area = smooth calibrated zoom
        const zoomStep = Math.max(1, Math.min(Math.round(this.visibleBarsCount * 0.035), Math.round(Math.abs(normY) * 0.045)));
        if (normY < 0) {
          this.visibleBarsCount = Math.max(12, this.visibleBarsCount - zoomStep);
        } else {
          this.visibleBarsCount = Math.min(650, this.visibleBarsCount + zoomStep);
        }

        this.requestRender();
      }, { passive: false });

      // Double-click on chart: if clicking on a line or text handle -> edit label; otherwise reset zoom
      this.canvas.addEventListener('dblclick', (e) => {
        const pos = getPos(e);
        const visibleCandles = this.getVisibleCandlesSlice();
        const { minPrice, maxPrice } = this.calculatePriceRange(visibleCandles);
        const hitHandle = this.findDraggableShapeAt(pos.x, pos.y, minPrice, maxPrice);

        if (hitHandle && (hitHandle.shape.type === 'trendline' || hitHandle.shape.type === 'liquidity')) {
          this.openLineLabelModal(hitHandle.shape);
          return;
        }

        this.priceScaleMode = 'auto';
        this.panOffsetBars = 0;
        this.render();
      });

      window.addEventListener('resize', () => {
        this.resize();
        this.render();
      });
    }

    openLineLabelModal(shape) {
      if (!shape) return;
      if (typeof window.openLineLabelModal === 'function') {
        window.openLineLabelModal(shape, () => {
          this.render();
        });
      }
    }

    getVisibleCandlesSlice() {
      const allCandles = this.getVisibleCandles();
      if (!allCandles || allCandles.length === 0) return [];
      const totalCandles = allCandles.length;
      if (totalCandles <= this.visibleBarsCount) {
        return allCandles;
      }
      const endIndex = Math.max(0, Math.min(totalCandles - 1, totalCandles - 1 - this.panOffsetBars));
      const startIndex = Math.max(0, endIndex - this.visibleBarsCount + 1);
      return allCandles.slice(startIndex, endIndex + 1);
    }

    getCandleSlot(indexInSlice, sliceLength) {
      const allCandles = this.getVisibleCandles();
      const totalCandles = allCandles ? allCandles.length : sliceLength;
      if (totalCandles <= this.visibleBarsCount) {
        const rightSlot = this.visibleBarsCount - 1 + this.panOffsetBars;
        return rightSlot - (sliceLength - 1 - indexInSlice);
      } else {
        const rightMargin = Math.max(0, -this.panOffsetBars);
        const rightSlot = this.visibleBarsCount - 1 - rightMargin;
        return rightSlot - (sliceLength - 1 - indexInSlice);
      }
    }

    findDraggableShapeAt(x, y, minPrice, maxPrice) {
      // Touch-adaptive hit radius: 26px on iPad/touch glass for easy grabbing, 16px on desktop cursor
      const threshold = this.isTouchDevice ? 26 : 16;
      const allShapes = [...this.drawings];
      if (this.currentShape) allShapes.push(this.currentShape);
      const barWidth = this.getBarWidth();

      for (let i = allShapes.length - 1; i >= 0; i--) {
        const shape = allShapes[i];

        // 1. Long / Short Position Tool
        if (shape.type === 'long_pos' || shape.type === 'short_pos') {
          const isLong = shape.type === 'long_pos';
          const entryPrice = shape.entryPrice || shape.startPrice;
          const tpPrice = shape.tpPrice || (isLong ? entryPrice + 40 : entryPrice - 40);
          const slPrice = shape.slPrice || (isLong ? entryPrice - 15 : entryPrice + 15);

          const yEntry = this.priceToY(entryPrice, minPrice, maxPrice);
          const yTp = this.priceToY(tpPrice, minPrice, maxPrice);
          const ySl = this.priceToY(slPrice, minPrice, maxPrice);
          const x1 = shape.startTime != null ? this.timeToX(shape.startTime, barWidth) : shape.startX;
          const x2 = shape.endTime != null ? Math.max(x1 + 60, this.timeToX(shape.endTime, barWidth)) : Math.max(shape.startX + 140, shape.endX);

          // Check TP Handle
          if (x >= x1 - 10 && x <= x2 + 20 && Math.abs(y - yTp) <= threshold) {
            return { shape, handleType: 'tp' };
          }
          // Check SL Handle
          if (x >= x1 - 10 && x <= x2 + 20 && Math.abs(y - ySl) <= threshold) {
            return { shape, handleType: 'sl' };
          }
          // Check Entry Handle
          if (x >= x1 - 10 && x <= x2 + 20 && Math.abs(y - yEntry) <= threshold) {
            return { shape, handleType: 'entry' };
          }
          // Check Box Right Edge (Resize width)
          if (Math.abs(x - x2) <= threshold && y >= Math.min(yTp, ySl) - 5 && y <= Math.max(yTp, ySl) + 5) {
            return { shape, handleType: 'resize_width' };
          }
          // Clicked anywhere inside the position box -> MOVE ENTIRE BRACKET!
          if (x >= x1 && x <= x2 && y >= Math.min(yTp, ySl) && y <= Math.max(yTp, ySl)) {
            return { shape, handleType: 'move_all' };
          }
        }

        // 2. FVG Box
        if (shape.type === 'fvg') {
          const x1 = shape.startTime != null ? this.timeToX(shape.startTime, barWidth) : shape.startX;
          const x2 = shape.endTime != null ? this.timeToX(shape.endTime, barWidth) : shape.endX;
          const y1 = shape.startPrice != null ? this.priceToY(shape.startPrice, minPrice, maxPrice) : shape.startY;
          const y2 = shape.endPrice != null ? this.priceToY(shape.endPrice, minPrice, maxPrice) : shape.endY;
          const left = Math.min(x1, x2);
          const right = Math.max(x1, x2);
          const top = Math.min(y1, y2);
          const bottom = Math.max(y1, y2);
          if (x >= left - 6 && x <= right + 6 && y >= top - 6 && y <= bottom + 6) {
            return { shape, handleType: 'move_fvg' };
          }
        }

        // 3. Liquidity Ray
        if (shape.type === 'liquidity') {
          const yLiq = shape.startPrice != null ? this.priceToY(shape.startPrice, minPrice, maxPrice) : shape.startY;
          const chartWidth = this.width - 75;
          const midX = chartWidth / 2;
          if (Math.abs(x - midX) <= 50 && Math.abs(y - yLiq) <= threshold) {
            return { shape, handleType: 'liquidity_text' };
          }
          if (Math.abs(y - yLiq) <= threshold) {
            return { shape, handleType: 'move_liq' };
          }
        }

        // 4. Trendline / Ray
        if (shape.type === 'trendline') {
          const x1 = shape.startTime != null ? this.timeToX(shape.startTime, barWidth) : shape.startX;
          const y1 = shape.startPrice != null ? this.priceToY(shape.startPrice, minPrice, maxPrice) : shape.startY;
          const x2 = shape.endTime != null ? this.timeToX(shape.endTime, barWidth) : shape.endX;
          const y2 = shape.endPrice != null ? this.priceToY(shape.endPrice, minPrice, maxPrice) : shape.endY;
          const midX = (x1 + x2) / 2;
          const midY = (y1 + y2) / 2;

          // Check Center Text Handle first
          if (Math.hypot(x - midX, y - midY) <= 18) {
            return { shape, handleType: 'trendline_text' };
          }

          if (Math.hypot(x - x1, y - y1) <= threshold) return { shape, handleType: 'trendline_start' };
          if (Math.hypot(x - x2, y - y2) <= threshold) return { shape, handleType: 'trendline_end' };
          const l2 = (x2 - x1) ** 2 + (y2 - y1) ** 2;
          if (l2 > 0) {
            const t = Math.max(0, Math.min(1, ((x - x1) * (x2 - x1) + (y - y1) * (y2 - y1)) / l2));
            const projX = x1 + t * (x2 - x1);
            const projY = y1 + t * (y2 - y1);
            if (Math.hypot(x - projX, y - projY) <= threshold) {
              return { shape, handleType: 'move_trendline' };
            }
          }
        }

        // 5. OTE Fibonacci (Premium / Discount & OTE)
        if (shape.type === 'ote') {
          const startAnchorX = shape.startTime != null ? this.timeToX(shape.startTime, barWidth) : shape.startX;
          const endAnchorX = shape.endTime != null ? this.timeToX(shape.endTime, barWidth) : shape.endX;
          const yStart = shape.startPrice != null ? this.priceToY(shape.startPrice, minPrice, maxPrice) : shape.startY;
          const yEnd = shape.endPrice != null ? this.priceToY(shape.endPrice, minPrice, maxPrice) : shape.endY;

          // Anchor 1 handle (start point)
          if (Math.hypot(x - startAnchorX, y - yStart) <= threshold) {
            return { shape, handleType: 'ote_start' };
          }
          // Anchor 2 handle (end point)
          if (Math.hypot(x - endAnchorX, y - yEnd) <= threshold) {
            return { shape, handleType: 'ote_end' };
          }

          // Inside the bounded Fibonacci box
          const left = Math.min(startAnchorX, endAnchorX);
          const right = Math.max(startAnchorX, endAnchorX);
          const top = Math.min(yStart, yEnd);
          const bottom = Math.max(yStart, yEnd);

          if (x >= left - 8 && x <= right + 8 && y >= top - 8 && y <= bottom + 8) {
            return { shape, handleType: 'move_ote' };
          }
        }
      }
      return null;
    }

    findPositionHandleAt(x, y, minPrice, maxPrice) {
      return this.findDraggableShapeAt(x, y, minPrice, maxPrice);
    }

    getBarWidth() {
      const chartWidth = this.width - 75;
      return chartWidth / this.visibleBarsCount;
    }

    screenToPrice(x, y, optMinPrice, optMaxPrice) {
      let minPrice = optMinPrice;
      let maxPrice = optMaxPrice;
      let priceRange;

      if (minPrice === undefined || maxPrice === undefined) {
        const visibleCandles = this.getVisibleCandlesSlice();
        const range = this.calculatePriceRange(visibleCandles);
        minPrice = range.minPrice;
        maxPrice = range.maxPrice;
        priceRange = range.priceRange;
      } else {
        priceRange = maxPrice - minPrice;
      }

      const chartHeight = this.height - 35;
      const price = maxPrice - (y / chartHeight) * priceRange;
      const time = this.xToTime(x);

      return { price: parseFloat(price.toFixed(2)), time };
    }

    screenToBarIndex(x) {
      const barWidth = this.getBarWidth();
      const slot = Math.floor(x / barWidth);
      const visibleCandles = this.getVisibleCandlesSlice();
      for (let i = 0; i < visibleCandles.length; i++) {
        if (this.getCandleSlot(i, visibleCandles.length) === slot) {
          return i;
        }
      }
      return null;
    }

    priceToY(price, minPrice, maxPrice, customHeight) {
      const chartHeight = customHeight !== undefined ? customHeight : (this.height - 35);
      const range = maxPrice - minPrice;
      if (range === 0) return chartHeight / 2;
      return chartHeight - ((price - minPrice) / range) * chartHeight;
    }

    getBarSeconds() {
      const tf = this.activeTf || '5m';
      if (tf === '1m') return 60;
      if (tf === '5m') return 300;
      if (tf === '15m') return 900;
      if (tf === '1h') return 3600;
      if (tf === '1d' || tf === 'Daily') return 86400;
      return 300;
    }

    timeToCandleIndex(time) {
      const allCandles = this.getVisibleCandles();
      if (!allCandles || allCandles.length === 0) return 0;
      const barSec = this.getBarSeconds();

      if (time <= allCandles[0].time) {
        return (time - allCandles[0].time) / barSec;
      }
      const last = allCandles.length - 1;
      if (time >= allCandles[last].time) {
        return last + (time - allCandles[last].time) / barSec;
      }

      let low = 0, high = last;
      while (low <= high) {
        const mid = (low + high) >> 1;
        if (allCandles[mid].time === time) return mid;
        if (allCandles[mid].time < time) low = mid + 1;
        else high = mid - 1;
      }
      const i0 = Math.max(0, high);
      const i1 = Math.min(last, low);
      if (i0 === i1) return i0;
      const t0 = allCandles[i0].time;
      const t1 = allCandles[i1].time;
      const dt = t1 - t0;
      const frac = dt > 0 ? (time - t0) / dt : 0;
      return i0 + frac;
    }

    candleIndexToX(candleIndex, customBarWidth) {
      const barWidth = customBarWidth || this.getBarWidth();
      const allCandles = this.getVisibleCandles();
      const totalCandles = allCandles ? allCandles.length : 0;
      const endIndex = Math.max(0, Math.min(totalCandles - 1, totalCandles - 1 - this.panOffsetBars));

      let rightSlot;
      if (totalCandles <= this.visibleBarsCount) {
        rightSlot = this.visibleBarsCount - 1 + this.panOffsetBars;
      } else {
        const rightMargin = Math.max(0, -this.panOffsetBars);
        rightSlot = this.visibleBarsCount - 1 - rightMargin;
      }
      const slot = rightSlot - (endIndex - candleIndex);
      return slot * barWidth + barWidth / 2;
    }

    timeToX(time, customBarWidth) {
      if (time == null || isNaN(time)) return null;
      const cIdx = this.timeToCandleIndex(time);
      return this.candleIndexToX(cIdx, customBarWidth);
    }

    xToCandleIndex(x) {
      const barWidth = this.getBarWidth();
      const allCandles = this.getVisibleCandles();
      const totalCandles = allCandles ? allCandles.length : 0;
      const endIndex = Math.max(0, Math.min(totalCandles - 1, totalCandles - 1 - this.panOffsetBars));

      let rightSlot;
      if (totalCandles <= this.visibleBarsCount) {
        rightSlot = this.visibleBarsCount - 1 + this.panOffsetBars;
      } else {
        const rightMargin = Math.max(0, -this.panOffsetBars);
        rightSlot = this.visibleBarsCount - 1 - rightMargin;
      }
      const slot = (x - barWidth / 2) / barWidth;
      const candleIndex = endIndex - (rightSlot - slot);
      return candleIndex;
    }

    xToTime(x) {
      const cIdx = this.xToCandleIndex(x);
      const allCandles = this.getVisibleCandles();
      if (!allCandles || allCandles.length === 0) return this.getCurrentTime() || 0;
      const last = allCandles.length - 1;
      const barSec = this.getBarSeconds();

      if (cIdx <= 0) {
        return allCandles[0].time + Math.round(cIdx * barSec);
      }
      if (cIdx >= last) {
        return allCandles[last].time + Math.round((cIdx - last) * barSec);
      }

      const floorIdx = Math.floor(cIdx);
      const frac = cIdx - floorIdx;
      const t0 = allCandles[floorIdx].time;
      const t1 = allCandles[floorIdx + 1].time;
      return Math.round(t0 + frac * (t1 - t0));
    }

    calculatePriceRange(candles) {
      const curPrice = this.getCurrentPrice() || 29000;
      if (!candles || candles.length === 0) {
        return { minPrice: curPrice - 50, maxPrice: curPrice + 50, priceRange: 100 };
      }

      // Compute visible candle extremes first
      let min = Infinity;
      let max = -Infinity;
      candles.forEach(c => {
        if (c.low < min) min = c.low;
        if (c.high > max) max = c.high;
      });

      if (min === Infinity || max === -Infinity || isNaN(min) || isNaN(max)) {
        min = curPrice - 50;
        max = curPrice + 50;
      }

      // Manual price scale mode — user has dragged the chart or price axis
      if (this.priceScaleMode === 'manual' && this.manualPriceMin < this.manualPriceMax && !isNaN(this.manualPriceMin) && !isNaN(this.manualPriceMax)) {
        const span = (max - min) || 50;
        // Sanity check: if manual price range has wandered completely away from actual candle prices
        // (e.g. > 3x span away), gracefully revert to auto so candles NEVER vanish permanently
        const isFarAway = (this.manualPriceMax < min - span * 3) || (this.manualPriceMin > max + span * 3);
        if (!isFarAway) {
          return {
            minPrice: this.manualPriceMin,
            maxPrice: this.manualPriceMax,
            priceRange: this.manualPriceMax - this.manualPriceMin
          };
        } else {
          this.priceScaleMode = 'auto';
        }
      }

      // Auto-fit:
      // If session structural levels are enabled, expand bounds to include nearby session levels
      if (this.overlays.sessions && this.scenario) {
        const ctx = this.getSessionContext();
        if (ctx) {
          const keyLevels = [ctx.midnightOpen, ctx.asia?.high, ctx.asia?.low, ctx.london?.high, ctx.london?.low].filter(Boolean);
          const curSpan = (max - min) || 10;
          keyLevels.forEach(lvl => {
            if (lvl >= min - curSpan * 0.4 && lvl <= max + curSpan * 0.4) {
              if (lvl < min) min = lvl;
              if (lvl > max) max = lvl;
            }
          });
        }
      }

      const pad = (max - min) * (this.pricePadding || 0.08) || 1.0;
      return {
        minPrice: min - pad,
        maxPrice: max + pad,
        priceRange: (max + pad) - (min - pad)
      };
    }

    priceToYSecondary(price, minPrice, maxPrice) {
      const chartHeight = this.secondaryHeight - 35;
      const range = maxPrice - minPrice;
      if (range === 0) return chartHeight / 2;
      return chartHeight - ((price - minPrice) / range) * chartHeight;
    }

    calculateSecondaryPriceRange(candles) {
      if (!candles || candles.length === 0) {
        return { minPrice: 5000, maxPrice: 5100, priceRange: 100 };
      }

      let min = Infinity;
      let max = -Infinity;
      candles.forEach(c => {
        if (c.low < min) min = c.low;
        if (c.high > max) max = c.high;
      });

      if (min === Infinity || max === -Infinity || isNaN(min) || isNaN(max)) {
        min = 5000;
        max = 5100;
      }

      if (this.secondaryPriceScaleMode === 'manual' && this.secondaryManualPriceMin < this.secondaryManualPriceMax && !isNaN(this.secondaryManualPriceMin) && !isNaN(this.secondaryManualPriceMax)) {
        const span = (max - min) || 50;
        const isFarAway = (this.secondaryManualPriceMax < min - span * 3) || (this.secondaryManualPriceMin > max + span * 3);
        if (!isFarAway) {
          return {
            minPrice: this.secondaryManualPriceMin,
            maxPrice: this.secondaryManualPriceMax,
            priceRange: this.secondaryManualPriceMax - this.secondaryManualPriceMin
          };
        } else {
          this.secondaryPriceScaleMode = 'auto';
        }
      }

      const pad = (max - min) * (this.pricePadding || 0.08) || 1.0;
      return {
        minPrice: min - pad,
        maxPrice: max + pad,
        priceRange: (max + pad) - (min - pad)
      };
    }

    // ========================================================================
    // MAIN RENDER LOOP WITH SESSION STRUCTURAL MARKERS
    // ========================================================================
    render() {
      if (!this.ctx || this.width === 0 || this.height === 0) return;
      const ctx = this.ctx;
      const w = this.width;
      const h = this.height;

      ctx.fillStyle = "#0a0e17";
      ctx.fillRect(0, 0, w, h);

      const allCandles = this.getVisibleCandles();
      if (!allCandles || allCandles.length === 0) return;

      const endIndex = Math.max(0, allCandles.length - 1 - this.panOffsetBars);
      const startIndex = Math.max(0, endIndex - this.visibleBarsCount + 1);
      const visibleCandles = allCandles.slice(startIndex, endIndex + 1);

      const { minPrice, maxPrice } = this.calculatePriceRange(visibleCandles);
      const chartWidth = w - 75;
      const chartHeight = h - 35;
      const barWidth = chartWidth / this.visibleBarsCount;
      const candleWidth = Math.max(1, Math.min(Math.max(1, barWidth - 0.5), barWidth * 0.75));
      const wickWidth = barWidth >= 4 ? 1.2 : (barWidth >= 2 ? 0.8 : 0.5);

      // 1. Session Background Vertical Zones & Bounded Range Boxes (Asian, London, NY AM, Silver Bullet)
      if (this.overlays.sessions) {
        this.renderSessionZones(ctx, visibleCandles, barWidth, chartHeight, minPrice, maxPrice);
      }

      // 2. Grid Lines
      this.renderGrid(ctx, chartWidth, chartHeight, minPrice, maxPrice);

      // 4. Algorithmic Overlays (FVGs & Displacement)
      if (this.overlays.fvg) {
        this.renderAlgorithmicOverlays(ctx, visibleCandles, barWidth, minPrice, maxPrice);
      }

      // 5. Candlesticks
      visibleCandles.forEach((c, i) => {
        const slot = this.getCandleSlot(i, visibleCandles.length);
        if (slot < -1 || slot > this.visibleBarsCount + 1) return;

        const xCenter = slot * barWidth + barWidth / 2;
        const isUp = c.close >= c.open;
        const color = isUp ? "#10b981" : "#ef4444";
        const wickColor = isUp ? "#34d399" : "#f87171";

        const yOpen = this.priceToY(c.open, minPrice, maxPrice);
        const yClose = this.priceToY(c.close, minPrice, maxPrice);
        const yHigh = this.priceToY(c.high, minPrice, maxPrice);
        const yLow = this.priceToY(c.low, minPrice, maxPrice);

        ctx.strokeStyle = wickColor;
        ctx.lineWidth = wickWidth;
        ctx.beginPath();
        ctx.moveTo(xCenter, yHigh);
        ctx.lineTo(xCenter, yLow);
        ctx.stroke();

        ctx.fillStyle = color;
        const bodyTop = Math.min(yOpen, yClose);
        const bodyHeight = Math.max(1.0, Math.abs(yOpen - yClose));
        ctx.fillRect(xCenter - candleWidth / 2, bodyTop, candleWidth, bodyHeight);
      });

      // 6. User Drawings & Interactive Long/Short Position Tools with Drag Handles
      this.renderDrawings(ctx, minPrice, maxPrice, barWidth);

      // 7. Active Open Position Lines
      this.renderActivePositions(ctx, chartWidth, minPrice, maxPrice);

      // 8. Price & Time Axes
      this.renderAxes(ctx, w, h, chartWidth, chartHeight, minPrice, maxPrice, visibleCandles, barWidth);

      // 9. Watermark
      this.renderWatermark(ctx, chartWidth, chartHeight);

      // 10. Secondary SMT Chart Render (when split screen active)
      if (this.layoutMode !== 'single') {
        this.renderSecondary();
      }
    }

    renderSessionZones(ctx, visibleCandles, barWidth, chartHeight, minPrice, maxPrice) {
      if (!visibleCandles || visibleCandles.length === 0) return;

      const getSessionType = (timeStr) => {
        const ny = window.ICTEngine.getNyTime(timeStr);
        const t = ny.hour + ny.minute / 60;
        if (t >= 20.0 || t < 0.0) return { key: 'asia', name: '🌏 ASIA', color: '#a855f7', bg: 'rgba(168, 85, 247, 0.08)' };
        if (t >= 2.0 && t < 5.0) return { key: 'london', name: '🇬🇧 LONDON', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.08)' };
        if (t >= 10.0 && t < 11.0) return { key: 'sb', name: '⚡ SILVER BULLET', color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.15)' };
        if (t >= 8.5 && t < 11.0) return { key: 'ny_am', name: '🇺🇸 NY AM', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.06)' };
        return null;
      };

      let curSegment = null;
      const segments = [];

      visibleCandles.forEach((c, i) => {
        const session = getSessionType(c.time);
        const slot = this.getCandleSlot(i, visibleCandles.length);

        if (!session) {
          if (curSegment) {
            segments.push(curSegment);
            curSegment = null;
          }
          return;
        }

        if (curSegment && curSegment.key === session.key) {
          curSegment.endSlot = slot;
          curSegment.candles.push(c);
          if (c.high > curSegment.high) curSegment.high = c.high;
          if (c.low < curSegment.low) curSegment.low = c.low;
        } else {
          if (curSegment) segments.push(curSegment);
          curSegment = {
            key: session.key,
            name: session.name,
            color: session.color,
            bg: session.bg,
            startSlot: slot,
            endSlot: slot,
            high: c.high,
            low: c.low,
            candles: [c]
          };
        }
      });
      if (curSegment) segments.push(curSegment);

      // 1. Render vertical session columns & bounded session range boxes
      segments.forEach(seg => {
        const x1 = seg.startSlot * barWidth;
        const x2 = (seg.endSlot + 1) * barWidth;
        const width = Math.max(barWidth, x2 - x1);

        // Soft vertical background shading for the session
        ctx.fillStyle = seg.bg;
        ctx.fillRect(x1, 0, width, chartHeight);

        // Header pill tag at the top of the session column
        if (width >= 28) {
          ctx.font = "bold 9px monospace";
          const tw = ctx.measureText(seg.name).width;
          const badgeW = tw + 10;
          const badgeH = 15;
          const badgeX = Math.max(x1 + 4, Math.min(x2 - badgeW - 4, x1 + (width - badgeW) / 2));
          const badgeY = 6;

          ctx.fillStyle = "rgba(10, 14, 23, 0.90)";
          ctx.fillRect(badgeX, badgeY, badgeW, badgeH);
          ctx.strokeStyle = seg.color;
          ctx.lineWidth = 0.8;
          ctx.strokeRect(badgeX, badgeY, badgeW, badgeH);

          ctx.fillStyle = seg.color;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(seg.name, badgeX + badgeW / 2, badgeY + badgeH / 2);
        }

        // Bounded High/Low Range Box (Strictly contained within this session's time window)
        // Only for Asia & London sessions
        if ((seg.key === 'asia' || seg.key === 'london') && minPrice !== undefined && maxPrice !== undefined) {
          const yHigh = this.priceToY(seg.high, minPrice, maxPrice, chartHeight);
          const yLow = this.priceToY(seg.low, minPrice, maxPrice, chartHeight);
          const boxH = Math.max(2, Math.abs(yLow - yHigh));
          const yTop = Math.min(yHigh, yLow);

          ctx.strokeStyle = seg.color;
          ctx.lineWidth = 1;
          ctx.setLineDash([3, 3]);
          ctx.strokeRect(x1, yTop, width, boxH);
          ctx.setLineDash([]);

          // Compact high/low level badges on the session box itself
          if (width >= 40) {
            ctx.fillStyle = "rgba(10, 14, 23, 0.85)";
            ctx.font = "8.5px monospace";
            ctx.textAlign = "left";
            ctx.textBaseline = "middle";

            const hTxt = `H: ${seg.high.toFixed(2)}`;
            const lTxt = `L: ${seg.low.toFixed(2)}`;

            ctx.fillStyle = seg.color;
            ctx.fillText(hTxt, x1 + 4, yTop + 6);
            ctx.fillText(lTxt, x1 + 4, yTop + boxH - 6);
          }
        }
      });

      // 2. Midnight Open (00:00 NY) vertical line marker
      visibleCandles.forEach((c, i) => {
        const ny = window.ICTEngine.getNyTime(c.time);
        if (ny.hour === 0 && ny.minute === 0) {
          const slot = this.getCandleSlot(i, visibleCandles.length);
          const x = slot * barWidth;
          ctx.strokeStyle = "#38bdf8";
          ctx.lineWidth = 1.2;
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, chartHeight);
          ctx.stroke();
          ctx.setLineDash([]);

          // Badge at bottom
          ctx.fillStyle = "#38bdf8";
          ctx.font = "bold 9px monospace";
          ctx.textAlign = "left";
          ctx.fillText("🕛 00:00 MIDNIGHT", x + 4, chartHeight - 12);
        }
      });
    }

    renderKillzoneShading(ctx, candles, barWidth, chartHeight) {
      this.renderSessionZones(ctx, candles, barWidth, chartHeight);
    }

    renderGrid(ctx, chartWidth, chartHeight, minPrice, maxPrice) {
      ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
      ctx.lineWidth = 1;

      const step = (maxPrice - minPrice) / 6;
      for (let i = 1; i <= 5; i++) {
        const price = minPrice + i * step;
        const y = this.priceToY(price, minPrice, maxPrice);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(chartWidth, y);
        ctx.stroke();
      }
    }

    renderAlgorithmicOverlays(ctx, candles, barWidth, minPrice, maxPrice) {
      if (candles.length < 3 || !this.overlays.fvg) return;

      for (let i = 2; i < candles.length; i++) {
        const c1 = candles[i - 2];
        const c2 = candles[i - 1];
        const c3 = candles[i];

        // Bullish FVG
        if (c3.low > c1.high && c2.close > c2.open) {
          const yTop = this.priceToY(c3.low, minPrice, maxPrice);
          const yBottom = this.priceToY(c1.high, minPrice, maxPrice);
          const slot = this.getCandleSlot(i - 1, candles.length);
          const xStart = slot * barWidth;
          const xEnd = Math.min(xStart + barWidth * 8, this.width - 75);

          ctx.fillStyle = "rgba(16, 185, 129, 0.22)";
          ctx.strokeStyle = "rgba(16, 185, 129, 0.7)";
          ctx.lineWidth = 1;
          ctx.fillRect(xStart, yTop, xEnd - xStart, yBottom - yTop);
          ctx.strokeRect(xStart, yTop, xEnd - xStart, yBottom - yTop);

          // 50% CE
          const yCe = (yTop + yBottom) / 2;
          ctx.strokeStyle = "rgba(16, 185, 129, 0.9)";
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ctx.moveTo(xStart, yCe);
          ctx.lineTo(xEnd, yCe);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Bearish FVG
        if (c3.high < c1.low && c2.close < c2.open) {
          const yTop = this.priceToY(c1.low, minPrice, maxPrice);
          const yBottom = this.priceToY(c3.high, minPrice, maxPrice);
          const slot = this.getCandleSlot(i - 1, candles.length);
          const xStart = slot * barWidth;
          const xEnd = Math.min(xStart + barWidth * 8, this.width - 75);

          ctx.fillStyle = "rgba(239, 68, 68, 0.22)";
          ctx.strokeStyle = "rgba(239, 68, 68, 0.7)";
          ctx.lineWidth = 1;
          ctx.fillRect(xStart, yTop, xEnd - xStart, yBottom - yTop);
          ctx.strokeRect(xStart, yTop, xEnd - xStart, yBottom - yTop);

          // 50% CE
          const yCe = (yTop + yBottom) / 2;
          ctx.strokeStyle = "rgba(239, 68, 68, 0.9)";
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ctx.moveTo(xStart, yCe);
          ctx.lineTo(xEnd, yCe);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }
    }

    renderDrawings(ctx, minPrice, maxPrice, barWidth) {
      const allShapes = [...this.drawings];
      if (this.currentShape) allShapes.push(this.currentShape);
      const pointVal = this.getPointValue();

      allShapes.forEach(shape => {
        ctx.save();
        if (shape.type === 'fvg') {
          const x1 = shape.startTime != null ? this.timeToX(shape.startTime, barWidth) : shape.startX;
          const x2 = shape.endTime != null ? this.timeToX(shape.endTime, barWidth) : shape.endX;
          const y1 = shape.startPrice != null ? this.priceToY(shape.startPrice, minPrice, maxPrice) : shape.startY;
          const y2 = shape.endPrice != null ? this.priceToY(shape.endPrice, minPrice, maxPrice) : shape.endY;

          const left = Math.min(x1, x2);
          const right = Math.max(x1, x2);
          const top = Math.min(y1, y2);
          const bottom = Math.max(y1, y2);
          const wBox = Math.max(4, right - left);
          const hBox = Math.max(2, bottom - top);
          const isBull = (shape.startPrice != null && shape.endPrice != null)
            ? (shape.startPrice < shape.endPrice)
            : (shape.startY > shape.endY);

          ctx.fillStyle = isBull ? "rgba(16, 185, 129, 0.28)" : "rgba(239, 68, 68, 0.28)";
          ctx.strokeStyle = isBull ? "#10b981" : "#ef4444";
          ctx.lineWidth = 1.5;
          ctx.fillRect(left, top, wBox, hBox);
          ctx.strokeRect(left, top, wBox, hBox);

          const midY = (top + bottom) / 2;
          ctx.setLineDash([4, 4]);
          ctx.strokeStyle = isBull ? "#34d399" : "#f87171";
          ctx.beginPath();
          ctx.moveTo(left, midY);
          ctx.lineTo(right, midY);
          ctx.stroke();
          ctx.setLineDash([]);

          ctx.fillStyle = isBull ? "#10b981" : "#ef4444";
          ctx.font = "bold 10px monospace";
          ctx.fillText(`+FVG (CE 50%)`, left + 6, midY - 4);
        } else if (shape.type === 'liquidity') {
          const y = shape.startPrice != null ? this.priceToY(shape.startPrice, minPrice, maxPrice) : shape.startY;
          const x1 = shape.startTime != null ? Math.max(0, this.timeToX(shape.startTime, barWidth)) : 0;
          const x2 = this.width - 75;
          ctx.strokeStyle = "#a855f7";
          ctx.lineWidth = 1.8;
          ctx.setLineDash([5, 3]);

          const label = shape.text ? shape.text : "⚡ LIQUIDITY POOL (BSL / SSL)";
          this.renderTextOnLine(ctx, x1, y, x2, y, label, "#c084fc", true);
          ctx.setLineDash([]);
        } else if (shape.type === 'ote') {
          // Bounded Fibonacci Retracement (Topstep / TradingView Style)
          const startAnchorX = shape.startTime != null ? this.timeToX(shape.startTime, barWidth) : shape.startX;
          const endAnchorX = shape.endTime != null ? this.timeToX(shape.endTime, barWidth) : shape.endX;
          const yStart = shape.startPrice != null ? this.priceToY(shape.startPrice, minPrice, maxPrice) : shape.startY;
          const yEnd = shape.endPrice != null ? this.priceToY(shape.endPrice, minPrice, maxPrice) : shape.endY;

          const x1 = Math.min(startAnchorX, endAnchorX);
          const x2 = Math.max(startAnchorX, endAnchorX);
          const boxWidth = Math.max(20, x2 - x1);

          const dy = yEnd - yStart;
          const isDownward = dy > 0;

          // Fibonacci retracement levels from 0.0 to 1.0
          const y0 = yStart;
          const y382 = yStart + dy * 0.382;
          const y50 = yStart + dy * 0.50;
          const y618 = yStart + dy * 0.618;
          const y705 = yStart + dy * 0.705;
          const y786 = yStart + dy * 0.786;
          const y100 = yEnd;

          // 1. Shaded Zones: Premium & Discount (Strictly BOUNDED horizontally between x1 and x2)
          const yTopPrem = Math.min(y0, y50);
          const yBotPrem = Math.max(y0, y50);
          const yTopDisc = Math.min(y50, y100);
          const yBotDisc = Math.max(y50, y100);

          // Premium Shading (Bearish selling zone)
          ctx.fillStyle = isDownward ? "rgba(239, 68, 68, 0.10)" : "rgba(16, 185, 129, 0.10)";
          ctx.fillRect(x1, yTopPrem, boxWidth, yBotPrem - yTopPrem);

          // Discount Shading (Bullish buying zone)
          ctx.fillStyle = isDownward ? "rgba(16, 185, 129, 0.10)" : "rgba(239, 68, 68, 0.10)";
          ctx.fillRect(x1, yTopDisc, boxWidth, yBotDisc - yTopDisc);

          // OTE Golden Sweet Spot Zone Shading (0.618 - 0.786)
          const yTopOte = Math.min(y618, y786);
          const yBotOte = Math.max(y618, y786);
          ctx.fillStyle = "rgba(251, 191, 36, 0.18)";
          ctx.fillRect(x1, yTopOte, boxWidth, yBotOte - yTopOte);

          // Subtle Outer Box Border
          ctx.strokeStyle = "rgba(148, 163, 184, 0.28)";
          ctx.lineWidth = 1;
          const yBoxTop = Math.min(y0, y100);
          const yBoxHeight = Math.abs(y100 - y0);
          ctx.strokeRect(x1, yBoxTop, boxWidth, yBoxHeight);

          // 2. Trend / Anchor Diagonal Line (Topstep / TradingView dashed connector between the 2 anchors)
          ctx.strokeStyle = "rgba(203, 213, 225, 0.65)";
          ctx.lineWidth = 1.3;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(startAnchorX, startAnchorY);
          ctx.lineTo(endAnchorX, endAnchorY);
          ctx.stroke();
          ctx.setLineDash([]);

          // 3. Clean Topstep/TradingView-Style Fibonacci Level Lines & Badges
          const fibs = [
            { level: 0.0, y: y0, label: "0.0", color: "#94a3b8", lw: 1.2, dash: [] },
            { level: 0.382, y: y382, label: "0.382", color: "rgba(148, 163, 184, 0.7)", lw: 1, dash: [4, 3] },
            { level: 0.50, y: y50, label: "0.50 EQ", color: "#38bdf8", lw: 2, dash: [6, 4] },
            { level: 0.618, y: y618, label: "0.618", color: "#10b981", lw: 1.5, dash: [4, 2] },
            { level: 0.705, y: y705, label: "0.705 OTE", color: "#fbbf24", lw: 2.2, dash: [] },
            { level: 0.786, y: y786, label: "0.786", color: "#10b981", lw: 1.5, dash: [4, 2] },
            { level: 1.0, y: y100, label: "1.0", color: "#94a3b8", lw: 1.2, dash: [] }
          ];

          fibs.forEach(fib => {
            ctx.strokeStyle = fib.color;
            ctx.lineWidth = fib.lw;
            ctx.setLineDash(fib.dash);
            ctx.beginPath();
            ctx.moveTo(x1, fib.y);
            ctx.lineTo(x2, fib.y);
            ctx.stroke();
            ctx.setLineDash([]);

            // Right-aligned clean level badge
            ctx.font = (fib.level === 0.50 || fib.level === 0.705) ? "bold 10px monospace" : "9px monospace";
            const tw = ctx.measureText(fib.label).width;
            const badgeW = tw + 8;
            const badgeH = 14;
            const badgeX = x2 - badgeW - 3;
            const badgeY = fib.y - badgeH / 2;

            ctx.fillStyle = "rgba(10, 14, 23, 0.92)";
            ctx.fillRect(badgeX, badgeY, badgeW, badgeH);
            ctx.strokeStyle = fib.color;
            ctx.lineWidth = 0.8;
            ctx.strokeRect(badgeX, badgeY, badgeW, badgeH);

            ctx.fillStyle = fib.color;
            ctx.textAlign = "left";
            ctx.textBaseline = "middle";
            ctx.fillText(fib.label, badgeX + 4, fib.y);
          });

          // 4. Anchor Drag Handles at Start and End points
          [
            { x: startAnchorX, y: startAnchorY, color: "#38bdf8" },
            { x: endAnchorX, y: endAnchorY, color: "#fbbf24" }
          ].forEach(h => {
            ctx.fillStyle = h.color;
            ctx.beginPath();
            ctx.arc(h.x, h.y, 5.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 1.5;
            ctx.stroke();
          });
        }
        // ====================================================================
        // INTERACTIVE ADJUSTABLE LONG / SHORT POSITION BRACKET
        // ====================================================================
        else if (shape.type === 'long_pos' || shape.type === 'short_pos') {
          const isLong = shape.type === 'long_pos';
          const entryPrice = shape.entryPrice || shape.startPrice;
          const tpPrice = shape.tpPrice || (isLong ? entryPrice + 40 : entryPrice - 40);
          const slPrice = shape.slPrice || (isLong ? entryPrice - 15 : entryPrice + 15);

          const yEntry = this.priceToY(entryPrice, minPrice, maxPrice);
          const yTp = this.priceToY(tpPrice, minPrice, maxPrice);
          const ySl = this.priceToY(slPrice, minPrice, maxPrice);

          const x1 = shape.startTime != null ? this.timeToX(shape.startTime, barWidth) : shape.startX;
          const x2 = shape.endTime != null ? Math.max(x1 + 60, this.timeToX(shape.endTime, barWidth)) : Math.max(x1 + 150, shape.endX);

          const riskPts = Math.abs(entryPrice - slPrice);
          const rewardPts = Math.abs(tpPrice - entryPrice);
          const rrRatio = riskPts > 0 ? (rewardPts / riskPts).toFixed(2) : "0.00";
          const dollarReward = rewardPts * pointVal;
          const dollarRisk = riskPts * pointVal;

          // Target Area (Green)
          ctx.fillStyle = "rgba(16, 185, 129, 0.25)";
          ctx.fillRect(x1, Math.min(yEntry, yTp), x2 - x1, Math.abs(yTp - yEntry));
          ctx.strokeStyle = "#10b981";
          ctx.lineWidth = 1.5;
          ctx.strokeRect(x1, Math.min(yEntry, yTp), x2 - x1, Math.abs(yTp - yEntry));

          // Stop Area (Red)
          ctx.fillStyle = "rgba(239, 68, 68, 0.25)";
          ctx.fillRect(x1, Math.min(yEntry, ySl), x2 - x1, Math.abs(ySl - yEntry));
          ctx.strokeStyle = "#ef4444";
          ctx.lineWidth = 1.5;
          ctx.strokeRect(x1, Math.min(yEntry, ySl), x2 - x1, Math.abs(ySl - yEntry));

          // Entry Line
          ctx.strokeStyle = "#38bdf8";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x1, yEntry);
          ctx.lineTo(x2, yEntry);
          ctx.stroke();

          // Interactive Drag Handles (Circles)
          // 1. TP Handle
          ctx.fillStyle = "#10b981";
          ctx.beginPath();
          ctx.arc(x2, yTp, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "#fff";
          ctx.stroke();

          // 2. SL Handle
          ctx.fillStyle = "#ef4444";
          ctx.beginPath();
          ctx.arc(x2, ySl, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "#fff";
          ctx.stroke();

          // 3. Entry Handle
          ctx.fillStyle = "#38bdf8";
          ctx.beginPath();
          ctx.arc(x2, yEntry, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "#fff";
          ctx.stroke();

          // Info Badges on Chart
          ctx.fillStyle = "#fff";
          ctx.font = "bold 11px monospace";
          ctx.fillText(`🎯 TP: ${tpPrice.toFixed(2)} (+${rewardPts.toFixed(2)} pts | +$${dollarReward.toFixed(2)})`, x1 + 8, Math.min(yEntry, yTp) + 16);
          ctx.fillText(`🛑 SL: ${slPrice.toFixed(2)} (-${riskPts.toFixed(2)} pts | -$${dollarRisk.toFixed(2)})`, x1 + 8, Math.max(yEntry, ySl) - 6);

          // R:R Header Tag
          ctx.fillStyle = "rgba(10, 14, 23, 0.9)";
          ctx.fillRect(x1 + 6, yEntry - 22, 130, 20);
          ctx.strokeStyle = "#38bdf8";
          ctx.strokeRect(x1 + 6, yEntry - 22, 130, 20);
          ctx.fillStyle = "#38bdf8";
          ctx.font = "bold 10px monospace";
          ctx.fillText(`⚡ R:R 1:${rrRatio} (Drag to adjust)`, x1 + 10, yEntry - 8);
        } else if (shape.type === 'trendline') {
          const x1 = shape.startTime != null ? this.timeToX(shape.startTime, barWidth) : shape.startX;
          const y1 = shape.startPrice != null ? this.priceToY(shape.startPrice, minPrice, maxPrice) : shape.startY;
          const x2 = shape.endTime != null ? this.timeToX(shape.endTime, barWidth) : shape.endX;
          const y2 = shape.endPrice != null ? this.priceToY(shape.endPrice, minPrice, maxPrice) : shape.endY;

          ctx.strokeStyle = "#60a5fa";
          ctx.lineWidth = 2;
          this.renderTextOnLine(ctx, x1, y1, x2, y2, shape.text, "#60a5fa", false);

          // Subtle center handle dot when no text is present
          if (!shape.text) {
            const midX = (x1 + x2) / 2;
            const midY = (y1 + y2) / 2;
            ctx.fillStyle = "#60a5fa";
            ctx.beginPath();
            ctx.arc(midX, midY, 3, 0, Math.PI * 2);
            ctx.fill();
          }
        } else if (shape.type === 'brush' && shape.points) {
          ctx.strokeStyle = "#fbbf24";
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          shape.points.forEach((p, idx) => {
            const px = p.time != null ? this.timeToX(p.time, barWidth) : p.x;
            const py = p.price != null ? this.priceToY(p.price, minPrice, maxPrice) : p.y;
            if (idx === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          });
          ctx.stroke();
        }
        ctx.restore();
      });
    }

    renderTextOnLine(ctx, x1, y1, x2, y2, text, color, isDashed = false) {
      if (!text || !text.trim()) {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        return;
      }

      ctx.font = 'bold 10px monospace';
      const textMetrics = ctx.measureText(text);
      const textWidth = textMetrics.width;
      const pillWidth = textWidth + 14;
      const pillHeight = 16;
      const halfPill = pillWidth / 2;

      const midX = (x1 + x2) / 2;
      const midY = (y1 + y2) / 2;
      const lineLen = Math.hypot(x2 - x1, y2 - y1);

      if (lineLen <= pillWidth + 8) {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        return;
      }

      const dx = (x2 - x1) / lineLen;
      const dy = (y2 - y1) / lineLen;

      // Segment 1: start to pill start
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(midX - dx * halfPill, midY - dy * halfPill);
      ctx.stroke();

      // Segment 2: pill end to line end
      ctx.beginPath();
      ctx.moveTo(midX + dx * halfPill, midY + dy * halfPill);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      // Pill and Text at midX, midY
      ctx.save();
      ctx.translate(midX, midY);

      // Rotate text along the line, but keep it readable (between -PI/2 and PI/2)
      let angle = Math.atan2(y2 - y1, x2 - x1);
      if (angle > Math.PI / 2) angle -= Math.PI;
      else if (angle < -Math.PI / 2) angle += Math.PI;
      ctx.rotate(angle);

      // Dark background pill with subtle colored border
      ctx.fillStyle = '#0a0e17';
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(-halfPill, -pillHeight / 2, pillWidth, pillHeight, 3);
      } else {
        ctx.rect(-halfPill, -pillHeight / 2, pillWidth, pillHeight);
      }
      ctx.fill();
      ctx.stroke();

      // Centered label text
      ctx.fillStyle = color;
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 0, 0);

      ctx.restore();
    }

    renderActivePositions(ctx, chartWidth, minPrice, maxPrice) {
      this.account.openPositions.forEach(pos => {
        const yEntry = this.priceToY(pos.entryPrice, minPrice, maxPrice);

        ctx.strokeStyle = pos.side === 'BUY' ? "#10b981" : "#ef4444";
        ctx.lineWidth = 1.8;
        ctx.setLineDash([4, 2]);
        ctx.beginPath();
        ctx.moveTo(0, yEntry);
        ctx.lineTo(chartWidth, yEntry);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = pos.side === 'BUY' ? "#10b981" : "#ef4444";
        ctx.font = "bold 11px sans-serif";
        ctx.fillText(`● OPEN ${pos.side} @ ${pos.entryPrice.toFixed(2)} (${pos.unrealizedPnL >= 0 ? '+' : ''}$${pos.unrealizedPnL.toFixed(2)})`, 10, yEntry - 4);

        if (pos.sl) {
          const ySl = this.priceToY(pos.sl, minPrice, maxPrice);
          ctx.strokeStyle = "#ef4444";
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(0, ySl);
          ctx.lineTo(chartWidth, ySl);
          ctx.stroke();
          ctx.fillStyle = "#ef4444";
          ctx.fillText(`🛑 SL @ ${pos.sl.toFixed(2)}`, 10, ySl - 4);
        }

        if (pos.tp) {
          const yTp = this.priceToY(pos.tp, minPrice, maxPrice);
          ctx.strokeStyle = "#10b981";
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(0, yTp);
          ctx.lineTo(chartWidth, yTp);
          ctx.stroke();
          ctx.fillStyle = "#10b981";
          ctx.fillText(`🎯 TP @ ${pos.tp.toFixed(2)}`, 10, yTp - 4);
        }
      });
    }

    renderAxes(ctx, w, h, chartWidth, chartHeight, minPrice, maxPrice, visibleCandles, barWidth) {
      ctx.fillStyle = "#0d131f";
      ctx.fillRect(chartWidth, 0, 75, h);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(chartWidth, 0);
      ctx.lineTo(chartWidth, h);
      ctx.stroke();

      // Price Scale Labels
      ctx.fillStyle = "#94a3b8";
      ctx.font = "11px monospace";
      ctx.textAlign = "left";
      const step = (maxPrice - minPrice) / 6;
      for (let i = 0; i <= 6; i++) {
        const p = minPrice + i * step;
        const y = this.priceToY(p, minPrice, maxPrice);
        ctx.fillText(p.toFixed(2), chartWidth + 6, y + 4);
      }

      // Current Price Tag (Blue)
      const curPrice = this.getCurrentPrice();
      const yCur = this.priceToY(curPrice, minPrice, maxPrice);
      ctx.fillStyle = "#38bdf8";
      ctx.fillRect(chartWidth, yCur - 10, 75, 20);
      ctx.fillStyle = "#0a0e17";
      ctx.font = "bold 11px monospace";
      ctx.fillText(curPrice.toFixed(2), chartWidth + 6, yCur + 4);

      // Bottom Time Axis Background
      ctx.fillStyle = "#0d131f";
      ctx.fillRect(0, chartHeight, w, 35);
      ctx.beginPath();
      ctx.moveTo(0, chartHeight);
      ctx.lineTo(w, chartHeight);
      ctx.stroke();

      // Time Scale Grid Labels
      ctx.fillStyle = "#64748b";
      ctx.font = "10px sans-serif";
      ctx.textAlign = "center";
      const totalVis = visibleCandles.length;
      const timeStep = totalVis > 20 ? 6 : (totalVis > 6 ? 2 : 1);
      visibleCandles.forEach((c, idx) => {
        const slot = this.getCandleSlot(idx, totalVis);
        if (slot < 0 || slot >= this.visibleBarsCount) return;
        if (idx % timeStep === 0 || idx === totalVis - 1) {
          const x = slot * barWidth + barWidth / 2;
          const ny = window.ICTEngine.getNyTime(c.time);
          ctx.fillText(`${ny.hour.toString().padStart(2, '0')}:${ny.minute.toString().padStart(2, '0')}`, x, chartHeight + 18);
        }
      });

      // 1. TradingView Crosshair & Dynamic Cursor Badges
      this.renderCrosshair(ctx, w, h, chartWidth, chartHeight, minPrice, maxPrice);

      // 2. Top-Left TradingView OHLCV Legend Bar
      this.renderOhlcvLegend(ctx, chartWidth, visibleCandles);
    }

    renderCrosshair(ctx, w, h, chartWidth, chartHeight, minPrice, maxPrice) {
      if (!this.cursorPos) {
        if (this.secondaryCursorPos && this.secondaryCursorPos.time) {
          const barWidth = chartWidth / this.visibleBarsCount;
          const allCandles = this.getVisibleCandles();
          const endIndex = Math.max(0, allCandles.length - 1 - this.panOffsetBars);
          const startIndex = Math.max(0, endIndex - this.visibleBarsCount + 1);
          const visibleCandles = allCandles.slice(startIndex, endIndex + 1);
          const matchedIdx = visibleCandles.findIndex(c => c.time === this.secondaryCursorPos.time);
          if (matchedIdx !== -1) {
            const slot = this.getCandleSlot(matchedIdx, visibleCandles.length);
            const xMatch = slot * barWidth + barWidth / 2;
            ctx.save();
            ctx.strokeStyle = "rgba(255, 255, 255, 0.45)";
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(xMatch, 0);
            ctx.lineTo(xMatch, chartHeight);
            ctx.stroke();
            ctx.restore();
          }
        }
        return;
      }
      const { x, y, price, time } = this.cursorPos;
      if (x < 0 || x > chartWidth || y < 0 || y > chartHeight) return;

      ctx.save();

      // Dotted Crosshair Lines (TradingView Style)
      ctx.strokeStyle = "rgba(255, 255, 255, 0.45)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);

      // Vertical line through cursor
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, chartHeight);
      ctx.stroke();

      // Horizontal line through cursor
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(chartWidth, y);
      ctx.stroke();

      ctx.setLineDash([]);

      // Dynamic Time Badge on Bottom Axis (Where mouse pointer is at!)
      const ny = window.ICTEngine.getNyTime(time);
      const timeBadgeText = `${ny.month}/${ny.day} ${ny.hour.toString().padStart(2, '0')}:${ny.minute.toString().padStart(2, '0')}:${ny.second.toString().padStart(2, '0')} NY`;
      ctx.font = "bold 11px monospace";
      const textWidth = ctx.measureText(timeBadgeText).width;
      const badgeW = textWidth + 14;
      const badgeX = Math.max(0, Math.min(chartWidth - badgeW, x - badgeW / 2));

      ctx.fillStyle = "#1e293b";
      ctx.fillRect(badgeX, chartHeight + 4, badgeW, 22);
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 1.2;
      ctx.strokeRect(badgeX, chartHeight + 4, badgeW, 22);

      ctx.fillStyle = "#fff";
      ctx.textAlign = "center";
      ctx.fillText(timeBadgeText, badgeX + badgeW / 2, chartHeight + 19);

      // Dynamic Price Badge on Right Axis
      const priceBadgeText = price.toFixed(2);
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(chartWidth + 1, y - 10, 73, 20);
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 1.2;
      ctx.strokeRect(chartWidth + 1, y - 10, 73, 20);

      ctx.fillStyle = "#fff";
      ctx.textAlign = "left";
      ctx.fillText(priceBadgeText, chartWidth + 6, y + 4);

      ctx.restore();
    }

    renderOhlcvLegend(ctx, chartWidth, visibleCandles) {
      ctx.save();
      let candle = (this.cursorPos && this.cursorPos.candle) ? this.cursorPos.candle : null;
      if (!candle && this.secondaryCursorPos && this.secondaryCursorPos.time) {
        candle = visibleCandles.find(c => c.time === this.secondaryCursorPos.time);
      }
      if (!candle) {
        candle = visibleCandles[visibleCandles.length - 1];
      }
      if (!candle) {
        ctx.restore();
        return;
      }

      const isUp = candle.close >= candle.open;
      const changePts = (candle.close - candle.open).toFixed(2);
      const changePct = ((candle.close - candle.open) / (candle.open || 1) * 100).toFixed(2);
      const changeColor = isUp ? "#10b981" : "#ef4444";
      const sym = this.scenario ? this.scenario.symbol : "MNQ";
      const tf = this.activeTf.toUpperCase();

      // Top Legend Text Strip
      ctx.font = "bold 12px monospace";
      ctx.textAlign = "left";

      let curX = 14;
      // Symbol & TF
      ctx.fillStyle = "#38bdf8";
      ctx.fillText(`${sym} • ${tf}`, curX, 22);
      curX += ctx.measureText(`${sym} • ${tf} `).width + 8;

      // O
      ctx.fillStyle = "#94a3b8";
      ctx.fillText("O:", curX, 22);
      curX += 18;
      ctx.fillStyle = "#fff";
      ctx.fillText(candle.open.toFixed(2), curX, 22);
      curX += ctx.measureText(candle.open.toFixed(2) + " ").width + 6;

      // H
      ctx.fillStyle = "#94a3b8";
      ctx.fillText("H:", curX, 22);
      curX += 18;
      ctx.fillStyle = "#fff";
      ctx.fillText(candle.high.toFixed(2), curX, 22);
      curX += ctx.measureText(candle.high.toFixed(2) + " ").width + 6;

      // L
      ctx.fillStyle = "#94a3b8";
      ctx.fillText("L:", curX, 22);
      curX += 18;
      ctx.fillStyle = "#fff";
      ctx.fillText(candle.low.toFixed(2), curX, 22);
      curX += ctx.measureText(candle.low.toFixed(2) + " ").width + 6;

      // C
      ctx.fillStyle = "#94a3b8";
      ctx.fillText("C:", curX, 22);
      curX += 18;
      ctx.fillStyle = changeColor;
      ctx.fillText(candle.close.toFixed(2), curX, 22);
      curX += ctx.measureText(candle.close.toFixed(2) + " ").width + 6;

      // Change
      ctx.fillStyle = changeColor;
      const changeStr = `${isUp ? '+' : ''}${changePts} (${isUp ? '+' : ''}${changePct}%)`;
      ctx.fillText(changeStr, curX, 22);
      curX += ctx.measureText(changeStr + " ").width + 6;

      // Volume
      ctx.fillStyle = "#94a3b8";
      ctx.fillText(`Vol: ${candle.volume || 0}`, curX, 22);

      ctx.restore();
    }

    // ========================================================================
    // SECONDARY SMT COMPARISON CHART (FULL INTERACTION & SYNCED METRICS)
    // ========================================================================
    bindSecondaryEvents() {
      if (!this.secondaryCanvas) return;

      const getPos = (e) => {
        const rect = this.secondaryCanvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return {
          x: clientX - rect.left,
          y: clientY - rect.top
        };
      };

      const getTouchDist = (touches) => {
        if (touches.length < 2) return 0;
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        return Math.hypot(dx, dy);
      };

      const onPointerDown = (e) => {
        if (e.touches) {
          this.isTouchDevice = true;
          if (e.cancelable) e.preventDefault();
          if (e.touches.length === 2) {
            this.secondaryIsPinching = true;
            this.secondaryIsPanning = false;
            this.secondaryPinchStartDist = getTouchDist(e.touches);
            this.secondaryPinchStartBarsCount = this.visibleBarsCount;
            return;
          }
          if (e.touches.length > 2) return;
        }

        const pos = getPos(e);
        const chartWidth = this.secondaryWidth - 75;
        const secCandles = this.getSecondaryCandles();
        const endIndex = Math.max(0, secCandles.length - 1 - this.panOffsetBars);
        const startIndex = Math.max(0, endIndex - this.visibleBarsCount + 1);
        const visibleCandles = secCandles.slice(startIndex, endIndex + 1);
        const { minPrice, maxPrice } = this.calculateSecondaryPriceRange(visibleCandles);

        // 1. Right Price Axis Dragging (Vertical Price Zoom on SMT Chart)
        if (pos.x >= chartWidth) {
          this.secondaryPriceScaleDragging = true;
          this.secondaryPriceScaleDragStartY = pos.y;
          this.secondaryPriceScaleDragStartMin = minPrice;
          this.secondaryPriceScaleDragStartMax = maxPrice;
          return;
        }

        // 2. Chart Area 2D Pan (Syncs time across both charts, pans price vertically on secondary)
        this.secondaryIsPanning = true;
        this.secondaryPanStartX = pos.x;
        this.secondaryPanStartY = pos.y;
        this.secondaryPanStartOffset = this.panOffsetBars;
        this.secondaryPanStartPriceMin = minPrice;
        this.secondaryPanStartPriceMax = maxPrice;
      };

      const onPointerMove = (e) => {
        if (e.touches && e.cancelable) {
          e.preventDefault();
        }

        // 2-Finger Pinch-to-zoom on secondary chart
        if (e.touches && e.touches.length === 2) {
          if (!this.secondaryIsPinching) {
            this.secondaryIsPinching = true;
            this.secondaryPinchStartDist = getTouchDist(e.touches);
            this.secondaryPinchStartBarsCount = this.visibleBarsCount;
            return;
          }
          const curDist = getTouchDist(e.touches);
          if (this.secondaryPinchStartDist > 10 && curDist > 10) {
            const pinchRatio = this.secondaryPinchStartDist / curDist;
            const newBarsCount = Math.round(this.secondaryPinchStartBarsCount * pinchRatio);
            this.visibleBarsCount = Math.max(10, Math.min(2600, newBarsCount));
            this.requestRender();
          }
          return;
        }

        if (this.secondaryIsPinching) return;

        const pos = getPos(e);
        const chartWidth = this.secondaryWidth - 75;
        const barWidth = chartWidth / this.visibleBarsCount;

        // 1. Fast Path: Secondary Panning (Syncs time with primary chart in lockstep!)
        if (this.secondaryIsPanning) {
          const dx = pos.x - this.secondaryPanStartX;
          const dy = pos.y - this.secondaryPanStartY;
          const barDelta = Math.round(dx / barWidth);
          const allCandles = this.getSecondaryCandles();
          const totalCandles = allCandles ? allCandles.length : 0;
          const maxPan = Math.max(0, totalCandles - 1);

          // Horizontal pan applies to BOTH charts in synchronized lockstep:
          this.panOffsetBars = Math.min(maxPan, Math.max(-25, this.secondaryPanStartOffset + barDelta));

          // Vertical pan for secondary price:
          const chartHeight = this.secondaryHeight - 35;
          const priceSpan = this.secondaryPanStartPriceMax - this.secondaryPanStartPriceMin;
          if (priceSpan > 0 && chartHeight > 0) {
            const priceShift = (dy / chartHeight) * priceSpan;
            this.secondaryPriceScaleMode = 'manual';
            this.secondaryManualPriceMin = this.secondaryPanStartPriceMin + priceShift;
            this.secondaryManualPriceMax = this.secondaryPanStartPriceMax + priceShift;
          }

          this.requestRender();
          return;
        }

        // 2. Fast Path: Secondary Price Axis Dragging
        if (this.secondaryPriceScaleDragging) {
          const dy = pos.y - this.secondaryPriceScaleDragStartY;
          const range = this.secondaryPriceScaleDragStartMax - this.secondaryPriceScaleDragStartMin;
          const midPrice = (this.secondaryPriceScaleDragStartMin + this.secondaryPriceScaleDragStartMax) / 2;
          const scaleFactor = Math.max(0.05, Math.min(10.0, 1 + dy / 150));
          const newRange = range * scaleFactor;
          this.secondaryPriceScaleMode = 'manual';
          this.secondaryManualPriceMin = midPrice - newRange / 2;
          this.secondaryManualPriceMax = midPrice + newRange / 2;
          this.requestRender();
          return;
        }

        // 3. Hover / Crosshair on Secondary Canvas
        const secCandles = this.getSecondaryCandles();
        if (!secCandles || secCandles.length === 0) return;

        const endIndex = Math.max(0, secCandles.length - 1 - this.panOffsetBars);
        const startIndex = Math.max(0, endIndex - this.visibleBarsCount + 1);
        const visibleCandles = secCandles.slice(startIndex, endIndex + 1);
        const { minPrice, maxPrice } = this.calculateSecondaryPriceRange(visibleCandles);

        const slot = Math.floor(pos.x / barWidth);
        let candle = null;
        if (visibleCandles.length > 0) {
          const rightMargin = Math.max(0, -this.panOffsetBars);
          const rightSlot = this.visibleBarsCount - 1 - rightMargin;
          const candleIdx = slot - rightSlot + visibleCandles.length - 1;
          if (candleIdx >= 0 && candleIdx < visibleCandles.length) {
            candle = visibleCandles[candleIdx];
          }
        }

        const chartHeight = this.secondaryHeight - 35;
        const price = maxPrice - (pos.y / chartHeight) * (maxPrice - minPrice);

        this.secondaryCursorPos = {
          x: pos.x,
          y: pos.y,
          price: parseFloat(price.toFixed(2)),
          time: candle ? candle.time : null,
          candle: candle
        };
        if (candle) {
          this.cursorTimestamp = candle.time;
        }

        this.requestRender();
      };

      const onPointerUp = (e) => {
        if (e && e.touches && e.touches.length > 0) {
          if (e.touches.length === 1) {
            this.secondaryIsPinching = false;
          }
          return;
        }
        this.secondaryIsPinching = false;
        this.secondaryIsPanning = false;
        this.secondaryPriceScaleDragging = false;
        this.render();
      };

      const onPointerLeave = () => {
        this.secondaryCursorPos = null;
        this.secondaryIsPinching = false;
        this.secondaryIsPanning = false;
        this.secondaryPriceScaleDragging = false;
        this.render();
      };

      this.secondaryCanvas.addEventListener('mousedown', onPointerDown);
      this.secondaryCanvas.addEventListener('mousemove', onPointerMove);
      this.secondaryCanvas.addEventListener('mouseleave', onPointerLeave);
      window.addEventListener('mouseup', onPointerUp);

      this.secondaryCanvas.addEventListener('touchstart', onPointerDown, { passive: false });
      this.secondaryCanvas.addEventListener('touchmove', onPointerMove, { passive: false });
      this.secondaryCanvas.addEventListener('touchend', onPointerUp, { passive: false });
      this.secondaryCanvas.addEventListener('touchcancel', onPointerLeave);

      this.secondaryCanvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        const rect = this.secondaryCanvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const chartWidth = this.secondaryWidth - 75;

        // Normalize delta values across Mac trackpad, Magic Mouse, and PC wheel
        let normY = e.deltaY;
        let normX = e.deltaX;
        if (e.deltaMode === 1) { normY *= 18; normX *= 18; }
        else if (e.deltaMode === 2) { normY *= 300; normX *= 300; }

        // Scrolling over price axis: vertical price zoom on secondary
        if (mouseX >= chartWidth) {
          const secCandles = this.getSecondaryCandles();
          const endIndex = Math.max(0, secCandles.length - 1 - this.panOffsetBars);
          const startIndex = Math.max(0, endIndex - this.visibleBarsCount + 1);
          const visibleCandles = secCandles.slice(startIndex, endIndex + 1);
          const { minPrice, maxPrice } = this.calculateSecondaryPriceRange(visibleCandles);
          const range = maxPrice - minPrice;
          const mid = (minPrice + maxPrice) / 2;

          const zoomStep = Math.min(0.06, Math.max(0.015, Math.abs(normY) * 0.0008));
          const scale = 1 + (normY > 0 ? zoomStep : -zoomStep);
          const newRange = range * scale;
          this.secondaryPriceScaleMode = 'manual';
          this.secondaryManualPriceMin = mid - newRange / 2;
          this.secondaryManualPriceMax = mid + newRange / 2;
          this.requestRender();
          return;
        }

        // Two-finger horizontal swipe on Mac trackpad = smooth horizontal chart pan
        if (Math.abs(normX) > Math.abs(normY) && Math.abs(normX) > 2) {
          const barWidth = this.getBarWidth();
          const panBars = Math.round(normX / (barWidth * 1.6));
          if (panBars !== 0) {
            const allCandles = this.getVisibleCandles();
            const maxPan = Math.max(0, (allCandles ? allCandles.length : 0) - 1);
            this.panOffsetBars = Math.min(maxPan, Math.max(-25, this.panOffsetBars - panBars));
            this.requestRender();
            return;
          }
        }

        // Scrolling over chart: horizontal bar count zoom on BOTH charts in lockstep
        const zoomStep = Math.max(1, Math.min(Math.round(this.visibleBarsCount * 0.035), Math.round(Math.abs(normY) * 0.045)));
        if (normY < 0) this.visibleBarsCount = Math.max(12, this.visibleBarsCount - zoomStep);
        else this.visibleBarsCount = Math.min(650, this.visibleBarsCount + zoomStep);

        this.requestRender();
      }, { passive: false });

      // Double-click resets secondary zoom & price scale
      this.secondaryCanvas.addEventListener('dblclick', () => {
        this.secondaryPriceScaleMode = 'auto';
        this.panOffsetBars = 0;
        this.render();
      });
    }

    screenToPriceSecondary(x, y) {
      const secCandles = this.getSecondaryCandles();
      const endIndex = Math.max(0, secCandles.length - 1 - this.panOffsetBars);
      const startIndex = Math.max(0, endIndex - this.visibleBarsCount + 1);
      const visibleCandles = secCandles.slice(startIndex, endIndex + 1);
      const { minPrice, maxPrice, priceRange } = this.calculateSecondaryPriceRange(visibleCandles);
      const chartHeight = this.secondaryHeight - 35;
      const price = maxPrice - (y / chartHeight) * priceRange;
      const barWidth = (this.secondaryWidth - 75) / this.visibleBarsCount;
      const slot = Math.floor(x / barWidth);
      const rightMargin = Math.max(0, -this.panOffsetBars);
      const rightSlot = this.visibleBarsCount - 1 - rightMargin;
      const candleIdx = slot - rightSlot + visibleCandles.length - 1;
      const candle = (candleIdx >= 0 && candleIdx < visibleCandles.length) ? visibleCandles[candleIdx] : null;
      return { price: parseFloat(price.toFixed(2)), time: candle ? candle.time : this.getCurrentTime() };
    }

    detectSmtDivergence(priCandles, secCandles) {
      if (!priCandles || !secCandles || priCandles.length < 6 || secCandles.length < 6) return null;
      const count = Math.min(20, priCandles.length, secCandles.length);
      const priSlice = priCandles.slice(-count);
      const secSlice = secCandles.slice(-count);

      let priHighIdx = 0, priLowIdx = 0;
      let secHighIdx = 0, secLowIdx = 0;

      for (let i = 1; i < count; i++) {
        if (priSlice[i].high > priSlice[priHighIdx].high) priHighIdx = i;
        if (priSlice[i].low < priSlice[priLowIdx].low) priLowIdx = i;
        if (secSlice[i].high > secSlice[secHighIdx].high) secHighIdx = i;
        if (secSlice[i].low < secSlice[secLowIdx].low) secLowIdx = i;
      }

      // Check Bearish SMT: Primary swept high recently, but Secondary failed to make a new high
      if (priHighIdx >= count - 4 && secHighIdx < count - 5) {
        return {
          type: 'bearish',
          label: `⚡ BEARISH SMT: ${this.scenario?.symbol || 'NQ'} Swept High • ${this.secondarySymbol} Held Lower High`,
          color: '#f43f5e'
        };
      }
      // Check Bullish SMT: Primary swept low recently, but Secondary failed to make a new low (held higher low)
      if (priLowIdx >= count - 4 && secLowIdx < count - 5) {
        return {
          type: 'bullish',
          label: `⚡ BULLISH SMT: ${this.scenario?.symbol || 'NQ'} Swept Low • ${this.secondarySymbol} Held Higher Low`,
          color: '#10b981'
        };
      }
      return null;
    }

    renderSecondaryOhlcHeader(ctx, candle, w) {
      if (!candle) return;
      ctx.save();
      ctx.font = "bold 11px monospace";
      ctx.textAlign = "left";

      let curX = 14;
      const isUp = candle.close >= candle.open;
      const changePts = (candle.close - candle.open).toFixed(2);
      const changePct = ((candle.close - candle.open) / (candle.open || 1) * 100).toFixed(2);
      const changeColor = isUp ? "#10b981" : "#ef4444";

      // Asset Tag
      ctx.fillStyle = "#38bdf8";
      ctx.fillText(`${this.secondarySymbol} • ${this.secondaryTf.toUpperCase()} SMT`, curX, 22);
      curX += ctx.measureText(`${this.secondarySymbol} • ${this.secondaryTf.toUpperCase()} SMT`).width + 12;

      // O, H, L, C
      ctx.fillStyle = "#94a3b8";
      ctx.fillText("O:", curX, 22);
      curX += 16;
      ctx.fillStyle = "#fff";
      ctx.fillText(candle.open.toFixed(2), curX, 22);
      curX += ctx.measureText(candle.open.toFixed(2)).width + 8;

      ctx.fillStyle = "#94a3b8";
      ctx.fillText("H:", curX, 22);
      curX += 16;
      ctx.fillStyle = "#fff";
      ctx.fillText(candle.high.toFixed(2), curX, 22);
      curX += ctx.measureText(candle.high.toFixed(2)).width + 8;

      ctx.fillStyle = "#94a3b8";
      ctx.fillText("L:", curX, 22);
      curX += 16;
      ctx.fillStyle = "#fff";
      ctx.fillText(candle.low.toFixed(2), curX, 22);
      curX += ctx.measureText(candle.low.toFixed(2)).width + 8;

      ctx.fillStyle = "#94a3b8";
      ctx.fillText("C:", curX, 22);
      curX += 16;
      ctx.fillStyle = changeColor;
      ctx.fillText(candle.close.toFixed(2), curX, 22);
      curX += ctx.measureText(candle.close.toFixed(2)).width + 8;

      ctx.fillStyle = changeColor;
      const changeStr = `${isUp ? '+' : ''}${changePts} (${isUp ? '+' : ''}${changePct}%)`;
      ctx.fillText(changeStr, curX, 22);

      ctx.restore();
    }

    renderSecondary() {
      if (!this.secondaryCtx || !this.secondaryCanvas || this.layoutMode === 'single') return;
      const sRect = this.secondaryCanvas.getBoundingClientRect();
      this.secondaryWidth = sRect.width;
      this.secondaryHeight = sRect.height;
      this.secondaryCanvas.width = this.secondaryWidth * this.pixelRatio;
      this.secondaryCanvas.height = this.secondaryHeight * this.pixelRatio;
      
      const ctx = this.secondaryCtx;
      ctx.save();
      ctx.scale(this.pixelRatio, this.pixelRatio);

      const w = this.secondaryWidth;
      const h = this.secondaryHeight;

      ctx.fillStyle = "#0a0e17";
      ctx.fillRect(0, 0, w, h);

      const allCandles = this.getSecondaryCandles();
      if (!allCandles || allCandles.length === 0) {
        ctx.fillStyle = "#64748b";
        ctx.font = "12px sans-serif";
        ctx.fillText(`Loading synchronized ${this.secondarySymbol} data...`, 20, 60);
        ctx.restore();
        return;
      }

      const endIndex = Math.max(0, allCandles.length - 1 - this.panOffsetBars);
      const startIndex = Math.max(0, endIndex - this.visibleBarsCount + 1);
      const visibleCandles = allCandles.slice(startIndex, endIndex + 1);

      const { minPrice, maxPrice } = this.calculateSecondaryPriceRange(visibleCandles);
      const chartWidth = w - 75;
      const chartHeight = h - 35;
      const barWidth = chartWidth / this.visibleBarsCount;
      const candleWidth = Math.max(1, Math.min(Math.max(1, barWidth - 0.5), barWidth * 0.75));
      const wickWidth = barWidth >= 4 ? 1.2 : (barWidth >= 2 ? 0.8 : 0.5);

      // 1. Session Background Vertical Zones & Bounded Range Boxes (Asia, London, NY AM, Silver Bullet)
      if (this.overlays.sessions) {
        this.renderSessionZones(ctx, visibleCandles, barWidth, chartHeight, minPrice, maxPrice);
      }

      // 2. Grid Lines
      this.renderGrid(ctx, chartWidth, chartHeight, minPrice, maxPrice);

      // 3. Algorithmic Overlays (FVGs & Displacement)
      if (this.overlays.fvg) {
        this.renderAlgorithmicOverlays(ctx, visibleCandles, barWidth, minPrice, maxPrice);
      }

      // 4. Candlesticks (Plotted accurately to synchronized timeline slots)
      visibleCandles.forEach((c, i) => {
        const slot = this.getCandleSlot(i, visibleCandles.length);
        if (slot < -1 || slot > this.visibleBarsCount + 1) return;

        const xCenter = slot * barWidth + barWidth / 2;
        const isUp = c.close >= c.open;
        const color = isUp ? "#10b981" : "#ef4444";
        const wickColor = isUp ? "#34d399" : "#f87171";

        const yOpen = this.priceToYSecondary(c.open, minPrice, maxPrice);
        const yClose = this.priceToYSecondary(c.close, minPrice, maxPrice);
        const yHigh = this.priceToYSecondary(c.high, minPrice, maxPrice);
        const yLow = this.priceToYSecondary(c.low, minPrice, maxPrice);

        ctx.strokeStyle = wickColor;
        ctx.lineWidth = wickWidth;
        ctx.beginPath();
        ctx.moveTo(xCenter, yHigh);
        ctx.lineTo(xCenter, yLow);
        ctx.stroke();

        ctx.fillStyle = color;
        const bodyTop = Math.min(yOpen, yClose);
        const bodyHeight = Math.max(1.0, Math.abs(yOpen - yClose));
        ctx.fillRect(xCenter - candleWidth / 2, bodyTop, candleWidth, bodyHeight);
      });

      // 5. Right Price Scale
      ctx.fillStyle = "#0d131f";
      ctx.fillRect(chartWidth, 0, 75, h);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
      ctx.beginPath();
      ctx.moveTo(chartWidth, 0);
      ctx.lineTo(chartWidth, h);
      ctx.stroke();

      ctx.fillStyle = "#94a3b8";
      ctx.font = "11px monospace";
      ctx.textAlign = "left";
      const step = (maxPrice - minPrice) / 6;
      for (let i = 0; i <= 6; i++) {
        const p = minPrice + i * step;
        const y = this.priceToYSecondary(p, minPrice, maxPrice);
        ctx.fillText(p.toFixed(2), chartWidth + 6, y + 4);
      }

      // Current Price Tag on Secondary
      if (visibleCandles.length > 0) {
        const curSecPrice = visibleCandles[visibleCandles.length - 1].close;
        const yCur = this.priceToYSecondary(curSecPrice, minPrice, maxPrice);
        ctx.fillStyle = "#38bdf8";
        ctx.fillRect(chartWidth, yCur - 10, 75, 20);
        ctx.fillStyle = "#0a0e17";
        ctx.font = "bold 11px monospace";
        ctx.fillText(curSecPrice.toFixed(2), chartWidth + 6, yCur + 4);
      }

      // 6. Bottom Time Axis
      ctx.fillStyle = "#0d131f";
      ctx.fillRect(0, chartHeight, w, 35);
      ctx.beginPath();
      ctx.moveTo(0, chartHeight);
      ctx.lineTo(w, chartHeight);
      ctx.stroke();

      const totalVis = visibleCandles.length;
      const timeStep = totalVis > 20 ? 6 : (totalVis > 6 ? 2 : 1);
      visibleCandles.forEach((c, idx) => {
        const slot = this.getCandleSlot(idx, totalVis);
        if (slot < 0 || slot >= this.visibleBarsCount) return;
        if (idx % timeStep === 0 || idx === totalVis - 1) {
          const x = slot * barWidth + barWidth / 2;
          const ny = window.ICTEngine.getNyTime(c.time);
          ctx.fillText(`${ny.hour.toString().padStart(2, '0')}:${ny.minute.toString().padStart(2, '0')}`, x, chartHeight + 18);
        }
      });

      // 7. Synchronized Crosshair on Secondary Chart
      // A. Active crosshair if cursor is on this secondary canvas
      if (this.secondaryCursorPos) {
        const { x, y, price, time } = this.secondaryCursorPos;
        if (x >= 0 && x <= chartWidth && y >= 0 && y <= chartHeight) {
          ctx.strokeStyle = "rgba(255, 255, 255, 0.45)";
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 4]);

          // Vertical line
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, chartHeight);
          ctx.stroke();

          // Horizontal line
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(chartWidth, y);
          ctx.stroke();
          ctx.setLineDash([]);

          // Time Badge
          if (time) {
            const ny = window.ICTEngine.getNyTime(time);
            const timeBadgeText = `${ny.month}/${ny.day} ${ny.hour.toString().padStart(2, '0')}:${ny.minute.toString().padStart(2, '0')} NY`;
            ctx.font = "bold 11px monospace";
            const textWidth = ctx.measureText(timeBadgeText).width;
            const badgeW = textWidth + 14;
            const badgeX = Math.max(0, Math.min(chartWidth - badgeW, x - badgeW / 2));
            ctx.fillStyle = "#1e293b";
            ctx.fillRect(badgeX, chartHeight + 4, badgeW, 22);
            ctx.strokeStyle = "#38bdf8";
            ctx.lineWidth = 1.2;
            ctx.strokeRect(badgeX, chartHeight + 4, badgeW, 22);
            ctx.fillStyle = "#fff";
            ctx.textAlign = "center";
            ctx.fillText(timeBadgeText, badgeX + badgeW / 2, chartHeight + 19);
          }

          // Price Badge
          const priceBadgeText = price.toFixed(2);
          ctx.fillStyle = "#1e293b";
          ctx.fillRect(chartWidth + 1, y - 10, 73, 20);
          ctx.strokeStyle = "#38bdf8";
          ctx.lineWidth = 1.2;
          ctx.strokeRect(chartWidth + 1, y - 10, 73, 20);
          ctx.fillStyle = "#fff";
          ctx.textAlign = "left";
          ctx.fillText(priceBadgeText, chartWidth + 6, y + 4);
        }
      } else if (this.cursorPos && this.cursorPos.time) {
        // B. Cursor on primary chart: draw vertical synchronization line
        const matchedIdx = visibleCandles.findIndex(c => c.time === this.cursorPos.time);
        if (matchedIdx !== -1) {
          const slot = this.getCandleSlot(matchedIdx, visibleCandles.length);
          const xMatch = slot * barWidth + barWidth / 2;
          ctx.strokeStyle = "rgba(255, 255, 255, 0.45)";
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(xMatch, 0);
          ctx.lineTo(xMatch, chartHeight);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      // 8. Top OHLC Header on Secondary Canvas
      let hoveredCandle = (this.secondaryCursorPos && this.secondaryCursorPos.candle) ? this.secondaryCursorPos.candle : null;
      if (!hoveredCandle && this.cursorPos && this.cursorPos.time) {
        hoveredCandle = visibleCandles.find(c => c.time === this.cursorPos.time);
      }
      if (!hoveredCandle) {
        hoveredCandle = visibleCandles[visibleCandles.length - 1];
      }
      this.renderSecondaryOhlcHeader(ctx, hoveredCandle, w);

      // 9. Automated Real-Time SMT Divergence Detection & Badge
      const priCandles = this.getVisibleCandlesSlice();
      const smtAlert = this.detectSmtDivergence(priCandles, visibleCandles);
      if (smtAlert) {
        ctx.save();
        const badgeW = 360;
        const badgeH = 26;
        const badgeX = (chartWidth - badgeW) / 2;
        const badgeY = 36;
        ctx.fillStyle = smtAlert.type === 'bullish' ? 'rgba(16, 185, 129, 0.22)' : 'rgba(244, 63, 94, 0.22)';
        ctx.strokeStyle = smtAlert.color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 6);
        } else {
          ctx.rect(badgeX, badgeY, badgeW, badgeH);
        }
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = smtAlert.color;
        ctx.font = "bold 11px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(smtAlert.label, chartWidth / 2, badgeY + 17);
        ctx.restore();

        const statusEl = document.getElementById('primaryPaneStatus');
        if (statusEl) {
          statusEl.textContent = smtAlert.type === 'bullish' ? '⚡ Bullish SMT Divergence' : '⚡ Bearish SMT Divergence';
          statusEl.style.color = smtAlert.color;
          statusEl.style.borderColor = smtAlert.color;
        }
      } else {
        const statusEl = document.getElementById('primaryPaneStatus');
        if (statusEl && statusEl.textContent !== 'Synchronized Replay') {
          statusEl.textContent = 'Synchronized Replay';
          statusEl.style.color = '#38bdf8';
          statusEl.style.borderColor = 'rgba(56, 189, 248, 0.3)';
        }
      }

      // 10. Watermark
      ctx.save();
      ctx.fillStyle = "rgba(255, 255, 255, 0.03)";
      ctx.font = "bold 38px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`${this.secondarySymbol} • ${this.secondaryTf.toUpperCase()} SMT`, chartWidth / 2, chartHeight / 2);
      ctx.restore();

      ctx.restore();
    }

    renderWatermark(ctx, chartWidth, chartHeight) {
      ctx.save();
      ctx.fillStyle = "rgba(255, 255, 255, 0.03)";
      ctx.font = "bold 44px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(this.scenario.symbol + " • " + this.activeTf.toUpperCase(), chartWidth / 2, chartHeight / 2);
      ctx.restore();
    }
  }

  window.ReplayEngine = ReplayEngine;

})(window);


