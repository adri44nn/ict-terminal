/**
 * ICT Institutional Apex Terminal Client
 * Real-time Charting, Live Algorithmic Radar, Academy & Paper Trader
 * 100% Pure Inner Circle Trader (ICT) Framework
 */

const STATE = {
  activeTab: 'scannerTab',
  activeSymbol: 'MNQ',
  activeTimeframe: '5m',
  chartSource: 'tv',
  overlays: {
    fvg: true,
    mss: true,
    sweeps: true,
    ob: true,
    ote: true
  },
  audioEnabled: true,
  scanData: {},
  iccScanData: {},
  chartData: null,
  paperAccount: null,
  activeQuizIndex: 0,
  currentModuleId: 'ict-foundations'
};

class SoundAlerts {
  constructor() {
    this.ctx = null;
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.ctx = new AudioContext();
      }
    }
  }

  playConfluenceChime() {
    if (!STATE.audioEnabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }

      const now = this.ctx.currentTime;
      [523.25, 659.25, 783.99].forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);

        gain.gain.setValueAtTime(0, now + idx * 0.08);
        gain.gain.linearRampToValueAtTime(0.15, now + idx * 0.08 + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.6);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.6);
      });
    } catch (e) {}
  }
}

const audio = new SoundAlerts();

// ============================================================================
// DEVICE DETECTION & RESPONSIVE TOUCH ENGINE (Mac, iPad, iPhone)
// ============================================================================
function detectDeviceClass() {
  const ua = navigator.userAgent || '';
  const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  const w = window.innerWidth;
  const h = window.innerHeight;
  const maxDim = Math.max(w, h);
  const minDim = Math.min(w, h);

  // iPad Detection: iPadOS 13+ reports "Macintosh" with maxTouchPoints > 1, or older "iPad" UA
  const isIPad = /iPad/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) || (isTouch && minDim >= 600 && maxDim <= 1366);
  // iPhone / Phone Detection: "iPhone" UA or touch device with narrow width
  const isIPhone = /iPhone|iPod/.test(ua) || (isTouch && !isIPad && minDim < 600);

  document.body.classList.remove('device-mac', 'device-ipad', 'device-iphone');
  if (isIPad) {
    document.body.classList.add('device-ipad');
    window.__DEVICE_CLASS__ = 'ipad';
  } else if (isIPhone) {
    document.body.classList.add('device-iphone');
    window.__DEVICE_CLASS__ = 'iphone';
  } else {
    document.body.classList.add('device-mac');
    window.__DEVICE_CLASS__ = 'mac';
  }
}
detectDeviceClass();
window.addEventListener('resize', detectDeviceClass);
window.addEventListener('orientationchange', () => {
  setTimeout(detectDeviceClass, 100);
});

// ============================================================================
// 1. INITIALIZATION & ROUTING
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
  setupChartControls();
  setupAudioToggle();
  initReplayBacktester();
  initMarkupTestTab();
  initPbTradesAcademy();
  renderAcademyNav();
  renderAcademyContent(STATE.currentModuleId);
  fetchStatus();
  fetchScan();
  fetchChart(STATE.activeSymbol, STATE.activeTimeframe);
  fetchPaperAccount();

  // Local 1-second clock ticker (Zero API calls)
  setInterval(() => {
    updateLocalNyClock();
  }, 1000);

  // Background polling every 10s, only when browser tab is active
  setInterval(() => {
    if (document.hidden) return; // Pause polling when app is backgrounded
    fetchStatus();
    fetchScan();
    if (STATE.activeTab === 'chartTab') {
      fetchChart(STATE.activeSymbol, STATE.activeTimeframe);
    }
    if (STATE.activeTab === 'paperTab') {
      fetchPaperAccount();
    }
  }, 10000);

  // iOS App Resume & Wakeup Handlers
  window.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      fetchStatus();
      fetchScan();
      if (STATE.activeTab === 'chartTab') {
        fetchChart(STATE.activeSymbol, STATE.activeTimeframe);
      }
    }
  });

  window.addEventListener('pageshow', () => {
    fetchStatus();
    fetchScan();
  });

  const resetBtn = document.getElementById('resetPaperAccountBtn');
  if (resetBtn) {
    resetBtn.addEventListener('click', resetPaperAccount);
  }
  setupJournalListeners();

  const chartTradeBtn = document.getElementById('chartQuickTradeBtn');
  if (chartTradeBtn) {
    chartTradeBtn.addEventListener('click', () => {
      if (STATE.chartData && STATE.chartData.analysis) {
        const a = STATE.chartData.analysis;
        if (a.is_active_trade && a.trade_plan.entry) {
          executePaperTrade(STATE.activeSymbol, a.direction, a.trade_plan.entry, a.trade_plan.stop_loss, a.trade_plan.take_profit, a.setup_type);
        } else {
          showToast("⚠️ No valid active trade setup currently on this chart.");
        }
      }
    });
  }
});

function setupNavigation() {
  const tabBtns = document.querySelectorAll('.nav-tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.getAttribute('data-tab');
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      document.querySelectorAll('.tab-view').forEach(view => view.classList.remove('active'));
      const targetView = document.getElementById(tabId);
      if (targetView) targetView.classList.add('active');
      STATE.activeTab = tabId;

      if (tabId !== 'replayTab' && document.body.classList.contains('replay-fullscreen-mode')) {
        document.body.classList.remove('replay-fullscreen-mode');
        const fsToggleBtn = document.getElementById('replayFullscreenToggleBtn');
        if (fsToggleBtn) {
          fsToggleBtn.textContent = '⛶ Fullscreen';
          fsToggleBtn.classList.remove('active');
        }
        const toolFsBtn = document.getElementById('toolFullscreenBtn');
        if (toolFsBtn) toolFsBtn.classList.remove('active');
      }

      if (tabId === 'replayTab' && window.replayEngine) {
        setTimeout(() => {
          window.replayEngine.resize();
          window.replayEngine.render();
        }, 50);
      }
      if (tabId === 'markupTestTab' && window.markupTestEngine) {
        setTimeout(() => {
          window.markupTestEngine.resize();
          window.markupTestEngine.render();
        }, 50);
      }
      if (tabId === 'chartTab') {
        if (STATE.chartSource === 'tv') {
          setTimeout(() => renderTradingViewChart(STATE.activeSymbol, STATE.activeTimeframe), 50);
        } else {
          setTimeout(renderCanvasChart, 50);
        }
      }
      if (tabId === 'iccTab') {
        fetchIccScan();
      }
      if (tabId === 'paperTab') {
        updateBacktestJournalUI();
      }
    });
  });

  document.querySelectorAll('.ticker-item').forEach(item => {
    item.addEventListener('click', () => {
      const sym = item.getAttribute('data-sym');
      selectSymbol(sym);
      const chartTabBtn = document.querySelector('[data-tab="chartTab"]');
      if (chartTabBtn) chartTabBtn.click();
    });
  });
}

function setupAudioToggle() {
  const btn = document.getElementById('audioToggleBtn');
  if (btn) {
    btn.addEventListener('click', () => {
      STATE.audioEnabled = !STATE.audioEnabled;
      btn.classList.toggle('active', STATE.audioEnabled);
      btn.textContent = STATE.audioEnabled ? '🔔 Sound ON' : '🔕 Sound OFF';
      if (STATE.audioEnabled) {
        audio.playConfluenceChime();
      }
    });
  }
}

function showToast(msg) {
  const box = document.getElementById('toastBox');
  if (box) {
    box.textContent = msg;
    box.style.display = 'block';
    setTimeout(() => {
      box.style.display = 'none';
    }, 4000);
  }
}

function updateLocalNyClock() {
  const clockEl = document.getElementById('nyTimeDisplay');
  if (clockEl) {
    try {
      const nyStr = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).format(new Date());
      clockEl.textContent = `${nyStr} NY`;
    } catch (e) {}
  }
}

// ============================================================================
// 2. LIVE STATUS & KILLZONE BAR
// ============================================================================
async function fetchStatus() {
  if (window.ICTEngine) {
    const kz = window.ICTEngine.getKillzoneStatus();
    updateKillzoneUI(kz);
    return;
  }
  try {
    const res = await fetch('/api/status');
    const data = await res.json();
    if (data && data.killzone) {
      updateKillzoneUI(data.killzone);
    }
  } catch (e) {}
}

function updateKillzoneUI(kz) {
  const clockEl = document.getElementById('nyTimeDisplay');
  const badgeEl = document.getElementById('kzBadge');
  const titleEl = document.getElementById('kzTitle');

  if (clockEl) clockEl.textContent = kz.ny_time_str;
  if (titleEl) {
    if (kz.is_silver_bullet) {
      titleEl.textContent = `⚡ ${kz.silver_bullet_name}`;
      badgeEl.className = 'killzone-badge silver-bullet';
    } else if (kz.is_high_probability_time) {
      titleEl.textContent = `🟢 ${kz.active_killzone}`;
      badgeEl.className = 'killzone-badge active-high-prob';
    } else if (kz.is_lunch_trap) {
      titleEl.textContent = `⚠️ ${kz.active_killzone}`;
      badgeEl.className = 'killzone-badge lunch-trap';
    } else {
      titleEl.textContent = `🌙 ${kz.active_killzone} (Next: ${kz.next_event} in ${kz.minutes_to_next_event}m)`;
      badgeEl.className = 'killzone-badge';
    }
  }
}

// ============================================================================
// 3. LIVE NAVIGATION & GLOBAL SIGNAL STRIP
// ============================================================================
window.switchTab = function(tabId) {
  const tabBtns = document.querySelectorAll('.nav-tab-btn');
  tabBtns.forEach(b => {
    b.classList.toggle('active', b.getAttribute('data-tab') === tabId);
  });
  document.querySelectorAll('.tab-view').forEach(view => {
    view.classList.toggle('active', view.id === tabId);
  });
  STATE.activeTab = tabId;
  if (tabId === 'chartTab') {
    setTimeout(renderCanvasChart, 50);
  }
  if (tabId === 'iccTab') {
    fetchIccScan();
  }
};

window.jumpToSymbolCard = function(tabName, cardId) {
  window.switchTab(tabName);
  setTimeout(() => {
    window.scrollToCard(cardId);
  }, 120);
};

window.scrollToCard = function(cardId) {
  const el = document.getElementById(cardId);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.remove('card-pulse-highlight');
    void el.offsetWidth; // Trigger DOM reflow to restart animation
    el.classList.add('card-pulse-highlight');
  }
};

function updateGlobalSignalRibbon(ictResults, iccResults) {
  const ribbon = document.getElementById('tickerRibbon');
  if (!ribbon) return;

  const defaultSymbols = ['MNQ', 'MES', 'M2K', 'MGC'];
  const symbols = [...defaultSymbols];

  // Evaluate highest priority status for each symbol
  const symbolSummaries = symbols.map(sym => {
    const ict = ictResults[sym] || {};
    const icc = iccResults[sym] || {};
    const currPrice = ict.current_price || icc.current_price || (window.MarketData && window.MarketData.BASE_SPECS[sym] ? window.MarketData.BASE_SPECS[sym].basePrice : 0);
    const chgPct = ict.price_change_pct !== undefined ? ict.price_change_pct : (icc.price_change_pct || 0);

    let priority = 1; // 1 = standby, 5 = pullback/forming, 10 = active trade
    let bestModel = 'ict';
    let targetTab = 'scannerTab';
    let targetCardId = `ict-card-${sym}`;
    let statusClass = 'standby';
    let statusLabel = '👀 NO TRADE';
    let highlightClass = '';

    // Check ICT Active Trade
    if (ict.is_active_trade && ict.trade_plan && ict.trade_plan.entry) {
      const inZone = Math.abs(currPrice - ict.trade_plan.entry) <= (sym === 'MNQ' ? 3.0 : 1.0);
      priority = 10;
      bestModel = 'ict';
      targetTab = 'scannerTab';
      targetCardId = `ict-card-${sym}`;
      statusClass = inZone ? 'entry' : 'armed';
      statusLabel = inZone ? '🚀 IN ZONE' : `⚡ ARMED (${ict.trade_plan.rr_ratio || '1:2+'})`;
      highlightClass = 'has-trade';
    } 
    // Check ICC Active Continuation Trade
    else if (icc.is_active_trade && icc.trade_plan && icc.trade_plan.entry) {
      priority = 10;
      bestModel = 'icc';
      targetTab = 'iccTab';
      targetCardId = `icc-card-${sym}`;
      statusClass = 'armed';
      statusLabel = `🚀 ARMED (${icc.trade_plan.rr_ratio || '1:2.5'})`;
      highlightClass = 'has-trade-icc';
    } 
    // Check ICC Phase 2 Pullback / Golden Zone Retrace
    else if (icc.phase === 'PHASE_2_CORRECTION') {
      priority = 5;
      bestModel = 'icc';
      targetTab = 'iccTab';
      targetCardId = `icc-card-${sym}`;
      statusClass = 'pullback';
      const retrace = icc.correction && icc.correction.retrace_pct !== undefined ? `${icc.correction.retrace_pct}%` : '50% Eq';
      statusLabel = `⏳ PULLBACK (${retrace})`;
    }
    // Check ICT High Confluence Forming
    else if (ict.confluence_score >= 45) {
      priority = 4;
      bestModel = 'ict';
      targetTab = 'scannerTab';
      targetCardId = `ict-card-${sym}`;
      statusClass = 'pullback';
      statusLabel = `⏳ FORMING (${ict.confluence_score}%)`;
    }
    // Check ICC Phase 1 Impulse
    else if (icc.phase === 'PHASE_1_INDICATION') {
      priority = 3;
      bestModel = 'icc';
      targetTab = 'iccTab';
      targetCardId = `icc-card-${sym}`;
      statusClass = 'pullback';
      statusLabel = `⚡ IMPULSE`;
    }

    return {
      sym,
      currPrice,
      chgPct,
      priority,
      bestModel,
      targetTab,
      targetCardId,
      statusClass,
      statusLabel,
      highlightClass
    };
  });

  // POP UP SYMBOLS WITH TRADES TO THE FRONT OF THE LINE
  symbolSummaries.sort((a, b) => {
    if (a.priority !== b.priority) return b.priority - a.priority; // Higher priority to the front
    return defaultSymbols.indexOf(a.sym) - defaultSymbols.indexOf(b.sym);
  });

  let html = '';
  symbolSummaries.forEach(s => {
    const isUp = s.chgPct >= 0;
    html += `
      <div class="ticker-item ${s.highlightClass}" onclick="jumpToSymbolCard('${s.targetTab}', '${s.targetCardId}')" title="Click to jump directly to ${s.sym} card in ${s.bestModel.toUpperCase()} Scanner">
        <div class="ticker-item-left">
          <div class="ticker-symbol-row">
            <span class="ticker-symbol">${s.sym}</span>
            <span class="ticker-model-badge ${s.bestModel}">${s.bestModel.toUpperCase()}</span>
          </div>
          <div class="ticker-status-badge ${s.statusClass}">
            ${s.statusLabel}
          </div>
        </div>
        <div class="ticker-price-box">
          <div class="ticker-price" id="ribbon-price-${s.sym}">${s.currPrice ? s.currPrice.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '--'}</div>
          <div class="ticker-change ${isUp ? 'up' : 'down'}" id="ribbon-chg-${s.sym}">${isUp ? '+' : ''}${s.chgPct}%</div>
        </div>
      </div>
    `;
  });

  ribbon.innerHTML = html;
}

function updateRibbonPrices(scanResults) {
  // Legacy alias forwarded to global signal ribbon
  if (STATE.scanData && STATE.iccScanData) {
    updateGlobalSignalRibbon(STATE.scanData.scan_results || scanResults, STATE.iccScanData.scan_results || {});
  }
}

// ============================================================================
// 3. LIVE SCANNER & RADAR INGESTOR
// ============================================================================
async function fetchScan() {
  // 1. Try Live Backend API First (100% Direct Yahoo Finance Market Feed)
  try {
    const ctrl = new AbortController();
    const tId = setTimeout(() => ctrl.abort(), 2500);
    const res = await fetch('/api/scan', { signal: ctrl.signal });
    clearTimeout(tId);
    if (res.ok) {
      STATE.scanData = { scan_results: data.scan_results || {}, killzone: data.killzone, alerts: data.alerts || [] };
      STATE.iccScanData = { scan_results: data.icc_scan_results || {} };
      renderScannerGrid(data.scan_results || {});
      renderIccScannerGrid(data.icc_scan_results || {});
      renderAlertsTable(data.alerts || []);
      updateGlobalSignalRibbon(data.scan_results || {}, data.icc_scan_results || {});
      return;
    }
  } catch (e) {
    // API server not present (running on static GitHub Pages) - seamless client fallback
  }

  // 2. Client-Side Autonomous Engine Fallback
  try {
    if (window.MarketData) {
      const data = await window.MarketData.fetchAllSymbolsData();
      STATE.scanData = { scan_results: data.ictScanResults, killzone: data.killzone };
      STATE.iccScanData = { scan_results: data.iccScanResults };
      renderScannerGrid(data.ictScanResults || {});
      renderIccScannerGrid(data.iccScanResults || {});
      updateGlobalSignalRibbon(data.ictScanResults || {}, data.iccScanResults || {});

      // Populate Live Algorithmic Alerts Stream
      const clientAlerts = [];
      const nyTime = window.ICTEngine ? window.ICTEngine.getNyTime().timeStr.split(' ')[0] : new Date().toLocaleTimeString();
      for (const [sym, info] of Object.entries(data.ictScanResults || {})) {
        if (info.is_active_trade || info.confluence_score >= 35) {
          const plan = info.trade_plan || {};
          clientAlerts.push({
            time_str: nyTime,
            symbol: sym,
            timeframe: info.timeframe || '5m',
            setup_grade: info.setup_grade || 'B',
            setup_type: info.setup_type || 'ICT Order Flow',
            direction: info.direction || 'BULLISH',
            confluence: info.confluence_score || 50,
            entry: plan.entry !== undefined && plan.entry !== null ? plan.entry : info.current_price,
            tp: plan.take_profit !== undefined && plan.take_profit !== null ? plan.take_profit : (plan.target_bsl || plan.target_ssl || '--')
          });
        }
      }
      renderAlertsTable(clientAlerts);
    }
  } catch (e) {
    console.warn("Client-side scan error:", e);
  }
}

function renderQuickStatusBar(containerId, scanResults, modelType) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const defaultSymbols = ['MNQ', 'MES', 'M2K', 'MGC'];
  const symbols = Object.keys(scanResults).length > 0 ? Object.keys(scanResults) : defaultSymbols;

  // Front of the line: active trades first
  const sorted = [...symbols].sort((a, b) => {
    const activeA = scanResults[a] && scanResults[a].is_active_trade ? 1 : 0;
    const activeB = scanResults[b] && scanResults[b].is_active_trade ? 1 : 0;
    if (activeA !== activeB) return activeB - activeA;
    return defaultSymbols.indexOf(a) - defaultSymbols.indexOf(b);
  });

  let html = '';
  sorted.forEach(sym => {
    const d = scanResults[sym] || {};
    const isActive = d.is_active_trade === true;
    const plan = d.trade_plan || {};
    const currPrice = d.current_price || 0;
    
    let statusClass = 'status-standby';
    let statusLabel = '👀 NO TRADE';

    if (modelType === 'ict') {
      if (isActive && plan.entry) {
        const inZone = Math.abs(currPrice - plan.entry) <= (sym === 'MNQ' ? 3.0 : 1.0);
        if (inZone) {
          statusClass = 'status-entry';
          statusLabel = '🚀 IN ZONE (ENTRY)';
        } else {
          statusClass = 'status-armed';
          statusLabel = `⚡ ARMED (${plan.rr_ratio || '1:2+'})`;
        }
      } else if (d.confluence_score >= 45) {
        statusClass = 'status-pullback';
        statusLabel = `⏳ FORMING (${d.confluence_score}%)`;
      }
    } else {
      // ICC Model
      if (isActive && plan.entry) {
        statusClass = 'status-armed';
        statusLabel = `🚀 ARMED (${plan.rr_ratio || '1:2.5'})`;
      } else if (d.phase === 'PHASE_2_CORRECTION') {
        statusClass = 'status-pullback';
        const retrace = d.correction && d.correction.retrace_pct !== undefined ? `${d.correction.retrace_pct}%` : '50% Eq';
        statusLabel = `⏳ PULLBACK (${retrace})`;
      } else if (d.phase === 'PHASE_1_INDICATION') {
        statusClass = 'status-pullback';
        statusLabel = `⚡ IMPULSE (+${d.indication ? d.indication.range : ''} pts)`;
      }
    }

    html += `
      <div class="quick-status-pill ${statusClass}" onclick="scrollToCard('${modelType}-card-${sym}')" title="Click to jump to ${sym} ${modelType.toUpperCase()} card">
        <span class="pill-sym">${sym}</span>
        <span class="pill-model-tag ${modelType}">${modelType.toUpperCase()}</span>
        <span class="pill-status-tag">${statusLabel}</span>
        <span style="font-family: var(--font-mono); font-size: 11px; color: var(--text-muted);">${currPrice ? currPrice.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 }) : '--'}</span>
      </div>
    `;
  });

}

