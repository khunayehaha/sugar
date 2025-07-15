// script.js

// --- DOM Elements ---
// Ensure these IDs match those in your index.html
const addCaseBtn = document.getElementById('addCaseBtn');
const caseModal = document.getElementById('caseModal');
const caseForm = document.getElementById('caseForm');
const modalTitle = document.getElementById('modalTitle');
const farmerNameInput = document.getElementById('farmerName');
const farmerAccountNoInput = document.getElementById('farmerAccountNo');
const cabinetNoInput = document.getElementById('cabinetNo');
const shelfNoInput = document.getElementById('shelfNo');
const sequenceNoInput = document.getElementById('sequenceNo');
const caseIdInput = document.getElementById('caseId'); // Hidden field for editing
const caseList = document.getElementById('caseList'); // Table tbody
const noResultsMessage = document.getElementById('noResults');

const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const clearSearchBtn = document.getElementById('clearSearchBtn');

// Borrow/Return Modal Elements
const borrowReturnModal = document.getElementById('borrowReturnModal');
const borrowReturnModalTitle = document.getElementById('borrowReturnModalTitle');
const currentFarmerNameSpan = document.getElementById('currentFarmerName');
const currentFarmerAccountNoSpan = document.getElementById('currentFarmerAccountNo');
const currentCaseStatusSpan = document.getElementById('currentCaseStatus');
const borrowerNameInput = document.getElementById('borrowerName');
const borrowReturnCaseIdInput = document.getElementById('borrowReturnCaseId');
const confirmBorrowReturnBtn = document.getElementById('confirmBorrowReturnBtn');
const borrowReturnForm = document.getElementById('borrowReturnForm');

// Admin Password Modal Elements
const adminPasswordModal = document.getElementById('adminPasswordModal');
const adminPasswordInput = document.getElementById('adminPasswordInput');
const adminPasswordForm = document.getElementById('adminPasswordForm');

// --- Global Variables ---
// Define the Backend API URL
// When Frontend and Backend run on the same Render Service,
// use a Relative Path without the full domain.
const API_BASE_URL = ''; 

// Variables to store context for admin password actions
let currentAdminAction = null; // 'edit_save' or 'delete'
let currentAdminCaseId = null;
let currentAdminCaseData = null; // Used for 'edit_save' action

// --- Utility Functions ---

