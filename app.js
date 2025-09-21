import { Client, Account, ID, Databases, Query } from "https://cdn.skypack.dev/appwrite";
import { AW_CONFIG } from "./awcredentials.js";

// --- 1. CONFIGURATION ---
// All configuration has been moved to awcredentials.js

// --- 2. APPWRITE INITIALIZATION ---
const client = new Client();
client
    .setEndpoint(AW_CONFIG.ENDPOINT)
    .setProject(AW_CONFIG.PROJECT_ID);

const account = new Account(client);
const databases = new Databases(client);

// --- 3. STATE MANAGEMENT ---
const state = {
    currentUser: null,
    employees: [],
    selectedEmployeeId: null,
    batchDtrEmployees: [],
};

// --- 4. UI ELEMENTS ---
const loginView = document.getElementById('login-view');
const mainView = document.getElementById('main-view');
const workspacePlaceholder = document.getElementById('workspace-placeholder');
const employeeDetailsView = document.getElementById('employee-details-view');

const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const employeeModal = document.getElementById('employee-modal');
const employeeForm = document.getElementById('employee-form');
const payslipModal = document.getElementById('payslip-modal');
const dtrForm = document.getElementById('dtr-form');
const batchDtrModal = document.getElementById('batch-dtr-modal');
const addEmployeeSelect = document.getElementById('add-employee-select');
const dtrReportModal = document.getElementById('dtr-report-modal');
const paydayReportModal = document.getElementById('payday-report-modal');

// --- 5. AUTHENTICATION LOGIC ---

// Toggle between login and register forms
document.getElementById('show-register').addEventListener('click', (e) => {
    e.preventDefault();
    loginForm.classList.add('hidden');
    registerForm.classList.remove('hidden');
});

document.getElementById('show-login').addEventListener('click', (e) => {
    e.preventDefault();
    registerForm.classList.add('hidden');
    loginForm.classList.remove('hidden');
});

registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    try {
        await account.create(ID.unique(), email, password, name);
        await account.createEmailPasswordSession(email, password);
        await checkSession();
    } catch (error) {
        showNotification(error.message, true);
    }
});


loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    try {
        await account.createEmailPasswordSession(email, password);
        await checkSession();
    } catch (error) {
        showNotification(error.message, true);
    }
});

document.getElementById('logout-btn').addEventListener('click', async () => {
    try {
        await account.deleteSession('current');
        state.currentUser = null;
        updateUI();
    } catch (error) {
        showNotification(error.message, true);
    }
});

async function checkSession() {
    try {
        state.currentUser = await account.get();
        document.getElementById('user-email').textContent = state.currentUser.email;
    } catch (error) {
        state.currentUser = null;
    }
    updateUI();
}

// --- 6. UI LOGIC ---
// Helper function to format a Date object to 'YYYY-MM-DD' string
function toYYYYMMDD(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

const formatCurrency = (num) => `₱ ${num.toFixed(2)}`;

function updateUI() {
    if (state.currentUser) {
        loginView.classList.add('hidden');
        mainView.classList.remove('hidden');
        fetchEmployees();
    } else {
        mainView.classList.add('hidden');
        loginView.classList.remove('hidden');
        document.getElementById('employee-list').innerHTML = '';
    }
}

function showNotification(message, isError = false) {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.classList.remove('bg-green-500', 'bg-red-500', 'translate-y-20', 'opacity-0');
    notification.classList.add(isError ? 'bg-red-500' : 'bg-green-500', 'opacity-100', 'translate-y-0');
    
    setTimeout(() => {
         notification.classList.remove('opacity-100', 'translate-y-0');
         notification.classList.add('translate-y-20', 'opacity-0');
    }, 3000);
}

function toggleModal(modal, show) {
    if (show) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    } else {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

// --- 7. EMPLOYEE MANAGEMENT ---
async function fetchEmployees() {
    if (!state.currentUser) return;
    const employeeListEl = document.getElementById('employee-list');
    try {
        const response = await databases.listDocuments(
            AW_CONFIG.DATABASE_ID,
            AW_CONFIG.EMPLOYEES_COLLECTION_ID,
            [Query.equal('userID', state.currentUser.$id)]
        );
        state.employees = response.documents;
        renderEmployeeList();
    } catch (error) {
        showNotification("Could not fetch employees.", true);
        employeeListEl.innerHTML = '<p class="text-red-500">Error loading employees.</p>';
    }
}

function renderEmployeeList() {
    const employeeListEl = document.getElementById('employee-list');
    if (state.employees.length === 0) {
        employeeListEl.innerHTML = '<p class="text-gray-500">No employees found. Add one to get started!</p>';
        return;
    }
    employeeListEl.innerHTML = state.employees.map(emp => `
        <div id="emp-${emp.$id}" class="flex items-center justify-between p-3 rounded-md border ${state.selectedEmployeeId === emp.$id ? 'bg-blue-100 border-blue-500' : 'bg-white hover:bg-gray-50'}">
            <div class="employee-details cursor-pointer flex-grow" data-id="${emp.$id}">
                <p class="font-semibold text-gray-900">${emp.fullName}</p>
                <p class="text-sm text-gray-500">${emp.position}</p>
            </div>
            <button class="edit-employee-btn p-1 text-gray-400 hover:text-blue-600" data-id="${emp.$id}" aria-label="Edit employee">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
                    <path fill-rule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clip-rule="evenodd" />
                </svg>
            </button>
        </div>
    `).join('');

    // Add event listeners to new items
    document.querySelectorAll('.employee-details').forEach(item => {
        item.addEventListener('click', () => handleSelectEmployee(item.dataset.id));
    });

    document.querySelectorAll('.edit-employee-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevents the employee from being selected
            handleEditEmployee(button.dataset.id);
        });
    });
}

