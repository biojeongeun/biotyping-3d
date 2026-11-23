import { BioScene } from './three/BioScene.js';
import { DARWIN_STAGE } from './data/darwin.js';
import { TAXONOMY_STAGE } from './data/taxonomy.js';
import { METABOLISM_STAGE } from './data/metabolism.js';
import { BIOTECH_STAGE } from './data/biotech.js';
import { formatTimeMs, getRankedRecords, resetAllRecords, saveRecord } from './data/leaderboard.js';
import { getChosung, normalizeAnswer } from './utils/hangul.js';
import { soundFX } from './utils/sound.js';

const NICK_KEY = 'biotyping_3d_nickname';

const DNA_LENGTH = 30;
const PENALTY_MS = 3000;
const INTRO_MS = 1600;
const COMPLEMENT = { A: 'T', T: 'A', G: 'C', C: 'G' };
const KEY_TO_BASE = { KeyA: 'A', KeyT: 'T', KeyG: 'G', KeyC: 'C' };
const MODE_LABEL = { combo: '올콤보 모드', time: '타임어택 모드' };

const STAGES = {
  stage1: {
    badge: 'STAGE 1 · 통합과학 1',
    name: '통합과학 1',
    total: DNA_LENGTH,
    subtitle: 'DNA 이중나선의 염기 30개를 상보적 결합(A-T, G-C)으로 완성하세요',
    startLabel: 'DNA 염기 맞추기 시작하기',
    desc: {
      combo: '30개를 틀리지 않고 연속으로 맞히면 <strong>ALL COMBO</strong>! 틀리면 콤보가 0으로 돌아가고 그 염기를 다시 풀어야 합니다.',
      time: '30개를 가장 빠르게 완성하세요. 틀릴 때마다 <strong>+3초</strong> 패널티가 붙습니다.',
    },
  },
  stage2: {
    badge: 'STAGE 2 · 통합과학 2',
    name: '통합과학 2',
    total: DARWIN_STAGE.items.length,
    subtitle: '자연선택설 용어를 맞혀 다윈의 비글호를 갈라파고스제도까지 항해시키세요',
    startLabel: '비글호 항해 시작하기',
    desc: {
      combo: '상세 힌트와 초성을 보고 용어를 입력하세요. 틀리지 않고 항해하면 <strong>ALL COMBO</strong>! 틀리면 콤보가 0이 되고 배가 흔들립니다.',
      time: '핵심 키워드 힌트만 주어집니다. 가장 빠르게 도착하세요. 틀릴 때마다 <strong>+3초</strong> 패널티가 붙습니다.',
    },
  },
  stage3: {
    badge: 'STAGE 3 · 생명과학',
    name: '생명과학',
    total: TAXONOMY_STAGE.items.length,
    subtitle: '3역 6계와 식물·동물의 분류 용어를 맞혀 생명의 계통수를 완성하세요',
    startLabel: '계통수 키우기 시작하기',
    desc: {
      combo: '상세 힌트와 초성을 보고 용어를 입력하세요. 틀리지 않고 계통수를 완성하면 <strong>ALL COMBO</strong>! 틀리면 콤보가 0이 됩니다.',
      time: '핵심 키워드 힌트만 주어집니다. 가장 빠르게 계통수를 완성하세요. 틀릴 때마다 <strong>+3초</strong> 패널티가 붙습니다.',
    },
  },
  stage4: {
    badge: 'STAGE 4 · 세포와 물질대사',
    name: '세포와 물질대사',
    total: METABOLISM_STAGE.items.length,
    subtitle: '마이토콘드리아(세포호흡)와 엽록체(광합성) 속 핵심 구조와 반응 용어를 맞히세요',
    startLabel: '세포호흡·광합성 탐험 시작하기',
    desc: {
      combo: '상세 힌트와 초성을 보고 용어를 입력하세요. 틀리지 않고 두 소기관을 모두 밝히면 <strong>ALL COMBO</strong>!',
      time: '핵심 키워드 힌트만 주어집니다. 가장 빠르게 두 소기관을 완성하세요. 틀릴 때마다 <strong>+3초</strong> 패널티가 붙습니다.',
    },
  },
  stage5: {
    badge: 'STAGE 5 · 생물의 유전',
    name: '생물의 유전',
    total: BIOTECH_STAGE.items.length,
    subtitle: '첨단 홀로그램 바이오랩에서 현대 생명공학기술 핵심 용어를 마스터하세요',
    startLabel: '생명공학기술 랩 가동하기',
    desc: {
      combo: '상세 힌트와 초성을 보고 용어를 입력하세요. 틀리지 않고 5개 플랫폼을 모두 가동하면 <strong>ALL COMBO</strong>!',
      time: '핵심 키워드 힌트만 주어집니다. 가장 빠르게 바이오랩을 가동하세요. 틀릴 때마다 <strong>+3초</strong> 패널티가 붙습니다.',
    },
  },
};
const READY_STAGES = Object.keys(STAGES);

