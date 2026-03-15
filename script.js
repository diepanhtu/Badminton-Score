const STORAGE_KEY = 'badmintonSPAState';

const defaultState = {
    mode: 'rotation',
    winningScore: 21,
    winByTwo: true,
    players: {
        A: { id: 'A', name: 'Người chơi A', wins: 0, pointsScored: 0, pointDiff: 0, matchesPlayed: 0, consecutiveWins: 0, hasRested: false },
        B: { id: 'B', name: 'Người chơi B', wins: 0, pointsScored: 0, pointDiff: 0, matchesPlayed: 0, consecutiveWins: 0, hasRested: false },
        C: { id: 'C', name: 'Người chơi C', wins: 0, pointsScored: 0, pointDiff: 0, matchesPlayed: 0, consecutiveWins: 0, hasRested: true } // Initially resting
    },
    singles: {
        p1: { id: 'p1', name: 'Người chơi 1', wins: 0 },
        p2: { id: 'p2', name: 'Người chơi 2', wins: 0 }
    },
    doubles: {
        t1: { id: 't1', name: 'Đội 1', wins: 0 },
        t2: { id: 't2', name: 'Đội 2', wins: 0 }
    },
    match: {
        p1Id: 'A',
        p2Id: 'B',
        restingId: 'C',
        p1Score: 0,
        p2Score: 0,
        server: 1,
        switchedSides: false,
        isFinished: false,
        winnerIndex: null
    },
    tours: [[]] // Array of tours, each containing up to 3 matches
};

// One-time forceful wipe to give user a clean 0-state
if (!localStorage.getItem('wiped_v3_1')) {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.setItem('wiped_v3_1', 'true');
}

let state = JSON.parse(localStorage.getItem(STORAGE_KEY));
if (!state) state = JSON.parse(JSON.stringify(defaultState));

// Ensure missing fields are populated if loading old format
if (state.winByTwo === undefined) state.winByTwo = true;
if (state.tour) {
    state.tours = [state.tour];
    delete state.tour;
}
if (!state.tours) state.tours = [[]];

if (state.players && state.players.A.consecutiveWins === undefined) {
    state.players.A.consecutiveWins = 0;
    state.players.B.consecutiveWins = 0;
    state.players.C.consecutiveWins = 0;
}

function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// Restore saved names if coming from a reset reload
try {
    let savedNames = JSON.parse(localStorage.getItem('saved_names'));
    if (savedNames) {
        if (savedNames.A && state.players) state.players.A.name = savedNames.A;
        if (savedNames.B && state.players) state.players.B.name = savedNames.B;
        if (savedNames.C && state.players) state.players.C.name = savedNames.C;
        if (savedNames.p1 && state.singles) state.singles.p1.name = savedNames.p1;
        if (savedNames.p2 && state.singles) state.singles.p2.name = savedNames.p2;
        if (savedNames.t1 && state.doubles) state.doubles.t1.name = savedNames.t1;
        if (savedNames.t2 && state.doubles) state.doubles.t2.name = savedNames.t2;
        localStorage.removeItem('saved_names');
        saveState();
    }
} catch (e) { }

function getPlayerRef(id) {
    if (state.mode === 'rotation') return state.players[id];
    if (state.mode === 'singles') return state.singles[id];
    return state.doubles[id];
}

