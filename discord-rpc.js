// Configuration
const DISCORD_CONFIG = {
    META_PREFIX: 'discord:',
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

// Discord Bridge Class
class DiscordBridge {
    constructor() {
        this.isReady = false;
        this.presenceMethods = [];
        this.detectMethods();
    }

    detectMethods() {
        // Method 1: Discord Native Bridge
        if (window.DiscordNative?.gameBridge) {
            console.log('Detected Discord Native Bridge');
            this.presenceMethods.push('native');
        }

        // Method 2: Discord SDK
        if (window.discordApp?.commands) {
            console.log('Detected Discord SDK');
            this.presenceMethods.push('sdk');
        }

        // Method 3: Window parent
        if (window.parent !== window) {
            console.log('Detected iframe environment');
            this.presenceMethods.push('iframe');
        }

        // Method 4: Discord Activity detection
        if (this.checkDiscordEnvironment()) {
            console.log('Detected Discord Activity environment');
            this.presenceMethods.push('activity');
        }

        this.isReady = this.presenceMethods.length > 0;
    }

    checkDiscordEnvironment() {
        // Check URL patterns
        if (window.location.href.includes('discord.gg/') ||
            window.location.href.includes('discord.com/') ||
            window.location.href.includes('discordapp.com/') ||
            window.location.href.includes('discord-activities')) {
            return true;
        }

        // Check parent frame
        try {
            if (window.parent !== window) {
                const parentUrl = window.parent.location.href;
                return parentUrl.includes('discord') || parentUrl.includes('discordapp');
            }
        } catch (e) {
            // Can't access parent, likely in Discord iframe
            return true;
        }

        return false;
    }

    async updatePresence(presenceData) {
        if (!this.isReady) return false;

        let success = false;

        // Try native bridge first
        if (this.presenceMethods.includes('native')) {
            try {
                if (window.DiscordNative.gameBridge.updateActivity) {
                    window.DiscordNative.gameBridge.updateActivity(presenceData);
                    console.log('Presence updated via Native Bridge');
                    success = true;
                }
            } catch (error) {
                console.warn('Native Bridge update failed:', error);
            }
        }

        // Try SDK if native failed
        if (!success && this.presenceMethods.includes('sdk')) {
            try {
                await window.discordApp.commands.setActivity({
                    activity: presenceData
                });
                console.log('Presence updated via SDK');
                success = true;
            } catch (error) {
                console.warn('SDK update failed:', error);
            }
        }

        // Try iframe postMessage as fallback
        if (!success && this.presenceMethods.includes('iframe')) {
            try {
                window.parent.postMessage({
                    type: 'DISCORD_ACTIVITY_UPDATE',
                    data: presenceData
                }, '*');
                console.log('Presence sent via postMessage');
                success = true;
            } catch (error) {
                console.warn('postMessage failed:', error);
            }
        }

        return success;
    }

    async clearPresence() {
        if (!this.isReady) return;

        // Try native bridge
        if (this.presenceMethods.includes('native') && window.DiscordNative.gameBridge.clearActivity) {
            try {
                window.DiscordNative.gameBridge.clearActivity();
                console.log('Presence cleared via Native Bridge');
                return;
            } catch (error) {
                console.warn('Native Bridge clear failed:', error);
            }
        }

        // Try SDK
        if (this.presenceMethods.includes('sdk') && window.discordApp.commands.clearActivity) {
            try {
                await window.discordApp.commands.clearActivity();
                console.log('Presence cleared via SDK');
                return;
            } catch (error) {
                console.warn('SDK clear failed:', error);
            }
        }

        // Try iframe postMessage
        if (this.presenceMethods.includes('iframe')) {
            try {
                window.parent.postMessage({
                    type: 'DISCORD_ACTIVITY_CLEAR'
                }, '*');
                console.log('Presence clear sent via postMessage');
            } catch (error) {
                console.warn('postMessage clear failed:', error);
            }
        }
    }
}

// Create global instance
const discordBridge = new DiscordBridge();

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

    await discordBridge.updatePresence(presenceData);
}

async function initialize() {
    // Check if we are in Discord
    isDiscordActivity = discordBridge.checkDiscordEnvironment();

    if (!isDiscordActivity) {
        console.log('Not running in Discord Activity - presence disabled');
        return;
    }

    console.log('Running in Discord Activity - initializing presence');
    console.log('Available presence methods:', discordBridge.presenceMethods);

    // Parse and log meta tags
    const metaTags = getDiscordMetaTags();
    console.log('Found Discord meta tags:', metaTags);

    // Set initial presence
    await updatePresence();

    // Set up periodic updates
    presenceInterval = setInterval(updatePresence, DISCORD_CONFIG.UPDATE_INTERVAL);

    console.log('Discord presence system ready');
}

function cleanup() {
    if (presenceInterval) {
        clearInterval(presenceInterval);
        presenceInterval = null;
    }

    // Clear activity
    discordBridge.clearPresence();
    console.log('Discord activity cleaned up');
}

function handleVisibilityChange() {
    if (document.hidden) {
        // Page is hidden, cleanup
        cleanup();
    } else if (isDiscordActivity) {
        // Page visible again, re-initialize
        setTimeout(initialize, 500);
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

// Listen for messages from Discord
window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'DISCORD_SDK_READY') {
        console.log('Received Discord SDK ready message');
        discordBridge.detectMethods();
        if (isDiscordActivity) {
            updatePresence();
        }
    }
});