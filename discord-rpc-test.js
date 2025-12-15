const CONFIG = {
  // Your Discord Application Client ID
  CLIENT_ID: '1426834421796835440',

  // Update interval for Rich Presence
  UPDATE_INTERVAL: 30000,

  // Default activity data
  DEFAULTS: {
    type: 0,
    details: 'Playing HEAT Labs Games',
    state: 'Browsing games menu',
  }
};

let discordSDK = null;
let isInitialized = false;
let updateInterval = null;
let startTimestamp = Math.floor(Date.now() / 1000);

async function loadDiscordSDK() {
  try {
    // Import SDK from unpkg CDN
    const module = await import('https://unpkg.com/@discord/embedded-app-sdk@1.4.0/output/index.mjs');
    return module.DiscordSDK;
  } catch (error) {
    console.error('[Discord RPC] Failed to load Discord SDK:', error);
    return null;
  }
}

async function initializeSDK() {
  try {
    console.log('[Discord RPC] Initializing Discord SDK...');

    const DiscordSDKClass = await loadDiscordSDK();
    if (!DiscordSDKClass) {
      console.warn('[Discord RPC] SDK not available');
      return false;
    }

    // Create SDK instance
    discordSDK = new DiscordSDKClass(CONFIG.CLIENT_ID);

    // Wait for Discord to be ready
    await discordSDK.ready();
    console.log('[Discord RPC] Discord SDK ready!');

    const { code } = await discordSDK.commands.authorize({
      client_id: CONFIG.CLIENT_ID,
      response_type: 'code',
      state: '',
      prompt: 'none', // Don't show auth dialog
      scope: [
        'identify',
        'rpc.activities.write' // Required for Rich Presence
      ],
    });

    console.log('[Discord RPC] Authorization successful');

    isInitialized = true;
    return true;

  } catch (error) {
    console.error('[Discord RPC] Initialization failed:', error);
    return false;
  }
}

function getPageState() {
  const path = window.location.pathname;
  const filename = path.split('/').pop() || 'index.html';

  const stateMap = {
    'index.html': 'Browsing games menu',
    '': 'Browsing games menu',
    'tierlist.html': 'Creating tank tier lists',
    'roulette.html': 'Spinning tank roulette',
    'countdown.html': 'Watching Alpha 3 countdown',
    'wordle.html': 'Playing HEAT Wordle',
    '404.html': 'Lost in the menu'
  };

  return stateMap[filename] || 'Exploring HEAT Labs';
}

function getMetaTags() {
  const meta = {};

  // Look for discord:* meta tags
  document.querySelectorAll('meta[name^="discord:"]').forEach(tag => {
    const key = tag.getAttribute('name').replace('discord:', '');
    const value = tag.getAttribute('content');
    if (value) {
      meta[key] = value;
    }
  });

  return meta;
}

function createActivityData() {
  const meta = getMetaTags();
  const state = getPageState();

  const activity = {
    type: CONFIG.DEFAULTS.type,
    details: meta.details || CONFIG.DEFAULTS.details,
    state: meta.state || state,
    timestamps: {
      start: startTimestamp
    }
  };

  // Add assets if specified in meta tags
  if (meta.large_image || meta.large_text) {
    activity.assets = {};
    if (meta.large_image) activity.assets.large_image = meta.large_image;
    if (meta.large_text) activity.assets.large_text = meta.large_text;
    if (meta.small_image) activity.assets.small_image = meta.small_image;
    if (meta.small_text) activity.assets.small_text = meta.small_text;
  }

  // Add buttons if specified
  if (meta.buttons) {
    const buttons = parseButtons(meta.buttons);
    if (buttons.length > 0) {
      activity.buttons = buttons;
    }
  }

  return activity;
}

