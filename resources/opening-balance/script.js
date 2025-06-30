// Global variables
        let isXLSXAvailable = false;

        // Wait for DOM and libraries to be fully loaded
        document.addEventListener('DOMContentLoaded', function() {
            // Check if XLSX is available
            setTimeout(function() {
                checkXLSXAvailability();
                initializeApp();
            }, 500); // Give the library a moment to load
        });

        function checkXLSXAvailability() {
            try {
                if (typeof XLSX !== 'undefined') {
                    console.log('XLSX library loaded successfully');
                    isXLSXAvailable = true;
                    document.getElementById('libraryError').style.display = 'none';
                } else {
                    console.error('XLSX library not available');
                    document.getElementById('libraryError').style.display = 'block';
                }
            } catch (e) {
                console.error('Error checking XLSX availability:', e);
                document.getElementById('libraryError').style.display = 'block';
            }
        }

        function initializeApp() {
            const compareBtn = document.getElementById('compareBtn');
            const tabs = document.querySelectorAll('.tab');
            const errorMsg = document.getElementById('errorMsg');
            const downloadComparisonBtn = document.getElementById('downloadComparisonBtn');
            const downloadDifferencesBtn = document.getElementById('downloadDifferencesBtn');
            const downloadAdditionsBtn = document.getElementById('downloadAdditionsBtn');

            // Handle file inputs
            document.getElementById('currentYearFile').addEventListener('change', function(e) {
                if (isXLSXAvailable) {
                    handleFileUpload(e, 'currentYearData', 'currentYearProgress', 'currentYearProgressBar');
                } else {
                    showError('Excel library not loaded. Please use manual data entry or try refreshing the page.');
                }
            });

            document.getElementById('previousYearFile').addEventListener('change', function(e) {
                if (isXLSXAvailable) {
                    handleFileUpload(e, 'previousYearData', 'previousYearProgress', 'previousYearProgressBar');
                } else {
                    showError('Excel library not loaded. Please use manual data entry or try refreshing the page.');
                }
            });

            // Handle tab switching
            tabs.forEach(tab => {
                tab.addEventListener('click', function() {
                    const tabId = this.getAttribute('data-tab');
                    // Deactivate all tabs and panels
                    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));

                    // Activate selected tab and panel
                    this.classList.add('active');
                    document.getElementById(tabId).classList.add('active');
                });
            });

            // Compare trial balances
            compareBtn.addEventListener('click', function() {
                const currentYearData = document.getElementById('currentYearData').value.trim();
                const previousYearData = document.getElementById('previousYearData').value.trim();

                if (!currentYearData || !previousYearData) {
                    showError("Please enter both current year and previous year trial balance data.");
                    return;
                }

                hideError();

                try {
                    // Parse the trial balance data
                    const currentYearTB = parseTrialBalanceData(currentYearData);
                    const previousYearTB = parseTrialBalanceData(previousYearData);

                    if (currentYearTB.length === 0 || previousYearTB.length === 0) {
                        showError("Could not parse data properly. Please check the format.");
                        return;
                    }

                    // Compare the trial balances
                    compareTrialBalances(currentYearTB, previousYearTB);

                    // Show the result section
                    document.getElementById('resultSection').style.display = 'block';
                } catch (error) {
                    showError("Error processing data: " + error.message);
                }
            });

            // Download buttons
            downloadComparisonBtn.addEventListener('click', function() {
                if (isXLSXAvailable) {
                    downloadTableAsExcel('comparisonTable', 'Opening_Balance_Comparison');
                } else {
                    showError("Excel download requires the XLSX library. Please try refreshing the page or copy the table manually.");
                }
            });

            downloadDifferencesBtn.addEventListener('click', function() {
                if (isXLSXAvailable) {
                    downloadTableAsExcel('differencesTable', 'Opening_Balance_Differences');
                } else {
                    showError("Excel download requires the XLSX library. Please try refreshing the page or copy the table manually.");
                }
            });

            downloadAdditionsBtn.addEventListener('click', function() {
                if (isXLSXAvailable) {
                    downloadTableAsExcel('additionsTable', 'New_Accounts_Current_Year');
                    setTimeout(() => {
                        downloadTableAsExcel('deletionsTable', 'Removed_Accounts_Previous_Year');
                    }, 500); // Small delay to ensure both downloads are initiated
                } else {
                    showError("Excel download requires the XLSX library. Please try refreshing the page or copy the tables manually.");
                }
            });
        }

        function handleFileUpload(event, textareaId, progressDivId, progressBarFillId) {
            const file = event.target.files[0];
            const reader = new FileReader();
            const textarea = document.getElementById(textareaId);
            const progressDiv = document.getElementById(progressDivId);
            const progressBarFill = document.getElementById(progressBarFillId);

            progressDiv.style.display = 'block';
            progressBarFill.style.width = '0%';

            reader.onprogress = function(e) {
                if (e.lengthComputable) {
                    const percentComplete = (e.loaded / e.total) * 100;
                    progressBarFill.style.width = percentComplete + '%';
                }
            };

            reader.onload = function(e) {
                progressBarFill.style.width = '100%';
                setTimeout(() => {
                    progressDiv.style.display = 'none';
                    progressBarFill.style.width = '0%';
                }, 1000);

                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const csvData = XLSX.utils.sheet_to_csv(worksheet);
                textarea.value = csvData;
            };

            reader.onerror = function(e) {
                progressDiv.style.display = 'none';
                showError("Error reading the file.");
                console.error("File reading error:", e);
            };

            if (file) {
                reader.readAsArrayBuffer(file);
            }
        }

        function parseTrialBalanceData(data) {
            const lines = data.trim().split('\n').map(line => line.trim());
            if (lines.length === 0) return [];

            const headers = lines[0].split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map(header => header.trim().toLowerCase().replace(/"/g, ''));
            const dataRows = lines.slice(1);
            const trialBalance = [];

            const findColumnIndex = (keywords) => {
                for (const keyword of keywords) {
                    const index = headers.indexOf(keyword);
                    if (index !== -1) return index;
                }
                return -1;
            };

            let particularsIndex= findColumnIndex(['particulars', 'description', 'account']);
            let openingBalanceIndex = findColumnIndex(['opening balance', 'beginning balance', 'opening', 'beginning']);
            let closingBalanceIndex = findColumnIndex(['closing balance', 'ending balance', 'closing', 'ending', 'balance']);

            if (particularsIndex === -1 || openingBalanceIndex === -1 || closingBalanceIndex === -1) {
                alert('Could not automatically detect required columns (Particulars, Opening Balance, Closing Balance). Please ensure your data has these columns with clear headings.');
                return [];
            }

            for (const row of dataRows) {
                // Split by comma, but only if it's not inside double quotes
                const values = row.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map(v => v.trim().replace(/"/g, ''));
                if (values.length > Math.max(particularsIndex, openingBalanceIndex, closingBalanceIndex)) {
                    const particulars = values[particularsIndex];
                    const openingBalanceStr = values[openingBalanceIndex];
                    const closingBalanceStr = (closingBalanceIndex >= 0 && values.length > closingBalanceIndex) ? values[closingBalanceIndex] : null;

                    if (particulars && openingBalanceStr !== undefined) {
                        trialBalance.push({
                            particulars: particulars,
                            openingBalance: parseFloat(cleanNumber(openingBalanceStr)) || 0,
                            closingBalance: closingBalanceStr !== null ? (parseFloat(cleanNumber(closingBalanceStr)) || 0) : 0
                        });
                    }
                }
            }

            return trialBalance;
        }

        function cleanNumber(value) {
            if (typeof value !== 'string') return value;
            return value.replace(/[^\d.-]/g, '');
        }

function compareTrialBalances(currentYearTB, previousYearTB) {
    const comparisonBody = document.getElementById('comparisonBody');
    const differencesBody = document.getElementById('differencesBody');
    const additionsBody = document.getElementById('additionsBody');
    const deletionsBody = document.getElementById('deletionsBody');

    // Clear existing data
    comparisonBody.innerHTML = '';
    differencesBody.innerHTML = '';
    additionsBody.innerHTML = '';
    deletionsBody.innerHTML = '';

    // Create maps for quick lookup using lowercase particulars
    const currentYearMap = new Map(currentYearTB.map(item => [item.particulars.toLowerCase(), item]));
    const previousYearMap = new Map(previousYearTB.map(item => [item.particulars.toLowerCase(), item]));

    // Create sets to easily find additions and deletions based on particulars
    const currentYearParticulars = new Set(currentYearTB.map(item => item.particulars.toLowerCase()));
    const previousYearParticulars = new Set(previousYearTB.map(item => item.particulars.toLowerCase()));

    // Initialize the differences array
    const differences = [];

    // Comparison table
    currentYearTB.forEach(currentItem => {
        const particulars = currentItem.particulars;
        const currentOpening = currentItem.openingBalance;
        const previousItem = previousYearMap.get(particulars.toLowerCase());
        const previousClosing = previousItem ? previousItem.closingBalance : null;
        const difference = previousClosing !== null ? (Math.abs(currentOpening - previousClosing) < 0.01 ? 0 : currentOpening - previousClosing) : null;

        const row = document.createElement('tr');

        // Highlight differences
        if (difference !== null && Math.abs(difference) >= 0.01) {
            row.classList.add('highlight');
            differences.push({
                particulars: particulars,
                currentOpening: currentOpening,
                previousClosing: previousClosing,
                difference: difference
            });
        }

        row.insertCell().textContent = particulars;
        row.insertCell().textContent = formatNumber(currentOpening);
        row.insertCell().textContent = previousClosing !== null ? formatNumber(previousClosing) : 'N/A';
        row.insertCell().textContent = difference !== null ? formatNumber(difference) : 'N/A';
        comparisonBody.appendChild(row);
    });

    // Differences table
    differences.forEach(diff => {
        const row = document.createElement('tr');
        row.insertCell().textContent = diff.particulars;
        row.insertCell().textContent = formatNumber(diff.currentOpening);
        row.insertCell().textContent = diff.previousClosing !== null ? formatNumber(diff.previousClosing) : 'N/A';
        row.insertCell().textContent = formatNumber(diff.difference);
        differencesBody.appendChild(row);
    });

    // Additions (present in current year but not in previous year)
    currentYearTB.forEach(currentItem => {
        if (!previousYearParticulars.has(currentItem.particulars.toLowerCase())) {
            const row = document.createElement('tr');
            row.insertCell().textContent = currentItem.particulars;
            row.insertCell().textContent = formatNumber(currentItem.openingBalance);
            additionsBody.appendChild(row);
        }
    });

    // Deletions (present in previous year but not in current year)
    previousYearTB.forEach(previousItem => {
        if (!currentYearParticulars.has(previousItem.particulars.toLowerCase())) {
            const row = document.createElement('tr');
            row.insertCell().textContent = previousItem.particulars;
            row.insertCell().textContent = formatNumber(previousItem.closingBalance);
            deletionsBody.appendChild(row);
        }
    });
}

        function formatNumber(num) {
            return parseFloat(num).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }

        function showError(message) {
            const errorMsg = document.getElementById('errorMsg');
            errorMsg.textContent = message;
            errorMsg.style.display = 'block';
        }

        function hideError() {
            const errorMsg = document.getElementById('errorMsg');
            errorMsg.style.display = 'none';
        }

        function downloadTableAsExcel(tableId, filename) {
            if (!isXLSXAvailable) {
                showError("Excel download requires the XLSX library. Please try refreshing the page.");
                return;
            }
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.table_to_sheet(document.getElementById(tableId));
            XLSX.utils.book_append_sheet(wb, ws, 'Data');
            XLSX.writeFile(wb, filename + '.xlsx');
        }