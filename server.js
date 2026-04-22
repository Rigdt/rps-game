const express = require('express');
const path = require('path');

const app = express();
const port = 3000;

// middleware to serve static files and parse JSON bodies
// i guess connecting the frontend "public" folder and backend in one server for simplicity
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Store active games in memory
// Format: { "gameId": { players: {...}, moves: {...}, status: "waiting" | "complete" } }
const games = {};

// Helper function to determine the winner
// This function takes the moves of both players and determines the winner 
function determineWinner(move1, move2) {
  if (move1 === move2) {
    return 'tie';
  }

  // Rock beats scissors
  if (move1 === 'rock' && move2 === 'scissors') return 'player1';
  if (move1 === 'scissors' && move2 === 'rock') return 'player2';

  // Paper beats rock
  if (move1 === 'paper' && move2 === 'rock') return 'player1';
  if (move1 === 'rock' && move2 === 'paper') return 'player2';

  // Scissors beats paper
  if (move1 === 'scissors' && move2 === 'paper') return 'player1';
  if (move1 === 'paper' && move2 === 'scissors') return 'player2';
}

// helper function to generate unique game IDs
// this generates a random 8-character string for the game ID or link to share with the opponent
function generateGameId() {
    return Math.random().toString(36).substr(2, 8).toUpperCase();
}

// ENDPOINT 1: Create a new game
// when player 1 clicks "Create Game", this endpoint is called to create a new game, generate a unique game ID, and returns the game ID to be shared with player 2. 
// The game status is set to "waiting" until player 2 joins.
app.post('/api/games/create', (req, res) => {
    const gameId = generateGameId();
    games[gameId] = {
        players: {
            player1: {name : "Player 1", joined: true},
            player2: null
        },
        moves: {
            player1: null,
            player2: null
        },
        status: "waiting" // waiting for player 2 to join
    };
    res.json({ gameId });
    console.log(`Game created: ${gameId}`);
});

// ENDPOINT 2: Join an existing game
// when player 2 clicks "Join Game" and enters the game ID, this endpoint is called to add player 2 to the game.
app.post('/api/games/:gameId/join', (req, res) => {
    const { gameId } = req.params;
    const game = games[gameId];
    
    if (!game) {
        return res.status(404).json({ error: 'Game not found' });
    }

    if (game.players.player2) {
        return res.status(400).json({ error: 'Game is full' });
    }

    game.players.player2 = {name : "Player 2", joined: true};
    game.status = "in progress"; // both players have joined, game is ready to start

    res.json({ gameId, message: 'Joined game', status: game.status });
    console.log(`Player joined game: ${gameId}`);
});

// ENDPOINT 3: Submit a move (rock/paper/scissors)
//eachplayer submits their move, server checks that both players have moved and dtermines winner
app.post('/api/games/:gameId/move', (req, res) => {
    const { gameId } = req.params;
    const { player, move } = req.body;
    const game = games[gameId];

    if (!game) {
        return res.status(404).json({ error: 'Game not found' });
    }

    if(!['rock', 'paper', 'scissors'].includes(move)) {
        return res.status(400).json({ error: 'Invalid move' });
    }

    game.moves[player] = move;
    
    // Check if both players have moved
    if (game.moves.player1 && game.moves.player2) {
        const result = determineWinner(
            game.moves.player1, 
            game.moves.player2
        );
        game.status = "complete"; // game is complete after both players have moved
        game.result = result; // store the result of the game

        return res.json({
            result,
            player1Move: game.moves.player1,
            player2Move: game.moves.player2
        });
    }
    
    res.json({ status: 'waiting', message: 'Move recorded, waiting for opponent' });
});

//ENDPOINT 4: Get game status 
//Frontend checks game status (is player 2 here yet? is the game done?)
app.get('/api/games/:gameId', (req, res) => {
    const { gameId } = req.params;
    const game = games[gameId];

    if (!game) {
        return res.status(404).json({ error: 'Game not found' });
    }

    res.json({
        gameId,
        status: game.status,
        hasPlayer2: game.players.player2 !== null,
        result: game.result || null
    });
});

//ENDPOINT 5: Reset game for another round
//after a game players can choose to play another round this endpoint resets the game for a new round
app.post('/api/games/:gameId/reset', (req, res) => {
    const { gameId } = req.params;
    const game = games[gameId];

    if (!game) {
        return res.status(404).json({ error: 'Game not found' });
    }

    // Reset moves and status for a new round, but keep players
    game.moves = { player1: null, player2: null };
    game.status = "in progress"; // reset to in progress for the new round
    game.result = null; // clear previous result for the new round

    res.json({ message: 'Game reset ', gameId });
});

//Start the server
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
    console.log('Create a game and share the URL with a friend!');
    console.log('Endpoints:');
    console.log('POST /api/games/create - Create a new game');
    console.log('POST /api/games/:gameId/join - Join an existing game');
    console.log('POST /api/games/:gameId/move - Submit a move (rock/paper/scissors)');
    console.log('GET /api/games/:gameId - Get game status');
    console.log('POST /api/games/:gameId/reset - Reset game for another round');
});
    