function handleSelectEmployee(employeeId) {
    state.selectedEmployeeId = employeeId;
    renderEmployeeList(); // Re-render to show selection
    workspacePlaceholder.classList.add('hidden');
    employeeDetailsView.classList.remove('hidden');

    const selectedEmployee = state.employees.find(e => e.$id === employeeId);
    document.getElementById('dtr-employee-name').textContent = selectedEmployee.fullName;
    document.getElementById('payroll-employee-name').textContent = selectedEmployee.fullName;
}

function handleEditEmployee(employeeId) {
    const employee = state.employees.find(e => e.$id === employeeId);
    if (!employee) return;

    document.getElementById('employee-modal-title').textContent = "Edit Employee";
    document.getElementById('employee-id').value = employee.$id;
    document.getElementById('employee-name').value = employee.fullName;
    document.getElementById('employee-position').value = employee.position;
    document.getElementById('employee-rate').value = employee.dailyRate;

    toggleModal(employeeModal, true);
}


// Employee Modal listeners
document.getElementById('add-employee-btn').addEventListener('click', () => {
    employeeForm.reset();
    document.getElementById('employee-id').value = '';
    document.getElementById('employee-modal-title').textContent = "Add Employee";
    toggleModal(employeeModal, true);
});

document.getElementById('cancel-employee-btn').addEventListener('click', () => {
    toggleModal(employeeModal, false);
});

employeeForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const employeeId = document.getElementById('employee-id').value;
    const payload = {
        fullName: document.getElementById('employee-name').value,
        position: document.getElementById('employee-position').value,
        dailyRate: parseFloat(document.getElementById('employee-rate').value),
    };

    try {
        if (employeeId) {
            await databases.updateDocument(
                AW_CONFIG.DATABASE_ID,
                AW_CONFIG.EMPLOYEES_COLLECTION_ID,
                employeeId,
                payload
            );
            showNotification('Employee updated successfully!');
        } else {
            payload.userID = state.currentUser.$id; // Add userID only for new employees
            await databases.createDocument(
                AW_CONFIG.DATABASE_ID,
                AW_CONFIG.EMPLOYEES_COLLECTION_ID,
                ID.unique(),
                payload
            );
            showNotification('Employee added successfully!');
        }
        toggleModal(employeeModal, false);
        fetchEmployees();
    } catch (error) {
        showNotification(error.message, true);
    }
});


