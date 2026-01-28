/* =============================================
   PlayYourMath - Vertical Fractions & Responsive
   ============================================= */

// ===== 리듬 악기 (Pro Layered Synthesis) =====
const RHYTHM_INSTRUMENTS = {
  kick: {
    name: '큰북', emoji: '🥁', cellClass: 'cell-kick',
    play: (ctx, time) => {
      // Layer 1: Deep Body (Sine)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(120, time);
      osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.5);
      gain.gain.setValueAtTime(1.0, time); // Max Volume
      gain.gain.exponentialRampToValueAtTime(0.01, time + 0.5);
      osc.start(time); osc.stop(time + 0.5);

      // Layer 2: Punch (Square click)
      const click = ctx.createOscillator();
      const clickGain = ctx.createGain();
      click.connect(clickGain); clickGain.connect(ctx.destination);
      click.type = 'square';
      click.frequency.setValueAtTime(50, time);
      clickGain.gain.setValueAtTime(0.5, time);
      clickGain.gain.exponentialRampToValueAtTime(0.01, time + 0.02); // Short click
      click.start(time); click.stop(time + 0.02);
    }
  },
  snare: {
    name: '작은북', emoji: '🪘', cellClass: 'cell-snare',
    play: (ctx, time) => {
      // Layer 1: Body (Triangle tone)
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.connect(oscGain); oscGain.connect(ctx.destination);
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(250, time);
      oscGain.gain.setValueAtTime(0.5, time);
      oscGain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
      osc.start(time); osc.stop(time + 0.1);

      // Layer 2: Wires (White Noise)
      const bufferSize = ctx.sampleRate * 0.2;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1);

      const noise = ctx.createBufferSource(); noise.buffer = buffer;
      const noiseGain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass'; filter.frequency.value = 2000; // Crisp high end

      noise.connect(filter); filter.connect(noiseGain); noiseGain.connect(ctx.destination);
      noiseGain.gain.setValueAtTime(0.8, time); // Loud noise
      noiseGain.gain.exponentialRampToValueAtTime(0.01, time + 0.15);
      noise.start(time);
    }
  },
  hihat: {
    name: '하이햇', emoji: '🔔', cellClass: 'cell-hihat',
    play: (ctx, time) => {
      // Layer 1: Metallic Noise
      // Fundamental freq range for hi-hats is very high (8kHz+)
      const bufferSize = ctx.sampleRate * 0.1;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1);

      const noise = ctx.createBufferSource(); noise.buffer = buffer;
      const gain = ctx.createGain();

      // Bandpass to focus energy on "shimmer" frequencies
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass'; filter.frequency.value = 10000; filter.Q.value = 1;

      noise.connect(filter); filter.connect(gain); gain.connect(ctx.destination);

      gain.gain.setValueAtTime(0.9, time); // Boost volume significantly
      gain.gain.exponentialRampToValueAtTime(0.01, time + 0.05); // Short, sharp decay
      noise.start(time);
    }
  },
  clap: {
    name: '손뼉', emoji: '👏', cellClass: 'cell-clap',
    play: (ctx, time) => {
      // Claps are multiple noise bursts
      const noiseDur = 0.2;
      const bufferSize = ctx.sampleRate * noiseDur;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1);

      // Burst 1 (Main)
      const noise1 = ctx.createBufferSource(); noise1.buffer = buffer;
      const gain1 = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass'; filter.frequency.value = 1200; filter.Q.value = 1;
      noise1.connect(filter); filter.connect(gain1); gain1.connect(ctx.destination);
      gain1.gain.setValueAtTime(0.7, time);
      gain1.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
      noise1.start(time);

      // Burst 2 (Echo/Spread)
      const noise2 = ctx.createBufferSource(); noise2.buffer = buffer;
      const gain2 = ctx.createGain();
      noise2.connect(filter); filter.connect(gain2); gain2.connect(ctx.destination);
      gain2.gain.setValueAtTime(0.5, time + 0.01);
      gain2.gain.exponentialRampToValueAtTime(0.01, time + 0.11);
      noise2.start(time + 0.01);
    }
  },
  woodblock: {
    name: '나무북', emoji: '🪵', cellClass: 'cell-woodblock',
    play: (ctx, time) => {
      // Hollow Sound = 2 sine waves with different pitches
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.frequency.setValueAtTime(800, time);
      osc2.frequency.setValueAtTime(1200, time); // 1.5x harmonic

      osc1.connect(gain); osc2.connect(gain);
      gain.connect(ctx.destination);

      gain.gain.setValueAtTime(0.8, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + 0.08); // Short decay

      osc1.start(time); osc1.stop(time + 0.08);
      osc2.start(time); osc2.stop(time + 0.08);
    }
  },
  tambourine: {
    name: '탬버린', emoji: '🎶', cellClass: 'cell-tambourine',
    play: (ctx, time) => {
      // High Freq Noise + Sine Shake
      const bufferSize = ctx.sampleRate * 0.15;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1);

      const noise = ctx.createBufferSource(); noise.buffer = buffer;
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass'; filter.frequency.value = 6000; // Very high pitch

      noise.connect(filter); filter.connect(gain); gain.connect(ctx.destination);

      gain.gain.setValueAtTime(0.8, time); // Boost volume
      gain.gain.exponentialRampToValueAtTime(0.01, time + 0.15); // Longer decay than hihat

      noise.start(time);
    }
  }
};