function renderScannerGrid(scanResults) {
  renderQuickStatusBar('ictQuickStatusBar', scanResults, 'ict');

  const grid = document.getElementById('scannerGrid');
  if (!grid) return;

  const defaultSymbols = ['MNQ', 'MES', 'M2K', 'MGC'];
  const availableSymbols = Object.keys(scanResults).length > 0 ? Object.keys(scanResults) : defaultSymbols;
  const gradeWeights = { 'A+': 4, 'A': 3, 'B': 2, 'F': 1 };

  // Sort symbols: Active trades come FIRST to the front of the line
  const sortedSymbols = [...availableSymbols].sort((a, b) => {
    const dataA = scanResults[a] || {};
    const dataB = scanResults[b] || {};

    const activeA = dataA.is_active_trade ? 1 : 0;
    const activeB = dataB.is_active_trade ? 1 : 0;
    if (activeA !== activeB) {
      return activeB - activeA; // Move active trades to the very front
    }

    const gradeA = gradeWeights[dataA.setup_grade] || 0;
    const gradeB = gradeWeights[dataB.setup_grade] || 0;
    if (gradeA !== gradeB) {
      return gradeB - gradeA; // Higher grade first (A+ > A > B > F)
    }

    const confA = dataA.confluence_score || 0;
    const confB = dataB.confluence_score || 0;
    if (confA !== confB) {
      return confB - confA; // Higher confluence first
    }

    return defaultSymbols.indexOf(a) - defaultSymbols.indexOf(b);
  });

  let html = '';

  sortedSymbols.forEach(sym => {
    const d = scanResults[sym];
    if (!d) return;

    const isActiveTrade = d.is_active_trade === true;
    const confScore = d.confluence_score || 0;
    
    let scoreClass = 'low';
    if (confScore >= 70) scoreClass = 'high';
    else if (confScore >= 45) scoreClass = 'med';

    const isBull = d.direction === 'BULLISH';
    const isBear = d.direction === 'BEARISH';
    let biasBadge = 'style="background: #334155; color: #94a3b8; padding: 2px 6px; border-radius: 4px; font-size: 11px;"';
    if (isActiveTrade) {
      biasBadge = isBull ? 'class="badge-bullish"' : 'class="badge-bearish"';
    }

    const grade = d.setup_grade || 'F';
    let gradeBadgeHtml = '';
    if (grade === 'A+') {
      gradeBadgeHtml = '<span class="grade-badge a-plus">🏆 GRADE A+</span>';
    } else if (grade === 'A') {
      gradeBadgeHtml = '<span class="grade-badge a">⭐ GRADE A</span>';
    } else if (grade === 'B') {
      gradeBadgeHtml = '<span class="grade-badge b">🔷 GRADE B</span>';
    } else {
      gradeBadgeHtml = '<span class="grade-badge f">❌ GRADE F</span>';
    }

    const plan = d.trade_plan || {};
    const currPrice = d.current_price || 0;
    const entryPrice = plan.entry;

    let stageText = '';
    let stageClass = '';
    let orderType = '';
    let actionBtnHtml = '';

    if (isActiveTrade && entryPrice) {
      if (isBull) {
        if (Math.abs(currPrice - entryPrice) <= (sym === 'MNQ' ? 3.0 : 1.0)) {
          stageText = '⚡ In FVG Entry Zone (Ready to Fill)';
          stageClass = 'in-zone';
          orderType = 'LIMIT / IN ZONE';
        } else {
          stageText = `🟢 REAL SETUP ARMED: Place Buy Limit @ ${entryPrice}`;
          stageClass = 'waiting-pullback';
          orderType = `BUY LIMIT @ ${entryPrice}`;
        }
        actionBtnHtml = `
          <button class="btn btn-primary" onclick="quickPaperExecute('${sym}', 'BULLISH', ${plan.entry}, ${plan.stop_loss}, ${plan.take_profit}, '${d.setup_type}')">
            🚀 Place Buy Limit
          </button>
        `;
      } else {
        if (Math.abs(currPrice - entryPrice) <= (sym === 'MNQ' ? 3.0 : 1.0)) {
          stageText = '⚡ In FVG Entry Zone (Ready to Fill)';
          stageClass = 'in-zone';
          orderType = 'LIMIT / IN ZONE';
        } else {
          stageText = `🔴 REAL SETUP ARMED: Place Sell Limit @ ${entryPrice}`;
          stageClass = 'waiting-pullback';
          orderType = `SELL LIMIT @ ${entryPrice}`;
        }
        actionBtnHtml = `
          <button class="btn btn-primary" onclick="quickPaperExecute('${sym}', 'BEARISH', ${plan.entry}, ${plan.stop_loss}, ${plan.take_profit}, '${d.setup_type}')">
            🚀 Place Sell Limit
          </button>
        `;
      }
    } else {
      stageText = '⏸️ NO ACTIVE TRADE — Observing Order Flow';
      stageClass = '';
      orderType = 'STANDBY (DO NOT ENTER)';
      actionBtnHtml = `
        <button class="btn btn-secondary" style="opacity: 0.6;" disabled title="Waiting for Liquidity Sweep + MSS + FVG + 1:2+ RR">
          👀 Standby (No Setup)
        </button>
      `;
    }

    let checklistHtml = '';
    (d.checklist || []).forEach(item => {
      checklistHtml += `
        <div class="checklist-item">
          <span>${item.item}</span>
          <span class="check-icon ${item.passed ? 'passed' : 'failed'}">
            ${item.passed ? '✓' : '✗'}
          </span>
        </div>
      `;
    });

    let cardStyle = '';
    if (isActiveTrade) {
      if (grade === 'A+' || grade === 'A') {
        cardStyle = 'border-color: #10b981; box-shadow: 0 0 20px rgba(16, 185, 129, 0.3);';
      } else {
        cardStyle = 'border-color: #3b82f6; box-shadow: 0 0 15px rgba(59, 130, 246, 0.25);';
      }
    }

    const ptMultiplier = { 'MNQ': 2.0, 'MES': 5.0, 'M2K': 5.0, 'MGC': 10.0 }[sym] || 2.0;
    let riskDollarsText = '';
    let rewardDollarsText = '';
    let riskMoneyStripHtml = '';

    if (plan.entry && plan.stop_loss) {
      const riskPts = Math.abs(plan.entry - plan.stop_loss);
      const riskUsd = riskPts * ptMultiplier;
      const targetVal = plan.take_profit || (isBull ? plan.entry + (riskPts * 2.5) : plan.entry - (riskPts * 2.5));
      const rewardPts = Math.abs(targetVal - plan.entry);
      const rewardUsd = rewardPts * ptMultiplier;

      riskDollarsText = `<span style="font-size: 10px; color: #f87171; display: block; font-weight: 700;">(-$${riskUsd.toFixed(2)})</span>`;
      rewardDollarsText = `<span style="font-size: 10px; color: #34d399; display: block; font-weight: 700;">(+$${rewardUsd.toFixed(2)})</span>`;

      riskMoneyStripHtml = `
        <div class="risk-money-strip">
          <div class="risk-pill-badge" title="Maximum Risk on 1 Micro Contract to Structural SL">
            <span class="label">🛡️ <strong>Risk (1ct):</strong></span>
            <strong class="val-loss">-$${riskUsd.toFixed(2)}</strong>
            <span class="sub">(${riskPts.toFixed(1)} pts @ $${ptMultiplier}/pt)</span>
          </div>
          <div class="reward-pill-badge" title="Target Reward on 1 Micro Contract">
            <span class="label">🎯 <strong>Reward (1ct):</strong></span>
            <strong class="val-gain">+$${rewardUsd.toFixed(2)}</strong>
            <span class="sub">(${rewardPts.toFixed(1)} pts)</span>
          </div>
        </div>
        <div class="contract-matrix-box">
          <div class="matrix-title">
            <span>📊 Contract Sizing Risk vs Reward</span>
            <span style="color: var(--text-muted); font-size: 9px;">${sym} ($${ptMultiplier}/pt)</span>
          </div>
          <div class="matrix-grid">
            <div class="matrix-tier">
              <div class="tier-head">1 Con</div>
              <div class="tier-loss">-$${(riskUsd * 1).toFixed(0)}</div>
              <div class="tier-gain">+$${(rewardUsd * 1).toFixed(0)}</div>
            </div>
            <div class="matrix-tier active-tier">
              <div class="tier-head">5 Cons</div>
              <div class="tier-loss">-$${(riskUsd * 5).toFixed(0)}</div>
              <div class="tier-gain">+$${(rewardUsd * 5).toFixed(0)}</div>
            </div>
            <div class="matrix-tier">
              <div class="tier-head">10 Cons</div>
              <div class="tier-loss">-$${(riskUsd * 10).toFixed(0)}</div>
              <div class="tier-gain">+$${(rewardUsd * 10).toFixed(0)}</div>
            </div>
          </div>
        </div>
      `;
    } else {
      riskMoneyStripHtml = `
        <div class="risk-money-strip standby">
          <span style="color: var(--text-muted); font-size: 11px;">🛡️ Point Multiplier: $${ptMultiplier.toFixed(2)}/pt | 1 Con / 5 Cons / 10 Cons calculated on trade trigger</span>
        </div>
      `;
    }

    html += `
      <div class="scanner-card" id="ict-card-${sym}" style="${cardStyle}">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <span class="model-header-tag ict">⚡ ICT 2022 FVG MODEL</span>
          <span style="font-size: 11px; font-weight: 700; color: ${isActiveTrade ? '#34d399' : '#94a3b8'};">
            ${isActiveTrade ? '🚀 ACTIVE TRADE SIGNAL' : '👀 OBSERVING'}
          </span>
        </div>

        <div class="scanner-card-header">
          <div class="card-title-group">
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
              <h2>${sym}</h2>
              ${gradeBadgeHtml}
              <span ${biasBadge}>${isActiveTrade ? d.direction : 'NEUTRAL / OBSERVING'}</span>
            </div>
            <span>${d.timeframe || '5m'} Order Flow | Current: <strong>${(currPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong></span>
          </div>
          <div class="confluence-badge-box">
            <div class="confluence-meter ${scoreClass}">
              ${confScore}% Confluence
            </div>
          </div>
        </div>

        <div class="setup-title-pill">
          🎯 ${d.setup_type || 'Observing Structure'}
        </div>
        ${d.grade_desc ? `<div class="grade-desc-pill">ℹ️ ${d.grade_desc}</div>` : ''}

        <div class="stage-status-banner ${stageClass}">
          <span>${stageText}</span>
          <span class="order-type-tag">${orderType}</span>
        </div>

        <div class="checklist-container">
          ${checklistHtml}
        </div>

        <div class="trade-plan-box">
          <div class="plan-cell">
            <div class="plan-label">Limit Entry</div>
            <div class="plan-val entry">${plan.entry !== null && plan.entry !== undefined ? plan.entry : '--'}</div>
          </div>
          <div class="plan-cell">
            <div class="plan-label">Stop Loss</div>
            <div class="plan-val sl">${plan.stop_loss !== null && plan.stop_loss !== undefined ? plan.stop_loss : '--'} ${riskDollarsText}</div>
          </div>
          <div class="plan-cell">
            <div class="plan-label">Target (${plan.rr_ratio && plan.rr_ratio !== '--' ? plan.rr_ratio + ' RR' : 'BSL/SSL'})</div>
            <div class="plan-val tp">${plan.take_profit !== null && plan.take_profit !== undefined ? plan.take_profit : '--'} ${rewardDollarsText}</div>
          </div>
        </div>

        ${riskMoneyStripHtml}

        <div class="card-actions">
          <button class="btn btn-secondary" onclick="openSymbolInChart('${sym}')">
            📊 View Chart
          </button>
          ${actionBtnHtml}
        </div>
      </div>
    `;
  });

  grid.innerHTML = html;
}

function renderAlertsTable(alerts) {
  const tbody = document.getElementById('alertsTableBody');
  if (!tbody) return;

  if (!alerts || alerts.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" style="text-align: center; color: var(--text-muted); padding: 20px;">
          Scanning order flow. Alerts trigger only when 100% of real trade prerequisites are satisfied...
        </td>
      </tr>
    `;
    return;
  }

  let rows = '';
  alerts.forEach(a => {
    const isBull = a.direction === 'BULLISH';
    const biasClass = isBull ? 'badge-bullish' : 'badge-bearish';

    let gradeTag = '';
    const g = a.setup_grade || 'F';
    if (g === 'A+') gradeTag = '<span class="grade-badge a-plus" style="font-size: 9px; padding: 2px 6px;">🏆 A+</span>';
    else if (g === 'A') gradeTag = '<span class="grade-badge a" style="font-size: 9px; padding: 2px 6px;">⭐ A</span>';
    else if (g === 'B') gradeTag = '<span class="grade-badge b" style="font-size: 9px; padding: 2px 6px;">🔷 B</span>';
    else gradeTag = '<span class="grade-badge f" style="font-size: 9px; padding: 2px 6px;">❌ F</span>';

    rows += `
      <tr>
        <td><strong>${a.time_str}</strong></td>
        <td><strong>${a.symbol}</strong></td>
        <td><span style="font-family: var(--font-mono);">${a.timeframe}</span></td>
        <td>${gradeTag}</td>
        <td style="color: #93c5fd;">${a.setup_type}</td>
        <td><span class="${biasClass}">${a.direction}</span></td>
        <td><strong style="color: #34d399;">${a.confluence}%</strong></td>
        <td style="font-family: var(--font-mono); font-size: 12px;">${a.entry} ➔ ${a.tp}</td>
        <td>
          <button class="btn btn-secondary" style="padding: 4px 8px; font-size: 11px;" onclick="openSymbolInChart('${a.symbol}')">
            Chart
          </button>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = rows;
}

// ============================================================================
// 3B. LIVE ICC (TRADES BY SCI) SCANNER
// ============================================================================
async function fetchIccScan() {
  if (STATE.iccScanData && STATE.iccScanData.scan_results && Object.keys(STATE.iccScanData.scan_results).length > 0) {
    renderIccScannerGrid(STATE.iccScanData.scan_results);
    return;
  }
  await fetchScan();
}

function renderIccScannerGrid(scanResults) {
  renderQuickStatusBar('iccQuickStatusBar', scanResults, 'icc');

  const grid = document.getElementById('iccScannerGrid');
  if (!grid) return;

  const defaultSymbols = ['MNQ', 'MES', 'M2K', 'MGC'];
  const availableSymbols = Object.keys(scanResults).length > 0 ? Object.keys(scanResults) : defaultSymbols;
  const gradeWeights = { 'A+': 4, 'A': 3, 'B': 2, 'F': 1 };

  // Sort: Active Continuation Trades first, then higher grades, then higher confluence
  const sortedSymbols = [...availableSymbols].sort((a, b) => {
    const dataA = scanResults[a] || {};
    const dataB = scanResults[b] || {};

    const activeA = dataA.is_active_trade ? 1 : 0;
    const activeB = dataB.is_active_trade ? 1 : 0;
    if (activeA !== activeB) return activeB - activeA;

    const gradeA = gradeWeights[dataA.setup_grade] || 0;
    const gradeB = gradeWeights[dataB.setup_grade] || 0;
    if (gradeA !== gradeB) return gradeB - gradeA;

    const confA = dataA.confluence_score || 0;
    const confB = dataB.confluence_score || 0;
    return confB - confA;
  });

  let html = '';

  sortedSymbols.forEach(sym => {
    const d = scanResults[sym];
    if (!d) return;

    const isActiveTrade = d.is_active_trade === true;
    const confScore = d.confluence_score || 0;
    let scoreClass = 'low';
    if (confScore >= 70) scoreClass = 'high';
    else if (confScore >= 45) scoreClass = 'med';

    const isBull = d.direction === 'BULLISH';
    const isBear = d.direction === 'BEARISH';
    let biasBadge = 'style="background: #334155; color: #94a3b8; padding: 2px 6px; border-radius: 4px; font-size: 11px;"';
    if (d.direction && d.direction !== 'NEUTRAL') {
      biasBadge = isBull ? 'class="badge-bullish"' : 'class="badge-bearish"';
    }

    const grade = d.setup_grade || 'F';
    let gradeBadgeHtml = '';
    if (grade === 'A+') {
      gradeBadgeHtml = '<span class="grade-badge a-plus">🏆 GRADE A+</span>';
    } else if (grade === 'A') {
      gradeBadgeHtml = '<span class="grade-badge a">⭐ GRADE A</span>';
    } else if (grade === 'B') {
      gradeBadgeHtml = '<span class="grade-badge b">🔷 GRADE B</span>';
    } else {
      gradeBadgeHtml = '<span class="grade-badge f">❌ GRADE F</span>';
    }

    const plan = d.trade_plan || {};
    const ind = d.indication || {};
    const corr = d.correction || {};

    let stageText = d.phase_title || 'Observing Structure';
    let stageClass = '';
    let orderType = 'OBSERVING';
    let actionBtnHtml = '';

    if (isActiveTrade && plan.entry) {
      stageClass = 'in-zone';
      orderType = isBull ? `BUY LIMIT @ ${plan.entry}` : `SELL LIMIT @ ${plan.entry}`;
      actionBtnHtml = `
        <button class="btn btn-primary" onclick="quickPaperExecute('${sym}', '${d.direction}', ${plan.entry}, ${plan.stop_loss}, ${plan.take_profit}, 'ICC Continuation Model')">
          🚀 Place ${isBull ? 'Buy' : 'Sell'} Limit
        </button>
      `;
    } else if (d.phase === 'PHASE_2_CORRECTION') {
      stageClass = 'waiting-pullback';
      orderType = 'CORRECTION / WAITING TRIGGER';
      actionBtnHtml = `
        <button class="btn btn-secondary" style="opacity: 0.7;" disabled title="Waiting for Continuation Reversal Trigger out of 38.2%-61.8% zone">
          ⏳ Pullback (${corr.retrace_pct !== undefined ? corr.retrace_pct + '%' : '--'})
        </button>
      `;
    } else {
      orderType = 'STANDBY';
      actionBtnHtml = `
        <button class="btn btn-secondary" style="opacity: 0.6;" disabled title="Waiting for strong Indication impulse leg">
          👀 Standby (No Setup)
        </button>
      `;
    }

    const tfTrends = d.multi_tf_trends || {
      '5m': { direction: d.direction || 'NEUTRAL', phase_short: '5M' },
      '15m': { direction: d.direction || 'NEUTRAL', phase_short: '15M' },
      '30m': { direction: d.direction || 'NEUTRAL', phase_short: '30M' },
      '1h': { direction: d.direction || 'NEUTRAL', phase_short: '1H' }
    };
    const tfAlign = d.tf_alignment || { text: 'Analyzing HTF Flow', badge_class: 'mixed' };
    const m5 = tfTrends['5m'] || { direction: 'NEUTRAL', phase_short: 'STANDBY' };
    const m15 = tfTrends['15m'] || { direction: 'NEUTRAL', phase_short: 'STANDBY' };
    const m30 = tfTrends['30m'] || { direction: 'NEUTRAL', phase_short: 'STANDBY' };
    const m60 = tfTrends['1h'] || { direction: 'NEUTRAL', phase_short: 'STANDBY' };

    let cardStyle = '';
    if (isActiveTrade) {
      if (grade === 'A+' || grade === 'A') {
        cardStyle = 'border-color: #06b6d4; box-shadow: 0 0 20px rgba(6, 182, 212, 0.3);';
      } else {
        cardStyle = 'border-color: #3b82f6; box-shadow: 0 0 15px rgba(59, 130, 246, 0.25);';
      }
    }

    html += `
      <div class="scanner-card" id="icc-card-${sym}" style="${cardStyle}">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <span class="model-header-tag icc">🔬 ICC CONTINUATION MODEL</span>
          <span style="font-size: 11px; font-weight: 700; color: ${isActiveTrade ? '#34d399' : '#94a3b8'};">
            ${isActiveTrade ? '🚀 ACTIVE CONTINUATION SIGNAL' : '👀 OBSERVING'}
          </span>
        </div>

        <div class="scanner-card-header">
          <div class="card-title-group">
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
              <h2>${sym}</h2>
              ${gradeBadgeHtml}
              <span ${biasBadge}>${d.direction || 'NEUTRAL'}</span>
            </div>
            <span>${d.timeframe || '5m'} ICC Order Flow | Current: <strong>${(d.current_price || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong></span>
          </div>
          <div class="confluence-badge-box">
            <div class="confluence-meter ${scoreClass}">
              ${confScore}% ICC Score
            </div>
          </div>
        </div>

        <div class="setup-title-pill" style="border-color: #06b6d4; color: #67e8f9;">
          🔬 ${d.phase || 'STANDBY'} • ${d.phase_title || 'Observing'}
        </div>
        ${d.grade_desc ? `<div class="grade-desc-pill">ℹ️ ${d.grade_desc}</div>` : ''}

        <div class="stage-status-banner ${stageClass}">
          <span>${stageText}</span>
          <span class="order-type-tag">${orderType}</span>
        </div>

        <!-- MULTI-TIMEFRAME TREND RADAR (5m, 15m, 30m, 1h) -->
        <div class="icc-tf-matrix-container">
          <div class="icc-tf-header">
            <span>🌐 Multi-TF Trend Radar</span>
            <span class="icc-tf-align-badge ${tfAlign.badge_class}">${tfAlign.text}</span>
          </div>
          <div class="icc-tf-grid">
            <div class="icc-tf-card ${(m5.direction || 'neutral').toLowerCase()}" onclick="openSymbolWithTf('${sym}', '5m')" title="5-Minute Trend: Click to view chart">
              <span class="icc-tf-badge">5M</span>
              <span class="icc-tf-dir">${m5.direction === 'BULLISH' ? '🟢 BULL' : (m5.direction === 'BEARISH' ? '🔴 BEAR' : '⚪ NEUT')}</span>
              <span class="icc-tf-phase">${m5.phase_short || 'STANDBY'}</span>
            </div>
            <div class="icc-tf-card ${(m15.direction || 'neutral').toLowerCase()}" onclick="openSymbolWithTf('${sym}', '15m')" title="15-Minute Trend: Click to view chart">
              <span class="icc-tf-badge">15M</span>
              <span class="icc-tf-dir">${m15.direction === 'BULLISH' ? '🟢 BULL' : (m15.direction === 'BEARISH' ? '🔴 BEAR' : '⚪ NEUT')}</span>
              <span class="icc-tf-phase">${m15.phase_short || 'STANDBY'}</span>
            </div>
            <div class="icc-tf-card ${(m30.direction || 'neutral').toLowerCase()}" onclick="openSymbolWithTf('${sym}', '30m')" title="30-Minute Trend: Click to view chart">
              <span class="icc-tf-badge">30M</span>
              <span class="icc-tf-dir">${m30.direction === 'BULLISH' ? '🟢 BULL' : (m30.direction === 'BEARISH' ? '🔴 BEAR' : '⚪ NEUT')}</span>
              <span class="icc-tf-phase">${m30.phase_short || 'STANDBY'}</span>
            </div>
            <div class="icc-tf-card ${(m60.direction || 'neutral').toLowerCase()}" onclick="openSymbolWithTf('${sym}', '60m')" title="1-Hour Trend: Click to view chart">
              <span class="icc-tf-badge">1H</span>
              <span class="icc-tf-dir">${m60.direction === 'BULLISH' ? '🟢 BULL' : (m60.direction === 'BEARISH' ? '🔴 BEAR' : '⚪ NEUT')}</span>
              <span class="icc-tf-phase">${m60.phase_short || 'STANDBY'}</span>
            </div>
          </div>
        </div>

        <div class="icc-breakdown-box">
          <div class="icc-col">
            <div class="icc-col-title">Phase 1: Indication</div>
            <div>• Move: <strong>${ind.range ? ind.range + ' pts' : 'None'}</strong></div>
            <div>• Origin: <strong>${ind.origin_price !== undefined ? ind.origin_price : (plan.stop_loss || '--')}</strong></div>
            <div>• Extreme: <strong>${ind.extreme_price !== undefined ? ind.extreme_price : (plan.take_profit_1 || '--')}</strong></div>
          </div>
          <div class="icc-col">
            <div class="icc-col-title">Phase 2: Correction</div>
            <div>• Depth: <strong>${corr.retrace_pct !== undefined ? corr.retrace_pct + '%' : '--'}</strong></div>
            <div>• Status: <strong>${corr.status || 'Scanning'}</strong></div>
            <div>• 50% Eq: <strong>${corr.equilibrium !== undefined ? corr.equilibrium : (ind.equilibrium_50 || '--')}</strong></div>
          </div>
        </div>

        ${(() => {
          const ptMult = { 'MNQ': 2.0, 'MES': 5.0, 'M2K': 5.0, 'MGC': 10.0 }[sym] || 2.0;
          const entryVal = plan.entry || ind.equilibrium_50;
          const slVal = plan.stop_loss || ind.origin_price;
          const tp1Val = plan.take_profit_1 || plan.take_profit || ind.extreme_price;

          let riskSpan = '';
          let rewardSpan = '';
          let stripHtml = '';

          if (entryVal && slVal) {
            const rPts = Math.abs(entryVal - slVal);
            const rUsd = rPts * ptMult;
            const rewPts = tp1Val ? Math.abs(tp1Val - entryVal) : (rPts * 1.5);
            const rewUsd = rewPts * ptMult;

            riskSpan = `<span style="font-size: 10px; color: #f87171; display: block; font-weight: 700;">(-$${rUsd.toFixed(2)})</span>`;
            rewardSpan = `<span style="font-size: 10px; color: #34d399; display: block; font-weight: 700;">(+$${rewUsd.toFixed(2)})</span>`;

            stripHtml = `
              <div class="risk-money-strip">
                <div class="risk-pill-badge" title="Maximum Risk on 1 Micro Contract to 15M Swing SL">
                  <span class="label">🛡️ <strong>15M SL Risk (1ct):</strong></span>
                  <strong class="val-loss">-$${rUsd.toFixed(2)}</strong>
                  <span class="sub">(${rPts.toFixed(1)} pts @ $${ptMult}/pt)</span>
                </div>
                <div class="reward-pill-badge" title="Target Reward on 1 Micro Contract to TP1">
                  <span class="label">🎯 <strong>TP1 Gain (1ct):</strong></span>
                  <strong class="val-gain">+$${rewUsd.toFixed(2)}</strong>
                  <span class="sub">(${rewPts.toFixed(1)} pts)</span>
                </div>
              </div>
              <div class="contract-matrix-box">
                <div class="matrix-title">
                  <span>📊 Position Sizing (15M SL Risk vs TP1 Gain)</span>
                  <span style="color: var(--text-muted); font-size: 9px;">${sym} ($${ptMult}/pt)</span>
                </div>
                <div class="matrix-grid">
                  <div class="matrix-tier">
                    <div class="tier-head">1 Con</div>
                    <div class="tier-loss">-$${(rUsd * 1).toFixed(0)}</div>
                    <div class="tier-gain">+$${(rewUsd * 1).toFixed(0)}</div>
                  </div>
                  <div class="matrix-tier active-tier">
                    <div class="tier-head">5 Cons</div>
                    <div class="tier-loss">-$${(rUsd * 5).toFixed(0)}</div>
                    <div class="tier-gain">+$${(rewUsd * 5).toFixed(0)}</div>
                  </div>
                  <div class="matrix-tier">
                    <div class="tier-head">10 Cons</div>
                    <div class="tier-loss">-$${(rUsd * 10).toFixed(0)}</div>
                    <div class="tier-gain">+$${(rewUsd * 10).toFixed(0)}</div>
                  </div>
                </div>
              </div>
            `;
          } else {
            stripHtml = `
              <div class="risk-money-strip standby">
                <span style="color: var(--text-muted); font-size: 11px;">🛡️ Point Multiplier: $${ptMult.toFixed(2)}/pt | 1 Con / 5 Cons / 10 Cons calculated on trade trigger</span>
              </div>
            `;
          }

          return `
            <div class="trade-plan-box">
              <div class="plan-cell">
                <div class="plan-label">${isActiveTrade ? (isBull ? '🚀 Buy Limit' : '🔴 Sell Limit') : (d.phase === 'PHASE_2_CORRECTION' ? '⏳ 50% Eq Entry' : 'Planned Entry')}</div>
                <div class="plan-val entry" title="Calculated Entry Price">${plan.entry !== null && plan.entry !== undefined ? plan.entry : (ind.equilibrium_50 || '--')}</div>
              </div>
              <div class="plan-cell">
                <div class="plan-label">Protected SL (15M Swing)</div>
                <div class="plan-val sl">${plan.stop_loss !== null && plan.stop_loss !== undefined ? plan.stop_loss : (ind.origin_price || '--')} ${riskSpan}</div>
              </div>
              <div class="plan-cell">
                <div class="plan-label">Target TP1 (${plan.rr_ratio && plan.rr_ratio !== '--' ? plan.rr_ratio + ' RR' : '1:1.5+'})</div>
                <div class="plan-val tp">${plan.take_profit_1 || plan.take_profit || (ind.extreme_price || '--')} ${rewardSpan}</div>
              </div>
            </div>

            ${stripHtml}
          `;
        })()}

        <div style="font-size: 10.5px; color: var(--text-muted); background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(6, 182, 212, 0.2); padding: 7px 10px; border-radius: 6px; margin-bottom: 10px; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 4px;">
          <span>🎯 <strong>${isBull ? 'Peak (TP1)' : 'Low (TP1)'}:</strong> ${plan.take_profit_1 || ind.extreme_price || '--'}</span>
          <span>🚀 <strong>TP2 (Ext):</strong> ${plan.take_profit_2 || '--'}</span>
          <span>💎 <strong>TP3 (Runner):</strong> ${plan.take_profit_3 || '--'}</span>
        </div>

        <div class="card-actions">
          <button class="btn btn-secondary" onclick="openSymbolInChart('${sym}')">
            📊 View Chart
          </button>
          ${actionBtnHtml}
        </div>
      </div>
    `;
  });

  grid.innerHTML = html;
}

window.openSymbolWithTf = function(sym, tf) {
  selectSymbol(sym);
  STATE.activeTimeframe = tf;
  document.querySelectorAll('#chartTimeframePills .pill-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-tf') === tf);
  });
  const chartTabBtn = document.querySelector('[data-tab="chartTab"]');
  if (chartTabBtn) chartTabBtn.click();
  fetchChart(sym, tf);
};

