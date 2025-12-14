// Main JS for HEAT Labs
document.addEventListener('DOMContentLoaded', function() {
    // Check maintenance mode first
    fetch('../assets/configs/maintenance.json')
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to fetch maintenance data');
            }
            return response.json();
        })
        .then(data => {
            if (data.maintenance) {
                // Redirect to maintenance page
                window.location.href = 'https://dev.heatlabs.net/maintenance';
                return;
            }

            // Continue with normal execution if not in maintenance mode
            initNormalFunctions();
        })
        .catch(error => {
            console.error('Error checking maintenance status:', error);
            // Continue with normal execution if maintenance check fails
            initNormalFunctions();
        });

    function initNormalFunctions() {
        // Navbar scroll effect
        const navbar = document.querySelector('.navbar');
        if (navbar) {
            window.addEventListener('scroll', function() {
                if (window.scrollY > 10) {
                    navbar.classList.add('scrolled');
                } else {
                    navbar.classList.remove('scrolled');
                }
            });
        }

        // Initialize interactive elements
        initializeInteractiveElements();

        // Fetch website version data from GitHub
        fetch('../assets/configs/changelog.json')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to fetch changelog data');
                }
                return response.json();
            })
            .then(data => {
                // Get website version data
                let websiteVersionData = null;
                if (data.updates && data.updates.length > 0) {
                    websiteVersionData = data.updates[0];
                }

                // Fetch game version data
                fetch('../assets/configs/game_builds.json')
                    .then(response => {
                        if (!response.ok) {
                            throw new Error('Failed to fetch game data');
                        }
                        return response.json();
                    })
                    .then(buildsData => {
                        // Process game version data
                        const gameVersionData = getLatestGameVersion(buildsData);

                        // Add website and game version info to footer
                        addVersionToFooter(websiteVersionData, gameVersionData);

                        // Add beta tag with website version
                        if (websiteVersionData) {
                            addVersionToBetaTag(websiteVersionData, false);
                        }
                    })
                    .catch(error => {
                        console.error('Error fetching game version information:', error);

                        // Use fallback for game data
                        const fallbackGameData = {
                            gameVersion: '0.0.0.0',
                            gameBuildDate: new Date().toISOString()
                        };

                        // Add versions with fallback game data
                        addVersionToFooter(websiteVersionData, fallbackGameData, true);

                        if (websiteVersionData) {
                            addVersionToBetaTag(websiteVersionData, false);
                        }
                    });
            })
            .catch(error => {
                console.error('Error fetching website version information:', error);

                // Fallback for both website and game
                const fallbackWebsiteData = {
                    version: '1.0.0',
                    date: new Date().toISOString().split('T')[0]
                };

                const fallbackGameData = {
                    gameVersion: '0.0.0.0',
                    gameBuildDate: new Date().toISOString()
                };

                addVersionToFooter(fallbackWebsiteData, fallbackGameData, true);
                addVersionToBetaTag(fallbackWebsiteData, true);
            });
    }
});

function getLatestGameVersion(buildsData) {
    try {
        // Extract builds from the data structure
        const builds = buildsData.builds;
        let latestBuild = null;
        let latestDate = null;

        // Iterate through all game builds to find the latest one
        for (const gameName in builds) {
            const gameBuilds = builds[gameName];

            for (const buildHash in gameBuilds) {
                const build = gameBuilds[buildHash];
                const buildDate = new Date(build.build_info.build_date);

                if (!latestDate || buildDate > latestDate) {
                    latestDate = buildDate;
                    latestBuild = build;
                }
            }
        }

        if (latestBuild) {
            return {
                gameVersion: latestBuild.build_info.version_name,
                gameBuildDate: latestBuild.build_info.build_date
            };
        }
    } catch (error) {
        console.error('Error parsing game version data:', error);
    }

    // Return fallback if no valid data found
    return {
        gameVersion: '0.0.0.0',
        gameBuildDate: new Date().toISOString()
    };
}

function initializeInteractiveElements() {
    // Add animation to feature cards and tank cards when they come into view
    const featureCards = document.querySelectorAll('.feature-card');
    const tankCards = document.querySelectorAll('.tank-card');

    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animated');
                    observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.1
        });

        featureCards.forEach(card => {
            observer.observe(card);
        });

        tankCards.forEach(card => {
            observer.observe(card);
        });
    } else {
        // Fallback for browsers that don't support IntersectionObserver
        featureCards.forEach(card => {
            card.classList.add('animated');
        });
        tankCards.forEach(card => {
            card.classList.add('animated');
        });
    }
}