const instrumentKeys = Object.keys(RHYTHM_INSTRUMENTS);

// ===== Audio =====
let audioContext = null;
function initAudio(forceNew = false) {
  if (forceNew && audioContext) {
    audioContext.close();
    audioContext = null;
  }
  if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
  if (audioContext.state === 'suspended') audioContext.resume();
  return audioContext;
}

function playClick() {
  const ctx = initAudio();
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.connect(g); g.connect(ctx.destination);
  osc.type = 'sine'; osc.frequency.value = 800;
  g.gain.setValueAtTime(0.08, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.03);
  osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.03);
}

// ===== State =====
const state = {
  measureCount: 2,
  fractionMode: 'improper', // 'improper' or 'mixed'
  isPlaying: false,
  playIntervalId: null,
  trackPlayStates: {}, // { trackId: { isPlaying: bool, intervalId: number } }
  tracks: [
    { id: 1, instrument: 'kick', denominator: 4, cells: [] },
    { id: 2, instrument: 'snare', denominator: 4, cells: [] }
  ],
  nextTrackId: 3
};

function initializeCells() {
  state.tracks.forEach(t => {
    const total = t.denominator * state.measureCount;
    const newCells = [];
    for (let i = 0; i < total; i++) newCells.push(t.cells[i] || false);
    t.cells = newCells;
  });
}

// ===== DOM =====
const el = {
  modeButtons: document.querySelectorAll('.mode-btn'),
  tracksContainer: document.getElementById('tracks-container'),
  tracksScrollWrapper: document.getElementById('tracks-scroll-wrapper'),
  tracksScrollContent: document.getElementById('tracks-scroll-content'),
  addTrackBtn: document.getElementById('add-track-btn'),
  addMeasureBtn: document.getElementById('add-measure-btn'),
  removeMeasureBtn: document.getElementById('remove-measure-btn'),
  measureCount: document.getElementById('measure-count'),
  playAllBtn: document.getElementById('play-all-btn'),
  clearAllBtn: document.getElementById('clear-all-btn'),
  summaryTracks: document.getElementById('summary-tracks'),
  messagePopup: document.getElementById('message-popup')
};

// ===== Utility =====
function showMessage(text) {
  const p = el.messagePopup;
  p.querySelector('.message-content').textContent = text;
  p.classList.add('message-popup--visible');
  setTimeout(() => p.classList.remove('message-popup--visible'), 1600);
}

function gcd(a, b) { return b === 0 ? a : gcd(b, a % b); }

function simplify(n, d) {
  if (n === 0) return { n: 0, d: 1 };
  const g = gcd(n, d);
  return { n: n / g, d: d / g };
}