function render() {
    let p1 = getPlayerRef(state.match.p1Id);
    let p2 = getPlayerRef(state.match.p2Id);

    // Text names & scores
    document.getElementById('name1').innerText = p1.name;
    document.getElementById('name2').innerText = p2.name;
    document.getElementById('score1').innerText = state.match.p1Score;
    document.getElementById('score2').innerText = state.match.p2Score;

    // Switched side style
    let board = document.getElementById('scoreboard');
    if (state.match.switchedSides) {
        board.classList.add('switched');
    } else {
        board.classList.remove('switched');
    }

    // Serve indicator logic
    // Badminton Rule: Even score -> Right service court. Odd score -> Left service court.
    // In our horizontal view:
    // P1 (Left Pane): Right court is Bottom half. Left court is Top half.
    // P2 (Right Pane): Right court is Top half. Left court is Bottom half.
    document.querySelectorAll('.serve-indicator').forEach(el => el.style.display = 'none');

    let isSwitched = state.match.switchedSides;
    let s = state.match.server;

    // Hide indicators if match is finished
    if (state.match.isFinished) {
        document.querySelectorAll('.serve-indicator').forEach(el => el.style.display = 'none');
    } else {
        if (s === 1) { // Player 1 Serving
            let isEven = (state.match.p1Score % 2 === 0);
            // If not switched: P1 is on the Left. Even -> Right Court -> Bottom.
            // If switched: P1 is on the Right. Even -> Right Court -> Top.
            if (!isSwitched) {
                if (isEven) document.getElementById('serve1-bottom').style.display = 'block';
                else document.getElementById('serve1-top').style.display = 'block';
            } else {
                if (isEven) document.getElementById('serve1-top').style.display = 'block';
                else document.getElementById('serve1-bottom').style.display = 'block';
            }
        } else { // Player 2 Serving
            let isEven = (state.match.p2Score % 2 === 0);
            // If not switched: P2 is on the Right. Even -> Right Court -> Top.
            // If switched: P2 is on the Left. Even -> Right Court -> Bottom.
            if (!isSwitched) {
                if (isEven) document.getElementById('serve2-top').style.display = 'block';
                else document.getElementById('serve2-bottom').style.display = 'block';
            } else {
                if (isEven) document.getElementById('serve2-bottom').style.display = 'block';
                else document.getElementById('serve2-top').style.display = 'block';
            }
        }
    }


    // Manage Match Over Overlay and Switch Button
    let overlay = document.getElementById('match-over-overlay');
    let btnSwitch = document.getElementById('btn-switch-court');
    if (state.match.isFinished) {
        let winnerName = (state.match.winnerIndex === 1) ? p1.name : p2.name;
        document.getElementById('winner-text').innerText = winnerName + ' Thắng!';
        overlay.style.display = 'flex';
        btnSwitch.style.display = 'none';
    } else {
        overlay.style.display = 'none';
        btnSwitch.style.display = 'flex';
    }
}

function addScore(paneIndex) {
    if (state.match.isFinished) return; // Prevent score changes if match is done

    // Vibrate API for tactile feedback (works mostly on Android)
    if (navigator.vibrate) navigator.vibrate(50);

    if (paneIndex === 1) {
        state.match.p1Score++;
        state.match.server = 1; // Server becomes whoever won the point
    } else {
        state.match.p2Score++;
        state.match.server = 2;
    }

    saveState();
    render();

    // Short delay to allow screen to repaint before alert pops up
    setTimeout(() => checkWinCondition(), 50);
}

function subScore(paneIndex, e) {
    if (e) e.stopPropagation(); // Avoid triggering addScore
    if (state.match.isFinished) return;

    if (paneIndex === 1 && state.match.p1Score > 0) state.match.p1Score--;
    if (paneIndex === 2 && state.match.p2Score > 0) state.match.p2Score--;

    saveState();
    render();
}

// Allow manual server reassignment by tapping names
function setServer(paneIndex, e) {
    if (e) e.stopPropagation();
    if (state.match.isFinished) return;
    state.match.server = paneIndex;
    saveState();
    render();
}

function switchSide(e) {
    if (e) e.stopPropagation();
    if (state.match.isFinished) return;
    state.match.switchedSides = !state.match.switchedSides;
    saveState();
    render();
}

function checkWinCondition() {
    let p1s = state.match.p1Score;
    let p2s = state.match.p2Score;
    let target = state.winningScore;
    let deuce = state.winByTwo;

    let w1 = false, w2 = false;

    if (p1s >= target) {
        if (!deuce || (p1s - p2s) >= 2 || p1s >= 30) w1 = true;
    }
    if (p2s >= target) {
        if (!deuce || (p2s - p1s) >= 2 || p2s >= 30) w2 = true;
    }

    // Prevent scoring if tour is full
    if (state.mode === 'rotation') {
        let currentTour = state.tours[state.tours.length - 1];
        if (currentTour.length >= 3) {
            alert("Tua này đã kết thúc đủ 3 trận! Hãy mở bảng Dữ Liệu và bấm '+' để tạo Tua mới trước khi tiếp tục.");
            return;
        }
    }

    if (w1) processMatchEnd(1);
    else if (w2) processMatchEnd(2);
}

function processMatchEnd(winnerIndex) {
    state.match.isFinished = true;
    state.match.winnerIndex = winnerIndex;
    saveState();
    render();
}

function randomizeFirstMatch() {
    let currentTour = state.tours[state.tours.length - 1];
    if (currentTour.length > 0) return; // Only allow on empty tour

    let ids = ['A', 'B', 'C'];
    ids.sort(() => Math.random() - 0.5); // simple shuffle
    state.match.p1Id = ids[0];
    state.match.p2Id = ids[1];
    state.match.restingId = ids[2];

    // Reset points
    state.match.p1Score = 0;
    state.match.p2Score = 0;
    state.match.server = 1;
    saveState();

    // Update dashboard instantly if it's open
    if (document.getElementById('data-modal').style.display === 'flex') {
        renderDashboard();
    }
    render();
}

