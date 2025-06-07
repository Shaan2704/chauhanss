const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyUIlwRZhTD_k-csmBXddsrYgp6OeGPL8Rli9oSPtPJY_57qyV8ayjCuRSCaHIFqf8/exec'; // <--- REPLACE THIS WITH YOUR DEPLOYED GOOGLE APPS SCRIPT URL

let tasks = []; // Stores the currently displayed (filtered/sorted) tasks
let originalTasks = []; // Stores the raw tasks fetched from the sheet in their original order

// Column definitions for the detailed task table
const COLUMNS = [
    { key: 'Client Name', display: 'Client Name', sortable: true, filterable: true },
    { key: 'Task Name', display: 'Task Name', sortable: true, filterable: true },
    { key: 'Due Date', display: 'Due Date', sortable: true, filterable: true },
    { key: 'Status', display: 'Status', sortable: true, filterable: true },
    { key: 'Assigned To', display: 'Assigned To', sortable: true, filterable: true },
    { key: 'Percent Completed', display: '% Completed', sortable: true, filterable: false },
    { key: 'Actual Completed Date', display: 'Completed On', sortable: true, filterable: true }
];

const FILTER_INPUTS = {}; // Stores references to the dynamic filter input fields for table headers
let activeSortColumn = null;
let sortDirection = 'asc'; // 'asc' or 'desc'

let currentMonthNav = new Date(); // Stores the month for navigation, initialized to current month
let activeSummaryStatusFilter = null; // Stores the status filtered by clicking a summary box

// DOM Elements
const taskTableBody = document.getElementById('taskTableBody'); // For the main detailed table
const tableHeadersRow = document.getElementById('tableHeaders'); // For the main detailed table headers

// DOM Elements for new global filters
const taskNameFilter = document.getElementById('taskNameFilter');
const clientNameFilter = document.getElementById('clientNameFilter');
const dueDateRangeFilter = document.getElementById('dueDateRangeFilter'); // Renamed for single input
const clearDateButtons = document.querySelectorAll('.clear-date-button'); // Clear buttons for date filters

// DOM Elements for the new summary boxes
const pendingTaskCountSpan = document.getElementById('pendingTaskCount');
const inProgressTaskCountSpan = document.getElementById('inProgressTaskCount');
const completedTaskCountSpan = document.getElementById('completedTaskCount');

let dueDateFlatpickrInstance; // To store the Flatpickr instance for the date range

document.addEventListener('DOMContentLoaded', () => {
    // Initialize Flatpickr for single date range filter
    dueDateFlatpickrInstance = flatpickr(dueDateRangeFilter, {
        mode: "range", // Enable range selection
        dateFormat: "Y-m-d",
        onChange: function(selectedDates, dateStr, instance) {
            // Apply filters when dates are selected or cleared
            applyAllFilters();
        }
    });

    // Add event listeners for clear buttons
    clearDateButtons.forEach(button => {
        button.addEventListener('click', (event) => {
            const targetId = event.currentTarget.dataset.target;
            if (targetId === 'dueDateRangeFilter') {
                dueDateFlatpickrInstance.clear(); // Clears the range input
            }
            applyAllFilters(); // Re-apply filters after clearing
        });
    });

    loadTasks(); // Initial load of tasks

    // Month navigation event listeners
    const prevMonthBtn = document.getElementById('prevMonthBtn');
    const nextMonthBtn = document.getElementById('nextMonthBtn');
    prevMonthBtn.addEventListener('click', () => navigateMonth(-1));
    nextMonthBtn.addEventListener('click', () => navigateMonth(1));

    // Global filter event listeners
    taskNameFilter.addEventListener('input', applyAllFilters);
    clientNameFilter.addEventListener('input', applyAllFilters);

    // Add click listeners for summary boxes to act as slicers
    document.querySelectorAll('.summary-box').forEach(box => {
        box.addEventListener('click', () => {
            const statusToFilter = box.dataset.status;

            // If the clicked box is already active, deactivate it (toggle off filter)
            if (box.classList.contains('active')) {
                activeSummaryStatusFilter = null;
            } else {
                activeSummaryStatusFilter = statusToFilter;
            }

            // Remove 'active' class from all boxes
            document.querySelectorAll('.summary-box').forEach(b => b.classList.remove('active'));
            
            // Add 'active' class to the clicked box if a filter is set
            if (activeSummaryStatusFilter) {
                box.classList.add('active');
            }

            applyAllFilters(); // Apply filters based on the new activeSummaryStatusFilter
        });
    });

    updateMonthDisplay(); // Initialize month display
    generateTableHeaders(); // Generate detailed table headers once
});

