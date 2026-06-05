/* ============================================
   2026 老同学世界杯联赛 — JavaScript
   功能：倒计时 + 赛程 + 昨日赢家 + 排行榜 + 完整赛程表
   ============================================ */

// ----- 国家 → 国旗 Emoji 映射 -----
const COUNTRY_FLAGS = {
  "墨西哥": "🇲🇽", "南非": "🇿🇦", "韩国": "🇰🇷", "捷克": "🇨🇿",
  "加拿大": "🇨🇦", "波黑": "🇧🇦", "卡塔尔": "🇶🇦", "瑞士": "🇨🇭",
  "巴西": "🇧🇷", "摩洛哥": "🇲🇦", "海地": "🇭🇹", "苏格兰": "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
  "美国": "🇺🇸", "巴拉圭": "🇵🇾", "澳大利亚": "🇦🇺", "土耳其": "🇹🇷",
  "德国": "🇩🇪", "库拉索": "🇨🇼", "科特迪瓦": "🇨🇮", "厄瓜多尔": "🇪🇨",
  "荷兰": "🇳🇱", "日本": "🇯🇵", "瑞典": "🇸🇪", "突尼斯": "🇹🇳",
  "比利时": "🇧🇪", "埃及": "🇪🇬", "伊朗": "🇮🇷", "新西兰": "🇳🇿",
  "西班牙": "🇪🇸", "佛得角": "🇨🇻", "沙特": "🇸🇦", "乌拉圭": "🇺🇾",
  "法国": "🇫🇷", "塞内加尔": "🇸🇳", "伊拉克": "🇮🇶", "挪威": "🇳🇴",
  "阿根廷": "🇦🇷", "阿尔及利亚": "🇩🇿", "奥地利": "🇦🇹", "约旦": "🇯🇴",
  "葡萄牙": "🇵🇹", "刚果(金)": "🇨🇩", "乌兹别克斯坦": "🇺🇿", "哥伦比亚": "🇨🇴",
  "英格兰": "🏴󠁧󠁢󠁥󠁮󠁧󠁿", "克罗地亚": "🇭🇷", "加纳": "🇬🇭", "巴拿马": "🇵🇦"
  ,"新加坡": "🇸🇬", "中国": "🇨🇳"
};

function getFlag(name) { return COUNTRY_FLAGS[name] || ''; }

// ============================================
// 页面加载
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  const now = new Date();
  document.getElementById('navDate').textContent =
    now.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
  startCountdown();
  loadData();
});

// ============================================
// 倒计时
// ============================================
function startCountdown() {
  const target = new Date('2026-06-11T00:00:00-04:00');
  function update() {
    const diff = target - new Date();
    if (diff <= 0) { ['Days','Hours','Mins','Secs'].forEach(s => document.getElementById('countdown'+s).textContent='00'); return; }
    document.getElementById('countdownDays').textContent = String(Math.floor(diff/86400000)).padStart(2,'0');
    document.getElementById('countdownHours').textContent = String(Math.floor((diff%86400000)/3600000)).padStart(2,'0');
    document.getElementById('countdownMins').textContent = String(Math.floor((diff%3600000)/60000)).padStart(2,'0');
    document.getElementById('countdownSecs').textContent = String(Math.floor((diff%60000)/1000)).padStart(2,'0');
  }
  update();
  setInterval(update, 1000);
}

// ============================================
// 加载数据
// ============================================
async function loadData() {
  try {
    const res = await fetch('data.json?' + Date.now());
    if (!res.ok) throw new Error('请求失败');
    const data = await res.json();

    const today = new Date();
    renderMatchesByDate('yesterdayMatches', 'yesterdayLabel', data.schedule, today, 'yesterday');
    renderMatchesByDate('todayMatches', 'todayLabel', data.schedule, today, 'today');
    renderYesterdayWinners(data.yesterdayBets);
    renderLeaderboard(data.leaderboard);
    renderCurseRanking(data.curseRanking);
    renderAIComments(data.aiComments);
    renderMVP(data.mvp);
    renderFullSchedule(data.schedule);
    setupPlayerModal(data);
    setupOddsModal(data);
    setupBettingCalculator();

    document.getElementById('loading').classList.add('hidden');
  } catch (e) {
    console.error(e);
    document.getElementById('loading').classList.add('hidden');
    showError('数据加载失败，请刷新页面或稍后再试');
  }
}

