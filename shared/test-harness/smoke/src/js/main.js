import { makeRng } from './rng.js';

const canvas = document.getElementById('c');
const g = canvas.getContext('2d');
const state = { seed: 1, scene: 0, dots: [] };
let rng = makeRng(1);

function reset(seed) {
  state.seed = seed;
  rng = makeRng(seed);
  state.dots = Array.from({ length: 40 }, () => ({ x: rng(), y: rng(), r: 4 + rng() * 18 }));
}

function draw() {
  const w = (canvas.width = canvas.clientWidth * devicePixelRatio);
  const h = (canvas.height = canvas.clientHeight * devicePixelRatio);
  const sky = g.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, state.scene ? '#3b6e8f' : '#2a8c8c');
  sky.addColorStop(1, '#f4efe6');
  g.fillStyle = sky;
  g.fillRect(0, 0, w, h);
  g.fillStyle = state.scene ? '#1d4e6b' : '#c8743a';
  for (const d of state.dots) { g.beginPath(); g.arc(d.x * w, d.y * h, d.r * devicePixelRatio, 0, Math.PI * 2); g.fill(); }
  g.fillStyle = '#1f2a2e';
  g.font = `${24 * devicePixelRatio}px system-ui`;
  g.fillText(`${INFO.title} – ${INFO.scenes[state.scene]}`, 16 * devicePixelRatio, 40 * devicePixelRatio);
}

document.getElementById('next').addEventListener('click', () => { state.scene = (state.scene + 1) % INFO.scenes.length; draw(); });
addEventListener('resize', draw);
reset(1);
draw();

// Test hook contract (see shared/test-harness/README.md).
window.__game = {
  seed(n) { reset(n); draw(); return n; },
  getState() { return JSON.parse(JSON.stringify(state)); },
  setState(s) { Object.assign(state, s); draw(); },
  step(n = 1) { return n; },
  scene(name) { state.scene = Math.max(0, INFO.scenes.indexOf(name)); draw(); return state.scene; },
  isIdle() { return true; },
};
