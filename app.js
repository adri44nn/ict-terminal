/**
 * ICT Institutional Apex Terminal Client
 * Real-time Charting, Live Algorithmic Radar, Academy & Paper Trader
 * 100% Pure Inner Circle Trader (ICT) Framework
 */

const STATE = {
  activeTab: 'scannerTab',
  activeSymbol: 'MNQ',
  activeTimeframe: '5m',
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
// 1. INITIALIZATION & ROUTING
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
  setupChartControls();
  setupAudioToggle();
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
      document.getElementById(tabId).classList.add('active');
      STATE.activeTab = tabId;

      if (tabId === 'chartTab') {
        setTimeout(renderCanvasChart, 50);
      }
      if (tabId === 'iccTab') {
        fetchIccScan();
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
      return;
    }
  } catch (e) {
    console.warn("Client-side scan error:", e);
  }

  try {
    const res = await fetch('/api/scan');
    const data = await res.json();
    STATE.scanData = data;
    renderScannerGrid(data.scan_results || {});
    renderAlertsTable(data.alerts || []);
    updateGlobalSignalRibbon(data.scan_results || {}, {});
  } catch (e) {}
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
            <div class="plan-val sl">${plan.stop_loss !== null && plan.stop_loss !== undefined ? plan.stop_loss : '--'}</div>
          </div>
          <div class="plan-cell">
            <div class="plan-label">Target (${plan.rr_ratio && plan.rr_ratio !== '--' ? plan.rr_ratio + ' RR' : 'BSL/SSL'})</div>
            <div class="plan-val tp">${plan.take_profit !== null && plan.take_profit !== undefined ? plan.take_profit : '--'}</div>
          </div>
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
            <div>• Origin: <strong>${ind.origin_price !== undefined ? ind.origin_price : '--'}</strong></div>
            <div>• Peak: <strong>${ind.extreme_price !== undefined ? ind.extreme_price : '--'}</strong></div>
          </div>
          <div class="icc-col">
            <div class="icc-col-title">Phase 2: Correction</div>
            <div>• Depth: <strong>${corr.retrace_pct !== undefined ? corr.retrace_pct + '%' : '--'}</strong></div>
            <div>• Status: <strong>${corr.status || 'Scanning'}</strong></div>
            <div>• 50% Eq: <strong>${corr.equilibrium !== undefined ? corr.equilibrium : (ind.equilibrium_50 || '--')}</strong></div>
          </div>
        </div>

        <div class="trade-plan-box">
          <div class="plan-cell">
            <div class="plan-label">${isActiveTrade ? '5M Limit Entry' : 'Entry / 50% Eq'}</div>
            <div class="plan-val entry">${plan.entry !== null && plan.entry !== undefined ? plan.entry : (ind.equilibrium_50 || '--')}</div>
          </div>
          <div class="plan-cell">
            <div class="plan-label">${isActiveTrade ? '5M Stop Loss' : '1H Origin SL'}</div>
            <div class="plan-val sl">${plan.stop_loss !== null && plan.stop_loss !== undefined ? plan.stop_loss : (ind.origin_price || '--')}</div>
          </div>
          <div class="plan-cell">
            <div class="plan-label">1H Macro TP1 (${plan.rr_ratio && plan.rr_ratio !== '--' ? plan.rr_ratio + ' RR' : '1H Peak'})</div>
            <div class="plan-val tp">${plan.take_profit_1 || plan.take_profit || ind.extreme_price || '--'}</div>
          </div>
        </div>

        <div style="font-size: 10.5px; color: var(--text-muted); background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(6, 182, 212, 0.2); padding: 7px 10px; border-radius: 6px; margin-bottom: 10px; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 4px;">
          <span>🎯 <strong>1H TP1 (Peak/Low):</strong> ${plan.take_profit_1 || ind.extreme_price || '--'}</span>
          <span>🚀 <strong>1H TP2 (1:2):</strong> ${plan.take_profit_2 || '--'}</span>
          <span>💎 <strong>1H TP3 (1:3 Runner):</strong> ${plan.take_profit_3 || '--'}</span>
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

  window.addEventListener('resize', renderCanvasChart);
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
      renderCanvasChart();
      updateChartSidebar(analysis);
      return;
    }
  } catch (e) {
    console.warn("Client chart error, trying API fallback", e);
  }

  try {
    const res = await fetch(`/api/chart?symbol=${sym}&interval=${tf}`);
    const data = await res.json();
    STATE.chartData = data;
    renderCanvasChart();
    updateChartSidebar(data.analysis);
  } catch (e) {}
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
  if (confirm("Are you sure you want to reset your simulated paper trading balance to $25,000?")) {
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