// ============================================
// 按日期渲染比赛
// ============================================
function renderMatchesByDate(containerId, labelId, schedule, today, mode) {
  const container = document.getElementById(containerId);
  function fmt(d) { return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
  const d = new Date(today);
  if (mode === 'yesterday') d.setDate(d.getDate() - 1);
  const target = fmt(d);
  const ms = schedule ? schedule.filter(m => m.date === target) : [];
  if (ms.length === 0) {
    document.getElementById(labelId).textContent = '';
    container.innerHTML = `<div class="match-card"><span style="color:var(--text-muted)">${mode==='today'?'今天':'昨天'}没有比赛</span></div>`;
    return;
  }
  document.getElementById(labelId).textContent = target;
  ms.sort((a,b) => (a.time||'') > (b.time||'') ? 1 : -1);
  container.innerHTML = ms.map(m => {
    const hf = getFlag(m.home), af = getFlag(m.away);
    const hasScore = m.score && m.score !== '-';
    const hasOdds = m.odds && Array.isArray(m.odds.playGroups) && m.odds.playGroups.length > 0;
    return `<div class="match-card ${hasOdds ? 'has-odds' : ''}" data-match-id="${m.id}">
      <div class="match-main">
        <span class="match-team home">${hf} ${m.home}</span>
        <span class="match-score ${!hasScore?'pending':''}">${m.score||'-'}</span>
        <span class="match-team away">${af} ${m.away}</span>
      </div>
      ${m.time ? `<div class="match-time-below">⏰ ${m.time}</div>` : ''}
      ${hasOdds ? `<div class="odds-hint">点开查看全部玩法赔率</div>` : ''}
    </div>`;
  }).join('');
}

function escapeHtml(text) {
  return String(text ?? '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[ch]));
}

// ============================================
// 今日比赛赔率弹窗
// ============================================
function setupOddsModal(data) {
  const today = document.getElementById('todayMatches');
  const scheduleList = document.getElementById('scheduleList');
  const overlay = document.getElementById('oddsModalOverlay');
  const title = document.getElementById('oddsModalTitle');
  const body = document.getElementById('oddsModalBody');
  const close = document.getElementById('oddsModalClose');

  if (!today || !overlay || !title || !body || !close) return;

  function closeModal() {
    overlay.classList.remove('active');
  }

  function formatOdd(value) {
    if (value === null || value === undefined || value === '') return '-';
    return Number(value).toFixed(2).replace(/\.00$/, '');
  }

  function renderGroup(group) {
    const items = (group.items || []).filter(item => item.value !== null && item.value !== undefined && item.value !== '');
    if (items.length === 0) return '';

    return `<div class="odds-group">
      <div class="odds-group-title">${group.title}</div>
      <div class="odds-grid">
        ${items.map(item => `<div class="odds-cell">
          <span class="odds-label">${item.label}</span>
          <span class="odds-value">${formatOdd(item.value)}</span>
        </div>`).join('')}
      </div>
    </div>`;
  }

  close.addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });

  function openOddsFromCard(card) {
    if (!card) return;

    const matchId = Number(card.dataset.matchId);
    const match = (data.schedule || []).find(m => Number(m.id) === matchId);
    if (!match || !match.odds) return;

    title.textContent = `${match.home} vs ${match.away}`;
    body.innerHTML = `
      <div class="odds-summary">
        <div>${match.odds.league || '赛事'} · ${match.odds.lotteryId || ''}</div>
        <div>${match.date} ${match.time || ''}</div>
        <div>来源：${match.odds.source || '未知'} · 更新：${match.odds.updatedAt || '-'}</div>
      </div>
      ${(match.odds.playGroups || []).map(renderGroup).join('')}
      <div class="odds-note">本页仅作朋友群娱乐记录，不构成任何投注建议。</div>
    `;
    overlay.classList.add('active');
  }

  today.addEventListener('click', (e) => {
    openOddsFromCard(e.target.closest('.match-card.has-odds'));
  });

  if (scheduleList) {
    scheduleList.addEventListener('click', (e) => {
      openOddsFromCard(e.target.closest('.match-card.has-odds'));
    });
  }
}

