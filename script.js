// text3 手机端：读取主项目同结构 JSON，并按手机交互重新渲染。
const COUNTRY_FLAGS = {
  "墨西哥": "🇲🇽", "南非": "🇿🇦", "韩国": "🇰🇷", "捷克": "🇨🇿",
  "加拿大": "🇨🇦", "波黑": "🇧🇦", "卡塔尔": "🇶🇦", "瑞士": "🇨🇭",
  "巴西": "🇧🇷", "摩洛哥": "🇲🇦", "海地": "🇭🇹", "苏格兰": "🏴",
  "美国": "🇺🇸", "巴拉圭": "🇵🇾", "澳大利亚": "🇦🇺", "土耳其": "🇹🇷",
  "德国": "🇩🇪", "库拉索": "🇨🇼", "科特迪瓦": "🇨🇮", "厄瓜多尔": "🇪🇨",
  "荷兰": "🇳🇱", "日本": "🇯🇵", "瑞典": "🇸🇪", "突尼斯": "🇹🇳",
  "比利时": "🇧🇪", "埃及": "🇪🇬", "伊朗": "🇮🇷", "新西兰": "🇳🇿",
  "西班牙": "🇪🇸", "佛得角": "🇨🇻", "沙特": "🇸🇦", "乌拉圭": "🇺🇾",
  "法国": "🇫🇷", "塞内加尔": "🇸🇳", "伊拉克": "🇮🇶", "挪威": "🇳🇴",
  "阿根廷": "🇦🇷", "阿尔及利亚": "🇩🇿", "奥地利": "🇦🇹", "约旦": "🇯🇴",
  "葡萄牙": "🇵🇹", "刚果(金)": "🇨🇩", "乌兹别克斯坦": "🇺🇿", "哥伦比亚": "🇨🇴",
  "英格兰": "🏴", "克罗地亚": "🇭🇷", "加纳": "🇬🇭", "巴拿马": "🇵🇦",
  "新加坡": "🇸🇬", "中国": "🇨🇳"
};

const ROUND_LABELS = [
  { key: "group", label: "小组赛" },
  { key: "r32", label: "1/16决赛" },
  { key: "r16", label: "1/8决赛" },
  { key: "r8", label: "1/4决赛" },
  { key: "semi", label: "半决赛" },
  { key: "thirdPlace", label: "季军赛" },
  { key: "final", label: "总决赛" }
];

const fallbackNames = [
  "佑仔", "俊杰", "凡强", "小亮", "小明", "总统", "月月", "瓜龙", "维敏", "群少",
  "老色", "老赖", "色霸", "钟董", "阿全", "阿哲", "阿福", "阿苍", "面包"
];
const fallbackScores = [18.6, 12.3, 9.4, 6.1, 3.2, -1.5, -3.7, -6.8, -11.3, -13.1, 8.8, 5.6, 2.4, -2.2, -4.9, 7.3, 1.8, -8.6, -15.6];
const fallbackLeaderboard = fallbackNames.map((name, index) => ({
  name,
  today: fallbackScores[index],
  week: fallbackScores[index],
  score: 512.4 - index * 24.8 + Math.max(fallbackScores[index], 0) * 2
}));
const fallbackMatches = [
  { time: "19:30", home: "德国", away: "法国", score: "-", round: "group", date: formatDateKey(new Date()) },
  { time: "22:00", home: "西班牙", away: "葡萄牙", score: "-", round: "group", date: formatDateKey(new Date()) }
];
const fallbackAI = [
  { bot: "AI 毒舌 Bot", icon: "ai-robot", text: "今日还没真实锐评，先让 AI 坐在替补席热身。" },
  { bot: "狗头军师", icon: "doge", text: "排行榜现在都很克制，像是暴风雨前的余额。" },
  { bot: "熊猫观察员", icon: "panda", text: "美加墨世界杯还没开哨，群里已经有人把冠军剧本写到加时赛了。" },
  { bot: "数据帝 AI", icon: "rank-mascot", text: "别急着梭哈，赔率只是数字，钱包才是真实防线。" },
  { bot: "冷门雷达", icon: "doge", text: "看到冷门就心动的人，一般先动的是余额。" },
  { bot: "中场喷子", icon: "rank-mascot", text: "今天不怕没比赛，就怕你提前把自己奶到淘汰赛。" }
];

