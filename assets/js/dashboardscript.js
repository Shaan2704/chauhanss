// Your Google Apps Script URL
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyUM1FJuw0_DMl6CSsFf3a2jp_LmA8M3OodNmlVZiI6Rsxeww-obVZq_jYLs2mvzoYT/exec';

let allTasks = [];
let filteredTasks = [];
let currentSort = {
    column: null,
    direction: 'asc' // 'asc' or 'desc'
};

/**
 * Fetch tasks from Google Sheets using your Google Apps Script
 */
function fetchTasksFromGoogleSheets() {
    // Show loading state
    showLoading('Loading tasks...');
    
    fetch(GOOGLE_SCRIPT_URL)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Raw data from Google Sheets:', data);
            
            // Transform the data to match our expected format
            allTasks = data.map(row => ({
                client: row.Client || row.client || '',
                task: row.Task || row.task || '',
                dueDate: formatDateFromSheet(row['Due Date'] || row.dueDate || row['due date']),
                status: row.Status || row.status || 'Pending',
                completed: parseFloat(row['% Completed'] || row.completed || row['%completed'] || 0)
            }));
            
            // Filter out completely empty rows
            allTasks = allTasks.filter(task => 
                task.client || task.task || task.dueDate || task.status
            );
            
            filteredTasks = [...allTasks];
            console.log('Processed tasks:', allTasks);
            
            renderTable();
            hideLoading();
        })
        .catch(error => {
            console.error('Error fetching data:', error);
            showError(`Error loading tasks: ${error.message}. Please check your connection and try again.`);
        });
}

/**
 * Format date from Google Sheets (handles various date formats)
 */
function formatDateFromSheet(dateValue) {
    if (!dateValue) return '';
    
    let date;
    
    // If it's already a date object
    if (dateValue instanceof Date) {
        date = dateValue;
    }
    // If it's a string, try to parse it
    else if (typeof dateValue === 'string') {
        // Handle common date formats
        date = new Date(dateValue);
    }
    // If it's a number (Excel serial date)
    else if (typeof dateValue === 'number') {
        // Excel/Google Sheets date serial number conversion
        date = new Date((dateValue - 25569) * 86400 * 1000);
    }
    else {
        return '';
    }
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
        return dateValue.toString(); // Return original value if can't parse
    }
    
    // Return in YYYY-MM-DD format for consistent handling
    return date.getFullYear() + '-' + 
           String(date.getMonth() + 1).padStart(2, '0') + '-' + 
           String(date.getDate()).padStart(2, '0');
}

/**
 * Get CSS class for status badge based on status
 */
function getStatusClass(status) {
    if (!status) return 'status-pending';
    
    switch(status.toLowerCase().trim()) {
        case 'pending': return 'status-pending';
        case 'in progress': 
        case 'in-progress': 
        case 'progress': return 'status-in-progress';
        case 'completed': 
        case 'complete': 
        case 'done': return 'status-completed';
        case 'overdue': 
        case 'late': return 'status-overdue';
        default: return 'status-pending';
    }
}

/**
 * Format date string to readable format
 */
function formatDate(dateString) {
    if (!dateString) return 'No date';
    
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Invalid date';
        
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    } catch (error) {
        return dateString; // Return original if can't format
    }
}

/**
 * Create HTML for progress bar with percentage
 */
function createProgressBar(percentage) {
    const safePercentage = Math.max(0, Math.min(100, Math.round(percentage || 0)));
    
    // Determine color based on percentage
    let progressColor = '#28a745, #20c997'; // Green
    if (safePercentage < 30) {
        progressColor = '#dc3545, #e74c3c'; // Red
    } else if (safePercentage < 70) {
        progressColor = '#ffc107, #ff8c00'; // Orange/Yellow
    }
    
    return `
        <div class="progress-container">
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${safePercentage}%; background: linear-gradient(90deg, ${progressColor});"></div>
            </div>
            <div class="progress-label">${safePercentage}% Complete</div>
        </div>
    `;
}

/**
 * Sort tasks by specified column and direction
 */