// ============================================
// 博彩计算器测试版
// ============================================
function setupBettingCalculator() {
  const openBtn = document.getElementById('bettingCalculatorOpen');
  const overlay = document.getElementById('bettingCalculatorOverlay');
  const closeBtn = document.getElementById('bettingCalculatorClose');
  const body = document.getElementById('bettingCalculatorBody');

  if (!openBtn || !overlay || !closeBtn || !body) return;

  let oddsData = null;
  const selected = new Map();
  const selectedPasses = new Set();

  function closeModal() {
    overlay.classList.remove('active');
  }

  function formatOdd(value) {
    if (value === null || value === undefined || value === '') return '-';
    return Number(value).toFixed(2).replace(/\.00$/, '');
  }

  function formatMoney(value) {
    if (!Number.isFinite(value)) return '0.00';
    return value.toFixed(2);
  }

  function timeText(matchTime) {
    if (!matchTime) return '';
    return matchTime.replace('T', ' ').slice(0, 16);
  }

  function validItems(group) {
    return (group.items || []).filter(item => item.value !== null && item.value !== undefined && item.value !== '');
  }

  function selectionKey(match, group, item) {
    return [match.matchId, group.key || group.title, item.label].join('::');
  }

  function playKey(group) {
    const key = group.key || group.title;
    if (key === 'spf' || key === 'rqspf') return 'spf-mix';
    return key;
  }

  function isWinDrawGroup(group) {
    const key = group ? (group.key || group.title) : '';
    return key === 'spf' || key === 'rqspf';
  }

  function selectedPlayForMatch(matchId) {
    const found = Array.from(selected.values()).find(item => item.matchId === String(matchId));
    return found ? found.playKey : '';
  }

  function compactPlayTitle(title) {
    if (title.startsWith('让球胜平负')) return title.replace('让球胜平负', '让球');
    return title;
  }

  function renderPlayGroup(match, group, previousGroup) {
    const items = validItems(group);
    if (!items.length) return '';
    const currentPlayKey = playKey(group);
    const previousPlayKey = previousGroup ? playKey(previousGroup) : '';
    const lockedPlayKey = selectedPlayForMatch(match.matchId);
    const disabled = lockedPlayKey && lockedPlayKey !== currentPlayKey;
    const noDivider = isWinDrawGroup(group) && isWinDrawGroup(previousGroup) ? 'calc-play-group-joined' : '';
    return `<div class="calc-play-group ${noDivider}">
      <div class="calc-play-title">${escapeHtml(compactPlayTitle(group.title))}</div>
      <div class="calc-odds-grid">
        ${items.map(item => {
          const key = selectionKey(match, group, item);
          const active = selected.has(key) ? 'active' : '';
          return `<button class="calc-odd-btn ${active} ${disabled ? 'disabled' : ''}" type="button"
            data-key="${escapeHtml(key)}"
            data-match-id="${escapeHtml(match.matchId)}"
            data-match="${escapeHtml(match.home + ' vs ' + match.away)}"
            data-play-key="${escapeHtml(currentPlayKey)}"
            data-play="${escapeHtml(group.title)}"
            data-label="${escapeHtml(item.label)}"
            data-odd="${escapeHtml(item.value)}"
            ${disabled ? 'disabled' : ''}>
            <span>${escapeHtml(item.label)}</span>
            <strong>${formatOdd(item.value)}</strong>
          </button>`;
        }).join('')}
      </div>
    </div>`;
  }

  function renderMatch(match) {
    const groups = match.playGroups || [];
    return `<article class="calc-match-card">
      <div class="calc-match-head">
        <div>
          <div class="calc-match-title">${escapeHtml(match.home)} <span>vs</span> ${escapeHtml(match.away)}</div>
          <div class="calc-match-meta">${escapeHtml(match.lotteryId || '')} · ${escapeHtml(match.league || '')} · ${escapeHtml(timeText(match.matchTime))}</div>
        </div>
        <div class="calc-match-rank">${match.homeRank ? '主' + escapeHtml(match.homeRank) : ''}${match.awayRank ? ' / 客' + escapeHtml(match.awayRank) : ''}</div>
      </div>
      <div class="calc-mix-label">混合过关</div>
      ${groups.map((group, index) => renderPlayGroup(match, group, groups[index - 1])).join('')}
    </article>`;
  }

  function renderCalculator() {
    if (!oddsData) {
      body.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:30px;">暂无数据</div>';
      return;
    }

    const dayMap = {};
    (oddsData.matches || []).forEach(match => {
      const key = match.dateLabel || '未分组';
      if (!dayMap[key]) dayMap[key] = [];
      dayMap[key].push(match);
    });

    body.innerHTML = `
      <div class="calc-toolbar">
        <div>
          <div class="calc-toolbar-title">当前竞足比赛</div>
          <div class="calc-toolbar-meta">来源：${escapeHtml(oddsData.source || '未知')} · 更新：${escapeHtml(oddsData.updatedAt || '-')} · ${oddsData.count || 0} 场</div>
        </div>
        <button class="calc-clear-btn" id="calcClearBtn" type="button">清空</button>
      </div>

      <div class="calc-content">
        <div class="calc-match-list">
          ${Object.keys(dayMap).map(day => `
            <div class="calc-day-block">
              <div class="calc-day-title">${escapeHtml(day)}</div>
              ${dayMap[day].map(renderMatch).join('')}
            </div>
          `).join('')}
        </div>

        <aside class="calc-panel">
          <div class="calc-panel-title">计算器</div>
          <label class="calc-field">
            <span>投注倍数</span>
            <input id="calcMultipleInput" type="number" min="0" step="1" value="0">
          </label>
          <div class="calc-field">
            <span>过关方式</span>
            <div class="calc-pass-buttons" id="calcPassButtons">
              ${Array.from({ length: 8 }, (_, index) => {
                const value = index + 1;
                return `<button class="calc-pass-btn" type="button" data-pass="${value}" disabled>${value === 1 ? '单关' : value + '关'}</button>`;
              }).join('')}
            </div>
          </div>
          <div class="calc-stats" id="calcStats"></div>
          <div class="calc-selected-list" id="calcSelectedList"></div>
          <div class="calc-note">测试版按已选赔率做理论估算，仅作朋友群娱乐记录。</div>
        </aside>
      </div>
    `;

    body.querySelectorAll('.calc-odd-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.key;
        if (selected.has(key)) {
          selected.delete(key);
          btn.classList.remove('active');
        } else {
          const lockedPlayKey = selectedPlayForMatch(btn.dataset.matchId);
          if (lockedPlayKey && lockedPlayKey !== btn.dataset.playKey) return;
          selected.set(key, {
            key,
            matchId: btn.dataset.matchId,
            match: btn.dataset.match,
            playKey: btn.dataset.playKey,
            play: btn.dataset.play,
            label: btn.dataset.label,
            odd: Number(btn.dataset.odd),
          });
          btn.classList.add('active');
        }
        updatePlayLocks();
        updateCalculatorPanel();
      });
    });

    document.getElementById('calcClearBtn').addEventListener('click', () => {
      selected.clear();
      selectedPasses.clear();
      body.querySelectorAll('.calc-odd-btn.active').forEach(btn => btn.classList.remove('active'));
      updatePlayLocks();
      updateCalculatorPanel();
    });

    document.getElementById('calcMultipleInput').addEventListener('input', updateCalculatorPanel);
    document.getElementById('calcMultipleInput').addEventListener('blur', normalizeMultipleInput);
    body.querySelectorAll('.calc-pass-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.disabled) return;
        const pass = Number(btn.dataset.pass);
        if (selectedPasses.has(pass)) {
          selectedPasses.delete(pass);
        } else {
          selectedPasses.add(pass);
        }
        updateCalculatorPanel(false);
      });
    });
    updatePlayLocks();
    updateCalculatorPanel();
  }

  function updatePlayLocks() {
    body.querySelectorAll('.calc-odd-btn').forEach(btn => {
      const lockedPlayKey = selectedPlayForMatch(btn.dataset.matchId);
      const disabled = Boolean(lockedPlayKey && lockedPlayKey !== btn.dataset.playKey);
      btn.disabled = disabled;
      btn.classList.toggle('disabled', disabled);
    });
  }

  function normalizeMultipleInput() {
    const input = document.getElementById('calcMultipleInput');
    if (!input) return 0;
    let value = Number(input.value || 0);
    if (!Number.isFinite(value) || value < 0) value = 0;
    value = Math.floor(value);
    input.value = String(value);
    return value;
  }

  function groupedSelections() {
    const map = {};
    selected.forEach(item => {
      if (!map[item.matchId]) map[item.matchId] = [];
      map[item.matchId].push(item);
    });
    return map;
  }

  function combinations(arr, size) {
    const result = [];
    function walk(start, picked) {
      if (picked.length === size) {
        result.push([...picked]);
        return;
      }
      for (let i = start; i < arr.length; i++) {
        picked.push(arr[i]);
        walk(i + 1, picked);
        picked.pop();
      }
    }
    walk(0, []);
    return result;
  }

  function sumProducts(groups) {
    return groups.reduce((sum, group) => {
      const groupSum = group.reduce((s, item) => s + item.odd, 0);
      return sum * groupSum;
    }, 1);
  }

  function minProduct(groups) {
    return groups.reduce((sum, group) => {
      const minOdd = Math.min(...group.map(item => item.odd));
      return sum * minOdd;
    }, 1);
  }

  function countTickets(groups) {
    return groups.reduce((sum, group) => sum * group.length, 1);
  }

  function updatePassButtons(matchCount, shouldAutoPick = true) {
    const maxPass = Math.min(matchCount, 8);
    const minPass = matchCount >= 2 ? 2 : 1;
    selectedPasses.forEach(pass => {
      if (pass > maxPass || pass < minPass) selectedPasses.delete(pass);
    });
    if (shouldAutoPick && matchCount > 0 && selectedPasses.size === 0) {
      selectedPasses.add(maxPass);
    }

    body.querySelectorAll('.calc-pass-btn').forEach(btn => {
      const pass = Number(btn.dataset.pass);
      const enabled = matchCount > 0 && pass >= minPass && pass <= maxPass;
      btn.disabled = !enabled;
      btn.classList.toggle('disabled', !enabled);
      btn.classList.toggle('active', enabled && selectedPasses.has(pass));
    });
  }

  function updateCalculatorPanel(shouldAutoPickPass = true) {
    const stats = document.getElementById('calcStats');
    const selectedList = document.getElementById('calcSelectedList');
    const multipleInput = document.getElementById('calcMultipleInput');
    if (!stats || !selectedList || !multipleInput) return;

    const grouped = groupedSelections();
    const matchIds = Object.keys(grouped);
    updatePassButtons(matchIds.length, shouldAutoPickPass);

    let multiple = Number(multipleInput.value || 0);
    if (!Number.isFinite(multiple) || multiple < 0) multiple = 0;
    multiple = Math.floor(multiple);
    if (String(multipleInput.value) !== String(multiple)) multipleInput.value = String(multiple);
    const stake = 2 * multiple;
    const passSizes = Array.from(selectedPasses).sort((a, b) => a - b);

    let ticketCount = 0;
    let maxPrize = 0;
    let minPrize = 0;

    if (matchIds.length > 0 && passSizes.length > 0) {
      passSizes.forEach(passSize => {
        if (passSize <= 0 || passSize > matchIds.length) return;
        const comboIds = combinations(matchIds, passSize);
        comboIds.forEach(ids => {
          const groups = ids.map(id => grouped[id]);
          ticketCount += countTickets(groups);
          maxPrize += sumProducts(groups) * stake;
          const comboMin = minProduct(groups) * stake;
          minPrize = minPrize === 0 ? comboMin : Math.min(minPrize, comboMin);
        });
      });
    }

    const totalStake = ticketCount * stake;
    stats.innerHTML = `
      <div><span>已选场次</span><strong>${matchIds.length}</strong></div>
      <div><span>已选项</span><strong>${selected.size}</strong></div>
      <div><span>投注倍数</span><strong>${multiple}</strong></div>
      <div><span>注数</span><strong>${ticketCount}</strong></div>
      <div><span>投入</span><strong>${formatMoney(totalStake)}</strong></div>
      <div><span>最低命中</span><strong>${formatMoney(minPrize)}</strong></div>
      <div><span>理论最高</span><strong>${formatMoney(maxPrize)}</strong></div>
    `;

    if (selected.size === 0) {
      selectedList.innerHTML = '<div class="calc-empty">还没有选择玩法</div>';
      return;
    }

    selectedList.innerHTML = Array.from(selected.values()).map(item => `
      <div class="calc-selected-item">
        <span>${escapeHtml(item.match)} · ${escapeHtml(item.play)} · ${escapeHtml(item.label)}</span>
        <strong>${formatOdd(item.odd)}</strong>
      </div>
    `).join('');
  }

  async function openCalculator() {
    overlay.classList.add('active');
    body.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:30px;">正在加载赔率数据...</div>';
    try {
      const res = await fetch('odds_data.json?' + Date.now());
      if (!res.ok) throw new Error('赔率数据读取失败');
      oddsData = await res.json();
      renderCalculator();
    } catch (error) {
      console.error(error);
      body.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:30px;">赔率数据加载失败，请先运行 python3 scrape_odds.py</div>';
    }
  }

  openBtn.addEventListener('click', openCalculator);
  closeBtn.addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });
}