let appData = null;
let currentLeaderboard = [];
let currentRankTab = "today";
let activeRound = "group";

let selectedOdds = new Map();
let selectedPasses = new Set();

document.addEventListener("DOMContentLoaded", async () => {
  setupNavigation();
  setupRankTabs();
  setupCalculatorShell();
  renderFallbackFirst();
  await loadRealData();
  await loadOddsData();
});

function renderFallbackFirst() {
  currentLeaderboard = fallbackLeaderboard;
  const ranked = sortLeaderboard(currentLeaderboard, "today");
  renderPodium(ranked);
  renderMiniRank(ranked);
  renderLeaderboard(ranked);
  renderHomeMatches(pickDisplayMatches(fallbackMatches));
  renderAllMatches(fallbackMatches);
  renderAI(normalizeAI([]));
  renderBoards(ranked);
  renderLastUpdated(null);
}

async function loadRealData() {
  try {
    const res = await fetch(`data.json?${Date.now()}`);
    if (!res.ok) throw new Error("data.json 读取失败");
    appData = await res.json();
    currentLeaderboard = buildLeaderboard(appData);
    const ranked = sortLeaderboard(currentLeaderboard, currentRankTab);
    renderPodium(sortLeaderboard(currentLeaderboard, "today"));
    renderMiniRank(sortLeaderboard(currentLeaderboard, "today"));
    renderLeaderboard(ranked);
    renderHomeMatches(pickDisplayMatches(appData.schedule));
    renderAllMatches(appData.schedule);
    renderAI(normalizeAI(appData.aiComments));
    renderBoards(sortLeaderboard(currentLeaderboard, "today"));
    renderLastUpdated(appData);
  } catch (error) {
    console.warn(error);
  }
}

function renderLastUpdated(data) {
  const el = document.getElementById("lastUpdateText");
  if (!el) return;
  const text = data?.lastUpdatedText || data?.lastUpdated || "";
  el.textContent = text ? `最后更新：${text}` : "最后更新：等待云端自动更新";
}

async function loadOddsData() {
  const status = document.getElementById("calcStatus");
  try {
    const res = await fetch(`odds_data.json?${Date.now()}`);
    if (!res.ok) throw new Error("odds_data.json 读取失败");
    const oddsData = await res.json();
    renderOddsCalculator(oddsData);
  } catch (error) {
    console.warn(error);
    if (status) status.textContent = "赔率数据加载失败，请先运行 scrape_odds.py 更新 odds_data.json";
  }
}

function setupNavigation() {
  const buttons = document.querySelectorAll("[data-nav]");
  const jumpers = document.querySelectorAll("[data-go]");

  function go(name) {
    document.querySelectorAll(".screen").forEach(el => el.classList.remove("active"));
    document.getElementById(`screen-${name}`).classList.add("active");
    buttons.forEach(btn => btn.classList.toggle("active", btn.dataset.nav === name));
  }

  buttons.forEach(btn => btn.addEventListener("click", () => go(btn.dataset.nav)));
  jumpers.forEach(el => el.addEventListener("click", () => go(el.dataset.go)));
}

function setupRankTabs() {
  document.querySelectorAll("[data-rank-tab]").forEach(btn => {
    btn.addEventListener("click", () => {
      currentRankTab = btn.dataset.rankTab;
      document.querySelectorAll("[data-rank-tab]").forEach(item => item.classList.remove("active"));
      btn.classList.add("active");
      renderLeaderboard(sortLeaderboard(currentLeaderboard, currentRankTab));
    });
  });
}

function setupCalculatorShell() {
  const multipleInput = document.getElementById("stakeInput");
  const clearBtn = document.getElementById("calcClearBtn");
  if (multipleInput) multipleInput.addEventListener("input", updateCalculatorResult);
  if (clearBtn) clearBtn.addEventListener("click", clearCalculator);
}

function buildLeaderboard(data) {
  const base = Array.isArray(data?.leaderboard) && data.leaderboard.length ? data.leaderboard : fallbackLeaderboard;
  const todayKey = formatDateKey(new Date());
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 6);

  return base.map(player => {
    const history = Array.isArray(data?.betHistory) ? data.betHistory.filter(item => item.name === player.name) : [];
    const todayFromHistory = history
      .filter(item => item.date === todayKey)
      .reduce((sum, item) => sum + (Number(item.netProfit) || 0), 0);
    const weekFromHistory = history
      .filter(item => item.date && parseDateKey(item.date) >= startOfDay(weekStart))
      .reduce((sum, item) => sum + (Number(item.netProfit) || 0), 0);

    return {
      name: player.name,
      today: history.length ? todayFromHistory : Number(player.today) || 0,
      week: history.length ? weekFromHistory : Number(player.week ?? player.today) || 0,
      score: Number(player.score) || 0
    };
  });
}

