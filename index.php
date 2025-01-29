<?php
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $action = $data['action'] ?? '';
    
    header('Content-Type: application/json');
    
    try {
        switch($action) {
            case 'create':
                echo createRoom($data);
                break;
            case 'join':
                echo joinRoom($data);
                break;
            case 'move':
                echo handleMove($data);
                break;
            case 'status':
                echo getGameStatus($data);
                break;
            case 'reset':
                echo resetGame($data);
                break;
            default:
                http_response_code(400);
                echo json_encode(['error' => 'Invalid action']);
        }
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
    exit;
}

?>
<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <link href="https://cdn.jsdelivr.net/gh/rastikerdar/samim-font@v4.0.5/dist/font-face.css" rel="stylesheet" type="text/css" />
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>بازی XO پیشرفته</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <div class="container">
        <h1>Ultimate Tictactoe</h1>
        
        <div id="lobby">
            <div class="section">
                <h2>Make New Room 🏠</h2>
                <button onclick="createRoom()">Make new room</button>
                <input type="text" id="create-name" placeholder="Your name">
            </div>
            
            <div class="section">
                <h2>Join Room 🚪</h2>
                <button onclick="joinRoom()">Join Room</button>
                <input type="text" id="join-name" placeholder="Your Name">
                <input type="text" id="room-id" placeholder="Rooms Code">
            </div>
        </div>

        <div id="game" class="hidden">
            <div id="game-header">
                <div class="player-card" id="player-x">
                    <span class="symbol">❌</span>
                    <span class="name">...</span>
                </div>
                <div id="game-status">...</div>
                <div class="player-card" id="player-o">
                    <span class="symbol">⭕</span>
                    <span class="name">...</span>
                </div>
            </div>
            
            <div id="ultimate-board"></div>
            
            <div id="room-info">
                <button onclick="copyRoomCode()">Copy Code 📋</button>
                <span>Room Code: <strong id="room-code"></strong></span>
            </div>
        </div>
    </div>
    
    <script src="scripts.js"></script>
</body>
</html>

<?php
function createRoom($data) {
    $roomId = uniqid();
    $gameData = [
        'players' => [
            'X' => $data['playerName'],
            'O' => null
        ],
        'boards' => array_fill(0, 9, array_fill(0, 9, null)),
        'boardWinners' => array_fill(0, 9, null),
        'currentPlayer' => 'X',
        'status' => 'waiting',
        'lastUpdate' => time(),
        'nextBoardIndex' => null,
        'winner' => null
    ];
    
    saveGameData($roomId, $gameData);
    return json_encode(['roomId' => $roomId]);
}

function joinRoom($data) {
    $gameData = getGameData($data['roomId']);
    
    if(!$gameData) {
        throw new Exception('Room not found');
    }
    
    if($gameData['players']['O']) {
        throw new Exception('The room is full');
    }
    
    $gameData['players']['O'] = $data['playerName'];
    $gameData['status'] = 'playing';
    $gameData['lastUpdate'] = time();
    saveGameData($data['roomId'], $gameData);
    
    return json_encode(['status' => 'success']);
}

function handleMove($data) {
    $gameData = getGameData($data['roomId']);
    
    if($gameData['status'] !== 'playing') {
        throw new Exception('The game has not started yet');
    }
    
    if($gameData['currentPlayer'] !== $data['playerSymbol']) {
        throw new Exception('Its not your turn');
    }
    
    $boardIndex = $data['boardIndex'];
    $cellIndex = $data['cellIndex'];
    
    if ($gameData['nextBoardIndex'] !== null && $boardIndex != $gameData['nextBoardIndex']) {
        throw new Exception('You must play on the specified board');
    }
    
    if($gameData['boards'][$boardIndex][$cellIndex]) {
        throw new Exception('This spot has already been selected');
    }
    
    $gameData['boards'][$boardIndex][$cellIndex] = $data['playerSymbol'];
    
    $smallBoardWinner = checkSmallBoardWinner($gameData['boards'][$boardIndex]);
    if($smallBoardWinner) {
        $gameData['boardWinners'][$boardIndex] = $smallBoardWinner;
    }
    
    $ultimateWinner = checkUltimateWinner($gameData['boardWinners']);
    if($ultimateWinner) {
        $gameData['status'] = 'finished';
        $gameData['winner'] = $ultimateWinner;
    } else {
        $gameData['currentPlayer'] = $gameData['currentPlayer'] === 'X' ? 'O' : 'X';
        $nextBoardIndex = $cellIndex;
        $isNextBoardPlayable = isBoardPlayable($gameData['boards'][$nextBoardIndex]);
        $gameData['nextBoardIndex'] = $isNextBoardPlayable ? $nextBoardIndex : null;
    }
    
    $gameData['lastUpdate'] = time();
    saveGameData($data['roomId'], $gameData);
    return json_encode(['status' => 'success']);
}

function getGameStatus($data) {
    $gameData = getGameData($data['roomId']);
    return json_encode($gameData);
}

function resetGame($data) {
    $gameData = getGameData($data['roomId']);
    
    $gameData['boards'] = array_fill(0, 9, array_fill(0, 9, null));
    $gameData['boardWinners'] = array_fill(0, 9, null);
    $gameData['currentPlayer'] = 'X';
    $gameData['status'] = 'playing';
    $gameData['winner'] = null;
    $gameData['nextBoardIndex'] = null;
    $gameData['lastUpdate'] = time();
    
    saveGameData($data['roomId'], $gameData);
    return json_encode(['status' => 'success']);
}

function getGameData($roomId) {
    $games = json_decode(file_get_contents('games.json'), true);
    return $games[$roomId] ?? null;
}

function saveGameData($roomId, $gameData) {
    $games = json_decode(file_get_contents('games.json'), true) ?? [];
    $games[$roomId] = $gameData;
    file_put_contents('games.json', json_encode($games, JSON_PRETTY_PRINT));
}

function isBoardPlayable($board) {
    return !checkSmallBoardWinner($board) && !isBoardFull($board);
}

function checkSmallBoardWinner($board) {
    $winningLines = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6]
    ];
    
    foreach ($winningLines as $line) {
        $a = $board[$line[0]];
        $b = $board[$line[1]];
        $c = $board[$line[2]];
        
        if ($a && $a === $b && $a === $c) {
            return $a;
        }
    }
    return null;
}

function checkUltimateWinner($boardWinners) {
    $winningLines = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6]
    ];
    
    foreach ($winningLines as $line) {
        $a = $boardWinners[$line[0]] ?? null;
        $b = $boardWinners[$line[1]] ?? null;
        $c = $boardWinners[$line[2]] ?? null;
        
        if ($a && $a === $b && $a === $c) {
            return $a;
        }
    }
    return null;
}

function isBoardFull($board) {
    return !in_array(null, $board, true);
}