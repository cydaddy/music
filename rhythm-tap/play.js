/* === Game Mode Logic === */
const Game = (() => {
    let config = { players: 1, sameScore: true, repeats: 1, bpm: 80, selectedIds: [], difficulty: 'medium' };
    let state = null;
    let roundActive = false;
    let countdownTimer = null;
    let gameTimer = null;
    let roundStartTime = 0;
    let touchDelayOffset = 0; // ms

    // 기본 판정 창 (어려움 기준)
    const DIFFICULTY_SETTINGS = {
        easy:   { perfectMs: 200, greatMs: 350, goodMs: 500, badPenalty: 0,  missable: false },
        medium: { perfectMs: 120, greatMs: 220, goodMs: 320, badPenalty: 5,  missable: true  },
        hard:   { perfectMs: 80,  greatMs: 140, goodMs: 200, badPenalty: 10, missable: true  }
    };
    let diffSettings = DIFFICULTY_SETTINGS.medium;
    const PLAYER_COLORS = ['#ff2d75','#00b4ff','#26de81','#f7b731','#ab47bc','#ff7043'];

    function setup(cfg) {
        config = { ...config, ...cfg };
        diffSettings = DIFFICULTY_SETTINGS[config.difficulty] || DIFFICULTY_SETTINGS.medium;

        state = {
            round: 0,
            totalRounds: config.repeats,
            rhythms: [],
            timingTemplates: [],
            timings: [],
            totalScores: Array(config.players).fill(0),
            judgments: Array.from({ length: config.players }, () =>
                ({ perfect: 0, great: 0, good: 0, miss: 0 }))
        };
    }

    function _resetTimings() {
        state.timings = state.timingTemplates.map(tmpl =>
            tmpl.map(t => ({ ...t, matched: false }))
        );
    }

    function setTouchDelay(ms) {
        touchDelayOffset = ms;
    }

    function getCurrentRhythm(pi) { return state.rhythms[pi]; }
    function getCurrentTimings(pi) { return state.timings[pi]; }
    function getPlayerColor(pi) { return PLAYER_COLORS[pi % 6]; }

    // 라운드 시작 시 리듬 새로 생성 및 타이밍 설정
    function startRound(onCountBeat, onStart, onEnd) {
        state.rhythms = [];
        state.timingTemplates = [];

        if (config.sameScore) {
            const rhythm = Notation.generate(config.selectedIds, 2, config.difficulty);
            const tmpl = Notation.getTiming(rhythm, config.bpm);
            for (let p = 0; p < config.players; p++) {
                state.rhythms.push(rhythm);
                state.timingTemplates.push(tmpl);
            }
        } else {
            for (let p = 0; p < config.players; p++) {
                const rhythm = Notation.generate(config.selectedIds, 2, config.difficulty);
                state.rhythms.push(rhythm);
                state.timingTemplates.push(Notation.getTiming(rhythm, config.bpm));
            }
        }
        
        _resetTimings();

        const beatDurMs = (60 / config.bpm) * 1000;
        const now = performance.now();
        
        // 8박자(2마디) 카운트다운 후의 정확한 시작 시간을 미리 계산
        roundStartTime = now + (8 * beatDurMs);
        // 미리 true로 설정하여 카운트다운 직전의 '약간 빠른 터치'도 인식되게 함
        roundActive = true; 

        // 카운트다운(8박) + 연주(8박) 스케줄링 => 총 16박자 (수정)
        for (let b = 0; b < 16; b++) {
            setTimeout(() => {
                if (!roundActive) return;
                AudioEngine.countBeat(b);
                if (onCountBeat) onCountBeat(b);
            }, Math.round(b * beatDurMs));
        }

        // 연주 시작(UI 표시용) 스케줄링
        setTimeout(() => {
            if (!roundActive) return;
            if (onStart) onStart();
        }, Math.round(8 * beatDurMs));

        // 종료 스케줄링 (8박 카운트다운 + 8박 연주 + 약간의 여유)
        gameTimer = setTimeout(() => {
            if (!roundActive) return;
            endRound(onEnd);
        }, Math.round(16 * beatDurMs) + 300);
    }

    function endRound(onEnd) {
        roundActive = false;
        if (gameTimer) { clearTimeout(gameTimer); gameTimer = null; }

        // 쉬움 난이도에서는 미스 카운트 없음
        if (diffSettings.missable) {
            for (let p = 0; p < config.players; p++) {
                state.timings[p].forEach(t => {
                    if (!t.matched) state.judgments[p].miss++;
                });
            }
        }

        state.round++;
        if (onEnd) onEnd();
    }

    function handleTap(playerIndex) {
        if (!roundActive) return null;
        // 기기 딜레이를 뺀 순수 연주(터치 의도) 시간 계산: (현재시각 - 시작시각 - 딜레이보정치)
        const elapsed = ((performance.now() - roundStartTime) - touchDelayOffset) / 1000;
        const timings = getCurrentTimings(playerIndex);

        let best = null, bestDist = Infinity;
        for (const t of timings) {
            if (t.matched) continue;
            const d = Math.abs(elapsed - t.time);
            if (d < bestDist) { bestDist = d; best = t; }
        }

        const distMs = bestDist * 1000;
        if (!best || distMs > diffSettings.goodMs) {
            // 허용 오차를 벗어난 허공 탭 -> 난이도별 감점
            const pen = diffSettings.badPenalty;
            state.totalScores[playerIndex] = Math.max(0, state.totalScores[playerIndex] - pen);
            return { judgment: 'BAD', score: -pen, distMs: 0 };
        }

        best.matched = true;
        let judgment, score;
        if (distMs <= diffSettings.perfectMs) { judgment = 'PERFECT'; score = 100; state.judgments[playerIndex].perfect++; }
        else if (distMs <= diffSettings.greatMs) { judgment = 'GREAT'; score = 70; state.judgments[playerIndex].great++; }
        else { judgment = 'GOOD'; score = 40; state.judgments[playerIndex].good++; }

        state.totalScores[playerIndex] += score;
        return { judgment, score, distMs };
    }

    function getState() { return state; }
    function getConfig() { return config; }
    function isActive() { return roundActive; }

    function getCursorPos() {
        if (!roundActive) return -1;
        const elapsed = (performance.now() - roundStartTime) / 1000;
        const uDur = (60 / config.bpm) / 8;
        return elapsed / uDur;
    }

    function getRankings() {
        const totals = [];
        for (let p = 0; p < config.players; p++) {
            totals.push({
                player: p, name: `P${p + 1}`,
                total: state.totalScores[p],
                color: PLAYER_COLORS[p % 6]
            });
        }
        totals.sort((a, b) => b.total - a.total);
        totals.forEach((t, i) => t.rank = i + 1);
        return totals;
    }

    function cleanup() {
        if (countdownTimer) clearTimeout(countdownTimer);
        if (gameTimer) clearTimeout(gameTimer);
        countdownTimer = null;
        gameTimer = null;
        roundActive = false;
    }

    return { setup, startRound, handleTap, getState, getConfig, isActive,
             getCurrentRhythm, getCurrentTimings, getPlayerColor,
             getRankings, cleanup, getCursorPos, setTouchDelay };
})();