function startNewTour() {
    // Determine the starting rotation for the new tour.
    // The cycle must be: Match1(X vs Y, Z rests) → Match2(Y vs Z, X rests) → Match3(Z vs X, Y rests)
    // To achieve this for each new tour, we rotate the starting trio so that:
    //   - The player who RESTED last in the previous tour plays first in the new tour
    //   - The players who played last shift: previous resting player joins, previous winner rests
    // Simplest correct approach: rotate the (p1, p2, rest) triple by one position each new tour.
    // After the last match of the previous tour, state.match already holds the NEXT queued match.
    // We want to start fresh with a clean rotation based on who rested last.

    let lastTour = state.tours[state.tours.length - 1];
    if (lastTour.length >= 3) {
        // The last match recorded in the previous tour
        let lastMatch = lastTour[lastTour.length - 1]; // { p1, p2, r, winner }

        // For the new tour, start the cycle from the player who rested last.
        // New tour: Match1 -> prevResting vs prevLoser (prevWinner rests)
        let prevWinner = lastMatch.winner;
        let prevResting = lastMatch.r;
        let prevLoser = (lastMatch.p1 === prevWinner) ? lastMatch.p2 : lastMatch.p1;

        state.match.p1Id = prevResting;
        state.match.p2Id = prevLoser;
        state.match.restingId = prevWinner;
    }

    // Reset match state for new tour
    state.match.p1Score = 0;
    state.match.p2Score = 0;
    state.match.server = 1;
    state.match.switchedSides = false;
    state.match.isFinished = false;
    state.match.winnerIndex = null;

    // Reset consecutiveWins for fresh tour
    ['A', 'B', 'C'].forEach(id => state.players[id].consecutiveWins = 0);

    state.tours.push([]); // Add empty tour
    saveState();
    render();
    renderDashboard();
}

function finalizeMatch(e) {
    if (e) e.stopPropagation();

    let winnerIndex = state.match.winnerIndex;
    let p1 = getPlayerRef(state.match.p1Id);
    let p2 = getPlayerRef(state.match.p2Id);

    if (state.mode === 'rotation') {
        let wId = winnerIndex === 1 ? state.match.p1Id : state.match.p2Id;
        let lId = winnerIndex === 1 ? state.match.p2Id : state.match.p1Id;

        let winnerState = getPlayerRef(wId);
        let loserState = getPlayerRef(lId);
        let restingState = getPlayerRef(state.match.restingId);

        // Update Base Stats
        winnerState.wins++;
        winnerState.matchesPlayed++;
        loserState.matchesPlayed++;

        let wScore = winnerIndex === 1 ? state.match.p1Score : state.match.p2Score;
        let lScore = winnerIndex === 1 ? state.match.p2Score : state.match.p1Score;

        winnerState.pointsScored += wScore;
        winnerState.pointDiff += (wScore - lScore);
        loserState.pointsScored += lScore;
        loserState.pointDiff += (lScore - wScore);

        winnerState.consecutiveWins++;
        loserState.consecutiveWins = 0;
        restingState.consecutiveWins = 0;

        let activeTour = state.tours[state.tours.length - 1];

        // Save this completed match into the tour history
        activeTour.push({
            p1: state.match.p1Id,
            p2: state.match.p2Id,
            r: state.match.restingId,
            winner: wId
        });

        // Rotation Logic: Max 2 continuous game wins
        let nextP1, nextP2, nextR;
        if (winnerState.consecutiveWins >= 2) {
            // Winner must yield -> Loser stays on vs Resting
            winnerState.consecutiveWins = 0;
            nextR = wId;
            nextP1 = lId;
            nextP2 = state.match.restingId;
        } else {
            // Normal rule: Loser rests -> Winner stays on vs Resting
            nextR = lId;
            nextP1 = wId;
            nextP2 = state.match.restingId;
        }

        // Advance Match (unless tour is full, we still queue it up so if they start new it's ready, 
        // but typically randomize is pressed so it doesn't matter too much).
        state.match.p1Id = nextP1;
        state.match.p2Id = nextP2;
        state.match.restingId = nextR;

        // Reset swap on new match
        state.match.switchedSides = false;

    } else {
        // Singles or Doubles simple increment
        let pWin = winnerIndex === 1 ? p1 : p2;
        pWin.wins++;
        state.match.switchedSides = false;
    }

    // Reset scores and state for next game
    state.match.p1Score = 0;
    state.match.p2Score = 0;
    state.match.server = 1;
    state.match.isFinished = false;
    state.match.winnerIndex = null;

    saveState();
    render();

    // Check if the tour just completed (3 matches done)
    if (state.mode === 'rotation') {
        let completedTour = state.tours[state.tours.length - 1];
        if (completedTour.length >= 3) {
            showTourComplete(state.tours.length, completedTour);
        }
    }
}