// Create vertical fraction HTML
function vfHTML(num, den, large = false) {
  const cls = large ? 'vertical-fraction vf-large' : 'vertical-fraction';
  return `<span class="${cls}"><span class="vf-num">${num}</span><span class="vf-line"></span><span class="vf-den">${den}</span></span>`;
}

// Create mixed number HTML
function mixedHTML(whole, num, den) {
  if (num === 0) {
    return `<span class="mixed-number"><span class="mixed-whole">${whole}</span></span>`;
  }
  return `<span class="mixed-number"><span class="mixed-whole">${whole}</span>${vfHTML(num, den, true)}</span>`;
}

// Format fraction based on mode
function formatFraction(num, den, large = false) {
  const s = simplify(num, den);

  if (s.n === 0) return large ? vfHTML(0, 1, true) : vfHTML(0, 1);

  if (state.fractionMode === 'mixed' && s.n >= s.d) {
    const whole = Math.floor(s.n / s.d);
    const remainder = s.n % s.d;
    return mixedHTML(whole, remainder, s.d);
  }

  return vfHTML(s.n, s.d, large);
}

// Format fraction based on mode (WITHOUT simplification)
function formatFractionNoSimplify(num, den, large = false) {
  if (num === 0) return '';

  if (state.fractionMode === 'mixed' && num >= den) {
    const whole = Math.floor(num / den);
    const remainder = num % den;
    return mixedHTML(whole, remainder, den);
  }

  return vfHTML(num, den, large);
}

// ===== Render =====
function renderMeasure(mIdx, track) {
  const div = document.createElement('div');
  div.className = 'measure';

  const start = mIdx * track.denominator;
  const inst = RHYTHM_INSTRUMENTS[track.instrument];

  for (let i = 0; i < track.denominator; i++) {
    const idx = start + i;
    const cell = document.createElement('div');
    cell.className = 'grid-cell';

    if (track.cells[idx]) {
      cell.classList.add('grid-cell--active', inst.cellClass);
    }

    cell.innerHTML = `<span class="cell-vf"><span class="cell-vf-num">1</span><span class="cell-vf-line"></span><span class="cell-vf-den">${track.denominator}</span></span>`;

    cell.addEventListener('click', () => toggleCell(track.id, idx));
    div.appendChild(cell);
  }

  return div;
}

function renderTrack(track) {
  const inst = RHYTHM_INSTRUMENTS[track.instrument];
  const div = document.createElement('div');
  div.className = 'track';

  let opts = '';
  for (const [k, v] of Object.entries(RHYTHM_INSTRUMENTS)) {
    opts += `<option value="${k}" ${k === track.instrument ? 'selected' : ''}>${v.emoji} ${v.name}</option>`;
  }

  div.innerHTML = `
    <div class="track-info">
      <div class="track-title">
        <span class="track-emoji">${inst.emoji}</span>
        <select class="instrument-select" data-track-id="${track.id}">${opts}</select>
      </div>
      <div class="track-denom">
        <span class="track-denom-label">등분</span>
        <button class="track-denom-btn track-denom-btn--minus">−</button>
        <span class="track-denom-value">${track.denominator}</span>
        <button class="track-denom-btn track-denom-btn--plus">+</button>
      </div>
      <div class="track-controls">
        <button class="track-btn track-btn--play" data-track-id="${track.id}">▶</button>
        <button class="track-btn track-btn--delete" data-track-id="${track.id}">삭제</button>
      </div>
    </div>
    <div class="grid-row ${state.measureCount >= 4 ? 'measures-scroll' : ''}"></div>
  `;

  const row = div.querySelector('.grid-row');
  for (let m = 0; m < state.measureCount; m++) {
    row.appendChild(renderMeasure(m, track));
  }

  div.querySelector('.instrument-select').addEventListener('change', e => changeInstrument(track.id, e.target.value));
  div.querySelector('.track-btn--play').addEventListener('click', () => playTrack(track.id));
  div.querySelector('.track-btn--delete').addEventListener('click', () => deleteTrack(track.id));

  // Denominator +/- button listeners
  div.querySelector('.track-denom-btn--minus').addEventListener('click', () => {
    const newDenom = Math.max(1, track.denominator - 1);
    changeTrackDenominator(track.id, newDenom);
  });
  div.querySelector('.track-denom-btn--plus').addEventListener('click', () => {
    const newDenom = Math.min(16, track.denominator + 1);
    changeTrackDenominator(track.id, newDenom);
  });

  return div;
}