window.openSymbolInChart = function(sym) {
  selectSymbol(sym);
  const chartTabBtn = document.querySelector('[data-tab="chartTab"]');
  if (chartTabBtn) chartTabBtn.click();
};

window.quickPaperExecute = function(sym, dir, entry, sl, tp, setup) {
  executePaperTrade(sym, dir, entry, sl, tp, setup);
};

// ============================================================================
// 4. CHART ENGINE
// ============================================================================
const TV_SYMBOLS = {
  'MNQ': 'CAPITALCOM:US100',
  'MES': 'CAPITALCOM:US500',
  'M2K': 'CAPITALCOM:US2000',
  'MGC': 'TVC:GOLD'
};

const TV_INTERVAL_MAP = {
  '1m': '1',
  '5m': '5',
  '15m': '15',
  '30m': '30',
  '60m': '60',
  '1h': '60',
  '1d': 'D'
};

function renderTradingViewChart(sym, tf) {
  const container = document.getElementById('tv_chart_container');
  if (!container) return;
  container.innerHTML = '';

  const tvSym = TV_SYMBOLS[sym] || 'CME_MINI:NQ1!';
  const tvInterval = TV_INTERVAL_MAP[tf] || '5';

  if (typeof TradingView !== 'undefined') {
    try {
      new TradingView.widget({
        "autosize": true,
        "symbol": tvSym,
        "interval": tvInterval,
        "timezone": "America/New_York",
        "theme": "dark",
        "style": "1",
        "locale": "en",
        "toolbar_bg": "#0a0e17",
        "enable_publishing": false,
        "hide_side_toolbar": false,
        "allow_symbol_change": true,
        "save_image": false,
        "container_id": "tv_chart_container",
        "studies": [
          "STD;Fair Value Gap"
        ],
        "overrides": {
          "paneProperties.background": "#090d16",
          "paneProperties.vertGridProperties.color": "rgba(255, 255, 255, 0.05)",
          "paneProperties.horzGridProperties.color": "rgba(255, 255, 255, 0.05)",
          "symbolWatermarkProperties.transparency": 90,
          "scalesProperties.textColor": "#94a3b8",
          "mainSeriesProperties.candleStyle.upColor": "#10b981",
          "mainSeriesProperties.candleStyle.downColor": "#ef4444",
          "mainSeriesProperties.candleStyle.drawWick": true,
          "mainSeriesProperties.candleStyle.drawBorder": true,
          "mainSeriesProperties.candleStyle.borderColor": "#10b981",
          "mainSeriesProperties.candleStyle.borderUpColor": "#10b981",
          "mainSeriesProperties.candleStyle.borderDownColor": "#ef4444",
          "mainSeriesProperties.candleStyle.wickUpColor": "#10b981",
          "mainSeriesProperties.candleStyle.wickDownColor": "#ef4444"
        }
      });
    } catch (e) {
      console.warn("TradingView widget init error:", e);
    }
  }
}

function setupChartControls() {
  document.querySelectorAll('#chartSymbolPills .pill-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#chartSymbolPills .pill-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const sym = btn.getAttribute('data-sym');
      STATE.activeSymbol = sym;
      fetchChart(STATE.activeSymbol, STATE.activeTimeframe);
    });
  });

  document.querySelectorAll('#chartTfPills .pill-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#chartTfPills .pill-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const tf = btn.getAttribute('data-tf');
      STATE.activeTimeframe = tf;
      fetchChart(STATE.activeSymbol, STATE.activeTimeframe);
    });
  });

  document.querySelectorAll('#chartSourcePills .pill-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#chartSourcePills .pill-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const src = btn.getAttribute('data-source');
      STATE.chartSource = src;

      const tvWrapper = document.getElementById('tvChartWrapper');
      const ictWrapper = document.getElementById('ictCanvasWrapper');
      const radarToggles = document.getElementById('radarOverlayToggles');

      if (src === 'tv') {
        if (tvWrapper) tvWrapper.style.display = 'block';
        if (ictWrapper) ictWrapper.style.display = 'none';
        if (radarToggles) radarToggles.style.display = 'none';
        renderTradingViewChart(STATE.activeSymbol, STATE.activeTimeframe);
      } else {
        if (tvWrapper) tvWrapper.style.display = 'none';
        if (ictWrapper) ictWrapper.style.display = 'block';
        if (radarToggles) radarToggles.style.display = 'flex';
        renderCanvasChart();
      }
    });
  });

  const overlayMap = {
    toggleFvg: 'fvg',
    toggleMss: 'mss',
    toggleSweeps: 'sweeps',
    toggleOb: 'ob',
    toggleOte: 'ote'
  };

  Object.entries(overlayMap).forEach(([id, key]) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('click', () => {
        STATE.overlays[key] = !STATE.overlays[key];
        el.classList.toggle('active', STATE.overlays[key]);
        renderCanvasChart();
      });
    }
  });

  window.addEventListener('resize', () => {
    if (STATE.chartSource !== 'tv') {
      renderCanvasChart();
    }
  });
}

function selectSymbol(sym) {
  STATE.activeSymbol = sym;
  document.querySelectorAll('#chartSymbolPills .pill-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-sym') === sym);
  });
  document.querySelectorAll('.ticker-item').forEach(item => {
    item.classList.toggle('active', item.getAttribute('data-sym') === sym);
  });
  fetchChart(STATE.activeSymbol, STATE.activeTimeframe);
}

async function fetchChart(sym, tf) {
  if (STATE.chartSource === 'tv') {
    renderTradingViewChart(sym, tf);
  }

  // Also run underlying analysis in the background to keep OTE ladder and PD arrays sidebar updated
  try {
    const ctrl = new AbortController();
    const tId = setTimeout(() => ctrl.abort(), 2500);
    const res = await fetch(`/api/chart?symbol=${sym}&interval=${tf}`, { signal: ctrl.signal });
    clearTimeout(tId);
    if (res.ok) {
      const data = await res.json();
      STATE.chartData = data;
      if (STATE.chartSource !== 'tv') {
        renderCanvasChart();
      }
      updateChartSidebar(data.analysis);
      return;
    }
  } catch (e) {
    // API server not running - seamless client fallback
  }

  // 2. Client-Side Autonomous Engine Fallback
  try {
    if (window.MarketData && window.ICTEngine) {
      const candles = await window.MarketData.fetchSymbolCandles(sym, tf);
      const analysis = window.ICTEngine.analyzeSymbol(sym, candles);
      STATE.chartData = {
        symbol: sym,
        timeframe: tf,
        candles: candles,
        analysis: analysis
      };
      if (STATE.chartSource !== 'tv') {
        renderCanvasChart();
      }
      updateChartSidebar(analysis);
    }
  } catch (e) {
    console.warn("Client chart error:", e);
  }
}

function updateChartSidebar(analysis) {
  if (!analysis) return;

  const ote = analysis.ote_zone;
  if (ote) {
    document.getElementById('ote50').textContent = ote.equilibrium_50;
    document.getElementById('ote62').textContent = ote.ote_62;
    document.getElementById('ote705').textContent = ote.ote_705;
    document.getElementById('ote79').textContent = ote.ote_79;
  }

  const pdList = document.getElementById('chartPdArraysList');
  if (pdList) {
    let html = '';
    html += `<div>• <strong>Active Trade Status:</strong> ${analysis.is_active_trade ? '🟢 VALID SETUP' : '⏸️ Standby'}</div>`;
    html += `<div>• <strong>Active FVGs:</strong> ${analysis.active_fvgs_count || 0} unmitigated</div>`;
    html += `<div>• <strong>Recent MSS Shifts:</strong> ${analysis.recent_mss_count || 0}</div>`;
    html += `<div>• <strong>Liquidity Sweeps:</strong> ${analysis.recent_sweeps_count || 0}</div>`;
    html += `<div>• <strong>Target BSL:</strong> ${analysis.trade_plan?.target_bsl || '--'}</div>`;
    html += `<div>• <strong>Target SSL:</strong> ${analysis.trade_plan?.target_ssl || '--'}</div>`;
    pdList.innerHTML = html;
  }
}

function renderCanvasChart() {
  const canvas = document.getElementById('ictChart');
  if (!canvas || !STATE.chartData || !STATE.chartData.candles) return;

  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.parentElement.getBoundingClientRect();

  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);

  const width = rect.width;
  const height = rect.height;

  ctx.fillStyle = '#090d16';
  ctx.fillRect(0, 0, width, height);

  const candles = STATE.chartData.candles;
  const n = candles.length;
  if (n === 0) return;

  let minPrice = Infinity;
  let maxPrice = -Infinity;
  candles.forEach(c => {
    if (c.low < minPrice) minPrice = c.low;
    if (c.high > maxPrice) maxPrice = c.high;
  });

  const priceRange = maxPrice - minPrice || 1;
  minPrice -= priceRange * 0.08;
  maxPrice += priceRange * 0.08;
  const fullPriceRange = maxPrice - minPrice;

  const chartMarginRight = 75;
  const chartMarginBottom = 30;
  const plotWidth = width - chartMarginRight;
  const plotHeight = height - chartMarginBottom;

  const candleSpacing = plotWidth / n;
  const candleWidth = Math.max(candleSpacing * 0.7, 3);

  function getX(index) {
    return index * candleSpacing + candleSpacing / 2;
  }

  function getY(price) {
    return plotHeight - ((price - minPrice) / fullPriceRange) * plotHeight;
  }

  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 1;
  ctx.fillStyle = '#64748b';
  ctx.font = '10px SF Mono, monospace';
  ctx.textAlign = 'left';

  const gridSteps = 6;
  for (let i = 0; i <= gridSteps; i++) {
    const p = minPrice + (fullPriceRange / gridSteps) * i;
    const y = getY(p);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(plotWidth, y);
    ctx.stroke();
    ctx.fillText(p.toFixed(2), plotWidth + 8, y + 3);
  }

  const analysis = STATE.chartData.analysis || {};

  // Fair Value Gaps
  if (STATE.overlays.fvg && analysis.detected_fvgs) {
    analysis.detected_fvgs.forEach(fvg => {
      const cIdx = fvg.candle_index;
      if (cIdx < n) {
        const xStart = getX(cIdx);
        const xEnd = plotWidth;
        const yTop = getY(fvg.top);
        const yBottom = getY(fvg.bottom);
        const boxHeight = yBottom - yTop;

        const isBull = fvg.type === 'BULLISH_FVG';
        ctx.fillStyle = isBull ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)';
        ctx.strokeStyle = isBull ? '#10b981' : '#ef4444';
        ctx.lineWidth = 1;

        ctx.fillRect(xStart, yTop, xEnd - xStart, boxHeight);
        ctx.strokeRect(xStart, yTop, xEnd - xStart, boxHeight);

        const yCE = getY(fvg.consequent_encroachment);
        ctx.beginPath();
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = isBull ? 'rgba(16, 185, 129, 0.6)' : 'rgba(239, 68, 68, 0.6)';
        ctx.moveTo(xStart, yCE);
        ctx.lineTo(xEnd, yCE);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = isBull ? '#34d399' : '#f87171';
        ctx.font = '9px SF Mono, monospace';
        ctx.fillText(isBull ? '+FVG' : '-FVG', xStart + 4, yTop + 12);
      }
    });
  }

  // Order Blocks
  if (STATE.overlays.ob && analysis.detected_order_blocks) {
    analysis.detected_order_blocks.forEach(ob => {
      const cIdx = ob.candle_index;
      if (cIdx >= 0 && cIdx < n) {
        const xStart = getX(cIdx);
        const xEnd = plotWidth;
        const yTop = getY(ob.top);
        const yBottom = getY(ob.bottom);
        const boxHeight = yBottom - yTop;

        const isBull = ob.type === 'BULLISH_ORDER_BLOCK';
        ctx.fillStyle = isBull ? 'rgba(59, 130, 246, 0.12)' : 'rgba(245, 158, 11, 0.12)';
        ctx.strokeStyle = isBull ? '#3b82f6' : '#f59e0b';
        ctx.lineWidth = 1;

        ctx.fillRect(xStart, yTop, xEnd - xStart, boxHeight);
        ctx.strokeRect(xStart, yTop, xEnd - xStart, boxHeight);

        ctx.fillStyle = isBull ? '#60a5fa' : '#fbbf24';
        ctx.font = '9px SF Mono, monospace';
        ctx.fillText(isBull ? '+OB' : '-OB', xStart + 4, yTop + 12);
      }
    });
  }

  // Liquidity Sweeps
  if (STATE.overlays.sweeps && analysis.detected_sweeps) {
    analysis.detected_sweeps.forEach(sw => {
      const y = getY(sw.level);
      const isBSL = sw.type === 'BSL_SWEEP';
      ctx.beginPath();
      ctx.strokeStyle = '#c084fc';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.moveTo(0, y);
      ctx.lineTo(plotWidth, y);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#c084fc';
      ctx.font = '10px SF Mono, monospace';
      ctx.fillText(isBSL ? '🟣 BSL RAID' : '🟣 SSL RAID', plotWidth - 90, y - 4);
    });
  }

  // OTE Fibonacci
  if (STATE.overlays.ote && analysis.ote_zone) {
    const ote = analysis.ote_zone;
    const y62 = getY(ote.ote_62);
    const y705 = getY(ote.ote_705);
    const y79 = getY(ote.ote_79);

    ctx.fillStyle = 'rgba(139, 92, 246, 0.1)';
    const topY = Math.min(y62, y79);
    const botY = Math.max(y62, y79);
    ctx.fillRect(plotWidth * 0.4, topY, plotWidth * 0.6, botY - topY);

    ctx.beginPath();
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 1.5;
    ctx.moveTo(plotWidth * 0.4, y705);
    ctx.lineTo(plotWidth, y705);
    ctx.stroke();

    ctx.fillStyle = '#c084fc';
    ctx.font = '10px SF Mono, monospace';
    ctx.fillText(`OTE 0.705: ${ote.ote_705}`, plotWidth - 110, y705 - 4);
  }

  // Candlesticks
  candles.forEach((c, idx) => {
    const x = getX(idx);
    const yOpen = getY(c.open);
    const yClose = getY(c.close);
    const yHigh = getY(c.high);
    const yLow = getY(c.low);

    const isUp = c.close >= c.open;
    const color = isUp ? '#10b981' : '#ef4444';

    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, yHigh);
    ctx.lineTo(x, yLow);
    ctx.stroke();

    ctx.fillStyle = color;
    const bodyTop = Math.min(yOpen, yClose);
    const bodyHeight = Math.max(Math.abs(yClose - yOpen), 1.5);
    ctx.fillRect(x - candleWidth / 2, bodyTop, candleWidth, bodyHeight);
  });

  // Market Structure Shifts
  if (STATE.overlays.mss && analysis.detected_mss) {
    analysis.detected_mss.forEach(mss => {
      const idx = mss.break_index;
      if (idx < n) {
        const x = getX(idx);
        const y = getY(mss.broken_level);
        const isBull = mss.type === 'BULLISH_MSS';

        ctx.fillStyle = isBull ? '#34d399' : '#f87171';
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.font = 'bold 9px SF Mono, monospace';
        ctx.fillText(isBull ? '▲ MSS' : '▼ MSS', x - 14, isBull ? y - 8 : y + 14);
      }
    });
  }

  ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
  ctx.font = 'bold 36px SF Mono, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`ICT RADAR • ${STATE.activeSymbol} ${STATE.activeTimeframe}`, plotWidth / 2, height / 2);
}

// ============================================================================
// 5. ACADEMY & QUIZ
// ============================================================================
function renderAcademyNav() {
  const container = document.getElementById('academyModuleNav');
  if (!container || !window.ACADEMY_DATA) return;

  let html = '';
  window.ACADEMY_DATA.modules.forEach(mod => {
    const isActive = mod.id === STATE.currentModuleId;
    html += `
      <div class="module-nav-item ${isActive ? 'active' : ''}" onclick="selectAcademyModule('${mod.id}')">
        <div class="module-nav-title">${mod.title}</div>
        <div class="module-nav-desc">${mod.description}</div>
      </div>
    `;
  });

  container.innerHTML = html;
}

window.selectAcademyModule = function(id) {
  STATE.currentModuleId = id;
  renderAcademyNav();
  renderAcademyContent(id);
};

function renderAcademyContent(modId) {
  const container = document.getElementById('academyModuleContent');
  if (!container || !window.ACADEMY_DATA) return;

  const mod = window.ACADEMY_DATA.modules.find(m => m.id === modId);
  if (!mod) return;

  let html = `
    <div class="module-header">
      <div style="font-size: 11px; color: #60a5fa; font-weight: 700; text-transform: uppercase;">${mod.badge || 'Module'}</div>
      <h2>${mod.title}</h2>
      <p style="color: var(--text-muted); font-size: 14px;">${mod.description}</p>
    </div>
  `;

  mod.sections.forEach(sec => {
    html += `
      <div class="lesson-section">
        <h3>${sec.title}</h3>
        <div>${sec.content}</div>
      </div>
    `;
  });

  container.innerHTML = html;
}

function renderQuiz(index) {
  const container = document.getElementById('quizContent');
  if (!container || !window.ACADEMY_DATA || !window.ACADEMY_DATA.quizzes) return;

  const quiz = window.ACADEMY_DATA.quizzes[index];
  if (!quiz) return;

  let html = `
    <div class="quiz-question">${quiz.question}</div>
    <div id="quizOptionsContainer">
  `;

  quiz.options.forEach((opt, idx) => {
    html += `
      <div class="quiz-option" onclick="handleQuizAnswer(${index}, ${idx}, ${quiz.correct})">
        <strong>${String.fromCharCode(65 + idx)}.</strong> ${opt}
      </div>
    `;
  });

  html += `
    </div>
    <div id="quizResultBox" style="display: none;"></div>
  `;

  container.innerHTML = html;
}

window.handleQuizAnswer = function(qIdx, selectedIdx, correctIdx) {
  const options = document.querySelectorAll('#quizOptionsContainer .quiz-option');
  options.forEach((opt, idx) => {
    opt.onclick = null;
    if (idx === correctIdx) {
      opt.classList.add('correct');
    } else if (idx === selectedIdx) {
      opt.classList.add('incorrect');
    }
  });

  const quiz = window.ACADEMY_DATA.quizzes[qIdx];
  const resultBox = document.getElementById('quizResultBox');
  if (resultBox) {
    resultBox.style.display = 'block';
    resultBox.className = 'quiz-explanation';
    resultBox.innerHTML = `
      <strong>${selectedIdx === correctIdx ? '✅ Correct! Institutional Mastery Achieved.' : '❌ Not quite.'}</strong><br>
      ${quiz.explanation}
      <div style="margin-top: 10px;">
        <button class="btn btn-secondary" style="font-size: 11px;" onclick="nextQuiz()">Next Question ➔</button>
      </div>
    `;
  }
};

window.nextQuiz = function() {
  STATE.activeQuizIndex = (STATE.activeQuizIndex + 1) % window.ACADEMY_DATA.quizzes.length;
  renderQuiz(STATE.activeQuizIndex);
};

// ============================================================================
// 6. PAPER TRADING
// ============================================================================
async function fetchPaperAccount() {
  if (window.PaperEngine) {
    const data = window.PaperEngine.getAccount();
    STATE.paperAccount = data;
    renderPaperUI(data);
    return;
  }
  try {
    const res = await fetch('/api/paper');
    const data = await res.json();
    STATE.paperAccount = data;
    renderPaperUI(data);
  } catch (e) {}
}

