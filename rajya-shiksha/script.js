// IMPORTANT: Replace this with the Web App URL obtained from your Google Apps Script deployment
const APP_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby4faoU7M-lSIWCvT2O69lLObhkbR3Rism0KJOzPhey-0dzxHduHGWjuX6cMO3qDMNZ/exec'; // <<< IMPORTANT: Update this line

const dashboardContent = document.getElementById('dashboardContent');
const loadingIndicator = document.getElementById('loadingIndicator');
const tabOnsiteAudit = document.getElementById('tabOnsiteAudit');
const tabConsolidation = document.getElementById('tabConsolidation');
const tabInsights = document.getElementById('tabInsights');
const messageBox = document.getElementById('messageBox');

let allDashboardData = null; // Stores all fetched data
let currentActiveTab = 'onsiteAudit'; // 'onsiteAudit', 'consolidation', or 'insights'
let currentInsightsDataSource = 'onsiteAudit'; // Default for Insights tab
let currentFilters = { // Global filter state for main tabs
    location: null, // Stores selected location, eg., "Jabalpur"
    completionStatus: null // Stores selected status: 'completed', 'not_covered', 'attention_required', or null
};

const predefinedLocations = ["Jabalpur", "Katni", "Narsinghpur", "Mandla", "Dindori"];

// Define column headers for display in tables, based on the active tab
const getDisplayColumnHeaders = (tabType) => {
    if (tabType === 'onsiteAudit') {
        return ["Unit Name", "Block", "Code", "Onsite Audit Date", "On site Audit Person"];
    } else if (tabType === 'consolidation') {
        return ["Unit Name", "Block", "Code", "Consolidation date", "Consolidation Status"];
    }
    return []; // Should not happen
};

// Map display headers to the actual data keys from the Google Sheet
const getDataKeyForDisplayHeader = (tabType, displayHeader) => {
    if (tabType === 'onsiteAudit') {
        switch (displayHeader) {
            case "Onsite Audit Date": return "Onsite Audit Date";
            case "On site Audit Person": return "On site Audit Person";
            default: return displayHeader; // For Unit Name, Block, Code etc.
        }
    } else if (tabType === 'consolidation') {
        switch (displayHeader) {
            case "Consolidation date": return "Consolidation date";
            case "Consolidation Status": return "Consolidation Status";
            default: return displayHeader; // For Unit Name, Block, Code etc.
        }
    }
    return displayHeader; // Fallback
};

/**
 * Displays a temporary message in a dedicated box.
 * @param {string} message - The message to display.
 * @param {boolean} isError - True if it's an error message, false for success/info.
 */
function showMessage(message, isError = false) {
    messageBox.textContent = message;
    messageBox.classList.remove('error');
    if (isError) {
        messageBox.classList.add('error');
    }
    messageBox.classList.add('show');
    setTimeout(() => {
        messageBox.classList.remove('show');
    }, 3000); // Hide after 3 seconds
}

/**
 * Fetches data from the Google Apps Script web app.
 */
async function fetchData() {
    loadingIndicator.style.display = 'flex'; // Show loader
    try {
        const response = await fetch(APP_SCRIPT_URL);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        allDashboardData = await response.json();
        renderDashboard(currentActiveTab); // Render initial tab
    } catch (error) {
        console.error("Failed to fetch data:", error);
        showMessage(`Failed to load data: ${error.message}. Please check your App Script URL and deployment.`, true);
        dashboardContent.innerHTML = `<p class="text-red-600 text-center py-8">Error loading dashboard data. Please check the console for details.</p>`;
    } finally {
        loadingIndicator.style.display = 'none'; // Hide loader
    }
}

/**
 * Formats an ISO date string into "DD MonthYYYY".
 * This function is used for both 'Onsite Audit Date' and 'Consolidation date'.
 * @param {string} isoDateString - The date string in ISO format.
 * @returns {string} Formatted date string or original string if invalid.
 */
function formatAuditDate(isoDateString) {
    if (!isoDateString || String(isoDateString).toLowerCase() === 'not covered' || String(isoDateString).toLowerCase() === 'null') {
        return isoDateString; // Return as is for "Not covered" or empty/null
    }
    try {
        const date = new Date(isoDateString);
        if (isNaN(date.getTime())) {
            return isoDateString;
        }
        const options = { day: 'numeric', month: 'long', year: 'numeric' };
        return date.toLocaleDateString('en-GB', options);
    } catch (e) {
        console.warn("Could not parse date:", isoDateString, e); // Keep this specific warn for date parsing issues
        return isoDateString;
    }
}