function renderAllTracks() {
  el.tracksContainer.innerHTML = '';
  state.tracks.forEach(t => el.tracksContainer.appendChild(renderTrack(t)));

  // Set scroll content width for 4+ measures
  if (state.measureCount >= 4) {
    // Calculate measure width so 3 measures + peek fit in container
    const wrapperWidth = el.tracksScrollWrapper.clientWidth;
    const trackInfoWidth = 115; // track info section width
    const gap = 6;
    const availableWidth = wrapperWidth - trackInfoWidth - 24; // padding
    const peekWidth = 40; // how much of 4th measure to show
    const measureWidth = Math.floor((availableWidth - peekWidth - gap * 2) / 3);

    // Set CSS custom property for measure width
    el.tracksScrollContent.style.setProperty('--measure-width', measureWidth + 'px');

    // Total width for all measures
    const totalMeasuresWidth = state.measureCount * (measureWidth + gap) - gap;
    el.tracksScrollContent.style.minWidth = (totalMeasuresWidth + trackInfoWidth + 24) + 'px';
  } else {
    el.tracksScrollContent.style.minWidth = '100%';
    el.tracksScrollContent.style.removeProperty('--measure-width');
  }

  updateFractionSummary();
}

function updateFractionSummary() {
  el.summaryTracks.innerHTML = '';

  state.tracks.forEach(track => {
    const inst = RHYTHM_INSTRUMENTS[track.instrument];
    const count = track.cells.filter(c => c).length;

    const row = document.createElement('div');
    row.className = 'summary-row';

    if (count === 0) {
      row.innerHTML = `
        <span class="summary-instrument">${inst.emoji}</span>
        <span class="summary-equation"><span class="summary-empty">선택된 칸 없음</span></span>
        <span class="summary-total summary-total--empty"></span>
      `;
    } else {
      // Group consecutive active cells
      const groups = [];
      let currentGroupSize = 0;

      for (let i = 0; i < track.cells.length; i++) {
        if (track.cells[i]) {
          currentGroupSize++;
        } else {
          if (currentGroupSize > 0) {
            groups.push(currentGroupSize);
            currentGroupSize = 0;
          }
        }
      }
      // Don't forget the last group
      if (currentGroupSize > 0) {
        groups.push(currentGroupSize);
      }

      // Build equation from groups
      let eqHTML = '<span class="summary-equation">';
      groups.forEach((groupSize, idx) => {
        if (idx > 0) eqHTML += '<span class="eq-plus">+</span>';
        eqHTML += vfHTML(groupSize, track.denominator);
      });
      eqHTML += '<span class="eq-equals">=</span></span>';

      row.innerHTML = `
        <span class="summary-instrument">${inst.emoji}</span>
        ${eqHTML}
        <span class="summary-total">${formatFractionNoSimplify(count, track.denominator, true)}</span>
      `;
    }

    el.summaryTracks.appendChild(row);
  });
}

// ===== Operations =====
function toggleCell(trackId, idx) {
  const track = state.tracks.find(t => t.id === trackId);
  if (!track) return;

  track.cells[idx] = !track.cells[idx];

  if (track.cells[idx]) {
    const ctx = initAudio();
    RHYTHM_INSTRUMENTS[track.instrument].play(ctx, ctx.currentTime);
  } else {
    playClick();
  }

  renderAllTracks();
}

function changeInstrument(trackId, key) {
  const track = state.tracks.find(t => t.id === trackId);
  if (track && RHYTHM_INSTRUMENTS[key]) {
    track.instrument = key;
    const ctx = initAudio();
    RHYTHM_INSTRUMENTS[key].play(ctx, ctx.currentTime);
    renderAllTracks();
  }
}