// --- 8. DTR & PAYROLL LOGIC ---
dtrForm.addEventListener('submit', async(e) => {
    e.preventDefault();
    if(!state.selectedEmployeeId) {
        showNotification("Please select an employee first.", true);
        return;
    }

    const employee = state.employees.find(emp => emp.$id === state.selectedEmployeeId);
    if (!employee) {
        showNotification("Selected employee not found.", true);
        return;
    }

    const workDate = document.getElementById('dtr-date').value;
    const clockInTime = document.getElementById('dtr-clock-in').value;
    const clockOutTime = document.getElementById('dtr-clock-out').value;
    
    if (!workDate || !clockInTime || !clockOutTime) {
        showNotification("Please fill all time fields.", true);
        return;
    }
    
    const workDateISO = new Date(workDate).toISOString();
    const clockInISO = new Date(`${workDate}T${clockInTime}`).toISOString();
    const clockOutISO = new Date(`${workDate}T${clockOutTime}`).toISOString();

    try {
        // CHECK FOR DUPLICATES FIRST
        const existingResponse = await databases.listDocuments(
            AW_CONFIG.DATABASE_ID,
            AW_CONFIG.TIME_RECORDS_COLLECTION_ID,
            [
                Query.equal('employeeID', state.selectedEmployeeId),
                Query.equal('workDate', workDateISO)
            ]
        );

        if (existingResponse.total > 0) {
            showNotification("A DTR entry already exists for this employee on this date.", true);
            return;
        }

        // If no duplicates, proceed to create
        await databases.createDocument(
            AW_CONFIG.DATABASE_ID,
            AW_CONFIG.TIME_RECORDS_COLLECTION_ID,
            ID.unique(),
            {
                employeeID: state.selectedEmployeeId,
                clockIn: clockInISO,
                clockOut: clockOutISO,
                workDate: workDateISO,
                userID: state.currentUser.$id,
                dailyRate: employee.dailyRate // Snapshot the rate
            }
        );
        showNotification('Time record saved!');
        dtrForm.reset();
    } catch (error) {
         showNotification(error.message, true);
    }
});

document.getElementById('calculate-payroll-btn').addEventListener('click', async () => {
    if (!state.selectedEmployeeId) {
        showNotification("Please select an employee first.", true);
        return;
    }
    
    const startDate = document.getElementById('period-start').value;
    const endDate = document.getElementById('period-end').value;

    if (!startDate || !endDate) {
        showNotification("Please select a period start and end date.", true);
        return;
    }

    const startISO = new Date(startDate).toISOString();
    const endISO = new Date(endDate).toISOString();

    try {
        const response = await databases.listDocuments(
            AW_CONFIG.DATABASE_ID,
            AW_CONFIG.TIME_RECORDS_COLLECTION_ID,
            [
                Query.equal('employeeID', state.selectedEmployeeId),
                Query.greaterThanEqual('workDate', startISO),
                Query.lessThanEqual('workDate', endISO)
            ]
        );

        const employee = state.employees.find(e => e.$id === state.selectedEmployeeId);
        const payslipData = calculatePayroll(employee, response.documents);
        displayPayslip(payslipData, employee, startDate, endDate);
        
    } catch (error) {
        showNotification(error.message, true);
    }
});

function calculatePayroll(employee, timeRecords) {
    let totalRegularHours = 0;
    let totalOtHours = 0;
    let totalRegularPay = 0;
    let totalOvertimePay = 0;

    timeRecords.forEach(record => {
        // Use the dailyRate from the time record, not the employee object
        const hourlyRate = record.dailyRate / 8;
        const otRate = hourlyRate; // No overtime differential

        const clockIn = new Date(record.clockIn);
        const clockOut = new Date(record.clockOut);
        let hoursWorked = (clockOut - clockIn) / 1000 / 60 / 60;
        
        // Assuming 1 hour lunch break for shifts > 5 hours
        if(hoursWorked > 5) hoursWorked -= 1;
        
        let regularHoursToday = 0;
        let otHoursToday = 0;

        if (hoursWorked > 8) {
            regularHoursToday = 8;
            otHoursToday = hoursWorked - 8;
        } else {
            regularHoursToday = hoursWorked;
        }

        totalRegularHours += regularHoursToday;
        totalOtHours += otHoursToday;
        totalRegularPay += regularHoursToday * hourlyRate;
        totalOvertimePay += otHoursToday * otRate;
    });

    const grossPay = totalRegularPay + totalOvertimePay;

    // Simplified deductions (for demonstration)
    const sss = grossPay * 0.045; 
    const philhealth = grossPay * 0.02;
    const pagibig = 100;
    const totalDeductions = sss + philhealth + pagibig;
    
    const netPay = grossPay - totalDeductions;

    return {
        regularHours: totalRegularHours,
        otHours: totalOtHours,
        regularPay: totalRegularPay,
        overtimePay: totalOvertimePay,
        grossPay,
        sss,
        philhealth,
        pagibig,
        totalDeductions,
        netPay
    };
}

