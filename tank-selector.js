document.addEventListener('DOMContentLoaded', function() {
    // Configuration settings
    const selectorConfig = {
        // Base speed (higher = faster)
        baseSpeed: 50,

        // Minimum speed when slowing down
        minSpeed: 15,

        // Duration range in milliseconds
        minDuration: 4000, // 4 seconds minimum
        maxDuration: 8000, // 8 seconds maximum

        // Speed reduction factors
        initialSlowdownFactor: 45,
        finalSlowdownFactor: 25,

        // Sound effect volume (0 to 1)
        soundVolume: 0.5,

        // Animation interval (milliseconds)
        animationInterval: 25,

        // Number of duplicates for infinite effect
        duplicateCount: 10,

        // Selection buffer for edge cases
        selectionBuffer: 90 // Half of item width
    };

    // DOM elements
    const tankWheel = document.getElementById('tankWheel');
    const spinButton = document.getElementById('spinButton');
    const resultContainer = document.getElementById('resultContainer');
    const resultCard = document.getElementById('resultCard');
    const resultImage = document.getElementById('resultImage');
    const resultName = document.getElementById('resultName');
    const resultNation = document.getElementById('resultNation');
    const resultType = document.getElementById('resultType');
    const spinCount = document.getElementById('spinCount');
    const spinCounter = document.getElementById('spinCounter');
    const resultPlaceholder = document.getElementById('resultPlaceholder');
    const placeholderTitle = document.getElementById('placeholderTitle');
    const placeholderSubtitle = document.getElementById('placeholderSubtitle');
    const tankImageContainer = document.getElementById('tankImageContainer');
    const tankInfo = document.getElementById('tankInfo');

    // Game state
    let tanks = [];
    let isSpinning = false;
    let spins = 0;
    let currentPosition = 0;
    let spinInterval;
    let selectedTank = null;
    let itemWidth = 180;
    let lastCenterItemId = null;
    let clickSound = null;
    let hasSound = false;
    let originalTankCount = 0;
    let targetStopPosition = 0;
    let isStopping = false;

    // Initialize sound if available
    function initSound() {
        try {
            // Try to create click sound
            const audioContext = new(window.AudioContext || window.webkitAudioContext)();
            clickSound = audioContext;
            hasSound = true;

            // Create a simple beep sound
            function playBeep() {
                if (!hasSound) return;

                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();

                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);

                oscillator.frequency.value = 800;
                oscillator.type = 'sine';

                gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

                oscillator.start();
                oscillator.stop(audioContext.currentTime + 0.1);
            }

            // Assign the play function
            clickSound.play = playBeep;
        } catch (e) {
            console.log("Audio not supported, continuing without sound");
            hasSound = false;
        }
    }

    // Fetch tank data from the single source
    async function fetchTankData() {
        try {
            const response = await fetch('assets/configs/tanks.json', {
                cache: 'no-cache'
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (!data || data.length === 0) {
                throw new Error("Tank data is empty");
            }

            return data;

        } catch (error) {
            console.error('Error loading tank data:', error);
            showErrorState();
            return [];
        }
    }

    // Create selector items
    function createSelectorItems(tankData) {
        tankWheel.innerHTML = '';

        // Store the original tanks array and count
        tanks = tankData;
        originalTankCount = tankData.length;

        // Create duplicates for infinite effect
        const duplicatedTanks = [];
        for (let i = 0; i < selectorConfig.duplicateCount; i++) {
            duplicatedTanks.push(...tankData);
        }

        // Create items
        duplicatedTanks.forEach((tank, index) => {
            const item = document.createElement('div');
            item.className = 'selector-item';
            item.setAttribute('data-tank-id', tank.id);
            item.setAttribute('data-tank-index', index % originalTankCount);
            item.setAttribute('data-item-id', `item-${index}`);
            item.setAttribute('data-original-index', tank.id);

            item.innerHTML = `
                <img src="${tank.image}" alt="${tank.name}"
                     onerror="this.src='assets/images/placeholder/imagefailedtoload.webp'">
                <h4>${tank.name}</h4>
            `;

            tankWheel.appendChild(item);
        });

        // Get actual width of an item
        if (tankWheel.firstChild) {
            itemWidth = tankWheel.firstChild.getBoundingClientRect().width;
        }

        // Show spin button
        spinButton.disabled = false;
        spinButton.innerHTML = '<i class="fas fa-random"></i>Spin the Wheel';
    }

    // Show error state when data fails to load
    function showErrorState() {
        tankWheel.innerHTML = `
            <div class="loading-message">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Failed to load tank data. Please refresh the page.</p>
            </div>
        `;
        spinButton.disabled = true;
        spinButton.innerHTML = '<i class="fas fa-exclamation-circle"></i>Load Failed';

        // Update placeholder to show error
        placeholderTitle.textContent = 'Failed to Load';
        placeholderSubtitle.textContent = 'Could not load tank data. Please refresh.';
    }

    // Update result placeholder state
    function updateResultPlaceholder(title, subtitle, iconClass = 'fas fa-question-circle') {
        const icon = resultPlaceholder.querySelector('i');
        icon.className = iconClass;
        placeholderTitle.textContent = title;
        placeholderSubtitle.textContent = subtitle;

        // Show placeholder, hide tank result
        resultPlaceholder.style.display = 'flex';
        tankImageContainer.style.display = 'none';
        tankInfo.style.display = 'none';

        // Ensure card has placeholder class
        resultCard.classList.add('placeholder');
        resultCard.classList.remove('tank-result');
    }

    // Show tank result
    function showTankResult() {
        // Hide placeholder, show tank result
        resultPlaceholder.style.display = 'none';
        tankImageContainer.style.display = 'flex';
        tankInfo.style.display = 'flex';

        // Switch card classes
        resultCard.classList.remove('placeholder');
        resultCard.classList.add('tank-result');
    }

    // Reset wheel position for infinite effect
    function checkWheelPosition() {
        const totalWidth = tankWheel.scrollWidth;
        const sectionWidth = totalWidth / selectorConfig.duplicateCount;
        const currentScroll = currentPosition % totalWidth;

        if (currentScroll > sectionWidth * 2) {
            const jumpBackAmount = originalTankCount * itemWidth;
            currentPosition -= jumpBackAmount;

            tankWheel.style.transition = 'none';
            tankWheel.style.transform = `translateX(-${currentPosition}px)`;

            // Force reflow
            void tankWheel.offsetWidth;

            // Restore transition
            tankWheel.style.transition = 'transform 0.1s ease-out';
        }
    }

    // Get the tank item currently at the center of the selector
    function getCenterTankItem() {
        const items = document.querySelectorAll('.selector-item');
        const viewportCenter = window.innerWidth / 2;
        const buffer = selectorConfig.selectionBuffer;

        // Find all items that intersect with the center area
        const intersectingItems = [];

        items.forEach(item => {
            const itemRect = item.getBoundingClientRect();
            const itemCenter = itemRect.left + (itemRect.width / 2);
            const distance = Math.abs(itemCenter - viewportCenter);

            // Check if item intersects with the center
            if (distance <= buffer) {
                intersectingItems.push({
                    item: item,
                    distance: distance,
                    center: itemCenter
                });
            }
        });

        // If we found intersecting items, return the closest one
        if (intersectingItems.length > 0) {
            // Sort by distance
            intersectingItems.sort((a, b) => a.distance - b.distance);
            return intersectingItems[0].item;
        }

        // Fallback: find the closest item
        let closestItem = null;
        let smallestDistance = Infinity;

        items.forEach(item => {
            const itemRect = item.getBoundingClientRect();
            const itemCenter = itemRect.left + (itemRect.width / 2);
            const distance = Math.abs(itemCenter - viewportCenter);

            if (distance < smallestDistance) {
                smallestDistance = distance;
                closestItem = item;
            }
        });

        return closestItem;
    }

    // Highlight the center item
    function highlightCenterItem() {
        const items = document.querySelectorAll('.selector-item');
        const viewportCenter = window.innerWidth / 2;

        items.forEach(item => {
            const itemRect = item.getBoundingClientRect();
            const itemCenter = itemRect.left + (itemRect.width / 2);
            const itemId = item.getAttribute('data-item-id');

            // If item is near center, highlight it
            if (Math.abs(itemCenter - viewportCenter) < 60) {
                item.classList.add('highlighted');

                // Play sound if this is a new item crossing the center
                if (itemId !== lastCenterItemId && hasSound) {
                    try {
                        clickSound.play();
                    } catch (e) {
                        console.log("Sound play failed");
                    }
                    lastCenterItemId = itemId;
                }
            } else {
                item.classList.remove('highlighted');
            }
        });
    }

    // Start spinning
    function startSpinning() {
        if (isSpinning || tanks.length === 0) return;

        isSpinning = true;
        isStopping = false;
        spinButton.disabled = true;
        lastCenterItemId = null;

        // Update result placeholder
        updateResultPlaceholder('Choosing a tank...', 'The wheel is spinning...', 'fas fa-spinner fa-spin');

        // Reset highlighted items
        document.querySelectorAll('.selector-item').forEach(item => {
            item.classList.remove('highlighted');
        });

        // Random duration
        const spinDuration = selectorConfig.minDuration +
            Math.random() * (selectorConfig.maxDuration - selectorConfig.minDuration);
        const startTime = Date.now();

        // Initial speed
        let speed = selectorConfig.baseSpeed;

        // Update button text
        spinButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i>Spinning...';

        // Start animation loop
        spinInterval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const progress = elapsed / spinDuration;

            // Gradually slow down
            if (progress < 0.6) {
                speed = selectorConfig.baseSpeed - (progress * selectorConfig.initialSlowdownFactor);
            } else {
                speed = Math.max(selectorConfig.minSpeed,
                    selectorConfig.baseSpeed - (progress * selectorConfig.finalSlowdownFactor));
            }

            currentPosition += speed;
            tankWheel.style.transform = `translateX(-${currentPosition}px)`;

            // Check for infinite effect
            checkWheelPosition();

            // Highlight center item
            highlightCenterItem();

            // Stop when time is up
            if (elapsed >= spinDuration) {
                stopSpinning();
            }
        }, selectorConfig.animationInterval);
    }

    // Stop spinning
    function stopSpinning() {
        if (isStopping) return;
        isStopping = true;

        clearInterval(spinInterval);

        // Get the tank that's currently in the selector
        const centerItem = getCenterTankItem();

        if (centerItem) {
            // Get the tank data
            const tankIndex = parseInt(centerItem.getAttribute('data-tank-index'));
            selectedTank = tanks[tankIndex];

            // Store the current position as target
            targetStopPosition = currentPosition;

            // Calculate exact position to stop so this tank is in the selector
            smoothStopToCenter(centerItem);
        } else {
            // Fallback: pick a random tank
            const randomIndex = Math.floor(Math.random() * originalTankCount);
            selectedTank = tanks[randomIndex];
            finishSpin();
        }
    }

    // Smooth stop animation to ensure the selected tank is in the selector
    function smoothStopToCenter(centerItem) {
        const viewportCenter = window.innerWidth / 2;

        if (centerItem) {
            // Get the exact position of the center item
            const itemRect = centerItem.getBoundingClientRect();
            const itemCenter = itemRect.left + (itemRect.width / 2);

            // Calculate how much we need to adjust to align the item with selector
            const adjustment = viewportCenter - itemCenter;
            targetStopPosition = currentPosition + adjustment;

            // Calculate the distance we need to travel
            const distanceToTravel = Math.abs(targetStopPosition - currentPosition);

            // Use a longer, smoother animation with easing
            const animationDuration = Math.min(800, Math.max(500, distanceToTravel / 5));

            tankWheel.style.transition = `transform ${animationDuration}ms cubic-bezier(0.34, 1.56, 0.64, 1)`;
            tankWheel.style.transform = `translateX(-${targetStopPosition}px)`;

            // Update current position
            currentPosition = targetStopPosition;

            // After animation completes
            setTimeout(() => {
                finishSpin();
            }, animationDuration + 50);
        } else {
            finishSpin();
        }
    }

    // Finalize the spin
    function finishSpin() {
        // Double-check which tank is actually in the selector now
        const finalCenterItem = getCenterTankItem();

        // If we have a different tank than expected, use the actual one
        if (finalCenterItem) {
            const finalTankIndex = parseInt(finalCenterItem.getAttribute('data-tank-index'));
            const finalTank = tanks[finalTankIndex];

            // Only update if it's a different tank
            if (finalTank && finalTank.id !== selectedTank?.id) {
                selectedTank = finalTank;
            }
        }

        // Update spin counter
        spins++;
        spinCount.textContent = spins;

        // Show tank result
        if (selectedTank) {
            showResult(selectedTank);
        }

        // Reset button
        spinButton.disabled = false;
        spinButton.innerHTML = '<i class="fas fa-random"></i>Spin Again';

        // Reset game state
        isSpinning = false;
        isStopping = false;

        // Reset transition for next spin
        tankWheel.style.transition = 'transform 0.1s ease-out';
    }

    // Show result
    function showResult(tank) {
        // Set tank data
        resultImage.src = tank.image;
        resultImage.alt = tank.name;
        resultName.textContent = tank.name;
        resultNation.innerHTML = `<i class="fas fa-flag"></i> ${tank.nation}`;
        resultType.innerHTML = `<i class="fas fa-tag"></i> ${tank.type}`;

        // Show tank result layout
        showTankResult();

        // Add visible class for animation
        resultCard.classList.add('visible');
    }

    // Initialize the game
    async function init() {
        // Initialize sound
        initSound();

        // Set spin counter to visible with 0 initially
        spinCounter.style.display = 'block';
        spinCount.textContent = '0';

        // Set initial placeholder state
        updateResultPlaceholder('Let fate choose a tank for you!', 'Click "Spin the Wheel" to start', 'fas fa-question-circle');

        // Load tank data
        const tankData = await fetchTankData();

        if (tankData.length > 0) {
            createSelectorItems(tankData);

            // Set up spin button
            spinButton.addEventListener('click', startSpinning);

            // Add keyboard support
            document.addEventListener('keydown', (e) => {
                if (e.code === 'Space' && !isSpinning) {
                    e.preventDefault();
                    startSpinning();
                }
            });
        }
    }

    // Start initialization
    init();

    // Handle window resize
    window.addEventListener('resize', () => {
        // Recalculate item width if needed
        if (tankWheel.firstChild) {
            itemWidth = tankWheel.firstChild.getBoundingClientRect().width;
        }
    });
});