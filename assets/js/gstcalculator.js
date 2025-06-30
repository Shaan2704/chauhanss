// gstcalculator.js

// Global variables for timeouts, as used in the original script
let p;
let t;

/**
 * Checks if a key press event corresponds to a numeric character.
 * Prevents non-numeric input in the amount and GST rate fields.
 * @param {Event} evt - The keyboard event.
 * @returns {boolean} True if the key is numeric or a control key, false otherwise.
 */
function IsNumeric(evt) {
    var charCode = (evt.which) ? evt.which : event.keyCode;
    // Allow numbers (0-9), backspace, delete, tab, period
    if (charCode > 31 && (charCode < 48 || charCode > 57) && charCode != 46) {
        return false;
    }
    return true;
}

/**
 * Calculates GST amount and total amount based on input values.
 * This function is called on 'keyup' for Amount and GST Rate fields.
 */
function calculateGST() {
    try {
        var amount = parseFloat(document.getElementById('txtAmount').value || 0);
        var gstRate = parseFloat(document.getElementById('txtGSTRate').value || 0);

        var gstAmount = (amount * gstRate) / 100;
        var totalAmount = amount + gstAmount;

        // Update display fields
        document.getElementById('txtGSTAmount').value = gstAmount.toFixed(2); // Format to 2 decimal places
        document.getElementById('txtTotalAmount').value = totalAmount.toFixed(2); // Format to 2 decimal places
        document.getElementById('ctl00_ContentPlaceHolder1_lblMsg').textContent = ''; // Clear message
    } catch (e) {
        console.error("Error in calculateGST:", e);
        document.getElementById('ctl00_ContentPlaceHolder1_lblMsg').textContent = 'Please enter valid numbers.';
    }
}

/**
 * Placeholder for a timeout function.
 * Original script had a `timeout()` function, but its body was empty.
 */
function timeout() {
    // This function was empty in the original code, keeping it as a placeholder.
    // console.log("Timeout triggered.");
}

/**
 * Toggles the display of the main calculator div.
 * This function was also empty in the original code's body, only having a try/catch.
 * It's likely intended for showing/hiding content based on some condition.
 */
function ShowHide() {
    try {
        var divmain = document.getElementById('divmain');
        if (divmain) {
            // Original logic was tied to an ASP.NET variable or condition not present here.
            // Keeping the structure but removing the original conditional logic for now.
            // If you need specific show/hide behavior, you'll need to define it here.
            // Example: divmain.style.display = (divmain.style.display === 'none') ? 'block' : 'none';
        }
    } catch (e) {
        console.error("Error in ShowHide:", e);
    }
}

/**
 * Adjusts the height of menu controls based on content height.
 * This function seems related to an ASP.NET menu control ('VerticalMenuControl')
 * which is not part of the current static HTML setup.
 * It will likely not function as intended without the corresponding ASP.NET controls.
 * It's kept here for completeness but might not be relevant to the new context.
 */
function fn() {
    try {
        // These elements ($get is a proprietary method, replacing with jQuery or standard JS)
        // are likely from the original ASP.NET application and may not exist in your static site.
        var obj = $('#VerticalMenuControl'); // Using jQuery for $get equivalent
        var obj1 = $('#VerticalMenuControl_C');

        if (obj.length > 0) { // Check if element exists
            var obj2 = $('#HomepagecontentControl'); // Using jQuery for $get equivalent

            if (obj2.length > 0) {
                // Adjust height based on homepage content
                obj.css('height', obj2.outerHeight() + "px");
                obj1.css('height', obj2.outerHeight() + "px");
            }
            clearTimeout(p); // Clear the timeout
        }
    } catch (e) {
        console.error("Error in fn:", e);
    }
}


/**
 * Initializes page-specific logic, including fixing iframe issues and setting timeouts.
 * This function contains logic for redirecting if the page is in an iframe,
 * and setting up timeouts for 'fn' and 'timeout'.
 */
function pageloadurl() {
    try {
        // Logic to break out of iframes (if the page is loaded in one)
        // This line attempts to ensure the page always loads at the top level
        if (self !== top) {
            top.location = self.location;
        }

        // Set a timeout to call 'fn' after 600ms
        p = setTimeout(fn, 600);

        // Set a timeout to call 'timeout' after 6000ms
        t = setTimeout(timeout, 6000);

    } catch (e) {
        console.error("Error in pageloadurl:", e);
    }
}

// Event listener for DOM content loaded
// This ensures that the page initialization logic runs after the HTML is fully parsed.
$(document).ready(function() {
    pageloadurl(); // Call the main page load URL function
    // Attach reset functionality to the reset button
    $('#btnReset').on('click', function() {
        document.getElementById('txtAmount').value = '0';
        document.getElementById('txtGSTRate').value = '0';
        document.getElementById('txtGSTAmount').value = '0';
        document.getElementById('txtTotalAmount').value = '0';
        document.getElementById('ctl00_ContentPlaceHolder1_lblMsg').textContent = '';
    });
});