function displayPayslip(data, employee, startDate, endDate) {
    const contentEl = document.getElementById('payslip-content');
    
    contentEl.innerHTML = `
        <div id="payslip-to-print">
            <h2 class="text-2xl font-bold text-center mb-2">Payslip</h2>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-sm mb-4 border-b pb-4">
                <div><strong>Employee:</strong> ${employee.fullName}</div>
                <div><strong>Position:</strong> ${employee.position}</div>
                <div><strong>Pay Period:</strong> ${startDate} to ${endDate}</div>
                <div><strong>Current Daily Rate:</strong> ${formatCurrency(employee.dailyRate)}</div>
            </div>
            
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
                <div>
                    <h3 class="text-lg font-semibold text-green-600 mb-2">Earnings</h3>
                    <div class="space-y-1 text-sm">
                        <div class="flex justify-between"><span>Regular Pay (${data.regularHours.toFixed(2)} hrs)</span> <span>${formatCurrency(data.regularPay)}</span></div>
                        <div class="flex justify-between"><span>Overtime Pay (${data.otHours.toFixed(2)} hrs)</span> <span>${formatCurrency(data.overtimePay)}</span></div>
                        <hr class="my-1">
                        <div class="flex justify-between font-bold"><span>Gross Pay</span> <span>${formatCurrency(data.grossPay)}</span></div>
                    </div>
                </div>
                <div>
                    <h3 class="text-lg font-semibold text-red-600 mb-2">Deductions</h3>
                     <div class="space-y-1 text-sm">
                        <div class="flex justify-between"><span>SSS Contribution</span> <span>${formatCurrency(data.sss)}</span></div>
                        <div class="flex justify-between"><span>PhilHealth</span> <span>${formatCurrency(data.philhealth)}</span></div>
                        <div class="flex justify-between"><span>Pag-IBIG</span> <span>${formatCurrency(data.pagibig)}</span></div>
                        <hr class="my-1">
                        <div class="flex justify-between font-bold"><span>Total Deductions</span> <span>${formatCurrency(data.totalDeductions)}</span></div>
                    </div>
                </div>
            </div>
            
            <div class="mt-6 pt-4 border-t-2 border-gray-900">
                <div class="flex justify-between items-center text-xl font-bold">
                    <span>Net Pay</span>
                    <span>${formatCurrency(data.netPay)}</span>
                </div>
            </div>
        </div>
    `;
    
    toggleModal(payslipModal, true);
}

document.getElementById('close-payslip-btn').addEventListener('click', () => {
    toggleModal(payslipModal, false);
});

document.getElementById('print-payslip-btn').addEventListener('click', () => {
    const printContent = document.getElementById('payslip-to-print').innerHTML;
    const originalContent = document.body.innerHTML;
    document.body.innerHTML = printContent;
    window.print();
    document.body.innerHTML = originalContent;
    // This is a simple print method. For a robust app, you'd re-initialize event listeners after this.
    // For now, we just refresh the page to get back to a working state.
    window.location.reload(); 
});

// --- 9. BATCH DTR LOGIC ---
const weekStartDateInput = document.getElementById('week-start-date');
const batchDtrHeader = document.getElementById('batch-dtr-header');
const batchDtrBody = document.getElementById('batch-dtr-body');

// Open the modal
document.getElementById('batch-dtr-btn').addEventListener('click', () => {
    // Initialize with an empty employee list
    state.batchDtrEmployees = [];
    
    // Set default date to the last Sunday
    const today = new Date();
    today.setDate(today.getDate() - today.getDay());
    weekStartDateInput.value = toYYYYMMDD(today);
    
    renderBatchDtrModal();
    toggleModal(batchDtrModal, true);
});

// Close the modal
document.getElementById('cancel-batch-dtr-btn').addEventListener('click', () => {
    toggleModal(batchDtrModal, false);
});

// Re-render table when date changes
weekStartDateInput.addEventListener('change', () => {
    // We only need to re-render the table, not the whole modal,
    // as the employee list doesn't change with the date.
    setupBatchDtrTable();
});

function renderBatchDtrModal() {
    setupBatchDtrTable();
    populateAddEmployeeDropdown();
}

