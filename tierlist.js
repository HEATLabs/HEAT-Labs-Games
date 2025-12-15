document.addEventListener('DOMContentLoaded', function() {
    // Paths to JSON files
    const JSON_PATHS = {
        tanks: 'assets/configs/tanks.json',
        maps: 'assets/configs/maps.json',
        agents: 'assets/configs/agents.json'
    };

    // DOM Elements
    const selectionScreen = document.getElementById('selectionScreen');
    const tierListCreator = document.getElementById('tierListCreator');
    const tierListTitle = document.getElementById('tierListTitle');
    const unrankedItems = document.getElementById('unrankedItems');
    const backButton = document.getElementById('backButton');
    const resetButton = document.getElementById('resetTierList');
    const saveButton = document.getElementById('saveTierList');
    const shareButton = document.getElementById('shareTierList');
    const loadInput = document.getElementById('loadTierListInput');
    const loadButton = document.getElementById('loadTierListButton');

    // Game state
    let currentCategory = '';
    let items = [];
    let tierState = {};

    // Drag and drop state
    let dragItem = null;
    let dragStartZone = null;
    let dragOffset = {
        x: 0,
        y: 0
    };
    let dragClone = null;
    let isDragging = false;

    // Initialize the application
    function init() {
        // Set up event listeners
        document.querySelectorAll('.select-button').forEach(button => {
            button.addEventListener('click', handleCategorySelect);
        });

        backButton.addEventListener('click', showSelectionScreen);
        resetButton.addEventListener('click', resetTierList);
        saveButton.addEventListener('click', saveTierList);
        shareButton.addEventListener('click', shareTierList);
        loadButton.addEventListener('click', loadTierList);

        // Load saved tier list if any
        loadSavedTierList();
    }

    // Handle category selection
    async function handleCategorySelect(event) {
        const tierOption = event.target.closest('.tier-option');
        const category = tierOption.getAttribute('data-type');

        // Load data for the selected category
        await loadCategoryData(category);

        if (items.length === 0) {
            showNotification('Failed to load data for ' + category, 'error');
            return;
        }

        currentCategory = category;
        tierListTitle.textContent = category.charAt(0).toUpperCase() + category.slice(1) + ' Tier List';

        // Initialize tier state
        initializeTierState();

        // Show tier list creator
        showTierListCreator();

        // Render items
        renderItems();

        // Initialize drag and drop AFTER items are rendered
        setTimeout(() => {
            initDragAndDrop();
        }, 100);
    }

    // Load data for a category
    async function loadCategoryData(category) {
        try {
            const response = await fetch(JSON_PATHS[category]);

            if (!response.ok) {
                throw new Error(`Failed to load ${category} data`);
            }

            const data = await response.json();

            // Extract items based on category structure
            if (category === 'tanks') {
                items = data.filter(item => item.state === 'displayed')
                    .map(item => ({
                        id: item.id,
                        name: item.name,
                        image: item.image,
                        type: item.type
                    }));
            } else if (category === 'maps') {
                items = data.maps.filter(item => item.state === 'displayed')
                    .map(item => ({
                        id: item.id,
                        name: item.name,
                        image: item.image,
                        status: item.status
                    }));
            } else if (category === 'agents') {
                items = data.agents.filter(item => item.state === 'displayed')
                    .map(item => ({
                        id: item.id,
                        name: item.name,
                        image: item.image,
                        status: item.status
                    }));
            }

            console.log(`Loaded ${items.length} ${category} items`);
        } catch (error) {
            console.error(`Error loading ${category} data:`, error);
            items = [];
        }
    }

    // Initialize tier state
    function initializeTierState() {
        // Reset tier state
        tierState = {
            S: [],
            A: [],
            B: [],
            C: [],
            D: [],
            F: []
        };

        // Clear all tier item containers
        document.querySelectorAll('.tier-items').forEach(container => {
            container.innerHTML = '';
        });
    }

    // Render all items
    function renderItems() {
        // Clear unranked items
        unrankedItems.innerHTML = '';

        // Add all items to unranked by default
        items.forEach(item => {
            createTierItem(item, 'unranked');
        });

        // Update tier rows with saved items
        ['S', 'A', 'B', 'C', 'D', 'F'].forEach(tier => {
            tierState[tier].forEach(itemId => {
                const item = items.find(i => i.id === itemId);
                if (item) {
                    createTierItem(item, tier);
                }
            });
        });
    }

    // Create a tier item
    function createTierItem(item, tier) {
        const itemElement = document.createElement('div');
        itemElement.className = 'tier-item';
        itemElement.setAttribute('data-item-id', item.id);

        itemElement.innerHTML = `
            <img src="${item.image}" alt="${item.name}" onerror="this.src='https://cdn5.heatlabs.net/placeholder/imagefailedtoload.webp'">
            <div class="item-name">${item.name}</div>
        `;

        // Add to appropriate container
        if (tier === 'unranked') {
            unrankedItems.appendChild(itemElement);
        } else {
            const tierContainer = document.querySelector(`.tier-items[data-tier="${tier}"]`);
            if (tierContainer) {
                tierContainer.appendChild(itemElement);
            }
        }

        return itemElement;
    }

    // Initialize drag and drop
    function initDragAndDrop() {
        // Add event listeners to all tier items
        document.querySelectorAll('.tier-item').forEach(item => {
            setupDragEvents(item);
        });

        // Add event listeners to all drop zones
        document.querySelectorAll('.tier-items, #unrankedItems').forEach(zone => {
            setupDropZoneEvents(zone);
        });
    }

    // Setup drag events for an item
    function setupDragEvents(item) {
        // Mouse events
        item.addEventListener('mousedown', startDrag);
        item.addEventListener('touchstart', startDragTouch);

        // Prevent default drag behavior
        item.addEventListener('dragstart', (e) => {
            e.preventDefault();
            return false;
        });
    }

    // Setup drop zone events
    function setupDropZoneEvents(zone) {
        zone.addEventListener('mousemove', handleDragOverZone);
        zone.addEventListener('mouseenter', handleDragEnterZone);
        zone.addEventListener('mouseleave', handleDragLeaveZone);
        zone.addEventListener('mouseup', handleDropZone);

        // Touch events for mobile
        zone.addEventListener('touchmove', handleDragOverZone);
        zone.addEventListener('touchend', handleDropZone);
    }

    // Start dragging with mouse
    function startDrag(e) {
        if (e.button !== 0) return; // Only left mouse button

        dragItem = e.target.closest('.tier-item');
        if (!dragItem) return;

        dragStartZone = dragItem.parentNode;

        // Calculate offset
        const rect = dragItem.getBoundingClientRect();
        dragOffset.x = e.clientX - rect.left;
        dragOffset.y = e.clientY - rect.top;

        // Create a clone for dragging
        createDragClone();

        // Add dragging class
        dragItem.classList.add('dragging');

        // Start listening to mouse move and up events
        document.addEventListener('mousemove', handleDragMove);
        document.addEventListener('mouseup', stopDrag);

        e.preventDefault();
        isDragging = true;
    }

    // Start dragging with touch
    function startDragTouch(e) {
        const touch = e.touches[0];
        if (!touch) return;

        dragItem = e.target.closest('.tier-item');
        if (!dragItem) return;

        dragStartZone = dragItem.parentNode;

        // Calculate offset
        const rect = dragItem.getBoundingClientRect();
        dragOffset.x = touch.clientX - rect.left;
        dragOffset.y = touch.clientY - rect.top;

        // Create a clone for dragging
        createDragClone();

        // Add dragging class
        dragItem.classList.add('dragging');

        // Start listening to touch move and end events
        document.addEventListener('touchmove', handleDragMoveTouch);
        document.addEventListener('touchend', stopDrag);

        e.preventDefault();
        isDragging = true;
    }

    // Create a drag clone
    function createDragClone() {
        dragClone = dragItem.cloneNode(true);
        dragClone.style.position = 'fixed';
        dragClone.style.zIndex = '1000';
        dragClone.style.pointerEvents = 'none';
        dragClone.style.opacity = '0.8';
        dragClone.style.transform = 'scale(1.1)';
        dragClone.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.5)';
        document.body.appendChild(dragClone);
    }

    // Handle mouse move during drag
    function handleDragMove(e) {
        if (!isDragging || !dragClone) return;

        // Update clone position
        dragClone.style.left = (e.clientX - dragOffset.x) + 'px';
        dragClone.style.top = (e.clientY - dragOffset.y) + 'px';

        // Find drop zone under cursor
        const dropZone = findDropZone(e.clientX, e.clientY);
        highlightDropZone(dropZone);
    }

    // Handle touch move during drag
    function handleDragMoveTouch(e) {
        if (!isDragging || !dragClone || !e.touches[0]) return;

        const touch = e.touches[0];

        // Update clone position
        dragClone.style.left = (touch.clientX - dragOffset.x) + 'px';
        dragClone.style.top = (touch.clientY - dragOffset.y) + 'px';

        // Find drop zone under touch
        const dropZone = findDropZone(touch.clientX, touch.clientY);
        highlightDropZone(dropZone);

        e.preventDefault();
    }

    // Find drop zone at coordinates
    function findDropZone(x, y) {
        const elements = document.elementsFromPoint(x, y);

        for (const element of elements) {
            // Check if element is a drop zone
            if (element.classList.contains('tier-items') || element.id === 'unrankedItems') {
                return element;
            }
            // Or if it's inside a drop zone
            const dropZone = element.closest('.tier-items, #unrankedItems');
            if (dropZone) {
                return dropZone;
            }
        }

        return null;
    }

    // Highlight drop zone
    function highlightDropZone(dropZone) {
        // Remove highlight from all zones
        document.querySelectorAll('.tier-items, #unrankedItems').forEach(zone => {
            zone.classList.remove('drag-over');
        });

        // Add highlight to current zone
        if (dropZone) {
            dropZone.classList.add('drag-over');
        }
    }

    // Handle drag over zone
    function handleDragOverZone(e) {
        if (isDragging) {
            e.preventDefault();
        }
    }

    // Handle drag enter zone
    function handleDragEnterZone(e) {
        if (isDragging) {
            e.target.closest('.tier-items, #unrankedItems')?.classList.add('drag-over');
        }
    }

    // Handle drag leave zone
    function handleDragLeaveZone(e) {
        if (isDragging) {
            e.target.closest('.tier-items, #unrankedItems')?.classList.remove('drag-over');
        }
    }

    // Handle drop on zone
    function handleDropZone(e) {
        if (!isDragging || !dragItem) return;

        const dropZone = findDropZone(
            e.type.includes('touch') ? e.changedTouches[0].clientX : e.clientX,
            e.type.includes('touch') ? e.changedTouches[0].clientY : e.clientY
        );

        if (dropZone && dropZone !== dragStartZone) {
            // Get item ID
            const itemId = parseInt(dragItem.getAttribute('data-item-id'));

            // Remove item from previous tier
            removeItemFromTier(itemId);

            // Determine target tier
            const targetTier = dropZone.getAttribute('data-tier') || 'unranked';

            if (targetTier === 'unranked') {
                // Item is unranked
                dropZone.appendChild(dragItem);
            } else {
                // Item is ranked in a tier
                tierState[targetTier].push(itemId);
                dropZone.appendChild(dragItem);
            }

            // Save state
            saveTierListState();
        }

        // Clean up
        stopDrag();
    }

    // Stop dragging
    function stopDrag() {
        if (isDragging) {
            // Remove clone
            if (dragClone) {
                dragClone.remove();
                dragClone = null;
            }

            // Remove dragging class
            if (dragItem) {
                dragItem.classList.remove('dragging');
                dragItem.style.opacity = '1';
                dragItem = null;
            }

            // Remove highlight from all zones
            document.querySelectorAll('.tier-items, #unrankedItems').forEach(zone => {
                zone.classList.remove('drag-over');
            });

            // Remove event listeners
            document.removeEventListener('mousemove', handleDragMove);
            document.removeEventListener('mouseup', stopDrag);
            document.removeEventListener('touchmove', handleDragMoveTouch);
            document.removeEventListener('touchend', stopDrag);

            dragStartZone = null;
            isDragging = false;
        }
    }

    // Remove item from tier
    function removeItemFromTier(itemId) {
        // Remove from all tiers
        ['S', 'A', 'B', 'C', 'D', 'F'].forEach(tier => {
            const index = tierState[tier].indexOf(itemId);
            if (index !== -1) {
                tierState[tier].splice(index, 1);
            }
        });
    }

    // Show tier list creator
    function showTierListCreator() {
        selectionScreen.style.display = 'none';
        tierListCreator.style.display = 'block';
    }

    // Show selection screen
    function showSelectionScreen() {
        selectionScreen.style.display = 'block';
        tierListCreator.style.display = 'none';
        currentCategory = '';
        items = [];
        tierState = {};
    }

    // Reset tier list
    function resetTierList() {
        if (confirm('Are you sure you want to reset the tier list? All current rankings will be lost.')) {
            initializeTierState();
            renderItems();
            initDragAndDrop();
            saveTierListState();
            showNotification('Tier list reset successfully');
        }
    }

    // Save tier list
    function saveTierList() {
        saveTierListState();
        showNotification('Tier list saved successfully');
    }

    // Save tier list state to localStorage
    function saveTierListState() {
        if (!currentCategory) return;

        const state = {
            category: currentCategory,
            tierState: tierState,
            timestamp: new Date().toISOString()
        };

        localStorage.setItem('heatTierList_' + currentCategory, JSON.stringify(state));
    }

    // Load saved tier list
    function loadSavedTierList() {
        // Check if there's a saved tier list in the URL
        const urlParams = new URLSearchParams(window.location.search);
        const shareData = urlParams.get('data');

        if (shareData) {
            try {
                const decodedData = decodeURIComponent(shareData);
                const sharedState = JSON.parse(decodedData);
                loadSharedTierList(sharedState);
                loadInput.value = window.location.href;
            } catch (error) {
                console.error('Error loading shared tier list:', error);
                showNotification('Invalid shared tier list URL', 'error');
            }
        }
    }

    // Load tier list from URL
    async function loadTierList() {
        const url = loadInput.value.trim();

        if (!url) {
            showNotification('Please enter a tier list URL', 'error');
            return;
        }

        try {
            // Extract data from URL
            const urlObj = new URL(url);
            const shareData = urlObj.searchParams.get('data');

            if (!shareData) {
                throw new Error('No tier list data found in URL');
            }

            const decodedData = decodeURIComponent(shareData);
            const sharedState = JSON.parse(decodedData);

            loadSharedTierList(sharedState);
            showNotification('Tier list loaded successfully');
        } catch (error) {
            console.error('Error loading tier list:', error);
            showNotification('Invalid tier list URL', 'error');
        }
    }

    // Load shared tier list
    async function loadSharedTierList(sharedState) {
        // Load the category data first
        await loadCategoryData(sharedState.category);

        if (items.length === 0) {
            showNotification('Failed to load category data', 'error');
            return;
        }

        currentCategory = sharedState.category;
        tierState = sharedState.tierState;

        tierListTitle.textContent = currentCategory.charAt(0).toUpperCase() + currentCategory.slice(1) + ' Tier List';

        // Show tier list creator
        showTierListCreator();

        // Render items
        renderItems();

        // Initialize drag and drop
        setTimeout(() => {
            initDragAndDrop();
        }, 100);
    }

    // Share tier list
    function shareTierList() {
        if (!currentCategory) {
            showNotification('Please create a tier list first', 'error');
            return;
        }

        const state = {
            category: currentCategory,
            tierState: tierState,
            timestamp: new Date().toISOString()
        };

        // Create shareable URL
        const shareData = encodeURIComponent(JSON.stringify(state));
        const shareUrl = window.location.origin + window.location.pathname + '?data=' + shareData;

        // Copy to clipboard
        navigator.clipboard.writeText(shareUrl).then(() => {
            showNotification('Share URL copied to clipboard!');
        }).catch(err => {
            console.error('Failed to copy:', err);
            showNotification('Failed to copy URL', 'error');
        });
    }

    // Show notification
    function showNotification(message, type = 'success') {
        // Remove existing notification
        const existingNotification = document.querySelector('.notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        // Create new notification
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;

        document.body.appendChild(notification);

        // Remove notification after 3 seconds
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 500);
        }, 3000);
    }

    // Initialize the application
    init();
});