function addTrack() {
  const defaultDenom = 4;
  const total = defaultDenom * state.measureCount;
  state.tracks.push({
    id: state.nextTrackId++,
    instrument: instrumentKeys[state.tracks.length % instrumentKeys.length],
    denominator: defaultDenom,
    cells: new Array(total).fill(false)
  });
  renderAllTracks();
  playClick();
}

function changeTrackDenominator(trackId, newDenom) {
  const track = state.tracks.find(t => t.id === trackId);
  if (!track) return;

  track.denominator = newDenom;
  const total = newDenom * state.measureCount;
  const newCells = [];
  for (let i = 0; i < total; i++) newCells.push(false);
  track.cells = newCells;

  renderAllTracks();
  playClick();
}

function deleteTrack(trackId) {
  if (state.tracks.length <= 1) { showMessage('최소 1개 트랙 필요!'); return; }
  state.tracks = state.tracks.filter(t => t.id !== trackId);
  renderAllTracks();
  playClick();
}

function addMeasure() {
  if (state.measureCount >= 8) { showMessage('최대 8마디!'); return; }
  state.measureCount++;
  el.measureCount.textContent = state.measureCount;
  initializeCells();
  renderAllTracks();
  playClick();
}

function removeMeasure() {
  if (state.measureCount <= 1) { showMessage('최소 1마디 필요!'); return; }
  state.measureCount--;
  el.measureCount.textContent = state.measureCount;
  initializeCells();
  renderAllTracks();
  playClick();
}

// setDenominator removed - now per-track

function setFractionMode(mode) {
  state.fractionMode = mode;
  renderAllTracks();
  playClick();
}

function clearAll() {
  state.tracks.forEach(t => t.cells = t.cells.map(() => false));
  renderAllTracks();
  playClick();
  showMessage('초기화 완료!');
}

// ===== Playback =====
function playTrack(trackId) {
  const track = state.tracks.find(t => t.id === trackId);
  if (!track) return;

  // If already playing this track, stop first then restart
  if (state.trackPlayStates[trackId]?.isPlaying) {
    stopTrackPlayback(trackId);
  }

  // Initialize play state for this track
  state.trackPlayStates[trackId] = { isPlaying: true, intervalId: null };

  // Update button appearance
  const trackIndex = state.tracks.indexOf(track);
  const trackEl = el.tracksContainer.children[trackIndex];
  const playBtn = trackEl?.querySelector('.track-btn--play');
  if (playBtn) {
    playBtn.textContent = '⏹';
    playBtn.classList.add('track-btn--stop');
  }

  const tempo = 100;
  const cellDur = (60 / tempo) * (4 / track.denominator);
  const inst = RHYTHM_INSTRUMENTS[track.instrument];
  const cells = trackEl ? trackEl.querySelectorAll('.grid-cell') : [];

  function playOnce() {
    if (!state.trackPlayStates[trackId]?.isPlaying) return; // Check before playing
    const ctx = initAudio();
    let time = ctx.currentTime + 0.05;

    track.cells.forEach((active, idx) => {
      const delay = (time - ctx.currentTime) * 1000;

      setTimeout(() => {
        if (!state.trackPlayStates[trackId]?.isPlaying) return;
        cells.forEach(c => c.classList.remove('grid-cell--playing'));
        if (cells[idx]) cells[idx].classList.add('grid-cell--playing');
      }, delay);

      if (active) inst.play(ctx, time);
      time += cellDur;
    });
  }

  // Calculate loop duration
  const loopDur = track.cells.length * cellDur * 1000;

  playOnce();
  state.trackPlayStates[trackId].intervalId = setInterval(() => {
    if (state.trackPlayStates[trackId]?.isPlaying) playOnce();
  }, loopDur);
}