function populateAddEmployeeDropdown() {
    const availableEmployees = state.employees.filter(emp => 
        !state.batchDtrEmployees.some(batchEmp => batchEmp.$id === emp.$id)
    );

    if (availableEmployees.length === 0) {
        addEmployeeSelect.innerHTML = '<option disabled selected>All employees added</option>';
        document.getElementById('add-employee-to-batch-btn').disabled = true;
    } else {
        addEmployeeSelect.innerHTML = availableEmployees.map(emp => 
            `<option value="${emp.$id}">${emp.fullName}</option>`
        ).join('');
        document.getElementById('add-employee-to-batch-btn').disabled = false;
    }
}

function setupBatchDtrTable() {
    // Get and adjust the selected date to the previous Sunday
    let selectedDate = new Date(weekStartDateInput.value + 'T00:00:00'); // Interprets date as local midnight
    if (isNaN(selectedDate)) return;

    if (selectedDate.getDay() !== 0) {
        selectedDate.setDate(selectedDate.getDate() - selectedDate.getDay());
        weekStartDateInput.value = toYYYYMMDD(selectedDate);
    }
    
    const startDate = selectedDate;
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    // 1. Setup Header
    let headerHtml = `<th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>`;
    for (let i = 0; i < 7; i++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + i);
        headerHtml += `<th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">${days[i]}<br>${currentDate.toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}</th>`;
    }
    headerHtml += `<th scope="col" class="relative px-6 py-3"><span class="sr-only">Actions</span></th>`;
    batchDtrHeader.innerHTML = headerHtml;

    // 2. Setup Body
    if (state.batchDtrEmployees.length === 0) {
        batchDtrBody.innerHTML = `<tr><td colspan="9" class="text-center py-4">No employees added to this timesheet.</td></tr>`;
        return;
    }

    let bodyHtml = '';
    state.batchDtrEmployees.forEach(employee => {
        bodyHtml += `<tr data-employee-id="${employee.$id}">`;
        bodyHtml += `<td class="px-6 py-4 whitespace-nowrap"><div class="text-sm font-medium text-gray-900">${employee.fullName}</div></td>`;
        for (let i = 0; i < 7; i++) {
            bodyHtml += `<td class="px-2 py-1"><input type="number" class="w-20 p-2 border border-gray-300 rounded-md" min="0" max="24" step="0.25"></td>`;
        }
        bodyHtml += `<td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button class="remove-from-batch-btn text-red-600 hover:text-red-900" data-id="${employee.$id}">Remove</button>
                    </td>`;
        bodyHtml += `</tr>`;
    });
    batchDtrBody.innerHTML = bodyHtml;
}

async function handleSaveBatchDtr() {
    const startDate = new Date(weekStartDateInput.value + 'T00:00:00');
    const rows = batchDtrBody.querySelectorAll('tr');
    const dtrPromises = [];
    let skippedCount = 0;
    let createdCount = 0;

    // Use a for...of loop to allow await inside
    for (const row of rows) {
        const employeeId = row.dataset.employeeId;
        if (!employeeId) continue;

        const employee = state.employees.find(e => e.$id === employeeId);
        if (!employee) continue;

        const inputs = row.querySelectorAll('input');
        
        for (const [dayIndex, input] of Array.from(inputs).entries()) {
            const hoursWorked = parseFloat(input.value);

            if (hoursWorked && hoursWorked > 0) {
                const workDate = new Date(startDate);
                workDate.setDate(startDate.getDate() + dayIndex);
                const workDateISO = workDate.toISOString();

                // CHECK FOR DUPLICATES
                try {
                    const existingResponse = await databases.listDocuments(
                        AW_CONFIG.DATABASE_ID,
                        AW_CONFIG.TIME_RECORDS_COLLECTION_ID,
                        [
                            Query.equal('employeeID', employeeId),
                            Query.equal('workDate', workDateISO)
                        ]
                    );

                    if (existingResponse.total > 0) {
                        skippedCount++;
                        continue; // Skip this entry
                    }
                } catch (error) {
                    showNotification(`Error checking for duplicates: ${error.message}`, true);
                    return; // Stop the whole process if DB check fails
                }
                
                const clockIn = new Date(workDate);
                clockIn.setHours(8, 0, 0, 0);
                const duration = hoursWorked + (hoursWorked > 5 ? 1 : 0);
                const clockOut = new Date(clockIn.getTime() + duration * 60 * 60 * 1000);
                const payload = {
                    employeeID: employeeId,
                    clockIn: clockIn.toISOString(),
                    clockOut: clockOut.toISOString(),
                    workDate: workDateISO,
                    userID: state.currentUser.$id,
                    dailyRate: employee.dailyRate
                };
                dtrPromises.push(databases.createDocument(
                    AW_CONFIG.DATABASE_ID,
                    AW_CONFIG.TIME_RECORDS_COLLECTION_ID,
                    ID.unique(),
                    payload
                ));
                createdCount++;
            }
        }
    }

    if (createdCount === 0) {
        if(skippedCount > 0){
             showNotification(`${skippedCount} duplicate DTR entries were skipped. No new entries were added.`, true);
        } else {
            showNotification("No hours entered.", true);
        }
        return;
    }

    try {
        await Promise.all(dtrPromises);
        let message = `${createdCount} DTR records saved successfully!`;
        if (skippedCount > 0) {
            message += ` ${skippedCount} duplicates were skipped.`;
        }
        showNotification(message);
        toggleModal(batchDtrModal, false);
    } catch (error) {
        showNotification(error.message, true);
    }
}