// ============================================
// 昨日赢家（下注排行）
// ============================================
function renderYesterdayWinners(bets) {
  const list = document.getElementById('winnersList');
  if (!bets || bets.length === 0) {
    list.innerHTML = '<div class="bet-card"><div style="color:var(--text-muted);text-align:center">昨天还没有下注记录</div></div>';
    return;
  }
  const medals = ['🥇', '🥈', '🥉'];
  list.innerHTML = bets.map((p, i) => {
    const medal = i < 3 ? medals[i] : `${i+1}.`;
    const isProfit = p.netProfit >= 0;
    return `<div class="bet-card${i < 3 ? ' rank-' + (i+1) : ''}">
      <div class="bet-header">
        <span class="bet-medal">${medal}</span>
        <img class="bet-avatar" src="assets/avatars/${p.name}.jpg" alt="${p.name}"
          onerror="this.style.display='none'">
        <span class="bet-name">${p.name}</span>
        <span class="bet-total ${isProfit?'bet-profit':'bet-loss'}">${isProfit?'+':''}${p.netProfit}</span>
      </div>
      <div class="bet-details">
        ${p.bets.map(b => {
          if (b.type === '串关') {
            return `<div class="bet-row">
              <span class="bet-match">🎲 ${b.detail}</span>
              <span class="bet-info">${b.matches} · 下注 ${b.amount}分</span>
              <span class="bet-result ${b.result==='中'?'bet-win':'bet-lose'}">${b.result==='中'?'✅ 全中 +'+b.payout:'❌ 未中'}</span>
           </div>`;
          }
          return `<div class="bet-row">
            <span class="bet-match">${b.matches}</span>
            <span class="bet-info">${b.detail} · ${b.amount}分</span>
            <span class="bet-result ${b.result==='中'?'bet-win':'bet-lose'}">${b.result==='中'?'✅ 中 +'+b.payout:'❌ 未中'}</span>
          </div>`;
        }).join('')}
      </div>
    </div>`;
  }).join('');
}