function renderPaperUI(acc) {
  if (!acc) return;

  const balEl = document.getElementById('paperBalanceDisplay');
  const countEl = document.getElementById('paperOpenPosCount');
  const unrealizedEl = document.getElementById('paperUnrealizedDisplay');

  let totalUnrealized = 0;
  (acc.positions || []).forEach(p => {
    totalUnrealized += (p.pnl_usd || 0);
  });

  if (balEl) balEl.textContent = `$${acc.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  if (countEl) countEl.textContent = acc.positions.length;
  if (unrealizedEl) {
    unrealizedEl.textContent = `$${totalUnrealized.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
    unrealizedEl.style.color = totalUnrealized >= 0 ? 'var(--bullish)' : 'var(--bearish)';
  }

  const openTbody = document.getElementById('openPositionsTbody');
  if (openTbody) {
    if (acc.positions.length === 0) {
      openTbody.innerHTML = `
        <tr>
          <td colspan="11" style="text-align: center; color: var(--text-muted); padding: 20px;">
            No active positions. Execute a verified signal from the live scanner!
          </td>
        </tr>
      `;
    } else {
      let rows = '';
      acc.positions.forEach(p => {
        const isBull = p.direction === 'BULLISH';
        const biasClass = isBull ? 'badge-bullish' : 'badge-bearish';
        const isPnlPos = (p.pnl_usd || 0) >= 0;
        const openedTimeStr = p.timestamp ? new Date(p.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (p.opened_at || '--');

        rows += `
          <tr>
            <td>${openedTimeStr}</td>
            <td><strong>${p.symbol}</strong></td>
            <td><span class="${biasClass}">${p.direction}</span></td>
            <td>${p.contracts}x</td>
            <td style="font-family: var(--font-mono);">${p.entry_price}</td>
            <td style="font-family: var(--font-mono);">${p.current_price}</td>
            <td style="font-family: var(--font-mono); color: var(--bearish);">${p.stop_loss}</td>
            <td style="font-family: var(--font-mono); color: var(--bullish);">${p.take_profit}</td>
            <td style="font-family: var(--font-mono); color: ${isPnlPos ? 'var(--bullish)' : 'var(--bearish)'};">
              ${isPnlPos ? '+' : ''}${p.pnl_points || p.pnl_pts || 0} pts
            </td>
            <td style="font-family: var(--font-mono); font-weight: 700; color: ${isPnlPos ? 'var(--bullish)' : 'var(--bearish)'};">
              ${isPnlPos ? '+' : ''}$${p.pnl_usd || 0}
            </td>
            <td>
              <button class="btn btn-secondary" style="padding: 4px 8px; font-size: 11px;" onclick="closePaperPosition('${p.id}')">
                Close
              </button>
            </td>
          </tr>
        `;
      });
      openTbody.innerHTML = rows;
    }
  }

  const closedTbody = document.getElementById('closedPositionsTbody');
  if (closedTbody) {
    if ((acc.history || []).length === 0) {
      closedTbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; color: var(--text-muted); padding: 20px;">
            No closed trades yet.
          </td>
        </tr>
      `;
    } else {
      let rows = '';
      acc.history.forEach(h => {
        const isBull = h.direction === 'BULLISH';
        const biasClass = isBull ? 'badge-bullish' : 'badge-bearish';
        const isPnlPos = (h.pnl_usd || 0) >= 0;
        const closedTimeStr = h.closed_timestamp ? new Date(h.closed_timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (h.closed_at || '--');

        rows += `
          <tr>
            <td>${closedTimeStr}</td>
            <td><strong>${h.symbol}</strong></td>
            <td><span class="${biasClass}">${h.direction}</span></td>
            <td>${h.setup_type}</td>
            <td style="font-family: var(--font-mono);">${h.entry_price}</td>
            <td style="font-family: var(--font-mono);">${h.exit_price || h.current_price}</td>
            <td style="font-family: var(--font-mono); font-weight: 700; color: ${isPnlPos ? 'var(--bullish)' : 'var(--bearish)'};">
              ${isPnlPos ? '+' : ''}$${h.pnl_usd || 0}
            </td>
          </tr>
        `;
      });
      closedTbody.innerHTML = rows;
    }
  }
}

async function executePaperTrade(sym, direction, entry, sl, tp, setup) {
  if (window.PaperEngine) {
    const res = window.PaperEngine.executeTrade(sym, direction, entry, sl, tp, setup);
    if (res.status === 'success') {
      audio.playConfluenceChime();
      showToast(`🚀 Paper Trade Placed: ${direction} 1x ${sym} @ ${entry}`);
      fetchPaperAccount();
      return;
    }
  }
  try {
    const res = await fetch('/api/paper/trade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        symbol: sym,
        direction: direction,
        entry: entry,
        stop_loss: sl,
        take_profit: tp,
        contracts: 1,
        setup_type: setup
      })
    });
    const data = await res.json();
    if (data.status === 'success') {
      audio.playConfluenceChime();
      showToast(`🚀 Paper Trade Placed: ${direction} 1x ${sym} @ ${entry}`);
      fetchPaperAccount();
    }
  } catch (e) {
    console.error("Trade execution error", e);
  }
}

window.closePaperPosition = function(posId) {
  if (window.PaperEngine) {
    const currPrice = STATE.chartData && STATE.chartData.candles && STATE.chartData.candles.length > 0 ?
      STATE.chartData.candles[STATE.chartData.candles.length - 1].close : undefined;
    const res = window.PaperEngine.closePosition(posId, currPrice);
    if (res.status === 'closed') {
      showToast(`Closed position. Realized PnL: $${res.closed_position.pnl_usd}`);
      fetchPaperAccount();
      return;
    }
  }
  fetch('/api/paper/close', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ position_id: posId })
  }).then(r => r.json()).then(data => {
    if (data.status === 'closed') {
      showToast(`Closed position. Realized PnL: $${data.closed_position.pnl_usd}`);
      fetchPaperAccount();
    }
  }).catch(console.error);
};

async function resetPaperAccount() {
  if (confirm("Are you sure you want to clear your completed backtest trades journal and reset your balance to $25,000.00?")) {
    if (window.ReplayJournalStore) {
      window.ReplayJournalStore.clearJournal();
    }
    if (window.replayEngine) {
      window.replayEngine.resetAccount();
    }
    if (window.PaperEngine) {
      window.PaperEngine.resetAccount();
      showToast("Account balance reset to $25,000.00");
      fetchPaperAccount();
      return;
    }
    try {
      const res = await fetch('/api/paper/reset', { method: 'POST' });
      const data = await res.json();
      if (data.status === 'reset') {
        showToast("Account balance reset to $25,000.00");
        fetchPaperAccount();
      }
    } catch (e) {
      console.error("Reset error", e);
    }
  }
}

// ============================================================================
// 7. REPLAY FX-STYLE BACKTESTER CONTROLLER & DRAWING PALETTE
// ============================================================================
function initReplayBacktester() {
  const canvasEl = document.getElementById('replayCanvas');
  if (!canvasEl || !window.ReplayEngine) return;

  const engine = new window.ReplayEngine();
  window.replayEngine = engine;

  // 1. Populate Scenario Selector Dropdown
  const scenarioSelect = document.getElementById('replayScenarioSelect');
  function updateScenarioDropdown() {
    if (scenarioSelect && window.REPLAY_SCENARIOS) {
      scenarioSelect.innerHTML = window.REPLAY_SCENARIOS.getAll().map(s => `
        <option value="${s.id}">${s.name} (${s.symbol})</option>
      `).join('');
    }
  }
  updateScenarioDropdown();

  if (scenarioSelect) {
    scenarioSelect.addEventListener('change', (e) => {
      engine.loadScenario(e.target.value);
      showToast(`Loaded ${engine.scenario.name}`);
    });
  }

  // 2. Initialize Primary and Secondary Canvas
  const firstRealScenarioId = window.REPLAY_SCENARIOS && window.REPLAY_SCENARIOS.getAll().length > 0 ? window.REPLAY_SCENARIOS.getAll()[0].id : null;
  engine.init(canvasEl, scenarioSelect && scenarioSelect.value ? scenarioSelect.value : firstRealScenarioId);

  // Initialize Situation Selector & 25-Card Modal Drawer
  setupSituationSelector(engine);

  const secCanvas = document.getElementById('replaySecondaryCanvas');
  if (secCanvas) {
    engine.initSecondary(secCanvas);
  }

  // Initialize Dedicated Touch-First UI for iPad & iPhone
  setupTouchUIManager(engine);

  // 2b. Dual-Chart Layout Mode Pills (Single, Dual Side-by-Side SMT, Stacked)
  const allLayoutBtns = document.querySelectorAll('#replayLayoutPills .pill-btn, #fsLayoutPills .pill-btn');
  allLayoutBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const layoutMode = btn.getAttribute('data-layout');
      allLayoutBtns.forEach(b => {
        if (b.getAttribute('data-layout') === layoutMode) b.classList.add('active');
        else b.classList.remove('active');
      });
      engine.setLayoutMode(layoutMode);
      showToast(`Switched layout to ${layoutMode === 'dual' ? 'Side-by-Side (SMT Mode)' : (layoutMode === 'stacked' ? 'Stacked View' : 'Single Chart')}`);
    });
  });

  // 2c. Secondary SMT Symbol & Timeframe Controls
  const smtSymbolSelect = document.getElementById('smtSecondarySymbolSelect');
  if (smtSymbolSelect) {
    smtSymbolSelect.addEventListener('change', (e) => {
      engine.setSecondarySymbol(e.target.value);
      showToast(`SMT Comparison asset set to ${e.target.value}`);
    });
  }

  const smtTfPills = document.querySelectorAll('#smtSecondaryTfPills .pill-btn');
  smtTfPills.forEach(btn => {
    btn.addEventListener('click', () => {
      smtTfPills.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const tf = btn.getAttribute('data-tf');
      engine.setSecondaryTimeframe(tf);
    });
  });

  // 3. Timeframe Buttons (Primary)
  const tfPills = document.querySelectorAll('#replayTfPills .pill-btn');
  tfPills.forEach(pill => {
    pill.addEventListener('click', () => {
      tfPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      const tf = pill.getAttribute('data-tf');
      engine.setTimeframe(tf);
    });
  });

  // 3b. Session Markouts & Auto-Markup Toggle Buttons (Top Strip + Toolbar)
  const replaySessionsBtn = document.getElementById('replaySessionsToggleBtn');
  const replayAutoMarkupBtn = document.getElementById('replayAutoMarkupToggleBtn');
  const toolAutoMarkupBtn = document.getElementById('toolAutoMarkupBtn');

  function updateSessionsUI(isActive) {
    if (replaySessionsBtn) {
      replaySessionsBtn.classList.toggle('active', isActive);
      const txt = replaySessionsBtn.querySelector('.status-text');
      if (txt) txt.textContent = isActive ? 'ON' : 'OFF';
    }
  }

  function updateAutoMarkupUI(isActive) {
    if (replayAutoMarkupBtn) {
      replayAutoMarkupBtn.classList.toggle('active', isActive);
      const txt = replayAutoMarkupBtn.querySelector('.status-text');
      if (txt) txt.textContent = isActive ? 'ON' : 'OFF';
    }
    if (toolAutoMarkupBtn) {
      toolAutoMarkupBtn.classList.toggle('active', isActive);
    }
  }

  if (replaySessionsBtn) {
    replaySessionsBtn.addEventListener('click', () => {
      const active = engine.toggleSessions();
      updateSessionsUI(active);
      showToast(active ? "🕒 Multi-Session Markouts: ON (Asia H/L, London H/L, Midnight Open, PDH/PDL)" : "🕒 Multi-Session Markouts: OFF");
    });
  }

  if (replayAutoMarkupBtn) {
    replayAutoMarkupBtn.addEventListener('click', () => {
      const active = engine.toggleAutoMarkup();
      updateAutoMarkupUI(active);
      showToast(active ? "⚡ Auto ICT Markups: ON (FVGs & Sweeps)" : "⚡ Auto ICT Markups: OFF (Clean Chart)");
    });
  }

  if (toolAutoMarkupBtn) {
    toolAutoMarkupBtn.addEventListener('click', () => {
      const active = engine.toggleAutoMarkup();
      updateAutoMarkupUI(active);
      showToast(active ? "⚡ Auto ICT Markups: ON (FVGs & Sweeps)" : "⚡ Auto ICT Markups: OFF (Clean Chart)");
    });
  }

  // 4. Drawing Tool Buttons
  const toolBtns = document.querySelectorAll('#tvDrawingToolbar .tool-btn');
  toolBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tool = btn.getAttribute('data-tool');
      if (!tool) return; // Prevent non-tool buttons (like toolFullscreenBtn) from calling setTool(null)

      if (tool === 'toggle_automarkup') {
        const active = engine.toggleAutoMarkup();
        updateAutoMarkupUI(active);
        showToast(active ? "🧠 Auto ICT Markups: ON" : "🧠 Auto ICT Markups: OFF (Clean Chart)");
        return;
      }
      if (tool === 'undo') {
        engine.undo();
        return;
      }
      if (tool === 'cut') {
        engine.cutMode = !engine.cutMode;
        btn.classList.toggle('active', engine.cutMode);
        showToast(engine.cutMode ? "✂️ Click any candle on chart to start replay from there" : "Scissors mode deactivated");
        return;
      }
      if (tool === 'zoom_in') {
        engine.zoomIn();
        return;
      }
      if (tool === 'zoom_out') {
        engine.zoomOut();
        return;
      }
      if (tool === 'zoom_reset') {
        engine.resetZoom();
        showToast("↺ View reset to default 55 bars auto-fit");
        return;
      }
      if (tool === 'clear') {
        engine.setTool('clear');
        toolBtns.forEach(b => b.classList.remove('active'));
        const pointerBtn = document.querySelector('#tvDrawingToolbar [data-tool="pointer"]');
        if (pointerBtn) pointerBtn.classList.add('active');
        const touchPointerTile = document.querySelector('#touchToolsGrid [data-tool="pointer"]');
        if (touchPointerTile) {
          document.querySelectorAll('#touchToolsGrid .touch-tool-tile').forEach(t => t.classList.remove('active'));
          touchPointerTile.classList.add('active');
        }
        showToast("🗑️ Markups cleared");
        return;
      }

      toolBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      engine.setTool(tool);

      // Sync active state with touch tool sheet
      const touchTile = document.querySelector(`#touchToolsGrid [data-tool="${tool}"]`);
      if (touchTile) {
        document.querySelectorAll('#touchToolsGrid .touch-tool-tile').forEach(t => t.classList.remove('active'));
        touchTile.classList.add('active');
      }
    });
  });

  // 5. Replay Player Controls
  const playPauseBtn = document.getElementById('replayPlayPauseBtn');
  if (playPauseBtn) {
    playPauseBtn.addEventListener('click', () => engine.togglePlay());
  }

  const stepBackBtn = document.getElementById('replayStepBackBtn');
  if (stepBackBtn) {
    stepBackBtn.addEventListener('click', () => engine.stepBackward(1));
  }

  const stepForwardBtn = document.getElementById('replayStepForwardBtn');
  if (stepForwardBtn) {
    stepForwardBtn.addEventListener('click', () => engine.stepForward(1));
  }

  const jumpStartBtn = document.getElementById('replayJumpStartBtn');
  if (jumpStartBtn) {
    jumpStartBtn.addEventListener('click', () => engine.jumpToStart());
  }

  const jumpEndBtn = document.getElementById('replayJumpEndBtn');
  if (jumpEndBtn) {
    jumpEndBtn.addEventListener('click', () => engine.jumpToEnd());
  }

  // Speed Selector Chips
  document.querySelectorAll('.speed-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.speed-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const speed = parseFloat(chip.getAttribute('data-speed'));
      engine.setSpeed(speed);
    });
  });

  // Replay Scrubber
  const scrubber = document.getElementById('replayScrubber');
  if (scrubber) {
    scrubber.addEventListener('input', (e) => {
      const frac = parseFloat(e.target.value) / 100.0;
      engine.seekFraction(frac);
    });
  }

  // 6. Keyboard Shortcuts (Spacebar, Arrows, B/S)
  window.addEventListener('keydown', (e) => {
    if (STATE.activeTab !== 'replayTab') return;
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

    if (e.code === 'Space') {
      e.preventDefault();
      engine.togglePlay();
    } else if (e.code === 'ArrowRight') {
      e.preventDefault();
      engine.stepForward(1);
    } else if (e.code === 'ArrowLeft') {
      e.preventDefault();
      engine.stepBackward(1);
    } else if (e.code === 'KeyB') {
      e.preventDefault();
      executeReplayOrder('BUY');
    } else if (e.code === 'KeyS') {
      e.preventDefault();
      executeReplayOrder('SELL');
    } else if (e.code === 'KeyF' || (e.code === 'KeyF' && !e.metaKey && !e.ctrlKey)) {
      e.preventDefault();
      toggleReplayFullscreen();
    } else if (e.key === '+' || e.key === '=') {
      e.preventDefault();
      engine.zoomIn();
    } else if (e.key === '-' || e.key === '_') {
      e.preventDefault();
      engine.zoomOut();
    } else if (e.key === '0') {
      e.preventDefault();
      engine.resetZoom();
      showToast("↺ View reset to default 55 bars auto-fit");
    }
  });

  // 7. Fullscreen Focus Mode & Execution HUD
  function toggleReplayFullscreen() {
    const isCurrentlyFs = document.body.classList.contains('replay-fullscreen-mode') || !!(document.fullscreenElement || document.webkitFullscreenElement);
    const willBeFs = !isCurrentlyFs;

    // Invoke native browser Fullscreen API when available
    try {
      if (willBeFs) {
        const elem = document.documentElement;
        if (elem.requestFullscreen) {
          elem.requestFullscreen().catch(() => {});
        } else if (elem.webkitRequestFullscreen) {
          elem.webkitRequestFullscreen();
        }
      } else {
        if (document.fullscreenElement || document.webkitFullscreenElement) {
          if (document.exitFullscreen) {
            document.exitFullscreen().catch(() => {});
          } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
          }
        }
      }
    } catch (e) {
      // Gracefully fall back to CSS focus mode on devices without Fullscreen API permission (e.g. iPhone)
    }

    document.body.classList.toggle('replay-fullscreen-mode', willBeFs);
    updateFullscreenUI(willBeFs);

    // Resize canvas to fill full screen immediately
    setTimeout(() => {
      engine.resize();
      engine.render();
    }, 60);

    showToast(willBeFs ? "⛶ Fullscreen Focus Mode: Chart + Tools + TF + Replay Controls" : "Exited Fullscreen Focus Mode");
  }

  function updateFullscreenUI(isFs) {
    const fsToggleBtn = document.getElementById('replayFullscreenToggleBtn');
    const toolFsBtn = document.getElementById('toolFullscreenBtn');
    if (fsToggleBtn) {
      fsToggleBtn.textContent = isFs ? '❌ Exit Focus' : '⛶ Fullscreen';
      fsToggleBtn.classList.toggle('active', isFs);
    }
    if (toolFsBtn) {
      toolFsBtn.classList.toggle('active', isFs);
    }
  }

  // Keep button states in sync when user exits via Escape key or browser gesture
  function handleNativeFsChange() {
    const isNativeFs = !!(document.fullscreenElement || document.webkitFullscreenElement);
    if (!isNativeFs && document.body.classList.contains('replay-fullscreen-mode')) {
      document.body.classList.remove('replay-fullscreen-mode');
      updateFullscreenUI(false);
      setTimeout(() => {
        engine.resize();
        engine.render();
      }, 60);
    }
  }
  document.addEventListener('fullscreenchange', handleNativeFsChange);
  document.addEventListener('webkitfullscreenchange', handleNativeFsChange);

  const fsToggleBtn = document.getElementById('replayFullscreenToggleBtn');
  if (fsToggleBtn) fsToggleBtn.addEventListener('click', toggleReplayFullscreen);

  const toolFsBtn = document.getElementById('toolFullscreenBtn');
  if (toolFsBtn) toolFsBtn.addEventListener('click', toggleReplayFullscreen);

  // Fullscreen Floating Execution HUD Toggle
  const fsOrderHudToggleBtn = document.getElementById('fsOrderHudToggleBtn');
  const replayExecHud = document.getElementById('replayExecHud');
  if (fsOrderHudToggleBtn && replayExecHud) {
    fsOrderHudToggleBtn.addEventListener('click', () => {
      const isHidden = replayExecHud.style.display === 'none';
      replayExecHud.style.display = isHidden ? 'flex' : 'none';
      fsOrderHudToggleBtn.classList.toggle('active', isHidden);
    });
  }

  // Sync Fullscreen Timeframe Selector Chips
  const fsTfChips = document.querySelectorAll('.fs-tf-chip');
  fsTfChips.forEach(chip => {
    chip.addEventListener('click', () => {
      fsTfChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const tf = chip.getAttribute('data-tf');
      engine.setTimeframe(tf);

      // Sync top strip tf buttons
      const tfPills = document.querySelectorAll('#replayTfPills .pill-btn');
      tfPills.forEach(p => p.classList.toggle('active', p.getAttribute('data-tf') === tf));
    });
  });

  // 8. Order Execution Controls
  let activeOrderType = 'MARKET';
  document.querySelectorAll('.order-type-toggle .toggle-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.order-type-toggle .toggle-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      activeOrderType = pill.getAttribute('data-ordertype');
      const limitGroup = document.getElementById('limitPriceGroup');
      if (limitGroup) {
        limitGroup.style.display = activeOrderType === 'LIMIT' ? 'block' : 'none';
        if (activeOrderType === 'LIMIT') {
          const curPrice = engine.getCurrentPrice();
          document.getElementById('orderLimitPriceInput').value = curPrice.toFixed(2);
        }
      }
    });
  });

  function executeReplayOrder(side) {
    // Read from sidebar or HUD inputs
    const hudSizeInput = document.getElementById('fsOrderSizeInput');
    const hudSlInput = document.getElementById('fsOrderSlInput');
    const hudTpInput = document.getElementById('fsOrderTpInput');

    const sidebarSizeInput = document.getElementById('orderSizeInput');
    const sidebarSlInput = document.getElementById('orderSlInput');
    const sidebarTpInput = document.getElementById('orderTpInput');

    const size = (hudSizeInput && parseInt(hudSizeInput.value, 10)) || (sidebarSizeInput && parseInt(sidebarSizeInput.value, 10)) || 1;
    const limitPrice = activeOrderType === 'LIMIT' ? parseFloat(document.getElementById('orderLimitPriceInput').value) : null;
    const sl = (hudSlInput && parseFloat(hudSlInput.value)) || (sidebarSlInput && parseFloat(sidebarSlInput.value)) || null;
    const tp = (hudTpInput && parseFloat(hudTpInput.value)) || (sidebarTpInput && parseFloat(sidebarTpInput.value)) || null;

    engine.placeOrder({
      type: activeOrderType,
      side: side,
      size: size,
      price: limitPrice,
      sl: sl,
      tp: tp,
      model: "PB Trades Model"
    });
  }

  const buyBtn = document.getElementById('replayBuyBtn');
  if (buyBtn) buyBtn.addEventListener('click', () => executeReplayOrder('BUY'));

  const sellBtn = document.getElementById('replaySellBtn');
  if (sellBtn) sellBtn.addEventListener('click', () => executeReplayOrder('SELL'));

  const fsBuyBtn = document.getElementById('fsBuyBtn');
  if (fsBuyBtn) fsBuyBtn.addEventListener('click', () => executeReplayOrder('BUY'));

  const fsSellBtn = document.getElementById('fsSellBtn');
  if (fsSellBtn) fsSellBtn.addEventListener('click', () => executeReplayOrder('SELL'));

  // Sync Long/Short Position tool bracket from chart to order inputs (both sidebar & HUD)
  function syncBracketToInputs() {
    const posShape = [...engine.drawings].reverse().find(s => s.type === 'long_pos' || s.type === 'short_pos');
    if (posShape) {
      const isLong = posShape.type === 'long_pos';
      const entryPrice = posShape.entryPrice || posShape.startPrice;
      const tpPrice = posShape.tpPrice;
      const slPrice = posShape.slPrice;

      const slInput = document.getElementById('orderSlInput');
      const tpInput = document.getElementById('orderTpInput');
      const limitInput = document.getElementById('orderLimitPriceInput');

      if (slInput) slInput.value = slPrice ? slPrice.toFixed(2) : '';
      if (tpInput) tpInput.value = tpPrice ? tpPrice.toFixed(2) : '';
      if (limitInput) limitInput.value = entryPrice.toFixed(2);

      const fsSlInput = document.getElementById('fsOrderSlInput');
      const fsTpInput = document.getElementById('fsOrderTpInput');
      if (fsSlInput) fsSlInput.value = slPrice ? slPrice.toFixed(2) : '';
      if (fsTpInput) fsTpInput.value = tpPrice ? tpPrice.toFixed(2) : '';

      showToast(`🎯 Applied Chart ${isLong ? 'Long' : 'Short'} Bracket (Entry: ${entryPrice.toFixed(2)} | SL: ${slPrice.toFixed(2)} | TP: ${tpPrice.toFixed(2)})`);
    } else {
      showToast("ℹ️ Draw a Long (🟢 Long) or Short (🔴 Short) position tool on the chart first!");
    }
  }

  const applyBracketBtn = document.getElementById('applyBracketToOrderBtn');
  if (applyBracketBtn) applyBracketBtn.addEventListener('click', syncBracketToInputs);

  const fsBracketSyncBtn = document.getElementById('fsBracketSyncBtn');
  if (fsBracketSyncBtn) fsBracketSyncBtn.addEventListener('click', syncBracketToInputs);

  const resetAcctBtn = document.getElementById('replayResetAccountBtn');
  if (resetAcctBtn) {
    resetAcctBtn.addEventListener('click', () => {
      if (confirm("Reset Replay Account balance to $25,000.00?")) {
        engine.resetAccount();
        engine.render();
        engine.notifyState();
        showToast("Replay account reset to $25,000.00");
      }
    });
  }

  // 8. PB Trades 5-Point Checklist Widget
  renderPbChecklistWidget();

  // 9. Scenario Info Modal
  setupScenarioModal(engine);

  // 10. Engine State Change & Trade Event Hooks
  engine.onStateChange = (state) => {
    // Update play button text & class
    if (playPauseBtn) {
      playPauseBtn.textContent = state.isPlaying ? '⏸ Pause' : '▶ Play';
      playPauseBtn.classList.toggle('playing', state.isPlaying);
    }

    // Sync Auto Markup Toggle UI
    if (state.autoMarkup !== undefined) {
      updateAutoMarkupUI(state.autoMarkup);
    }
    if (state.sessions !== undefined) {
      updateSessionsUI(state.sessions);
    }

    // Update Price Badge
    const priceBadge = document.getElementById('replayCurrentPriceBadge');
    if (priceBadge) {
      priceBadge.textContent = state.currentPrice ? state.currentPrice.toFixed(2) : '--';
    }
    const fsPriceBadge = document.getElementById('fsExecPriceBadge');
    if (fsPriceBadge) {
      fsPriceBadge.textContent = state.currentPrice ? `${state.currentPrice.toFixed(2)}` : '--';
    }

    // Sync Fullscreen TF selector
    if (state.activeTf) {
      document.querySelectorAll('.fs-tf-chip').forEach(c => {
        c.classList.toggle('active', c.getAttribute('data-tf') === state.activeTf);
      });
    }

    // Update Time Readout
    const timeReadout = document.getElementById('replayTimeReadout');
    if (timeReadout && state.currentTime) {
      const ny = window.ICTEngine.getNyTime(state.currentTime);
      timeReadout.textContent = `${ny.hour.toString().padStart(2, '0')}:${ny.minute.toString().padStart(2, '0')} NY`;
    }

    // Update Scrubber
    if (scrubber && state.total1mBars > 0) {
      scrubber.value = Math.round((state.current1mIndex / (state.total1mBars - 1)) * 100);
    }

    // Update Multi-Session Context Table
    if (state.context) {
      const c = state.context;
      const elMidnight = document.getElementById('ctxMidnightOpen');
      const elAsiaH = document.getElementById('ctxAsiaHigh');
      const elAsiaL = document.getElementById('ctxAsiaLow');
      const elLonH = document.getElementById('ctxLondonHigh');
      const elLonL = document.getElementById('ctxLondonLow');
      const elPdh = document.getElementById('ctxPdh');
      const elPdl = document.getElementById('ctxPdl');
      const biasBadge = document.getElementById('sessionBiasBadge');

      if (elMidnight) elMidnight.textContent = c.midnightOpen ? c.midnightOpen.toFixed(2) : '--';
      if (elAsiaH) elAsiaH.textContent = c.asia.high ? `${c.asia.high.toFixed(2)} (${(c.asia.high - c.asia.low).toFixed(1)} pts)` : '--';
      if (elAsiaL) elAsiaL.textContent = c.asia.low ? c.asia.low.toFixed(2) : '--';
      if (elLonH) elLonH.textContent = c.london.high ? `${c.london.high.toFixed(2)} (${(c.london.high - c.london.low).toFixed(1)} pts)` : '--';
      if (elLonL) elLonL.textContent = c.london.low ? c.london.low.toFixed(2) : '--';
      if (elPdh) elPdh.textContent = c.pdh ? c.pdh.toFixed(2) : '--';
      if (elPdl) elPdl.textContent = c.pdl ? c.pdl.toFixed(2) : '--';

      if (biasBadge && c.midnightOpen && state.currentPrice) {
        const isPrem = state.currentPrice > c.midnightOpen;
        biasBadge.textContent = isPrem ? "Midnight Premium" : "Midnight Discount";
        biasBadge.className = isPrem ? "badge-tag badge-bearish" : "badge-tag badge-bullish";
      }
    }

    // Update Account Equity & Stats
    const eqEl = document.getElementById('replayEquityVal');
    const pnlEl = document.getElementById('replayRealizedPnLVal');
    const winRateEl = document.getElementById('replayWinRateVal');

    if (eqEl) eqEl.textContent = `$${parseFloat(state.stats.equity).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
    if (pnlEl) {
      const pnl = parseFloat(state.stats.totalPnL);
      pnlEl.textContent = `${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}`;
      pnlEl.style.color = pnl >= 0 ? 'var(--bullish)' : 'var(--bearish)';
    }
    if (winRateEl) winRateEl.textContent = `${state.stats.winRate}% (${state.stats.wins}W / ${state.stats.losses}L)`;

    // Update Mini HUD PnL
    const fsPnl = document.getElementById('fsMiniPnlDisplay');
    if (fsPnl && state.account) {
      const openCount = (state.account.openPositions || []).length;
      let totalUnrealized = 0;
      (state.account.openPositions || []).forEach(p => totalUnrealized += (p.unrealizedPnL || 0));
      fsPnl.textContent = openCount > 0 ? `${openCount} Open (${totalUnrealized >= 0 ? '+' : ''}$${totalUnrealized.toFixed(1)})` : '0 Pos';
      fsPnl.style.color = totalUnrealized >= 0 ? 'var(--bullish)' : 'var(--bearish)';
    }

    // Render Active Positions in Mini Sidebar
    renderReplayActivePositions(state.account.openPositions);
    updateBacktestJournalUI();
  };

  engine.onTradeEvent = (event, trade) => {
    if (event === 'TAKE_PROFIT' || event === 'STOP_LOSS' || event === 'POSITION_CLOSED') {
      trade.exitReason = event === 'POSITION_CLOSED' ? 'MANUAL' : event;
      const record = window.ReplayJournalStore ? window.ReplayJournalStore.addTrade(trade, engine.scenario) : null;
      const pnl = trade.pnl || 0;
      const pts = trade.pts || 0;
      const isWin = pnl > 0;
      const isLoss = pnl < 0;

      if (isWin) {
        audio.playConfluenceChime();
        showToast(`🎯 TRADE WON! +$${pnl.toFixed(2)} (+${pts.toFixed(2)} pts) ➔ Saved to Journal`);
      } else if (isLoss) {
        showToast(`🛑 TRADE LOST: -$${Math.abs(pnl).toFixed(2)} (${pts.toFixed(2)} pts) ➔ Saved to Journal`);
      } else {
        showToast(`⚖️ BREAKEVEN TRADE: $0.00 (0.00 pts) ➔ Saved to Journal`);
      }
    } else if (event === 'ORDER_FILLED') {
      audio.playConfluenceChime();
      showToast(`⚡ Limit Order Filled: ${trade.side} @ ${trade.entryPrice.toFixed(2)}`);
    } else if (event === 'ORDER_PLACED') {
      showToast(`Limit Order Placed: ${trade.side} @ ${trade.entryPrice.toFixed(2)}`);
    }
  };
}

function renderReplayActivePositions(positions) {
  const container = document.getElementById('replayActivePositionsList');
  if (!container) return;

  if (!positions || positions.length === 0) {
    container.innerHTML = `<div style="color: var(--text-muted); font-size: 11px; padding: 6px 0;">No active positions open.</div>`;
    return;
  }

  container.innerHTML = positions.map(pos => {
    const isBull = pos.side === 'BUY';
    const isPos = pos.unrealizedPnL >= 0;
    return `
      <div class="pos-mini-card">
        <div>
          <div style="font-weight: 700; font-size: 11px; color: ${isBull ? 'var(--bullish)' : 'var(--bearish)'};">
            ${pos.side} ${pos.size}x @ ${pos.entryPrice.toFixed(2)}
          </div>
          <div style="font-size: 10px; color: var(--text-muted);">
            SL: ${pos.sl || '--'} | TP: ${pos.tp || '--'}
          </div>
        </div>
        <div style="text-align: right;">
          <div style="font-weight: 800; font-size: 11px; color: ${isPos ? 'var(--bullish)' : 'var(--bearish)'};">
            ${isPos ? '+' : ''}$${(pos.unrealizedPnL || 0).toFixed(2)}
          </div>
          <button class="btn btn-secondary btn-xs" onclick="window.replayEngine.closePosition('${pos.id}')">Close</button>
        </div>
      </div>
    `;
  }).join('');
}

function renderPbChecklistWidget() {
  const container = document.getElementById('pbChecklistContainer');
  if (!container || !window.PB_ACADEMY_DATA) return;

  container.innerHTML = window.PB_ACADEMY_DATA.checklist.map(item => `
    <div class="pb-checklist-item">
      <input type="checkbox" id="chk_${item.id}" onchange="updatePbChecklistScore()">
      <div class="pb-checklist-label">
        <div class="pb-checklist-title">${item.title}</div>
        <div class="pb-checklist-desc">${item.desc}</div>
      </div>
    </div>
  `).join('');
  updatePbChecklistScore();
}

window.updatePbChecklistScore = function() {
  const checkboxes = document.querySelectorAll('.pb-checklist-item input[type="checkbox"]');
  let checked = 0;
  checkboxes.forEach(c => { if (c.checked) checked++; });
  const scoreBadge = document.getElementById('pbChecklistScore');
  if (scoreBadge) {
    scoreBadge.textContent = `${checked} / ${checkboxes.length}`;
    scoreBadge.style.background = checked >= 4 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(6, 182, 212, 0.15)';
    scoreBadge.style.color = checked >= 4 ? '#34d399' : '#67e8f9';
  }
};

// ============================================================================
// 6b. SITUATION SELECTOR MODAL DRAWER & QUICK CONTROLS (25 BLIND SITUATIONS)
// ============================================================================
function setupSituationSelector(engine) {
  const currentNameEl = document.getElementById('currentSituationName');
  const fsNameEl = document.getElementById('fsSituationName');
  const modal = document.getElementById('situationSelectModal');
  const backdrop = document.getElementById('situationModalBackdrop');
  const closeBtn = document.getElementById('situationModalCloseBtn');
  const cardsGrid = document.getElementById('situationCardsGrid');
  const searchInput = document.getElementById('situationSearchInput');
  const filterChips = document.querySelectorAll('#situationFilterChips .sit-filter-chip');

  const prevBtns = [document.getElementById('prevSituationBtn'), document.getElementById('fsPrevSituationBtn')];
  const nextBtns = [document.getElementById('nextSituationBtn'), document.getElementById('fsNextSituationBtn')];
  const pickerBtns = [
    document.getElementById('situationPickerBtn'), 
    document.getElementById('fsSituationPickerBtn'),
    document.getElementById('touchSitBtn')
  ];
  const randomBtns = [
    document.getElementById('randomSituationBtn'),
    document.getElementById('fsRandomSituationBtn'),
    document.getElementById('modalRandomSituationBtn'),
    document.getElementById('touchDockRandomBtn')
  ];

  let currentFilter = 'all';
  let currentSearch = '';

  function getSituations() {
    return (window.REPLAY_SCENARIOS && window.REPLAY_SCENARIOS.getAll()) || [];
  }

  function getSituationTrades(sitId) {
    if (!window.ReplayJournalStore) return [];
    return window.ReplayJournalStore.getTrades().filter(t => t.scenarioId === sitId);
  }

  function updateSituationLabels(scenario) {
    if (!scenario) return;
    const sitName = scenario.name || 'Situation 01';
    if (currentNameEl) currentNameEl.textContent = sitName;
    if (fsNameEl) fsNameEl.textContent = `⚡ ${sitName.replace('Situation ', 'Sit ')}`;
    const touchSitEl = document.getElementById('touchSitName');
    if (touchSitEl) touchSitEl.textContent = `Sit ${sitName.replace('Situation ', '')}`;

    // Sync fallback select dropdown
    const select = document.getElementById('replayScenarioSelect');
    if (select && select.value !== scenario.id) {
      select.value = scenario.id;
    }
  }

  function renderSituationCards() {
    if (!cardsGrid) return;
    const situations = getSituations();
    const activeId = engine.scenario ? engine.scenario.id : (situations[0] ? situations[0].id : '');

    const filtered = situations.filter(s => {
      const trades = getSituationTrades(s.id);
      const isWon = trades.some(t => t.outcome === 'WIN');
      const isLost = trades.some(t => t.outcome === 'LOSS') && !isWon;
      const isUnplayed = trades.length === 0;

      if (currentFilter === 'unplayed' && !isUnplayed) return false;
      if (currentFilter === 'won' && !isWon) return false;
      if (currentFilter === 'lost' && !isLost) return false;

      if (currentSearch) {
        const query = currentSearch.toLowerCase().trim();
        const sitNum = s.situationNumber ? s.situationNumber.toString() : '';
        const nameMatch = s.name.toLowerCase().includes(query);
        const numMatch = sitNum.includes(query) || (`0${sitNum}`).includes(query);
        if (!nameMatch && !numMatch) return false;
      }
      return true;
    });

    if (filtered.length === 0) {
      cardsGrid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 48px 16px; color: var(--text-muted);">
          <div style="font-size: 32px; margin-bottom: 8px;">🔍</div>
          <div style="font-size: 14px; font-weight: 700; color: #fff; margin-bottom: 4px;">No situations match your search</div>
          <div style="font-size: 11px;">Try searching by number (e.g. 05, 14, 25) or selecting 'All (25)'.</div>
        </div>
      `;
      return;
    }

    cardsGrid.innerHTML = filtered.map(s => {
      const isActive = s.id === activeId;
      const trades = getSituationTrades(s.id);
      const isWon = trades.some(t => t.outcome === 'WIN');
      const isLost = trades.some(t => t.outcome === 'LOSS') && !isWon;

      let statusBadge = `<span class="sit-card-status">⚪ Ready</span>`;
      if (isWon) {
        const bestTrade = trades.filter(t => t.outcome === 'WIN')[0];
        const gain = (bestTrade && bestTrade.pnl) ? bestTrade.pnl.toFixed(0) : '0';
        statusBadge = `<span class="sit-card-status status-won">🎯 Won (+$${gain})</span>`;
      } else if (isLost) {
        const lossTrade = trades.filter(t => t.outcome === 'LOSS')[0];
        const loss = (lossTrade && lossTrade.pnl) ? Math.abs(lossTrade.pnl).toFixed(0) : '0';
        statusBadge = `<span class="sit-card-status status-lost">🛑 Lost (-$${loss})</span>`;
      }

      return `
        <div class="situation-card ${isActive ? 'active-situation' : ''}" data-id="${s.id}">
          <div class="sit-card-top">
            <span class="sit-card-title">⚡ ${s.name}</span>
            ${statusBadge}
          </div>
          <div class="sit-card-meta">
            <div class="sit-meta-row">
              <span>Primary:</span>
              <span class="sit-meta-val">MNQ (NQ Futures)</span>
            </div>
            <div class="sit-meta-row">
              <span>SMT Pair:</span>
              <span class="sit-meta-val">MES (S&P 500)</span>
            </div>
            <div class="sit-meta-row">
              <span>Structure:</span>
              <span class="sit-meta-val">2-Day Contiguous</span>
            </div>
          </div>
          <button class="sit-card-btn" data-id="${s.id}">
            ${isActive ? '✓ Active Session' : '▶ Start Practice'}
          </button>
        </div>
      `;
    }).join('');

    // Bind card clicks
    cardsGrid.querySelectorAll('.situation-card').forEach(card => {
      card.addEventListener('click', () => {
        const sitId = card.getAttribute('data-id');
        loadSituationById(sitId);
        closeModal();
      });
    });
  }

  function loadSituationById(sitId) {
    const situations = getSituations();
    const sit = situations.find(s => s.id === sitId);
    if (!sit) return;

    engine.loadScenario(sit.id);
    updateSituationLabels(sit);
    renderSituationCards();
    showToast(`⚡ Loaded ${sit.name} • 09:15 AM NY Open Structure`);
  }

  function openModal() {
    if (modal) {
      modal.style.display = 'flex';
      renderSituationCards();
      if (searchInput) {
        searchInput.value = '';
        currentSearch = '';
        searchInput.focus();
      }
    }
  }

  function closeModal() {
    if (modal) modal.style.display = 'none';
  }

  // Navigation: Prev and Next
  function stepSituation(direction) {
    const situations = getSituations();
    if (situations.length === 0) return;
    const currentId = engine.scenario ? engine.scenario.id : situations[0].id;
    const currentIndex = situations.findIndex(s => s.id === currentId);
    let nextIndex = currentIndex + direction;
    if (nextIndex < 0) nextIndex = situations.length - 1;
    if (nextIndex >= situations.length) nextIndex = 0;

    loadSituationById(situations[nextIndex].id);
  }

  // Random Situation
  function pickRandomSituation() {
    const situations = getSituations();
    if (situations.length === 0) return;

    // Prioritize unplayed situations
    const unplayed = situations.filter(s => getSituationTrades(s.id).length === 0);
    const pool = unplayed.length > 0 ? unplayed : situations;
    const randomSit = pool[Math.floor(Math.random() * pool.length)];

    loadSituationById(randomSit.id);
    closeModal();
    showToast(`🎲 Random Practice: Loaded ${randomSit.name}`);
  }

  // Bind Open/Close Buttons
  pickerBtns.forEach(btn => { if (btn) btn.addEventListener('click', openModal); });
  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (backdrop) backdrop.addEventListener('click', closeModal);

  // Bind Navigation Buttons
  prevBtns.forEach(btn => { if (btn) btn.addEventListener('click', () => stepSituation(-1)); });
  nextBtns.forEach(btn => { if (btn) btn.addEventListener('click', () => stepSituation(1)); });
  randomBtns.forEach(btn => { if (btn) btn.addEventListener('click', pickRandomSituation); });

  // Escape key closes modal
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal && modal.style.display === 'flex') {
      closeModal();
    }
  });

  // Filter chips in modal
  filterChips.forEach(chip => {
    chip.addEventListener('click', () => {
      filterChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentFilter = chip.getAttribute('data-filter') || 'all';
      renderSituationCards();
    });
  });

  // Search input
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      currentSearch = e.target.value;
      renderSituationCards();
    });
  }

  // Initial Label Setup
  if (engine.scenario) {
    updateSituationLabels(engine.scenario);
  }

  // Sync labels whenever engine changes state
  const origOnState = engine.onStateChange;
  engine.onStateChange = (state) => {
    if (origOnState) origOnState(state);
    if (engine.scenario) updateSituationLabels(engine.scenario);
  };
}