function parseButtons(buttonString) {
  if (!buttonString) return [];

  return buttonString
    .split(',')
    .map(btn => {
      const [label, url] = btn.split('|').map(s => s.trim());
      return label && url ? { label, url } : null;
    })
    .filter(btn => btn !== null)
    .slice(0, 2); // Discord allows max 2 buttons
}

async function updateRichPresence() {
  if (!isInitialized || !discordSDK) {
    console.warn('[Discord RPC] SDK not initialized, skipping update');
    return;
  }

  try {
    const activity = createActivityData();

    console.log('[Discord RPC] Updating activity:', activity);

    await discordSDK.commands.setActivity({
      activity: activity
    });

    console.log('[Discord RPC] Activity updated successfully');

  } catch (error) {
    console.error('[Discord RPC] Failed to update activity:', error);
  }
}

async function clearRichPresence() {
  if (!isInitialized || !discordSDK) return;

  try {
    await discordSDK.commands.setActivity({
      activity: null
    });
    console.log('[Discord RPC] Activity cleared');
  } catch (error) {
    console.warn('[Discord RPC] Failed to clear activity:', error);
  }
}

async function start() {
  console.log('[Discord RPC] Starting Rich Presence system...');

  // Initialize SDK
  const success = await initializeSDK();

  if (!success) {
    console.warn('[Discord RPC] Failed to initialize, presence disabled');
    return;
  }

  // Set initial presence
  await updateRichPresence();

  // Set up periodic updates
  updateInterval = setInterval(updateRichPresence, CONFIG.UPDATE_INTERVAL);

  console.log('[Discord RPC] Rich Presence system started');
}

async function stop() {
  console.log('[Discord RPC] Stopping Rich Presence system...');

  // Clear interval
  if (updateInterval) {
    clearInterval(updateInterval);
    updateInterval = null;
  }

  // Clear activity
  await clearRichPresence();

  // Reset state
  isInitialized = false;
  discordSDK = null;

  console.log('[Discord RPC] Rich Presence system stopped');
}

function handleVisibilityChange() {
  if (document.hidden) {
    stop();
  } else {
    // Restart when page becomes visible again
    setTimeout(start, 500);
  }
}

function handleNavigationChange() {
  if (isInitialized) {
    console.log('[Discord RPC] Page navigation detected, updating presence...');
    // Reset start timestamp for new page
    startTimestamp = Math.floor(Date.now() / 1000);
    // Immediately update with new page's meta tags
    updateRichPresence();
  }
}

function isRunningInDiscord() {
  // Check for Discord-specific URL parameters
  const url = new URLSearchParams(window.location.search);
  const hasFrameId = url.has('frame_id');
  const hasInstanceId = url.has('instance_id');

  // Check if we're in an iframe
  const inIframe = window.self !== window.top;

  return hasFrameId || hasInstanceId || inIframe;
}

/**
 * Initialize when ready
 */
function initialize() {
  // Only initialize if running in Discord
  if (!isRunningInDiscord()) {
    console.log('[Discord RPC] Not running in Discord Activity, skipping initialization');
    return;
  }

  console.log('[Discord RPC] Discord Activity detected, initializing...');
  start();
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  // DOM already loaded, initialize immediately
  setTimeout(initialize, 100);
}

// Clean up on page unload
window.addEventListener('beforeunload', stop);
window.addEventListener('pagehide', stop);

// Handle visibility changes
document.addEventListener('visibilitychange', handleVisibilityChange);

// Handle page freeze/resume (mobile)
window.addEventListener('freeze', stop);
window.addEventListener('resume', () => {
  if (!document.hidden) {
    setTimeout(start, 500);
  }
});

// Listen for page navigation (for single-page navigation)
window.addEventListener('popstate', handleNavigationChange);
window.addEventListener('hashchange', handleNavigationChange);

// Also listen for DOMContentLoaded on each new page load
// This ensures meta tags are read when navigating between pages
window.addEventListener('load', () => {
  if (isInitialized) {
    handleNavigationChange();
  }
});