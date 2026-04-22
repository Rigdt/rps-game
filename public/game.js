// Game state
let gameId = null;
let playerRole = null;
let myMove = null;

// DOM Elements
const homeScreen = document.getElementById('homeScreen');
const waitingScreen = document.getElementById('waitingScreen');
const gameScreen = document.getElementById('gameScreen');
const gameCodeDisplay = document.getElementById('gameCode');
const gameStatusDisplay = document.getElementById('gameStatus');
const resultDisplay = document.getElementById('result');
const resultText = document.getElementById('resultText');
const moveBtns = document.querySelectorAll('.move-btn');

// Event Listeners
document.getElementById('createBtn').addEventListener('click', createGame);
document.getElementById('joinBtn').addEventListener('click', joinGame);
document.getElementById('backBtn1').addEventListener('click', goHome);
document.getElementById('backBtn2').addEventListener('click', goHome);
document.getElementById('playAgainBtn').addEventListener('click', playAgain);

moveBtns.forEach(btn => {
  btn.addEventListener('click', () => submitMove(btn.dataset.move));
});

// FUNCTION 1: Create a new game
async function createGame() {
  try {
    const response = await fetch('/api/games/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    const data = await response.json();
    gameId = data.gameId;
    playerRole = 'player1';

    showScreen('waiting');
    gameCodeDisplay.textContent = gameId;
    waitForPlayer2();
  } catch (error) {
    console.error('Error creating game:', error);
    alert('Failed to create game. Is the server running?');
  }
}

// FUNCTION 2: Join an existing game
async function joinGame() {
  const code = document.getElementById('gameCodeInput').value.toUpperCase();

  if (!code) {
    alert('Please enter a game code');
    return;
  }

  try {
    const response = await fetch(`/api/games/${code}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      alert('Game not found or already full');
      return;
    }

    gameId = code;
    playerRole = 'player2';
    showScreen('game');
  } catch (error) {
    console.error('Error joining game:', error);
    alert('Failed to join game');
  }
}

// FUNCTION 3: Wait for player 2 to join
async function waitForPlayer2() {
  let attempts = 0;
  const maxAttempts = 120;

  const interval = setInterval(async () => {
    attempts++;

    try {
      const response = await fetch(`/api/games/${gameId}`);
      const game = await response.json();

      if (game.hasPlayer2) {
        clearInterval(interval);
        showScreen('game');
      }

      if (attempts >= maxAttempts) {
        clearInterval(interval);
        alert('Game expired. Create a new one.');
        goHome();
      }
    } catch (error) {
      console.error('Error checking game status:', error);
    }
  }, 1000);
}

// FUNCTION 4: Submit your move
async function submitMove(move) {
  myMove = move;

  // Visual feedback
  moveBtns.forEach(btn => btn.classList.remove('bg-[#00d4ff]', 'text-[#0a0e27]'));
  event.target.closest('.move-btn').classList.add('bg-[#00d4ff]', 'text-[#0a0e27]');
  gameStatusDisplay.textContent = 'Waiting for opponent...';

  try {
    const response = await fetch(`/api/games/${gameId}/move`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ player: playerRole, move })
    });

    const data = await response.json();

    if (data.result) {
      showResult(data.result);
    } else {
      pollForResult();
    }
  } catch (error) {
    console.error('Error submitting move:', error);
  }
}

// FUNCTION 5: Poll for game result
async function pollForResult() {
  const interval = setInterval(async () => {
    try {
      const response = await fetch(`/api/games/${gameId}`);
      const game = await response.json();

      if (game.status === 'complete') {
        clearInterval(interval);
        showResult(game.result);
      }
    } catch (error) {
      console.error('Error polling:', error);
    }
  }, 500);
}

// FUNCTION 6: Show the result
function showResult(result) {
  resultDisplay.classList.remove('hidden');
  gameStatusDisplay.textContent = '';

  let message = '';
  if (result === 'tie') {
    message = "It's a tie!";
  } else if (result === playerRole) {
    message = 'You won!';
  } else {
    message = 'You lost!';
  }

  resultText.textContent = message;
}

// FUNCTION 7: Play again
async function playAgain() {
  try {
    await fetch(`/api/games/${gameId}/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    myMove = null;
    resultDisplay.classList.add('hidden');
    moveBtns.forEach(btn => btn.classList.remove('bg-[#00d4ff]', 'text-[#0a0e27]'));
    gameStatusDisplay.textContent = 'Choose rock, paper, or scissors';
  } catch (error) {
    console.error('Error resetting game:', error);
  }
}

// UTILITY: Screen transitions
function showScreen(screenName) {
  homeScreen.classList.remove('active');
  waitingScreen.classList.remove('active');
  gameScreen.classList.remove('active');

  if (screenName === 'home') homeScreen.classList.add('active');
  if (screenName === 'waiting') waitingScreen.classList.add('active');
  if (screenName === 'game') gameScreen.classList.add('active');
}

function goHome() {
  gameId = null;
  playerRole = null;
  myMove = null;
  resultDisplay.classList.add('hidden');
  moveBtns.forEach(btn => btn.classList.remove('bg-[#00d4ff]', 'text-[#0a0e27]'));
  document.getElementById('gameCodeInput').value = '';
  showScreen('home');
}