// -- MODAL DASHBOARD & SETTINGS --

function openDataModal() {
    document.getElementById('data-modal').style.display = 'flex';
    renderDashboard();
}

function openSettingsModal() {
    document.getElementById('settings-modal').style.display = 'flex';
    document.getElementById('mode-select').value = state.mode;
    document.getElementById('win-score-input').value = state.winningScore;
    document.getElementById('win-by-two').checked = state.winByTwo;
    renderNameEditors();
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function renderDashboard() {
    let container = document.getElementById('dashboard-container');
    let rotationContainer = document.getElementById('rotation-container');

    if (state.mode === 'rotation') {
        rotationContainer.style.display = 'block';
        let pArray = [state.players.A, state.players.B, state.players.C];
        // Sort by Wins desc, then PointDiff desc
        pArray.sort((a, b) => b.wins - a.wins || b.pointDiff - a.pointDiff);

        let html = '';
        pArray.forEach((p, index) => {
            let losses = p.matchesPlayed - p.wins;
            let winRate = p.matchesPlayed > 0 ? Math.round((p.wins / p.matchesPlayed) * 100) : 0;

            let diffClass = p.pointDiff > 0 ? 'positive' : (p.pointDiff < 0 ? 'negative' : '');
            let diffStr = p.pointDiff > 0 ? '+' + p.pointDiff : p.pointDiff;

            let cardClass = 'stat-card';
            let crown = '';
            if (index === 0 && p.wins > 0) {
                cardClass += ' gold';
                crown = '👑 ';
            } else if (index === 1 && p.wins > 0) {
                cardClass += ' silver';
            }

            html += `<div class="${cardClass}">
                <div class="stat-header">${crown}${p.name}</div>
                <div class="stat-row"><span>Số trận:</span> <span class="stat-val">${p.matchesPlayed}</span></div>
                <div class="stat-row"><span>Thắng:</span> <span class="stat-val" style="color:#F1C40F;">${p.wins}</span></div>
                <div class="stat-row"><span>Thua:</span> <span class="stat-val">${losses}</span></div>
                <div class="stat-row"><span>Tỉ lệ thắng:</span> <span class="stat-val">${winRate}%</span></div>
                <div class="stat-row"><span>Điểm ghi:</span> <span class="stat-val">${p.pointsScored}</span></div>
                <div class="stat-row"><span>Phong độ:</span> <span class="stat-val ${diffClass}">${diffStr}</span></div>
            </div>`;
        });
        container.innerHTML = html;

        renderRotationBoard();

    } else {
        rotationContainer.style.display = 'none';
        let p1 = getPlayerRef(state.match.p1Id);
        let p2 = getPlayerRef(state.match.p2Id);

        let p1Losses = p1.matchesPlayed - p1.wins;
        let p1Rate = p1.matchesPlayed > 0 ? Math.round((p1.wins / p1.matchesPlayed) * 100) : 0;

        let p2Losses = p2.matchesPlayed - p2.wins;
        let p2Rate = p2.matchesPlayed > 0 ? Math.round((p2.wins / p2.matchesPlayed) * 100) : 0;

        let p1Crown = (p1.wins > p2.wins) ? '👑 ' : '';
        let p2Crown = (p2.wins > p1.wins) ? '👑 ' : '';

        container.innerHTML = `
            <div class="stat-card ${p1.wins >= p2.wins ? 'gold' : ''}">
                <div class="stat-header">${p1Crown}${p1.name}</div>
                <div class="stat-row"><span>Số trận:</span> <span class="stat-val">${p1.matchesPlayed}</span></div>
                <div class="stat-row"><span>Thắng:</span> <span class="stat-val" style="color:#F1C40F;">${p1.wins}</span></div>
                <div class="stat-row"><span>Thua:</span> <span class="stat-val">${p1Losses}</span></div>
                <div class="stat-row"><span>Tỉ lệ thắng:</span> <span class="stat-val">${p1Rate}%</span></div>
            </div>
        `;
    }
}

function renderRotationBoard() {
    let board = document.getElementById('rotation-board');
    let html = '';

    // Loop through all tours
    state.tours.forEach((tourData, tourIndex) => {
        let isLastTour = (tourIndex === state.tours.length - 1);
        let tourTitle = `<div style="text-align:center; color:#888; margin-bottom: 15px; margin-top:20px; font-size:13px; text-transform:uppercase; letter-spacing: 1px;">🔄 Lịch Trình Tua ${tourIndex + 1} ${isLastTour ? '(Đang hoạt động)' : '(Đã qua)'}</div>`;

        html += tourTitle + `<div class="tour-board">`;

        for (let i = 0; i < 3; i++) {
            let statusClass = '';
            let statusTxt = '';
            let p1Name = '';
            let p2Name = '';
            let rName = '';

            if (i < tourData.length) { // Match completed
                let m = tourData[i];
                statusClass = 'completed';
                statusTxt = 'ĐÃ ĐẤU ✅';
                p1Name = state.players[m.p1].name;
                if (m.winner === m.p1) p1Name = '👑 ' + p1Name;
                p2Name = state.players[m.p2].name;
                if (m.winner === m.p2) p2Name = '👑 ' + p2Name;
                rName = '(Nghỉ: ' + state.players[m.r].name + ')';

            } else if (isLastTour && i === tourData.length) { // Current match in the active tour
                statusClass = 'active';
                statusTxt = 'ĐANG ĐẤU ⚔️';
                p1Name = state.players[state.match.p1Id].name;
                p2Name = state.players[state.match.p2Id].name;
                rName = '(Nghỉ: ' + state.players[state.match.restingId].name + ')';

            } else { // Future match or Unfinished old match (shouldn't happen)
                statusClass = 'upcoming';
                statusTxt = 'CHỜ ĐẤU ⏳';
                p1Name = '&nbsp;';
                p2Name = '&nbsp;';
                rName = '&nbsp;';
            }

            html += `
                <div class="tour-col ${statusClass}">
                    <div class="tour-status">${statusTxt}</div>
                    <div class="tour-player">${p1Name}</div>
                    <div class="tour-divider"></div>
                    <div class="tour-player">${p2Name}</div>
                    <div class="tour-rest">${rName}</div>
                </div>
            `;
        }

        html += `</div>`;

        // Add Randomize or + New Tour buttons on the LAST tour only
        if (isLastTour) {
            if (tourData.length === 0 && state.match.p1Score === 0 && state.match.p2Score === 0) {
                // Feature: Randomize first matchup only if literally no points/matches played in THIS tour
                html += `<div style="text-align:center; margin-top:20px;">
                            <button class="btn" style="background:#8E44AD; margin:0 auto; padding:8px 16px; font-size:14px;" onclick="randomizeFirstMatch()">🎲 Bốc Thăm Ngẫu Nhiên Cặp Đấu Mở Màn</button>
                         </div>`;
            } else if (tourData.length >= 3) {
                // Feature: Tour is full, allow adding next tour
                html += `<div style="text-align:center; margin-top:20px;">
                            <button class="btn" style="background:#27AE60; margin:0 auto; padding:8px 16px; font-size:14px;" onclick="startNewTour()">➕ Tạo Bảng Tua Mới (Tua ${tourIndex + 2})</button>
                         </div>`;
            }
        }
    });

    board.innerHTML = html;
}

function renderNameEditors() {
    let container = document.getElementById('names-container');
    let html = `<h3>Sửa Tên Người Chơi</h3>`;

    if (state.mode === 'rotation') {
        ['A', 'B', 'C'].forEach(id => {
            html += `<div class="form-group"><label>Người chơi ${id}</label><input type="text" value="${state.players[id].name}" onchange="updateName('players', '${id}', this.value)"></div>`;
        });
    } else if (state.mode === 'singles') {
        ['p1', 'p2'].forEach(id => {
            html += `<div class="form-group"><label>Người chơi ${id.replace('p', '')}</label><input type="text" value="${state.singles[id].name}" onchange="updateName('singles', '${id}', this.value)"></div>`;
        });
    } else {
        ['t1', 't2'].forEach(id => {
            html += `<div class="form-group"><label>Đội ${id.replace('t', '')}</label><input type="text" value="${state.doubles[id].name}" onchange="updateName('doubles', '${id}', this.value)"></div>`;
        });
    }
    container.innerHTML = html;
}

function updateName(dict, id, val) {
    if (val.trim() === '') return;
    state[dict][id].name = val.trim();
    saveState();
    renderDashboard();
    render();
}

function updateWinScore(val) {
    let s = parseInt(val, 10);
    if (!isNaN(s) && s > 0) {
        state.winningScore = s;
        saveState();
    }
}

function updateWinByTwo(isChecked) {
    state.winByTwo = isChecked;
    saveState();
}

function changeMode(newMode) {
    if (state.mode === newMode) return;
    if (!confirm("Thay đổi chế độ sẽ làm mới điểm số trận đấu hiện tại. Hãy chắc chắn bạn muốn đổi?")) {
        document.getElementById('mode-select').value = state.mode;
        return;
    }

    state.mode = newMode;
    state.match.p1Score = 0;
    state.match.p2Score = 0;
    state.match.server = 1;
    state.match.switchedSides = false;
    state.match.isFinished = false;
    state.match.winnerIndex = null;
    state.tours = [[]]; // Reset tour

    if (state.players) {
        ['A', 'B', 'C'].forEach(id => state.players[id].consecutiveWins = 0);
    }

    if (newMode === 'rotation') {
        state.match.p1Id = 'A';
        state.match.p2Id = 'B';
        state.match.restingId = 'C';
    } else if (newMode === 'singles') {
        state.match.p1Id = 'p1';
        state.match.p2Id = 'p2';
    } else if (newMode === 'doubles') {
        state.match.p1Id = 't1';
        state.match.p2Id = 't2';
    }

    saveState();
    renderDashboard();
    renderNameEditors();
    render();
}

function resetAll() {
    if (!confirm("Làm mới hoàn toàn: Xóa mọi thống kê, điểm số, lịch sử tua về 0?\n(Tên người chơi sẽ được giữ nguyên)")) return;

    // Keep current names and settings
    let nameA = (state.players && state.players.A) ? state.players.A.name : 'Người chơi A';
    let nameB = (state.players && state.players.B) ? state.players.B.name : 'Người chơi B';
    let nameC = (state.players && state.players.C) ? state.players.C.name : 'Người chơi C';
    let nameP1 = (state.singles && state.singles.p1) ? state.singles.p1.name : 'Người chơi 1';
    let nameP2 = (state.singles && state.singles.p2) ? state.singles.p2.name : 'Người chơi 2';
    let nameT1 = (state.doubles && state.doubles.t1) ? state.doubles.t1.name : 'Đội 1';
    let nameT2 = (state.doubles && state.doubles.t2) ? state.doubles.t2.name : 'Đội 2';

    let keepMode = state.mode || 'rotation';
    let keepWinScore = state.winningScore || 21;
    let keepWinByTwo = (state.winByTwo !== undefined) ? state.winByTwo : true;

    // Mutate IN-PLACE so the JS variable reference stays the same
    state.mode = keepMode;
    state.winningScore = keepWinScore;
    state.winByTwo = keepWinByTwo;

    // Zero out all player stats
    state.players = {
        A: { id: 'A', name: nameA, wins: 0, pointsScored: 0, pointDiff: 0, matchesPlayed: 0, consecutiveWins: 0, hasRested: false },
        B: { id: 'B', name: nameB, wins: 0, pointsScored: 0, pointDiff: 0, matchesPlayed: 0, consecutiveWins: 0, hasRested: false },
        C: { id: 'C', name: nameC, wins: 0, pointsScored: 0, pointDiff: 0, matchesPlayed: 0, consecutiveWins: 0, hasRested: true }
    };
    state.singles = {
        p1: { id: 'p1', name: nameP1, wins: 0 },
        p2: { id: 'p2', name: nameP2, wins: 0 }
    };
    state.doubles = {
        t1: { id: 't1', name: nameT1, wins: 0 },
        t2: { id: 't2', name: nameT2, wins: 0 }
    };

    // Zero out current match
    state.match = {
        p1Id: keepMode === 'rotation' ? 'A' : (keepMode === 'singles' ? 'p1' : 't1'),
        p2Id: keepMode === 'rotation' ? 'B' : (keepMode === 'singles' ? 'p2' : 't2'),
        restingId: 'C',
        p1Score: 0,
        p2Score: 0,
        server: 1,
        switchedSides: false,
        isFinished: false,
        winnerIndex: null
    };

    // Wipe all tour history completely
    state.tours = [[]];

    // Persist and redraw everything
    saveState();
    localStorage.removeItem('wiped_v3');
    localStorage.removeItem('wiped_v3_1');
    localStorage.removeItem('saved_names');

    closeModal('data-modal');
    closeModal('settings-modal');

    document.getElementById('mode-select').value = state.mode;
    document.getElementById('win-score-input').value = state.winningScore;
    document.getElementById('win-by-two').checked = state.winByTwo;

    renderNameEditors();
    renderDashboard();
    render();
}

// Initialize display
render();

// ============================================================
// TOUR COMPLETE OVERLAY & FIREWORKS
// ============================================================

let fireworksRAF = null;
let fireworksParticles = [];

function showTourComplete(tourNumber, tourData) {
    let overlay = document.getElementById('tour-complete-overlay');
    let title = document.getElementById('tour-complete-title');
    overlay.style.display = 'flex';

    // --- Analyse tour wins ---
    let winsInTour = {};
    tourData.forEach(m => {
        winsInTour[m.winner] = (winsInTour[m.winner] || 0) + 1;
    });
    // Find if any player won 2 matches
    let champion = null;
    for (let id in winsInTour) {
        if (winsInTour[id] >= 2) { champion = id; break; }
    }
    let allEqual = !champion && Object.keys(winsInTour).length === 3
        && Object.values(winsInTour).every(w => w === 1);

    if (champion) {
        let name = state.players[champion].name;
        title.textContent = '🏆 ' + name + ' Chiến Thắng!';
        setTrophyColor('gold');
    } else if (allEqual) {
        title.textContent = '🤝 Cả 3 đều rất tốt!';
        setTrophyColor('silver');
    } else {
        // Fallback (shouldn't normally happen)
        title.textContent = '🏆 Chiến Thắng Vòng ' + tourNumber;
        setTrophyColor('gold');
    }

    // Force CSS animation replay
    let content = overlay.querySelector('.tour-complete-content');
    content.style.animation = 'none';
    content.offsetHeight;
    content.style.animation = '';

    let trophy = overlay.querySelector('.tour-trophy');
    trophy.style.animation = 'none';
    trophy.offsetHeight;
    trophy.style.animation = '';

    startFireworks();
}

function setTrophyColor(type) {
    // Swap SVG gradient stop colours and trophy glow dynamically
    let grad1 = document.getElementById('cupGold');
    let grad2 = document.getElementById('handleGold');
    let trophy = document.querySelector('.tour-trophy');
    let title = document.getElementById('tour-complete-title');

    if (type === 'silver') {
        let stops1 = grad1.querySelectorAll('stop');
        stops1[0].style.stopColor = '#C0C0C0';
        stops1[1].style.stopColor = '#F0F0F0';
        stops1[2].style.stopColor = '#8A8A8A';
        let stops2 = grad2.querySelectorAll('stop');
        stops2[0].style.stopColor = '#8A8A8A';
        stops2[1].style.stopColor = '#D8D8D8';
        stops2[2].style.stopColor = '#8A8A8A';
        trophy.style.filter = 'drop-shadow(0 0 20px rgba(180,180,180,0.8)) drop-shadow(0 0 40px rgba(150,150,150,0.4))';
        title.style.color = '#D0D0D0';
        title.style.textShadow = '0 0 20px rgba(200,200,200,0.9), 0 0 50px rgba(180,180,180,0.5), 0 2px 4px rgba(0,0,0,0.8)';
    } else {
        let stops1 = grad1.querySelectorAll('stop');
        stops1[0].style.stopColor = '#FFD700';
        stops1[1].style.stopColor = '#FFF0A0';
        stops1[2].style.stopColor = '#C8960C';
        let stops2 = grad2.querySelectorAll('stop');
        stops2[0].style.stopColor = '#C8960C';
        stops2[1].style.stopColor = '#FFD700';
        stops2[2].style.stopColor = '#C8960C';
        trophy.style.filter = 'drop-shadow(0 0 20px rgba(255,215,0,0.7)) drop-shadow(0 0 40px rgba(255,180,0,0.4))';
        title.style.color = '#FFD700';
        title.style.textShadow = '0 0 20px rgba(255,215,0,0.9), 0 0 50px rgba(255,180,0,0.6), 0 2px 4px rgba(0,0,0,0.8)';
    }
}

function closeTourComplete() {
    let overlay = document.getElementById('tour-complete-overlay');
    overlay.style.display = 'none';
    stopFireworks();
    // Open data modal so they can see the tour board & press + New Tour
    openDataModal();
}

function startFireworks() {
    let canvas = document.getElementById('fireworks-canvas');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    fireworksParticles = [];
    if (fireworksRAF) cancelAnimationFrame(fireworksRAF);
    let lastBurst = 0;

    function launchBurst(now) {
        let colors = [
            '#FFD700', '#FF4E50', '#FC913A', '#F9D423', '#2ECC71',
            '#4A90E2', '#9B59B6', '#E74C3C', '#1ABC9C', '#FF69B4'
        ];
        let x = Math.random() * canvas.width;
        let y = Math.random() * canvas.height * 0.65;
        let color = colors[Math.floor(Math.random() * colors.length)];
        let count = 60 + Math.floor(Math.random() * 40);
        for (let i = 0; i < count; i++) {
            let angle = (Math.PI * 2 * i) / count;
            let speed = 2 + Math.random() * 5;
            fireworksParticles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                alpha: 1,
                color,
                radius: 2 + Math.random() * 2,
                gravity: 0.08 + Math.random() * 0.06,
                decay: 0.012 + Math.random() * 0.010
            });
        }
    }

    function loop(now) {
        let ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Launch a new burst every ~600ms
        if (now - lastBurst > 600) {
            launchBurst(now);
            if (Math.random() < 0.4) launchBurst(now); // occasional double burst
            lastBurst = now;
        }

        // Update & draw particles
        fireworksParticles = fireworksParticles.filter(p => p.alpha > 0.02);
        fireworksParticles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += p.gravity;
            p.vx *= 0.98;
            p.alpha -= p.decay;

            ctx.save();
            ctx.globalAlpha = Math.max(0, p.alpha);
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.shadowBlur = 6;
            ctx.shadowColor = p.color;
            ctx.fill();
            ctx.restore();
        });

        fireworksRAF = requestAnimationFrame(loop);
    }

    fireworksRAF = requestAnimationFrame(loop);
}

