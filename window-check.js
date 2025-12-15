// Configuration
const CONFIG = {
    // Minimum window dimensions
    minWidth: 200,
    minHeight: 300,
    logoPath: 'assets/images/logo/logo_transparent_white.png',
    logoSize: '150px',
    logoAlt: 'HEAT Labs Logo',
    backgroundColor: '#121212',
    fadeInDuration: 300,
    fadeOutDuration: 200,
    checkInterval: 250
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    let overlay = null;
    let logo = null;
    let isVisible = false;
    let timeoutId = null;

    // Create overlay element
    function createOverlay() {
        overlay = document.createElement('div');
        overlay.id = 'small-screen-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background-color: ${CONFIG.backgroundColor};
            display: none;
            justify-content: center;
            align-items: center;
            z-index: 9999;
            opacity: 0;
            transition: opacity ${CONFIG.fadeOutDuration}ms ease-out;
        `;

        // Create logo element
        logo = document.createElement('img');
        logo.id = 'small-screen-logo';
        logo.src = CONFIG.logoPath;
        logo.alt = CONFIG.logoAlt;
        logo.style.cssText = `
            width: ${CONFIG.logoSize};
            height: auto;
            max-width: 80vw;
            max-height: 80vh;
            object-fit: contain;
            filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3));
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

        // Assemble and add to DOM
        logoContainer.appendChild(logo);
        overlay.appendChild(logoContainer);
        document.body.appendChild(overlay);

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
            `;
            logoContainer.insertBefore(fallbackText);
        };
    }

    // Check if screen is too small
    function checkScreenSize() {
        const isTooSmall = window.innerWidth < CONFIG.minWidth || window.innerHeight < CONFIG.minHeight;

        if (isTooSmall && !isVisible) {
            showOverlay();
        } else if (!isTooSmall && isVisible) {
            hideOverlay();
        }
    }

    // Show overlay with fade in
    function showOverlay() {
        isVisible = true;

        overlay.style.display = 'flex';
        void overlay.offsetHeight;

        overlay.style.transition = `opacity ${CONFIG.fadeInDuration}ms ease-in`;

        requestAnimationFrame(() => {
            overlay.style.opacity = '1';
        });

        // Hide main content
        const header = document.querySelector('.page-header');
        const gamesContainer = document.querySelector('.games-container');
        if (header) header.style.display = 'none';
        if (gamesContainer) gamesContainer.style.display = 'none';
    }

    // Hide overlay with fade out
    function hideOverlay() {
        isVisible = false;

        overlay.style.transition = `opacity ${CONFIG.fadeOutDuration}ms ease-out`;
        overlay.style.opacity = '0';

        setTimeout(() => {
            if (!isVisible) {
                overlay.style.display = 'none';

                // Show main content
                const header = document.querySelector('.page-header');
                const gamesContainer = document.querySelector('.games-container');
                if (header) header.style.display = 'flex';
                if (gamesContainer) gamesContainer.style.display = 'flex';
            }
        }, CONFIG.fadeOutDuration);
    }

    // Debounced resize check
    function debounceCheck() {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(checkScreenSize, CONFIG.checkInterval);
    }

    // Initialize everything
    createOverlay();
    checkScreenSize();

    // Set up event listeners
    window.addEventListener('resize', debounceCheck);
    window.addEventListener('load', checkScreenSize);
});