// ============================================================================
// 6c. DEDICATED TOUCH-FIRST UI MANAGER FOR IPAD & IPHONE
// ============================================================================
function setupTouchUIManager(engine) {
  // DOM Elements - Top Bar
  const touchTopBar = document.getElementById('touchTopBar');
  const touchSitBtn = document.getElementById('touchSitBtn');
  const touchSitName = document.getElementById('touchSitName');
  const touchTfBtn = document.getElementById('touchTfBtn');
  const touchTfName = document.getElementById('touchTfName');
  const touchPriceBadge = document.getElementById('touchPriceBadge');
  const touchPnlBadge = document.getElementById('touchPnlBadge');
  const touchSessionsBtn = document.getElementById('touchSessionsToggleBtn');
  const touchSmtBtn = document.getElementById('touchSmtToggleBtn');
  const touchModeToggleBtn = document.getElementById('touchModeToggleBtn');
  const desktopTouchModeBtn = document.getElementById('desktopTouchModeBtn');

  // DOM Elements - Replay Mini-Bar
  const touchReplayBar = document.getElementById('touchReplayBar');
  const touchPlayPauseBtn = document.getElementById('touchPlayPauseBtn');
  const touchStepBackBtn = document.getElementById('touchStepBackBtn');
  const touchStepFwdBtn = document.getElementById('touchStepFwdBtn');
  const touchSpeedChips = document.querySelectorAll('#touchSpeedGroup .touch-speed-chip');
  const touchScrubber = document.getElementById('touchScrubber');
  const touchTimeReadout = document.getElementById('touchTimeReadout');

  // DOM Elements - Bottom Thumb Dock
  const touchDockTradeBtn = document.getElementById('touchDockTradeBtn');
  const touchDockToolsBtn = document.getElementById('touchDockToolsBtn');
  const touchDockReplayBtn = document.getElementById('touchDockReplayBtn');
  const touchDockJournalBtn = document.getElementById('touchDockJournalBtn');
  const touchDockRandomBtn = document.getElementById('touchDockRandomBtn');
  const touchJournalBadge = document.getElementById('touchJournalBadge');

  // DOM Elements - Sliding Action Sheets & Backdrop
  const touchBackdrop = document.getElementById('touchSheetBackdrop');
  const allTouchSheets = document.querySelectorAll('.touch-sheet');

  const touchTradeSheet = document.getElementById('touchTradeSheet');
  const touchToolsSheet = document.getElementById('touchToolsSheet');
  const touchTfSheet = document.getElementById('touchTfSheet');
  const touchJournalSheet = document.getElementById('touchJournalSheet');

  // Trade Sheet Controls
  const touchTradeLivePrice = document.getElementById('touchTradeLivePrice');
  const touchBuyBtn = document.getElementById('touchBuyBtn');
  const touchSellBtn = document.getElementById('touchSellBtn');
  const touchQtyMinusBtn = document.getElementById('touchQtyMinusBtn');
  const touchQtyPlusBtn = document.getElementById('touchQtyPlusBtn');
  const touchQtyValue = document.getElementById('touchQtyValue');
  const touchQtyChips = document.querySelectorAll('#touchQtyPresets .touch-qty-chip');
  const touchSlInput = document.getElementById('touchSlInput');
  const touchTpInput = document.getElementById('touchTpInput');
  const touchSlPresets = document.querySelectorAll('#touchSlPresets .touch-preset-chip');
  const touchSnapBracketBtn = document.getElementById('touchSnapBracketBtn');
  const touchOpenPosCard = document.getElementById('touchOpenPosCard');
  const touchPosSideTag = document.getElementById('touchPosSideTag');
  const touchPosPnlTag = document.getElementById('touchPosPnlTag');
  const touchPosEntryVal = document.getElementById('touchPosEntryVal');
  const touchPosCurrentVal = document.getElementById('touchPosCurrentVal');
  const touchClosePosBtn = document.getElementById('touchClosePosBtn');

  // Tools Sheet Controls
  const touchToolTiles = document.querySelectorAll('#touchToolsGrid .touch-tool-tile');
  const touchUndoBtn = document.getElementById('touchUndoBtn');
  const touchClearDrawingsBtn = document.getElementById('touchClearDrawingsBtn');
  const touchAutoFvgTile = document.getElementById('touchAutoFvgTile');

  // Timeframe Sheet Controls
  const touchTfBtns = document.querySelectorAll('#touchTfGrid .touch-tf-btn');

  // Journal Sheet Controls
  const touchJSimBalance = document.getElementById('touchJSimBalance');
  const touchJRealizedPnl = document.getElementById('touchJRealizedPnl');
  const touchJWinRate = document.getElementById('touchJWinRate');
  const touchJournalTradesList = document.getElementById('touchJournalTradesList');

  let currentQty = 1;

  // --- SHEET MANAGEMENT ---
  function openTouchSheet(sheet) {
    if (!sheet) return;
    allTouchSheets.forEach(s => s.classList.remove('open'));
    if (touchBackdrop) touchBackdrop.classList.add('open');
    sheet.classList.add('open');
    if (sheet === touchJournalSheet) renderTouchJournal();
    if (sheet === touchTradeSheet) syncTouchTradeSheet();
  }

  function closeAllTouchSheets() {
    allTouchSheets.forEach(s => s.classList.remove('open'));
    if (touchBackdrop) touchBackdrop.classList.remove('open');
  }

  if (touchBackdrop) {
    touchBackdrop.addEventListener('click', closeAllTouchSheets);
  }

  ['touchTradeCloseBtn', 'touchToolsCloseBtn', 'touchTfCloseBtn', 'touchJournalCloseBtn'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.addEventListener('click', closeAllTouchSheets);
  });

  // --- MODE SWITCHING & DEVICE DETECTION ---
  function isTouchDevice() {
    const ua = navigator.userAgent || '';
    const isMobileDevice = /iPad|iPhone|iPod|Android/i.test(ua);
    const isIPadOS = (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1 && !window.MSStream && screen.width <= 1366 && screen.height <= 1366);
    const isStandalone = (window.navigator.standalone === true) || (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
    return isMobileDevice || isIPadOS || isStandalone || (window.innerWidth <= 640 && ('ontouchstart' in window));
  }

  // Mark DOM if running as standalone home screen PWA
  const isStandaloneApp = (window.navigator.standalone === true) || (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
  if (isStandaloneApp) {
    document.documentElement.classList.add('standalone-mode');
    document.body.classList.add('standalone-mode');
  }

  function setTouchMode(enable, notify = true) {
    closeAllTouchSheets();
    if (enable) {
      document.body.classList.add('touch-ui-active');
      localStorage.setItem('pb_ui_mode', 'touch');
      if (notify) showToast('📱 Touch-First UI Activated');
    } else {
      document.body.classList.remove('touch-ui-active');
      localStorage.setItem('pb_ui_mode', 'desktop');
      if (notify) showToast('🖥️ Desktop Terminal Activated');
    }

    // Smoothly re-render and resize the chart canvas to match dimensions
    setTimeout(() => {
      engine.resize();
      engine.render();
      if (engine.secondaryEngine) {
        engine.secondaryEngine.resize();
        engine.secondaryEngine.render();
      }
    }, 120);
  }

  // Bind Switch Buttons
  if (desktopTouchModeBtn) {
    desktopTouchModeBtn.addEventListener('click', () => setTouchMode(true));
  }
  if (touchModeToggleBtn) {
    touchModeToggleBtn.addEventListener('click', () => setTouchMode(false));
  }

  // Load Preference or Auto-Detect (Standalone home screen apps always default to touch mode)
  const savedMode = localStorage.getItem('pb_ui_mode');
  if (savedMode === 'touch' || isStandaloneApp) {
    setTouchMode(true, false);
  } else if (savedMode === 'desktop') {
    setTouchMode(false, false);
  } else {
    // Auto-detect touch devices
    if (isTouchDevice()) {
      setTouchMode(true, false);
    }
  }

  // --- TOP BAR ACTIONS ---
  if (touchTfBtn) {
    touchTfBtn.addEventListener('click', () => openTouchSheet(touchTfSheet));
  }

  if (touchSessionsBtn) {
    touchSessionsBtn.addEventListener('click', () => {
      const active = engine.toggleSessions();
      touchSessionsBtn.classList.toggle('active', !!active);
      showToast(`🕒 Multi-Session Levels: ${active ? 'ON' : 'OFF'}`);
    });
  }

  if (touchSmtBtn) {
    touchSmtBtn.addEventListener('click', () => {
      const currentLayout = engine.layoutMode || 'single';
      const nextLayout = currentLayout === 'dual' ? 'single' : 'dual';
      engine.setLayoutMode(nextLayout);
      touchSmtBtn.classList.toggle('active', nextLayout === 'dual');
      showToast(nextLayout === 'dual' ? '◫ SMT Dual Chart ON (NQ vs ES)' : '⬛ Single Chart Mode');
    });
  }

  // --- BOTTOM DOCK ACTIONS ---
  if (touchDockTradeBtn) {
    touchDockTradeBtn.addEventListener('click', () => openTouchSheet(touchTradeSheet));
  }

  if (touchDockToolsBtn) {
    touchDockToolsBtn.addEventListener('click', () => openTouchSheet(touchToolsSheet));
  }

  if (touchDockReplayBtn) {
    touchDockReplayBtn.addEventListener('click', () => {
      if (!touchReplayBar) return;
      const isHidden = touchReplayBar.classList.contains('minimized');
      if (isHidden) {
        touchReplayBar.classList.remove('minimized');
        touchDockReplayBtn.classList.add('active');
      } else {
        touchReplayBar.classList.add('minimized');
        touchDockReplayBtn.classList.remove('active');
      }
    });
  }

  if (touchDockJournalBtn) {
    touchDockJournalBtn.addEventListener('click', () => openTouchSheet(touchJournalSheet));
  }

  // --- REPLAY MINI-BAR CONTROLS ---
  if (touchPlayPauseBtn) {
    touchPlayPauseBtn.addEventListener('click', () => {
      engine.togglePlay();
      syncReplayPlayState();
    });
  }

  if (touchStepBackBtn) {
    touchStepBackBtn.addEventListener('click', () => {
      engine.stepBackward();
      syncTouchState();
    });
  }

  if (touchStepFwdBtn) {
    touchStepFwdBtn.addEventListener('click', () => {
      engine.stepForward();
      syncTouchState();
    });
  }

  touchSpeedChips.forEach(chip => {
    chip.addEventListener('click', () => {
      touchSpeedChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const speed = parseFloat(chip.getAttribute('data-speed')) || 1.0;
      engine.setSpeed(speed);
      showToast(`⚡ Replay Speed: ${speed}x`);
    });
  });

  if (touchScrubber) {
    touchScrubber.addEventListener('input', (e) => {
      const pct = parseFloat(e.target.value);
      engine.seekToPercent(pct);
      syncTouchState();
    });
  }

  function syncReplayPlayState() {
    if (!touchPlayPauseBtn) return;
    if (engine.isPlaying) {
      touchPlayPauseBtn.textContent = '⏸ PAUSE';
      touchPlayPauseBtn.classList.add('playing');
    } else {
      touchPlayPauseBtn.textContent = '▶ PLAY';
      touchPlayPauseBtn.classList.remove('playing');
    }
  }

  // --- TRADE EXECUTION SHEET ---
  function updateQtyDisplay(qty) {
    currentQty = Math.max(1, Math.min(50, qty));
    if (touchQtyValue) touchQtyValue.textContent = `${currentQty} ${currentQty === 1 ? 'Contract' : 'Contracts'}`;
    touchQtyChips.forEach(chip => {
      const val = parseInt(chip.getAttribute('data-qty'), 10);
      chip.classList.toggle('active', val === currentQty);
    });
  }

  if (touchQtyMinusBtn) {
    touchQtyMinusBtn.addEventListener('click', () => updateQtyDisplay(currentQty - 1));
  }
  if (touchQtyPlusBtn) {
    touchQtyPlusBtn.addEventListener('click', () => updateQtyDisplay(currentQty + 1));
  }

  touchQtyChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const qty = parseInt(chip.getAttribute('data-qty'), 10) || 1;
      updateQtyDisplay(qty);
    });
  });

  touchSlPresets.forEach(chip => {
    chip.addEventListener('click', () => {
      const curPrice = engine.getCurrentPrice();
      if (!curPrice) return;
      const pts = parseFloat(chip.getAttribute('data-offset')) || 10;
      if (touchSlInput) {
        touchSlInput.value = (curPrice - pts).toFixed(2);
      }
      showToast(`Set SL to ${pts} pts below price`);
    });
  });

  if (touchSnapBracketBtn) {
    touchSnapBracketBtn.addEventListener('click', () => {
      const drawings = engine.drawings || [];
      const posDrawing = [...drawings].reverse().find(d => d.type === 'long_pos' || d.type === 'short_pos');
      if (!posDrawing) {
        showToast('Draw a Long or Short position bracket first, then tap Snap');
        return;
      }
      if (touchSlInput && posDrawing.slPrice != null) {
        touchSlInput.value = posDrawing.slPrice.toFixed(2);
      }
      if (touchTpInput && posDrawing.tpPrice != null) {
        touchTpInput.value = posDrawing.tpPrice.toFixed(2);
      }
      showToast(`🎯 Snapped SL (${posDrawing.slPrice?.toFixed(2)}) & TP (${posDrawing.tpPrice?.toFixed(2)})`);
    });
  }

  if (touchBuyBtn) {
    touchBuyBtn.addEventListener('click', () => {
      const sl = parseFloat(touchSlInput?.value) || null;
      const tp = parseFloat(touchTpInput?.value) || null;
      engine.executeOrder('BUY', 'MARKET', null, currentQty, sl, tp);
      syncTouchTradeSheet();
      syncTouchState();
      showToast(`🟢 Executed BUY ${currentQty}x MNQ`);
    });
  }

  if (touchSellBtn) {
    touchSellBtn.addEventListener('click', () => {
      const sl = parseFloat(touchSlInput?.value) || null;
      const tp = parseFloat(touchTpInput?.value) || null;
      engine.executeOrder('SELL', 'MARKET', null, currentQty, sl, tp);
      syncTouchTradeSheet();
      syncTouchState();
      showToast(`🔴 Executed SELL ${currentQty}x MNQ`);
    });
  }

  if (touchClosePosBtn) {
    touchClosePosBtn.addEventListener('click', () => {
      engine.closeAllPositions();
      syncTouchTradeSheet();
      syncTouchState();
      showToast('✋ Closed All Positions');
    });
  }

  function syncTouchTradeSheet() {
    const curPrice = engine.getCurrentPrice();
    if (touchTradeLivePrice && curPrice) {
      touchTradeLivePrice.textContent = `$${curPrice.toFixed(2)}`;
    }

    const pos = (engine.account && engine.account.positions && engine.account.positions.length > 0)
      ? engine.account.positions[0]
      : null;

    if (pos && touchOpenPosCard) {
      touchOpenPosCard.style.display = 'flex';
      const side = pos.side.toUpperCase();
      const pnl = pos.unrealizedPnl || 0;
      const points = curPrice ? (side === 'BUY' ? curPrice - pos.entryPrice : pos.entryPrice - curPrice) : 0;
      const isWin = pnl >= 0;

      if (touchPosSideTag) {
        touchPosSideTag.textContent = `${side === 'BUY' ? 'LONG' : 'SHORT'} ${pos.size}x`;
        touchPosSideTag.style.color = side === 'BUY' ? '#10b981' : '#ef4444';
      }
      if (touchPosPnlTag) {
        touchPosPnlTag.textContent = `${isWin ? '+' : ''}$${pnl.toFixed(2)} (${points >= 0 ? '+' : ''}${points.toFixed(2)} pts)`;
        touchPosPnlTag.style.color = isWin ? '#10b981' : '#ef4444';
      }
      if (touchPosEntryVal) touchPosEntryVal.textContent = `$${pos.entryPrice.toFixed(2)}`;
      if (touchPosCurrentVal) touchPosCurrentVal.textContent = curPrice ? `$${curPrice.toFixed(2)}` : '--';
    } else if (touchOpenPosCard) {
      touchOpenPosCard.style.display = 'none';
    }
  }

  // --- DRAWING TOOLS SHEET ---
  touchToolTiles.forEach(tile => {
    const tool = tile.getAttribute('data-tool');
    if (!tool) return;
    tile.addEventListener('click', () => {
      if (tool === 'toggle_automarkup') {
        const active = engine.toggleAutoMarkup();
        tile.classList.toggle('active', !!active);
        showToast(`⚡ Auto FVGs: ${active ? 'ON' : 'OFF'}`);
        return;
      }
      touchToolTiles.forEach(t => t.classList.remove('active'));
      tile.classList.add('active');
      engine.setTool(tool);

      // Sync active state on desktop toolbar
      const desktopBtn = document.querySelector(`#tvDrawingToolbar [data-tool="${tool}"]`);
      if (desktopBtn) {
        document.querySelectorAll('#tvDrawingToolbar .tool-btn').forEach(b => b.classList.remove('active'));
        desktopBtn.classList.add('active');
      }

      closeAllTouchSheets();
      showToast(`✏️ ${tool.toUpperCase()} Tool Active • Tap & drag on chart`);
    });
  });

  if (touchUndoBtn) {
    touchUndoBtn.addEventListener('click', () => {
      engine.undo();
      showToast('↩️ Undid last markup');
    });
  }

  if (touchClearDrawingsBtn) {
    touchClearDrawingsBtn.addEventListener('click', () => {
      engine.clearDrawings();
      touchToolTiles.forEach(t => t.classList.remove('active'));
      const pointerTile = document.querySelector('#touchToolsGrid [data-tool="pointer"]');
      if (pointerTile) pointerTile.classList.add('active');
      const desktopPointerBtn = document.querySelector('#tvDrawingToolbar [data-tool="pointer"]');
      if (desktopPointerBtn) {
        document.querySelectorAll('#tvDrawingToolbar .tool-btn').forEach(b => b.classList.remove('active'));
        desktopPointerBtn.classList.add('active');
      }
      closeAllTouchSheets();
      showToast('🗑️ Cleared all markups');
    });
  }

  // --- TIMEFRAME SHEET ---
  touchTfBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tf = btn.getAttribute('data-tf');
      if (!tf) return;
      touchTfBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      engine.setTimeframe(tf);
      if (touchTfName) touchTfName.textContent = tf;
      closeAllTouchSheets();
      showToast(`🕒 Timeframe: ${tf}`);
    });
  });

  // --- TRADE JOURNAL SHEET ---
  function renderTouchJournal() {
    if (!window.ReplayJournalStore) return;
    const trades = window.ReplayJournalStore.getTrades();
    const stats = window.ReplayJournalStore.getStats();

    if (touchJSimBalance) touchJSimBalance.textContent = `$${stats.simulatedBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    if (touchJRealizedPnl) {
      const isPos = stats.realizedPnl >= 0;
      touchJRealizedPnl.textContent = `${isPos ? '+' : ''}$${stats.realizedPnl.toFixed(2)}`;
      touchJRealizedPnl.style.color = isPos ? '#10b981' : '#ef4444';
    }
    if (touchJWinRate) {
      touchJWinRate.textContent = `${stats.winRate}% (${stats.wins}W - ${stats.losses}L)`;
    }
    if (touchJournalBadge) {
      touchJournalBadge.textContent = trades.length;
    }

    if (!touchJournalTradesList) return;
    if (trades.length === 0) {
      touchJournalTradesList.innerHTML = '<div class="touch-empty-journal">No closed trades yet. Use the Trade pad to take trades!</div>';
      return;
    }

    touchJournalTradesList.innerHTML = [...trades].reverse().map(t => {
      const isWin = t.outcome === 'WIN';
      const isLoss = t.outcome === 'LOSS';
      const outcomeClass = isWin ? 'win' : (isLoss ? 'loss' : 'be');
      const badgeText = isWin ? '🎯 WIN' : (isLoss ? '🛑 LOSS' : '⚖️ BE');
      const pnlText = `${t.netPnl >= 0 ? '+' : ''}$${t.netPnl.toFixed(2)}`;
      const ptsText = `${t.points >= 0 ? '+' : ''}${t.points.toFixed(2)} pts`;
      return `
        <div class="touch-trade-item ${outcomeClass}">
          <div class="touch-trade-left">
            <span class="touch-trade-tag" style="color: ${isWin ? '#10b981' : (isLoss ? '#ef4444' : '#94a3b8')}">${badgeText} • ${t.side} ${t.size}x</span>
            <span class="touch-trade-time">${t.exitTime || t.entryTime} (${t.scenarioName || 'Sit'})</span>
          </div>
          <div class="touch-trade-right">
            <span class="touch-trade-pnl" style="color: ${isWin ? '#10b981' : (isLoss ? '#ef4444' : '#94a3b8')}">${pnlText}</span>
            <span class="touch-trade-pts">${ptsText}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  // --- STATE SYNCHRONIZATION ---
  function syncTouchState() {
    const curPrice = engine.getCurrentPrice();
    if (curPrice && touchPriceBadge) {
      touchPriceBadge.textContent = `$${curPrice.toFixed(2)}`;
    }

    // P&L Sync
    const pos = (engine.account && engine.account.positions && engine.account.positions.length > 0)
      ? engine.account.positions[0]
      : null;
    const realized = (engine.account && engine.account.realizedPnl) || 0;
    const unrealized = pos ? (pos.unrealizedPnl || 0) : 0;
    const totalPnl = realized + unrealized;

    if (touchPnlBadge) {
      const isPos = totalPnl >= 0;
      touchPnlBadge.textContent = `${isPos ? '+' : ''}$${totalPnl.toFixed(2)}`;
      touchPnlBadge.className = `touch-pnl-pill ${isPos ? '' : 'neg'}`;
    }

    // Time Readout & Scrubber
    const curTime = engine.getCurrentTime();
    if (curTime && touchTimeReadout) {
      const d = new Date(curTime * 1000);
      const hours = d.getUTCHours().toString().padStart(2, '0');
      const mins = d.getUTCMinutes().toString().padStart(2, '0');
      const secs = d.getUTCSeconds().toString().padStart(2, '0');
      touchTimeReadout.textContent = `${hours}:${mins}:${secs} NY`;
    }

    if (touchScrubber && engine.raw1m && engine.raw1m.length > 0) {
      const pct = (engine.current1mIndex / (engine.raw1m.length - 1)) * 100;
      touchScrubber.value = Math.round(pct);
    }

    // Timeframe
    if (touchTfName && engine.activeTf) {
      touchTfName.textContent = engine.activeTf;
    }

    // Journal count badge
    if (touchJournalBadge && window.ReplayJournalStore) {
      touchJournalBadge.textContent = window.ReplayJournalStore.getTrades().length;
    }

    syncReplayPlayState();
    syncTouchTradeSheet();
  }

  // Hook into engine events
  const existingOnState = engine.onStateChange;
  engine.onStateChange = (state) => {
    if (existingOnState) existingOnState(state);
    syncTouchState();
  };

  const existingOnTrade = engine.onTradeEvent;
  engine.onTradeEvent = (event) => {
    if (existingOnTrade) existingOnTrade(event);
    syncTouchTradeSheet();
    syncTouchState();
    renderTouchJournal();
  };

  // Initial Sync
  syncTouchState();
  renderTouchJournal();
}