const $ = (id) => document.getElementById(id);
const canvas = $('bio-canvas');
const startScreen = $('start-screen');
const nicknameInput = $('nickname-input');
const btnOpenLeaderboard = $('btn-open-leaderboard');
const btnMuteStart = $('btn-mute-start');
const btnMuteHud = $('btn-mute-hud');
const stageCards = document.querySelectorAll('#stage-grid .stage-card');
const modeCards = document.querySelectorAll('#mode-grid .mode-card');
const btnStartGame = $('btn-start-game');
const btnStartLabel = $('btn-start-label');
const brandSubtitle = $('brand-subtitle');
const modeDescCombo = $('mode-desc-combo');
const modeDescTime = $('mode-desc-time');

const hud = $('hud');
const btnQuit = $('btn-quit');
const hudStageName = $('hud-stage-name');
const hudModeName = $('hud-mode-name');
const hudTimer = $('hud-timer');
const hudComboBox = $('hud-combo-box');
const hudCombo = $('hud-combo');
const hudProgress = $('hud-progress');

// STAGE 1 패널 (염기 버튼)
const dnaPanel = $('gameplay-panel');
const dnaCard = $('question-card');
const questionStep = $('question-step');
const givenBase = $('given-base');
const baseBtnRow = $('input-wrapper');
const baseButtons = document.querySelectorAll('.base-btn');
const dnaFeedback = $('live-feedback');

// STAGE 2 패널 (용어 타이핑)
const typingPanel = $('typing-panel');
const typingCard = $('typing-card');
const typingStep = $('typing-step');
const typingPlace = $('typing-place');
const typingChosung = $('typing-chosung');
const typingHint = $('typing-hint');
const typingWrapper = $('typing-wrapper');
const typingInput = $('typing-input');
const btnSubmit = $('btn-submit');
const typingFeedback = $('typing-feedback');

const resultScreen = $('result-screen');
const resultBadge = $('result-badge');
const resultTitle = $('result-title');
const resultSubtitle = $('result-subtitle');
const resultSummary = $('result-summary');
const resultMetrics = $('result-metrics');
const metricTime = $('metric-time');
const metricCombo = $('metric-combo');
const metricMistakes = $('metric-mistakes');
const lbStageTabs = document.querySelectorAll('#lb-stage-tabs .lb-tab');
const lbModeBtns = document.querySelectorAll('#lb-mode-tabs .lb-mode-btn');
const lbRuleCaption = $('lb-rule-caption');
const leaderboardTbody = $('leaderboard-tbody');
const btnResetLeaderboard = $('btn-reset-leaderboard');
const btnRetrySame = $('btn-retry-same');
const btnBackHome = $('btn-back-home');

const bioScene = new BioScene(canvas);

const state = {
  selectedStage: 'stage1',
  selectedMode: 'combo',
  nickname: '바이오탐험가',
  gameStage: 'stage1',
  sequence: [],
  index: 0,
  combo: 0,
  maxCombo: 0,
  mistakes: 0,
  running: false,
  inGame: false,
  startPerf: 0,
  timerRaf: null,
  introTimeout: null,
  finishTimeout: null,
  transitioning: false,
  isComposing: false,
  lbStage: 'stage1',
  lbMode: 'combo',
  lastSavedRecordId: null,
};

