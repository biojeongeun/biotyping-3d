const CHOSUNG = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';

/** 한글 초성 힌트 (공백과 영문은 그대로 유지) */
export function getChosung(text) {
  return [...text]
    .map((ch) => {
      const code = ch.charCodeAt(0) - 0xac00;
      if (code < 0 || code > 11171) return ch;
      return CHOSUNG[Math.floor(code / 588)];
    })
    .join('');
}

/** 정답 비교용: 공백 제거 + 소문자 */
export function normalizeAnswer(text) {
  return String(text || '').replace(/\s+/g, '').toLowerCase();
}
