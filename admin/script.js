const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyUIlwRZhTD_k-csmBXddsrYgp6OeGPL8Rli9oSPtPJY_57qyV8ayjCuRSCaHIFqf8/exec'; // <--- REPLACE THIS WITH YOUR DEPLOYED GOOGLE APPS SCRIPT URL

let tasks = []; // Stores the currently displayed (filtered/sorted) tasks
let originalTasks = []; // Stores the raw tasks fetched from the sheet in their original order

// Column definitions for dynamic header and filtering/sorting
const COLUMNS = [
    { key: 'Client Name', display: 'Client Name', sortable: true, filterable: true },
    { key: 'Task Name', display: 'Task Name', sortable: true, filterable: true },
    { key: 'Due Date', display: 'Due Date', sortable: true, filterable: true },
    { key: 'Status', display: 'Status', sortable: true, filterable: true },
    { key: 'Assigned To', display: 'Assigned To', sortable: true, filterable: true },
    { key: 'Percent Completed', display: '% Completed', sortable: true, filterable: false }, // New column
    { key: 'Actual Completed Date', display: 'Completed On', sortable: true, filterable: true }
];

const FILTER_INPUTS = {}; // Stores references to the dynamic filter input fields
let activeSortColumn = null;
let sortDirection = 'asc'; // 'asc' or 'desc'
let currentMonthNav = new Date(); // Stores the month for navigation, initialized to current month

document.addEventListener('DOMContentLoaded', () => {
    generateTableHeaders();
    loadTasks();

    // Month navigation event listeners
    const prevMonthBtn = document.getElementById('prevMonthBtn');
    const nextMonthBtn = document.getElementById('nextMonthBtn');
    prevMonthBtn.addEventListener('click', () => navigateMonth(-1));
    nextMonthBtn.addEventListener('click', () => navigateMonth(1));

    // Global status filter
    const statusFilter = document.getElementById('statusFilter');
    statusFilter.addEventListener('change', applyAllFilters);

    updateMonthDisplay(); // Initialize month display
});

// Helper function to format dates to DD-Month-YYYY
function formatDateDisplay(dateString) {
    if (!dateString) return ''; // Handle empty or null dates
    try {
        let date;
        // If the date string contains 'T', it's likely an ISO 8601 string, parse directly.
        // Otherwise, assume YYYY-MM-DD and add T00:00:00Z to ensure it's treated as UTC to avoid local timezone issues.
        if (dateString.includes('T')) {
            date = new Date(dateString);
        } else {
            date = new Date(dateString + 'T00:00:00Z');
        }

        if (isNaN(date.getTime())) return dateString; // Return original if parsing fails

        const options = { day: '2-digit', month: 'long', year: 'numeric' };
        // Use 'en-GB' locale for DD-Month-YYYY format
        return date.toLocaleDateString('en-GB', options);
    } catch (e) {
        console.error("Error formatting date:", dateString, e);
        return dateString; // Fallback to original if error
    }
}

// Function to navigate between months
function navigateMonth(direction) {
    currentMonthNav.setMonth(currentMonthNav.getMonth() + direction);
    updateMonthDisplay(); // Update the displayed month text
    applyAllFilters(); // Re-apply filters based on the new month
}

// Function to update the month display text
function updateMonthDisplay() {
    const monthDisplay = document.getElementById('currentMonthDisplay');
    const options = { month: 'long', year: 'numeric' };
    monthDisplay.textContent = currentMonthNav.toLocaleDateString('en-US', options);
}