// Helper function to format dates to DD-Month-YYYY
function formatDateDisplay(dateString) {
    if (!dateString) return '';
    try {
        let date;
        // Attempt to parse ISO format first, then add 'T00:00:00Z' for plain dates
        if (dateString.includes('T')) {
            date = new Date(dateString);
        } else {
            // Assume YYYY-MM-DD format and force UTC interpretation to avoid local timezone issues
            date = new Date(dateString + 'T00:00:00Z'); 
        }

        if (isNaN(date.getTime())) return dateString;

        const options = { day: '2-digit', month: 'long', year: 'numeric' };
        return date.toLocaleDateString('en-GB', options);
    } catch (e) {
        console.error("Error formatting date:", dateString, e);
        return dateString;
    }
}

// Function to navigate between months
function navigateMonth(direction) {
    currentMonthNav.setMonth(currentMonthNav.getMonth() + direction);
    updateMonthDisplay();
    applyAllFilters(); // Re-apply filters after month change
}

// Function to update the month display text
function updateMonthDisplay() {
    const monthDisplay = document.getElementById('currentMonthDisplay');
    const options = { month: 'long', year: 'numeric' };
    monthDisplay.textContent = currentMonthNav.toLocaleDateString('en-US', options);
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
        applyAllFilters(); // Apply initial filters and render both table and summary
    } catch (error) {
        console.error('Error fetching tasks:', error);
        alert('Failed to load tasks. Check the console for details.');
    }
}