// Add event listener for the save button
document.getElementById('save-batch-dtr-btn').addEventListener('click', handleSaveBatchDtr);

// Add employee to the timesheet table
document.getElementById('add-employee-to-batch-btn').addEventListener('click', () => {
    const selectedId = addEmployeeSelect.value;
    if (!selectedId) return;

    const employeeToAdd = state.employees.find(emp => emp.$id === selectedId);
    if (employeeToAdd) {
        state.batchDtrEmployees.push(employeeToAdd);
        // Sort the array to maintain a consistent order
        state.batchDtrEmployees.sort((a, b) => a.fullName.localeCompare(b.fullName));
        renderBatchDtrModal();
    }
});

// Remove employee from the timesheet table (using event delegation)
batchDtrBody.addEventListener('click', (e) => {
    if (e.target.classList.contains('remove-from-batch-btn')) {
        const employeeIdToRemove = e.target.dataset.id;
        state.batchDtrEmployees = state.batchDtrEmployees.filter(emp => emp.$id !== employeeIdToRemove);
        renderBatchDtrModal();
    }
});


// --- 10. REPORTING LOGIC ---
const dtrReportBtn = document.getElementById('dtr-report-btn');
const paydayReportBtn = document.getElementById('payday-report-btn');
const generateDtrReportBtn = document.getElementById('generate-dtr-report-btn');
const closeDtrReportBtn = document.getElementById('close-dtr-report-btn');
const generatePaydayReportBtn = document.getElementById('generate-payday-report-btn');
const closePaydayReportBtn = document.getElementById('close-payday-report-btn');
const paydayReportWeekInput = document.getElementById('payday-report-week');

// Open DTR Report Modal
dtrReportBtn.addEventListener('click', () => {
    if (!state.selectedEmployeeId) {
        showNotification("Please select an employee to generate a report.", true);
        return;
    }
    const employee = state.employees.find(e => e.$id === state.selectedEmployeeId);
    document.getElementById('dtr-report-employee-name').textContent = employee.fullName;
    document.getElementById('dtr-calendar-view').innerHTML = '';
    toggleModal(dtrReportModal, true);
});

closeDtrReportBtn.addEventListener('click', () => toggleModal(dtrReportModal, false));

// Generate and Render DTR Calendar
generateDtrReportBtn.addEventListener('click', async () => {
    const startDate = document.getElementById('report-start-date').value;
    const endDate = document.getElementById('report-end-date').value;

    if (!startDate || !endDate) {
        showNotification("Please select both a start and end date.", true);
        return;
    }

    try {
        const response = await databases.listDocuments(
            AW_CONFIG.DATABASE_ID,
            AW_CONFIG.TIME_RECORDS_COLLECTION_ID,
            [
                Query.equal('employeeID', state.selectedEmployeeId),
                Query.greaterThanEqual('workDate', new Date(startDate).toISOString()),
                Query.lessThanEqual('workDate', new Date(endDate).toISOString())
            ]
        );
        renderDtrCalendar(response.documents, new Date(startDate), new Date(endDate));
    } catch (error) {
        showNotification(error.message, true);
    }
});

