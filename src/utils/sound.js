const MUTE_KEY = 'biotyping_3d_muted';

class SoundFX {
  constructor() {
    this.ctx = null;
    try {
      this.muted = localStorage.getItem(MUTE_KEY) === '1';
    } catch {
      this.muted = false;
    }
  }

  _ensureCtx() {
    if (this.muted) return null;
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  toggleMute() {
    this.muted = !this.muted;
    try {
      localStorage.setItem(MUTE_KEY, this.muted ? '1' : '0');
    } catch {
      // 무시
    }
    return this.muted;
  }

  _tone(freq, startOffset, duration, { type = 'sine', gain = 0.14, endFreq = null } = {}) {
    const ctx = this._ensureCtx();
    if (!ctx) return;
    const now = ctx.currentTime + startOffset;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration);

    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(gain, now + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  /** 정답 효과음 (콤보가 올라갈수록 음정이 상쾌하게 상승) */
  playCorrect(combo = 1) {
    const scale = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.51];
    const base = scale[Math.min(scale.length - 1, Math.max(0, combo - 1))];
    this._tone(base, 0, 0.14, { type: 'triangle', gain: 0.16 });
    this._tone(base * 1.25, 0.06, 0.18, { type: 'sine', gain: 0.12 });
  }

  /** 오답 효과음 */
  playWrong() {
    this._tone(220, 0, 0.18, { type: 'sawtooth', gain: 0.09, endFreq: 145 });
    this._tone(165, 0.09, 0.2, { type: 'triangle', gain: 0.1, endFreq: 120 });
  }

  /** 스테이지 클리어 팡파레 */
  playClear(allCombo = false) {
    const notes = allCombo
      ? [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98]
      : [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((f, idx) => {
      this._tone(f, idx * 0.085, 0.32, { type: 'triangle', gain: 0.15 });
    });
  }

  /** 가벼운 UI 클릭음 */
  playClick() {
    this._tone(680, 0, 0.055, { type: 'sine', gain: 0.06, endFreq: 820 });
  }
}

export const soundFX = new SoundFX();