function applyAllFilters() {
    let filteredTasks = [...originalTasks]; // Start with a copy of all original tasks

    // Interpret blank or non-numeric "Percent Completed" as 0% for calculations,
    // but the GSheets data remains as is.
    filteredTasks.forEach(task => {
        const percent = parseFloat(task['Percent Completed']);
        if (isNaN(percent) || task['Percent Completed'] === null || task['Percent Completed'] === '') {
            task['Percent Completed'] = 0; // Use 0 for filtering/display logic if blank
        }
    });

    // 1. Apply month navigation filter (Improved for timezone consistency)
    // Get the first day of the selected month in UTC
    const startOfMonth = new Date(Date.UTC(currentMonthNav.getFullYear(), currentMonthNav.getMonth(), 1));
    // Get the first day of the *next* month in UTC
    const endOfMonth = new Date(Date.UTC(currentMonthNav.getFullYear(), currentMonthNav.getMonth() + 1, 1));
    // The filter condition will be: taskDate >= startOfMonth AND taskDate < endOfMonth

    filteredTasks = filteredTasks.filter(task => {
        const dueDateString = task['Due Date'];
        if (!dueDateString) {
            return false; // Exclude tasks without a due date
        }
        try {
            // Parse task due date into a UTC date object for consistent comparison
            const taskDueDate = new Date(dueDateString.includes('T') ? dueDateString : dueDateString + 'T00:00:00Z');
            if (isNaN(taskDueDate.getTime())) {
                return false; // Exclude tasks with invalid due dates
            }
            
            // Compare the UTC timestamp to check if it falls within the selected month range
            return taskDueDate.getTime() >= startOfMonth.getTime() && taskDueDate.getTime() < endOfMonth.getTime();

        } catch (e) {
            console.error(`Error parsing Due Date for task ${task['Task Name']}: ${dueDateString}`, e);
            return false;
        }
    });

    // 2. Apply status filter from summary box
    if (activeSummaryStatusFilter) {
        filteredTasks = filteredTasks.filter(task => task.Status === activeSummaryStatusFilter);
    }

    // 3. Apply Task Name filter
    const taskNameText = taskNameFilter.value.toLowerCase().trim();
    if (taskNameText) {
        filteredTasks = filteredTasks.filter(task =>
            String(task['Task Name'] || '').toLowerCase().includes(taskNameText)
        );
    }

    // 4. Apply Client Name filter
    const clientNameText = clientNameFilter.value.toLowerCase().trim();
    if (clientNameText) {
        filteredTasks = filteredTasks.filter(task =>
            String(task['Client Name'] || '').toLowerCase().includes(clientNameText)
        );
    }

    // 5. Apply Due Date Range filter (using Flatpickr single input)
    const selectedRange = dueDateRangeFilter.value;
    let startDate = null;
    let endDate = null;

    if (selectedRange) {
        const dates = selectedRange.split(' to '); // Flatpickr in range mode separates dates with " to "
        if (dates.length === 2) {
            startDate = new Date(dates[0] + 'T00:00:00Z');
            endDate = new Date(dates[1] + 'T23:59:59Z'); // End of the selected end date
        } else if (dates.length === 1) { // Only a single date selected, treat as a single day range
            startDate = new Date(dates[0] + 'T00:00:00Z');
            endDate = new Date(dates[0] + 'T23:59:59Z');
        }
    }
    
    if (startDate || endDate) {
        filteredTasks = filteredTasks.filter(task => {
            const dueDateString = task['Due Date'];
            if (!dueDateString) return false;
            try {
                const taskDueDate = new Date(dueDateString.includes('T') ? dueDateString : dueDateString + 'T00:00:00Z');
                if (isNaN(taskDueDate.getTime())) return false;

                let matchesStart = true;
                if (startDate) {
                    matchesStart = taskDueDate.getTime() >= startDate.getTime();
                }

                let matchesEnd = true;
                if (endDate) {
                    matchesEnd = taskDueDate.getTime() <= endDate.getTime();
                }
                return matchesStart && matchesEnd;
            } catch (e) {
                return false;
            }
        });
    }

    // Apply client-side filters from table header inputs (if they exist and are active)
    COLUMNS.filter(col => col.filterable).forEach(col => {
        const filterInput = FILTER_INPUTS[col.key];
        if (filterInput && filterInput.value) {
            const filterText = filterInput.value.toLowerCase().trim();
            filteredTasks = filteredTasks.filter(task =>
                String(task[col.key] || '').toLowerCase().includes(filterText)
            );
        }
    });

    // Sort the tasks for the detailed table display
    if (activeSortColumn) {
        filteredTasks.sort((a, b) => {
            const valA = a[activeSortColumn];
            const valB = b[activeSortColumn];

            // Handle numbers (e.g., Percent Completed)
            if (activeSortColumn === 'Percent Completed') {
                const numA = parseFloat(valA);
                const numB = parseFloat(valB);
                if (numA < numB) return sortDirection === 'asc' ? -1 : 1;
                if (numA > numB) return sortDirection === 'asc' ? 1 : -1;
                return 0;
            }
            // Handle dates
            if (activeSortColumn === 'Due Date' || activeSortColumn === 'Actual Completed Date') {
                const dateA = valA ? new Date(valA.includes('T') ? valA : valA + 'T00:00:00Z') : null;
                const dateB = valB ? new Date(valB.includes('T') ? valB : valB + 'T00:00:00Z') : null;

                if (!dateA && !dateB) return 0;
                if (!dateA) return sortDirection === 'asc' ? 1 : -1; // Null dates last if asc, first if desc
                if (!dateB) return sortDirection === 'asc' ? -1 : 1;

                if (dateA.getTime() < dateB.getTime()) return sortDirection === 'asc' ? -1 : 1;
                if (dateA.getTime() > dateB.getTime()) return sortDirection === 'asc' ? 1 : -1;
                return 0;
            }
            // Handle strings
            if (String(valA).toLowerCase() < String(valB).toLowerCase()) return sortDirection === 'asc' ? -1 : 1;
            if (String(valA).toLowerCase() > String(valB).toLowerCase()) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }

    tasks = filteredTasks; // Update the global 'tasks' variable to the filtered and sorted result
    renderTasks(); // Render both the summary counts and the detailed table
}


// Function to generate table headers with sorting and filtering
function generateTableHeaders() {
    tableHeadersRow.innerHTML = ''; // Clear existing headers

    COLUMNS.forEach(col => {
        const th = document.createElement('th');
        th.textContent = col.display;
        th.dataset.key = col.key; // Store key for sorting

        if (col.sortable) {
            th.classList.add('sortable');
            th.addEventListener('click', (event) => {
                // Check if the click originated from the filter input
                if (event.target.tagName === 'INPUT') {
                    return; // Don't sort if clicking on the input
                }
                if (activeSortColumn === col.key) {
                    sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
                } else {
                    activeSortColumn = col.key;
                    sortDirection = 'asc';
                }
                // Clear existing sort indicators
                document.querySelectorAll('#tableHeaders th').forEach(header => {
                    header.classList.remove('asc', 'desc');
                });
                // Add current sort indicator
                th.classList.add(sortDirection);
                applyAllFilters(); // Re-apply filters which will also re-sort
            });
        }

        if (col.filterable) {
            const filterInput = document.createElement('input');
            filterInput.type = 'text';
            filterInput.placeholder = `Filter ${col.display}...`;
            filterInput.classList.add('filter-input');
            filterInput.addEventListener('input', applyAllFilters); // Global filter now
            FILTER_INPUTS[col.key] = filterInput; // Store reference
            th.appendChild(filterInput);
        }
        tableHeadersRow.appendChild(th);
    });

    // Add Actions header
    const actionsTh = document.createElement('th');
    actionsTh.textContent = 'Actions';
    tableHeadersRow.appendChild(actionsTh);
}

// Main rendering function that now handles summary counts and detailed table
function renderTasks() {
    // --- Update Summary Counts ---
    // These counts should now reflect the *currently filtered tasks*,
    // so they are month-specific and filter-specific.
    const pendingCount = tasks.filter(task => task.Status === 'Pending').length;
    const inProgressCount = tasks.filter(task => task.Status === 'In Progress').length;
    const completedCount = tasks.filter(task => task.Status === 'Completed').length;

    pendingTaskCountSpan.textContent = pendingCount;
    inProgressTaskCountSpan.textContent = inProgressCount;
    completedTaskCountSpan.textContent = completedCount;

    // Set 'active' class on summary boxes based on current filter
    document.querySelectorAll('.summary-box').forEach(box => {
        if (box.dataset.status === activeSummaryStatusFilter) {
            box.classList.add('active');
        } else {
            box.classList.remove('active');
        }
    });


    // --- Render Detailed Table Rows ---
    taskTableBody.innerHTML = ''; // Clear existing table rows

    if (tasks.length === 0) {
        const noTasksRow = document.createElement('tr');
        noTasksRow.innerHTML = `<td colspan="${COLUMNS.length + 1}" style="text-align: center; padding: 20px;">No tasks found for the current filters.</td>`;
        taskTableBody.appendChild(noTasksRow);
    } else {
        tasks.forEach((task, index) => {
            // Find the original index of this task in the originalTasks array.
            // This is crucial for 'completeTask' functionality to update the correct row in Google Sheet.
            const originalIndex = originalTasks.findIndex(originalTask =>
                originalTask['Client Name'] === task['Client Name'] &&
                originalTask['Task Name'] === task['Task Name'] &&
                originalTask['Due Date'] === task['Due Date'] // Use Due Date for better uniqueness
            );
            const sheetRowNumber = (originalIndex !== -1) ? (originalIndex + 2) : null; // +2 for 1-based indexing and header row

            // --- Render Table Row ---
            const row = document.createElement('tr');
            // Apply completed task row styling
            if (task.Status === 'Completed') {
                row.classList.add('completed-task-row');
            }

            COLUMNS.forEach((col, colIndex) => {
                const td = document.createElement('td');
                // Request 1: Font size for rows handled by CSS
                // Request 3: Word wrapping handled by CSS
                
                if (col.key === 'Due Date') {
                    const dueDate = task[col.key];
                    if (dueDate) {
                        const dueDateObj = new Date(dueDate.includes('T') ? dueDate : dueDate + 'T00:00:00Z');
                        const today = new Date();
                        // Set to UTC start of day for accurate comparison
                        today.setUTCHours(0, 0, 0, 0);
                        dueDateObj.setUTCHours(0, 0, 0, 0);

                        const diffTime = dueDateObj.getTime() - today.getTime();
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // Calculate difference in days

                        if (diffDays < 0) {
                            td.classList.add('date-crossed'); // Past due
                        } else if (diffDays === 0) {
                            td.classList.add('date-today'); // Due today
                        } else if (diffDays >= 1 && diffDays <= 5) {
                            td.classList.add('date-approaching'); // Approaching (1-5 days)
                        } else {
                            td.classList.add('date-far'); // More than 5 days
                        }
                    }
                    td.textContent = formatDateDisplay(dueDate); // Always display formatted date
                } else if (col.key === 'Actual Completed Date') {
                    td.textContent = formatDateDisplay(task[col.key]);
                } else if (col.key === 'Percent Completed') {
                    const percent = parseInt(task[col.key]);
                    const progressBarContainer = document.createElement('div');
                    progressBarContainer.classList.add('progress-bar-container');

                    const progressBar = document.createElement('div');
                    progressBar.classList.add('progress-bar');
                    const progressBarClass =
                        percent >= 90 ? 'progress-bar-green' :
                        percent >= 50 ? 'progress-bar-yellow' :
                        percent >= 11 ? 'progress-bar-orange' :
                        'progress-bar-red';
                    progressBar.classList.add(progressBarClass);
                    progressBar.style.width = `${Math.max(0, Math.min(100, percent || 0))}%`; // Ensure between 0-100

                    const progressText = document.createElement('span');
                    progressText.classList.add('progress-text');
                    // Request 2: Simplify % Completed label
                    progressText.textContent = `${percent || 0}%`; 

                    progressBarContainer.appendChild(progressBar);
                    td.appendChild(progressBarContainer);
                    td.appendChild(progressText);
                } else {
                    td.textContent = task[col.key] || '';
                }
                row.appendChild(td);
            });

            // Add Action Button for table
            const actionTd = document.createElement('td');
            if (task.Status !== 'Completed') {
                const completeButton = document.createElement('button');
                completeButton.classList.add('complete-button');
                completeButton.innerHTML = '<i class="fas fa-check"></i> Complete';
                completeButton.onclick = () => completeTask(sheetRowNumber);
                actionTd.appendChild(completeButton);
            } else {
                // Removed inline style here to allow CSS to control color
                actionTd.innerHTML = '<span class="completed-text"><i class="fas fa-check-circle"></i> Completed</span>';
            }
            row.appendChild(actionTd);
            taskTableBody.appendChild(row);
        });
    }
}


async function completeTask(sheetRowNumber) {
    const now = new Date();
    const completedDateString = now.getFullYear() + '-' +
                                ('0' + (now.getMonth() + 1)).slice(-2) + '-' +
                                ('0' + now.getDate()).slice(-2);
    const newStatus = 'Completed';

    if (sheetRowNumber === null) {
        alert('Cannot mark task as complete: Original sheet row not found for this task.');
        return;
    }

    try {
        const response = await fetch(`${SCRIPT_URL}?action=updateTask&row=${sheetRowNumber}&completedDate=${completedDateString}&newStatus=${newStatus}`);
        const data = await response.json();

        if (data.error) {
            console.error('Error updating task:', data.error);
            alert('Failed to update task. Check the console for details.');
            return;
        }

        loadTasks(); // Reload all tasks to reflect changes
    } catch (error) {
        console.error('Error updating task:', error);
        alert('Failed to load tasks. Check the console for details.');
    }
}