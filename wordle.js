document.addEventListener('DOMContentLoaded', function() {
    // Game constants
    const MAX_GUESSES = 5;
    const WORDS_JSON_PATH = 'assets/configs/words.json';

    // DOM Elements
    const gameBoard = document.getElementById('gameBoard');
    const guessInput = document.getElementById('guessInput');
    const submitButton = document.getElementById('submitGuess');
    const newGameButton = document.getElementById('newGame');

    // Modal elements
    const gameModal = document.getElementById('gameModal');
    const modalIcon = document.getElementById('modalIcon');
    const modalTitle = document.getElementById('modalTitle');
    const modalMessage = document.getElementById('modalMessage');
    const modalClose = document.getElementById('modalClose');

    // Stats elements
    const currentStreakElement = document.getElementById('currentStreak');
    const maxStreakElement = document.getElementById('maxStreak');
    const gamesPlayedElement = document.getElementById('gamesPlayed');
    const winPercentageElement = document.getElementById('winPercentage');

    // Game state
    let currentGuess = '';
    let currentRow = 0;
    let gameOver = false;
    let wordOfTheDay = '';
    let wordList = [];
    let wordLength = 5;
    let letterTiles = [];

    // Stats
    let stats = {
        gamesPlayed: 0,
        gamesWon: 0,
        currentStreak: 0,
        maxStreak: 0
    };

    // Initialize the game
    async function init() {
        // Load word list
        await loadWordList();

        // Load stats from localStorage
        loadStats();

        // Start a new game
        startNewGame();

        // Set up event listeners
        guessInput.addEventListener('input', handleInput);
        guessInput.addEventListener('keydown', handleKeyDown);
        submitButton.addEventListener('click', submitGuess);
        newGameButton.addEventListener('click', startNewGame);
        modalClose.addEventListener('click', closeModal);

        // Focus the input field
        guessInput.focus();

        // Update stats display
        updateStatsDisplay();
    }

    // Load word list
    async function loadWordList() {
        const response = await fetch(WORDS_JSON_PATH);

        if (!response.ok) {
            throw new Error(`Failed to load word list from ${WORDS_JSON_PATH}. Status: ${response.status}`);
        }

        const data = await response.json();

        if (!data.words || !Array.isArray(data.words)) {
            throw new Error('Invalid word list format in words.json');
        }

        if (data.words.length === 0) {
            throw new Error('Word list is empty in words.json');
        }

        // Convert all words to uppercase
        wordList = data.words.map(word => word.toUpperCase());

        console.log(`Loaded ${wordList.length} words from ${WORDS_JSON_PATH}`);
    }

    // Load stats from localStorage
    function loadStats() {
        const savedStats = localStorage.getItem('heatWordleStats');
        if (savedStats) {
            stats = JSON.parse(savedStats);
        }
    }

    // Save stats to localStorage
    function saveStats() {
        localStorage.setItem('heatWordleStats', JSON.stringify(stats));
    }

    // Get a random word from the word list
    function getRandomWord() {
        const randomIndex = Math.floor(Math.random() * wordList.length);
        return wordList[randomIndex];
    }

    // Create the game board
    function createBoard() {
        gameBoard.innerHTML = '';
        letterTiles = [];

        // Update input maxlength
        guessInput.maxLength = wordLength;
        guessInput.placeholder = `Enter your ${wordLength} letter guess`;

        for (let row = 0; row < MAX_GUESSES; row++) {
            const guessRow = document.createElement('div');
            guessRow.className = 'guess-row';

            for (let col = 0; col < wordLength; col++) {
                const tile = document.createElement('div');
                tile.className = 'letter-tile';
                tile.setAttribute('data-row', row);
                tile.setAttribute('data-col', col);
                guessRow.appendChild(tile);
                letterTiles.push(tile);
            }

            gameBoard.appendChild(guessRow);
        }

        // Update CSS for responsive tile sizing
        updateTileSizing();
    }

    // Update tile sizing based on word length
    function updateTileSizing() {
        // Calculate optimal tile size based on word length
        const baseSize = Math.min(50, Math.max(30, 400 / wordLength));
        const fontSize = Math.min(24, Math.max(16, baseSize / 2));

        // Update all tiles
        const tiles = document.querySelectorAll('.letter-tile');
        tiles.forEach(tile => {
            tile.style.width = `${baseSize}px`;
            tile.style.height = `${baseSize}px`;
            tile.style.fontSize = `${fontSize}px`;
        });
    }

    // Start a new game
    function startNewGame() {
        // Reset game state
        currentGuess = '';
        currentRow = 0;
        gameOver = false;

        // Get a random word
        wordOfTheDay = getRandomWord();
        wordLength = wordOfTheDay.length;

        // Create the board
        createBoard();

        // Enable input
        enableInput();

        // Close any open modal
        closeModal();

        // Focus input field
        guessInput.focus();
        guessInput.value = '';
    }

    // Handle input in the text field
    function handleInput() {
        let input = guessInput.value.toUpperCase().replace(/[^A-Z]/g, '');

        // Limit to word length
        if (input.length > wordLength) {
            input = input.substring(0, wordLength);
        }

        guessInput.value = input;
        currentGuess = input;

        // Update the board display
        updateBoard();
    }

    // Handle keyboard events
    function handleKeyDown(e) {
        if (e.key === 'Enter') {
            submitGuess();
        } else if (e.key === 'Backspace') {
            setTimeout(() => {
                currentGuess = guessInput.value.toUpperCase();
                updateBoard();
            }, 0);
        }
    }

    // Update the visual board with current guess
    function updateBoard() {
        // Clear current row
        for (let i = 0; i < wordLength; i++) {
            const tileIndex = currentRow * wordLength + i;
            const tile = letterTiles[tileIndex];
            tile.textContent = '';
            tile.className = 'letter-tile';
        }

        // Fill with current guess
        for (let i = 0; i < currentGuess.length; i++) {
            const tileIndex = currentRow * wordLength + i;
            const tile = letterTiles[tileIndex];
            tile.textContent = currentGuess[i];
            tile.classList.add('filled');
        }

        // Re-apply sizing
        updateTileSizing();
    }

    // Submit the current guess
    function submitGuess() {
        if (gameOver) return;

        // Validate guess
        if (currentGuess.length !== wordLength) {
            showModal('Invalid Guess', `Guess must be exactly ${wordLength} letters`, 'error');
            return;
        }

        // Check if word exists in word list
        const isValidWord = wordList.some(word => word === currentGuess);
        if (!isValidWord) {
            showModal('Unknown Word', `${currentGuess} is not in our word list`, 'error');
            return;
        }

        // Evaluate the guess
        evaluateGuess();

        // Check for win/lose conditions
        if (currentGuess === wordOfTheDay) {
            gameWon();
        } else if (currentRow === MAX_GUESSES - 1) {
            gameLost();
        } else {
            // Move to next row
            currentRow++;
            currentGuess = '';
            guessInput.value = '';
            guessInput.focus();
        }
    }

    // Evaluate the current guess and color the tiles
    function evaluateGuess() {
        const guess = currentGuess;
        const target = wordOfTheDay;

        // Create arrays to track which letters have been matched
        const targetLetters = target.split('');
        const guessLetters = guess.split('');
        const result = Array(wordLength).fill('absent');

        // First pass: mark correct letters
        for (let i = 0; i < wordLength; i++) {
            if (guessLetters[i] === targetLetters[i]) {
                result[i] = 'correct';
                targetLetters[i] = null;
            }
        }

        // Second pass: mark present letters (correct but wrong position)
        for (let i = 0; i < wordLength; i++) {
            if (result[i] === 'correct') continue;

            const index = targetLetters.indexOf(guessLetters[i]);
            if (index !== -1) {
                result[i] = 'present';
                targetLetters[index] = null;
            }
        }

        // Apply the results to the board with animation delay
        for (let i = 0; i < wordLength; i++) {
            const tileIndex = currentRow * wordLength + i;
            const tile = letterTiles[tileIndex];

            // Add animation delay for each tile
            setTimeout(() => {
                tile.classList.add(result[i]);
            }, i * 100);
        }
    }

    // Handle game win
    function gameWon() {
        gameOver = true;
        setTimeout(() => {
            showModal(
                'Victory!',
                `You found "${wordOfTheDay}" in ${currentRow + 1} guess${currentRow + 1 === 1 ? '' : 'es'}!`,
                'success'
            );
        }, wordLength * 100 + 500);

        disableInput();

        // Update stats
        updateStats(true);
    }

    // Handle game loss
    function gameLost() {
        gameOver = true;
        setTimeout(() => {
            showModal('Game Over', `The word was "${wordOfTheDay}". Better luck next time!`, 'error');
        }, wordLength * 100 + 500);

        disableInput();

        // Update stats
        updateStats(false);
    }

    // Show modal with message
    function showModal(title, message, type) {
        // Set modal content
        modalTitle.textContent = title;
        modalMessage.textContent = message;

        // Clear previous icon classes
        modalIcon.className = 'modal-icon';

        // Add appropriate icon
        if (type === 'success') {
            modalIcon.classList.add('success');
            modalIcon.innerHTML = '<i class="fas fa-trophy"></i>';
        } else if (type === 'error') {
            modalIcon.classList.add('error');
            modalIcon.innerHTML = '<i class="fas fa-times-circle"></i>';
        } else {
            modalIcon.innerHTML = '<i class="fas fa-info-circle"></i>';
        }

        // Show the modal
        gameModal.classList.add('active');

        // Focus the close button
        setTimeout(() => {
            modalClose.focus();
        }, 100);
    }

    // Close modal
    function closeModal() {
        gameModal.classList.remove('active');
        guessInput.focus();
    }

    // Update statistics
    function updateStats(won) {
        stats.gamesPlayed++;

        if (won) {
            stats.gamesWon++;
            stats.currentStreak++;

            if (stats.currentStreak > stats.maxStreak) {
                stats.maxStreak = stats.currentStreak;
            }
        } else {
            stats.currentStreak = 0;
        }

        saveStats();
        updateStatsDisplay();
    }

    // Update the stats display
    function updateStatsDisplay() {
        currentStreakElement.textContent = stats.currentStreak;
        maxStreakElement.textContent = stats.maxStreak;
        gamesPlayedElement.textContent = stats.gamesPlayed;

        const winPercentage = stats.gamesPlayed > 0 ?
            Math.round((stats.gamesWon / stats.gamesPlayed) * 100) :
            0;
        winPercentageElement.textContent = `${winPercentage}%`;
    }

    // Enable input
    function enableInput() {
        guessInput.disabled = false;
        submitButton.disabled = false;
        guessInput.style.opacity = '1';
        guessInput.style.cursor = 'text';
        submitButton.style.opacity = '1';
        submitButton.style.cursor = 'pointer';
    }

    // Disable input
    function disableInput() {
        guessInput.disabled = true;
        submitButton.disabled = true;
        guessInput.style.opacity = '0.6';
        guessInput.style.cursor = 'not-allowed';
        submitButton.style.opacity = '0.6';
        submitButton.style.cursor = 'not-allowed';
    }

    // Initialize the game
    init();
});