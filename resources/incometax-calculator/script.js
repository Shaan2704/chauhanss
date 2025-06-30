// Ensure jQuery is loaded before this script runs
$(document).ready(function() {

    // --- DOM Element References ---
    const assesseeType = $('#assesseeType');
    const residentStatusDiv = $('#residentStatusDiv');
    const residentStatus = $('#residentStatus');
    const ageDiv = $('#ageDiv');
    const ageInput = $('#age');
    const taxRegimeDiv = $('#taxRegimeDiv');
    const taxRegimeRadios = $('input[name="taxRegime"]');
    const grossTotalIncomeLabel = $('#grossTotalIncomeLabel');
    const grossTotalIncomeInput = $('#grossTotalIncome');
    const deductionsDiv = $('#deductionsDiv');
    const deductionsInput = $('#deductions');
    const calculateTaxBtn = $('#calculateTax');
    const resetFormBtn = $('#resetForm');

    // Output elements
    const outputAssesseeType = $('#outputAssesseeType');
    const outputRegimeRow = $('#outputRegimeRow');
    const outputRegime = $('#outputRegime');
    const outputGrossIncome = $('#outputGrossIncome');
    const outputDeductionsRow = $('#outputDeductionsRow');
    const outputDeductions = $('#outputDeductions');
    const outputTaxableIncome = $('#outputTaxableIncome');
    const outputIncomeTax = $('#outputIncomeTax');
    const outputRebateRow = $('#outputRebateRow');
    const outputRebate = $('#outputRebate');
    const outputSurchargeRow = $('#outputSurchargeRow');
    const outputSurcharge = $('#outputSurcharge');
    const outputCess = $('#outputCess');
    const outputTotalTax = $('#outputTotalTax');

    // --- Event Listeners ---

    // Handle changes in Assessee Type or Tax Regime
    function updateVisibility() {
        const selectedType = assesseeType.val();
        const selectedStatus = residentStatus.val();
        const selectedRegime = $('input[name="taxRegime"]:checked').val();

        // Reset visibility of conditional fields
        residentStatusDiv.addClass('hidden');
        ageDiv.addClass('hidden');
        taxRegimeDiv.addClass('hidden');
        deductionsDiv.addClass('hidden');
        grossTotalIncomeLabel.text('Gross Total Income (₹):'); // Reset label

        if (selectedType === 'individual' || selectedType === 'huf') {
            residentStatusDiv.removeClass('hidden');
            taxRegimeDiv.removeClass('hidden'); // Always show regime choice for Individual/HUF

            if (selectedStatus === 'resident' || selectedStatus === 'nror') {
                // Age is only for Resident Individual
                if (selectedType === 'individual') {
                    ageDiv.removeClass('hidden');
                }

                // Show deductions based on regime
                if (selectedRegime === 'old') {
                    deductionsDiv.removeClass('hidden');
                } else { // New Regime
                    grossTotalIncomeLabel.text('Gross Total Income (after Standard Deduction) (₹):');
                    // Standard deduction is now assumed to be factored into GTI by user input
                }
            } else { // Non-Resident (NRI)
                // For NRIs, the new regime is generally not applicable for general income.
                // We'll revert to old regime behavior for simplicity.
                taxRegimeDiv.addClass('hidden'); // Hide regime choice for NRI
                taxRegimeRadios.filter('[value="old"]').prop('checked', true); // Force old regime
                deductionsDiv.removeClass('hidden'); // Deductions allowed under old regime for NRI
            }
        }
    }

    assesseeType.change(updateVisibility);
    residentStatus.change(updateVisibility);
    taxRegimeRadios.change(updateVisibility); // Listen to regime changes

    // Initial trigger to set up the form based on default selected values
    updateVisibility();

    // --- Core Calculation Logic ---

    calculateTaxBtn.click(function() {
        // Clear previous results and error messages
        resetOutput();

        let gti = parseFloat(grossTotalIncomeInput.val());
        let deductions = parseFloat(deductionsInput.val() || 0); // Chapter VI-A Deductions
        
        let selectedAssesseeType = assesseeType.val();
        let selectedResidentStatus = residentStatus.val();
        let selectedTaxRegime = $('input[name="taxRegime"]:checked').val();
        let age = parseInt(ageInput.val());

        // Input validation
        if (isNaN(gti) || gti < 0) {
            alert('Please enter a valid Gross Total Income.');
            return;
        }

        if (selectedAssesseeType === 'individual' || selectedAssesseeType === 'huf') {
            if (selectedResidentStatus === 'resident' || selectedResidentStatus === 'nror') {
                if (selectedTaxRegime === 'old' && (isNaN(deductions) || deductions < 0)) {
                    alert('Please enter valid Chapter VI-A Deductions for Old Regime.');
                    return;
                }
            }
            if (selectedAssesseeType === 'individual' && selectedResidentStatus === 'resident' && (isNaN(age) || age < 0 || age > 120)) {
                alert('Please enter a valid age for Individual Resident.');
                return;
            }
        }


        // Cap deductions to GTI
        if (deductions > gti) {
            deductions = gti;
        }
        // Note: For New Regime, standard deduction is assumed to be handled by user in GTI input.
        // So, no explicit 'standardDeduction' variable or deduction here.

        let taxableIncome = gti; // Initialize with GTI
        let incomeTax = 0;
        let surcharge = 0;
        let cess = 0;
        let rebate87A = 0;
        let totalTaxPayable = 0;

        // --- Tax Calculation based on Assessee Type and Regime ---

        switch (selectedAssesseeType) {
            case 'individual':
            case 'huf':
                // Apply deductions based on regime
                if (selectedTaxRegime === 'old') {
                    taxableIncome = gti - deductions;
                    if (taxableIncome < 0) taxableIncome = 0;
                    outputDeductionsRow.removeClass('hidden');
                } else { // New Regime: GTI is already assumed after standard deduction
                    taxableIncome = gti; // No further deduction in calculator
                    outputDeductionsRow.addClass('hidden'); // Hide Chapter VI-A deductions output
                }
                
                // Set the output for regime visibility
                outputRegimeRow.removeClass('hidden');
                outputRegime.text(selectedTaxRegime === 'new' ? 'New Regime' : 'Old Regime');

                if (selectedResidentStatus === 'resident' || selectedResidentStatus === 'nror') {
                    // Resident and RNOR Individual/HUF
                    if (selectedTaxRegime === 'old') {
                        // Old Regime Slabs (AY 2026-27 / FY 2025-26)
                        let slab1 = 0;
                        if (selectedAssesseeType === 'individual') {
                            if (age >= 80) slab1 = 500000;      // Super Senior Citizen
                            else if (age >= 60) slab1 = 300000; // Senior Citizen
                            else slab1 = 250000;                // Below 60
                        } else { // HUF
                            slab1 = 250000;
                        }
                        
                        // Slabs for Old Regime (5%, 20%, 30%)
                        if (taxableIncome <= slab1) {
                            incomeTax = 0;
                        } else if (taxableIncome <= (slab1 + 250000)) { // Up to 5 lakhs for 5% slab
                            incomeTax = (taxableIncome - slab1) * 0.05;
                        } else if (taxableIncome <= (slab1 + 250000 + 500000)) { // Up to 10 lakhs for 20% slab
                            incomeTax = (250000 * 0.05) + (taxableIncome - (slab1 + 250000)) * 0.20;
                        } else { // Above 10 lakhs for 30% slab
                            incomeTax = (250000 * 0.05) + (500000 * 0.20) + (taxableIncome - (slab1 + 750000)) * 0.30;
                        }

                        // Rebate u/s 87A for Resident Individual/HUF under Old Regime
                        if (taxableIncome <= 500000) {
                            rebate87A = Math.min(incomeTax, 12500);
                        }
                    } else {
                        // New Regime Slabs (AY 2026-27 / FY 2025-26)
                        if (taxableIncome <= 300000) {
                            incomeTax = 0;
                        } else if (taxableIncome <= 600000) {
                            incomeTax = (taxableIncome - 300000) * 0.05;
                        } else if (taxableIncome <= 900000) {
                            incomeTax = (300000 * 0.05) + (taxableIncome - 600000) * 0.10;
                        } else if (taxableIncome <= 1200000) {
                            incomeTax = (300000 * 0.05) + (300000 * 0.10) + (300000 * 0.15) + (taxableIncome - 900000) * 0.15;
                        } else if (taxableIncome <= 1500000) {
                            incomeTax = (300000 * 0.05) + (300000 * 0.10) + (300000 * 0.15) + (300000 * 0.20) + (taxableIncome - 1200000) * 0.20;
                        } else {
                            incomeTax = (300000 * 0.05) + (300000 * 0.10) + (300000 * 0.15) + (300000 * 0.20) + (300000 * 0.25) + (taxableIncome - 1500000) * 0.30;
                        }

                        // Rebate u/s 87A for Resident Individual/HUF under New Regime
                        if (taxableIncome <= 700000) {
                            rebate87A = Math.min(incomeTax, 25000);
                        }
                    }

                    // Apply rebate
                    incomeTax -= rebate87A;
                    if (incomeTax < 0) incomeTax = 0; // Tax cannot be negative after rebate
                    outputRebateRow.removeClass('hidden');

                    // Surcharge for Resident Individual/HUF
                    if (taxableIncome > 5000000 && taxableIncome <= 10000000) {
                        surcharge = incomeTax * 0.10;
                    } else if (taxableIncome > 10000000 && taxableIncome <= 20000000) {
                        surcharge = incomeTax * 0.15;
                    } else if (taxableIncome > 20000000 && taxableIncome <= 50000000) {
                        surcharge = incomeTax * 0.25;
                    } else if (taxableIncome > 50000000) {
                        surcharge = incomeTax * 0.37;
                    }
                    if (surcharge > 0) outputSurchargeRow.removeClass('hidden');

                } else {
                    // Non-Resident Individual/HUF (Old Regime slabs apply, no age benefits, no 87A rebate)
                    // The new regime is not applicable for NRI by default for general income.
                    taxableIncome = gti - deductions; // Deductions may be applicable for certain incomes for NRIs
                    if (taxableIncome < 0) taxableIncome = 0;

                    outputRegimeRow.addClass('hidden'); // Hide regime for non-residents in output
                    outputDeductionsRow.removeClass('hidden'); // Show deductions for non-residents (old regime)
                    outputRebateRow.addClass('hidden'); // No rebate for non-residents

                    // Slabs for Non-Resident (250000, 5%, 20%, 30%)
                    if (taxableIncome <= 250000) {
                        incomeTax = 0;
                    } else if (taxableIncome <= 500000) {
                        incomeTax = (taxableIncome - 250000) * 0.05;
                    } else if (taxableIncome <= 1000000) {
                        incomeTax = (250000 * 0.05) + (taxableIncome - 500000) * 0.20;
                    } else {
                        incomeTax = (250000 * 0.05) + (500000 * 0.20) + (taxableIncome - 1000000) * 0.30;
                    }

                    // Surcharge for Non-Resident Individual/HUF (same rates)
                    if (taxableIncome > 5000000 && taxableIncome <= 10000000) {
                        surcharge = incomeTax * 0.10;
                    } else if (taxableIncome > 10000000 && taxableIncome <= 20000000) {
                        surcharge = incomeTax * 0.15;
                    } else if (taxableIncome > 20000000 && taxableIncome <= 50000000) {
                        surcharge = incomeTax * 0.25;
                    } else if (taxableIncome > 50000000) {
                        surcharge = incomeTax * 0.37;
                    }
                    if (surcharge > 0) outputSurchargeRow.removeClass('hidden');
                }
                break;

            case 'firm':
                taxableIncome = gti;
                incomeTax = taxableIncome * 0.30; // Flat 30% for Partnership Firm
                outputRegimeRow.addClass('hidden');
                outputDeductionsRow.addClass('hidden');
                outputRebateRow.addClass('hidden');

                // Surcharge for Firm
                if (taxableIncome > 10000000) { // If total income > ₹1 crore
                    surcharge = incomeTax * 0.12; // 12% surcharge
                }
                if (surcharge > 0) outputSurchargeRow.removeClass('hidden');
                break;

            case 'domesticCompany':
                taxableIncome = gti;
                // Simplified Company tax rate (assuming 30% for now, without checking turnover for 25% rate)
                // For a more accurate calculator, consider turnover for 25% rate for small companies.
                incomeTax = taxableIncome * 0.30; 
                outputRegimeRow.addClass('hidden');
                outputDeductionsRow.addClass('hidden');
                outputRebateRow.addClass('hidden');

                // Surcharge for Domestic Company
                if (taxableIncome > 10000000 && taxableIncome <= 100000000) { // > ₹1 crore to ₹10 crore
                    surcharge = incomeTax * 0.07; // 7% surcharge
                } else if (taxableIncome > 100000000) { // > ₹10 crore
                    surcharge = incomeTax * 0.12; // 12% surcharge
                }
                if (surcharge > 0) outputSurchargeRow.removeClass('hidden');
                break;
        }

        // Health & Education Cess (4% on Income Tax + Surcharge)
        cess = (incomeTax + surcharge) * 0.04;
        totalTaxPayable = incomeTax + surcharge + cess;

        // --- Update Output Display ---
        outputAssesseeType.text(assesseeType.find('option:selected').text());
        outputGrossIncome.text('₹ ' + gti.toFixed(2));
        outputDeductions.text('₹ ' + deductions.toFixed(2));
        outputTaxableIncome.text('₹ ' + taxableIncome.toFixed(2));
        outputIncomeTax.text('₹ ' + incomeTax.toFixed(2));
        outputRebate.text('₹ ' + rebate87A.toFixed(2));
        outputSurcharge.text('₹ ' + surcharge.toFixed(2));
        outputCess.text('₹ ' + cess.toFixed(2));
        outputTotalTax.text('₹ ' + totalTaxPayable.toFixed(2));

        // Hide Surcharge and Rebate rows if values are 0
        if (surcharge === 0) outputSurchargeRow.addClass('hidden');
        if (rebate87A === 0) outputRebateRow.addClass('hidden');
    });

    // --- Reset Functionality ---
    resetFormBtn.click(function() {
        assesseeType.val('individual').trigger('change'); // Reset and trigger change to reset dependent fields
        residentStatus.val('resident').trigger('change');
        ageInput.val('');
        taxRegimeRadios.filter('[value="new"]').prop('checked', true);
        grossTotalIncomeInput.val('');
        deductionsInput.val(''); // Reset chapter VI-A deductions
        updateVisibility(); // Ensure correct fields are shown/hidden after reset
        resetOutput();
    });

    // Function to clear all output fields and hide conditional rows
    function resetOutput() {
        outputAssesseeType.text('');
        outputRegime.text('');
        outputGrossIncome.text('₹ 0.00');
        outputDeductions.text('₹ 0.00');
        outputTaxableIncome.text('₹ 0.00');
        outputIncomeTax.text('₹ 0.00');
        outputRebate.text('₹ 0.00');
        outputSurcharge.text('₹ 0.00');
        outputCess.text('₹ 0.00');
        outputTotalTax.text('₹ 0.00');

        outputRegimeRow.addClass('hidden');
        outputDeductionsRow.addClass('hidden');
        outputRebateRow.addClass('hidden');
        outputSurchargeRow.addClass('hidden');
    }
});