function stopFireworks() {
    if (fireworksRAF) {
        cancelAnimationFrame(fireworksRAF);
        fireworksRAF = null;
    }
    fireworksParticles = [];
    let canvas = document.getElementById('fireworks-canvas');
    let ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// ============================================================
// FINAL AWARDS PODIUM
// ============================================================

function openFinalAwards() {
    closeModal('data-modal');
    let overlay = document.getElementById('final-awards-overlay');
    let podiumRow = document.getElementById('podium-row');
    
    // Calculate rankings
    let players = [];
    if (state.mode === 'rotation') {
        players = [state.players.A, state.players.B, state.players.C];
    } else if (state.mode === 'singles') {
        players = [state.singles.p1, state.singles.p2];
    } else {
        players = [state.doubles.t1, state.doubles.t2];
    }

    // Sort by wins (desc), then point diff (desc)
    players.sort((a,b) => (b.wins - a.wins) || ((b.pointDiff || 0) - (a.pointDiff || 0)));

    // Generate SVG for trophies with specific colors
    const getTrophySVG = (color1, color2, color3) => `
        <svg viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg" style="width:100%; height:100%;">
            <defs>
                <linearGradient id="cupGrad-${color1}" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:${color1};stop-opacity:1" />
                    <stop offset="40%" style="stop-color:${color2};stop-opacity:1" />
                    <stop offset="100%" style="stop-color:${color3};stop-opacity:1" />
                </linearGradient>
                <linearGradient id="handleGrad-${color1}" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" style="stop-color:${color3}" />
                    <stop offset="50%" style="stop-color:${color1}" />
                    <stop offset="100%" style="stop-color:${color3}" />
                </linearGradient>
            </defs>
            <path d="M28,10 L72,10 L65,65 Q50,75 35,65 Z" fill="url(#cupGrad-${color1})" stroke="rgba(0,0,0,0.3)" stroke-width="1"/>
            <path d="M28,18 Q10,18 10,35 Q10,52 28,50" fill="none" stroke="url(#handleGrad-${color1})" stroke-width="6" stroke-linecap="round"/>
            <path d="M72,18 Q90,18 90,35 Q90,52 72,50" fill="none" stroke="url(#handleGrad-${color1})" stroke-width="6" stroke-linecap="round"/>
            <rect x="44" y="65" width="12" height="25" fill="url(#cupGrad-${color1})" stroke="rgba(0,0,0,0.3)" stroke-width="1"/>
            <rect x="30" y="90" width="40" height="10" rx="3" fill="url(#cupGrad-${color1})" stroke="rgba(0,0,0,0.3)" stroke-width="1"/>
            <text x="50" y="46" text-anchor="middle" font-size="22" fill="rgba(255,255,255,0.7)">★</text>
        </svg>
    `;

    const trophyColors = [
        ['#FFD700', '#FFF0A0', '#C8960C'], // Gold
        ['#C0C0C0', '#F0F0F0', '#8A8A8A'], // Silver
        ['#CD7F32', '#F4A460', '#8B4513']  // Bronze
    ];

    let html = '';
    players.forEach((p, index) => {
        if (index >= 3) return; // Max 3 on podium
        let rank = index + 1;
        let tColors = trophyColors[index];
        let losses = p.matchesPlayed - p.wins;
        if (state.mode !== 'rotation') losses = '?'; // non-rotation modes don't strictly track losses the same way, but let's just show basic stats
        
        // Build stats block
        let statsHtml = `<span>Thắng: ${p.wins}</span><br>`;
        if (state.mode === 'rotation') {
            statsHtml += `Thua: ${losses}<br>`;
            statsHtml += `Hiệu số: ${p.pointDiff > 0 ? '+' : ''}${p.pointDiff}`;
        }

        html += `
            <div class="podium-col rank-${rank}">
                <div class="podium-trophy">
                    ${getTrophySVG(tColors[0], tColors[1], tColors[2])}
                </div>
                <div class="podium-name">${p.name}</div>
                <div class="podium-stats">
                    ${statsHtml}
                </div>
            </div>
        `;
    });

    podiumRow.innerHTML = html;
    overlay.style.display = 'flex';
    
    // Reuse the fireworks from the tour completion!
    startFireworks();
}

function closeFinalAwards() {
    let overlay = document.getElementById('final-awards-overlay');
    overlay.style.display = 'none';
    stopFireworks();
}
