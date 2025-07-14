// script.js

// --- DOM Elements ---
// ตรวจสอบให้แน่ใจว่า ID เหล่านี้ตรงกับใน index.html ของคุณ
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


// --- Global Variables ---
// กำหนด URL ของ Backend API
// ***แก้ไขตรงนี้: เมื่อ Frontend และ Backend รันบน Render Service เดียวกัน
// ให้ใช้ Path สัมพัทธ์ (Relative Path) โดยไม่ต้องใส่โดเมนเต็ม***
// หรือใช้ window.location.origin เพื่อความชัดเจนก็ได้
const API_BASE_URL = ''; // หรือ `window.location.origin` ก็ได้ (แต่ '' สะดวกกว่า)

// --- Utility Functions ---

function formatDate(dateString) {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        // ตรวจสอบว่าเป็น Invalid Date object หรือไม่
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
    caseList.innerHTML = ''; // เคลียร์เนื้อหาเก่าในตาราง

    if (!casesToDisplay || casesToDisplay.length === 0) { // ตรวจสอบ casesToDisplay ว่าเป็น null/undefined หรือไม่
        noResultsMessage.style.display = 'block';
        return;
    } else {
        noResultsMessage.style.display = 'none';
    }

    casesToDisplay.forEach(c => {
        const row = caseList.insertRow();
        row.dataset.caseId = c.id;

        // ตรวจสอบว่า c.farmer_name มีค่าหรือไม่ ก่อนนำไปใช้
        row.insertCell().textContent = c.farmer_name || 'ไม่ระบุชื่อ'; 
        row.insertCell().textContent = c.farmer_account_no || 'ไม่ระบุเลขบัญชี';
        row.insertCell().textContent = c.cabinet_no !== undefined ? c.cabinet_no : 'ไม่ระบุ';
        row.insertCell().textContent = c.shelf_no !== undefined ? c.shelf_no : 'ไม่ระระบุ';
        row.insertCell().textContent = c.sequence_no !== undefined ? c.sequence_no : 'ไม่ระบุ';

        const statusCell = row.insertCell();
        const statusBadge = document.createElement('span');
        statusBadge.classList.add('status-badge');
        if (c.status === "In Room") {
            statusBadge.classList.add('in-room');
            statusBadge.textContent = 'อยู่ในห้องสำนวน';
        } else if (c.status === "Borrowed") { // เพิ่มเงื่อนไขเพื่อความชัดเจน
            statusBadge.classList.add('borrowed');
            statusBadge.textContent = 'ถูกเบิกไป';
        } else { // กรณีสถานะไม่ตรงกับที่คาดหวัง
            statusBadge.classList.add('unknown-status');
            statusBadge.textContent = 'ไม่ทราบสถานะ';
        }
        statusCell.appendChild(statusBadge);

        const borrowerDateCell = row.insertCell();
        let borrowerInfo = '';
        if (c.status === "Borrowed") {
            borrowerInfo = `เบิกโดย: ${c.borrowed_by_user_name || 'ไม่ระบุ'}<br>เมื่อ: ${formatDate(c.borrowed_date)}`;
        } else if (c.status === "In Room" && c.returned_date) {
            const lastBorrower = c.borrowed_by_user_name || 'ไม่ระบุ'; // ใช้ชื่อผู้เบิกเดิมสำหรับกรณีคืนแล้ว
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
        } else if (c.status === "Borrowed") { // เพิ่มเงื่อนไขสำหรับปุ่มคืน
            const returnBtn = document.createElement('button');
            returnBtn.textContent = 'คืน';
            returnBtn.classList.add('return-btn');
            returnBtn.onclick = () => openBorrowReturnModal(c.id, 'return');
            actionDiv.appendChild(returnBtn);
        }
        actionsCell.appendChild(actionDiv);
    });
}