/**
 * Renders the dashboard content for the given tab type, applying current filters.
 * @param {string} tabType - 'onsiteAudit', 'consolidation', or 'insights'.
 */
function renderDashboard(tabType) {
    if (!allDashboardData) {
        return; // No data to render yet
    }

    dashboardContent.innerHTML = ''; // Clear previous content

    if (tabType === 'insights') {
        renderInsightsTab();
        return;
    }

    // Display active filters and clear button if any filter is set
    const activeFilters = Object.values(currentFilters).filter(f => f !== null).length > 0;
    if (activeFilters) {
        const filterStatusDiv = document.createElement('div');
        filterStatusDiv.className = 'bg-yellow-100 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg mb-4 flex items-center justify-between';
        filterStatusDiv.innerHTML = `
            <span>
                <strong>Active Filters:</strong>
                ${currentFilters.location ? `Location: <span class="font-semibold">${currentFilters.location}</span>` : ''}
                ${currentFilters.completionStatus ? `Completion: <span class="font-semibold">${currentFilters.completionStatus.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>` : ''}
            </span>
            <button id="clearFiltersBtn" class="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-1 px-3 rounded-md transition-colors duration-200">
                Clear Filters
            </button>
        `;
        dashboardContent.appendChild(filterStatusDiv);

        document.getElementById('clearFiltersBtn').addEventListener('click', clearAllFilters);
    }

    const dataToRender = allDashboardData[tabType];

    predefinedLocations.forEach(location => {
        if (currentFilters.location && currentFilters.location !== location) {
            return;
        }

        const locationData = dataToRender ? dataToRender[location] : null;

        const locationDiv = document.createElement('div');
        locationDiv.className = 'bg-white rounded-lg shadow-sm mb-4 overflow-hidden location-accordion';

        const locationHeader = document.createElement('div');
        locationHeader.className = 'accordion-header flex items-center justify-between p-4 bg-blue-600 text-white font-semibold text-lg rounded-t-lg';
        locationHeader.innerHTML = `<span>${location}</span><span class="arrow-icon text-2xl transform transition-transform duration-300">+</span>`;
        locationDiv.appendChild(locationHeader);

        const locationContent = document.createElement('div');
        locationContent.className = 'accordion-content border-t border-blue-100 bg-white';
        locationDiv.appendChild(locationContent);

        if (!locationData || Object.keys(locationData).length === 0) {
            locationContent.innerHTML = `<p class="text-gray-500 text-center py-8">Activity not started yet for ${location}.</p>`;
        } else {
            for (const subMenu in locationData) {
                const subMenuDiv = document.createElement('div');
                subMenuDiv.className = 'bg-white rounded-lg shadow-sm mb-2 mx-4 mt-2 overflow-hidden';

                const subMenuHeader = document.createElement('div');
                subMenuHeader.className = 'accordion-header flex items-center justify-between p-3 bg-blue-100 text-blue-800 font-medium text-md border-b border-gray-200';
                subMenuHeader.innerHTML = `<span>${subMenu}</span><span class="arrow-icon transform transition-transform duration-300">+</span>`;
                subMenuDiv.appendChild(subMenuHeader);

                const subMenuContent = document.createElement('div');
                subMenuContent.className = 'accordion-content';
                subMenuDiv.appendChild(subMenuContent);

                for (const category in locationData[subMenu]) {
                    const categoryDiv = document.createElement('div');
                    categoryDiv.className = 'bg-white rounded-lg shadow-sm mb-2 mx-4 mt-2 overflow-hidden';

                    const categoryHeader = document.createElement('div');
                    categoryHeader.className = 'accordion-header flex items-center justify-between p-2 bg-blue-200 text-blue-900 font-normal text-sm border-b border-gray-100';
                    categoryHeader.innerHTML = `<span>${category}</span><span class="arrow-icon transform transition-transform duration-300">+</span>`;
                    categoryDiv.appendChild(categoryHeader);

                    const categoryContent = document.createElement('div');
                    categoryContent.className = 'accordion-content p-4';
                    categoryDiv.appendChild(categoryContent);

                    let tableData = locationData[subMenu][category];
                    
                    if (tableData && tableData.length > 0) {
                        if (currentFilters.completionStatus) {
                            tableData = tableData.filter(row => {
                                let statusValue;
                                if (tabType === 'onsiteAudit') {
                                    statusValue = String(row['Onsite Audit Date'] || '').toLowerCase();
                                } else { // consolidation
                                    statusValue = String(row['Consolidation Status'] || '').toLowerCase();
                                }

                                if (currentFilters.completionStatus === 'completed') {
                                    return statusValue && statusValue !== 'not covered' && statusValue !== 'null';
                                } else if (currentFilters.completionStatus === 'not_covered') {
                                    return statusValue === 'not covered';
                                } else if (currentFilters.completionStatus === 'attention_required') {
                                    return !statusValue || statusValue === 'null';
                                }
                                return true;
                            });
                        }

                        if (tableData.length > 0) {
                            categoryContent.appendChild(createTable(tableData, tabType)); // Pass tabType here
                        } else {
                            categoryContent.innerHTML = `<p class="text-gray-500 text-sm text-center py-4">No data for this category with current filters.</p>`;
                        }
                    } else {
                        categoryContent.innerHTML = `<p class="text-gray-500 text-sm text-center py-4">No data for this category.</p>`;
                    }

                    subMenuContent.appendChild(categoryDiv);
                    categoryHeader.addEventListener('click', () => toggleAccordion(categoryHeader, categoryContent));
                }
                locationContent.appendChild(subMenuDiv);
                subMenuHeader.addEventListener('click', () => toggleAccordion(subMenuHeader, subMenuContent));
            }
        }
        dashboardContent.appendChild(locationDiv);
        locationHeader.addEventListener('click', () => toggleAccordion(locationHeader, locationContent, true));
    });
}

/**
 * Toggles the accordion content visibility.
 * @param {HTMLElement} header - The header element of the accordion.
 * @param {HTMLElement} content - The content element of the accordion.
 * @param {boolean} isLocationAccordion - True if this is a top-level location accordion.
 */
function toggleAccordion(header, content, isLocationAccordion = false) {
    const isOpen = content.classList.contains('open');

    if (isLocationAccordion && !isOpen) {
        document.querySelectorAll('.location-accordion > .accordion-content.open').forEach(openContent => {
            if (openContent !== content) {
                openContent.classList.remove('open');
                const openHeader = openContent.previousElementSibling;
                if (openHeader) {
                    const openArrowIcon = openHeader.querySelector('.arrow-icon');
                    if (openArrowIcon) {
                        openArrowIcon.textContent = '+';
                    }
                }
            }
        });
    }

    content.classList.toggle('open');
    const arrowIcon = header.querySelector('.arrow-icon');
    if (arrowIcon) {
        arrowIcon.textContent = isOpen ? '+' : '-';
    }
}

/**
 * Creates an HTML table from an array of objects.
 * Includes sortable headers and row highlighting.
 * @param {Array<Object>} data - The array of data objects for the table.
 * @param {string} tabType - The type of tab ('onsiteAudit' or 'consolidation') to determine headers.
 * @returns {HTMLElement} The created table element.
 */
function createTable(data, tabType) {
    const tableContainer = document.createElement('div');
    tableContainer.className = 'table-responsive';

    const table = document.createElement('table');
    table.className = 'min-w-full bg-white rounded-lg overflow-hidden';

    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');

    const displayHeaders = getDisplayColumnHeaders(tabType);

    displayHeaders.forEach(headerText => {
        const th = document.createElement('th');
        th.textContent = headerText;
        th.className = 'px-4 py-2 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider';
        th.setAttribute('data-column', getDataKeyForDisplayHeader(tabType, headerText)); // Use actual data key for sorting
        th.addEventListener('click', (e) => sortTable(e, table, data, tabType)); // Pass tabType
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    tbody.id = 'tableBody-' + Math.random().toString(36).substring(2, 9);
    table.appendChild(tbody);

    populateTableBody(tbody, data, tabType); // Pass tabType
    tableContainer.appendChild(table);
    return tableContainer;
}

/**
 * Populates the tbody with rows from the given data, applying row highlighting.
 * @param {HTMLElement} tbody - The tbody element to populate.
 * @param {Array<Object>} data - The array of data objects.
 * @param {string} tabType - The type of tab ('onsiteAudit' or 'consolidation') for conditional logic.
 */
function populateTableBody(tbody, data, tabType) {
    tbody.innerHTML = '';
    const displayHeaders = getDisplayColumnHeaders(tabType);

    data.forEach(rowData => {
        const tr = document.createElement('tr');
        tr.className = 'transition-colors duration-150';

        // Determine highlighting based on tabType
        let statusValue;
        if (tabType === 'onsiteAudit') {
            statusValue = String(rowData['Onsite Audit Date'] || '').toLowerCase();
        } else { // consolidation
            statusValue = String(rowData['Consolidation Status'] || '').toLowerCase();
        }

        if (statusValue === 'not covered') {
            tr.classList.add('bg-gray-200'); // Grey for "Not covered"
        } else if (!statusValue || statusValue === 'null') {
            tr.classList.add('bg-red-100'); // Red for no entry
        } else {
            tr.classList.add('bg-green-100'); // Green for valid entry/status
        }

        displayHeaders.forEach(header => {
            const td = document.createElement('td');
            const dataKey = getDataKeyForDisplayHeader(tabType, header);
            let displayValue = rowData[dataKey] || '';

            // Format date if it's a date column
            if (dataKey === 'Onsite Audit Date' || dataKey === 'Consolidation date') {
                displayValue = formatAuditDate(displayValue);
            }

            td.textContent = displayValue;
            td.className = 'px-4 py-2 whitespace-nowrap text-sm text-gray-700';
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });
}

/**
 * Sorts a table based on the clicked column.
 * @param {Event} event - The click event object.
 * @param {HTMLElement} table - The table element to sort.
 * @param {Array<Object>} originalData - The original unsorted data for the table.
 * @param {string} tabType - The type of tab ('onsiteAudit' or 'consolidation') to determine column to sort.
 */
function sortTable(event, table, originalData, tabType) {
    const clickedTh = event.currentTarget;
    const column = clickedTh.getAttribute('data-column'); // This is already the internal data key
    const tbody = table.querySelector('tbody');

    let direction = clickedTh.getAttribute('data-direction') || 'asc';
    direction = (direction === 'asc') ? 'desc' : 'asc';

    table.querySelectorAll('th').forEach(th => {
        if (th !== clickedTh) {
            th.classList.remove('sorted-asc', 'sorted-desc');
            th.removeAttribute('data-direction');
        }
    });

    clickedTh.classList.remove('sorted-asc', 'sorted-desc');
    clickedTh.classList.add(direction === 'asc' ? 'sorted-asc' : 'sorted-desc');
    clickedTh.setAttribute('data-direction', direction);

    const sortedData = [...originalData].sort((a, b) => {
        const valA = a[column];
        const valB = b[column];

        // Determine which is the primary date column for sorting based on tabType
        const dateColumnKey = (tabType === 'onsiteAudit') ? 'Onsite Audit Date' : 'Consolidation date';
        const statusColumnKey = (tabType === 'consolidation') ? 'Consolidation Status' : null;

        if (column === dateColumnKey) {
            const dateA = (valA && String(valA).toLowerCase() !== 'not covered' && String(valA).toLowerCase() !== 'null') ? new Date(valA) : null;
            const dateB = (valB && String(valB).toLowerCase() !== 'not covered' && String(valB).toLowerCase() !== 'null') ? new Date(valB) : null;

            if (String(valA).toLowerCase() === 'not covered' && String(valB).toLowerCase() !== 'not covered') return direction === 'asc' ? 1 : -1;
            if (String(valB).toLowerCase() === 'not covered' && String(valA).toLowerCase() !== 'not covered') return direction === 'asc' ? -1 : 1;

            if ((!valA || String(valA).toLowerCase() === 'null') && (valB && String(valB).toLowerCase() !== 'null')) return direction === 'asc' ? 1 : -1;
            if ((!valB || String(valB).toLowerCase() === 'null') && (valA && String(valA).toLowerCase() !== 'null')) return direction === 'asc' ? -1 : 1;

            if (dateA && dateB) {
                return direction === 'asc' ? dateA.getTime() - dateB.getTime() : dateB.getTime() - dateA.getTime();
            }
            return 0;
        } else if (column === statusColumnKey) { // Special sorting for Consolidation Status
            const statusOrder = ['not covered', '', 'null', 'completed', 'in progress', 'pending'].reverse(); // Define your desired order, reversed for common sorting
            const indexA = statusOrder.indexOf(String(valA || '').toLowerCase());
            const indexB = statusOrder.indexOf(String(valB || '').toLowerCase());

            if (indexA === -1 && indexB !== -1) return direction === 'asc' ? 1 : -1;
            if (indexB === -1 && indexA !== -1) return direction === 'asc' ? -1 : 1;
            if (indexA === indexB) return 0;

            return direction === 'asc' ? indexA - indexB : indexB - indexA;

        } else if (typeof valA === 'string' && typeof valB === 'string') {
            return direction === 'asc' ?
                String(valA).localeCompare(String(valB), undefined, { sensitivity: 'base' }) :
                String(valB).localeCompare(String(valA), undefined, { sensitivity: 'base' });
        } else {
            const numA = Number(valA);
            const numB = Number(valB);

            if (!isNaN(numA) && !isNaN(numB)) {
                if (numA < numB) return direction === 'asc' ? -1 : 1;
                if (numA > numB) return direction === 'asc' ? 1 : -1;
                return 0;
            } else {
                if (valA < valB) return direction === 'asc' ? -1 : 1;
                if (valA > valB) return direction === 'asc' ? 1 : -1;
                return 0;
            }
        }
    });
    populateTableBody(tbody, sortedData, tabType); // Pass tabType
}

/**
 * Renders the Insights tab content.
 */
function renderInsightsTab() {
    dashboardContent.innerHTML = `
        <div class="p-4">
            <h2 class="text-2xl font-semibold text-gray-800 mb-4">Dashboard Insights</h2>

            <!-- Data Source Selector for Insights -->
            <div class="data-source-selector flex justify-center space-x-4 mb-8 p-2 bg-gray-100 rounded-lg">
                <button id="insightsOnsiteBtn" class="selector-button px-6 py-3 rounded-lg font-medium transition-colors duration-200 ${currentInsightsDataSource === 'onsiteAudit' ? 'active' : 'bg-white text-gray-700 hover:bg-gray-200'}">
                    Onsite Audit Data
                </button>
                <button id="insightsConsolidationBtn" class="selector-button px-6 py-3 rounded-lg font-medium transition-colors duration-200 ${currentInsightsDataSource === 'consolidation' ? 'active' : 'bg-white text-gray-700 hover:bg-gray-200'}">
                    Consolidation Data
                </button>
            </div>

            <div id="insightsContent">
                <!-- Content will be updated by updateInsightsDisplay -->
            </div>
        </div>
    `;

    document.getElementById('insightsOnsiteBtn').addEventListener('click', () => {
        currentInsightsDataSource = 'onsiteAudit';
        document.getElementById('insightsConsolidationBtn').classList.remove('active');
        document.getElementById('insightsOnsiteBtn').classList.add('active');
        updateInsightsDisplay(currentInsightsDataSource);
    });
    document.getElementById('insightsConsolidationBtn').addEventListener('click', () => {
        currentInsightsDataSource = 'consolidation';
        document.getElementById('insightsOnsiteBtn').classList.remove('active');
        document.getElementById('insightsConsolidationBtn').classList.add('active');
        updateInsightsDisplay(currentInsightsDataSource);
    });

    updateInsightsDisplay(currentInsightsDataSource);
}

/**
 * Updates the display of insights based on the selected data source.
 * @param {string} dataSourceType - 'onsiteAudit' or 'consolidation'.
 */
function updateInsightsDisplay(dataSourceType) {
    const insightsContentDiv = document.getElementById('insightsContent');
    insightsContentDiv.innerHTML = '';

    const dataToAnalyze = allDashboardData[dataSourceType];

    if (!dataToAnalyze || Object.keys(dataToAnalyze).length === 0) {
        insightsContentDiv.innerHTML = `<p class="text-gray-600 text-center py-8">No data available for ${dataSourceType === 'onsiteAudit' ? 'Onsite Audit' : 'Consolidation'} insights.</p>`;
        return;
    }

    let flattenedData = [];
    for (const location in dataToAnalyze) {
        for (const subMenu in dataToAnalyze[location]) {
            for (const category in dataToAnalyze[location][subMenu]) {
                flattenedData = flattenedData.concat(dataToAnalyze[location][subMenu][category]);
            }
        }
    }

    // Changed grid-cols-1 to grid-cols-2 for better mobile layout of cards
    insightsContentDiv.innerHTML += `
        <div id="summaryCards" class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"></div>
    `;
    generateSummaryCards(flattenedData, dataSourceType); // Pass dataSourceType

    insightsContentDiv.innerHTML += `
        <div class="bg-white p-6 rounded-lg shadow-md mb-8">
            <h3 class="text-xl font-semibold text-gray-700 mb-4">Audits by Location</h3>
            <div class="bar-chart-container">
                <svg id="locationBarChart" class="bar-chart" width="100%" height="300"></svg>
            </div>
        </div>
    `;
    generateLocationBarChart(flattenedData);

    insightsContentDiv.innerHTML += `
        <div class="bg-white p-6 rounded-lg shadow-md mb-8">
            <h3 class="text-xl font-semibold text-gray-700 mb-4">Audits by Sub-Menu</h3>
            <ul id="subMenuBreakdown" class="list-disc list-inside text-gray-700"></ul>
        </div>
    `;
    generateBreakdownList(flattenedData, 'SubMenu', 'subMenuBreakdown');

    insightsContentDiv.innerHTML += `
        <div class="bg-white p-6 rounded-lg shadow-md">
            <h3 class="text-xl font-semibold text-gray-700 mb-4">Audits by Category</h3>
            <ul id="categoryBreakdown" class="list-disc list-inside text-gray-700"></ul>
        </div>
    `;
    generateBreakdownList(flattenedData, 'Category', 'categoryBreakdown');
}


/**
 * Generates and displays summary cards for audit statuses.
 * @param {Array<Object>} data - Flattened data for analysis.
 * @param {string} dataSourceType - 'onsiteAudit' or 'consolidation' to determine which date/status field to check.
 */
function generateSummaryCards(data, dataSourceType) {
    const summaryCardsDiv = document.getElementById('summaryCards');
    if (!summaryCardsDiv) return;

    let totalAudits = data.length;
    let completedAudits = 0;
    let notCoveredAudits = 0;
    let attentionRequiredAudits = 0;

    data.forEach(row => {
        let statusValue;
        if (dataSourceType === 'onsiteAudit') {
            statusValue = String(row['Onsite Audit Date'] || '').toLowerCase();
        } else { // consolidation
            statusValue = String(row['Consolidation Status'] || '').toLowerCase();
        }

        if (statusValue && statusValue !== 'not covered' && statusValue !== 'null') {
            completedAudits++;
        } else if (statusValue === 'not covered') {
            notCoveredAudits++;
        } else { // Empty or 'null' audit date/status
            attentionRequiredAudits++;
        }
    });

    const cardsData = [
        { title: "Total Entries", value: totalAudits, bgColor: "bg-blue-500", icon: "📊", filter: null },
        { title: "Completed Audits", value: completedAudits, bgColor: "bg-green-500", icon: "✅", filter: 'completed' },
        { title: "Not Covered", value: notCoveredAudits, bgColor: "bg-gray-500", icon: "🚫", filter: 'not_covered' },
        { title: "Attention Required", value: attentionRequiredAudits, bgColor: "bg-red-500", icon: "⚠️", filter: 'attention_required' }
    ];

    summaryCardsDiv.innerHTML = cardsData.map(card => `
        <div class="bg-white ${card.bgColor} text-white p-6 rounded-lg shadow-md flex items-center space-x-4 cursor-pointer hover:opacity-80 transition-opacity duration-200" data-filter-status="${card.filter}">
            <span class="text-4xl">${card.icon}</span>
            <div>
                <div class="text-sm font-medium opacity-90">${card.title}</div>
                <div class="text-3xl font-bold">${card.value}</div>
            </div>
        </div>
    `).join('');

    summaryCardsDiv.querySelectorAll('.cursor-pointer').forEach(cardElement => {
        cardElement.addEventListener('click', (event) => {
            const filterStatus = event.currentTarget.dataset.filterStatus;
            applyFilter(null, filterStatus);
        });
    });
}

/**
 * Generates an SVG bar chart for audits per location.
 * @param {Array<Object>} data - Flattened data for analysis.
 */
function generateLocationBarChart(data) {
    const svg = document.getElementById('locationBarChart');
    if (!svg) return;

    svg.innerHTML = '';

    const containerWidth = svg.parentElement.clientWidth; // Get the actual container's visible width
    const svgHeight = 300; // Fixed height for the chart area
    const margin = { top: 20, right: 20, bottom: 80, left: 60 }; // Increased bottom margin

    const locationCounts = {};
    predefinedLocations.forEach(loc => locationCounts[loc] = 0);

    data.forEach(row => {
        const location = row.Location;
        if (predefinedLocations.includes(location)) {
            locationCounts[location]++;
        }
    });

    const chartData = Object.keys(locationCounts).map(loc => ({
        location: loc,
        count: locationCounts[loc]
    }));

    const maxCount = Math.max(...chartData.map(d => d.count)) || 1;

    const MIN_BAR_SPACING = 100; // Minimum horizontal space each bar + its label needs
    const MAX_CHART_VIEWPORT_WIDTH = 900; // Max desirable visible width for the chart content (excluding margins)

    // Calculate the total content width needed if each bar takes MIN_BAR_SPACING
    const idealContentWidth = chartData.length * MIN_BAR_SPACING;

    // The actual chart content width to use for scaling.
    // It should be:
    // 1. At least the available container width (minus margins) to fill the screen initially.
    // 2. At least `idealContentWidth` if there are many bars (to enable scrolling).
    // 3. At most `MAX_CHART_VIEWPORT_WIDTH` to prevent overstretching on large screens with few bars.
    const chartContentWidth = Math.min(
        Math.max(containerWidth - margin.left - margin.right, idealContentWidth),
        MAX_CHART_VIEWPORT_WIDTH
    );

    // Set the SVG's actual width attribute based on calculated content width plus margins
    svg.setAttribute("width", chartContentWidth + margin.left + margin.right);
    svg.setAttribute("height", svgHeight); // Ensure height is set

    const chartHeight = svgHeight - margin.top - margin.bottom;

    const xScale = (d, i) => i * (chartContentWidth / chartData.length);
    const yScale = (d) => chartHeight - (d.count / maxCount) * chartHeight;
    
    const barPadding = 10; // Padding between bars
    const actualBarWidth = (chartContentWidth / chartData.length) - barPadding;
    const finalBarWidth = Math.max(10, actualBarWidth); // Ensure a minimum bar width of 10px

    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("transform", `translate(${margin.left},${margin.top})`);
    svg.appendChild(g);

    chartData.forEach((d, i) => {
        const bar = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        bar.setAttribute("class", "bar");
        bar.setAttribute("x", xScale(d, i));
        bar.setAttribute("y", yScale(d));
        bar.setAttribute("width", finalBarWidth); // Use finalBarWidth
        bar.setAttribute("height", chartHeight - yScale(d));
        bar.setAttribute("data-location", d.location);
        bar.setAttribute("fill", currentFilters.location === d.location ? "#4f46e5" : "#3498db");
        g.appendChild(bar);

        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute("class", "bar-label");
        text.setAttribute("x", xScale(d, i) + finalBarWidth / 2); // Position based on finalBarWidth
        text.setAttribute("y", yScale(d) - 5);
        text.textContent = d.count;
        g.appendChild(text);

        // X-axis label with rotation for readability on mobile
        const xAxisLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
        xAxisLabel.setAttribute("class", "x-axis-label");
        // Position at the bottom, slightly offset for rotation
        xAxisLabel.setAttribute("x", xScale(d, i) + finalBarWidth / 2); // Position based on finalBarWidth
        xAxisLabel.setAttribute("y", chartHeight + 10); // Adjust Y to move label further down for rotation
        xAxisLabel.setAttribute("transform", `rotate(-45 ${xScale(d, i) + finalBarWidth / 2} ${chartHeight + 10})`); // Rotate around its center
        xAxisLabel.textContent = d.location;
        g.appendChild(xAxisLabel);

        bar.addEventListener('click', () => {
            const newLocation = (currentFilters.location === d.location) ? null : d.location;
            applyFilter(newLocation, null);
        });
    });

    const yAxisLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
    yAxisLine.setAttribute("class", "axis-line");
    yAxisLine.setAttribute("x1", 0); yAxisLine.setAttribute("y1", 0);
    yAxisLine.setAttribute("x2", 0); yAxisLine.setAttribute("y2", chartHeight);
    g.appendChild(yAxisLine);

    const xAxisLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
    xAxisLine.setAttribute("class", "axis-line");
    xAxisLine.setAttribute("x1", 0); xAxisLine.setAttribute("y1", chartHeight);
    xAxisLine.setAttribute("x2", chartContentWidth); // Use chartContentWidth here
    xAxisLine.setAttribute("y2", chartHeight);
    g.appendChild(xAxisLine);

    const numTicks = 5;
    for (let i = 0; i <= numTicks; i++) {
        const tickValue = Math.round((maxCount / numTicks) * i);
        const y = chartHeight - (tickValue / numTicks) * chartHeight; // Corrected from maxTicks to numTicks
        const tickLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
        tickLine.setAttribute("class", "axis-line");
        tickLine.setAttribute("x1", -5); tickLine.setAttribute("y1", y);
        tickLine.setAttribute("x2", 0); tickLine.setAttribute("y2", y);
        g.appendChild(tickLine);

        const tickLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
        tickLabel.setAttribute("class", "y-axis-label");
        tickLabel.setAttribute("x", -10); tickLabel.setAttribute("y", y + 3);
        tickLabel.textContent = tickValue;
        g.appendChild(tickLabel);
    }
}

/**
 * Generates a breakdown list for SubMenu or Category.
 * @param {Array<Object>} data - Flattened data for analysis.
 * @param {string} key - The key to group by ('SubMenu' or 'Category').
 * @param {string} listId - The ID of the UL element to populate.
 */
function generateBreakdownList(data, key, listId) {
    const listElement = document.getElementById(listId);
    if (!listElement) return;

    const counts = {};
    data.forEach(row => {
        const item = row[key];
        counts[item] = (counts[item] || 0) + 1;
    });

    const sortedItems = Object.entries(counts).sort(([, countA], [, countB]) => countB - countA);

    listElement.innerHTML = '';
    if (sortedItems.length === 0) {
        listElement.innerHTML = `<li class="text-gray-500 py-2">No ${key} data available.</li>`;
    } else {
        sortedItems.forEach(([item, count]) => {
            const listItem = document.createElement('li');
            listItem.className = 'py-2 border-b border-gray-100 last:border-b-0';
            listItem.textContent = `${item}: ${count} entries`;
            listElement.appendChild(listItem);
        });
    }
}

/**
 * Applies filters and re-renders the current dashboard tab.
 * @param {string|null} locationFilter - The location to filter by, or null to clear.
 * @param {string|null} completionStatusFilter - The completion status to filter by, or null to clear.
 */
function applyFilter(locationFilter, completionStatusFilter) {
    if (locationFilter !== undefined) {
        currentFilters.location = locationFilter;
    }
    if (completionStatusFilter !== undefined) {
        currentFilters.completionStatus = completionStatusFilter;
    }

    renderDashboard(currentActiveTab);
}

/**
 * Clears all active filters and re-renders the current dashboard tab.
 */
function clearAllFilters() {
    currentFilters = { location: null, completionStatus: null };
    renderDashboard(currentActiveTab);
}

tabOnsiteAudit.addEventListener('click', () => {
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    tabOnsiteAudit.classList.add('active');
    currentActiveTab = 'onsiteAudit';
    renderDashboard('onsiteAudit');
});

tabConsolidation.addEventListener('click', () => {
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    tabConsolidation.classList.add('active');
    currentActiveTab = 'consolidation';
    renderDashboard('consolidation');
});

tabInsights.addEventListener('click', () => {
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    tabInsights.classList.add('active');
    currentActiveTab = 'insights';
    currentFilters = { location: null, completionStatus: null }; // Clear filters for insights view
    renderDashboard('insights');
});

window.onload = fetchData;