function formatDate(dateString) {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        // Check if it's an Invalid Date object
        if (isNaN(date.getTime())) {
            console.warn("Invalid date string provided to formatDate:", dateString);
            return 'Invalid Date';
        }
        return date.toLocaleDateString('th-TH', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (e) {
        console.error("Error formatting date:", e, "for string:", dateString);
        return 'Error Date';
    }
}

// --- Main Render Function ---
function renderCases(casesToDisplay) {
    caseList.innerHTML = ''; // Clear old content in the table

    if (!casesToDisplay || casesToDisplay.length === 0) { // Check if casesToDisplay is null/undefined or empty
        noResultsMessage.style.display = 'block';
        return;
    } else {
        noResultsMessage.style.display = 'none';
    }

    casesToDisplay.forEach(c => {
        const row = caseList.insertRow();
        row.dataset.caseId = c.id;

        // Check if c.farmer_name has a value before using it
        row.insertCell().textContent = c.farmer_name || 'ไม่ระบุชื่อ'; 
        row.insertCell().textContent = c.farmer_account_no || 'ไม่ระบุเลขบัญชี';
        row.insertCell().textContent = c.cabinet_no !== undefined ? c.cabinet_no : 'ไม่ระบุ';
        row.insertCell().textContent = c.shelf_no !== undefined ? c.shelf_no : 'ไม่ระบุ';
        row.insertCell().textContent = c.sequence_no !== undefined ? c.sequence_no : 'ไม่ระบุ';

        const statusCell = row.insertCell();
        const statusBadge = document.createElement('span');
        statusBadge.classList.add('status-badge');
        if (c.status === "In Room") {
            statusBadge.classList.add('in-room');
            statusBadge.textContent = 'อยู่ในห้องสำนวน';
        } else if (c.status === "Borrowed") { // Add condition for clarity
            statusBadge.classList.add('borrowed');
            statusBadge.textContent = 'ถูกเบิกไป';
        } else { // Case where status does not match expected
            statusBadge.classList.add('unknown-status');
            statusBadge.textContent = 'ไม่ทราบสถานะ';
        }
        statusCell.appendChild(statusBadge);

        const borrowerDateCell = row.insertCell();
        let borrowerInfo = '';
        if (c.status === "Borrowed") {
            borrowerInfo = `เบิกโดย: ${c.borrowed_by_user_name || 'ไม่ระบุ'}<br>เมื่อ: ${formatDate(c.borrowed_date)}`;
        } else if (c.status === "In Room" && c.returned_date) {
            const lastBorrower = c.borrowed_by_user_name || 'ไม่ระบุ'; // Use previous borrower name for returned cases
            borrowerInfo = `คืนแล้วโดย: ${lastBorrower}<br>เมื่อ: ${formatDate(c.returned_date)}`;
        } else {
            borrowerInfo = 'ไม่มีข้อมูลการเบิก/คืน';
        }
        borrowerDateCell.innerHTML = borrowerInfo;

        const actionsCell = row.insertCell();
        const actionDiv = document.createElement('div');
        actionDiv.classList.add('action-buttons');

        const editBtn = document.createElement('button');
        editBtn.textContent = 'แก้ไข';
        editBtn.classList.add('edit-btn');
        editBtn.onclick = () => openEditCaseModal(c.id);
        actionDiv.appendChild(editBtn);

        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'ลบ';
        deleteBtn.classList.add('delete-btn');
        deleteBtn.onclick = () => deleteCase(c.id);
        actionDiv.appendChild(deleteBtn);

        if (c.status === "In Room") {
            const borrowBtn = document.createElement('button');
            borrowBtn.textContent = 'เบิก';
            borrowBtn.classList.add('borrow-btn');
            borrowBtn.onclick = () => openBorrowReturnModal(c.id, 'borrow');
            actionDiv.appendChild(borrowBtn);
        } else if (c.status === "Borrowed") { // Add condition for return button
            const returnBtn = document.createElement('button');
            returnBtn.textContent = 'คืน';
            returnBtn.classList.add('return-btn');
            returnBtn.onclick = () => openBorrowReturnModal(c.id, 'return');
            actionDiv.appendChild(returnBtn);
        }
        actionsCell.appendChild(actionDiv);
    });
}

// --- Fetch Cases from Backend ---
async function fetchCases() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/cases`); 
        if (!response.ok) {
            // Check HTTP status code and display appropriate message
            const errorText = await response.text(); // Try to read error message from response
            throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
        }
        const data = await response.json();
        renderCases(data); // Render data fetched from backend
        return data; // Return all cases for search to use
    } catch (error) {
        console.error("Error fetching cases:", error);
        alert(`ไม่สามารถดึงข้อมูลแฟ้มคดีได้: ${error.message} กรุณาลองใหม่ในภายหลัง`);
        renderCases([]); // Clear table if error
        return [];
    }
}

// --- Add/Edit Case Functions ---

function openAddCaseModal() {
    modalTitle.textContent = 'เพิ่มแฟ้มคดีใหม่';
    caseForm.reset(); // Clear previous form data
    caseIdInput.value = ''; // Clear hidden ID
    caseModal.classList.add('active'); // Show modal
}

async function openEditCaseModal(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/cases/${id}`);
        if (!response.ok) {
            const errorData = await response.json(); // Attempt to read JSON error
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.message || response.statusText}`);
        }
        const caseToEdit = await response.json();
        
        modalTitle.textContent = 'แก้ไขข้อมูลแฟ้มคดี';
        farmerNameInput.value = caseToEdit.farmer_name || '';
        farmerAccountNoInput.value = caseToEdit.farmer_account_no || '';
        cabinetNoInput.value = caseToEdit.cabinet_no !== undefined ? caseToEdit.cabinet_no : '';
        shelfNoInput.value = caseToEdit.shelf_no !== undefined ? caseToEdit.shelf_no : '';
        sequenceNoInput.value = caseToEdit.sequence_no !== undefined ? caseToEdit.sequence_no : '';
        caseIdInput.value = caseToEdit.id;
        
        // Open the main edit modal directly. Password check will happen on save.
        caseModal.classList.add('active');

    } catch (error) {
        console.error("Error fetching case for edit:", error);
        alert(`ไม่สามารถโหลดข้อมูลเพื่อแก้ไขได้: ${error.message}`);
    }
}

// Function to perform the actual case update after password verification
async function performUpdateCase(caseId, caseData, adminPassword) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/cases/${caseId}`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'X-Admin-Password': adminPassword // Send password in Header
            },
            body: JSON.stringify(caseData) // body no longer contains password
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.message || response.statusText}`);
        }
        
        alert('แก้ไขข้อมูลแฟ้มคดีเรียบร้อยแล้ว');
        
        fetchCases(); // Re-fetch and re-render all cases from backend
        closeModal(caseModal); // Close the original case edit modal
        closeModal(adminPasswordModal); // Close password modal
    } catch (error) {
        console.error("Error saving case:", error);
        alert(`เกิดข้อผิดพลาดในการบันทึกข้อมูล: ${error.message} กรุณาลองใหม่`);
    }
}


async function saveCase(event) {
    event.preventDefault();

    const farmerName = farmerNameInput.value.trim();
    const farmerAccountNo = farmerAccountNoInput.value.trim();
    const cabinetNo = parseInt(cabinetNoInput.value);
    const shelfNo = parseInt(shelfNoInput.value);
    const sequenceNo = parseInt(sequenceNoInput.value);
    const caseId = caseIdInput.value; // Will have a value if editing

    if (!farmerName || !farmerAccountNo || isNaN(cabinetNo) || isNaN(shelfNo) || isNaN(sequenceNo)) {
        alert('กรุณากรอกข้อมูลให้ครบถ้วนและถูกต้อง (หมายเลขตู้, ชั้น, ลำดับ ต้องเป็นตัวเลข)');
        return;
    }

    const caseData = {
        farmer_name: farmerName,
        farmer_account_no: farmerAccountNo,
        cabinet_no: cabinetNo,
        shelf_no: shelfNo,
        sequence_no: sequenceNo
    };

    if (caseId) { // Editing existing case
        // Store current form data and open admin password modal for verification
        currentAdminAction = 'edit_save';
        currentAdminCaseId = caseId;
        currentAdminCaseData = caseData; // Store the updated data from the form
        closeModal(caseModal); // Close the main edit modal temporarily
        openAdminPasswordModal(); // Open password modal
    } else { // Adding new case (no password required)
        try {
            const response = await fetch(`${API_BASE_URL}/api/cases`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(caseData)
            });
            
            if (!response.ok) {
                const errorData = await response.json(); 
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.message || response.statusText}`);
            }
            
            alert('เพิ่มแฟ้มคดีใหม่เรียบร้อยแล้ว');
            
            fetchCases(); // Re-fetch and re-render all cases from backend
            closeModal(caseModal);
        } catch (error) {
            console.error("Error saving case:", error);
            alert(`เกิดข้อผิดพลาดในการบันทึกข้อมูล: ${error.message} กรุณาลองใหม่`);
        }
    }
}