// ============================================
// 总排行榜
// ============================================
function renderLeaderboard(leaderboard) {
  const board = document.getElementById('leaderboard');
  if (!leaderboard || leaderboard.length === 0) {
    board.innerHTML = '<div class="leaderboard-item"><span style="color:var(--text-muted)">暂无数据</span></div>'; return;
  }
  const sorted = [...leaderboard].sort((a, b) => (b.score || 0) - (a.score || 0));
  board.innerHTML = sorted.map((p, i) => {
    const rank = i + 1;
    let rd = rank; if (rank === 1) rd = '🥇'; else if (rank === 2) rd = '🥈'; else if (rank === 3) rd = '🥉';
    const tc = rank <= 3 ? `top-${rank}` : '';
    const path = `assets/avatars/${p.name}.jpg`;
    return `<div class="leaderboard-item ${tc}">
      <span class="leaderboard-rank">${rd}</span>
      <img class="leaderboard-avatar" src="${path}" alt="${p.name}"
        onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect fill=%22%23333%22 width=%22100%22 height=%22100%22/><text fill=%22%23999%22 font-size=%2240%22 x=%2250%22 y=%2265%22 text-anchor=%22middle%22>${p.name[0]}</text></svg>'">
      <span class="leaderboard-name">${p.name}</span>
      <span class="leaderboard-score ${p.score >= 0 ? 'bet-profit' : 'bet-loss'}">${p.score >= 0 ? '+' : ''}${p.score}</span>
    </div>`;
  }).join('');
}

