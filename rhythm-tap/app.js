/* === App Controller === */
const App = (() => {
    let selectedNotes = ['whole', 'half', 'quarter', 'eighth'];
    let practiceMeasures = 4;
    let practiceBPM = 80;
    let practiceRhythm = null;
    let practicePlayActive = false;
    let practiceSessionId = 0;
    let practiceAnimFrame = null;

    /* --- Screen Navigation --- */
    function showScreen(id) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(id).classList.add('active');
    }

    /* --- Sync Calibration Screen --- */
    let syncState = {
        active: false,
        startTime: 0,
        beatDur: 600, // 100 BPM
        taps: [],
        beatCount: 0,
        countdown: 4,
        timer: null
    };

    function openSync() {
        AudioEngine.init();
        showScreen('sync-screen');
        const savedDelay = localStorage.getItem('rhythmDelay');
        if (savedDelay) {
            const delayMs = Math.round(parseFloat(savedDelay));
            document.getElementById('sync-result').textContent = `현재 보정값: ${delayMs > 0 ? '+' : ''}${delayMs}ms. (시작 버튼으로 재보정)`;
        } else {
            document.getElementById('sync-result').textContent = '준비 완료. 시작을 누르세요.';
        }
        document.getElementById('sync-start-btn').style.display = 'inline-block';
        syncState.taps = [];
        syncState.active = false;
    }

    function startSync() {
        if (syncState.active) return;
        AudioEngine.ensure();
        syncState.active = true;
        syncState.taps = [];
        syncState.beatCount = 0;
        syncState.countdown = 4;
        
        const resultEl = document.getElementById('sync-result');
        document.getElementById('sync-start-btn').style.display = 'none';
        const tapBtn = document.getElementById('sync-tap-btn');
        
        syncState.startTime = 0;
        
        function nextBeat() {
            if (!syncState.active) return;
            
            if (syncState.countdown > 0) {
                // Countdown phase
                AudioEngine.countBeat(4 - syncState.countdown);
                resultEl.textContent = `준비... ${syncState.countdown}`;
                syncState.countdown--;
                if (syncState.countdown === 0) {
                    syncState.startTime = performance.now() + syncState.beatDur;
                }
            } else {
                // Tapping phase
                if (syncState.beatCount >= 8) {
                    finishSync();
                    return;
                }
                resultEl.textContent = `터치!! (${syncState.beatCount + 1}/8)`;
                AudioEngine.countBeat(syncState.beatCount);
                
                tapBtn.style.transform = 'scale(0.95)';
                setTimeout(() => { tapBtn.style.transform = 'scale(1)'; }, 100);
                
                syncState.beatCount++;
            }
            syncState.timer = setTimeout(nextBeat, syncState.beatDur);
        }
        
        nextBeat();
    }

    function tapSync() {
        if (!syncState.active || syncState.countdown > 0) return;
        const now = performance.now();
        const elapsed = now - syncState.startTime;
        
        // Find closest beat (0 to 7)
        let closestBeat = Math.round(elapsed / syncState.beatDur);
        if (closestBeat >= 0 && closestBeat <= 8) {
            const expectedTime = closestBeat * syncState.beatDur;
            const diff = elapsed - expectedTime;
            syncState.taps.push(diff);
        }
        
        const btn = document.getElementById('sync-tap-btn');
        btn.style.boxShadow = '0 0 0 #0090cc';
        btn.style.transform = 'translateY(8px)';
        setTimeout(() => {
            btn.style.boxShadow = '0 8px 0 #0090cc';
            btn.style.transform = 'translateY(0)';
        }, 100);
    }

    function finishSync() {
        syncState.active = false;
        if (syncState.timer) clearTimeout(syncState.timer);
        document.getElementById('sync-start-btn').style.display = 'inline-block';
        document.getElementById('sync-start-btn').textContent = '▶ 다시 보정하기';
        
        if (syncState.taps.length === 0) {
            document.getElementById('sync-result').textContent = '터치 기록이 없습니다.';
            return;
        }
        
        let sum = syncState.taps.reduce((a, b) => a + b, 0);
        let avg = sum / syncState.taps.length;
        
        avg = Math.max(-200, Math.min(400, avg));
        Game.setTouchDelay(avg);
        localStorage.setItem('rhythmDelay', avg);
        
        const delayMs = Math.round(avg);
        document.getElementById('sync-result').textContent = `평균 보정값: ${delayMs > 0 ? '+' : ''}${delayMs}ms 저장 완료!`;
    }

    function stopSync() {
        syncState.active = false;
        if (syncState.timer) clearTimeout(syncState.timer);
    }

    /* --- Setup Screen --- */
    function initSetup() {
        const grid = document.getElementById('note-checkboxes');
        grid.innerHTML = Notation.getDefs().map(n => {
            const checked = selectedNotes.includes(n.id) ? 'checked' : '';
            return `<label class="note-check" data-id="${n.id}">
                <input type="checkbox" value="${n.id}" ${checked} onchange="App.toggleNote('${n.id}')">
                <span class="note-check-box">
                    <span class="note-check-name">${n.name}</span>
                    <span class="note-check-info">${n.units >= 8 ? n.units / 8 : n.units + '/8'}박</span>
                </span>
            </label>`;
        }).join('');
    }

    function toggleNote(id) {
        const idx = selectedNotes.indexOf(id);
        if (idx >= 0) selectedNotes.splice(idx, 1);
        else selectedNotes.push(id);
        if (selectedNotes.length === 0) {
            selectedNotes.push('quarter');
            const cb = document.querySelector(`input[value="quarter"]`);
            if (cb) cb.checked = true;
        }
    }

    function getSelectedNotes() { return [...selectedNotes]; }

    /* ─────────────────────────────────────────────
     * 연습 모드
     * ───────────────────────────────────────────── */
    function openPractice() {
        AudioEngine.init();
        showScreen('practice-screen');
        requestAnimationFrame(() => requestAnimationFrame(() => generatePractice()));
    }

    function setPracticeMeasures(n) {
        practiceMeasures = n;
        document.querySelectorAll('.pm-btn').forEach(b =>
            b.classList.toggle('active', parseInt(b.dataset.m) === n));
        generatePractice();
    }

    function generatePractice() {
        stopPractice();
        practiceRhythm = Notation.generate(selectedNotes, practiceMeasures, gameDifficulty);
        renderPracticeNotation();
    }

    function renderPracticeNotation(cursorPos) {
        const canvas = document.getElementById('practice-canvas');
        if (canvas.clientWidth === 0 || canvas.clientHeight === 0) {
            const parent = canvas.parentElement;
            canvas.style.width = parent.clientWidth + 'px';
            canvas.style.height = Math.max(160, parent.clientHeight - 20) + 'px';
        }
        Notation.render(canvas, practiceRhythm, {
            cursorPos: cursorPos != null ? cursorPos : -1,
            cursorColor: '#ff2d75'
        });
    }

    function playPractice() {
        if (practicePlayActive) { stopPractice(); return; }
        AudioEngine.ensure();

        const beatDur = 60 / practiceBPM;
        const uDur = beatDur / 8;
        const totalUnits = practiceMeasures * 32;
        const totalBeats = practiceMeasures * 4;

        practicePlayActive = true;
        practiceSessionId++;
        const sid = practiceSessionId;

        practiceAnimFrame && cancelAnimationFrame(practiceAnimFrame);
        practiceAnimFrame = null;

        document.getElementById('practice-play-btn').textContent = '⏹ 정지';

        // 박 0을 즉시 발생, 이후 setTimeout 체인으로 순서대로 발생
        // → setInterval과 달리 첫 박이 즉시 들림 (빨간선과 동기화)
        const startTime = performance.now();
        for (let b = 0; b < totalBeats; b++) {
            ((beat) => {
                setTimeout(() => {
                    if (practiceSessionId !== sid) return;
                    AudioEngine.click(beat % 4 === 0);
                }, Math.round(beat * beatDur * 1000));
            })(b);
        }

        // 빨간선 애니메이션
        function animate() {
            if (practiceSessionId !== sid) return;
            const elapsed = (performance.now() - startTime) / 1000;
            const pos = elapsed / uDur;
            if (pos >= totalUnits) { stopPractice(); return; }
            renderPracticeNotation(pos);
            practiceAnimFrame = requestAnimationFrame(animate);
        }
        practiceAnimFrame = requestAnimationFrame(animate);
    }

    function stopPractice() {
        practicePlayActive = false;
        practiceSessionId++;          // 이전 세션의 setTimeout 무효화
        if (practiceAnimFrame) { cancelAnimationFrame(practiceAnimFrame); practiceAnimFrame = null; }
        const btn = document.getElementById('practice-play-btn');
        if (btn) btn.textContent = '▶ 재생';
        if (practiceRhythm) renderPracticeNotation(-1);
    }

    /* ─────────────────────────────────────────────
     * 게임 설정
     * ───────────────────────────────────────────── */
    let gamePlayers = 1, gameSameScore = true, gameRepeats = 1, gameBPM = 80;
    let gameDifficulty = 'hard'; // 기본값 어려움

    // 난이도는 리듬 생성 규칙(app.js 대신 notation.js에서 처리)과 판정 범위에만 영향을 줍니다.
    // 기존의 음표 선택을 그대로 존중합니다.

    function openGameSetup() {
        AudioEngine.init();
        showScreen('game-setup-screen');
    }

    function setGamePlayers(n) {
        gamePlayers = n;
        document.querySelectorAll('.gp-btn').forEach(b =>
            b.classList.toggle('active', parseInt(b.dataset.p) === n));
    }
    function setGameSame(v) {
        gameSameScore = v;
        document.querySelectorAll('.gs-btn').forEach(b =>
            b.classList.toggle('active', b.dataset.s === String(v)));
    }
    function setGameRepeats(n) {
        gameRepeats = n;
        document.querySelectorAll('.gr-btn').forEach(b =>
            b.classList.toggle('active', parseInt(b.dataset.r) === n));
    }
    function setGameBPM(delta) {
        gameBPM = Math.max(40, Math.min(200, gameBPM + delta));
        document.getElementById('game-bpm').textContent = gameBPM;
    }
    function setGameDifficulty(d) {
        gameDifficulty = d;
        document.querySelectorAll('.gd-btn').forEach(b =>
            b.classList.toggle('active', b.dataset.d === d));
        // 난이도 설명 업데이트
        const desc = {
            easy: '한 마디 내내 같은 음표만 (선택한 음표 중)',
            medium: '2박(절반) 단위로 같은 음표 패턴',
            hard: '모든 리듬 섞임 (기존의 다양한 패턴)'
        };
        const el = document.getElementById('diff-desc');
        if (el) el.textContent = desc[d] || '';
        
        // 연습 화면이 활성화되어 있다면 즉시 새 악보 생성
        if (document.getElementById('practice-screen').classList.contains('active')) {
            generatePractice();
        }
    }

    /* ─────────────────────────────────────────────
     * 게임 플레이
     * ───────────────────────────────────────────── */
    let gameAnimFrame = null;

    function startGame() {
        Game.setup({
            players: gamePlayers, sameScore: gameSameScore,
            repeats: gameRepeats, bpm: gameBPM,
            selectedIds: selectedNotes,
            difficulty: gameDifficulty
        });
        showScreen('game-play-screen');
        buildGameUI();
        prepareRound();
    }

    function buildGameUI() {
        const container = document.getElementById('game-lanes');
        container.innerHTML = '';

        const isColumn = gamePlayers <= 2;
        container.style.flexDirection = isColumn ? 'column' : 'row';

        // 악보 캔버스 높이: 1-2명은 넉넉하게, 3명 이상은 제한
        const notationH = isColumn ? '180px' : '140px';

        for (let p = 0; p < gamePlayers; p++) {
            const color = Game.getPlayerColor(p);
            const lane = document.createElement('div');
            lane.className = 'player-lane';
            lane.style.borderColor = color;
            lane.innerHTML = `
                <div class="lane-header" style="background:${color}22;border-bottom:2px solid ${color}">
                    <span class="lane-name" style="color:${color}">P${p + 1}</span>
                    <span class="lane-score" id="score-${p}">0</span>
                </div>
                <div class="lane-nota-wrap">
                    <div class="lane-notation" style="height:${notationH};width:100%;">
                        <canvas class="game-canvas" id="gcanvas-${p}"></canvas>
                    </div>
                </div>
                <div class="lane-judgment" id="judgment-${p}"></div>`;
            container.appendChild(lane);
        }

        requestAnimationFrame(() => requestAnimationFrame(() => renderGameNotation()));
    }

    // 라운드 준비: 500ms 후 자동으로 카운트다운 시작 (버튼 없음)
    function prepareRound() {
        const st = Game.getState();
        const diffText = { easy: '🟢 쉬움', medium: '🟡 보통', hard: '🔴 어려움' }[gameDifficulty];
        document.getElementById('game-round-info').textContent =
            (gameRepeats > 1
                ? `라운드 ${st.round + 1} / ${st.totalRounds}`
                : '연주 준비') + ` [${diffText}]`;

        // action bar 비우기
        document.getElementById('game-action-bar').innerHTML = '';

        // 짧은 딜레이 후 자동 시작 (UI 렌더링 완료 대기)
        setTimeout(() => onListenBeat(), 600);
    }

    // "박자 듣기" 버튼 클릭
    function onListenBeat() {
        // 오디오 초기화 보장 (사용자 인터랙션 직후)
        AudioEngine.init();
        AudioEngine.ensure();

        const btn = document.getElementById('listen-btn');
        if (btn) btn.disabled = true;

        document.getElementById('game-countdown').style.display = 'flex';
        document.getElementById('countdown-num').textContent = '';
        
        // 카운트다운 시작 전부터 TAP 버튼을 활성화해 둡니다 (약간 빠른 첫 음표 터치를 위해)
        showTapButtons();

        Game.startRound(
            // onCountBeat: 1~4 반복 표시
            (beat) => {
                const el = document.getElementById('countdown-num');
                el.textContent = (beat % 4) + 1;
                el.classList.remove('count-pop');
                void el.offsetWidth;
                el.classList.add('count-pop');
            },
            // onStart: 카운트다운 끝, 연주 본격 시작
            () => {
                document.getElementById('game-countdown').style.display = 'none';
                gameAnimFrame = requestAnimationFrame(gameAnimLoop);
            },
            // onEnd: 라운드 종료
            () => {
                if (gameAnimFrame) { cancelAnimationFrame(gameAnimFrame); gameAnimFrame = null; }
                hideTapButtons();
                renderGameNotation(); // 커서 초기화

                const st = Game.getState();
                // 점수 업데이트
                for (let p = 0; p < gamePlayers; p++) {
                    const el = document.getElementById(`score-${p}`);
                    if (el) el.textContent = st.totalScores[p];
                }

                if (st.round < st.totalRounds) {
                    // 다음 라운드 준비 (잠깐 딜레이 후)
                    setTimeout(() => prepareRound(), 600);
                } else {
                    setTimeout(() => showFinalResults(), 600);
                }
            }
        );

        // 새로운 악보가 생성되었으므로 카운트다운 시작 전 악보 업데이트
        renderGameNotation();
    }

    // TAP 버튼을 action bar에 표시
    function showTapButtons() {
        const bar = document.getElementById('game-action-bar');
        bar.innerHTML = '';
        for (let p = 0; p < gamePlayers; p++) {
            const color = Game.getPlayerColor(p);
            const btn = document.createElement('button');
            btn.className = 'tap-btn';
            btn.id = `tap-${p}`;
            btn.style.background = color;
            btn.textContent = `P${p + 1}`;
            btn.addEventListener('mousedown', () => onTap(p));
            btn.addEventListener('touchstart', (e) => { e.preventDefault(); onTap(p); });
            bar.appendChild(btn);
        }
    }

    function hideTapButtons() {
        document.getElementById('game-action-bar').innerHTML = '';
    }

    function renderGameNotation() {
        for (let p = 0; p < gamePlayers; p++) {
            const canvas = document.getElementById(`gcanvas-${p}`);
            if (!canvas) continue;
            if (canvas.clientWidth === 0 || canvas.clientHeight === 0) {
                const parent = canvas.parentElement;
                canvas.style.width = parent.clientWidth + 'px';
                canvas.style.height = parent.clientHeight + 'px';
            }
            const rhythm = Game.getCurrentRhythm(p);
            const cursorPos = Game.isActive() ? Game.getCursorPos() : -1;
            Notation.render(canvas, rhythm, {
                cursorPos, cursorColor: Game.getPlayerColor(p)
            });
        }
    }

    function gameAnimLoop() {
        renderGameNotation();
        gameAnimFrame = requestAnimationFrame(gameAnimLoop);
    }

    function onTap(pi) {
        // AudioEngine.tapSound(pi); // 터치 딜레이 문제로 효과음 제거
        const result = Game.handleTap(pi);
        const btn = document.getElementById(`tap-${pi}`);
        if (btn) {
            btn.classList.remove('tap-flash');
            void btn.offsetWidth;
            btn.classList.add('tap-flash');
            spawnParticles(btn, Game.getPlayerColor(pi));
        }
        if (result && result.judgment !== 'IGNORE') {
            showJudgment(pi, result.judgment, result.score);
            const st = Game.getState();
            const scoreEl = document.getElementById(`score-${pi}`);
            if (scoreEl) scoreEl.textContent = st.totalScores[pi];
        }
    }

    function showJudgment(pi, text, score) {
        const el = document.getElementById(`judgment-${pi}`);
        if (!el) return;
        const colors = { PERFECT: '#ff2d75', GREAT: '#00b4ff', GOOD: '#26de81', BAD: '#ff3f3f' };
        const scoreStr = score > 0 ? `+${score}` : score;
        el.innerHTML = `<span class="j-text" style="color:${colors[text]}">${text}</span>
                        <span class="j-score" style="color:${colors[text]}">${scoreStr}</span>`;
        el.classList.remove('j-pop');
        void el.offsetWidth;
        el.classList.add('j-pop');
    }

    function spawnParticles(btn, color) {
        const rect = btn.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        for (let i = 0; i < 8; i++) {
            const p = document.createElement('div');
            p.className = 'particle';
            p.style.left = cx + 'px';
            p.style.top = cy + 'px';
            p.style.background = color;
            const angle = (Math.PI * 2 / 8) * i + Math.random() * 0.5;
            const dist = 40 + Math.random() * 60;
            p.style.setProperty('--px', Math.cos(angle) * dist + 'px');
            p.style.setProperty('--py', Math.sin(angle) * dist + 'px');
            document.body.appendChild(p);
            setTimeout(() => p.remove(), 600);
        }
    }

    function showFinalResults() {
        showScreen('result-screen');
        const rankings = Game.getRankings();
        const medals = ['🥇', '🥈', '🥉'];
        let html = '<table class="rank-table"><thead><tr><th>등수</th><th>플레이어</th><th>점수</th></tr></thead><tbody>';
        rankings.forEach(r => {
            const medal = medals[r.rank - 1] || r.rank;
            html += `<tr style="color:${r.color}"><td class="rank-cell">${medal}</td>
                <td>${r.name}</td><td class="total-cell">${r.total}</td></tr>`;
        });
        html += '</tbody></table>';
        document.getElementById('rankings-body').innerHTML = html;
        AudioEngine.success();
    }

    function goMenu() {
        Game.cleanup();
        stopPractice();
        if (gameAnimFrame) { cancelAnimationFrame(gameAnimFrame); gameAnimFrame = null; }
        showScreen('setup-screen');
    }

    function restartGame() {
        Game.cleanup();
        if (gameAnimFrame) { cancelAnimationFrame(gameAnimFrame); gameAnimFrame = null; }
        startGame();
    }

    function toggleFullscreen() {
        if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
        else document.exitFullscreen?.();
    }

    function init() {
        initSetup();
        setGameDifficulty('hard');

        const savedDelay = localStorage.getItem('rhythmDelay');
        if (savedDelay) {
            Game.setTouchDelay(parseFloat(savedDelay));
        }

        document.addEventListener('click', () => AudioEngine.init(), { once: true });
        document.addEventListener('touchstart', () => AudioEngine.init(), { once: true });

        const practiceCanvas = document.getElementById('practice-canvas');
        if (typeof ResizeObserver !== 'undefined') {
            new ResizeObserver(() => {
                if (practiceRhythm) renderPracticeNotation();
            }).observe(practiceCanvas);
        }
    }

    return {
        init, showScreen, toggleNote, getSelectedNotes,
        openPractice, setPracticeMeasures,
        generatePractice, playPractice,
        openGameSetup, setGamePlayers, setGameSame, setGameRepeats, setGameBPM, setGameDifficulty,
        startGame, onTap, onListenBeat, goMenu, restartGame, toggleFullscreen,
        openSync, startSync, tapSync, stopSync
    };
})();

document.addEventListener('DOMContentLoaded', App.init);