function sanitizeNickname(raw) {
  const trimmed = String(raw || '').trim().slice(0, 12);
  return trimmed || '바이오탐험가';
}

function syncMuteButtons() {
  const icon = soundFX.muted ? '🔇' : '🔊';
  [btnMuteStart, btnMuteHud].forEach((btn) => {
    if (!btn) return;
    btn.textContent = icon;
    btn.classList.toggle('muted', soundFX.muted);
  });
}

try {
  const savedNick = localStorage.getItem(NICK_KEY);
  if (savedNick) {
    state.nickname = sanitizeNickname(savedNick);
    nicknameInput.value = state.nickname;
  }
} catch {
  // 무시
}
syncMuteButtons();

function randomSequence(length) {
  const bases = ['A', 'T', 'G', 'C'];
  return Array.from({ length }, () => bases[Math.floor(Math.random() * bases.length)]);
}

function setFeedback(el, text, cls = '') {
  el.className = `live-feedback ${cls}`.trim();
  el.textContent = text;
}

/* ---------- 시작 화면 ---------- */
function refreshStartScreen() {
  const cfg = STAGES[state.selectedStage];
  const ready = Boolean(cfg);
  btnStartGame.disabled = !ready;
  btnStartLabel.textContent = ready ? cfg.startLabel : '이 STAGE는 준비 중입니다';
  if (ready) {
    brandSubtitle.textContent = cfg.subtitle;
    modeDescCombo.innerHTML = cfg.desc.combo;
    modeDescTime.innerHTML = cfg.desc.time;
  }
}

stageCards.forEach((card) => {
  card.addEventListener('click', () => {
    soundFX.playClick();
    stageCards.forEach((c) => c.classList.remove('active'));
    card.classList.add('active');
    state.selectedStage = card.dataset.stage;
    bioScene.loadStage(state.selectedStage);
    refreshStartScreen();
  });
});

modeCards.forEach((card) => {
  card.addEventListener('click', () => {
    soundFX.playClick();
    modeCards.forEach((c) => c.classList.remove('active'));
    card.classList.add('active');
    state.selectedMode = card.dataset.mode;
  });
});

[btnMuteStart, btnMuteHud].forEach((btn) => {
  btn.addEventListener('click', () => {
    soundFX.toggleMute();
    syncMuteButtons();
    if (!soundFX.muted) soundFX.playClick();
  });
});

btnOpenLeaderboard.addEventListener('click', () => {
  soundFX.playClick();
  openLeaderboardOnly();
});

btnStartGame.addEventListener('click', () => {
  soundFX.playClick();
  startGame();
});
btnRetrySame.addEventListener('click', () => {
  soundFX.playClick();
  startGame();
});
btnBackHome.addEventListener('click', () => {
  soundFX.playClick();
  resultScreen.classList.add('hidden');
  startScreen.classList.remove('hidden');
  bioScene.loadStage(state.selectedStage);
});
btnQuit.addEventListener('click', () => {
  soundFX.playClick();
  quitToStart();
});

/* ---------- 타이머 ---------- */
function currentTimeMs() {
  const elapsed = performance.now() - state.startPerf;
  return state.selectedMode === 'time' ? elapsed + state.mistakes * PENALTY_MS : elapsed;
}

function startTimer() {
  stopTimer();
  state.startPerf = performance.now();
  const tick = () => {
    if (!state.running) return;
    hudTimer.textContent = formatTimeMs(currentTimeMs());
    state.timerRaf = requestAnimationFrame(tick);
  };
  state.timerRaf = requestAnimationFrame(tick);
}

function stopTimer() {
  if (state.timerRaf !== null) {
    cancelAnimationFrame(state.timerRaf);
    state.timerRaf = null;
  }
}

/* ---------- 공통 게임 흐름 ---------- */
function total() {
  return STAGES[state.gameStage].total;
}