// Generates table headers dynamically including sort indicators and filter inputs
function generateTableHeaders() {
    const tableHeadersRow = document.getElementById('tableHeaders');
    tableHeadersRow.innerHTML = ''; // Clear existing headers

    COLUMNS.forEach(col => {
        const th = document.createElement('th');
        th.textContent = col.display;
        th.dataset.key = col.key;

        // Center headers for all columns except the first two
        if (col.key !== 'Client Name' && col.key !== 'Task Name') {
            th.style.textAlign = 'center';
        }

        // Add sorting functionality
        if (col.sortable) {
            th.classList.add('sortable');
            th.addEventListener('click', (event) => {
                // Do not sort if clicking directly on the filter input
                if (event.target.tagName.toLowerCase() === 'input') {
                    return;
                }
                if (activeSortColumn === col.key) {
                    sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
                } else {
                    activeSortColumn = col.key;
                    sortDirection = 'asc';
                }
                // Update sort indicator classes
                document.querySelectorAll('.sortable').forEach(header => {
                    header.classList.remove('asc', 'desc');
                });
                th.classList.add(sortDirection);
                applyAllFilters(); // Re-apply filters and sort
            });
        }

        // Add column-specific filter input
        if (col.filterable) {
            const filterInput = document.createElement('input');
            filterInput.type = 'text';
            filterInput.placeholder = `Filter ${col.display}...`;
            filterInput.classList.add('filter-input');
            filterInput.dataset.key = col.key; // Store key for filtering logic
            filterInput.addEventListener('input', applyAllFilters); // Apply filters on input change
            FILTER_INPUTS[col.key] = filterInput; // Store reference for easy access
            th.appendChild(filterInput);
        }
        tableHeadersRow.appendChild(th);
    });

    // Add Action header (always present)
    const actionTh = document.createElement('th');
    actionTh.textContent = 'Action';
    actionTh.style.textAlign = 'center'; // Center the 'Action' header
    tableHeadersRow.appendChild(actionTh);
}


async function loadTasks() {
    try {
        const response = await fetch(`${SCRIPT_URL}?action=getTasks`);
        const data = await response.json();

        if (data.error) {
            console.error('Error fetching tasks:', data.error);
            alert('Failed to load tasks. Check the console for details.');
            return;
        }

        originalTasks = data.tasks; // Store the original, unfiltered, unsorted list
        applyAllFilters(); // Apply initial filters (including month nav) and render
    } catch (error) {
        console.error('Error fetching tasks:', error);
        alert('Failed to load tasks. Check the console for details.');
    }
}