function addVersionToBetaTag(update, isFallback = false) {
    // Find the beta tag element in the header
    const betaTag = document.querySelector('.beta-tag');

    if (!betaTag) {
        console.warn('Could not find beta tag element');
        return;
    }

    // Set the version text and tooltip
    betaTag.textContent = `v${update.version}`;
    betaTag.title = `Version ${update.version} | Last Updated: ${isFallback ? formatDate(new Date().toISOString().split('T')[0]) : formatDate(update.date)}`;

    // Add class for styling if needed
    betaTag.classList.add('version-tag');
}

function addVersionToFooter(websiteUpdate, gameUpdate, isFallback = false) {
    // Find the footer disclaimer div (the one that contains the copyright info)
    const disclaimerDiv = document.querySelector('.footer .text-center.text-sm.text-gray-500');

    if (!disclaimerDiv) {
        console.warn('Could not find footer disclaimer div');
        return;
    }

    // Create a container for the version info
    const versionContainer = document.createElement('div');
    versionContainer.className = 'version-info-container';

    // Format dates
    const websiteFormattedDate = websiteUpdate ? formatDate(websiteUpdate.date) : formatDate(new Date().toISOString().split('T')[0]);
    const currentDate = formatDate(new Date().toISOString().split('T')[0]);

    // Format game build date
    let gameBuildFormatted = 'Unknown';
    if (gameUpdate && gameUpdate.gameBuildDate) {
        try {
            // Parse the build_date string
            const buildDateStr = gameUpdate.gameBuildDate;
            const [datePart, timePart] = buildDateStr.split(' ');
            const [year, month, day] = datePart.split('.');
            const [hours, minutes, seconds] = timePart.split(':');

            const buildDate = new Date(
                parseInt(year),
                parseInt(month) - 1,
                parseInt(day),
                parseInt(hours),
                parseInt(minutes),
                parseInt(seconds)
            );

            gameBuildFormatted = formatDate(buildDate.toISOString());
        } catch (error) {
            console.error('Error parsing game build date:', error);
            gameBuildFormatted = formatDate(new Date().toISOString());
        }
    } else {
        gameBuildFormatted = formatDate(new Date().toISOString());
    }

    // Create game version info element
    const gameVersionInfo = document.createElement('div');
    gameVersionInfo.className = 'version-info-item';
    gameVersionInfo.innerHTML = `
        <span class="version-label">Game Version:</span>
        <span class="version-value">v${gameUpdate ? gameUpdate.gameVersion : '0.0.0.0'}</span>
    `;

    // Create game build element
    const gameBuildInfo = document.createElement('div');
    gameBuildInfo.className = 'version-info-item';
    gameBuildInfo.innerHTML = `
        <span class="version-label">Game Build:</span>
        <span class="version-value">${gameBuildFormatted}</span>
    `;

    // Create website version info element
    const websiteVersionInfo = document.createElement('div');
    websiteVersionInfo.className = 'version-info-item';
    websiteVersionInfo.innerHTML = `
        <span class="version-label">Website Version:</span>
        <span class="version-value">v${websiteUpdate ? websiteUpdate.version : '1.0.0'}</span>
    `;

    // Create website build element
    const websiteBuildInfo = document.createElement('div');
    websiteBuildInfo.className = 'version-info-item';
    websiteBuildInfo.innerHTML = `
        <span class="version-label">Website Build:</span>
        <span class="version-value">${isFallback ? currentDate : websiteFormattedDate}</span>
    `;

    // Create changelog link
    const changelogLink = document.createElement('a');
    changelogLink.className = 'version-info-item version-info-link';
    changelogLink.href = '//changelog.heatlabs.net';
    changelogLink.innerHTML = `
        <span>View Changelog</span>
        <i class="fas fa-external-link-alt"></i>
    `;
    changelogLink.title = 'View full changelog';
    changelogLink.target = '_blank';
    changelogLink.rel = 'noopener noreferrer';

    // Append all elements to container
    versionContainer.appendChild(gameVersionInfo);
    versionContainer.appendChild(gameBuildInfo);
    versionContainer.appendChild(websiteVersionInfo);
    versionContainer.appendChild(websiteBuildInfo);
    versionContainer.appendChild(changelogLink);

    // Insert after disclaimer
    disclaimerDiv.parentNode.insertBefore(versionContainer, disclaimerDiv.nextSibling);
}

function formatDate(dateString) {
    const options = {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    };

    try {
        return new Date(dateString).toLocaleDateString(undefined, options);
    } catch (error) {
        console.error('Error formatting date:', error, dateString);
        return 'Invalid Date';
    }
}