function setupScenarioModal(engine) {
  const infoBtn = document.getElementById('scenarioInfoBtn');
  const modal = document.getElementById('scenarioModal');
  const closeBtn = document.getElementById('scenarioModalCloseBtn');
  const backdrop = document.getElementById('scenarioModalBackdrop');
  const titleEl = document.getElementById('scenarioModalTitle');
  const bodyEl = document.getElementById('scenarioModalBody');

  function openModal() {
    const sc = engine.scenario;
    if (!sc) return;

    const pb = sc.playbook || sc.suggestedPlaybook || {};

    titleEl.textContent = `📚 ${sc.name} Playbook`;
    bodyEl.innerHTML = `
      <div style="margin-bottom: 14px;">
        <span class="step-tag">${sc.category || 'Blind Market Replay'}</span>
        <span style="font-size: 11px; color: var(--text-muted); margin-left: 8px;">Difficulty: <strong>${sc.difficulty || 'Standard'}</strong></span>
        <div style="font-size: 12px; color: #60a5fa; margin-top: 4px;">📅 ${sc.symbol || 'MNQ'} • 2-Day Contiguous Dataset</div>
      </div>

      <p style="font-size: 13px; line-height: 1.5; color: #e5e7eb; margin-bottom: 16px;">${sc.description || 'Authentic historical market dataset. Pan left to inspect the entire previous trading day high and low.'}</p>

      <div class="sidebar-card" style="margin-bottom: 16px;">
        <h4 style="font-size: 12px; color: var(--accent-cyan); margin-bottom: 8px;">🎯 Suggested PB Trades Playbook:</h4>
        <div style="font-size: 12px; display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
          <div>Bias: <strong>${pb.bias || 'Dynamic Read'}</strong></div>
          <div>Window: <strong>${pb.entryWindow || '09:30 - 11:00 AM NY'}</strong></div>
          <div>Setup: <strong>${pb.expectedSetup || 'FVG Retest / Liquidity Sweep'}</strong></div>
          <div>Target: <strong>${pb.target || 'Opposing Liquidity Pool'}</strong></div>
        </div>
      </div>

      <h4 style="font-size: 12px; color: #fff; margin-bottom: 8px;">📝 Key Practice Objectives:</h4>
      <ul style="font-size: 12px; color: var(--text-muted); padding-left: 18px; line-height: 1.6;">
        ${(sc.learningGoals || [
          "Pan back to mark Previous Day High (PDH) and Previous Day Low (PDL)",
          "Identify Asia & London liquidity sweeps before the 09:30 AM NY Open",
          "Execute ICT Silver Bullet, Fair Value Gap (FVG), or Equilibrium setups without hindsight bias"
        ]).map(g => `<li>${g}</li>`).join('')}
      </ul>
    `;
    modal.style.display = 'flex';
  }

  function closeModal() {
    modal.style.display = 'none';
  }

  if (infoBtn) infoBtn.addEventListener('click', openModal);
  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (backdrop) backdrop.addEventListener('click', closeModal);
}

// ============================================================================
// 7b. LINE TEXT / LABEL MODAL CONTROLLER (Centered ---text--- on lines)
// ============================================================================
let activeLineShapeForLabel = null;
let activeLineLabelSaveCallback = null;

window.openLineLabelModal = function(shape, onSave) {
  const modal = document.getElementById('lineLabelModal');
  const input = document.getElementById('lineLabelInput');
  const backdrop = document.getElementById('lineLabelModalBackdrop');
  const closeBtn = document.getElementById('closeLineLabelBtn');
  const cancelBtn = document.getElementById('cancelLineLabelBtn');
  const saveBtn = document.getElementById('saveLineLabelBtn');
  const clearBtn = document.getElementById('clearLineLabelBtn');
  const chipBtns = document.querySelectorAll('.line-chip-btn');

  if (!modal || !input) return;

  activeLineShapeForLabel = shape;
  activeLineLabelSaveCallback = onSave;

  input.value = (shape && shape.text) ? shape.text : '';
  modal.style.display = 'flex';

  setTimeout(() => {
    input.focus();
    input.select();
  }, 50);

  function closeLineModal() {
    modal.style.display = 'none';
    activeLineShapeForLabel = null;
    activeLineLabelSaveCallback = null;
  }

  function applyLabel() {
    if (activeLineShapeForLabel) {
      const val = input.value.trim();
      activeLineShapeForLabel.text = val;
      if (typeof activeLineLabelSaveCallback === 'function') {
        activeLineLabelSaveCallback();
      }
      showToast(val ? `🏷️ Line labeled: "${val}"` : "🏷️ Line label cleared");
    }
    closeLineModal();
  }

  function clearLabel() {
    input.value = '';
    if (activeLineShapeForLabel) {
      activeLineShapeForLabel.text = '';
      if (typeof activeLineLabelSaveCallback === 'function') {
        activeLineLabelSaveCallback();
      }
      showToast("🏷️ Line label cleared");
    }
    closeLineModal();
  }

  // Bind handlers once
  if (!modal._handlersBound) {
    if (closeBtn) closeBtn.onclick = closeLineModal;
    if (cancelBtn) cancelBtn.onclick = closeLineModal;
    if (backdrop) backdrop.onclick = closeLineModal;
    if (saveBtn) saveBtn.onclick = applyLabel;
    if (clearBtn) clearBtn.onclick = clearLabel;

    input.onkeydown = function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        applyLabel();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        closeLineModal();
      }
    };

    chipBtns.forEach(chip => {
      chip.onclick = function() {
        const textVal = chip.getAttribute('data-text');
        if (textVal) {
          input.value = textVal;
          input.focus();
        }
      };
    });

    modal._handlersBound = true;
  }
};

// ============================================================================
// 8. PB TRADES "ICT FOR DUMMIES" ACADEMY MODULES & EXAM
// ============================================================================
let activePbModuleId = "pb-module-1";
let activePbQuizIndex = 0;

function initPbTradesAcademy() {
  renderPbAcademyNav();
  renderPbAcademyContent(activePbModuleId);
  renderPbQuiz(activePbQuizIndex);
}

function renderPbAcademyNav() {
  const container = document.getElementById('pbAcademyModuleNav');
  if (!container || !window.PB_ACADEMY_DATA) return;

  container.innerHTML = window.PB_ACADEMY_DATA.modules.map(mod => {
    const isActive = mod.id === activePbModuleId;
    return `
      <div class="module-nav-item ${isActive ? 'active' : ''}" onclick="selectPbAcademyModule('${mod.id}')">
        <div style="font-size: 10px; color: var(--accent-cyan); font-weight: 700;">${mod.badge}</div>
        <div class="module-nav-title">${mod.title}</div>
        <div class="module-nav-desc">${mod.description}</div>
      </div>
    `;
  }).join('');
}

window.selectPbAcademyModule = function(id) {
  activePbModuleId = id;
  renderPbAcademyNav();
  renderPbAcademyContent(id);
};

function renderPbAcademyContent(modId) {
  const container = document.getElementById('pbAcademyModuleContent');
  if (!container || !window.PB_ACADEMY_DATA) return;

  const mod = window.PB_ACADEMY_DATA.modules.find(m => m.id === modId);
  if (!mod) return;

  container.innerHTML = `
    <div class="module-header">
      <div style="font-size: 11px; color: var(--accent-cyan); font-weight: 700; text-transform: uppercase;">${mod.badge} • ${mod.readTime}</div>
      <h2>${mod.title}</h2>
      <p style="color: var(--text-muted); font-size: 13px;">${mod.description}</p>
    </div>
    ${mod.content}
    ${renderAcademyChartMarkupSection(mod)}
  `;

  // Render the real chart onto the canvas after DOM injection
  if (mod.chartExample) {
    setTimeout(() => {
      renderRealAcademyChart(mod.chartExample);
    }, 40);
  }
}

function renderAcademyChartMarkupSection(mod) {
  if (!mod.chartExample) return '';
  const ex = mod.chartExample;

  return `
    <div class="academy-real-chart-card" style="margin-top: 24px; background: #0c121e; border: 1px solid #1e293b; border-radius: 12px; overflow: hidden; box-shadow: 0 8px 24px rgba(0,0,0,0.4);">
      <div class="chart-card-header" style="background: #111827; padding: 12px 16px; border-bottom: 1px solid #1e293b; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
        <div>
          <div style="font-size: 13px; font-weight: 800; color: #38bdf8;">${ex.title}</div>
          <div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">${ex.subtitle}</div>
        </div>
        <div style="display: flex; gap: 8px; align-items: center;">
          <span class="badge" style="background: rgba(14, 165, 233, 0.2); color: #38bdf8; border: 1px solid rgba(14, 165, 233, 0.4); padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: 700;">${ex.symbol} • ${ex.tf}</span>
          <button class="btn btn-secondary btn-sm" onclick="openAcademyScenarioInReplay('${ex.scenarioId}')" style="background: #1e293b; border: 1px solid #334155; color: #f1f5f9; padding: 4px 10px; font-size: 11px; border-radius: 6px; cursor: pointer;">
            ⏮️ Open in Full Replay
          </button>
        </div>
      </div>

      <div style="position: relative; width: 100%; height: 380px; background: #080c14;">
        <canvas id="academyExampleCanvas" style="width: 100%; height: 100%; display: block;"></canvas>
      </div>

      <div style="padding: 14px 16px; background: #0f172a; border-top: 1px solid #1e293b;">
        <div style="font-size: 11px; font-weight: 800; color: #f59e0b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
          🔍 PB Trades Institutional Order Flow Breakdown:
        </div>
        <ul style="margin: 0; padding-left: 18px; font-size: 12px; color: #cbd5e1; line-height: 1.6;">
          ${ex.breakdown.map(b => `<li style="margin-bottom: 6px;">${b}</li>`).join('')}
        </ul>
      </div>
    </div>
  `;
}

window.openAcademyScenarioInReplay = function(scenarioId) {
  const replayTabBtn = document.querySelector('[data-tab="replayTab"]');
  if (replayTabBtn) replayTabBtn.click();
  const select = document.getElementById('replayScenarioSelect');
  if (select) {
    select.value = scenarioId;
    if (window.replayEngine) {
      window.replayEngine.loadScenario(scenarioId);
      showToast(`Loaded Academy Scenario into Replay: ${window.replayEngine.scenario.name}`);
    }
  }
};