function normalizeAI(list) {
  const bar = document.getElementById("aiUpdateBar");
  const extraLines = makeDailyAILines();
  const source = Array.isArray(list) && list.length ? [...list] : [...extraLines];
  while (source.length < 6) source.push(extraLines[source.length % extraLines.length]);
  if (bar) bar.textContent = `今日已更新 ${source.length} 条 · 句句扎心`;

  return source.map((item, index) => {
    if (typeof item === "string") {
      return {
        bot: ["AI 毒舌 Bot", "熊猫观察员", "狗头军师", "数据帝 AI"][index % 4],
        icon: ["ai-robot", "panda", "doge", "rank-mascot"][index % 4],
        text: item
      };
    }
    return {
      bot: item.bot || item.name || "AI 毒舌 Bot",
      icon: item.icon || "ai-robot",
      text: item.text || item.comment || String(item)
    };
  });
}

function sortLeaderboard(list, tab) {
  const key = tab === "week" ? "week" : tab === "total" ? "score" : "today";
  return [...(list || [])].sort((a, b) => (b[key] || 0) - (a[key] || 0) || (b.score || 0) - (a.score || 0));
}

function pickDisplayMatches(schedule) {
  const list = Array.isArray(schedule) ? schedule : [];
  if (!list.length) {
    return { label: formatChineseDate(new Date()), suffix: "当日比赛", matches: fallbackMatches };
  }

  const today = new Date();
  const todayKey = formatDateKey(today);
  let dateKey = todayKey;
  let suffix = "当日比赛";
  let matches = list.filter(match => match.date === todayKey);

  if (!matches.length) {
    const futureDate = [...new Set(list.map(match => match.date).filter(Boolean))]
      .filter(date => date >= todayKey)
      .sort()[0];
    if (futureDate) {
      dateKey = futureDate;
      suffix = "下一场比赛";
      matches = list.filter(match => match.date === futureDate);
    }
  }

  matches.sort(sortByDateTime);
  return { label: formatChineseDate(parseDateKey(dateKey)), suffix, matches };
}

function renderHomeMatches(matchGroup) {
  const homeDate = document.getElementById("todayDate");
  if (homeDate) homeDate.textContent = matchGroup.label;
  document.getElementById("homeMatches").innerHTML = renderMatchCards(matchGroup.matches.slice(0, 3), false);
}

function renderAllMatches(schedule) {
  const list = Array.isArray(schedule) && schedule.length ? schedule : fallbackMatches;
  const byRound = {};
  ROUND_LABELS.forEach(round => { byRound[round.key] = []; });
  list.forEach(match => {
    const key = byRound[match.round] ? match.round : "group";
    byRound[key].push(match);
  });

  const availableRounds = ROUND_LABELS.filter(round => byRound[round.key].length);
  if (!availableRounds.find(round => round.key === activeRound)) {
    activeRound = availableRounds[0]?.key || "group";
  }

  const tabs = document.getElementById("roundTabs");
  tabs.innerHTML = availableRounds.map(round => `
    <button class="${round.key === activeRound ? "active" : ""}" data-round="${round.key}" type="button">
      ${round.label}<span>${byRound[round.key].length}</span>
    </button>
  `).join("");
  tabs.onclick = event => {
    const btn = event.target.closest("[data-round]");
    if (!btn) return;
    activeRound = btn.dataset.round;
    renderAllMatches(list);
  };

  const currentRound = ROUND_LABELS.find(round => round.key === activeRound);
  const matches = byRound[activeRound].sort(sortByDateTime);
  const dateText = currentRound ? `${currentRound.label} · 共 ${matches.length} 场` : "完整赛程";
  document.getElementById("matchDate").textContent = dateText;

  const grouped = groupBy(matches, match => match.date || "待定日期");
  document.getElementById("matchList").innerHTML = Object.keys(grouped).sort().map(date => `
    <div class="schedule-date-block">
      <div class="schedule-date-title">📅 ${escapeHtml(date)}</div>
      ${renderMatchCards(grouped[date], true)}
    </div>
  `).join("");
}