function renderCurseRanking(list) {
  const el = document.getElementById('curseList');
  if (!list || list.length === 0) { el.innerHTML = '<div class="curse-item">暂无毒奶记录 🤡</div>'; return; }
  el.innerHTML = list.map(c => `<div class="curse-item">🤡 ${c}</div>`).join('');
}

function renderAIComments(comments) {
  const el = document.getElementById('aiComments');
  if (!comments || comments.length === 0) { el.innerHTML = '<div class="ai-comment-item">🎙️ 暂无锐评</div>'; return; }
  el.innerHTML = comments.map(c => `<div class="ai-comment-item">${c}</div>`).join('');
}

function renderMVP(mvp) {
  document.getElementById('mvpText').textContent = (mvp && mvp !== '') ? mvp : '等待第一位 MVP 诞生... 🌟';
}

// ============================================
// 完整赛程表（仿 eblcu.net 风格）
// ============================================
function renderFullSchedule(schedule) {
  const tabsEl = document.getElementById('roundTabs');
  const listEl = document.getElementById('scheduleList');

  if (!schedule || schedule.length === 0) {
    listEl.innerHTML = '<div class="match-card"><span style="color:var(--text-muted)">暂无赛程数据</span></div>';
    return;
  }

  // 定义轮次及其匹配规则
  const rounds = [
    { key: 'group', label: '小组赛' },
    { key: 'r32', label: '1/16决赛' },
    { key: 'r16', label: '1/8决赛' },
    { key: 'r8', label: '1/4决赛' },
    { key: 'semi', label: '半决赛' },
    { key: 'thirdPlace', label: '季军赛' },
    { key: 'final', label: '🏆 总决赛' }
  ];

  // 按 round 字段分组
  let groups = {};
  rounds.forEach(r => { groups[r.key] = []; });

  schedule.forEach(m => {
    const round = rounds.find(r => r.key === m.round);
    if (round) {
      groups[round.key].push(m);
    }
  });

  // 找到第一个有比赛的轮次
  let activeKey = null;
  for (const r of rounds) {
    if (groups[r.key].length > 0) {
      if (!activeKey) activeKey = r.key;
    }
  }

    tabsEl.innerHTML = rounds.map(r => {
    const ms = groups[r.key] || [];
    const hasContent = ms.length > 0;
    const isActive = r.key === activeKey;
    return `<button class="round-tab ${isActive?'active':''} ${!hasContent?'disabled':''}" data-round="${r.key}" ${!hasContent?'disabled':''}>
      ${r.label} ${hasContent ? `<span class="tab-count">${ms.length}</span>` : ''}
    </button>`;
  }).join('');

  // 渲染某轮比赛
  function renderRound(key) {
    const ms = groups[key] || [];
    if (ms.length === 0) {
      listEl.innerHTML = '<div class="match-card"><span style="color:var(--text-muted)">暂无比赛</span></div>';
      return;
    }

    // 按日期分组
    const byDate = {};
    ms.forEach(m => {
      const d = m.date || '';
      if (!byDate[d]) byDate[d] = [];
      byDate[d].push(m);
    });

    const sortedDates = Object.keys(byDate).sort();

    listEl.innerHTML = sortedDates.map(date => {
      const matches = byDate[date].sort((a,b) => (a.time||'') > (b.time||'') ? 1 : -1);
      const isTbd = matches[0].home === 'TBD';
      return `
        <div class="schedule-date-group">
          <div class="schedule-date-label">📅 ${date}</div>
          ${matches.map(m => {
            if (isTbd) {
              return `<div class="match-card tbd-card">
                <span style="color:var(--text-muted);text-align:center;width:100%;font-size:14px;">
                  ${m.time === '待定' ? '⏳ 待定' : m.time} · 对阵球队待定
                </span>
              </div>`;
            }
            const hf = getFlag(m.home), af = getFlag(m.away);
            const hasScore = m.score && m.score !== '-';
            const hasOdds = m.odds && Array.isArray(m.odds.playGroups) && m.odds.playGroups.length > 0;
            const groupLabel = m.group ? ` <span class="match-group">${m.group}组</span>` : '';
            return `<div class="match-card ${hasOdds ? 'has-odds' : ''}" data-match-id="${m.id}">
              <div class="match-main">
                <span class="match-team home">${hf} ${m.home}</span>
                <span class="match-score ${!hasScore?'pending':''}">${m.score||'-'}</span>
                <span class="match-team away">${af} ${m.away}</span>
              </div>
              ${m.time ? `<div class="match-time-below">⏰ ${m.time}</div>` : ''}
            </div>`;
          }).join('')}
        </div>`;
    }).join('');
  }

  // 渲染默认轮次
  if (activeKey) renderRound(activeKey);

  // tab 切换事件
  tabsEl.addEventListener('click', (e) => {
    const btn = e.target.closest('.round-tab');
    if (!btn || btn.disabled) return;
    tabsEl.querySelectorAll('.round-tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    renderRound(btn.dataset.round);
  });
}

// ============================================
// 错误提示
// ============================================
function showError(msg) {
  const toast = document.getElementById('errorToast');
  document.getElementById('errorMessage').textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 5000);
}