function sortTasks(column, direction) {
    filteredTasks.sort((a, b) => {
        let valueA, valueB;
        
        switch(column) {
            case 'client':
                valueA = (a.client || '').toLowerCase();
                valueB = (b.client || '').toLowerCase();
                break;
            case 'task':
                valueA = (a.task || '').toLowerCase();
                valueB = (b.task || '').toLowerCase();
                break;
            case 'dueDate':
                valueA = new Date(a.dueDate || '1900-01-01');
                valueB = new Date(b.dueDate || '1900-01-01');
                break;
            case 'status':
                // Custom status order: Overdue, Pending, In Progress, Completed
                const statusOrder = { 'overdue': 0, 'pending': 1, 'in progress': 2, 'completed': 3 };
                valueA = statusOrder[(a.status || '').toLowerCase()] ?? 999;
                valueB = statusOrder[(b.status || '').toLowerCase()] ?? 999;
                break;
            case 'completed':
                valueA = parseFloat(a.completed || 0);
                valueB = parseFloat(b.completed || 0);
                break;
            default:
                return 0;
        }
        
        if (valueA < valueB) return direction === 'asc' ? -1 : 1;
        if (valueA > valueB) return direction === 'asc' ? 1 : -1;
        return 0;
    });
}

/**
 * Handle column header click for sorting
 */
function handleSort(column) {
    // Toggle direction if clicking the same column
    if (currentSort.column === column) {
        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        currentSort.column = column;
        currentSort.direction = 'asc';
    }
    
    sortTasks(column, currentSort.direction);
    renderTable();
    updateSortIndicators();
}

/**
 * Update sort indicators in table headers
 */
function updateSortIndicators() {
    // Remove all existing sort indicators
    document.querySelectorAll('.sort-indicator').forEach(indicator => {
        indicator.remove();
    });
    
    // Add indicator to current sorted column
    if (currentSort.column) {
        const header = document.querySelector(`[data-sort="${currentSort.column}"]`);
        if (header) {
            const indicator = document.createElement('span');
            indicator.className = 'sort-indicator';
            indicator.innerHTML = currentSort.direction === 'asc' ? ' ↑' : ' ↓';
            header.appendChild(indicator);
        }
    }
}

/**
 * Render the task table with current filtered data
 */