function startGame() {
  const stage = state.selectedStage;
  if (!STAGES[stage]) return;

  state.nickname = sanitizeNickname(nicknameInput.value);
  nicknameInput.value = state.nickname;
  try {
    localStorage.setItem(NICK_KEY, state.nickname);
  } catch {
    // 무시
  }
  state.lastSavedRecordId = null;

  clearTimeout(state.introTimeout);
  clearTimeout(state.finishTimeout);

  state.gameStage = stage;
  state.index = 0;
  state.combo = 0;
  state.maxCombo = 0;
  state.mistakes = 0;
  state.running = false;
  state.inGame = true;
  state.transitioning = false;
  state.isComposing = false;

  hudStageName.textContent = STAGES[stage].badge;
  hudModeName.textContent = MODE_LABEL[state.selectedMode];
  hudCombo.textContent = '0';
  hudTimer.textContent = '0:00.00';
  hudProgress.textContent = `0 / ${total()}`;

  dnaPanel.classList.add('hidden');
  typingPanel.classList.add('hidden');

  if (stage === 'stage1') {
    // DNA 이중나선을 먼저 보여 준다 (정답 쪽 가닥은 비어 있음)
    state.sequence = randomSequence(DNA_LENGTH);
    bioScene.startDNAGame(state.sequence);
    questionStep.textContent = 'READY';
    givenBase.textContent = '?';
    givenBase.className = 'dna-base-chip base-unknown';
    setFeedback(dnaFeedback, `DNA 이중나선을 확인하세요. 염기 ${DNA_LENGTH}개의 짝을 맞춰야 합니다. (A-T, G-C)`);
    setBaseInputEnabled(false);
    dnaPanel.classList.remove('hidden');
  } else {
    // STAGE 2: 비글호 / STAGE 3: 계통수 / STAGE 4: 마이토콘드리아·엽록체
    if (stage === 'stage2') {
      bioScene.startVoyage(total());
      typingPlace.textContent = '영국 플리머스 항';
      typingHint.textContent = '다윈이 비글호에 올랐습니다. 질문에 답하면 배가 갈라파고스제도를 향해 나아갑니다!';
      setFeedback(typingFeedback, '항해 준비 중…');
    } else if (stage === 'stage3') {
      bioScene.startTree(TAXONOMY_STAGE);
      typingPlace.textContent = '생명의 나무';
      typingHint.textContent = '모든 생물은 하나의 공통 조상에서 갈라져 나왔어요. 용어를 맞히면 계통수의 가지가 자라납니다!';
      setFeedback(typingFeedback, '계통수를 살펴보세요…');
    } else if (stage === 'stage4') {
      bioScene.startMetabolism(METABOLISM_STAGE);
      typingPlace.textContent = '마이토콘드리아 & 엽록체';
      typingHint.textContent = '세포호흡과 광합성이 일어나는 두 세포소기관의 내부 구조와 반응을 하나씩 밝혀 보세요!';
      setFeedback(typingFeedback, '두 소기관을 관찰하세요…');
    } else {
      bioScene.startBiotech(BIOTECH_STAGE);
      typingPlace.textContent = '홀로그램 바이오랩';
      typingHint.textContent = '유전자 재조합부터 CRISPR 유전자 가위까지, 5개 홀로그램 플랫폼을 차례로 가동해 보세요!';
      setFeedback(typingFeedback, '바이오랩을 스캔하는 중…');
    }
    typingStep.textContent = 'READY';
    typingChosung.classList.add('hidden');
    typingInput.value = '';
    typingInput.disabled = true;
    btnSubmit.disabled = true;
    typingPanel.classList.remove('hidden');
  }

  startScreen.classList.add('hidden');
  resultScreen.classList.add('hidden');
  hud.classList.remove('hidden');

  state.introTimeout = setTimeout(beginPlaying, INTRO_MS);
}

function beginPlaying() {
  if (!state.inGame) return;
  state.running = true;
  if (state.gameStage === 'stage1') {
    setBaseInputEnabled(true);
    renderDnaStep();
  } else {
    if (state.gameStage === 'stage2') bioScene.followShip();
    else if (state.gameStage === 'stage3') bioScene.followNode(0);
    else if (state.gameStage === 'stage4') bioScene.focusMetabolismPin(0);
    else bioScene.focusBiotechPin(0);
    typingInput.disabled = false;
    btnSubmit.disabled = false;
    renderVoyageStep();
  }
  startTimer();
}

