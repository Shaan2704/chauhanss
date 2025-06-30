// !! IMPORTANT: Replace this with your deployed Google Apps Script Web App URL !!
const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbz_2IG8yJkRB1O-PKK2FUvmoEPVvbMA0i8LlelVWScjwGX5bFeH8aPMfZQBgSyipa7d/exec'; // Example: 'https://script.google.com/macros/s/AKfycb.../exec'

// Get references to DOM elements
const validationForm = document.getElementById('validationForm');
const panInput = document.getElementById('pan');
const yobInput = document.getElementById('yob');
const submitButton = document.getElementById('submitButton');
const buttonText = document.getElementById('buttonText');
const loadingSpinner = document.getElementById('loadingSpinner');
const resultContainer = document.getElementById('resultContainer');

/**
 * Event listener for the form submission.
 * Handles validation, API call, and updates UI based on the response.
 */
validationForm.addEventListener('submit', async (event) => {
    event.preventDefault(); // Prevent default browser form submission

    // Hide any previously displayed results and clear their content
    resultContainer.classList.add('hidden');
    resultContainer.innerHTML = '';

    // Set the submit button to a loading state to prevent multiple submissions
    submitButton.disabled = true;
    buttonText.textContent = 'Validating...'; // Change button text
    loadingSpinner.classList.remove('hidden'); // Show spinner
    submitButton.classList.remove('bg-green-600', 'hover:bg-green-700'); // Change button color
    submitButton.classList.add('bg-green-400', 'cursor-not-allowed'); // Apply disabled styling

    // Get and trim input values
    const pan = panInput.value.trim();
    const yob = yobInput.value.trim();

    // Basic client-side validation: Check if fields are empty
    if (!pan || !yob) {
        displayMessage('Please enter both PAN and Year of Birth.', 'bg-red-100 text-red-700 border-red-200');
        resetButtonState(); // Reset button immediately if validation fails
        return;
    }

    try {
        // Create FormData object to send data
        const formData = new FormData();
        formData.append('pan', pan);
        formData.append('yob', yob);

        // Send POST request to the Google Apps Script Web App URL
        const response = await fetch(WEB_APP_URL, {
            method: 'POST',
            body: formData, // FormData automatically sets content-type
            mode: 'cors'    // Ensure CORS mode is enabled for cross-origin requests
        });

        // Check if the HTTP response was successful
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Parse the JSON response from the Apps Script
        const data = await response.json();

        // Update UI based on the success status from the Apps Script
        if (data.success) {
            const linkHtml = `
                <p class="flex items-center justify-center text-lg font-medium text-green-700">
                    ✅
                    <a href="${data.link}" target="_blank" rel="noopener noreferrer"
                       class="inline-block font-semibold text-primary-600 hover:text-primary-800
                              transition-colors duration-200 underline">
                        Access your documents here
                    </a>
                </p>
            `;
            displayMessage(linkHtml, 'bg-green-100 text-green-700 border-green-200');
        } else {
            displayMessage(data.message, 'bg-red-100 text-red-700 border-red-200');
        }

    } catch (error) {
        // Log fetch errors to the console
        console.error('Fetch error:', error);
        displayMessage('Could not connect to the server. Please check your internet connection or try again later.', 'bg-red-100 text-red-700 border-red-200');
    } finally {
        // Always reset the button state after the fetch operation completes (success or failure)
        resetButtonState();
    }
});

/**
 * Displays a message in the result container.
 * @param {string} message - The HTML content or text message to display.
 * @param {string} classes - Tailwind CSS classes to apply for styling the message container.
 */
function displayMessage(message, classes) {
    resultContainer.innerHTML = message;
    // Update container's classes dynamically (border-l-4 is for a left border accent)
    resultContainer.className = `mt-8 p-4 rounded-lg text-center border-l-4 ${classes}`;
    resultContainer.classList.remove('hidden'); // Make the container visible
}

/**
 * Resets the submit button back to its original state.
 */
function resetButtonState() {
    submitButton.disabled = false; // Re-enable the button
    buttonText.textContent = 'Validate'; // Restore original button text
    loadingSpinner.classList.add('hidden'); // Hide spinner
    submitButton.classList.remove('bg-green-400', 'cursor-not-allowed'); // Remove disabled styling
    submitButton.classList.add('bg-green-600', 'hover:bg-green-700'); // Restore original button color
}

/**
 * Event listener for the PAN input field.
 * Converts input to uppercase as the user types.
 */
panInput.addEventListener('input', (event) => {
    event.target.value = event.target.value.toUpperCase();
});

/**
 * Event listener for the Year of Birth input field.
 * Restricts input to 4 digits and only numbers.
 */
yobInput.addEventListener('input', (event) => {
    event.target.value = event.target.value.replace(/[^0-9]/g, '').slice(0, 4);
});
