// Configuration
const DISCORD_CONFIG = {
    META_PREFIX: 'discord:',
    SDK_URL: 'https://unpkg.com/@discord/embedded-app-sdk@1.x.x',
    APPLICATION_ID: '1426834421796835440',
    UPDATE_INTERVAL: 30000,

    // Default fallbacks
    DEFAULTS: {
        activity: 'HEAT Labs Games',
        details: 'Playing HEAT Labs Games',
        large_image: 'heat_labs_logo',
        large_text: 'HEAT Labs Game Hub'
    }
};

// State
let isDiscordActivity = false;
let presenceInterval = null;

function getDiscordMetaTags() {
    const metaTags = {};
    const tags = document.querySelectorAll('meta[name^="discord:"]');

    tags.forEach(tag => {
        const name = tag.getAttribute('name').replace(DISCORD_CONFIG.META_PREFIX, '');
        const content = tag.getAttribute('content');

        if (content) {
            metaTags[name] = content;
        }
    });

    return metaTags;
}

function parseButtons(buttonsString) {
    if (!buttonsString) return [];

    return buttonsString.split(',').map(btn => {
        const [label, url] = btn.split('|');
        return label && url ? {
            label: label.trim(),
            url: url.trim()
        } : null;
    }).filter(btn => btn !== null).slice(0, 2);
}

function checkIfDiscordActivity() {
    // Method 1
    if (window.location.href.includes('discord.gg/') ||
        window.location.href.includes('discord-activities')) {
        return true;
    }

    // Method 2
    try {
        if (window.self !== window.top) {
            // We're in an iframe, check parent
            const parentUrl = window.parent.location.href;
            return parentUrl.includes('discord') || parentUrl.includes('discordapp');
        }
    } catch (e) {
        // Can't access parent, this means we ARE in Discord
        return true;
    }

    // Method 3
    if (window.DiscordNative || window.DiscordSDK) {
        return true;
    }

    return false;
}

function createPresenceData() {
    const meta = getDiscordMetaTags();

    // Use meta tags or defaults
    const presence = {
        name: meta.activity || DISCORD_CONFIG.DEFAULTS.activity,
        type: 0, // "Playing" activity
        details: meta.details || DISCORD_CONFIG.DEFAULTS.details,
        state: getPageState(),
        timestamps: {
            start: Math.floor(Date.now() / 1000)
        },
        assets: {
            large_image: meta.large_image || DISCORD_CONFIG.DEFAULTS.large_image,
            large_text: meta.large_text || DISCORD_CONFIG.DEFAULTS.large_text
        }
    };

    // Add small image
    if (meta.small_image) {
        presence.assets.small_image = meta.small_image;
        presence.assets.small_text = meta.small_text || 'HEAT Labs';
    }

    // Add buttons
    if (meta.buttons) {
        presence.buttons = parseButtons(meta.buttons);
    }

    return presence;
}

function getPageState() {
    const path = window.location.pathname;

    const states = {
        '/': 'Browsing games menu',
        '/index.html': 'Browsing games menu',
        '/tierlist.html': 'Creating tank tier lists',
        '/roulette.html': 'Spinning tank roulette',
        '/alpha-3-playtest.html': 'Tracking Alpha 3 playtest',
        '/wordle.html': 'Playing HEAT Wordle',
        '/404.html': 'Page not found'
    };

    return states[path] || 'Playing HEAT Labs';
}

async function updatePresence() {
    if (!isDiscordActivity) return;

    const presenceData = createPresenceData();

    console.log('Updating Discord presence:', presenceData);

    // Method 1
    if (window.DiscordSDK && window.discordApp) {
        try {
            await window.discordApp.commands.setActivity({
                activity: presenceData
            });
            console.log('Presence updated via Discord SDK');
            return;
        } catch (error) {
            console.warn('Discord SDK update failed:', error);
        }
    }

    // Method 2
    if (window.DiscordNative && window.DiscordNative.gameBridge) {
        try {
            window.DiscordNative.gameBridge.updateActivity(presenceData);
            console.log('Presence updated via Native Bridge');
            return;
        } catch (error) {
            console.warn('Native Bridge update failed:', error);
        }
    }

    // Method 3
    if (window.parent && window.parent !== window) {
        try {
            window.parent.postMessage({
                type: 'DISCORD_ACTIVITY_UPDATE',
                data: presenceData
            }, '*');
            console.log('Presence sent via postMessage');
        } catch (error) {
            console.warn('postMessage failed:', error);
        }
    }
}

function loadDiscordSDK() {
    return new Promise((resolve, reject) => {
        // Check if already loaded
        if (window.DiscordSDK) {
            resolve(window.DiscordSDK);
            return;
        }

        // Create and load script
        const script = document.createElement('script');
        script.src = DISCORD_CONFIG.SDK_URL;
        script.async = true;

        script.onload = () => {
            if (window.DiscordSDK) {
                resolve(window.DiscordSDK);
            } else {
                reject(new Error('Discord SDK not available after load'));
            }
        };

        script.onerror = reject;
        document.head.appendChild(script);
    });
}

async function initializeDiscordApp() {
    try {
        const SDK = await loadDiscordSDK();
        window.discordApp = new SDK.Application(DISCORD_CONFIG.APPLICATION_ID);

        await window.discordApp.ready();
        console.log('Discord SDK initialized successfully');
        return true;
    } catch (error) {
        console.log('Discord SDK initialization failed:', error);
        return false;
    }
}

async function initialize() {
    // Check if we are in Discord
    isDiscordActivity = checkIfDiscordActivity();

    if (!isDiscordActivity) {
        console.log('Not running in Discord Activity - presence disabled');
        return;
    }

    console.log('Running in Discord Activity - initializing presence');

    // Parse and log meta tags
    const metaTags = getDiscordMetaTags();
    console.log('Found Discord meta tags:', metaTags);

    // Try to initialize Discord SDK
    const sdkReady = await initializeDiscordApp();

    // Set initial presence
    await updatePresence();

    // Set up periodic updates
    if (sdkReady) {
        presenceInterval = setInterval(updatePresence, DISCORD_CONFIG.UPDATE_INTERVAL);
    }

    console.log('Discord presence system ready');
}

function cleanup() {
    if (presenceInterval) {
        clearInterval(presenceInterval);
        presenceInterval = null;
    }

    // Clear activity if SDK is available
    if (window.discordApp && window.discordApp.commands) {
        try {
            window.discordApp.commands.clearActivity();
            console.log('Discord activity cleared');
        } catch (error) {
            console.log('Error clearing activity:', error);
        }
    }
}

function handleVisibilityChange() {
    if (document.hidden) {
        // Page is hidden, cleanup
        cleanup();
    } else if (isDiscordActivity) {
        // Page visible again, re-initialize
        initialize();
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    // DOM already loaded
    setTimeout(initialize, 100);
}

// Clean up on page unload
window.addEventListener('beforeunload', cleanup);
window.addEventListener('pagehide', cleanup);

// Handle tab visibility changes
document.addEventListener('visibilitychange', handleVisibilityChange);

// Also clean up when page might be suspended
window.addEventListener('freeze', cleanup);
window.addEventListener('resume', function() {
    if (isDiscordActivity && document.visibilityState === 'visible') {
        setTimeout(initialize, 500);
    }
});