function registerCorrect() {
  state.combo += 1;
  state.maxCombo = Math.max(state.maxCombo, state.combo);
  hudCombo.textContent = String(state.combo);
  hudComboBox.classList.remove('bump');
  void hudComboBox.offsetWidth;
  hudComboBox.classList.add('bump');
  soundFX.playCorrect(state.combo);
}

function registerWrong() {
  state.mistakes += 1;
  state.combo = 0;
  hudCombo.textContent = '0';
  soundFX.playWrong();
}

function shake(el) {
  el.classList.remove('shake-error');
  void el.offsetWidth;
  el.classList.add('shake-error');
  setTimeout(() => el.classList.remove('shake-error'), 420);
}

function penaltyNote() {
  return state.selectedMode === 'time' ? ' +3초 패널티' : ' 콤보가 0으로 돌아갑니다';
}

function showResult({ badge, title, subtitle, summary = '', totalMs }) {
  hud.classList.add('hidden');
  dnaPanel.classList.add('hidden');
  typingPanel.classList.add('hidden');

  const ms = totalMs ?? currentTimeMs();
  const allCombo = state.mistakes === 0;
  soundFX.playClear(allCombo);

  const saved = saveRecord({
    stage: state.gameStage,
    mode: state.selectedMode,
    nickname: state.nickname,
    maxCombo: state.maxCombo,
    allCombo,
    mistakes: state.mistakes,
    timeMs: ms,
  });
  state.lastSavedRecordId = saved.id;

  resultMetrics.classList.remove('hidden');
  btnRetrySame.classList.remove('hidden');
  resultBadge.textContent = badge;
  resultTitle.textContent = title;
  resultSubtitle.textContent = `${state.nickname} · ${subtitle}`;
  resultSummary.textContent = summary;
  resultSummary.classList.toggle('hidden', !summary);
  metricTime.textContent = formatTimeMs(ms);
  metricCombo.textContent = `${state.maxCombo} COMBO`;
  metricMistakes.textContent = `${state.mistakes}회`;

  state.lbStage = state.gameStage;
  state.lbMode = state.selectedMode;
  syncLeaderboardTabs();
  renderLeaderboard();
  resultScreen.classList.remove('hidden');
}

function openLeaderboardOnly() {
  state.lastSavedRecordId = null;
  state.lbStage = state.selectedStage;
  state.lbMode = state.selectedMode;

  resultBadge.textContent = 'HALL OF FAME';
  resultTitle.textContent = '명예의 전당 순위표';
  resultSubtitle.textContent = '2022 개정 생명과학 STAGE별 · 모드별 TOP 기록';
  resultSummary.classList.add('hidden');
  resultMetrics.classList.add('hidden');
  btnRetrySame.classList.add('hidden');

  syncLeaderboardTabs();
  renderLeaderboard();

  startScreen.classList.add('hidden');
  resultScreen.classList.remove('hidden');
}

function syncLeaderboardTabs() {
  lbStageTabs.forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.lbStage === state.lbStage);
  });
  lbModeBtns.forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.lbMode === state.lbMode);
  });
  lbRuleCaption.textContent =
    state.lbMode === 'combo'
      ? '정렬 기준: 올콤보(ALL COMBO) 달성 최우선 → 최대 콤보 수 → 클리어 시간 빠른 순'
      : '정렬 기준: 클리어 시간이 가장 빠른 순서(오름차순)';
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderLeaderboard() {
  const rows = getRankedRecords(state.lbStage, state.lbMode);
  leaderboardTbody.innerHTML = '';

  if (rows.length === 0) {
    const tr = document.createElement('tr');
    tr.innerHTML = '<td colspan="5" class="lb-empty">아직 기록이 없습니다. 첫 번째 기록의 주인공이 되어 보세요!</td>';
    leaderboardTbody.appendChild(tr);
    return;
  }

  rows.forEach((rec, idx) => {
    const tr = document.createElement('tr');
    if (state.lastSavedRecordId && rec.id === state.lastSavedRecordId) {
      tr.className = 'me-row';
    }
    const rank = idx + 1;
    const rankClass = rank <= 3 ? `rank-${rank}` : '';
    const allComboBadge = rec.allCombo ? '<span class="allcombo-chip">ALL COMBO</span>' : '';
    tr.innerHTML = `
      <td><span class="rank-pill ${rankClass}">${rank}</span></td>
      <td>${escapeHtml(rec.nickname)}</td>
      <td>${rec.maxCombo} COMBO ${allComboBadge}</td>
      <td>${rec.mistakes ?? 0}회</td>
      <td>${formatTimeMs(rec.timeMs)}</td>
    `;
    leaderboardTbody.appendChild(tr);
  });
}

lbStageTabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    soundFX.playClick();
    state.lbStage = tab.dataset.lbStage;
    syncLeaderboardTabs();
    renderLeaderboard();
  });
});

lbModeBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    soundFX.playClick();
    state.lbMode = btn.dataset.lbMode;
    syncLeaderboardTabs();
    renderLeaderboard();
  });
});

btnResetLeaderboard.addEventListener('click', () => {
  const ok = window.confirm(
    '모든 STAGE·모드의 순위 기록이 삭제되고 되돌릴 수 없습니다.\n정말 순위를 초기화할까요?'
  );
  if (!ok) return;
  resetAllRecords();
  state.lastSavedRecordId = null;
  renderLeaderboard();
});

function subtitleFor(stage) {
  const penalty =
    state.selectedMode === 'time' && state.mistakes > 0
      ? ` · 패널티 +${(state.mistakes * PENALTY_MS) / 1000}초 포함`
      : '';
  return `${STAGES[stage].name} · ${MODE_LABEL[state.selectedMode]}${penalty}`;
}

function quitToStart() {
  clearTimeout(state.introTimeout);
  clearTimeout(state.finishTimeout);
  state.running = false;
  state.inGame = false;
  stopTimer();
  hud.classList.add('hidden');
  dnaPanel.classList.add('hidden');
  typingPanel.classList.add('hidden');
  startScreen.classList.remove('hidden');
  bioScene.loadStage(state.selectedStage);
}

/* =========================================================
 * STAGE 1: DNA 염기 상보적 결합
 * ========================================================= */
function setBaseInputEnabled(enabled) {
  baseButtons.forEach((b) => (b.disabled = !enabled));
}

function renderDnaStep() {
  const base = state.sequence[state.index];
  questionStep.textContent = `STEP ${String(state.index + 1).padStart(2, '0')}`;
  givenBase.textContent = base;
  givenBase.className = `dna-base-chip base-${base}`;
  hudProgress.textContent = `${state.index} / ${DNA_LENGTH}`;
  setFeedback(dnaFeedback, '상보 염기를 선택하세요. (키보드 A · T · G · C)');
  bioScene.focusPair(state.index);
}

function answerBase(base) {
  if (!state.running || state.transitioning || state.gameStage !== 'stage1') return;
  const given = state.sequence[state.index];
  if (base === COMPLEMENT[given]) {
    registerCorrect();
    bioScene.solvePair(state.index);
    dnaCard.classList.add('correct-flash');
    setFeedback(dnaFeedback, `정답! ${given}-${base} (${state.combo} COMBO)`, 'good');
    state.index += 1;
    hudProgress.textContent = `${state.index} / ${DNA_LENGTH}`;
    state.transitioning = true;
    setTimeout(() => {
      dnaCard.classList.remove('correct-flash');
      state.transitioning = false;
      if (state.index >= DNA_LENGTH) finishDna();
      else renderDnaStep();
    }, 220);
  } else {
    registerWrong();
    bioScene.flashWrong(state.index);
    shake(baseBtnRow);
    setFeedback(dnaFeedback, `오답! ${given}과(와) ${base}는 짝이 아니에요.${penaltyNote()}`, 'bad');
  }
}