function renderRealAcademyChart(chartEx) {
  const canvas = document.getElementById('academyExampleCanvas');
  if (!canvas || !window.REPLAY_SCENARIOS) return;

  const scenario = window.REPLAY_SCENARIOS.getById(chartEx.scenarioId);
  if (!scenario || !scenario.raw1m || scenario.raw1m.length === 0) return;

  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const w = rect.width || canvas.parentElement.clientWidth || 800;
  const h = 380;
  canvas.width = w * dpr;
  canvas.height = h * dpr;

  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  // 1. Slice specific 1m bars if sliceStart is specified, else take sliceEnd
  let rawSlice;
  if (chartEx.sliceStart !== undefined && chartEx.sliceEnd !== undefined) {
    rawSlice = scenario.raw1m.slice(chartEx.sliceStart, chartEx.sliceEnd);
  } else if (chartEx.sliceEnd !== undefined) {
    const end = chartEx.sliceEnd;
    const start = Math.max(0, end - 225); // ~45 5m candles
    rawSlice = scenario.raw1m.slice(start, end);
  } else {
    rawSlice = scenario.raw1m.slice(Math.max(0, scenario.raw1m.length - 225));
  }

  // Aggregate candles to timeframe (default 5m)
  const visibleCandles = window.REPLAY_SCENARIOS.aggregate(rawSlice, chartEx.tf || '5m');
  if (visibleCandles.length === 0) return;

  // 2. Compute price bounds across both candles AND annotations so all markups fit comfortably!
  let minPrice = Infinity;
  let maxPrice = -Infinity;
  visibleCandles.forEach(c => {
    if (c.low < minPrice) minPrice = c.low;
    if (c.high > maxPrice) maxPrice = c.high;
  });

  if (chartEx.annotations) {
    chartEx.annotations.forEach(ann => {
      if (ann.type === 'box') {
        const lo = Math.min(ann.y1, ann.y2);
        const hi = Math.max(ann.y1, ann.y2);
        if (lo < minPrice) minPrice = lo;
        if (hi > maxPrice) maxPrice = hi;
      } else if (ann.type === 'ray') {
        if (ann.y < minPrice) minPrice = ann.y;
        if (ann.y > maxPrice) maxPrice = ann.y;
      } else if (ann.type === 'position') {
        const lo = Math.min(ann.entry, ann.sl, ann.tp);
        const hi = Math.max(ann.entry, ann.sl, ann.tp);
        if (lo < minPrice) minPrice = lo;
        if (hi > maxPrice) maxPrice = hi;
      } else if (ann.type === 'dealing_range') {
        const lo = Math.min(ann.low, ann.high);
        const hi = Math.max(ann.low, ann.high);
        if (lo < minPrice) minPrice = lo;
        if (hi > maxPrice) maxPrice = hi;
      }
    });
  }

  const pad = (maxPrice - minPrice) * 0.12 || 2.0;
  minPrice -= pad;
  maxPrice += pad;
  const priceRange = maxPrice - minPrice;

  const chartWidth = w - 70;
  const chartHeight = h - 25;
  const barWidth = chartWidth / visibleCandles.length;
  const candleWidth = Math.max(3, barWidth * 0.72);

  const priceToY = (p) => chartHeight - ((p - minPrice) / priceRange) * chartHeight;

  // 3. Background
  ctx.fillStyle = '#080c14';
  ctx.fillRect(0, 0, w, h);

  // Background shading for dealing_range (Premium red tint, Discount green tint)
  if (chartEx.annotations) {
    chartEx.annotations.forEach(ann => {
      if (ann.type === 'dealing_range') {
        const yTop = priceToY(ann.high);
        const yBot = priceToY(ann.low);
        const eqPrice = (ann.low + ann.high) / 2;
        const yEq = priceToY(eqPrice);

        // Premium Zone (above EQ) - subtle crimson tint
        ctx.fillStyle = 'rgba(239, 68, 68, 0.07)';
        ctx.fillRect(0, yTop, chartWidth, yEq - yTop);

        // Discount Zone (below EQ) - subtle emerald tint
        ctx.fillStyle = 'rgba(16, 185, 129, 0.07)';
        ctx.fillRect(0, yEq, chartWidth, yBot - yEq);

        // Premium / Discount Watermark Labels
        ctx.font = 'bold 11px sans-serif';
        ctx.fillStyle = 'rgba(239, 68, 68, 0.35)';
        ctx.textAlign = 'left';
        ctx.fillText('🔴 PREMIUM ZONE (Sell / Short Only > 50% EQ)', 14, yTop + 20);

        ctx.fillStyle = 'rgba(16, 185, 129, 0.35)';
        ctx.fillText('🟢 DISCOUNT ZONE (Buy / Long Only < 50% EQ)', 14, yEq + 22);
      }
    });
  }

  // 4. Grid Lines & Price Axis
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
  ctx.lineWidth = 1;
  for (let i = 1; i <= 5; i++) {
    const y = (chartHeight / 6) * i;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(chartWidth, y);
    ctx.stroke();

    const p = maxPrice - (i / 6) * priceRange;
    ctx.fillStyle = '#64748b';
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(p.toFixed(2), chartWidth + 6, y + 3);
  }

  // Right price axis separator line
  ctx.strokeStyle = '#1e293b';
  ctx.beginPath();
  ctx.moveTo(chartWidth, 0);
  ctx.lineTo(chartWidth, chartHeight);
  ctx.stroke();

  // 5. Render Candlesticks First
  visibleCandles.forEach((c, i) => {
    const xCenter = i * barWidth + barWidth / 2;
    const isUp = c.close >= c.open;
    const bodyColor = isUp ? '#10b981' : '#ef4444';
    const wickColor = isUp ? '#34d399' : '#f87171';

    const yOpen = priceToY(c.open);
    const yClose = priceToY(c.close);
    const yHigh = priceToY(c.high);
    const yLow = priceToY(c.low);

    // Wick
    ctx.strokeStyle = wickColor;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(xCenter, yHigh);
    ctx.lineTo(xCenter, yLow);
    ctx.stroke();

    // Body
    ctx.fillStyle = bodyColor;
    const top = Math.min(yOpen, yClose);
    const hCandle = Math.max(2, Math.abs(yClose - yOpen));
    ctx.fillRect(xCenter - candleWidth / 2, top, candleWidth, hCandle);
  });

  // 6. Render Specialized Institutional Annotations
  if (chartEx.annotations) {
    chartEx.annotations.forEach(ann => {
      // A. Bar-Anchored or Percent Box (FVG, Order Blocks)
      if (ann.type === 'box') {
        const yTop = priceToY(Math.max(ann.y1, ann.y2));
        const yBot = priceToY(Math.min(ann.y1, ann.y2));
        
        let xStart, boxW;
        if (ann.startBar !== undefined) {
          xStart = ann.startBar * barWidth;
          const endB = ann.endBar !== undefined ? ann.endBar : Math.min(visibleCandles.length - 1, ann.startBar + 4);
          boxW = Math.max(barWidth * 1.5, (endB - ann.startBar + 1) * barWidth);
        } else {
          xStart = chartWidth * (ann.xPercent !== undefined ? ann.xPercent : 0.4);
          boxW = chartWidth * (ann.wPercent !== undefined ? ann.wPercent : 0.35);
        }

        // Shaded Box
        ctx.fillStyle = ann.color || 'rgba(16, 185, 129, 0.28)';
        ctx.fillRect(xStart, yTop, boxW, yBot - yTop);
        ctx.strokeStyle = ann.borderColor || '#10b981';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(xStart, yTop, boxW, yBot - yTop);

        // 50% CE dashed line inside FVG
        const midY = (yTop + yBot) / 2;
        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.beginPath();
        ctx.moveTo(xStart, midY);
        ctx.lineTo(xStart + boxW, midY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Label Badge
        ctx.fillStyle = 'rgba(10, 14, 23, 0.9)';
        ctx.font = 'bold 10px monospace';
        const tw = ctx.measureText(ann.label).width;
        ctx.fillRect(xStart + 4, yTop - 14, tw + 8, 14);
        ctx.strokeStyle = ann.borderColor || '#38bdf8';
        ctx.lineWidth = 0.8;
        ctx.strokeRect(xStart + 4, yTop - 14, tw + 8, 14);

        ctx.fillStyle = ann.borderColor || '#38bdf8';
        ctx.textAlign = 'left';
        ctx.fillText(ann.label, xStart + 8, yTop - 3);

      // B. Horizontal Liquidity Ray / Breakout Level
      } else if (ann.type === 'ray') {
        const y = priceToY(ann.y);
        ctx.strokeStyle = ann.color || '#a855f7';
        ctx.lineWidth = 1.8;
        ctx.setLineDash([5, 3]);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(chartWidth, y);
        ctx.stroke();
        ctx.setLineDash([]);

        // Label Pill
        const labelText = ` ${ann.label} (${ann.y.toFixed(2)}) `;
        ctx.font = 'bold 10px monospace';
        const tw = ctx.measureText(labelText).width;
        const xPos = Math.min(chartWidth - tw - 12, chartWidth * (ann.xPercent !== undefined ? ann.xPercent : 0.6));

        ctx.fillStyle = '#0a0e17';
        ctx.fillRect(xPos, y - 9, tw + 10, 18);
        ctx.strokeStyle = ann.color || '#a855f7';
        ctx.lineWidth = 1;
        ctx.strokeRect(xPos, y - 9, tw + 10, 18);

        ctx.fillStyle = ann.color || '#a855f7';
        ctx.textAlign = 'left';
        ctx.fillText(labelText, xPos + 4, y + 4);

      // C. TradingView-Style Long/Short Position Tool (Modules 5, 7, 12)
      } else if (ann.type === 'position') {
        const isLong = ann.isLong !== false;
        const entryY = priceToY(ann.entry);
        const slY = priceToY(ann.sl);
        const tpY = priceToY(ann.tp);

        let xStart = ann.startBar !== undefined ? ann.startBar * barWidth : chartWidth * 0.45;
        let boxW = ann.endBar !== undefined ? (ann.endBar - ann.startBar + 1) * barWidth : chartWidth * 0.35;
        const xEnd = Math.min(chartWidth - 10, xStart + boxW);

        // Profit Zone (Green)
        const profitTop = Math.min(entryY, tpY);
        const profitHeight = Math.abs(tpY - entryY);
        ctx.fillStyle = 'rgba(16, 185, 129, 0.22)';
        ctx.fillRect(xStart, profitTop, xEnd - xStart, profitHeight);
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.7)';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(xStart, profitTop, xEnd - xStart, profitHeight);

        // Loss Zone (Red)
        const lossTop = Math.min(entryY, slY);
        const lossHeight = Math.abs(slY - entryY);
        ctx.fillStyle = 'rgba(239, 68, 68, 0.22)';
        ctx.fillRect(xStart, lossTop, xEnd - xStart, lossHeight);
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.7)';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(xStart, lossTop, xEnd - xStart, lossHeight);

        // Entry Line
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(xStart, entryY);
        ctx.lineTo(xEnd, entryY);
        ctx.stroke();

        // Position Badges
        ctx.font = 'bold 9px monospace';
        // TP Target Badge
        ctx.fillStyle = '#10b981';
        ctx.fillText(`TARGET: ${ann.tp.toFixed(2)} (+${Math.abs(ann.tp - ann.entry).toFixed(1)} pts)`, xStart + 6, tpY + (isLong ? 12 : -5));
        // SL Invalidation Badge
        ctx.fillStyle = '#ef4444';
        ctx.fillText(`STOP: ${ann.sl.toFixed(2)} (-${Math.abs(ann.entry - ann.sl).toFixed(1)} pts)`, xStart + 6, slY + (isLong ? -5 : 12));
        // Center R:R Pill
        const rrText = ` R:R 1:${ann.rr || '2.0'} ${ann.riskLabel ? '• ' + ann.riskLabel : ''} `;
        const rrW = ctx.measureText(rrText).width;
        ctx.fillStyle = '#0a0e17';
        ctx.fillRect(xStart + 6, entryY - 8, rrW + 6, 16);
        ctx.strokeStyle = '#38bdf8';
        ctx.strokeRect(xStart + 6, entryY - 8, rrW + 6, 16);
        ctx.fillStyle = '#38bdf8';
        ctx.fillText(rrText, xStart + 8, entryY + 4);

      // D. Full Dealing Range with 50% Equilibrium (Module 9)
      } else if (ann.type === 'dealing_range') {
        const yHigh = priceToY(ann.high);
        const yLow = priceToY(ann.low);
        const eqPrice = (ann.low + ann.high) / 2;
        const yEq = priceToY(eqPrice);

        // 50% Equilibrium Line
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(0, yEq);
        ctx.lineTo(chartWidth, yEq);
        ctx.stroke();
        ctx.setLineDash([]);

        // Badges for 100%, 50%, and 0%
        const drawRangeTag = (y, text, color) => {
          ctx.font = 'bold 10px monospace';
          const tw = ctx.measureText(text).width;
          ctx.fillStyle = '#0a0e17';
          ctx.fillRect(chartWidth * 0.55, y - 9, tw + 10, 18);
          ctx.strokeStyle = color;
          ctx.strokeRect(chartWidth * 0.55, y - 9, tw + 10, 18);
          ctx.fillStyle = color;
          ctx.fillText(text, chartWidth * 0.55 + 5, y + 4);
        };

        drawRangeTag(yHigh, ` 100% RANGE HIGH: ${ann.high.toFixed(2)} `, '#10b981');
        drawRangeTag(yEq, ` 50.0% EQUILIBRIUM: ${eqPrice.toFixed(2)} `, '#38bdf8');
        drawRangeTag(yLow, ` 0.0% RANGE LOW: ${ann.low.toFixed(2)} `, '#ef4444');

      // E. SMT Divergence Intermarket Overlay (Module 10)
      } else if (ann.type === 'smt') {
        const y1 = priceToY(ann.nqLow1);
        const y2 = priceToY(ann.nqLow2);
        const x1 = ann.bar1 * barWidth + barWidth / 2;
        const x2 = ann.bar2 * barWidth + barWidth / 2;

        // NQ Trendline (Higher Low)
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        // SMT Divergence Callout Banner
        ctx.fillStyle = 'rgba(10, 14, 23, 0.94)';
        ctx.fillRect(16, 32, 340, 48);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(16, 32, 340, 48);

        ctx.font = 'bold 11px sans-serif';
        ctx.fillStyle = '#38bdf8';
        ctx.textAlign = 'left';
        ctx.fillText('⚡ BULLISH SMT DIVERGENCE CONFIRMED', 24, 48);
        ctx.font = '10px monospace';
        ctx.fillStyle = '#cbd5e1';
        ctx.fillText('• NQ: Made Higher Low (29,133 held discount)', 24, 62);
        ctx.fillText('• ES: Made Lower Low (Swept overnight stops)', 24, 74);
      }
    });
  }

  // 7. Watermark & Exchange Tag
  ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`CME Futures: ${chartEx.symbol} (${chartEx.tf || '5m'}) • PB Trades Model Study`, 12, 18);
}

function renderPbQuiz(index) {
  const container = document.getElementById('pbQuizContent');
  if (!container || !window.PB_ACADEMY_DATA || !window.PB_ACADEMY_DATA.quizzes) return;

  const quiz = window.PB_ACADEMY_DATA.quizzes[index];
  if (!quiz) return;

  container.innerHTML = `
    <div class="quiz-question" style="font-weight: 700; font-size: 14px; margin-bottom: 12px; color: #fff;">
      <span style="color: var(--accent-cyan);">Question ${index + 1} of ${window.PB_ACADEMY_DATA.quizzes.length}:</span> ${quiz.question}
    </div>
    <div id="pbQuizOptionsContainer">
      ${quiz.options.map((opt, idx) => `
        <div class="quiz-option" onclick="handlePbQuizAnswer(${index}, ${idx}, ${quiz.correct})">
          <strong>${String.fromCharCode(65 + idx)}.</strong> ${opt}
        </div>
      `).join('')}
    </div>
    <div id="pbQuizResultBox" style="display: none; margin-top: 12px;"></div>
  `;
}

window.handlePbQuizAnswer = function(qIdx, selectedIdx, correctIdx) {
  const options = document.querySelectorAll('#pbQuizOptionsContainer .quiz-option');
  options.forEach((opt, idx) => {
    opt.onclick = null;
    if (idx === correctIdx) opt.classList.add('correct');
    else if (idx === selectedIdx) opt.classList.add('incorrect');
  });

  const quiz = window.PB_ACADEMY_DATA.quizzes[qIdx];
  const resultBox = document.getElementById('pbQuizResultBox');
  if (resultBox) {
    resultBox.style.display = 'block';
    resultBox.className = 'quiz-explanation';
    resultBox.innerHTML = `
      <strong>${selectedIdx === correctIdx ? '✅ Correct! PB Trades Execution Mastered.' : '❌ Incorrect.'}</strong><br>
      <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">${quiz.explanation}</div>
      <div style="margin-top: 12px;">
        <button class="btn btn-secondary btn-sm" onclick="nextPbQuiz()">Next Drill ➔</button>
      </div>
    `;
  }
};

window.nextPbQuiz = function() {
  activePbQuizIndex = (activePbQuizIndex + 1) % window.PB_ACADEMY_DATA.quizzes.length;
  renderPbQuiz(activePbQuizIndex);
};

// ============================================================================
// 9. BACKTEST JOURNAL & PERFORMANCE LOG (PERSISTENT MULTI-SESSION JOURNAL)
// ============================================================================
const REPLAY_JOURNAL_STORAGE_KEY = 'pb_backtest_trade_journal_v2';
let currentJournalFilter = 'ALL';