function stopTrackPlayback(trackId) {
  const playState = state.trackPlayStates[trackId];
  if (playState) {
    playState.isPlaying = false;
    if (playState.intervalId) {
      clearInterval(playState.intervalId);
      playState.intervalId = null;
    }
  }

  // Force close audio context to immediately stop all sounds
  initAudio(true);

  // Find track element and restore button
  const track = state.tracks.find(t => t.id === trackId);
  if (track) {
    const trackIndex = state.tracks.indexOf(track);
    const trackEl = el.tracksContainer.children[trackIndex];
    const playBtn = trackEl?.querySelector('.track-btn--play');
    if (playBtn) {
      playBtn.textContent = '▶';
      playBtn.classList.remove('track-btn--stop');
    }
    // Clear playing indicators for this track
    const cells = trackEl?.querySelectorAll('.grid-cell');
    cells?.forEach(c => c.classList.remove('grid-cell--playing'));
  }
}

function playAllTracks() {
  // If already playing, just stop (toggle off)
  if (state.isPlaying) {
    stopPlayback();
    return;
  }

  // Stop any individual track playbacks
  Object.keys(state.trackPlayStates).forEach(trackId => {
    stopTrackPlayback(parseInt(trackId));
  });

  state.isPlaying = true;
  el.playAllBtn.textContent = '⏹ 정지';
  el.playAllBtn.classList.add('action-btn--stop');

  function playOnce() {
    if (!state.isPlaying) return; // Check before playing
    const ctx = initAudio();
    const tempo = 100;

    // Get all track elements
    const trackEls = Array.from(el.tracksContainer.children);

    state.tracks.forEach((track, trackIndex) => {
      const inst = RHYTHM_INSTRUMENTS[track.instrument];
      const cellDur = (60 / tempo) * (4 / track.denominator);
      const trackEl = trackEls[trackIndex];
      const cells = trackEl ? trackEl.querySelectorAll('.grid-cell') : [];

      let time = ctx.currentTime + 0.05;
      track.cells.forEach((active, idx) => {
        const delay = (time - ctx.currentTime) * 1000;

        // Schedule visual highlight
        setTimeout(() => {
          if (!state.isPlaying) return;
          cells.forEach(c => c.classList.remove('grid-cell--playing'));
          if (cells[idx]) cells[idx].classList.add('grid-cell--playing');
        }, delay);

        if (active) inst.play(ctx, time);
        time += cellDur;
      });
    });
  }

  // Calculate loop duration based on slowest track (lowest denominator)
  const tempo = 100;
  const minDenom = Math.min(...state.tracks.map(t => t.denominator));
  const measureDur = 4 * (60 / tempo); // duration of one measure in seconds
  const loopDur = state.measureCount * measureDur * 1000; // full loop in ms

  playOnce(); // Play immediately
  state.playIntervalId = setInterval(() => {
    if (state.isPlaying) playOnce();
  }, loopDur);
}

function stopPlayback() {
  state.isPlaying = false;
  if (state.playIntervalId) {
    clearInterval(state.playIntervalId);
    state.playIntervalId = null;
  }

  // Force close audio context to immediately stop all sounds
  initAudio(true);

  // Clear all playing indicators
  document.querySelectorAll('.grid-cell--playing').forEach(c => {
    c.classList.remove('grid-cell--playing');
  });

  el.playAllBtn.textContent = '▶ 재생';
  el.playAllBtn.classList.remove('action-btn--stop');
}

// ===== Init =====
function init() {
  initializeCells();

  el.modeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      el.modeButtons.forEach(b => b.classList.remove('mode-btn--active'));
      btn.classList.add('mode-btn--active');
      setFractionMode(btn.dataset.mode);
    });
  });

  el.addMeasureBtn.addEventListener('click', addMeasure);
  el.removeMeasureBtn.addEventListener('click', removeMeasure);
  el.addTrackBtn.addEventListener('click', addTrack);
  el.playAllBtn.addEventListener('click', playAllTracks);
  el.clearAllBtn.addEventListener('click', clearAll);

  el.measureCount.textContent = state.measureCount;
  renderAllTracks();
}

document.addEventListener('DOMContentLoaded', init);
