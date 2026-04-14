/* === Notation: Rhythm Generation + Canvas Rendering === */
const Notation = (() => {
    const DEFS = [
        { id:'whole',       name:'온음표',     units:32, filled:false, stemmed:false, flags:0, dotted:false },
        { id:'dot-half',    name:'점2분음표',  units:24, filled:false, stemmed:true,  flags:0, dotted:true  },
        { id:'half',        name:'2분음표',    units:16, filled:false, stemmed:true,  flags:0, dotted:false },
        { id:'dot-quarter', name:'점4분음표',  units:12, filled:true,  stemmed:true,  flags:0, dotted:true  },
        { id:'quarter',     name:'4분음표',    units: 8, filled:true,  stemmed:true,  flags:0, dotted:false },
        { id:'dot-eighth',  name:'점8분음표',  units: 6, filled:true,  stemmed:true,  flags:1, dotted:true  },
        { id:'eighth',      name:'8분음표',    units: 4, filled:true,  stemmed:true,  flags:1, dotted:false },
        { id:'dot-16th',    name:'점16분음표', units: 3, filled:true,  stemmed:true,  flags:2, dotted:true  },
        { id:'16th',        name:'16분음표',   units: 2, filled:true,  stemmed:true,  flags:2, dotted:false },
    ];

    function getDefs() { return DEFS; }
    function getDef(id) { return DEFS.find(n => n.id === id); }

    /* ─────────────────────────────────────────────────────────────────────
     * Rhythm Generation  —  엇박 없는 박 경계(beat-boundary) 방식
     *
     * 규칙:
     *  1) 모든 음표는 박자 경계(0,8,16,24 유닛)에서만 시작한다.
     *  2) 4분음표보다 짧은 음표(8분, 16분...)는 반드시 한 박(8유닛)을
     *     완전히 채우는 그룹으로만 등장한다.
     *  3) 점4분음표(12유닛)는 "점4분+8분 = 16유닛(2박)" 쌍으로만 사용된다.
     * ─────────────────────────────────────────────────────────────────────*/

    /** 한 박(8유닛)을 subPool 음표로 완전히 채우는 재귀 함수 */
    function _fillBeat(subPool, rem) {
        if (rem === 0) return [];
        const cands = subPool.filter(n => n.units <= rem);
        if (!cands.length) return null;
        const shuffled = [...cands].sort(() => Math.random() - 0.5);
        for (const n of shuffled) {
            const rest = _fillBeat(subPool, rem - n.units);
            if (rest !== null) return [{ ...n }, ...rest];
        }
        return null;
    }

    function generateMeasure(pool, difficulty = 'hard') {
        const has = id => pool.some(n => n.id === id);

        if (difficulty === 'easy') {
            // 쉬움 난이도: 마디 전체가 동일한 음표 (단, 마디를 딱 맞게 채울 수 있는 음표들 중에서 선택)
            const valid = pool.filter(n => 32 % n.units === 0);
            if (valid.length > 0) {
                const note = valid[Math.floor(Math.random() * valid.length)];
                return Array(32 / note.units).fill(null).map(() => ({ ...note }));
            }
        }

        if (difficulty === 'medium') {
            // 보통 난이도: 4박 통째로 온음표이거나, 2박(16유닛) 단위로 같은 음표 패턴
            const valid16 = pool.filter(n => 16 % n.units === 0);
            if (has('whole') && Math.random() < 0.3) {
                return [{ ...getDef('whole') }];
            }
            if (valid16.length > 0) {
                const notes = [];
                for (let i = 0; i < 2; i++) {
                    const note = valid16[Math.floor(Math.random() * valid16.length)];
                    for (let c = 0; c < 16 / note.units; c++) {
                        notes.push({ ...note });
                    }
                }
                return notes;
            }
        }

        // --- 어려움(기존) 및 폴백 ---
        const hasWhole      = has('whole');
        const hasDotHalf    = has('dot-half');
        const hasHalf       = has('half');
        const hasQuarter    = has('quarter');
        // 점4분음표는 반드시 8분음표와 쌍으로만 사용
        const hasDotQPair   = has('dot-quarter') && has('eighth');
        // 박 안을 채울 수 있는 짧은 음표 (8분 미만: 8분=4, 16분=2, 점8분=6, 점16분=3)
        const subPool       = pool.filter(n => n.units < 8);
        const hasSubBeat    = subPool.length > 0;

        for (let attempt = 0; attempt < 400; attempt++) {
            const notes = [];
            let pos = 0;       // 현재 위치 (유닛)
            let ok = true;

            while (pos < 32) {
                const rem = 32 - pos;

                // 이번 박에서 선택 가능한 옵션을 수집
                const opts = [];

                // ① 온음표: 전체 마디를 채울 때만 (pos=0, rem=32)
                if (hasWhole && rem >= 32) opts.push({ kind: 'note', id: 'whole', uses: 32 });

                // ② 점2분음표: 3박(24유닛), rem ≥ 24 이면 사용 가능
                if (hasDotHalf && rem >= 24) opts.push({ kind: 'note', id: 'dot-half', uses: 24 });

                // ③ 2분음표: 2박(16유닛)
                if (hasHalf && rem >= 16) opts.push({ kind: 'note', id: 'half', uses: 16 });

                // ④ 점4분+8분 세트: 2박(16유닛) 고정
                if (hasDotQPair && rem >= 16) opts.push({ kind: 'dotqpair', uses: 16 });

                // ⑤ 4분음표: 1박(8유닛)
                if (hasQuarter && rem >= 8) opts.push({ kind: 'note', id: 'quarter', uses: 8 });

                // ⑥ 짧은 음표로 1박 채우기
                if (hasSubBeat && rem >= 8) opts.push({ kind: 'subbeat', uses: 8 });

                if (opts.length === 0) { ok = false; break; }

                // 무작위로 하나 선택
                const opt = opts[Math.floor(Math.random() * opts.length)];

                if (opt.kind === 'note') {
                    notes.push({ ...getDef(opt.id) });
                    pos += opt.uses;
                } else if (opt.kind === 'dotqpair') {
                    notes.push({ ...getDef('dot-quarter') });
                    notes.push({ ...getDef('eighth') });
                    pos += 16;
                } else if (opt.kind === 'subbeat') {
                    const filled = _fillBeat(subPool, 8);
                    if (!filled) { ok = false; break; }
                    notes.push(...filled);
                    pos += 8;
                }
            }

            if (ok && pos === 32) return notes;
        }

        // 폴백: 4분음표 4개
        return Array(4).fill(null).map(() => ({ ...getDef('quarter') }));
    }

    function generate(selectedIds, numMeasures, difficulty = 'hard') {
        const pool = selectedIds.map(getDef).filter(Boolean);
        if (!pool.length) return [];
        const measures = [];
        for (let m = 0; m < numMeasures; m++) {
            const notes = generateMeasure(pool, difficulty);
            let pos = 0;
            notes.forEach(n => { n.position = pos; pos += n.units; });
            measures.push(notes);
        }
        measures.forEach(beam);
        return measures;
    }

    /* --- Beaming --- */
    function beam(measure) {
        let i = 0;
        while (i < measure.length) {
            const n = measure[i];
            if (n.flags > 0) {
                const beat = Math.floor(n.position / 8);
                const grp = [n];
                let j = i + 1;
                while (j < measure.length && measure[j].flags > 0 &&
                       Math.floor(measure[j].position / 8) === beat) {
                    grp.push(measure[j]); j++;
                }
                if (grp.length > 1) {
                    grp.forEach((g, idx) => { g.beamed = true; g._grp = grp; g._gi = idx; });
                } else { n.beamed = false; }
                i = j;
            } else { measure[i].beamed = false; i++; }
        }
    }

    /* --- Canvas Rendering --- */
    function render(canvas, measures, opts = {}) {
        if (!measures || !measures.length) return;

        const c = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        const W = canvas.clientWidth || canvas.offsetWidth || 400;
        const H = canvas.clientHeight || canvas.offsetHeight || 160;

        canvas.width = W * dpr;
        canvas.height = H * dpr;
        c.scale(dpr, dpr);
        c.clearRect(0, 0, W, H);

        const nM = measures.length;

        /* ── 레이아웃 상수 ── */
        const lM = 18, rM = 14;          // 좌우 여백
        const tsW = 36, tsG = 12;        // 박자표 너비 + 갭
        const blG = 10;                  // 마디선 간격
        const nStart = lM + tsW + tsG;   // 음표 시작 X
        const nEnd = W - rM;
        const avail = nEnd - nStart - (nM - 1) * blG;
        const uW = Math.max(1, avail / (nM * 32));  // 32분음표 1개당 픽셀

        /* ── 음표 사이징: 높이·너비 모두 고려해 절대값 상한 22px ── */
        // uW * 2.5 = 가장 좁은 간격(16분음표 2유닛)에서 음표가 겹치지 않는 최대 크기
        const noteUnit = Math.min(22, Math.max(7, Math.min(H * 0.085, uW * 2.5)));
        const rx       = noteUnit;               // 음표 머리 가로 반경
        const ry       = noteUnit * 0.72;        // 음표 머리 세로 반경
        const sL       = noteUnit * 5.0;         // 줄기 길이 (충분히 길게)
        const bT       = Math.max(1.5, noteUnit * 0.22);  // 빔 두께
        const dR       = Math.max(1.5, noteUnit * 0.22);  // 점 반지름
        const flagLen  = noteUnit * 1.7;         // 꼬리(flag) 길이
        const barHH    = noteUnit * 3.2;         // 마디선 반높이
        const tsSize   = Math.min(noteUnit * 2.8, tsW * 1.2);  // 박자표 폰트

        const sY = H * 0.52;  // 오선 Y 위치

        /* ── 오선(단일선) ── */
        c.strokeStyle = 'rgba(255,255,255,0.45)';
        c.lineWidth = 1.5;
        c.beginPath(); c.moveTo(lM, sY); c.lineTo(W - rM, sY); c.stroke();

        /* ── 박자표 4/4 ── */
        c.fillStyle = '#fff';
        c.font = `bold ${Math.round(tsSize)}px serif`;
        c.textAlign = 'center'; c.textBaseline = 'middle';
        const tsSep = noteUnit * 1.3;
        c.fillText('4', lM + tsW / 2, sY - tsSep);
        c.fillText('4', lM + tsW / 2, sY + tsSep);

        /* ── 마디 렌더 ── */
        for (let m = 0; m < nM; m++) {
            const mx = nStart + m * (32 * uW + blG);
            const mn = measures[m];

            // 음표 그리기
            for (const n of mn) {
                const nx = mx + (n.position + n.units / 2) * uW;
                _drawNote(c, nx, sY, n, rx, ry, sL, dR, flagLen);
            }

            // 빔(연결보)
            const grps = new Set();
            for (const n of mn) {
                if (n.beamed && n._grp && !grps.has(n._grp)) {
                    grps.add(n._grp);
                    _drawBeam(c, mx, sY, n._grp, rx, ry, sL, bT, uW);
                }
            }

            // 마디선
            if (m < nM - 1) {
                const bx = mx + 32 * uW + blG / 2;
                c.strokeStyle = 'rgba(255,255,255,0.45)'; c.lineWidth = 1.5;
                c.beginPath(); c.moveTo(bx, sY - barHH); c.lineTo(bx, sY + barHH); c.stroke();
            }
        }

        /* ── 겹세로줄 (끝) ── */
        const ex = W - rM;
        c.strokeStyle = 'rgba(255,255,255,0.55)';
        c.lineWidth = 1.5;
        c.beginPath(); c.moveTo(ex - 10, sY - barHH); c.lineTo(ex - 10, sY + barHH); c.stroke();
        c.lineWidth = 4;
        c.beginPath(); c.moveTo(ex - 3, sY - barHH); c.lineTo(ex - 3, sY + barHH); c.stroke();

        /* ── 커서 ── */
        if (opts.cursorPos != null && opts.cursorPos >= 0) {
            const mi = Math.floor(opts.cursorPos / 32);
            const wi = opts.cursorPos % 32;
            if (mi < nM) {
                const cx2 = nStart + mi * (32 * uW + blG) + wi * uW;
                c.strokeStyle = opts.cursorColor || '#ff2d75';
                c.lineWidth = 3;
                c.shadowColor = opts.cursorColor || '#ff2d75';
                c.shadowBlur = 12;
                c.beginPath(); c.moveTo(cx2, sY - barHH); c.lineTo(cx2, sY + barHH); c.stroke();
                c.shadowBlur = 0;
            }
        }
    }

    /* ── 음표 하나 그리기 ── */
    function _drawNote(c, x, y, n, rx, ry, sL, dR, flagLen) {
        const stemLW = Math.max(1.5, rx * 0.12);
        const stemX  = x + rx * 0.85;   // 줄기 붙는 X (음표 머리 오른쪽)

        /* 음표 머리 */
        c.save(); c.translate(x, y); c.rotate(-0.15);
        c.beginPath(); c.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
        if (n.filled) {
            c.fillStyle = '#fff'; c.fill();
        } else {
            c.strokeStyle = '#fff';
            c.lineWidth = Math.max(1.5, rx * 0.13);
            c.stroke();
        }
        c.restore();

        /* 줄기 (beamed 상태면 _drawBeam에서 처리) */
        if (n.stemmed && !n.beamed) {
            c.strokeStyle = '#fff'; c.lineWidth = stemLW;
            c.beginPath(); c.moveTo(stemX, y); c.lineTo(stemX, y - sL); c.stroke();

            /* 꼬리(flag) - bezier 곡선으로 자연스럽게 */
            if (n.flags > 0) {
                for (let f = 0; f < n.flags; f++) {
                    const fy = y - sL + f * (flagLen * 0.82);
                    c.strokeStyle = '#fff'; c.lineWidth = stemLW;
                    c.beginPath();
                    c.moveTo(stemX, fy);
                    c.bezierCurveTo(
                        stemX + flagLen * 1.1, fy + flagLen * 0.32,
                        stemX + flagLen * 1.0, fy + flagLen * 0.72,
                        stemX + flagLen * 0.45, fy + flagLen * 1.05
                    );
                    c.stroke();
                }
            }
        }

        /* 점 (점음표) */
        if (n.dotted) {
            c.fillStyle = '#fff'; c.beginPath();
            c.arc(x + rx * 1.6, y - ry * 0.3, dR, 0, Math.PI * 2); c.fill();
        }
    }

    /* ── 빔(연결보) 그리기 ── */
    function _drawBeam(c, mx, sY, grp, rx, ry, sL, bT, uW) {
        const stemX = n => mx + (n.position + n.units / 2) * uW + rx * 0.85;
        const xs = grp.map(stemX);
        const by = sY - sL;
        const stemLW = Math.max(1.5, rx * 0.12);

        // 줄기
        c.strokeStyle = '#fff'; c.lineWidth = stemLW;
        xs.forEach(x => { c.beginPath(); c.moveTo(x, sY); c.lineTo(x, by); c.stroke(); });

        // 1차 빔
        c.fillStyle = '#fff';
        c.fillRect(xs[0], by - bT / 2, xs[xs.length - 1] - xs[0], bT);

        // 2차 빔 (16분음표)
        let i = 0;
        while (i < grp.length) {
            if (grp[i].flags >= 2) {
                let j = i;
                while (j < grp.length && grp[j].flags >= 2) j++;
                const by2 = by + bT + Math.max(2, bT * 0.6);
                if (j - i > 1) {
                    c.fillRect(xs[i], by2 - bT / 2, xs[j - 1] - xs[i], bT);
                } else {
                    const len = rx * 1.0;
                    if (i > 0) c.fillRect(xs[i] - len, by2 - bT / 2, len, bT);
                    else c.fillRect(xs[i], by2 - bT / 2, len, bT);
                }
                i = j;
            } else i++;
        }
    }

    /* --- Timing --- */
    function getTiming(measures, bpm) {
        const uDur = (60 / bpm) / 8;
        const result = [];
        for (let m = 0; m < measures.length; m++) {
            for (const n of measures[m]) {
                result.push({
                    time: (m * 32 + n.position) * uDur,
                    dur: n.units * uDur,
                    note: n, measure: m, matched: false
                });
            }
        }
        return result;
    }

    return { getDefs, getDef, generate, render, getTiming };
})();