// ============================================
// 排行榜点击弹窗
// ============================================
function setupPlayerModal(data) {
  const board = document.getElementById('leaderboard');
  const overlay = document.getElementById('modalOverlay');
  const title = document.getElementById('modalTitle');
  const body = document.getElementById('modalBody');
  const close = document.getElementById('modalClose');

  function closeModal() {
    overlay.classList.remove('active');
  }

  close.addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });

  board.addEventListener('click', (e) => {
    const item = e.target.closest('.leaderboard-item');
    if (!item) return;

    const nameEl = item.querySelector('.leaderboard-name');
    if (!nameEl) return;
    const name = nameEl.textContent;

    const history = (data.betHistory || []).filter(h => h.name === name);
    // 弹窗标题：头像 + 姓名 + 总分
    const player = data.leaderboard.find(p => p.name === name);
    const score = player ? player.score : 0;
    const scoreClass = score >= 0 ? 'bet-profit' : 'bet-loss';
    const scoreSign = score >= 0 ? '+' : '';
    title.innerHTML = `<span style="display:inline-flex;align-items:center;gap:8px;">
      <img class="modal-avatar" src="assets/avatars/${name}.jpg" onerror="this.style.display='none'" alt="${name}">
      ${name}
      <span class="${scoreClass}" style="font-size:13px;font-weight:600;margin-left:8px;">总分: ${scoreSign}${score}</span>
    </span>`;

    if (history.length === 0) {
      body.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:30px;">暂无投注记录</div>';
    } else {
      history.sort((a, b) => b.date.localeCompare(a.date));

      body.innerHTML = history.map(h => {
        const betsHtml = h.bets.map(b => {
          const isWin = b.result === '中';
          const emoji = b.type === '串关' ? '🎲' : '⚽';
          const detail = b.type === '串关'
            ? emoji + ' ' + b.detail + ' · ' + b.matches
            : emoji + ' ' + b.matches + ' · ' + b.detail;
          const result = isWin
            ? (b.type === '串关' ? '✅ 全中 +' + b.payout : '✅ 中 +' + b.payout)
            : '❌ 未中';
          const color = isWin ? '#ff4444' : 'var(--green)';
          return '<div class="modal-history-row">'
            + '<span>' + detail + '</span>'
            + '<span style="font-weight:600;color:' + color + '">' + result + '</span>'
            + '</div>';
        }).join('');

        const profitColor = h.netProfit >= 0 ? '#ff4444' : 'var(--green)';
        const profitSign = h.netProfit >= 0 ? '+' : '';

        return '<div class="modal-history-item">'
          + '<div class="modal-history-date">📅 ' + h.date + '</div>'
          + betsHtml
          + '<div class="modal-history-row" style="border-top:1px solid rgba(255,255,255,0.06);padding-top:8px;margin-top:4px;">'
          + '<span style="font-weight:600;">合计</span>'
          + '<span style="font-weight:700;color:' + profitColor + '">' + profitSign + h.netProfit + '</span>'
          + '</div>'
          + '</div>';
      }).join('');
    }

    overlay.classList.add('active');
  });
}
