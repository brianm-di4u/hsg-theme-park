// WebAudio sound effects. Quiet by default; nothing plays until the first user gesture.
let ac = null, master = null, crowdGain = null, rainGain = null;
export const sound = { on: true, vol: 0.4 };

// The context is created once, after the first user gesture (browsers block audio before that);
// if creation fails, sound stays off instead of retrying on every effect.
let gestured = false, failed = false;
if (typeof window !== 'undefined') for (const ev of ['pointerdown', 'keydown']) window.addEventListener(ev, () => { gestured = true; }, { capture: true });
function ctx() {
  if (!sound.on || failed || !gestured) return null;
  if (!ac) {
    try {
      ac = new (window.AudioContext || window.webkitAudioContext)();
      master = ac.createGain(); master.gain.value = sound.vol * 0.5; master.connect(ac.destination);
    } catch (e) { failed = true; return null; }
  }
  if (ac.state === 'suspended') ac.resume().catch(() => {});
  return ac;
}
export function setVolume(v) { sound.vol = v; if (master) master.gain.value = v * 0.5; }
export function setOn(on) { sound.on = on; if (!on && ac) { if (crowdGain) crowdGain.gain.value = 0; if (rainGain) rainGain.gain.value = 0; } }

function tone(freq, dur, type = 'sine', gain = 0.2, when = 0, slide = 0) {
  const a = ctx(); if (!a) return;
  const t = a.currentTime + when;
  const o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
}
function noise(dur, gain = 0.15, filt = 1200, when = 0, q = 0.7) {
  const a = ctx(); if (!a) return;
  const t = a.currentTime + when;
  const buf = a.createBuffer(1, Math.max(1, Math.floor(a.sampleRate * dur)), a.sampleRate);
  const d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const s = a.createBufferSource(); s.buffer = buf;
  const f = a.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = filt; f.Q.value = q;
  const g = a.createGain(); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(master); s.start(t);
}
export const sfx = {
  build() { noise(0.12, 0.25, 300); tone(110, 0.12, 'triangle', 0.15); },
  path() { noise(0.06, 0.12, 900); },
  cash() { tone(1320, 0.07, 'square', 0.05); tone(1760, 0.09, 'square', 0.05, 0.06); },
  bell() { tone(880, 0.4, 'sine', 0.12); tone(1320, 0.3, 'sine', 0.06, 0.02); },
  click() { tone(660, 0.04, 'triangle', 0.06); },
  error() { tone(220, 0.15, 'sawtooth', 0.06, 0, -60); },
  coaster() { for (let k = 0; k < 6; k++) noise(0.05, 0.08, 500, k * 0.07); tone(700, 0.6, 'sawtooth', 0.02, 0.45, 500); },
  splash() { noise(0.5, 0.3, 700, 0, 0.4); },
  thunder() { noise(1.4, 0.35, 120, 0, 0.3); },
  chime() { [523, 659, 784].forEach((f, i) => tone(f, 0.35, 'sine', 0.1, i * 0.12)); },
  fanfare() { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.5, 'triangle', 0.12, i * 0.14)); },
  sad() { [392, 349, 294].forEach((f, i) => tone(f, 0.5, 'triangle', 0.1, i * 0.2)); },
};
// Ambient beds: crowd murmur by guest count, rain when it rains.
export function ambient(guests, raining, running) {
  const a = ac; if (!a || !sound.on) return;
  if (!crowdGain) {
    const mk = (filt) => {
      const buf = a.createBuffer(1, a.sampleRate * 2, a.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      const s = a.createBufferSource(); s.buffer = buf; s.loop = true;
      const f = a.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = filt; f.Q.value = 0.5;
      const g = a.createGain(); g.gain.value = 0; s.connect(f); f.connect(g); g.connect(master); s.start();
      return g;
    };
    crowdGain = mk(500); rainGain = mk(3000);
  }
  crowdGain.gain.value = running ? Math.min(0.06, guests / 8000) : 0;
  rainGain.gain.value = running && raining ? 0.05 : 0;
}