function finishDna() {
  const totalMs = currentTimeMs();
  state.running = false;
  state.inGame = false;
  stopTimer();
  bioScene.endDNAGame();
  bioScene.setOverview('stage1');
  const allCombo = state.mistakes === 0;
  showResult({
    badge: allCombo ? 'ALL COMBO CLEAR!' : 'STAGE CLEAR',
    title: allCombo ? 'DNA 완성! 오답 없이 올콤보 달성!' : 'DNA 이중나선 완성!',
    subtitle: subtitleFor('stage1'),
    totalMs,
  });
}

window.addEventListener('keydown', (e) => {
  if (state.gameStage !== 'stage1' || !state.inGame) return;
  if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
  const base = KEY_TO_BASE[e.code];
  if (!base) return;
  e.preventDefault();
  answerBase(base);
});

baseButtons.forEach((btn) => {
  btn.addEventListener('click', () => answerBase(btn.dataset.base));
});

/* =========================================================
 * STAGE 2: 다윈의 비글호 항해 (용어 타이핑)
 * ========================================================= */
function termItems() {
  if (state.gameStage === 'stage3') return TAXONOMY_STAGE.items;
  if (state.gameStage === 'stage4') return METABOLISM_STAGE.items;
  if (state.gameStage === 'stage5') return BIOTECH_STAGE.items;
  return DARWIN_STAGE.items;
}

function currentItem() {
  return termItems()[state.index];
}

function renderVoyageStep() {
  const item = currentItem();
  typingStep.textContent = `STEP ${String(state.index + 1).padStart(2, '0')} / ${total()}`;
  typingPlace.textContent = item.place;
  if (state.selectedMode === 'combo') {
    typingChosung.textContent = `초성 힌트: ${getChosung(item.term)}`;
    typingChosung.classList.remove('hidden');
    typingHint.textContent = item.hint;
  } else {
    typingChosung.classList.add('hidden');
    typingHint.textContent = `핵심 키워드: ${item.shortHint}`;
  }
  hudProgress.textContent = `${state.index} / ${total()}`;
  typingInput.value = '';
  setFeedback(typingFeedback, '개념에 맞는 용어를 입력하고 Enter를 누르세요.');
  typingInput.focus();
}

function isCorrectTerm(raw, item) {
  const n = normalizeAnswer(raw);
  if (!n) return false;
  if (n === normalizeAnswer(item.term)) return true;
  return (item.aliases || []).some((a) => normalizeAnswer(a) === n);
}

function submitTerm(autoMatch = false) {
  if (!state.running || state.transitioning || state.gameStage === 'stage1') return;
  const raw = typingInput.value;
  const item = currentItem();
  if (isCorrectTerm(raw, item)) {
    correctTerm(item);
    return;
  }
  if (autoMatch) return; // 자동 판정에서는 오답 처리하지 않음
  if (!raw.trim()) {
    shake(typingWrapper);
    setFeedback(typingFeedback, '용어를 입력해 주세요!', 'bad');
    return;
  }
  registerWrong();
  if (state.gameStage === 'stage2') bioScene.wrongShake();
  else if (state.gameStage === 'stage3') bioScene.wrongNode();
  else if (state.gameStage === 'stage4') bioScene.wrongMetabolism();
  else bioScene.wrongBiotech();
  shake(typingWrapper);
  setFeedback(typingFeedback, `오답입니다! 철자와 개념을 다시 확인해 보세요.${penaltyNote()}`, 'bad');
}

