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
  document.getElementById(labelId).textContent = target;

  const ms = schedule ? schedule.filter(m => m.date === target) : [];
  if (ms.length === 0) {
    container.innerHTML = `<div class="match-card"><span style="color:var(--text-muted)">${mode==='today'?'今天':'昨天'}没有比赛</span></div>`;
    return;
  }
  ms.sort((a,b) => (a.time||'') > (b.time||'') ? 1 : -1);
  container.innerHTML = ms.map(m => {
    const hf = getFlag(m.home), af = getFlag(m.away);
    const hasScore = m.score && m.score !== '-';
    return `<div class="match-card">
      <div class="match-main">
        <span class="match-team home">${hf} ${m.home}</span>
        <span class="match-score ${!hasScore?'pending':''}">${m.score||'-'}</span>
        <span class="match-team away">${af} ${m.away}</span>
      </div>
      ${m.time ? `<div class="match-time-below">⏰ ${m.time}</div>` : ''}
    </div>`;
  }).join('');
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
    return `<div class="bet-card">
      <div class="bet-header">
        <span class="bet-medal">${medal}</span>
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
      <span class="leaderboard-score">${p.score}</span>
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
    { key: 'md1', label: '小组赛·第1轮', matchday: 1 },
    { key: 'md2', label: '小组赛·第2轮', matchday: 2 },
    { key: 'md3', label: '小组赛·第3轮', matchday: 3 },
    { key: 'r32', label: '32强淘汰赛', matchday: 4 },
    { key: 'r16', label: '16强淘汰赛', matchday: 5 },
    { key: 'qf',  label: '八强赛', matchday: 6 },
    { key: 'sf',  label: '半决赛', matchday: 7 },
    { key: '3rd', label: '季军赛', matchday: 8 },
    { key: 'final', label: '🏆 决赛', matchday: 9 }
  ];

  // 把比赛分组
  let groups = {};
  // 示例比赛（matchday 0）归入 md1
  rounds.forEach(r => { groups[r.key] = []; });

  schedule.forEach(m => {
    let md = m.matchday || 0;
    if (md === 0) md = 1; // 示例比赛归入第1轮
    const round = rounds.find(r => r.matchday === md);
    if (round) {
      groups[round.key].push(m);
    }
  });

  // 淘汰赛占位比赛
  const koPlaceholders = {
    'r32': [{ date:'2026-06-28', time:'待定', home:'TBD', away:'TBD', score:'-' }],
    'r16': [{ date:'2026-07-04', time:'待定', home:'TBD', away:'TBD', score:'-' }],
    'qf':  [{ date:'2026-07-09', time:'待定', home:'TBD', away:'TBD', score:'-' }],
    'sf':  [{ date:'2026-07-14', time:'待定', home:'TBD', away:'TBD', score:'-' }],
    '3rd': [{ date:'2026-07-18', time:'待定', home:'TBD', away:'TBD', score:'-' }],
    'final': [{ date:'2026-07-19', time:'待定', home:'TBD', away:'TBD', score:'-' }]
  };

  // 找到第一个有比赛的轮次
  let activeKey = null;
  for (const r of rounds) {
    const ms = groups[r.key];
    if (ms.length > 0 || koPlaceholders[r.key]) {
      // 如果实际比赛没有，但有占位
      if (ms.length === 0 && koPlaceholders[r.key]) {
        groups[r.key] = koPlaceholders[r.key];
      }
      if (!activeKey) activeKey = r.key;
    }
  }

  // 生成 tab 按钮
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
            const groupLabel = m.group ? ` <span class="match-group">${m.group}组</span>` : '';
            return `<div class="match-card">
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
    title.textContent = name + ' 的投注记录';

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