function renderDtrCalendar(records, startDate, endDate) {
    const calendarView = document.getElementById('dtr-calendar-view');
    const recordsByDate = {};

    records.forEach(rec => {
        const dateStr = toYYYYMMDD(new Date(rec.workDate));
        const clockIn = new Date(rec.clockIn);
        const clockOut = new Date(rec.clockOut);
        let hoursWorked = (clockOut - clockIn) / 1000 / 60 / 60;
        if(hoursWorked > 5) hoursWorked -= 1;
        
        recordsByDate[dateStr] = (recordsByDate[dateStr] || 0) + hoursWorked;
    });

    calendarView.innerHTML = '';
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    days.forEach(day => {
        calendarView.innerHTML += `<div class="font-bold p-2 bg-gray-200 rounded-t-md">${day}</div>`;
    });

    let currentDate = new Date(startDate);
    const firstDayOfWeek = startDate.getDay();

    for (let i = 0; i < firstDayOfWeek; i++) {
        calendarView.innerHTML += `<div></div>`;
    }

    while (currentDate <= endDate) {
        const dateStr = toYYYYMMDD(currentDate);
        const hours = recordsByDate[dateStr];
        let content = `<div class="font-semibold">${currentDate.getDate()}</div>`;
        if (hours) {
            content += `<div class="text-xs text-green-600 font-bold">${hours.toFixed(2)} hrs</div>`;
        }

        calendarView.innerHTML += `<div class="border p-2 rounded-md h-20 ${hours ? 'bg-green-50' : 'bg-white'}">${content}</div>`;
        currentDate.setDate(currentDate.getDate() + 1);
    }
}

// Open Payday Report Modal
paydayReportBtn.addEventListener('click', () => {
    // Set default date to the current week's Sunday
    const today = new Date();
    today.setDate(today.getDate() - today.getDay());
    paydayReportWeekInput.value = toYYYYMMDD(today);
    document.getElementById('payday-report-body').innerHTML = '';
    toggleModal(paydayReportModal, true);
});

closePaydayReportBtn.addEventListener('click', () => toggleModal(paydayReportModal, false));

// Generate and Render Weekly Payday Report
generatePaydayReportBtn.addEventListener('click', async () => {
    let selectedDate = new Date(paydayReportWeekInput.value + 'T00:00:00');
    if (isNaN(selectedDate)) {
        showNotification("Please select a valid week.", true);
        return;
    }
    
    // Snap to Sunday of the selected week
    selectedDate.setDate(selectedDate.getDate() - selectedDate.getDay());
    const startDate = new Date(selectedDate);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);

    const startISO = startDate.toISOString();
    const endISO = endDate.toISOString();

    const reportBody = document.getElementById('payday-report-body');
    reportBody.innerHTML = '<tr><td colspan="5" class="text-center p-4">Generating report...</td></tr>';

    try {
        const reportDataPromises = state.employees.map(async (employee) => {
            const response = await databases.listDocuments(
                AW_CONFIG.DATABASE_ID,
                AW_CONFIG.TIME_RECORDS_COLLECTION_ID,
                [
                    Query.equal('employeeID', employee.$id),
                    Query.greaterThanEqual('workDate', startISO),
                    Query.lessThanEqual('workDate', endISO)
                ]
            );

            if (response.documents.length > 0) {
                const payroll = calculatePayroll(employee, response.documents);
                return {
                    name: employee.fullName,
                    totalHours: payroll.regularHours + payroll.otHours,
                    grossPay: payroll.grossPay,
                    totalDeductions: payroll.totalDeductions,
                    netPay: payroll.netPay,
                };
            }
            return null;
        });

        const results = await Promise.all(reportDataPromises);
        const reportData = results.filter(item => item !== null); // Filter out employees with no work
        
        renderPaydayReportTable(reportData);

    } catch (error) {
        showNotification(error.message, true);
        reportBody.innerHTML = `<tr><td colspan="5" class="text-center p-4 text-red-500">Error generating report.</td></tr>`;
    }
});

function renderPaydayReportTable(data) {
    const reportBody = document.getElementById('payday-report-body');
    if (data.length === 0) {
        reportBody.innerHTML = '<tr><td colspan="5" class="text-center p-4">No payroll data for this week.</td></tr>';
        return;
    }
    
    reportBody.innerHTML = data.map(item => `
        <tr>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${item.name}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${item.totalHours.toFixed(2)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${formatCurrency(item.grossPay)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${formatCurrency(item.totalDeductions)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">${formatCurrency(item.netPay)}</td>
        </tr>
    `).join('');
}


// --- 11. INITIAL LOAD ---
checkSession();

