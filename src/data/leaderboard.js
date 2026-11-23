const STORAGE_KEY = 'biotyping_3d_leaderboard_v3';

export function formatTimeMs(ms) {
  const safeMs = Math.max(0, Math.round(ms));
  const totalSeconds = Math.floor(safeMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const centis = Math.floor((safeMs % 1000) / 10);
  return `${minutes}:${String(seconds).padStart(2, '0')}.${String(centis).padStart(2, '0')}`;
}

export function loadAllRecords() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveRecord(entry) {
  const all = loadAllRecords();
  const record = {
    id: `rec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    stage: entry.stage,
    mode: entry.mode,
    nickname: entry.nickname || '바이오탐험가',
    maxCombo: entry.maxCombo ?? 0,
    allCombo: Boolean(entry.allCombo),
    mistakes: entry.mistakes ?? 0,
    timeMs: entry.timeMs ?? 0,
    createdAt: Date.now(),
  };
  all.push(record);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    // localStorage 용량 초과 등 예외 무시
  }
  return record;
}

export function resetAllRecords() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
  } catch {
    // 저장 실패 무시
  }
}

/**
 * STAGE별 · 모드별 상위 12개 순위를 반환합니다.
 * - combo(올콤보 모드): 올콤보 달성 우선 -> 최대 콤보 내림차순 -> 클리어 시간 오름차순
 * - time(타임어택 모드): 클리어 시간 오름차순 -> 오답 적은 순
 */
export function getRankedRecords(stage, mode) {
  const filtered = loadAllRecords().filter((r) => r.stage === stage && r.mode === mode);
  filtered.sort((a, b) => {
    if (mode === 'time') {
      if (a.timeMs !== b.timeMs) return a.timeMs - b.timeMs;
      return (a.mistakes ?? 0) - (b.mistakes ?? 0);
    }
    if (a.allCombo !== b.allCombo) return a.allCombo ? -1 : 1;
    if (b.maxCombo !== a.maxCombo) return b.maxCombo - a.maxCombo;
    return a.timeMs - b.timeMs;
  });
  return filtered.slice(0, 12);
}
