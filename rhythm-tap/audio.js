/* === Audio Engine === */
const AudioEngine = (() => {
    let ctx = null, master = null;

    function init() {
        if (ctx) return;
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        master = ctx.createGain();
        master.gain.value = 0.4;
        master.connect(ctx.destination);
    }

    function ensure() {
        if (!ctx) init();
        if (ctx.state === 'suspended') ctx.resume();
    }

    function tone(freq, dur, type = 'sine', vol = 0.3) {
        ensure();
        const t = ctx.currentTime;
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = type; o.frequency.setValueAtTime(freq, t);
        g.gain.setValueAtTime(vol, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + dur);
        o.connect(g); g.connect(master);
        o.start(t); o.stop(t + dur);
    }

    function click(accent) {
        ensure();
        const t = ctx.currentTime;
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(accent ? 1000 : 700, t);
        o.frequency.exponentialRampToValueAtTime(accent ? 500 : 350, t + 0.05);
        g.gain.setValueAtTime(accent ? 0.35 : 0.22, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
        o.connect(g); g.connect(master);
        o.start(t); o.stop(t + 0.07);
    }

    function countBeat(num) {
        ensure();
        const t = ctx.currentTime;
        const freq = (num % 4 === 0) ? 880 : 660;
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'triangle';
        o.frequency.setValueAtTime(freq, t);
        g.gain.setValueAtTime(0.35, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
        o.connect(g); g.connect(master);
        o.start(t); o.stop(t + 0.1);
    }

    const PLAYER_FREQ = [220, 330, 440, 550, 660, 770];

    function tapSound(pi) {
        ensure();
        const t = ctx.currentTime;
        const bf = PLAYER_FREQ[pi % 6];
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'triangle';
        o.frequency.setValueAtTime(bf * 2, t);
        o.frequency.exponentialRampToValueAtTime(bf, t + 0.1);
        g.gain.setValueAtTime(0.4, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        o.connect(g); g.connect(master);
        o.start(t); o.stop(t + 0.16);
        // click layer
        const c = ctx.createOscillator(), cg = ctx.createGain();
        c.type = 'square';
        c.frequency.setValueAtTime(bf * 6, t);
        cg.gain.setValueAtTime(0.06, t);
        cg.gain.exponentialRampToValueAtTime(0.001, t + 0.02);
        c.connect(cg); cg.connect(master);
        c.start(t); c.stop(t + 0.03);
    }

    function success() {
        ensure();
        [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.3, 'triangle', 0.2), i * 100));
    }

    function now() { ensure(); return ctx.currentTime; }

    return { init, ensure, tone, click, countBeat, tapSound, success, now };
})();