function renderMatchCards(matches, showScore) {
  if (!matches.length) return `<article class="match-card empty-match">暂无比赛</article>`;
  return matches.map(match => {
    const center = showScore && match.score && match.score !== "-" ? match.score : "-";
    return `
      <article class="match-card">
        <div class="match-time">🕒 ${escapeHtml(match.time || "待定")}</div>
        <div class="teams">
          <span class="team team-home">${escapeHtml(teamLabel(match.home))}</span>
          <span class="vs">${escapeHtml(center)}</span>
          <span class="team team-away">${escapeHtml(teamLabel(match.away))}</span>
        </div>
      </article>
    `;
  }).join("");
}

function renderPodium(list) {
  const safeList = list.length >= 3 ? list : sortLeaderboard(fallbackLeaderboard, "today");
  const top = [
    { ...safeList[1], rank: 2 },
    { ...safeList[0], rank: 1 },
    { ...safeList[2], rank: 3 }
  ];

  document.getElementById("podium").innerHTML = top.map(item => `
    <article class="podium-card ${item.rank === 1 ? "first" : ""}">
      <div class="podium-avatar ${podiumClass(item.rank)}">
        <span class="podium-photo">
          <img src="${avatar(item.name)}" alt="${escapeHtml(item.name)}">
        </span>
        <span class="podium-frame"></span>
      </div>
      <div class="podium-name">${escapeHtml(item.name)}</div>
      <div class="score-plus">${formatPoint(item.today)}</div>
    </article>
  `).join("");
}

function renderMiniRank(list) {
  document.getElementById("miniRank").innerHTML = list.slice(3, 7).map((item, index) => `
    <div class="rank-line">
      <span class="rank-no">${index + 4}</span>
      <span class="rank-name">${escapeHtml(item.name)}</span>
      <span class="points ${item.today < 0 ? "down" : ""}">${formatPoint(item.today)}</span>
      <span class="rank-slash">/</span>
      <span class="points total ${item.score < 0 ? "down" : ""}">${formatPoint(item.score)}</span>
    </div>
  `).join("");
}

function renderLeaderboard(list) {
  document.getElementById("leaderboard").innerHTML = list.map((item, index) => `
    <div class="leader-row">
      <span class="rank-no">${index + 1}</span>
      <img class="rank-avatar" src="${avatar(item.name)}" alt="${escapeHtml(item.name)}">
      <span class="leader-name">${escapeHtml(item.name)} <span class="tag">${tagFor(index)}</span></span>
      <span class="points ${scoreForTab(item) < 0 ? "down" : ""}">${formatPoint(scoreForTab(item))}</span>
    </div>
  `).join("");
}

function renderAI(comments) {
  document.getElementById("aiComments").innerHTML = comments.map(item => `
    <article class="comment-card">
      <img src="${mascot(item.icon)}" alt="${escapeHtml(item.bot)}">
      <div>
        <h3>${escapeHtml(item.bot)}</h3>
        <p>${escapeHtml(item.text)}</p>
      </div>
    </article>
  `).join("");
}

function renderBoards(list) {
  document.getElementById("godBoard").innerHTML = list.slice(0, 3).map((item, index) => `
    <div class="board-row">
      <strong>${index + 1}</strong>
      <span>${escapeHtml(item.name)}</span>
      <span class="points">${formatPoint(item.today)}</span>
    </div>
  `).join("");

  document.getElementById("curseBoard").innerHTML = [...list].sort((a, b) => (a.today || 0) - (b.today || 0)).slice(0, 3).map((item, index) => `
    <div class="board-row">
      <strong>${index + 1}</strong>
      <span>${escapeHtml(item.name)}</span>
      <span class="points down">${formatPoint(item.today)}</span>
    </div>
  `).join("");
}

