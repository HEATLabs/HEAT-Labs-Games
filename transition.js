// Page Transitions Configuration
const TRANSITION_CONFIG = {
    // Minimum window dimensions
    minWidth: 200,
    minHeight: 300,
    logoPath: 'assets/images/logo/logo_transparent_white.png',
    logoSize: '150px',
    logoAlt: 'HEAT Labs Logo',
    backgroundColor: '#121212',
    fadeInDuration: 10,
    fadeOutDuration: 200,
    transitionDuration: 500,
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    let overlay = null;
    let logo = null;
    let isTransitioning = false;
    let isOverlayVisible = false;
    let isInitialLoad = true;

    // Create transition overlay element
    function createOverlay() {
        overlay = document.createElement('div');
        overlay.id = 'page-transition-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background-color: ${TRANSITION_CONFIG.backgroundColor};
            display: none;
            justify-content: center;
            align-items: center;
            z-index: 9999;
            opacity: 0;
            transition: opacity ${TRANSITION_CONFIG.fadeOutDuration}ms ${TRANSITION_CONFIG.easing};
            pointer-events: none;
        `;

        // Create logo element
        logo = document.createElement('img');
        logo.id = 'transition-logo';
        logo.src = TRANSITION_CONFIG.logoPath;
        logo.alt = TRANSITION_CONFIG.logoAlt;
        logo.style.cssText = `
            width: ${TRANSITION_CONFIG.logoSize};
            height: auto;
            max-width: 80vw;
            max-height: 80vh;
            object-fit: contain;
            filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3));
            opacity: 0;
            transform: scale(0.8);
            transition: all ${TRANSITION_CONFIG.transitionDuration}ms ${TRANSITION_CONFIG.easing};
        `;

        // Create logo container
        const logoContainer = document.createElement('div');
        logoContainer.style.cssText = `
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
            padding: 20px;
        `;

        // Handle logo loading error
        logo.onerror = () => {
            logo.style.display = 'none';
            const fallbackText = document.createElement('div');
            fallbackText.textContent = 'HEAT LABS';
            fallbackText.style.cssText = `
                font-size: 32px;
                font-weight: bold;
                color: #ff8300;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
                opacity: 0;
                transform: scale(0.8);
                transition: all ${TRANSITION_CONFIG.transitionDuration}ms ${TRANSITION_CONFIG.easing};
            `;
            logoContainer.appendChild(fallbackText);
            logo = fallbackText;
        };

        // Assemble and add to DOM
        logoContainer.appendChild(logo);
        overlay.appendChild(logoContainer);
        document.body.appendChild(overlay);

        // After first load, add slight delay before hiding
        setTimeout(() => {
            isInitialLoad = false;
        }, 100);
    }

    // Show transition overlay
    function showOverlay() {
        if (isTransitioning) return;
        isTransitioning = true;
        isOverlayVisible = true;

        overlay.style.display = 'flex';
        overlay.style.pointerEvents = 'auto';
        void overlay.offsetHeight; // Force reflow

        overlay.style.transition = `opacity ${TRANSITION_CONFIG.fadeInDuration}ms ${TRANSITION_CONFIG.easing}`;

        requestAnimationFrame(() => {
            overlay.style.opacity = '1';

            // Animate logo
            setTimeout(() => {
                logo.style.opacity = '1';
                logo.style.transform = 'scale(1)';
            }, 50);
        });
    }

    // Hide transition overlay
    function hideOverlay() {
        if (!isTransitioning || !isOverlayVisible) return;

        // Animate logo out first
        logo.style.opacity = '0';
        logo.style.transform = 'scale(0.8)';

        setTimeout(() => {
            overlay.style.transition = `opacity ${TRANSITION_CONFIG.fadeOutDuration}ms ${TRANSITION_CONFIG.easing}`;
            overlay.style.opacity = '0';

            setTimeout(() => {
                overlay.style.display = 'none';
                overlay.style.pointerEvents = 'none';
                isTransitioning = false;
                isOverlayVisible = false;

                // Reset logo for next transition
                logo.style.opacity = '0';
                logo.style.transform = 'scale(0.8)';
            }, TRANSITION_CONFIG.fadeOutDuration);
        }, TRANSITION_CONFIG.fadeOutDuration);
    }

    // Handle link clicks
    function handleLinkClick(e) {
        // Check if this is a navigation link we should handle
        const link = e.currentTarget;
        const href = link.getAttribute('href');

        // Skip if it's an anchor link, external link, or refresh button
        if (href === '#' ||
            href.includes('://') ||
            link.classList.contains('refresh-button') ||
            link.textContent.includes('Refresh')) {
            return;
        }

        e.preventDefault();

        // Show transition overlay
        showOverlay();

        // Navigate after transition
        setTimeout(() => {
            window.location.href = href;
        }, TRANSITION_CONFIG.transitionDuration + 100);
    }

    // Setup event listeners
    function setupEventListeners() {
        // Handle "Play Now" buttons
        const playButtons = document.querySelectorAll('.game-button');
        playButtons.forEach(button => {
            button.addEventListener('click', handleLinkClick);
        });

        // Handle "Go Back" buttons
        const backButtons = document.querySelectorAll('.back-button');
        backButtons.forEach(button => {
            // Only add if not refresh button
            if (!button.textContent.includes('Refresh')) {
                button.addEventListener('click', handleLinkClick);
            }
        });

        // Handle browser back/forward buttons
        window.addEventListener('pageshow', () => {
            if (isInitialLoad) {
                hideOverlay();
            }
        });

        // Show overlay on page unload (browser navigation)
        window.addEventListener('beforeunload', () => {
            if (!isOverlayVisible) {
                showOverlay();
            }
        });
    }

    // Initialize everything
    function init() {
        createOverlay();
        setupEventListeners();

        // Show overlay on initial page load for a moment
        if (isInitialLoad) {
            setTimeout(() => {
                showOverlay();
                setTimeout(() => {
                    hideOverlay();
                }, 800);
            }, 100);
        }
    }

    // Start the initialization
    init();
});