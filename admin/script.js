document.addEventListener('DOMContentLoaded', () => {
    const linksGrid = document.getElementById('linksGrid');
    const currentTimeElement = document.getElementById('currentTime');
    const appDrawerTaskbarItem = document.getElementById('appDrawerTaskbarItem');
    const appDrawerMenu = document.getElementById('appDrawerMenu');

    // --- Time Update Function ---
    const updateTime = () => {
        const now = new Date();
        const options = {
        weekday: 'long', // e.g., "Sun"
        year: 'numeric',  // e.g., "2025"
        month: 'short',   // e.g., "Jul"
        day: 'numeric',   // e.g., "13"
        hour: '2-digit',  // e.g., "08"
        minute: '2-digit',// e.g., "22"
        second: '2-digit',// e.g., "14"
        hour12: true      // e.g., "PM"
    };
        let dateTimeString = now.toLocaleString('en-IN', options);
        dateTimeString = dateTimeString.replace(/\sat\s/, ' '); // Remove "at"
        currentTimeElement.textContent = dateTimeString;
    };
    setInterval(updateTime, 1000);
    updateTime();

    // --- Main Desktop Links (Existing Function) ---
    const fetchMainLinks = async () => {
        try {
            const response = await fetch('links.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const links = await response.json();
            linksGrid.innerHTML = ''; // Clear loading placeholder

            if (links.length === 0) {
                linksGrid.innerHTML = '<p class="loading-desktop-icon">No main applications available.</p>';
                return;
            }

            links.forEach(link => {
                const iconDiv = document.createElement('a');
                iconDiv.href = link.url;
                iconDiv.target = '_blank';
                iconDiv.rel = 'noopener noreferrer';
                iconDiv.classList.add('desktop-icon');

                let iconHtml = '<i class="fas fa-link icon-img"></i>';
                if (link.icon) {
                    if (link.icon.startsWith('fa-')) {
                        iconHtml = `<i class="fas ${link.icon} icon-img"></i>`;
                    } else if (link.icon.startsWith('far-')) {
                        iconHtml = `<i class="far ${link.icon} icon-img"></i>`;
                    } else if (link.icon.startsWith('fab-')) {
                        iconHtml = `<i class="fab ${link.icon} icon-img"></i>`;
                    } else {
                        iconHtml = `<i class="fas fa-question-circle icon-img"></i>`;
                    }
                }
                iconDiv.innerHTML = `${iconHtml}<span>${link.title}</span>`;
                linksGrid.appendChild(iconDiv);
            });
        } catch (error) {
            console.error('Error fetching main links:', error);
            linksGrid.innerHTML = '<p class="loading-desktop-icon error-message">Failed to load main applications.</p>';
        }
    };

    // --- App Drawer Links Function ---
    const fetchDrawerLinks = async () => {
        try {
            const response = await fetch('drawer-links.json'); // New JSON file for drawer links
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const drawerLinks = await response.json();
            appDrawerMenu.innerHTML = ''; // Clear loading placeholder

            if (drawerLinks.length === 0) {
                appDrawerMenu.innerHTML = '<div class="loading-drawer-item">No other apps available.</div>';
                return;
            }

            drawerLinks.forEach(link => {
                const drawerLink = document.createElement('a');
                drawerLink.href = link.url;
                drawerLink.target = '_blank';
                drawerLink.rel = 'noopener noreferrer';

                let iconHtml = '<i class="fas fa-external-link-alt drawer-icon"></i>'; // Default drawer icon
                if (link.icon) {
                    if (link.icon.startsWith('fa-')) {
                        iconHtml = `<i class="fas ${link.icon} drawer-icon"></i>`;
                    } else if (link.icon.startsWith('far-')) {
                        iconHtml = `<i class="far ${link.icon} drawer-icon"></i>`;
                    } else if (link.icon.startsWith('fab-')) {
                        iconHtml = `<i class="fab ${link.icon} drawer-icon"></i>`;
                    } else {
                        iconHtml = `<i class="fas fa-question-circle drawer-icon"></i>`;
                    }
                }
                drawerLink.innerHTML = `${iconHtml}<span>${link.title}</span>`;
                appDrawerMenu.appendChild(drawerLink);
            });
        } catch (error) {
            console.error('Error fetching drawer links:', error);
            appDrawerMenu.innerHTML = '<div class="loading-drawer-item error-message">Failed to load apps.</div>';
        }
    };

    // --- App Drawer Toggle Logic ---
    appDrawerTaskbarItem.addEventListener('click', (event) => {
        // Prevent the click from propagating if it hits the icon/span directly
        // event.preventDefault(); // Uncomment if you don't want the taskbar item itself to be clickable
        appDrawerMenu.classList.toggle('visible'); // Toggle visibility
        fetchDrawerLinks(); // Load links every time it's opened (or once on initial click)
    });

    // Close app drawer if clicked outside
    document.addEventListener('click', (event) => {
        if (!appDrawerTaskbarItem.contains(event.target) && appDrawerMenu.classList.contains('visible')) {
            appDrawerMenu.classList.remove('visible');
        }
    });


    // Initial fetches
    fetchMainLinks();
    // fetchDrawerLinks(); // You can call this here if you want it to load on page load,
                        // otherwise it loads when the drawer is first clicked.
});