function renderOddsCalculator(oddsData) {
  const status = document.getElementById("calcStatus");
  const list = document.getElementById("oddsMatchList");
  if (!status || !list) return;

  const matches = oddsData.matches || [];
  if (!matches.length) {
    status.textContent = "等待世界杯赔率数据";
    list.innerHTML = `<div class="selected-empty odds-empty">世界杯赔率出来后，这里只显示世界杯赛程。</div>`;
    renderPassButtons();
    updateCalculatorResult();
    return;
  }

  status.textContent = `来源：${oddsData.source || "未知"} · 更新：${oddsData.updatedAt || "-"} · ${matches.length} 场`;
  list.innerHTML = matches.map((match, index) => renderOddsMatch(match, index === 0)).join("");
  renderPassButtons();

  list.onclick = event => {
    const toggle = event.target.closest(".odds-match-toggle");
    if (toggle) {
      toggle.closest(".odds-match").classList.toggle("open");
      return;
    }

    const btn = event.target.closest(".odds-chip");
    if (!btn || btn.disabled) return;
    toggleOdd(btn);
  };
  updatePlayLocks();
  updateCalculatorResult();
}

function renderOddsMatch(match, open) {
  const groups = match.playGroups || [];
  return `
    <article class="odds-match ${open ? "open" : ""}" data-match-id="${escapeHtml(match.matchId)}">
      <button class="odds-match-toggle" type="button">
        <span>
          <strong>${escapeHtml(match.home)} - ${escapeHtml(match.away)}</strong>
          <em>${escapeHtml(match.lotteryId || "")} · ${escapeHtml(match.league || "")} · ${escapeHtml(shortMatchTime(match.matchTime))}</em>
        </span>
        <b>⌄</b>
      </button>
      <div class="odds-match-body">
        ${groups.map((group, index) => renderPlayGroup(match, group, groups[index - 1])).join("")}
      </div>
    </article>
  `;
}

function renderPlayGroup(match, group, previousGroup) {
  const items = validItems(group);
  if (!items.length) return "";
  const currentPlayKey = playKey(group);
  const joined = isWinDrawGroup(group) && isWinDrawGroup(previousGroup) ? "joined" : "";
  return `
    <div class="calc-play-group ${joined}">
      <div class="calc-play-title">${escapeHtml(compactPlayTitle(group.title))}</div>
      <div class="odds-chip-grid">
        ${items.map(item => {
          const key = selectionKey(match, group, item);
          return `
            <button class="odds-chip" type="button"
              data-key="${escapeHtml(key)}"
              data-match-id="${escapeHtml(match.matchId)}"
              data-match="${escapeHtml(match.home + ' - ' + match.away)}"
              data-play-key="${escapeHtml(currentPlayKey)}"
              data-play="${escapeHtml(group.title)}"
              data-label="${escapeHtml(item.label)}"
              data-odd="${escapeHtml(item.value)}">
              <span>${escapeHtml(item.label)}</span>
              <strong>${formatOdd(item.value)}</strong>
            </button>
          `;
        }).join("")}
      </div>
    </div>
  `;
}

function toggleOdd(btn) {
  const key = btn.dataset.key;
  if (selectedOdds.has(key)) {
    selectedOdds.delete(key);
    btn.classList.remove("active");
  } else {
    selectedOdds.set(key, {
      key,
      matchId: btn.dataset.matchId,
      match: btn.dataset.match,
      playKey: btn.dataset.playKey,
      play: btn.dataset.play,
      label: btn.dataset.label,
      odd: Number(btn.dataset.odd)
    });
    btn.classList.add("active");
  }
  updatePlayLocks();
  updateCalculatorResult();
}

function updatePlayLocks() {
  document.querySelectorAll(".odds-chip").forEach(btn => {
    const lockedPlayKey = selectedPlayForMatch(btn.dataset.matchId);
    const disabled = Boolean(lockedPlayKey && lockedPlayKey !== btn.dataset.playKey);
    btn.disabled = disabled;
    btn.classList.toggle("disabled", disabled);
  });
}

function renderPassButtons() {
  const el = document.getElementById("calcPassButtons");
  if (!el) return;
  el.innerHTML = Array.from({ length: 8 }, (_, index) => {
    const value = index + 1;
    return `<button class="calc-pass-btn" type="button" data-pass="${value}" disabled>${value === 1 ? "单关" : value + "关"}</button>`;
  }).join("");
  el.onclick = event => {
    const btn = event.target.closest("[data-pass]");
    if (!btn || btn.disabled) return;
    const pass = Number(btn.dataset.pass);
    if (selectedPasses.has(pass)) selectedPasses.delete(pass);
    else selectedPasses.add(pass);
    updateCalculatorResult(false);
  };
}