function applyAllFilters() {
    let filteredTasks = [...originalTasks]; // Start with a copy of all original tasks

// --- NEW LOGIC ADDED HERE ---
    // Interpret blank or non-numeric "Percent Completed" as 1%
    filteredTasks.forEach(task => {
        const percent = parseFloat(task['Percent Completed']);
        if (isNaN(percent) || task['Percent Completed'] === null || task['Percent Completed'] === '') {
            task['Percent Completed'] = 4; // Set to 4% if blank or not a number
        }
    });
    // --- END NEW LOGIC ---

    // 1. Apply month navigation filter
    const displayMonth = currentMonthNav.getMonth();
    const displayYear = currentMonthNav.getFullYear();

    filteredTasks = filteredTasks.filter(task => {
        const dueDate = task['Due Date'];
        if (!dueDate) return false; // Tasks without due date are not shown in month navigation view
        try {
            // Parse date string carefully. Add 'T00:00:00Z' for YYYY-MM-DD to treat as UTC.
            const date = new Date(dueDate.includes('T') ? dueDate : dueDate + 'T00:00:00Z');
            if (isNaN(date.getTime())) return false; // Exclude invalid dates
            // Compare UTC month/year to ensure consistency regardless of local timezone
            return date.getUTCMonth() === displayMonth && date.getUTCFullYear() === displayYear;
        } catch (e) {
            return false;
        }
    });

    // 2. Apply global status filter
    const selectedStatus = document.getElementById('statusFilter').value;
    if (selectedStatus) {
        filteredTasks = filteredTasks.filter(task => task.Status === selectedStatus);
    }

    // 3. Apply column-specific text filters
    COLUMNS.forEach(col => {
        if (col.filterable && FILTER_INPUTS[col.key]) {
            const filterText = FILTER_INPUTS[col.key].value.toLowerCase().trim();
            if (filterText) {
                filteredTasks = filteredTasks.filter(task => {
                    const taskValue = String(task[col.key] || '').toLowerCase(); // Handle null/undefined values
                    return taskValue.includes(filterText);
                });
            }
        }
    });

    // 4. Apply sorting
    if (activeSortColumn) {
        filteredTasks.sort((a, b) => {
            const valA = a[activeSortColumn];
            const valB = b[activeSortColumn];

            // Handle date sorting
            if (activeSortColumn.includes('Date')) {
                // Parse date strings, treating YYYY-MM-DD as UTC to avoid timezone issues during comparison
                const dateA = valA ? new Date(valA.includes('T') ? valA : valA + 'T00:00:00Z') : null;
                const dateB = valB ? new Date(valB.includes('T') ? valB : valB + 'T00:00:00Z') : null;

                // Treat null/undefined dates as larger/smaller for sorting
                if (dateA && dateB) {
                    return sortDirection === 'asc' ? dateA.getTime() - dateB.getTime() : dateB.getTime() - dateA.getTime();
                } else if (dateA) { // A has date, B doesn't
                    return sortDirection === 'asc' ? -1 : 1;
                } else if (dateB) { // B has date, A doesn't
                    return sortDirection === 'asc' ? 1 : -1;
                }
                return 0; // Both are null or invalid
            }

            // Handle numeric sorting for Percent Completed
            if (activeSortColumn === 'Percent Completed') {
                const numA = parseFloat(valA);
                const numB = parseFloat(valB);
                if (isNaN(numA) && isNaN(numB)) return 0; // Both are not numbers
                if (isNaN(numA)) return sortDirection === 'asc' ? 1 : -1; // A is not a number, B is
                if (isNaN(numB)) return sortDirection === 'asc' ? -1 : 1; // B is not a number, A is
                return sortDirection === 'asc' ? numA - numB : numB - numA;
            }

            // Handle string/generic sorting
            if (typeof valA === 'string' && typeof valB === 'string') {
                return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
            }
            // Handle null/undefined values for non-date columns
            if (valA === null || valA === undefined) return sortDirection === 'asc' ? 1 : -1;
            if (valB === null || valB === undefined) return sortDirection === 'asc' ? -1 : 1;
            return sortDirection === 'asc' ? valA - valB : valB - valA;
        });
    }

    tasks = filteredTasks; // Update the global 'tasks' variable to the filtered/sorted result
    renderTasks();
}

