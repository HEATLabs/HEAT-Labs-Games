// Refresh functionality for Discord activity
document.addEventListener('DOMContentLoaded', () => {
    // Configuration
    const REFRESH_CONFIG = {
        refreshButtonClass: 'back-button',
        refreshIconClass: 'fa-rotate',
        refreshButtonText: 'Refresh',
        refreshDuration: 1000,
        activityFrameId: 'discord-activity-frame'
    };

    // Find the refresh button
    function findRefreshButton() {
        const buttons = document.querySelectorAll(`.${REFRESH_CONFIG.refreshButtonClass}`);

        for (const button of buttons) {
            const icon = button.querySelector('i');
            const text = button.textContent.trim();

            // Check if it has the refresh icon and text
            if (icon && icon.classList.contains(REFRESH_CONFIG.refreshIconClass) &&
                text.includes(REFRESH_CONFIG.refreshButtonText)) {
                return button;
            }
        }

        return null;
    }

    // Handle refresh click
    function handleRefreshClick(e) {
        e.preventDefault();
        const button = e.currentTarget;

        // Disable button during refresh
        button.style.pointerEvents = 'none';
        button.style.opacity = '0.7';

        // Add spinning animation to icon
        const icon = button.querySelector('i');
        if (icon) {
            icon.style.transition = 'transform 0.3s ease';
            icon.style.transform = 'rotate(180deg)';
        }

        // Check if we're in Discord activity
        const isDiscordActivity = window.location !== window.parent.location;

        if (isDiscordActivity && window.parent) {
            try {
                // Try to reload the parent frame
                window.parent.location.reload();
            } catch (error) {
                // Fallback to regular reload
                console.log('Could not access parent frame, performing regular refresh');
                setTimeout(() => {
                    window.location.reload();
                }, REFRESH_CONFIG.refreshDuration);
            }
        } else {
            // Regular page refresh
            setTimeout(() => {
                window.location.reload();
            }, REFRESH_CONFIG.refreshDuration);
        }

        // Re-enable button after refresh duration
        setTimeout(() => {
            if (button) {
                button.style.pointerEvents = '';
                button.style.opacity = '';
                if (icon) {
                    icon.style.transform = '';
                }
            }
        }, REFRESH_CONFIG.refreshDuration + 1000);
    }

    // Setup refresh button listener
    function setupRefreshButton() {
        const refreshButton = findRefreshButton();

        if (refreshButton) {
            // Add specific class for identification
            refreshButton.classList.add('refresh-button');

            // Remove any existing click listeners to prevent duplicates
            const newButton = refreshButton.cloneNode(true);
            refreshButton.parentNode.replaceChild(newButton, refreshButton);

            // Add click listener
            newButton.addEventListener('click', handleRefreshClick);

            // Add hover effect
            newButton.addEventListener('mouseenter', () => {
                const icon = newButton.querySelector('i');
                if (icon) {
                    icon.style.transition = 'transform 0.3s ease';
                }
            });

            return newButton;
        }

        return null;
    }

    // Initialize
    function init() {
        // Check if we're on the index page
        const isIndexPage = window.location.pathname.endsWith('index.html') ||
            window.location.pathname.endsWith('/') ||
            window.location.pathname === '';

        if (isIndexPage) {
            const refreshButton = setupRefreshButton();

            if (refreshButton) {
                console.log('Refresh button initialized for Discord activity');
            } else {
                console.log('No refresh button found on index page');
            }
        }
    }

    // Start initialization
    init();
});