function updatePassButtons(matchCount, autoPick = true) {
  const maxPass = Math.min(matchCount, 8);
  const minPass = matchCount >= 2 ? 2 : 1;
  selectedPasses.forEach(pass => {
    if (pass > maxPass || pass < minPass) selectedPasses.delete(pass);
  });
  if (autoPick && matchCount > 0 && selectedPasses.size === 0) selectedPasses.add(maxPass);

  document.querySelectorAll(".calc-pass-btn").forEach(btn => {
    const pass = Number(btn.dataset.pass);
    const enabled = matchCount > 0 && pass >= minPass && pass <= maxPass;
    btn.disabled = !enabled;
    btn.classList.toggle("disabled", !enabled);
    btn.classList.toggle("active", enabled && selectedPasses.has(pass));
  });
}

function updateCalculatorResult(autoPickPass = true) {
  const multipleInput = document.getElementById("stakeInput");
  const returnAmount = document.getElementById("returnAmount");
  const profitAmount = document.getElementById("profitAmount");
  const selectedList = document.getElementById("selectedOdds");
  const stats = document.getElementById("calcStats");
  if (!multipleInput || !returnAmount || !profitAmount || !selectedList || !stats) return;

  const grouped = groupedSelections();
  const matchIds = Object.keys(grouped);
  updatePassButtons(matchIds.length, autoPickPass);

  let multiple = Math.max(0, Math.floor(Number(multipleInput.value) || 0));
  if (String(multipleInput.value) !== String(multiple)) multipleInput.value = String(multiple);
  const stake = 2 * multiple;
  const passSizes = [...selectedPasses].sort((a, b) => a - b);

  let ticketCount = 0;
  let maxPrize = 0;
  let minPrize = 0;

  if (matchIds.length > 0 && passSizes.length > 0) {
    passSizes.forEach(passSize => {
      combinations(matchIds, passSize).forEach(ids => {
        const groups = ids.map(id => grouped[id]);
        ticketCount += countTickets(groups);
        maxPrize += sumProducts(groups) * stake;
        const comboMin = minProduct(groups) * stake;
        minPrize = minPrize === 0 ? comboMin : Math.min(minPrize, comboMin);
      });
    });
  }

  const totalStake = ticketCount * stake;
  returnAmount.textContent = formatMoney(totalStake);
  profitAmount.textContent = formatMoney(maxPrize);
  stats.innerHTML = `
    <span>场次 ${matchIds.length}</span>
    <span>选项 ${selectedOdds.size}</span>
    <span>注数 ${ticketCount}</span>
    <span>最低 ${formatMoney(minPrize)}</span>
  `;

  const picks = [...selectedOdds.values()];
  selectedList.innerHTML = picks.length ? picks.map(item => `
    <div class="selected-odd-row">
      <span>${escapeHtml(item.match)} · ${escapeHtml(item.play)} · ${escapeHtml(item.label)}</span>
      <strong>${formatOdd(item.odd)}</strong>
    </div>
  `).join("") : `<div class="selected-empty">选择上面的玩法后自动计算</div>`;
}

function clearCalculator() {
  selectedOdds.clear();
  selectedPasses.clear();
  document.querySelectorAll(".odds-chip.active").forEach(btn => btn.classList.remove("active"));
  updatePlayLocks();
  updateCalculatorResult();
}