function renderTasks() {
    const tableBody = document.getElementById('taskTableBody');
    tableBody.innerHTML = ''; // Clear existing rows

    if (tasks.length === 0) {
        const noResultsRow = document.createElement('tr');
        noResultsRow.innerHTML = `<td colspan="${COLUMNS.length + 1}" style="text-align: center; padding: 20px; color: #555;">No tasks found for this month matching your criteria.</td>`;
        tableBody.appendChild(noResultsRow);
        return;
    }

    tasks.forEach(task => {
        const row = document.createElement('tr');

        // Find the original index of this task in the originalTasks array.
        // This is crucial for correctly identifying the sheet row number.
        // Using multiple properties to ensure uniqueness.
        const originalIndex = originalTasks.findIndex(originalTask =>
            originalTask['Client Name'] === task['Client Name'] &&
            originalTask['Task Name'] === task['Task Name'] &&
            originalTask['Due Date'] === task['Due Date'] &&
            originalTask['Assigned To'] === task['Assigned To']
            // Add more properties for robust uniqueness if necessary
        );

        // Google Sheet rows are 1-indexed, and we skip the header row (index 0 in array),
        // so the task at originalTasks[0] corresponds to sheet row 2.
        const sheetRowNumber = (originalIndex !== -1) ? (originalIndex + 2) : null;

        COLUMNS.forEach(col => {
            const td = document.createElement('td');
            let cellContent = task[col.key] || ''; // Get content, default to empty string

            // Apply reduced padding to all data cells
            td.style.padding = '8px 5px';

            // Center all columns except the first two
            if (col.key !== 'Client Name' && col.key !== 'Task Name') {
                td.style.textAlign = 'center';
            }

            if (col.key === 'Due Date' || col.key === 'Actual Completed Date') {
                cellContent = formatDateDisplay(cellContent); // Apply formatting for date columns
                td.textContent = cellContent;
            } else if (col.key === 'Percent Completed') {
                const percent = parseInt(cellContent);
                if (!isNaN(percent)) {
                    // Overall container for bar and text (flex column to stack them)
                    const percentContainer = document.createElement('div');
                    percentContainer.style.display = 'flex';
                    percentContainer.style.flexDirection = 'column';
                    percentContainer.style.alignItems = 'center'; // Align content to the center

                    const progressBarContainer = document.createElement('div');
                    progressBarContainer.classList.add('progress-bar-container');

                    const progressBar = document.createElement('div');
                    progressBar.classList.add('progress-bar');
                    // Clamp percentage between 0 and 100
                    progressBar.style.width = `${Math.max(0, Math.min(100, percent))}%`;

                    // Add conditional classes for color based on percentage
                    if (percent >= 90) {
                        progressBar.classList.add('progress-bar-green');
                    } else if (percent >= 50) {
                        progressBar.classList.add('progress-bar-yellow');
                    } else if (percent >= 11) {
                        progressBar.classList.add('progress-bar-orange');
                    } else { // 0-10%
                        progressBar.classList.add('progress-bar-red');
                    }

                    // Separate span for the percentage text below the bar
                    const percentText = document.createElement('span');
                    percentText.textContent = `${percent}%`;
                    percentText.classList.add('progress-text');

                    progressBarContainer.appendChild(progressBar); // Bar goes into its container
                    percentContainer.appendChild(progressBarContainer); // Bar container goes into overall percent container
                    percentContainer.appendChild(percentText); // Text goes below the bar container

                    td.appendChild(percentContainer); // The table cell gets the overall percent container
                } else {
                    td.textContent = cellContent; // Fallback if not a number
                }
            } else {
                td.textContent = cellContent;
            }
            row.appendChild(td);
        });

        // Action column
        const actionTd = document.createElement('td');
        // Apply reduced padding to action cell as well
        actionTd.style.padding = '8px 5px';
        actionTd.style.textAlign = 'center'; // Center the content of the action column

        // Only show "Complete" button if original sheet row was found AND task is not already completed
        if (sheetRowNumber !== null && task.Status !== 'Completed') {
            actionTd.innerHTML = `
                <button class="complete-button" onclick="completeTask(${sheetRowNumber})">
                  <i class="fas fa-check"></i> Complete
                </button>
            `;
        } else if (task.Status === 'Completed') {
            actionTd.textContent = 'Done'; // Indicate task is completed
            actionTd.style.color = '#28a745'; // Green color for 'Done'
            actionTd.style.fontWeight = 'bold';
        } else {
            // This case should ideally not happen if originalIndex is found correctly.
            // But as a fallback for robustness.
            actionTd.textContent = 'N/A';
        }
        row.appendChild(actionTd);

        tableBody.appendChild(row);
    });
}

async function completeTask(sheetRowNumber) {
    const now = new Date();
    // Format current date as YYYY-MM-DD for Google Sheet
    const completedDateString = now.getFullYear() + '-' +
                                ('0' + (now.getMonth() + 1)).slice(-2) + '-' +
                                ('0' + now.getDate()).slice(-2);
    const newStatus = 'Completed'; // The status to update to

    if (sheetRowNumber === null) {
        alert('Cannot mark task as complete: Original sheet row not found for this task.');
        return;
    }

    try {
        // Send sheetRowNumber, completedDate, and newStatus to the Apps Script
        const response = await fetch(`${SCRIPT_URL}?action=updateTask&row=${sheetRowNumber}&completedDate=${completedDateString}&newStatus=${newStatus}`);
        const data = await response.json();

        if (data.error) {
            console.error('Error updating task:', data.error);
            alert('Failed to update task. Check the console for details.');
            return;
        }

        // Reload all tasks to ensure the table reflects the latest state from the sheet,
        // including updated completed date and status, and to re-apply filters/sorts.
        loadTasks();
    } catch (error) {
        console.error('Error updating task:', error);
        alert('Failed to update task. Check the console for details.');
    }
}