function correctTerm(item) {
  const gs = state.gameStage;
  registerCorrect();
  if (gs === 'stage2') bioScene.markBuoy(state.index, item.term);
  else if (gs === 'stage3') bioScene.growNode(state.index);
  else if (gs === 'stage4') bioScene.solveMetabolismPin(state.index);
  else bioScene.solveBiotechPin(state.index);
  state.index += 1;
  if (gs === 'stage2') bioScene.advanceShip(state.index);
  hudProgress.textContent = `${state.index} / ${total()}`;
  typingCard.classList.add('correct-flash');
  setFeedback(typingFeedback, `정답! 「${item.term}」 ${item.story}`, 'good');
  state.transitioning = true;

  if (state.index >= total()) {
    // 마지막 정답: 타이머 정지 후 완성 연출
    const totalMs = currentTimeMs();
    state.running = false;
    stopTimer();
    hudTimer.textContent = formatTimeMs(totalMs);
    typingInput.disabled = true;
    btnSubmit.disabled = true;
    if (gs === 'stage2') {
      setTimeout(() => bioScene.arriveAtGalapagos(), 1800);
      state.finishTimeout = setTimeout(() => finishTerms(totalMs), 5200);
    } else if (gs === 'stage3') {
      setTimeout(() => bioScene.finishTree(), 1000);
      state.finishTimeout = setTimeout(() => finishTerms(totalMs), 5000);
    } else if (gs === 'stage4') {
      setTimeout(() => bioScene.finishMetabolism(), 900);
      state.finishTimeout = setTimeout(() => finishTerms(totalMs), 4500);
    } else {
      setTimeout(() => bioScene.finishBiotech(), 900);
      state.finishTimeout = setTimeout(() => finishTerms(totalMs), 4500);
    }
    return;
  }

  setTimeout(() => {
    typingCard.classList.remove('correct-flash');
    state.transitioning = false;
    renderVoyageStep();
    if (gs === 'stage3') bioScene.followNode(state.index);
    else if (gs === 'stage4') bioScene.focusMetabolismPin(state.index);
    else if (gs === 'stage5') bioScene.focusBiotechPin(state.index);
  }, gs === 'stage2' ? 650 : 750);
}

function finishTerms(totalMs) {
  const gs = state.gameStage;
  state.inGame = false;
  if (gs === 'stage2') bioScene.endVoyage();
  else if (gs === 'stage3') bioScene.endTree();
  else if (gs === 'stage4') bioScene.endMetabolism();
  else bioScene.endBiotech();
  const allCombo = state.mistakes === 0;
  const resultMap = {
    stage2: {
      badge: allCombo ? 'ALL COMBO CLEAR!' : 'VOYAGE CLEAR',
      title: allCombo ? '오답 없이 갈라파고스 도착! 올콤보 달성!' : '갈라파고스제도 도착! 핀치를 만났어요',
      subtitle: subtitleFor('stage2'),
      summary: DARWIN_STAGE.arrivalSummary,
    },
    stage3: {
      badge: allCombo ? 'ALL COMBO CLEAR!' : 'TREE COMPLETE',
      title: allCombo ? '오답 없이 계통수 완성! 올콤보 달성!' : '생명의 계통수를 완성했어요!',
      subtitle: subtitleFor('stage3'),
      summary: TAXONOMY_STAGE.arrivalSummary,
    },
    stage4: {
      badge: allCombo ? 'ALL COMBO CLEAR!' : 'METABOLISM CLEAR',
      title: allCombo ? '오답 없이 세포 에너지 순환 완성! 올콤보!' : '마이토콘드리아 & 엽록체 탐험 완료!',
      subtitle: subtitleFor('stage4'),
      summary: METABOLISM_STAGE.arrivalSummary,
    },
    stage5: {
      badge: allCombo ? 'ALL COMBO CLEAR!' : 'BIOTECH CLEAR',
      title: allCombo ? '오답 없이 바이오랩 전체 가동! 올콤보!' : '생명공학기술 홀로그램 랩 완성!',
      subtitle: subtitleFor('stage5'),
      summary: BIOTECH_STAGE.arrivalSummary,
    },
  };
  showResult({ ...resultMap[gs], totalMs });
}

typingInput.addEventListener('compositionstart', () => {
  state.isComposing = true;
});
typingInput.addEventListener('compositionend', () => {
  state.isComposing = false;
  submitTerm(true);
});
typingInput.addEventListener('input', (e) => {
  if (state.isComposing || e.isComposing) return;
  submitTerm(true);
});
typingInput.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter') return;
  if (state.isComposing || e.isComposing) return;
  e.preventDefault();
  submitTerm(false);
});
btnSubmit.addEventListener('click', () => {
  submitTerm(false);
  typingInput.focus();
});

refreshStartScreen();