async function deleteCase(id) {
    // Open admin password modal before attempting deletion
    currentAdminAction = 'delete';
    currentAdminCaseId = id;
    openAdminPasswordModal();
}

// Function to perform the actual case deletion after password verification
async function performDeleteCase(caseId, adminPassword) {
    if (confirm('คุณต้องการลบแฟ้มคดีนี้หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้')) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/cases/${caseId}`, {
                method: 'DELETE',
                headers: { 
                    // No 'Content-Type' header needed for DELETE without a body
                    'X-Admin-Password': adminPassword // Send password in Header
                }
                // No body for DELETE now
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.message || response.statusText}`);
            }
            
            alert('ลบแฟ้มคดีเรียบร้อยแล้ว');
            fetchCases(); // Re-fetch and re-render
            closeModal(adminPasswordModal); // Close password modal
        } catch (error) {
            console.error("Error deleting case:", error);
            alert(`เกิดข้อผิดพลาดในการลบข้อมูล: ${error.message} กรุณาลองใหม่`);
        }
    } else {
        closeModal(adminPasswordModal); // Close password modal if user cancels confirm
    }
}


// --- Borrow/Return Functions ---

async function openBorrowReturnModal(id, type) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/cases/${id}`);
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
        }
        const caseToHandle = await response.json();

        borrowReturnCaseIdInput.value = id;
        currentFarmerNameSpan.textContent = caseToHandle.farmer_name || 'ไม่ระบุ';
        currentFarmerAccountNoSpan.textContent = caseToHandle.farmer_account_no || 'ไม่ระบุ';
        currentCaseStatusSpan.textContent = caseToHandle.status === "In Room" ? "อยู่ในห้องสำนวน" : "ถูกเบิกไป";

        if (type === 'borrow') {
            borrowReturnModalTitle.textContent = 'บันทึกการเบิกแฟ้มคดี';
            confirmBorrowReturnBtn.textContent = 'ยืนยันการเบิก';
            borrowerNameInput.value = '';
            borrowerNameInput.placeholder = 'กรอกชื่อผู้เบิก';
        } else { // type === 'return'
            borrowReturnModalTitle.textContent = 'บันทึกการคืนแฟ้มคดี';
            confirmBorrowReturnBtn.textContent = 'ยืนยันการคืน';
            borrowerNameInput.value = caseToHandle.borrowed_by_user_name || ''; // Pre-fill with last borrower name
            borrowerNameInput.placeholder = 'กรอกชื่อผู้คืน';
        }
        borrowReturnModal.classList.add('active');
    } catch (error) {
        console.error("Error fetching case for borrow/return:", error);
        alert(`ไม่สามารถโหลดข้อมูลเพื่อดำเนินการได้: ${error.message}`);
    }
}

async function handleBorrowReturn(event) {
    event.preventDefault();

    const caseId = borrowReturnCaseIdInput.value;
    const borrowerName = borrowerNameInput.value.trim();
    
    if (!borrowerName) {
        alert('กรุณากรอกชื่อผู้เบิก/ผู้คืน');
        return;
    }

    // Check status from DOM or from fetched data
    const currentStatusText = currentCaseStatusSpan.textContent;
    const action = (currentStatusText === "อยู่ในห้องสำนวน") ? "borrow" : "return";

    const requestBody = {
        action: action,
        borrower_name: borrowerName
    };

    try {
        const response = await fetch(`${API_BASE_URL}/api/cases/${caseId}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.message || response.statusText}`);
        }
        
        alert(action === 'borrow' ? 'บันทึกการเบิกแฟ้มคดีเรียบร้อยแล้ว' : 'บันทึกการคืนแฟ้มคดีเรียบร้อยแล้ว');
        
        fetchCases(); // Re-fetch and re-render
        closeModal(borrowReturnModal);
    } catch (error) {
        console.error("Error handling borrow/return:", error);
        alert(`เกิดข้อผิดพลาด: ${error.message}`);
    }
}


// --- Search Functionality ---
async function performSearch() {
    const searchTerm = searchInput.value.trim().toLowerCase();
    
    // Always fetch all data first to use for searching
    const allCases = await fetchCases(); // fetchCases() will handle rendering too

    if (!searchTerm) {
        // If no search term, fetchCases() already loaded and rendered everything
        return;
    }

    if (!allCases || allCases.length === 0) {
        renderCases([]); // Display empty table if no data
        return;
    }

    const filtered = allCases.filter(c => {
        // Ensure the field exists and is a string before using toLowerCase/includes
        const farmerNameMatch = (c.farmer_name && c.farmer_name.toLowerCase().includes(searchTerm));
        const farmerAccountNoMatch = (c.farmer_account_no && c.farmer_account_no.toLowerCase().includes(searchTerm));
        const cabinetMatch = (c.cabinet_no !== undefined && c.cabinet_no.toString().includes(searchTerm));
        const shelfMatch = (c.shelf_no !== undefined && c.shelf_no.toString().includes(searchTerm));
        const sequenceMatch = (c.sequence_no !== undefined && c.sequence_no.toString().includes(searchTerm));
        
        const fullCabinetMatch = (c.cabinet_no !== undefined && `ตู้ ${c.cabinet_no}`.toLowerCase() === searchTerm);
        const fullShelfMatch = (c.shelf_no !== undefined && `ชั้น ${c.shelf_no}`.toLowerCase() === searchTerm);
        const fullSequenceMatch = (c.sequence_no !== undefined && `ลำดับ ${c.sequence_no}`.toLowerCase() === searchTerm);

        const borrowerMatch = (c.borrowed_by_user_name && c.borrowed_by_user_name.toLowerCase().includes(searchTerm));
        const statusMatch = (c.status && 
                            ((c.status === "In Room" && "อยู่ในห้องสำนวน".includes(searchTerm)) ||
                            (c.status === "Borrowed" && "ถูกเบิกไป".includes(searchTerm))));

        return farmerNameMatch || farmerAccountNoMatch || cabinetMatch || shelfMatch || sequenceMatch ||
               fullCabinetMatch || fullShelfMatch || fullSequenceMatch ||
               borrowerMatch || statusMatch;
    });
    renderCases(filtered); // Display search results
}


// --- Modal Close Functions ---
function closeModal(modalElement) {
    if (modalElement) { // Check if element exists
        modalElement.classList.remove('active');
        // Clear password input when closing admin password modal
        if (modalElement === adminPasswordModal) {
            adminPasswordInput.value = '';
        }
    }
}

// Admin Password Modal Logic
function openAdminPasswordModal() {
    adminPasswordInput.value = ''; // Clear any previous password
    adminPasswordModal.classList.add('active');
}

async function submitAdminPassword(event) {
    event.preventDefault();
    const adminPassword = adminPasswordInput.value.trim();

    if (!adminPassword) {
        alert('กรุณากรอกรหัสผ่านผู้ดูแลระบบ');
        return;
    }

    // Proceed with the action
    if (currentAdminAction === 'edit_save') {
        performUpdateCase(currentAdminCaseId, currentAdminCaseData, adminPassword);
    } else if (currentAdminAction === 'delete') {
        performDeleteCase(currentAdminCaseId, adminPassword);
    }
    // No need to close adminPasswordModal here, it will be closed by performUpdateCase/performDeleteCase on success
    // or remain open if there's a subsequent error in the action itself.
}


// --- Event Listeners ---

document.addEventListener('DOMContentLoaded', () => {
    // Initial fetch of cases when the page loads
    fetchCases(); 

    // Event listener for all close buttons and cancel buttons
    document.querySelectorAll('.close-button, .cancel-button').forEach(button => {
        button.addEventListener('click', (e) => {
            let modal = e.target.closest('.modal');
            if (modal) {
                closeModal(modal);
            }
        });
    });

    // Close modal when clicking outside of modal content
    window.addEventListener('click', (event) => {
        if (event.target === caseModal) {
            closeModal(caseModal);
        }
        if (event.target === borrowReturnModal) {
            closeModal(borrowReturnModal);
        }
        if (event.target === adminPasswordModal) { // Close admin password modal
            closeModal(adminPasswordModal);
        }
    });

    // Check if buttons exist before attaching Event Listeners
    if (addCaseBtn) addCaseBtn.addEventListener('click', openAddCaseModal);
    // saveCase handles password check for edits
    if (caseForm) caseForm.addEventListener('submit', saveCase); 
    if (borrowReturnForm) borrowReturnForm.addEventListener('submit', handleBorrowReturn);
    if (searchBtn) searchBtn.addEventListener('click', performSearch);
    if (searchInput) {
        searchInput.addEventListener('keyup', (event) => {
            if (event.key === 'Enter') {
                performSearch();
            }
        });
    }
    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', () => {
            searchInput.value = '';
            fetchCases(); // Clear search and show all cases
        });
    }

    // Event listener for admin password form submission
    if (adminPasswordForm) adminPasswordForm.addEventListener('submit', submitAdminPassword);
});
