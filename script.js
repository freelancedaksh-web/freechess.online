// --- FREECHESS AI ENGINE INITIALIZATION ---
const game = new Chess();
let engineWorker;
let engineReady = false;
let isAnalysisMode = false;
let currentMode = 'P1vsAI';
let selectedSquare = null;

// Exact Wikipedia Standard SVGs - 0 dependency breaking
const pieceImages = {
    'w': {
        'p': 'https://upload.wikimedia.org/wikipedia/commons/4/45/Chess_plt45.svg',
        'n': 'https://upload.wikimedia.org/wikipedia/commons/7/70/Chess_nlt45.svg',
        'b': 'https://upload.wikimedia.org/wikipedia/commons/b/b1/Chess_blt45.svg',
        'r': 'https://upload.wikimedia.org/wikipedia/commons/7/72/Chess_rlt45.svg',
        'q': 'https://upload.wikimedia.org/wikipedia/commons/1/15/Chess_qlt45.svg',
        'k': 'https://upload.wikimedia.org/wikipedia/commons/4/42/Chess_klt45.svg'
    },
    'b': {
        'p': 'https://upload.wikimedia.org/wikipedia/commons/c/c7/Chess_pdt45.svg',
        'n': 'https://upload.wikimedia.org/wikipedia/commons/e/ef/Chess_ndt45.svg',
        'b': 'https://upload.wikimedia.org/wikipedia/commons/9/98/Chess_bdt45.svg',
        'r': 'https://upload.wikimedia.org/wikipedia/commons/f/ff/Chess_rdt45.svg',
        'q': 'https://upload.wikimedia.org/wikipedia/commons/4/47/Chess_qdt45.svg',
        'k': 'https://upload.wikimedia.org/wikipedia/commons/f/f0/Chess_kdt45.svg'
    }
};

const files = ['a','b','c','d','e','f','g','h'];
const ranks = ['8','7','6','5','4','3','2','1'];

// WebWorker bypasses standard cross-origin issues seamlessly
function initEngine() {
    const workerData = `importScripts('https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.2/stockfish.js');`;
    const blob = new Blob([workerData], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(blob);
    engineWorker = new Worker(workerUrl);
    
    engineWorker.onmessage = function(event) {
        let line = event.data;
        if(line === 'readyok') engineReady = true;
        
        // Analysis extraction
        if(line.startsWith("info depth") && isAnalysisMode) {
            let scoreMatch = line.match(/score (cp|mate) (-?\d+)/);
            if(scoreMatch) {
                let type = scoreMatch[1];
                let val = parseInt(scoreMatch[2]);
                let evalText = type === 'mate' ? `M${Math.abs(val)}` : (val / 100.0).toFixed(2);
                if(game.turn() === 'b' && type !== 'mate') evalText = (val / -100.0).toFixed(2);
                document.getElementById('analysis-info').innerText = "Eval: " + (evalText > 0 && type !== 'mate' ? "+" : "") + evalText;
            }
        }
        
        // AI execution
        if(line.startsWith("bestmove")) {
            let moveInfo = line.split(" ");
            let bestMove = moveInfo[1];
            
            let isAITurn = (currentMode === 'P1vsAI' && game.turn() === 'b') || 
                           (currentMode === 'AIvsP1' && game.turn() === 'w');
                           
            if (isAITurn && bestMove && bestMove !== '(none)') {
                game.move({
                    from: bestMove.substring(0, 2),
                    to: bestMove.substring(2, 4),
                    promotion: bestMove.length > 4 ? bestMove[4] : 'q'
                });
                updateBoard();
                if(!checkGameOver() && isAnalysisMode) {
                    runAnalysis();
                }
            }
        }
    };
    
    engineWorker.postMessage("uci");
    engineWorker.postMessage("isready");
}

function createBoard() {
    const boardContainer = document.getElementById('board-container');
    boardContainer.innerHTML = '';
    
    let isFlipped = (currentMode === 'AIvsP1');
    let displayFiles = isFlipped ? [...files].reverse() : files;
    let displayRanks = isFlipped ? [...ranks].reverse() : ranks;
    
    for(let r=0; r<8; r++) {
        for(let f=0; f<8; f++) {
            let sqName = displayFiles[f] + displayRanks[r];
            let fIdx = files.indexOf(displayFiles[f]);
            let rIdx = ranks.indexOf(displayRanks[r]);
            let isLight = (fIdx + rIdx) % 2 === 0;
            
            let square = document.createElement('div');
            square.className = 'square ' + (isLight ? 'light' : 'dark');
            square.id = sqName;
            
            square.addEventListener('click', () => onSquareClick(sqName));
            boardContainer.appendChild(square);
        }
    }
}

function updateBoard() {
    document.querySelectorAll('.square').forEach(sq => {
        sq.innerHTML = '';
        sq.classList.remove('selected');
    });
    
    let board = game.board(); 
    for(let r=0; r<8; r++) {
        for(let f=0; f<8; f++) {
            let piece = board[r][f];
            if(piece) {
                let sqName = files[f] + ranks[r];
                let img = document.createElement('img');
                img.src = pieceImages[piece.color][piece.type];
                img.className = 'piece-img';
                document.getElementById(sqName).appendChild(img);
            }
        }
    }
    
    // Update move log
    let history = game.history();
    let historyStr = '';
    for(let i=0; i<history.length; i+=2) {
        historyStr += `${Math.floor(i/2)+1}. ${history[i]} ${history[i+1] || ''}\n`;
    }
    let histBox = document.getElementById('move-history');
    histBox.innerText = historyStr;
    histBox.scrollTop = histBox.scrollHeight;
}

function onSquareClick(sq) {
    if (game.game_over()) return;
    
    // Ignore clicks if it's the AI's turn
    let isAITurn = (currentMode === 'P1vsAI' && game.turn() === 'b') || 
                   (currentMode === 'AIvsP1' && game.turn() === 'w');
    if (isAITurn) return;

    if (selectedSquare === null) {
        let piece = game.get(sq);
        if (piece && piece.color === game.turn()) {
            selectedSquare = sq;
            document.getElementById(sq).classList.add('selected');
        }
    } else {
        let move = game.move({
            from: selectedSquare,
            to: sq,
            promotion: 'q' // Defaults to queen for seamless blitz flow
        });

        if (move === null) {
            let piece = game.get(sq);
            if (piece && piece.color === game.turn()) {
                document.getElementById(selectedSquare).classList.remove('selected');
                selectedSquare = sq;
                document.getElementById(sq).classList.add('selected');
            } else {
                document.getElementById(selectedSquare).classList.remove('selected');
                selectedSquare = null;
            }
        } else {
            selectedSquare = null;
            updateBoard();
            if(!checkGameOver()) triggerAI();
        }
    }
}

// Typing console logic for Blitz lovers
document.getElementById('typing-input').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        let val = this.value.trim();
        if(!val || game.game_over()) return;
        
        let isAITurn = (currentMode === 'P1vsAI' && game.turn() === 'b') || 
                       (currentMode === 'AIvsP1' && game.turn() === 'w');
        if (isAITurn) return;

        let move = game.move(val); 
        if(move === null) {
            this.classList.add('error');
            setTimeout(() => this.classList.remove('error'), 300);
        } else {
            this.value = '';
            updateBoard();
            if(!checkGameOver()) triggerAI();
        }
    }
});

