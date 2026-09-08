// Tiny, dependency-free WebAudio blips. Safe to call before a user gesture;
// AudioContext creation is lazy and every call is guarded.
let ctx = null;
let enabled = true;

function getCtx() {
  try {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) ctx = new AC();
    }
    if (ctx && ctx.state === "suspended") ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function blip({ freq = 440, dur = 0.12, type = "sine", gain = 0.06, slide = 0 }) {
  if (!enabled) return;
  const ac = getCtx();
  if (!ac) return;
  try {
    const now = ac.currentTime;
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(1, freq + slide), now + dur);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(gain, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    osc.connect(g);
    g.connect(ac.destination);
    osc.start(now);
    osc.stop(now + dur + 0.02);
  } catch {
    /* ignore */
  }
}

export const sound = {
  setEnabled(v) {
    enabled = !!v;
  },
  isEnabled() {
    return enabled;
  },
  add() {
    blip({ freq: 520, dur: 0.12, type: "sine", gain: 0.05, slide: 260 });
  },
  select() {
    blip({ freq: 660, dur: 0.06, type: "triangle", gain: 0.03 });
  },
  drag() {
    blip({ freq: 300, dur: 0.05, type: "sine", gain: 0.02 });
  },
  remove() {
    blip({ freq: 220, dur: 0.16, type: "sine", gain: 0.04, slide: -120 });
  },
  link() {
    blip({ freq: 440, dur: 0.14, type: "sine", gain: 0.045, slide: 220 });
    setTimeout(() => blip({ freq: 660, dur: 0.12, type: "sine", gain: 0.03 }), 90);
  },
  focus() {
    blip({ freq: 380, dur: 0.18, type: "sine", gain: 0.03, slide: 220 });
  },
  toggle() {
    blip({ freq: 520, dur: 0.05, type: "square", gain: 0.02 });
  },
};
