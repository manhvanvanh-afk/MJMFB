/* ============================================
   2026 老同学世界杯联赛 — JavaScript
   功能：加载 data.json 并渲染所有模块
   ============================================ */

// ----- 页面加载完成后执行 -----
document.addEventListener('DOMContentLoaded', () => {

  // 显示当前日期
  const now = new Date();
  const dateStr = now.toLocaleDateString('zh-CN', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long'
  });
  document.getElementById('navDate').textContent = dateStr;

  // 加载数据
  loadData();
});

// ----- 加载数据 -----
async function loadData() {
  try {
    const response = await fetch('data.json?' + Date.now()); // 加时间戳防缓存
    if (!response.ok) throw new Error('网络请求失败');
    const data = await response.json();

    // 渲染各模块
    renderMatches(data.matches);
    renderWinners(data.leaderboard);
    renderLeaderboard(data.leaderboard);
    renderCurseRanking(data.curseRanking);
    renderAIComments(data.aiComments);
    renderMVP(data.mvp);

    // 隐藏加载状态
    document.getElementById('loading').classList.add('hidden');

  } catch (error) {
    console.error('数据加载失败:', error);
    document.getElementById('loading').classList.add('hidden');
    showError('数据加载失败，请刷新页面或稍后再试');
  }
}

// ----- 渲染今日赛果 -----
function renderMatches(matches) {
  const grid = document.getElementById('matchesGrid');
  if (!matches || matches.length === 0) {
    grid.innerHTML = '<div class="match-card"><span style="color:var(--text-muted)">暂无比赛数据</span></div>';
    return;
  }

  grid.innerHTML = matches.map(m => {
    const isPending = m.score === '-';
    return `
      <div class="match-card">
        <span class="match-team home">${m.home}</span>
        <span class="match-score ${isPending ? 'pending' : ''}">${m.score || '-'}</span>
        <span class="match-team away">${m.away}</span>
      </div>
    `;
  }).join('');
}

// ----- 渲染今日赢家（按今日得分排序取前三）-----
function renderWinners(leaderboard) {
  const list = document.getElementById('winnersList');
  if (!leaderboard || leaderboard.length === 0) {
    list.innerHTML = '<div class="winner-item"><span style="color:var(--text-muted)">暂无数据</span></div>';
    return;
  }

  // 按今日得分排序（从高到低）
  const sorted = [...leaderboard].sort((a, b) => (b.today || 0) - (a.today || 0));
  const top3 = sorted.slice(0, 3).filter(p => p.today > 0);
  const medals = ['🥇', '🥈', '🥉'];

  if (top3.length === 0) {
    list.innerHTML = '<div class="winner-item"><span style="color:var(--text-muted)">今天还没有赢家，快开始预测吧！</span></div>';
    return;
  }

  list.innerHTML = top3.map((p, i) => `
    <div class="winner-item">
      <span class="winner-rank">${medals[i]}</span>
      <span class="winner-name">${p.name}</span>
      <span class="winner-score">+${p.today}</span>
    </div>
  `).join('');
}

// ----- 渲染总排行榜 -----
function renderLeaderboard(leaderboard) {
  const board = document.getElementById('leaderboard');
  if (!leaderboard || leaderboard.length === 0) {
    board.innerHTML = '<div class="leaderboard-item"><span style="color:var(--text-muted)">暂无数据</span></div>';
    return;
  }

  // 按总积分排序（从高到低）
  const sorted = [...leaderboard].sort((a, b) => (b.score || 0) - (a.score || 0));

  board.innerHTML = sorted.map((p, i) => {
    const rank = i + 1;
    let rankDisplay = rank;

    if (rank === 1) rankDisplay = '🥇';
    else if (rank === 2) rankDisplay = '🥈';
    else if (rank === 3) rankDisplay = '🥉';

    const topClass = rank <= 3 ? `top-${rank}` : '';

    // 头像路径
    const avatarPath = `assets/avatars/${p.name}.jpg`;

    return `
      <div class="leaderboard-item ${topClass}">
        <span class="leaderboard-rank">${rankDisplay}</span>
        <img class="leaderboard-avatar" src="${avatarPath}" alt="${p.name}"
          onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect fill=%22%23333%22 width=%22100%22 height=%22100%22/><text fill=%22%23999%22 font-size=%2240%22 x=%2250%22 y=%2265%22 text-anchor=%22middle%22>${p.name[0]}</text></svg>'">
        <span class="leaderboard-name">${p.name}</span>
        <span class="leaderboard-score">${p.score}</span>
      </div>
    `;
  }).join('');
}

// ----- 渲染毒奶榜 -----
function renderCurseRanking(curseList) {
  const list = document.getElementById('curseList');
  if (!curseList || curseList.length === 0) {
    list.innerHTML = '<div class="curse-item">暂无毒奶记录 🤡</div>';
    return;
  }

  list.innerHTML = curseList.map(c => `
    <div class="curse-item">🤡 ${c}</div>
  `).join('');
}

// ----- 渲染 AI 锐评 -----
function renderAIComments(comments) {
  const container = document.getElementById('aiComments');
  if (!comments || comments.length === 0) {
    container.innerHTML = '<div class="ai-comment-item">🎙️ 暂无锐评</div>';
    return;
  }

  container.innerHTML = comments.map(c => `
    <div class="ai-comment-item">${c}</div>
  `).join('');
}

// ----- 渲染 MVP -----
function renderMVP(mvp) {
  const el = document.getElementById('mvpText');
  if (!mvp || mvp === '') {
    el.textContent = '等待第一位 MVP 诞生... 🌟';
    return;
  }
  el.textContent = mvp;
}

// ----- 显示错误提示 -----
function showError(msg) {
  const toast = document.getElementById('errorToast');
  document.getElementById('errorMessage').textContent = msg;
  toast.classList.add('show');
  // 5秒后自动隐藏
  setTimeout(() => toast.classList.remove('show'), 5000);
}