function renderTable() {
    const tbody = document.getElementById('taskTableBody');
    
    if (!filteredTasks || filteredTasks.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="no-data">No tasks found. Please check your Google Sheet data.</td></tr>';
        return;
    }

    tbody.innerHTML = filteredTasks.map(task => `
        <tr>
            <td><strong>${escapeHtml(task.client)}</strong></td>
            <td>${escapeHtml(task.task)}</td>
            <td>${formatDate(task.dueDate)}</td>
            <td><span class="status-badge ${getStatusClass(task.status)}">${escapeHtml(task.status)}</span></td>
            <td>${createProgressBar(task.completed)}</td>
        </tr>
    `).join('');
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe.toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/**
 * Apply all active filters to the task list
 */
function applyFilters() {
    const clientFilter = document.getElementById('clientFilter').value.toLowerCase().trim();
    const taskFilter = document.getElementById('taskFilter').value.toLowerCase().trim();
    const statusFilter = document.getElementById('statusFilter').value.toLowerCase().trim();
    const dueDateFilter = document.getElementById('dueDateFilter').value;

    filteredTasks = allTasks.filter(task => {
        const matchesClient = !clientFilter || 
            (task.client && task.client.toLowerCase().includes(clientFilter));
        
        const matchesTask = !taskFilter || 
            (task.task && task.task.toLowerCase().includes(taskFilter));
        
        const matchesStatus = !statusFilter || 
            (task.status && task.status.toLowerCase().includes(statusFilter));
        
        const matchesDueDate = !dueDateFilter || 
            (task.dueDate && task.dueDate === dueDateFilter);

        return matchesClient && matchesTask && matchesStatus && matchesDueDate;
    });

    // Reapply current sort after filtering
    if (currentSort.column) {
        sortTasks(currentSort.column, currentSort.direction);
    }

    renderTable();
    updateFilterCount();
}

/**
 * Update filter count display
 */
function updateFilterCount() {
    const totalTasks = allTasks.length;
    const filteredCount = filteredTasks.length;
    
    if (totalTasks !== filteredCount) {
        console.log(`Showing ${filteredCount} of ${totalTasks} tasks`);
    }
}

/**
 * Clear all filters and show all tasks
 */
function clearAllFilters() {
    document.getElementById('clientFilter').value = '';
    document.getElementById('taskFilter').value = '';
    document.getElementById('statusFilter').value = '';
    document.getElementById('dueDateFilter').value = '';
    
    filteredTasks = [...allTasks];
    renderTable();
    updateFilterCount();
}

/**
 * Show loading message
 */
function showLoading(message = 'Loading tasks...') {
    document.getElementById('loadingMessage').style.display = 'block';
    document.getElementById('loadingMessage').innerHTML = `<div class="loading">${message}</div>`;
    document.getElementById('taskTable').style.display = 'none';
}

/**
 * Hide loading message and show table
 */
function hideLoading() {
    document.getElementById('loadingMessage').style.display = 'none';
    document.getElementById('taskTable').style.display = 'table';
}

/**
 * Show error message
 */
function showError(message) {
    document.getElementById('loadingMessage').style.display = 'block';
    document.getElementById('loadingMessage').innerHTML = `<div class="error">${message}</div>`;
    document.getElementById('taskTable').style.display = 'none';
}

/**
 * Refresh data from Google Sheets
 */
function refreshData() {
    console.log('Refreshing data...');
    fetchTasksFromGoogleSheets();
}

/**
 * Initialize the application
 */
function initializeApp() {
    console.log('Initializing Task Dashboard...');
    
    // Set up event listeners for filters
    document.getElementById('clientFilter').addEventListener('input', applyFilters);
    document.getElementById('taskFilter').addEventListener('input', applyFilters);
    document.getElementById('statusFilter').addEventListener('change', applyFilters);
    document.getElementById('dueDateFilter').addEventListener('change', applyFilters);
    document.getElementById('logoutButton').addEventListener('click', () => {
    // Clear any stored user info
    localStorage.removeItem('username');

    // Redirect to index page
    window.location.href = '/admin/'; // Adjust if your entry page has a different name
});


    // Set up sorting event listeners for table headers
    setupSortingEventListeners();
    
    // Add keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        // Ctrl+R or F5 to refresh
        if ((e.ctrlKey && e.key === 'r') || e.key === 'F5') {
            e.preventDefault();
            refreshData();
        }
        
        // Escape to clear filters
        if (e.key === 'Escape') {
            clearAllFilters();
        }
    });
    
    // Add refresh button functionality (if you want to add one)
    const refreshButton = document.getElementById('refreshButton');
    if (refreshButton) {
        refreshButton.addEventListener('click', refreshData);
    }
    
    // Initial data load
    fetchTasksFromGoogleSheets();
}

/**
 * Setup click event listeners for sortable table headers
 */
function setupSortingEventListeners() {
    // Wait for DOM to be ready, then set up sorting
    setTimeout(() => {
        const headers = document.querySelectorAll('.task-table th[data-sort]');
        headers.forEach(header => {
            header.addEventListener('click', function() {
                const column = this.getAttribute('data-sort');
                handleSort(column);
            });
        });
    }, 100);
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeApp);

// Auto-refresh every 5 minutes (300000 milliseconds)
setInterval(() => {
    console.log('Auto-refreshing data...');
    fetchTasksFromGoogleSheets();
}, 300000);

// Export functions for potential external use
window.TaskDashboard = {
    refreshData,
    clearAllFilters,
    applyFilters,
    fetchTasksFromGoogleSheets
};
function loadUserInfo(username) {
    fetch('users.json')
        .then(response => response.json())
        .then(users => {
            const user = users.find(u => u.username === username);
            if (user) {
                const userInfoDiv = document.getElementById('userInfo');
                userInfoDiv.innerHTML = `
                    <div><strong>${user.name}</strong></div>
                    <div style="font-size: 0.85rem; opacity: 0.85;">${user.role}</div>
                `;
            }
        });
}