function triggerAI() {
    if(game.game_over()) return;
    let mode = document.getElementById('game-mode').value;
    let isAITurn = (mode === 'P1vsAI' && game.turn() === 'b') || 
                   (mode === 'AIvsP1' && game.turn() === 'w');
                   
    if(isAITurn) {
        let diff = document.getElementById('difficulty').value;
        engineWorker.postMessage("setoption name Skill Level value " + diff);
        engineWorker.postMessage("position fen " + game.fen());
        engineWorker.postMessage("go depth " + diff); 
    } else if (isAnalysisMode) {
        runAnalysis();
    }
}

function toggleAnalysis() {
    isAnalysisMode = document.getElementById('analysis-toggle').checked;
    if(isAnalysisMode && !game.game_over()) {
        runAnalysis();
    } else {
        document.getElementById('analysis-info').innerText = 'Eval: --';
    }
}

function runAnalysis() {
    engineWorker.postMessage("position fen " + game.fen());
    engineWorker.postMessage("go depth 15");
}

function checkGameOver() {
    if(game.game_over()) {
        let msg = "Game Over! \n\nReason: ";
        if(game.in_checkmate()) msg += "Checkmate!";
        else if(game.in_stalemate()) msg += "Stalemate!";
        else if(game.in_threefold_repetition()) msg += "Draw by threefold repetition.";
        else if(game.insufficient_material()) msg += "Draw by insufficient material.";
        else if(game.in_draw()) msg += "Draw agreed or 50-move rule triggered.";
        
        setTimeout(() => alert(msg), 150);
        return true;
    }
    return false;
}

function newGame() {
    game.reset();
    currentMode = document.getElementById('game-mode').value;
    createBoard();
    updateBoard();
    document.getElementById('move-history').innerText = '';
    
    if(!isAnalysisMode) {
        document.getElementById('analysis-info').innerText = 'Eval: 0.00';
    }
    
    if(currentMode === 'AIvsP1') {
        triggerAI(); 
    } else if (isAnalysisMode) {
        runAnalysis();
    }
}

function offerDraw() {
    if(game.game_over()) return;
    let isAIGame = (currentMode === 'P1vsAI' || currentMode === 'AIvsP1');
    if(isAIGame) {
        alert("The AI politely declines your draw offer. It fights to the end!");
    } else {
        if(confirm("Player 1 has offered a draw. Does Player 2 accept?")) {
            alert("Match drawn by mutual agreement.");
            game.reset();
            updateBoard();
        }
    }
}

function resign() {
    if(game.game_over()) return;
    if(confirm("Are you sure you want to resign?")) {
        let winner = game.turn() === 'w' ? "Black" : "White";
        alert(winner + " wins by resignation.");
        game.reset();
        updateBoard();
    }
}

// Initial Bootup
initEngine();
createBoard();
updateBoard();
