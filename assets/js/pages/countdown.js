document.addEventListener('DOMContentLoaded', function() {
    // Target date: February 05, 2026 at 12:00:00 UTC
    const targetDate = new Date(2026, 2, 5, 12, 0, 0);

    // DOM Elements
    const countdownTimer = document.querySelector('.countdown-timer');
    const speculationNotice = document.getElementById('speculationNotice');
    const closeNoticeBtn = document.getElementById('closeNotice');

    // Initialize mode (simple by default)
    let simpleCountdownMode = true;

    // Show notification popup
    function showNotification() {
        // Only show if not previously dismissed
        if (!localStorage.getItem('noticeDismissed')) {
            setTimeout(() => {
                speculationNotice.classList.add('show');
            }, 1000);
        }
    }

    // Close notification popup
    function closeNotification() {
        speculationNotice.classList.remove('show');
        localStorage.setItem('noticeDismissed', 'true');
    }

    // Event listener for notification close button
    closeNoticeBtn.addEventListener('click', closeNotification);

    // Track typed characters for "alpha3" easter egg
    let typedChars = [];
    document.addEventListener('keydown', function(e) {
        // Only track letters and numbers
        if (e.key.length === 1) {
            typedChars.push(e.key.toLowerCase());
            if (typedChars.length > 6) {
                typedChars.shift();
            }

            // Check if "alpha3" was typed
            if (typedChars.join('').includes('alpha3')) {
                toggleCountdownMode();
                typedChars = []; // Reset after triggering
            }
        }
    });

    // Function to toggle between simple and detailed countdown
    function toggleCountdownMode() {
        simpleCountdownMode = !simpleCountdownMode;

        if (simpleCountdownMode) {
            // Switch to simple mode
            countdownTimer.classList.add('simple-mode');
            countdownTimer.innerHTML = `
                <div class="countdown-item">
                    <div class="countdown-value" id="seconds">00</div>
                    <div class="countdown-label">Seconds</div>
                </div>
            `;
        } else {
            // Switch to detailed mode
            countdownTimer.classList.remove('simple-mode');
            countdownTimer.innerHTML = `
                <div class="countdown-item">
                    <div class="countdown-value" id="months">00</div>
                    <div class="countdown-label">Months</div>
                </div>
                <div class="countdown-item">
                    <div class="countdown-value" id="days">00</div>
                    <div class="countdown-label">Days</div>
                </div>
                <div class="countdown-item">
                    <div class="countdown-value" id="hours">00</div>
                    <div class="countdown-label">Hours</div>
                </div>
                <div class="countdown-item">
                    <div class="countdown-value" id="minutes">00</div>
                    <div class="countdown-label">Minutes</div>
                </div>
                <div class="countdown-item">
                    <div class="countdown-value" id="seconds">00</div>
                    <div class="countdown-label">Seconds</div>
                </div>
            `;
        }

        // Update immediately after toggle
        updateCountdown();
    }

    // Update the countdown every second
    const countdownInterval = setInterval(updateCountdown, 1000);

    // Initial call to display countdown immediately
    updateCountdown();

    // Show notification after a brief delay
    showNotification();

    // Main countdown update function
    function updateCountdown() {
        const now = new Date();
        let difference = targetDate - now;
        let isPast = false;

        // If the countdown is over, switch to counting up
        if (difference <= 0) {
            isPast = true;
            difference = Math.abs(difference);
        }

        if (simpleCountdownMode) {
            // Simple mode - just show total seconds
            const totalSeconds = Math.floor(difference / 1000);
            const secondsElement = document.getElementById('seconds');
            if (secondsElement) {
                secondsElement.textContent = totalSeconds.toString().padStart(2, '0');
            }
        } else {
            // Detailed mode - show all units
            const months = Math.floor(difference / (1000 * 60 * 60 * 24 * 30.44));
            const days = Math.floor((difference % (1000 * 60 * 60 * 24 * 30.44)) / (1000 * 60 * 60 * 24));
            const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((difference % (1000 * 60)) / 1000);

            // Update the display
            const monthsElement = document.getElementById('months');
            const daysElement = document.getElementById('days');
            const hoursElement = document.getElementById('hours');
            const minutesElement = document.getElementById('minutes');
            const secondsElement = document.getElementById('seconds');

            if (monthsElement) monthsElement.textContent = months.toString().padStart(2, '0');
            if (daysElement) daysElement.textContent = days.toString().padStart(2, '0');
            if (hoursElement) hoursElement.textContent = hours.toString().padStart(2, '0');
            if (minutesElement) minutesElement.textContent = minutes.toString().padStart(2, '0');
            if (secondsElement) secondsElement.textContent = seconds.toString().padStart(2, '0');
        }
    }

    // Handle page visibility changes
    document.addEventListener('visibilitychange', function() {
        if (!document.hidden) {
            updateCountdown();
        }
    });
});