function groupedSelections() {
  const map = {};
  selectedOdds.forEach(item => {
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
  return groups.reduce((sum, group) => sum * group.reduce((inner, item) => inner + item.odd, 0), 1);
}

function minProduct(groups) {
  return groups.reduce((sum, group) => sum * Math.min(...group.map(item => item.odd)), 1);
}

function countTickets(groups) {
  return groups.reduce((sum, group) => sum * group.length, 1);
}

function selectedPlayForMatch(matchId) {
  const found = [...selectedOdds.values()].find(item => item.matchId === String(matchId));
  return found ? found.playKey : "";
}

function selectionKey(match, group, item) {
  return [match.matchId, group.key || group.title, item.label].join("::");
}

function playKey(group) {
  const key = group.key || group.title;
  if (key === "spf" || key === "rqspf") return "spf-mix";
  return key;
}

function isWinDrawGroup(group) {
  const key = group ? (group.key || group.title) : "";
  return key === "spf" || key === "rqspf";
}

function compactPlayTitle(title) {
  return String(title || "").startsWith("让球胜平负") ? String(title).replace("让球胜平负", "让球") : title;
}

function validItems(group) {
  return (group.items || []).filter(item => item.value !== null && item.value !== undefined && item.value !== "");
}

function teamLabel(name) {
  if (!name) return "待定";
  return `${COUNTRY_FLAGS[name] || ""}${name}`;
}

function avatar(name) {
  return `assets/avatars/${encodeURIComponent(name)}.jpg`;
}

function mascot(name) {
  return `assets/generated/${name}.png`;
}

function podiumClass(rankNumber) {
  if (rankNumber === 1) return "rank-1";
  if (rankNumber === 2) return "rank-2";
  return "rank-3";
}

function scoreForTab(item) {
  if (currentRankTab === "week") return item.week;
  if (currentRankTab === "total") return item.score;
  return item.today;
}

function tagFor(index) {
  const tags = [
    "连红", "上头", "逆红", "稳健", "冷门王", "玄学家", "梭哈怪", "小赚哥",
    "毒奶中", "反买灯塔", "锦鲤体质", "铁头娃", "赔率控", "临场王", "收米中",
    "爆冷猎手", "守纪律", "红单雷达", "防守型", "加时狂魔", "边路快马", "小组赛王"
  ];
  return tags[index % tags.length];
}

function makeDailyAILines() {
  const ranked = sortLeaderboard(currentLeaderboard.length ? currentLeaderboard : fallbackLeaderboard, "today");
  const top1 = ranked[0] || {};
  const top2 = ranked[1] || top1;
  const top3 = ranked[2] || top1;
  const mid = ranked[Math.min(5, ranked.length - 1)] || top1;
  const low2 = ranked[ranked.length - 2] || top1;
  const last = ranked[ranked.length - 1] || top1;
  return [
    { bot: "AI 毒舌 Bot", icon: "ai-robot", text: `${top1.name || "榜一"} 今天 ${formatPoint(top1.today)}，像刚从北美主场通道跑出来。先别庆祝，记账表还没吹终场哨。` },
    { bot: "熊猫观察员", icon: "panda", text: `${top2.name || "第二名"} 现在排第二，表情应该很淡定，手指估计已经在下一场赔率上发抖了。` },
    { bot: "狗头军师", icon: "doge", text: `${top3.name || "第三名"} 这个位置最危险，前面追不上，后面一堆人等着看你翻车。` },
    { bot: "数据帝 AI", icon: "rank-mascot", text: `${mid.name || "中游选手"} 今天 ${formatPoint(mid.today)}，属于看起来没亏，仔细一算也没怎么赢的艺术流派。` },
    { bot: "冷门雷达", icon: "doge", text: `${low2.name || "倒数第二"} 离垫底只差一个冲动单，建议先喝水，再看赔率。` },
    { bot: "中场喷子", icon: "rank-mascot", text: `${last.name || "垫底选手"} 今天 ${formatPoint(last.today)}，美加墨还没开到淘汰赛，你的钱包已经踢附加赛了。` }
  ];
}

function formatPoint(value) {
  const number = Number(value) || 0;
  return `${number >= 0 ? "+" : ""}${formatNumber(number)}`;
}

function formatNumber(value) {
  const number = Number(value) || 0;
  return Number.isInteger(number) ? String(number) : number.toFixed(1);
}

function formatOdd(value) {
  if (value === null || value === undefined || value === "") return "-";
  return Number(value).toFixed(2).replace(/\.00$/, "");
}

function formatMoney(value) {
  return Number(value || 0).toFixed(2);
}

function formatDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function parseDateKey(key) {
  const [year, month, day] = String(key).split("-").map(Number);
  return new Date(year, month - 1, day);
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function formatChineseDate(date) {
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

function shortMatchTime(matchTime) {
  if (!matchTime) return "";
  return matchTime.replace("T", " ").slice(5, 16);
}

function sortByDateTime(a, b) {
  return String(a.date || "").localeCompare(String(b.date || "")) || String(a.time || "").localeCompare(String(b.time || ""));
}

function groupBy(list, getter) {
  return list.reduce((map, item) => {
    const key = getter(item);
    if (!map[key]) map[key] = [];
    map[key].push(item);
    return map;
  }, {});
}

function escapeHtml(text) {
  return String(text ?? "").replace(/[&<>"']/g, ch => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  }[ch]));
}
