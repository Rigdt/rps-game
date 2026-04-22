// Game state
let gameID = null;
let playerRole = null;
let myMove = null;

// DOM Elements
const homeScreen = document.getElementById('homeScreen');
const  waitingScreen = document.getElementById('waitingScreen');
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
        gameID = data.gameId;
        playerRole = 'player1';
        
        //show waiting screen with game code
        showScreen('waiting');
        gameCodeDisplay.textContent = gameID;

        //poll for player 2 to join
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
        alert('Please enter a game code to join.');
        return;
    }
    
    try {
        const response = await fetch(`/api/games/${code}/join`, { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }         
        });

        if (!response.ok) {
            alert('Game not found or already full.');
            return;
        }

        gameID = code;
        playerRole = 'player2';

        //go straight to game screen
        showScreen('game');
    } catch (error) {
        console.error('Error joining game:', error);
        alert('Failed to join game.');
    }
}

// FUNCTION 3: Wait for player 2 to join (polling)
async function waitForPlayer2() {
    let attempts = 0;
    const maxAttempts = 120; // wait for 2 mins 

    const intervalId = setInterval(async () => {
        attempts++;

        try {
            const response = await fetch(`/api/games/${gameID}`);
            const game = await response.json();

            if (game.hasPlayer2){
                clearInterval(intervalId);
                showScreen('game');
            }

            if (attempts >= maxAttempts) {
                clearInterval(intervalId);
                alert('Game expired. Create a new one.');
                goHome();
            }
        } catch (error) {
            console.error('Error checking game status:', error);
        }
    }, 1000); // check every second
}

// FUNCTION 4: Submit your move
async function submitMove(move) {
    myMove = move;

    //visual feedback
    moveBtns.forEach(btn => btn.classList.remove('selected'));
    event.target.closest('.move-btn').classList.add('selected');
    gameStatusDisplay.textContent = 'Waiting for opponent...';

    try{
        const response = await fetch(`/api/games/${gameID}/move`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ player: playerRole, move })
        });
        const data = await response.json();

        if (data.result) {
            //game is complete!
            showResult(data.result);
        }else {
            //still waiting for opponent
            pollForResult();
        }
    } catch (error) {
        console.error('Error submitting move:', error);
    }
}

// FUNCTION 5: Poll for game result (opponent made their move)
async function pollForResult() {
    const intervalId = setInterval(async () => {
        try {
            const response = await fetch(`/api/games/${gameID}`);
            const game = await response.json();

            if (game.status === 'complete') {
                clearInterval(intervalId);
                showResult(game.result);
            }
        } catch (error) {
            console.error('Error polling for result:', error);
        }
    }, 500); // check every 500ms
}

// FUNCTION 6: Show the result
function showResult(result) {
    resultDisplay.classList.remove('hidden');
    resultDisplay.classList.remove('win', 'lose', 'tie');
    gameStatusDisplay.textContent = '';

    let message = '';
    if (result === 'tie') {
        message = "It's a tie!";
        resultDisplay.classList.add('tie');
    }else if (result === playerRole) {
        message = 'You win!';
        resultDisplay.classList.add('win');
    }else {
        message = 'You lose!';
        resultDisplay.classList.add('lose');
    }
    
    resultText.textContent = message;
}

// FUNCTION 7: PLAY AGAIN
async function playAgain() {
    try {
        await fetch(`/api/games/${gameID}/reset`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        myMove = null;
        resultDisplay.classList.add('hidden');
        moveBtns.forEach(btn => btn.classList.remove('selected'));
        gameStatusDisplay.textContent = 'Make your move!';
    } catch (error) {
        console.error('Error resetting game:', error);
    }
}

//Utility: Screen Transitions
function showScreen(screen) {
    homeScreen.classList.remove('active');
    waitingScreen.classList.remove('active');
    gameScreen.classList.remove('active');
    
    if (screen === 'home') homeScreen.classList.add('active');
    if (screen === 'waiting') waitingScreen.classList.add('active');
    if (screen === 'game') gameScreen.classList.add('active');
}

function goHome() {
    gameID = null;
    playerRole = null;
    myMove = null;
    resultDisplay.classList.add('hidden');
    moveBtns.forEach(btn => btn.classList.remove('selected'));
    document.getElementById('gameCodeInput').value = '';
    showScreen('home');
}

