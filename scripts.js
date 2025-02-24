let currentRoomId = null;
let playerSymbol = null;
let playerName = null;
let lastUpdateTime = 0;

async function apiRequest(action, data = {}) {
    try {
        const response = await fetch('', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({action, ...data})
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Server Error');
        }
        
        return await response.json();
    } catch (error) {
        alert(error.message);
        throw error;
    }
}

function createRoom() {
    const name = document.getElementById('create-name').value.trim();
    if (!name) return alert('Please enter your name');
    
    apiRequest('create', {playerName: name})
        .then(({roomId}) => {
            currentRoomId = roomId;
            playerSymbol = 'X';
            playerName = name;
            lastUpdateTime = 0;
            showGameInterface();
            startGamePolling();
            document.getElementById('room-code').textContent = roomId;
        });
}

function joinRoom() {
    const name = document.getElementById('join-name').value.trim();
    const roomId = document.getElementById('room-id').value.trim();
    if (!name || !roomId) return alert('Please complete the information');
    
    apiRequest('join', {playerName: name, roomId})
        .then(() => {
            currentRoomId = roomId;
            playerSymbol = 'O';
            playerName = name;
            lastUpdateTime = 0;
            showGameInterface();
            startGamePolling();
        });
}

function showGameInterface() {
    document.getElementById('lobby').classList.add('hidden');
    document.getElementById('game').classList.remove('hidden');
    updateGameState();
}

async function updateGameState() {
    try {
        const gameData = await apiRequest('status', {roomId: currentRoomId});
        
        if (gameData.lastUpdate <= lastUpdateTime) return;
        
        lastUpdateTime = gameData.lastUpdate;
        
        document.getElementById('player-x').querySelector('.name').textContent = gameData.players.X;
        document.getElementById('player-o').querySelector('.name').textContent = gameData.players.O || '...';
        
        renderGameBoard(gameData);
        
        const statusElement = document.getElementById('game-status');
        if (gameData.status === 'finished') {
            statusElement.innerHTML = `Winner: ${gameData.winner} 🎉<br><button onclick="resetGame()">New game</button>`;
        } else if (gameData.status === 'waiting') {
            statusElement.textContent = 'Waiting for the second player....';
        } else {
            statusElement.textContent = `Turn: ${gameData.currentPlayer}`;
        }
    } catch (error) {
        console.error('Error updating game status:', error);
    }
}

function renderGameBoard(gameData) {
    const ultimateBoard = document.getElementById('ultimate-board');
    ultimateBoard.innerHTML = '';
    
    for (let boardIndex = 0; boardIndex < 9; boardIndex++) {
        const board = document.createElement('div');
        board.className = 'board';
        
        const isActive = gameData.nextBoardIndex === null || gameData.nextBoardIndex === boardIndex;
        const isPlayable = isBoardPlayable(gameData.boards[boardIndex]);
        const winner = gameData.boardWinners[boardIndex];
        
        if (winner) {
            board.classList.add('board-winner');
            board.style.backgroundColor = winner === 'X' ? 'var(--x-color)' : 'var(--o-color)';
            
            const winnerSymbol = document.createElement('div');
            winnerSymbol.className = 'board-winner-symbol';
            winnerSymbol.textContent = winner;
            winnerSymbol.style.color = winner === 'X' ? 'var(--x-color)' : 'var(--o-color)';
            board.appendChild(winnerSymbol);
        }

        if (!winner) {
            for (let cellIndex = 0; cellIndex < 9; cellIndex++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.board = boardIndex;
                cell.dataset.cell = cellIndex;
                
                const symbol = gameData.boards[boardIndex][cellIndex];
                if (symbol) {
                    cell.textContent = symbol;
                    cell.style.color = symbol === 'X' ? 'var(--x-color)' : 'var(--o-color)';
                }
                
                if (!isActive || !isPlayable || winner) {
                    cell.style.opacity = '0.5';
                    cell.style.cursor = 'not-allowed';
                    cell.onclick = null;
                } else {
                    cell.addEventListener('click', handleCellClick);
                }
                
                board.appendChild(cell);
            }
        } else {
            board.style.pointerEvents = 'none';
        }
        
        ultimateBoard.appendChild(board);
    }
}