window.ReplayJournalStore = {
  getTrades() {
    try {
      const data = localStorage.getItem(REPLAY_JOURNAL_STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Failed to read replay journal:', e);
      return [];
    }
  },

  addTrade(trade, scenarioInfo) {
    try {
      const trades = this.getTrades();
      const pnl = parseFloat(trade.pnl || 0);
      const pts = parseFloat(trade.pts || 0);
      const isWin = pnl > 0;
      const isLoss = pnl < 0;
      const outcome = isWin ? 'WIN' : (isLoss ? 'LOSS' : 'BREAKEVEN');

      const scenario = scenarioInfo || (window.replayEngine && window.replayEngine.scenario);
      const symbol = (scenario && scenario.symbol) || 'MNQ';
      const scenarioName = (scenario && scenario.name) || 'Historical Replay';
      const scenarioId = (scenario && scenario.id) || 'default';

      const now = new Date();
      const timeStr = now.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' +
                      now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      const record = {
        id: 'trade_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        timestamp: trade.exitTime || trade.time || Math.floor(Date.now() / 1000),
        dateTimeStr: timeStr,
        scenarioId,
        scenarioName,
        symbol,
        side: trade.side || 'BUY',
        size: trade.size || 1,
        model: trade.model || 'PB Trades Silver Bullet',
        entryPrice: parseFloat((trade.entryPrice || 0).toFixed(2)),
        exitPrice: parseFloat((trade.exitPrice || 0).toFixed(2)),
        pts: parseFloat(pts.toFixed(2)),
        pnl: parseFloat(pnl.toFixed(2)),
        outcome: outcome, // 'WIN' | 'LOSS' | 'BREAKEVEN'
        exitReason: trade.exitReason || trade.status || 'MANUAL'
      };

      trades.unshift(record);
      localStorage.setItem(REPLAY_JOURNAL_STORAGE_KEY, JSON.stringify(trades));

      updateBacktestJournalUI(currentJournalFilter);
      updateJournalBadgeCounters();
      return record;
    } catch (e) {
      console.error('Failed to add trade to journal:', e);
      return null;
    }
  },

  clearJournal() {
    try {
      localStorage.removeItem(REPLAY_JOURNAL_STORAGE_KEY);
      if (window.replayEngine && window.replayEngine.account) {
        window.replayEngine.account.trades = [];
      }
      updateBacktestJournalUI(currentJournalFilter);
      updateJournalBadgeCounters();
    } catch (e) {
      console.error('Failed to clear journal:', e);
    }
  },

  getStats() {
    const allTrades = this.getTrades();
    let wins = 0;
    let losses = 0;
    let breakevens = 0;
    let totalRealizedPnL = 0;
    let grossProfit = 0;
    let grossLoss = 0;

    allTrades.forEach(t => {
      totalRealizedPnL += t.pnl;
      if (t.outcome === 'WIN') {
        wins++;
        grossProfit += t.pnl;
      } else if (t.outcome === 'LOSS') {
        losses++;
        grossLoss += Math.abs(t.pnl);
      } else {
        breakevens++;
      }
    });

    const totalTrades = allTrades.length;
    const winRate = totalTrades > 0 ? ((wins / totalTrades) * 100).toFixed(1) : '0.0';
    const profitFactor = grossLoss > 0 ? (grossProfit / grossLoss).toFixed(2) : (grossProfit > 0 ? '99.99' : '0.00');

    return {
      totalTrades,
      wins,
      losses,
      breakevens,
      winRate,
      totalRealizedPnL,
      grossProfit,
      grossLoss,
      profitFactor
    };
  },

  exportCSV() {
    const trades = this.getTrades();
    if (trades.length === 0) {
      showToast("No trades to export.");
      return;
    }

    const headers = ["Date/Time", "Symbol", "Scenario", "Side", "Size", "Model", "Entry", "Exit", "Points", "PnL ($)", "Outcome", "Exit Trigger"];
    const rows = trades.map(t => [
      `"${t.dateTimeStr || ''}"`,
      `"${t.symbol}"`,
      `"${t.scenarioName}"`,
      t.side,
      t.size,
      `"${t.model}"`,
      t.entryPrice,
      t.exitPrice,
      t.pts,
      t.pnl,
      t.outcome,
      t.exitReason
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `pb_trades_journal_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("📥 Exported Journal to CSV!");
  }
};

function updateJournalBadgeCounters() {
  const store = window.ReplayJournalStore;
  if (!store) return;
  const trades = store.getTrades();
  const count = trades.length;

  const countBadge = document.getElementById('replayJournalCountBadge');
  if (countBadge) countBadge.textContent = count;

  const sidebarCountBadge = document.getElementById('sidebarJournalCountBadge');
  if (sidebarCountBadge) sidebarCountBadge.textContent = count;

  const filterAll = document.getElementById('jFilterCountAll');
  if (filterAll) filterAll.textContent = count;

  const winsCount = trades.filter(t => t.outcome === 'WIN').length;
  const filterWins = document.getElementById('jFilterCountWin');
  if (filterWins) filterWins.textContent = winsCount;

  const lossesCount = trades.filter(t => t.outcome === 'LOSS').length;
  const filterLosses = document.getElementById('jFilterCountLoss');
  if (filterLosses) filterLosses.textContent = lossesCount;
}

function updateBacktestJournalUI(filterOutcome = currentJournalFilter) {
  currentJournalFilter = filterOutcome;
  const store = window.ReplayJournalStore;
  if (!store) return;

  const stats = store.getStats();
  const allTrades = store.getTrades();
  const trades = filterOutcome === 'ALL'
    ? allTrades
    : allTrades.filter(t => t.outcome === filterOutcome);

  const balEl = document.getElementById('paperBalanceDisplay');
  const pnlEl = document.getElementById('paperUnrealizedDisplay');
  const winRateEl = document.getElementById('paperWinRateDisplay');
  const pfEl = document.getElementById('paperProfitFactorDisplay');

  const startBalance = 25000.00;
  const curBalance = startBalance + stats.totalRealizedPnL;

  if (balEl) balEl.textContent = `$${curBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (pnlEl) {
    pnlEl.textContent = `${stats.totalRealizedPnL >= 0 ? '+' : ''}$${stats.totalRealizedPnL.toFixed(2)}`;
    pnlEl.style.color = stats.totalRealizedPnL >= 0 ? 'var(--bullish)' : 'var(--bearish)';
  }
  if (winRateEl) {
    winRateEl.textContent = `${stats.winRate}% (${stats.wins}W - ${stats.losses}L)`;
    winRateEl.style.color = parseFloat(stats.winRate) >= 50 ? 'var(--bullish)' : (stats.totalTrades > 0 ? 'var(--bearish)' : 'inherit');
  }
  if (pfEl) pfEl.textContent = stats.profitFactor;

  // Render Table
  const tbody = document.getElementById('backtestJournalTbody');
  if (tbody) {
    if (trades.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="10" style="text-align: center; color: var(--text-muted); padding: 32px 16px;">
            <div style="font-size: 24px; margin-bottom: 8px;">📓</div>
            <div style="font-weight: 600; color: var(--text-light); margin-bottom: 4px;">No ${filterOutcome !== 'ALL' ? filterOutcome.toLowerCase() + ' ' : ''}trades recorded in journal yet</div>
            <div style="font-size: 11px;">Execute trades in the Replay Backtest simulator using Market or Limit orders. Once Take Profit or Stop Loss is reached, your results will be logged here.</div>
          </td>
        </tr>
      `;
    } else {
      tbody.innerHTML = trades.map(t => {
        const isBull = t.side === 'BUY';
        const isWin = t.outcome === 'WIN';
        const isLoss = t.outcome === 'LOSS';
        const outcomeBadge = isWin
          ? `<span class="journal-badge journal-badge-win">🎯 WIN</span>`
          : (isLoss ? `<span class="journal-badge journal-badge-loss">🛑 LOSS</span>` : `<span class="journal-badge journal-badge-be">⚖️ BE</span>`);

        let triggerBadge = '';
        if (t.exitReason === 'TAKE_PROFIT') {
          triggerBadge = `<span class="badge-trigger trigger-tp">🎯 TP Hit</span>`;
        } else if (t.exitReason === 'STOP_LOSS') {
          triggerBadge = `<span class="badge-trigger trigger-sl">🛑 SL Hit</span>`;
        } else {
          triggerBadge = `<span class="badge-trigger trigger-manual">✋ Manual Close</span>`;
        }

        return `
          <tr class="journal-row ${isWin ? 'row-win' : (isLoss ? 'row-loss' : '')}">
            <td style="font-size: 11px; color: var(--text-muted);">${t.dateTimeStr || '--'}</td>
            <td>
              <strong style="color: var(--text-light);">${t.symbol}</strong>
              <div style="font-size: 10px; color: var(--text-muted); max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${t.scenarioName}</div>
            </td>
            <td><span class="${isBull ? 'badge-bullish' : 'badge-bearish'}">${t.side}</span> <span style="font-size: 10px; color: var(--text-muted);">${t.size}x</span></td>
            <td style="font-size: 11px;">${t.model}</td>
            <td style="font-family: var(--font-mono);">${t.entryPrice.toFixed(2)}</td>
            <td style="font-family: var(--font-mono);">${t.exitPrice.toFixed(2)}</td>
            <td style="font-family: var(--font-mono); font-weight: 600; color: ${isWin ? 'var(--bullish)' : (isLoss ? 'var(--bearish)' : 'inherit')};">
              ${t.pts >= 0 ? '+' : ''}${t.pts.toFixed(2)} pts
            </td>
            <td style="font-family: var(--font-mono); font-weight: 800; font-size: 13px; color: ${isWin ? 'var(--bullish)' : (isLoss ? 'var(--bearish)' : 'inherit')};">
              ${t.pnl >= 0 ? '+' : ''}$${t.pnl.toFixed(2)}
            </td>
            <td>${outcomeBadge}</td>
            <td>${triggerBadge}</td>
          </tr>
        `;
      }).join('');
    }
  }
}

function setupJournalListeners() {
  // Filter chips in Journal tab
  document.querySelectorAll('.journal-filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.journal-filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const filter = chip.getAttribute('data-filter') || 'ALL';
      updateBacktestJournalUI(filter);
    });
  });

  // Export CSV
  const exportBtn = document.getElementById('exportJournalCsvBtn');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      if (window.ReplayJournalStore) window.ReplayJournalStore.exportCSV();
    });
  }

  // Back to Replay Chart button
  const backToReplayBtn = document.getElementById('journalBackToReplayBtn');
  if (backToReplayBtn) {
    backToReplayBtn.addEventListener('click', () => {
      const replayTabBtn = document.querySelector('[data-tab="replayTab"]');
      if (replayTabBtn) replayTabBtn.click();
    });
  }

  // Buttons in Replay Tab to open Journal
  const openJournalBtn = document.getElementById('replayOpenJournalBtn');
  if (openJournalBtn) {
    openJournalBtn.addEventListener('click', () => {
      const paperTabBtn = document.querySelector('[data-tab="paperTab"]');
      if (paperTabBtn) paperTabBtn.click();
    });
  }

  const fsOpenJournalBtn = document.getElementById('fsOpenJournalBtn');
  if (fsOpenJournalBtn) {
    fsOpenJournalBtn.addEventListener('click', () => {
      const paperTabBtn = document.querySelector('[data-tab="paperTab"]');
      if (paperTabBtn) paperTabBtn.click();
    });
  }

  const sidebarJournalBtn = document.getElementById('sidebarJournalBtn');
  if (sidebarJournalBtn) {
    sidebarJournalBtn.addEventListener('click', () => {
      const paperTabBtn = document.querySelector('[data-tab="paperTab"]');
      if (paperTabBtn) paperTabBtn.click();
    });
  }

  updateJournalBadgeCounters();
}

// ============================================================================
// 10. MARKUP TEST / PRACTICE EXAM TAB
// ============================================================================
const MARKUP_CHALLENGES = [
  {
    id: 'markup-1',
    name: '🎯 NY Silver Bullet FVG Identification (MNQ)',
    scenarioId: 'situation-01',
    symbol: 'MNQ',
    sliceStart: 600,
    sliceEnd: 720,
    defaultTf: '5m',
    description: 'This chart shows the NY AM session around the 10:00-11:00 Silver Bullet window. Identify all Fair Value Gaps, mark any BSL/SSL pools that got swept, and draw your ideal long or short position bracket with SL and TP.',
    objectives: [
      'Mark ALL Fair Value Gaps (bullish and bearish)',
      'Identify any BSL or SSL liquidity sweeps',
      'Draw the Market Structure Shift (MSS) displacement candle',
      'Place a Long or Short position tool with entry at the FVG, structural SL, and target at opposing liquidity'
    ],
    answer: {
      notes: 'The Silver Bullet window (10:00-11:00 NY) produced a bearish displacement after sweeping the London High/BSL. A bearish FVG formed on the 5m chart between the swing high and the displacement. The MSS occurred on the first lower-low break. Entry was at the 50% CE of the FVG, SL above the FVG high, TP at the SSL below the Asia Low.',
      drawings: [
        { type: 'liquidity', label: 'BSL (London High Sweep)', priceLevel: 'high', color: '#a855f7', barRange: [0, 0.3] },
        { type: 'fvg', direction: 'bearish', barRange: [0.25, 0.38], priceRange: 'auto' },
        { type: 'mss', label: 'MSS (Lower Low Break)', barPosition: 0.35, color: '#ef4444' },
        { type: 'entry', direction: 'short', barPosition: 0.40, label: 'Short Entry @ FVG 50% CE' }
      ]
    }
  },
  {
    id: 'markup-2',
    name: '🎯 London Sweep into NY Open Reversal (MNQ)',
    scenarioId: 'real-session-2026-09-10',
    symbol: 'MNQ',
    sliceStart: 300,
    sliceEnd: 660,
    defaultTf: '5m',
    description: 'This chart spans London close through the full NY AM open. Look for the London high/low sweep, the displacement into the NY killzone, and markup the full PB Trades 5-point setup if you see one.',
    objectives: [
      'Identify the London Session High and Low',
      'Mark the liquidity sweep that kicked off the reversal',
      'Draw the displacement FVG and OTE zone',
      'Set up a Long or Short position bracket with proper R:R',
      'Note the Midnight Open level if visible'
    ],
    answer: {
      notes: 'London session created a range. The NY open swept the London Low (SSL), then displaced bullish creating an FVG on the 5m chart. The MSS confirmed the reversal. The OTE zone (0.62-0.79 fib of the displacement leg) aligned with the FVG. Entry at the FVG retest, SL below the SSL sweep low, TP at the London High (BSL target).',
      drawings: [
        { type: 'liquidity', label: 'SSL (London Low Sweep)', priceLevel: 'low', color: '#a855f7', barRange: [0.3, 0.45] },
        { type: 'fvg', direction: 'bullish', barRange: [0.45, 0.55], priceRange: 'auto' },
        { type: 'mss', label: 'MSS (Higher High Break)', barPosition: 0.50, color: '#10b981' },
        { type: 'entry', direction: 'long', barPosition: 0.55, label: 'Long Entry @ FVG Retest' }
      ]
    }
  },
  {
    id: 'markup-3',
    name: '🎯 Asia Range to London Displacement (MNQ)',
    scenarioId: 'real-session-2026-09-09',
    symbol: 'MNQ',
    sliceStart: 0,
    sliceEnd: 480,
    defaultTf: '15m',
    description: 'This chart shows the full Asia session and London killzone on the 15m timeframe. Identify the Asia range consolidation, mark where London displaced out of the range, and set up the PB Trades entry model.',
    objectives: [
      'Draw horizontal lines at the Asia High and Asia Low',
      'Mark the London displacement candle(s)',
      'Identify any FVGs created during the London displacement',
      'Draw your entry bracket if the setup meets the 5-point checklist'
    ],
    answer: {
      notes: 'Asia session built a tight range. London swept the Asia Low first (engineered liquidity), then displaced through the Asia High creating a bullish FVG. The MSS was confirmed on the break above the Asia High. Entry was at the retest of the Asia High (now support) which overlapped with the FVG.',
      drawings: [
        { type: 'liquidity', label: 'Asia High (BSL)', priceLevel: 'high', color: '#fbbf24', barRange: [0, 0.5] },
        { type: 'liquidity', label: 'Asia Low (SSL)', priceLevel: 'low', color: '#fbbf24', barRange: [0, 0.5] },
        { type: 'fvg', direction: 'bullish', barRange: [0.55, 0.65], priceRange: 'auto' },
        { type: 'entry', direction: 'long', barPosition: 0.65, label: 'Long Entry @ Asia High Retest + FVG' }
      ]
    }
  },
  {
    id: 'markup-4',
    name: '🎯 Full Session Markup — Find the Trade (MNQ)',
    scenarioId: 'real-session-2026-09-04',
    symbol: 'MNQ',
    sliceStart: 200,
    sliceEnd: 800,
    defaultTf: '5m',
    description: 'A full trading session from Asia through NY lunch. Your job: study the multi-session structure, identify the highest-probability setup using PB Trades model, and mark it up completely. There may be one valid setup or none.',
    objectives: [
      'Mark the Midnight Open, Asia H/L, London H/L',
      'Identify all liquidity sweeps',
      'Find and mark the highest-probability FVG entry',
      'Place your full trade bracket (entry, SL, TP) if valid',
      'If no valid setup exists, note why in your analysis'
    ],
    answer: {
      notes: 'This session required patience. Asia built a range, London expanded but no clean displacement occurred until the 09:30 NY open. The buy-side liquidity above the Asia High was swept, followed by a bearish displacement creating a clean 5m FVG. The MSS confirmed below the previous swing low. The short entry was at the FVG midpoint (50% CE), SL above the BSL sweep high, TP at the London Low.',
      drawings: [
        { type: 'liquidity', label: 'BSL (Asia High Sweep)', priceLevel: 'high', color: '#a855f7', barRange: [0.5, 0.6] },
        { type: 'fvg', direction: 'bearish', barRange: [0.58, 0.68], priceRange: 'auto' },
        { type: 'mss', label: 'MSS (Bearish Break of Structure)', barPosition: 0.62, color: '#ef4444' },
        { type: 'entry', direction: 'short', barPosition: 0.68, label: 'Short Entry @ FVG 50% CE' }
      ]
    }
  },
  {
    id: 'markup-5',
    name: '🎯 Monday 525pt Trend Run & FVG Inversion (2026-08-24)',
    scenarioId: 'real-session-2026-08-24',
    symbol: 'MNQ',
    sliceStart: 300,
    sliceEnd: 850,
    defaultTf: '5m',
    description: 'A genuine impulsive Monday trend day. Identify the clean bearish Fair Value Gaps that formed after the 09:30 NY open as previous session support gave way. Practice drawing your short position bracket and targeting external Sell-Side Liquidity.',
    objectives: [
      'Locate the Midnight Open and Asia Low levels',
      'Identify the displacement candle breaking below overnight structure',
      'Mark the premium 5m bearish Fair Value Gap',
      'Place your Short position bracket with SL above the displacement wick and TP at external SSL'
    ],
    answer: {
      notes: 'Monday opened with sustained institutional selling. Once the Asia Low was breached with heavy displacement, a series of bearish FVGs were formed. Price offered an optimal entry retesting the FVG midpoint (50% CE) while remaining firmly below the Midnight Open.',
      drawings: [
        { type: 'liquidity', label: 'Asia Low (SSL Breached)', priceLevel: 'low', color: '#ef4444', barRange: [0.2, 0.4] },
        { type: 'fvg', direction: 'bearish', barRange: [0.42, 0.55], priceRange: 'auto' },
        { type: 'mss', label: 'MSS (Structure Breakdown)', barPosition: 0.45, color: '#ef4444' },
        { type: 'entry', direction: 'short', barPosition: 0.52, label: 'Short Entry @ 5m FVG Retest' }
      ]
    }
  },
  {
    id: 'markup-6',
    name: '🎯 NQ vs ES SMT Divergence & 558pt Squeeze (2026-08-26)',
    scenarioId: 'real-session-2026-08-26',
    symbol: 'MNQ',
    sliceStart: 350,
    sliceEnd: 900,
    defaultTf: '5m',
    description: 'Analyze the massive 558-point short squeeze on MNQ. Mark where NQ took out overnight liquidity while ES held higher lows (SMT Divergence), and locate the subsequent bullish FVG confirmation.',
    objectives: [
      'Spot the discount liquidity sweep on NQ',
      'Mark the Market Structure Shift (MSS) displacement candle',
      'Highlight the 5m bullish Fair Value Gap formed during the breakout',
      'Place a Long position bracket targeting the Previous Day High'
    ],
    answer: {
      notes: 'An explosive SMT divergence occurred at the NY open. While NQ swept liquidity at discount, ES formed a higher low. The aggressive displacement produced a wide bullish FVG. Re-entry at the top of the FVG yielded a multi-hundred point run straight into external BSL.',
      drawings: [
        { type: 'liquidity', label: 'SSL Sweep (SMT Discount)', priceLevel: 'low', color: '#a855f7', barRange: [0.3, 0.42] },
        { type: 'fvg', direction: 'bullish', barRange: [0.45, 0.58], priceRange: 'auto' },
        { type: 'mss', label: 'MSS (Bullish Displacement)', barPosition: 0.48, color: '#10b981' },
        { type: 'entry', direction: 'long', barPosition: 0.55, label: 'Long Entry @ Bullish FVG Retest' }
      ]
    }
  },
  {
    id: 'markup-7',
    name: '🎯 Month-End Institutional Flow & FVG Retest (2026-08-31)',
    scenarioId: 'real-session-2026-08-31',
    symbol: 'MNQ',
    sliceStart: 250,
    sliceEnd: 750,
    defaultTf: '15m',
    description: 'Controlled month-end institutional rebalancing. Spot the 15m bullish order block and Fair Value Gap that formed during the London session and provided support throughout the NY morning.',
    objectives: [
      'Draw the 15m Bullish Fair Value Gap',
      'Identify the Midnight Open line and notice how price treated it as support',
      'Place a Long trade bracket targeting the session high'
    ],
    answer: {
      notes: 'Month-end institutional accumulation created a classic staircase structure. Price repeatedly respected the Midnight Open and mitigated the 15m FVG without closing below it, presenting a low-stress long setup.',
      drawings: [
        { type: 'fvg', direction: 'bullish', barRange: [0.35, 0.50], priceRange: 'auto' },
        { type: 'entry', direction: 'long', barPosition: 0.50, label: 'Long Entry @ Midnight Open + FVG Confluence' }
      ]
    }
  },
  {
    id: 'markup-8',
    name: '🎯 Gold (MGC) Safe-Haven Squeeze (2026-09-09)',
    scenarioId: 'real-session-2026-09-09-mgc',
    symbol: 'MGC',
    sliceStart: 200,
    sliceEnd: 700,
    defaultTf: '5m',
    description: 'Commodity futures order flow on Micro Gold (MGC). Practice identifying ICT setups on non-index assets as Gold decouples from equities with a $95/oz (+95 pt) expansion.',
    objectives: [
      'Mark the London Low on Gold',
      'Identify the explosive 5m Bullish FVG that formed around 08:30 NY time',
      'Draw your Long position bracket targeting the Prior Day High ($4,480)'
    ],
    answer: {
      notes: 'Gold respected ICT delivery models with precision. London swept the Asia low, followed by an aggressive 08:30 displacement candle leaving an unmitigated 5m FVG. Entry at the FVG retest targeted the Previous Day High.',
      drawings: [
        { type: 'liquidity', label: 'London Low SSL Sweep', priceLevel: 'low', color: '#fbbf24', barRange: [0.25, 0.38] },
        { type: 'fvg', direction: 'bullish', barRange: [0.42, 0.54], priceRange: 'auto' },
        { type: 'entry', direction: 'long', barPosition: 0.52, label: 'Long Entry @ Gold FVG ($4,400)' }
      ]
    }
  }
];

let markupEngine = null;
let markupAnswerRevealed = false;

function initMarkupTestTab() {
  const canvas = document.getElementById('markupTestCanvas');
  if (!canvas || !window.ReplayEngine) return;

  markupEngine = new window.ReplayEngine();
  window.markupTestEngine = markupEngine;

  const challengeSelect = document.getElementById('markupChallengeSelect');
  if (challengeSelect) {
    challengeSelect.innerHTML = MARKUP_CHALLENGES.map(c => `
      <option value="${c.id}">${c.name}</option>
    `).join('');

    challengeSelect.addEventListener('change', () => {
      loadMarkupChallenge(challengeSelect.value);
    });
  }

  markupEngine.init(canvas, MARKUP_CHALLENGES[0].scenarioId);
  loadMarkupChallenge(MARKUP_CHALLENGES[0].id);

  const tfPills = document.querySelectorAll('#markupTfPills .pill-btn');
  tfPills.forEach(pill => {
    pill.addEventListener('click', () => {
      tfPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      markupEngine.setTimeframe(pill.getAttribute('data-tf'));
      updateMarkupPaneTag();
    });
  });

  // Session Markouts & Auto-Markup Toggle in Markup Test
  const markupSessionsBtn = document.getElementById('markupSessionsToggleBtn');
  const markupAutoMarkupBtn = document.getElementById('markupAutoMarkupToggleBtn');
  const markupToolAutoMarkupBtn = document.getElementById('markupToolAutoMarkupBtn');

  function updateMarkupSessionsUI(isActive) {
    if (markupSessionsBtn) {
      markupSessionsBtn.classList.toggle('active', isActive);
      const txt = markupSessionsBtn.querySelector('.status-text');
      if (txt) txt.textContent = isActive ? 'ON' : 'OFF';
    }
  }

  function updateMarkupAutoMarkupUI(isActive) {
    if (markupAutoMarkupBtn) {
      markupAutoMarkupBtn.classList.toggle('active', isActive);
      const txt = markupAutoMarkupBtn.querySelector('.status-text');
      if (txt) txt.textContent = isActive ? 'ON' : 'OFF';
    }
    if (markupToolAutoMarkupBtn) {
      markupToolAutoMarkupBtn.classList.toggle('active', isActive);
    }
  }

  if (markupSessionsBtn) {
    markupSessionsBtn.addEventListener('click', () => {
      const active = markupEngine.toggleSessions();
      updateMarkupSessionsUI(active);
      showToast(active ? "🕒 Multi-Session Markouts: ON (Asia H/L, London H/L, Midnight Open, PDH/PDL)" : "🕒 Multi-Session Markouts: OFF");
    });
  }

  if (markupAutoMarkupBtn) {
    markupAutoMarkupBtn.addEventListener('click', () => {
      const active = markupEngine.toggleAutoMarkup();
      updateMarkupAutoMarkupUI(active);
      showToast(active ? "⚡ Auto ICT Markups: ON (FVGs & Sweeps)" : "⚡ Auto ICT Markups: OFF (Clean Chart)");
    });
  }

  if (markupToolAutoMarkupBtn) {
    markupToolAutoMarkupBtn.addEventListener('click', () => {
      const active = markupEngine.toggleAutoMarkup();
      updateMarkupAutoMarkupUI(active);
      showToast(active ? "⚡ Auto ICT Markups: ON (FVGs & Sweeps)" : "⚡ Auto ICT Markups: OFF (Clean Chart)");
    });
  }

  const toolBtns = document.querySelectorAll('#markupDrawingToolbar .tool-btn');
  toolBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tool = btn.getAttribute('data-tool');
      if (tool === 'toggle_automarkup') {
        const active = markupEngine.toggleAutoMarkup();
        updateMarkupAutoMarkupUI(active);
        showToast(active ? "🧠 Auto ICT Markups: ON" : "🧠 Auto ICT Markups: OFF (Clean Chart)");
        return;
      }
      if (tool === 'undo') {
        markupEngine.undo();
        return;
      }
      if (tool === 'zoom_in') {
        markupEngine.zoomIn();
        return;
      }
      if (tool === 'zoom_out') {
        markupEngine.zoomOut();
        return;
      }
      if (tool === 'zoom_reset') {
        markupEngine.resetZoom();
        showToast("↺ View reset to default auto-fit");
        return;
      }
      if (tool === 'clear') {
        markupEngine.setTool('clear');
        toolBtns.forEach(b => b.classList.remove('active'));
        const ptr = document.querySelector('#markupDrawingToolbar [data-tool="pointer"]');
        if (ptr) ptr.classList.add('active');
        return;
      }
      toolBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      markupEngine.setTool(tool);
    });
  });

  const clearBtn = document.getElementById('markupClearBtn');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      markupEngine.drawings = [];
      markupEngine.undoStack = [];
      markupAnswerRevealed = false;
      updateRevealButton();
      markupEngine.render();
    });
  }

  const revealBtn = document.getElementById('markupRevealBtn');
  if (revealBtn) {
    revealBtn.addEventListener('click', () => {
      markupAnswerRevealed = !markupAnswerRevealed;
      updateRevealButton();
      markupEngine.render();
      if (markupAnswerRevealed) {
        renderAnswerOverlay();
      }
    });
  }

  markupEngine.onStateChange = (state) => {
    if (state.autoMarkup !== undefined) {
      updateMarkupAutoMarkupUI(state.autoMarkup);
    }
    if (state.sessions !== undefined) {
      updateMarkupSessionsUI(state.sessions);
    }
  };

  const originalRender = markupEngine.render.bind(markupEngine);
  markupEngine.render = function() {
    originalRender();
    if (markupAnswerRevealed) {
      renderAnswerOverlay();
    }
  };
}

function loadMarkupChallenge(challengeId) {
  const challenge = MARKUP_CHALLENGES.find(c => c.id === challengeId);
  if (!challenge) return;

  markupAnswerRevealed = false;
  updateRevealButton();

  markupEngine.loadScenario(challenge.scenarioId);

  if (challenge.sliceEnd !== undefined) {
    markupEngine.current1mIndex = Math.min(markupEngine.raw1m.length - 1, challenge.sliceEnd);
    markupEngine.panOffsetBars = 0;
  }

  markupEngine.setTimeframe(challenge.defaultTf || '5m');

  const tfPills = document.querySelectorAll('#markupTfPills .pill-btn');
  tfPills.forEach(p => {
    p.classList.toggle('active', p.getAttribute('data-tf') === (challenge.defaultTf || '5m'));
  });

  const descEl = document.getElementById('markupChallengeDescription');
  if (descEl) descEl.textContent = challenge.description;

  const objEl = document.getElementById('markupObjectivesList');
  if (objEl) {
    objEl.innerHTML = challenge.objectives.map(o => `<li>${o}</li>`).join('');
  }

  const ansNotesEl = document.getElementById('markupAnswerNotes');
  if (ansNotesEl) ansNotesEl.textContent = challenge.answer.notes;

  const scoreCard = document.getElementById('markupScoreCard');
  if (scoreCard) scoreCard.style.display = 'none';

  updateMarkupPaneTag();
  markupEngine.render();
}

function updateMarkupPaneTag() {
  const tag = document.getElementById('markupPaneTag');
  if (tag && markupEngine) {
    const sym = markupEngine.scenario ? markupEngine.scenario.symbol : 'MNQ';
    const tf = markupEngine.activeTf ? markupEngine.activeTf.toUpperCase() : '5M';
    tag.textContent = `🎯 MARKUP TEST: ${sym} • ${tf}`;
  }
}

function updateRevealButton() {
  const btn = document.getElementById('markupRevealBtn');
  const scoreCard = document.getElementById('markupScoreCard');
  const statusPill = document.getElementById('markupPaneStatus');

  if (btn) {
    btn.textContent = markupAnswerRevealed ? '🙈 Hide Answer' : '👁️ Reveal Answer';
    btn.classList.toggle('revealed', markupAnswerRevealed);
  }
  if (scoreCard) {
    scoreCard.style.display = markupAnswerRevealed ? 'block' : 'none';
  }
  if (statusPill) {
    statusPill.textContent = markupAnswerRevealed ? '✅ Answer overlay visible' : 'Mark up, then reveal answer';
    statusPill.style.color = markupAnswerRevealed ? '#10b981' : '';
  }
}

function renderAnswerOverlay() {
  if (!markupEngine || !markupEngine.ctx || !markupAnswerRevealed) return;

  const challengeId = document.getElementById('markupChallengeSelect');
  if (!challengeId) return;
  const challenge = MARKUP_CHALLENGES.find(c => c.id === challengeId.value);
  if (!challenge || !challenge.answer) return;

  const ctx = markupEngine.ctx;
  const w = markupEngine.width;
  const h = markupEngine.height;
  const chartWidth = w - 75;
  const chartHeight = h - 35;

  const allCandles = markupEngine.getVisibleCandles();
  if (!allCandles || allCandles.length === 0) return;

  const endIndex = Math.max(0, allCandles.length - 1 - markupEngine.panOffsetBars);
  const startIndex = Math.max(0, endIndex - markupEngine.visibleBarsCount + 1);
  const visibleCandles = allCandles.slice(startIndex, endIndex + 1);
  if (visibleCandles.length === 0) return;

  const { minPrice, maxPrice } = markupEngine.calculatePriceRange(visibleCandles);

  let visLow = Infinity, visHigh = -Infinity;
  visibleCandles.forEach(c => {
    if (c.low < visLow) visLow = c.low;
    if (c.high > visHigh) visHigh = c.high;
  });

  ctx.save();

  challenge.answer.drawings.forEach(shape => {
    if (shape.type === 'liquidity') {
      const price = shape.priceLevel === 'high' ? visHigh : visLow;
      const y = markupEngine.priceToY(price, minPrice, maxPrice);
      const x1 = (shape.barRange ? shape.barRange[0] : 0) * chartWidth;
      const x2 = (shape.barRange ? shape.barRange[1] : 1) * chartWidth;

      ctx.strokeStyle = shape.color || '#fbbf24';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([8, 4]);
      ctx.beginPath();
      ctx.moveTo(x1, y);
      ctx.lineTo(x2, y);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = shape.color || '#fbbf24';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText('✅ ' + shape.label, x1 + 6, y - 8);

    } else if (shape.type === 'fvg') {
      const x1 = (shape.barRange ? shape.barRange[0] : 0.3) * chartWidth;
      const x2 = (shape.barRange ? shape.barRange[1] : 0.5) * chartWidth;

      const fvgStartIdx = Math.floor(shape.barRange[0] * visibleCandles.length);
      const fvgEndIdx = Math.min(visibleCandles.length - 1, Math.floor(shape.barRange[1] * visibleCandles.length));
      let fvgHigh = -Infinity, fvgLow = Infinity;
      for (let i = fvgStartIdx; i <= fvgEndIdx; i++) {
        if (visibleCandles[i]) {
          if (visibleCandles[i].high > fvgHigh) fvgHigh = visibleCandles[i].high;
          if (visibleCandles[i].low < fvgLow) fvgLow = visibleCandles[i].low;
        }
      }

      const fvgRange = fvgHigh - fvgLow;
      const isBearish = shape.direction === 'bearish';
      const fvgTop = isBearish ? fvgHigh - fvgRange * 0.2 : fvgLow + fvgRange * 0.5;
      const fvgBot = isBearish ? fvgHigh - fvgRange * 0.5 : fvgLow + fvgRange * 0.2;

      const yTop = markupEngine.priceToY(fvgTop, minPrice, maxPrice);
      const yBot = markupEngine.priceToY(fvgBot, minPrice, maxPrice);

      ctx.fillStyle = isBearish ? 'rgba(239, 68, 68, 0.22)' : 'rgba(16, 185, 129, 0.22)';
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 2;
      ctx.fillRect(x1, Math.min(yTop, yBot), x2 - x1, Math.abs(yBot - yTop));
      ctx.strokeRect(x1, Math.min(yTop, yBot), x2 - x1, Math.abs(yBot - yTop));

      const midY = (yTop + yBot) / 2;
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = '#fbbf24';
      ctx.beginPath();
      ctx.moveTo(x1, midY);
      ctx.lineTo(x2, midY);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 10px sans-serif';
      ctx.fillText('✅ ' + (isBearish ? 'Bearish' : 'Bullish') + ' FVG (50% CE)', x1 + 6, Math.min(yTop, yBot) - 6);

    } else if (shape.type === 'mss') {
      const x = (shape.barPosition || 0.5) * chartWidth;

      ctx.strokeStyle = shape.color || '#ef4444';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([6, 3]);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, chartHeight);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText('✅ ' + shape.label, x + 6, 46);

    } else if (shape.type === 'entry') {
      const x = (shape.barPosition || 0.6) * chartWidth;
      const isLong = shape.direction === 'long';

      ctx.fillStyle = isLong ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)';
      ctx.fillRect(x - 4, 55, 8, 20);

      ctx.fillStyle = isLong ? '#10b981' : '#ef4444';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('✅ ' + shape.label, x + 12, 70);
    }
  });

  ctx.fillStyle = 'rgba(245, 158, 11, 0.12)';
  ctx.fillRect(0, 0, chartWidth, 28);
  ctx.fillStyle = '#fbbf24';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('✅ CORRECT ANSWER OVERLAY — Compare with your markup', chartWidth / 2, 18);
  ctx.textAlign = 'left';

  ctx.restore();
}
