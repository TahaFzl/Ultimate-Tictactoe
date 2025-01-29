# Game API

This project is a simple API for managing an online game with the following features:

## Features
- Create a game room
- Join a game room
- Make a move in the game
- Get the game status
- Reset the game

## Game Rules
- Each player must first join a room.
- Players take turns sequentially.
- Valid moves must follow the specific game rules (depending on the game type).
- If a player wins, the game stops, and it can be reset.

## How the Code Works

### 1. Creating a Room
Send a `POST` request to `/index.php` with the following data:
json
{
    "action": "create"
}
Response:
{
    "room_id": "12345"
}

### 2. Joining a Room
Send a POST request:
{
    "action": "join",
    "room_id": "12345"
}

### 3. Making a Move
{
    "action": "move",
    "room_id": "12345",
    "move": "some_move"
}

### 4. Getting Game Status
{
    "action": "status",
    "room_id": "12345"
}

### 5. Resetting the Game
{
    "action": "reset",
    "room_id": "12345"
}

I will be happy for any commit!