async function handleCellClick(event) {
    if (document.body.classList.contains('single-player')) {
        const gameData = await apiRequest('status', {roomId: currentRoomId});
        playerSymbol = gameData.currentPlayer;
    }
    
    if (!playerSymbol) return;
    
    const boardIndex = parseInt(event.target.dataset.board);
    const cellIndex = parseInt(event.target.dataset.cell);
    
    try {
        await apiRequest('move', {
            roomId: currentRoomId,
            playerSymbol,
            boardIndex,
            cellIndex
        });
        await updateGameState();
    } catch (error) {
        console.error('Move error:', error);
        alert(error.message);
    }
}

function startGamePolling() {
    setInterval(() => {
        if (currentRoomId) updateGameState();
    }, 2000);
}

function copyRoomCode() {
    navigator.clipboard.writeText(currentRoomId)
        .then(() => alert('Room code copied!'))
        .catch(() => alert('Error copying the code!'));
}

async function resetGame() {
    try {
        await apiRequest('reset', {roomId: currentRoomId});
        lastUpdateTime = 0;
        await updateGameState();
    } catch (error) {
        console.error('Reset error:', error);
    }
}

function isBoardPlayable(board) {
    return !checkSmallBoardWinner(board) && !isBoardFull(board);
}

function checkSmallBoardWinner(board) {
    const winningLines = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6]
    ];
    
    for (const line of winningLines) {
        const [a, b, c] = line;
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return board[a];
        }
    }
    return null;
}

function isBoardFull(board) {
    return board.every(cell => cell !== null);
}

function startSingleDeviceGame() {
    apiRequest('create_single')
        .then(({roomId}) => {
            currentRoomId = roomId;
            playerSymbol = null;
            document.body.classList.add('single-player');
            showGameInterface();
            startSingleDevicePolling();
            document.getElementById('room-code').textContent = 'Local Game';
        });
}

function startSingleDevicePolling() {
    setInterval(() => {
        if (currentRoomId) updateGameState();
    }, 500);
}

function renderGameBoard(gameData) {
    const ultimateBoard = document.getElementById('ultimate-board');
    ultimateBoard.innerHTML = '';
    
    for (let boardIndex = 0; boardIndex < 9; boardIndex++) {
        const board = document.createElement('div');
        board.className = 'board';
        
        const isActive = gameData.nextBoardIndex === null || gameData.nextBoardIndex === boardIndex;
        const isPlayable = isBoardPlayable(gameData.boards[boardIndex]);
        const winner = gameData.boardWinners[boardIndex];
        
        if (winner) {
            board.classList.add('board-winner');
            board.style.backgroundColor = winner === 'X' ? 'var(--x-color)' : 'var(--o-color)';
            
            const winnerSymbol = document.createElement('div');
            winnerSymbol.className = 'board-winner-symbol';
            winnerSymbol.textContent = winner;
            winnerSymbol.style.color = winner === 'X' ? 'var(--x-color)' : 'var(--o-color)';
            board.appendChild(winnerSymbol);
        }

        if (!winner) {
            for (let cellIndex = 0; cellIndex < 9; cellIndex++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.board = boardIndex;
                cell.dataset.cell = cellIndex;
                
                const symbol = gameData.boards[boardIndex][cellIndex];
                if (symbol) {
                    cell.textContent = symbol;
                    cell.style.color = symbol === 'X' ? 'var(--x-color)' : 'var(--o-color)';
                }
                
                if (document.body.classList.contains('single-player')) {
                    if (gameData.currentPlayer && isActive && isPlayable) {
                        cell.addEventListener('click', handleCellClick);
                    } else {
                        cell.style.opacity = '0.5';
                        cell.style.cursor = 'not-allowed';
                    }
                } else {
                    if (!isActive || !isPlayable || winner) {
                        cell.style.opacity = '0.5';
                        cell.style.cursor = 'not-allowed';
                        cell.onclick = null;
                    } else {
                        cell.addEventListener('click', handleCellClick);
                    }
                }
                
                board.appendChild(cell);
            }
        } else {
            board.style.pointerEvents = 'none';
        }
        
        ultimateBoard.appendChild(board);
    }
}
if (document.body.classList.contains('single-player')) {
    if (isActive && isPlayable && !winner) {
        cell.addEventListener('click', handleCellClick);
        cell.style.opacity = '1';
        cell.style.cursor = 'pointer';
    } else {
        cell.style.opacity = '0.5';
        cell.style.cursor = 'not-allowed';
        cell.onclick = null;
    }
}