// --- NEW: Fetch Cases from Backend ---
async function fetchCases() {
    try {
        // ***แก้ไขตรงนี้: เรียก API endpoint ที่ถูกต้องสำหรับดึงข้อมูลทั้งหมด***
        const response = await fetch(`${API_BASE_URL}/api/cases`); 
        if (!response.ok) {
            // ตรวจสอบ HTTP status code และแสดงข้อความที่เหมาะสม
            const errorText = await response.text(); // พยายามอ่านข้อความ error จาก response
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
            const errorText = await response.text();
            throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
        }
        const caseToEdit = await response.json();
        
        modalTitle.textContent = 'แก้ไขข้อมูลแฟ้มคดี';
        farmerNameInput.value = caseToEdit.farmer_name || '';
        farmerAccountNoInput.value = caseToEdit.farmer_account_no || '';
        cabinetNoInput.value = caseToEdit.cabinet_no !== undefined ? caseToEdit.cabinet_no : '';
        shelfNoInput.value = caseToEdit.shelf_no !== undefined ? caseToEdit.shelf_no : '';
        sequenceNoInput.value = caseToEdit.sequence_no !== undefined ? caseToEdit.sequence_no : '';
        caseIdInput.value = caseToEdit.id;
        caseModal.classList.add('active');
    } catch (error) {
        console.error("Error fetching case for edit:", error);
        alert(`ไม่สามารถโหลดข้อมูลเพื่อแก้ไขได้: ${error.message}`);
    }
}

async function saveCase(event) {
    event.preventDefault();

    const farmerName = farmerNameInput.value.trim();
    const farmerAccountNo = farmerAccountNoInput.value.trim();
    const cabinetNo = parseInt(cabinetNoInput.value);
    const shelfNo = parseInt(shelfNoInput.value);
    const sequenceNo = parseInt(sequenceNoInput.value);
    const caseId = caseIdInput.value; // จะมีค่าถ้าเป็นการแก้ไข

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

    try {
        let response;
        if (caseId) { // Editing existing case
            response = await fetch(`${API_BASE_URL}/api/cases/${caseId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(caseData)
            });
        } else { // Adding new case
            response = await fetch(`${API_BASE_URL}/api/cases`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(caseData)
            });
        }
        
        if (!response.ok) {
            const errorData = await response.json(); // พยายามอ่าน JSON error
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.message || response.statusText}`);
        }
        
        alert(caseId ? 'แก้ไขข้อมูลแฟ้มคดีเรียบร้อยแล้ว' : 'เพิ่มแฟ้มคดีใหม่เรียบร้อยแล้ว');
        
        fetchCases(); // Re-fetch and re-render all cases from backend
        closeModal(caseModal);
    } catch (error) {
        console.error("Error saving case:", error);
        alert(`เกิดข้อผิดพลาดในการบันทึกข้อมูล: ${error.message} กรุณาลองใหม่`);
    }
}

async function deleteCase(id) {
    if (confirm('คุณต้องการลบแฟ้มคดีนี้หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้')) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/cases/${id}`, {
                method: 'DELETE'
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.message || response.statusText}`);
            }
            
            alert('ลบแฟ้มคดีเรียบร้อยแล้ว');
            fetchCases(); // Re-fetch and re-render
        } catch (error) {
            console.error("Error deleting case:", error);
            alert(`เกิดข้อผิดพลาดในการลบข้อมูล: ${error.message} กรุณาลองใหม่`);
        }
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

    // ตรวจสอบสถานะจาก DOM หรือจากข้อมูลที่ fetch มา
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
    
    // ดึงข้อมูลทั้งหมดมาก่อนเสมอเพื่อใช้ในการค้นหา
    const allCases = await fetchCases(); // fetchCases() จะจัดการการ render ด้วย

    if (!searchTerm) {
        // หากไม่มีคำค้นหา fetchCases() จะโหลดและ render ทั้งหมดให้แล้ว
        return;
    }

    if (!allCases || allCases.length === 0) {
        renderCases([]); // แสดงตารางว่างเปล่าหากไม่มีข้อมูล
        return;
    }

    const filtered = allCases.filter(c => {
        // ตรวจสอบให้แน่ใจว่า field นั้นมีอยู่และเป็น string ก่อนใช้ toLowerCase/includes
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
    renderCases(filtered); // แสดงผลลัพธ์การค้นหา
}


// --- Modal Close Functions ---
function closeModal(modalElement) {
    if (modalElement) { // ตรวจสอบว่า element มีอยู่จริง
        modalElement.classList.remove('active');
    }
}

// --- Event Listeners ---

document.addEventListener('DOMContentLoaded', () => {
    // ***สำคัญ***: ตรวจสอบให้แน่ใจว่าทุก DOM Element ที่เรียกใช้ (เช่น addCaseBtn, caseModal)
    // ไม่เป็น null ก่อนที่จะผูก Event Listener
    // ถ้า element นั้นไม่มีอยู่จริง จะเกิด TypeError และโค้ดจะหยุดทำงาน

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
    });

    // ตรวจสอบว่าปุ่มมีอยู่จริงก่อนผูก Event Listener
    if (addCaseBtn) addCaseBtn.addEventListener('click', openAddCaseModal);
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
});
