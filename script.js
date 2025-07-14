// script.js

// --- DOM Elements ---
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


// --- Global Variables (ปรับปรุงใหม่) ---
// ไม่ต้องมี let cases = [] หรือ currentEditingCaseId = null แล้ว
// เพราะข้อมูลจะถูกดึงจาก Server และ re-render ใหม่เสมอ
// แต่เก็บ USER_IDS ไว้สำหรับ demo การเบิก/คืน (ในอนาคตจะมาจาก Backend)
const USER_IDS = [
    { id: "user1", name: "เจนนิเฟอร์" },
    { id: "user2", name: "โรเบิร์ต" },
    { id: "user3", name: "สุชาดา" },
    { id: "user4", name: "วิชัย" },
    { id: "user5", name: "เมษายน" },
    { id: "user6", name: "ธนากร" }
];
// กำหนด URL ของ Backend API
const API_BASE_URL = 'https://sugar-vzh6.onrender.com/api/cases'; // Backend ของเราอยู่ที่นี่

// --- Utility Functions (ปรับปรุงเล็กน้อย) ---

// generateUniqueId() ไม่จำเป็นแล้ว เพราะ Backend จะสร้าง ID ให้
// saveCasesToLocalStorage() และ loadCasesFromLocalStorage() ถูกลบทิ้งไปแล้ว
// generateInitialDummyData() ถูกย้ายไปที่ Backend

function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function getUserNameById(userId) { // ยังคงอยู่แต่ตอนนี้อาจจะใช้ไม่เยอะแล้ว
    const user = USER_IDS.find(u => u.id === userId);
    return user ? user.name : 'ไม่ระบุ';
}

function getUserIdByName(userName) { // ยังคงอยู่แต่ตอนนี้อาจจะใช้ไม่เยอะแล้ว
    const user = USER_IDS.find(u => u.name === userName);
    return user ? user.id : null;
}

// --- Main Render Function (ปรับปรุงเล็กน้อย) ---
// renderCases() จะรับข้อมูลมาจาก fetchCases แทน
// และตอนนี้ renderCases จะไม่รับ filteredCases แล้ว ให้รับแค่ cases ตรงๆ เลย
function renderCases(casesToDisplay) { // เปลี่ยนชื่อ parameter
    caseList.innerHTML = '';

    if (casesToDisplay.length === 0) {
        noResultsMessage.style.display = 'block';
        return;
    } else {
        noResultsMessage.style.display = 'none';
    }

    casesToDisplay.forEach(c => { // เปลี่ยน c.caseName เป็น c.farmer_name เป็นต้น
        const row = caseList.insertRow();
        row.dataset.caseId = c.id;

        row.insertCell().textContent = c.farmer_name; // ใช้ farmer_name จาก Backend
        row.insertCell().textContent = c.farmer_account_no; // ใช้ farmer_account_no จาก Backend
        row.insertCell().textContent = c.cabinet_no;
        row.insertCell().textContent = c.shelf_no;
        row.insertCell().textContent = c.sequence_no;

        const statusCell = row.insertCell();
        const statusBadge = document.createElement('span');
        statusBadge.classList.add('status-badge');
        if (c.status === "In Room") {
            statusBadge.classList.add('in-room');
            statusBadge.textContent = 'อยู่ในห้องสำนวน';
        } else {
            statusBadge.classList.add('borrowed');
            statusBadge.textContent = 'ถูกเบิกไป';
        }
        statusCell.appendChild(statusBadge);

        const borrowerDateCell = row.insertCell();
        let borrowerInfo = '';
        if (c.status === "Borrowed" && c.borrowed_by_user_name && c.borrowed_date) {
            borrowerInfo = `เบิกโดย: ${c.borrowed_by_user_name}<br>เมื่อ: ${formatDate(c.borrowed_date)}`;
        } else if (c.status === "In Room" && c.returned_date) {
            const lastBorrower = c.borrowed_by_user_name || 'ไม่ระบุ';
            borrowerInfo = `คืนแล้วโดย: ${lastBorrower}<br>เมื่อ: ${formatDate(c.returned_date)}`;
        } else {
            borrowerInfo = 'ไม่มีข้อมูล';
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
        } else {
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
        const response = await fetch(API_BASE_URL);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        renderCases(data); // Render data fetched from backend
        return data; // Return all cases for search to use
    } catch (error) {
        console.error("Error fetching cases:", error);
        alert("ไม่สามารถดึงข้อมูลแฟ้มคดีได้ กรุณาลองใหม่ในภายหลัง");
        renderCases([]); // Clear table if error
        return [];
    }
}

// --- Add/Edit Case Functions (ปรับปรุงให้เรียก Backend) ---

function openAddCaseModal() {
    modalTitle.textContent = 'เพิ่มแฟ้มคดีใหม่';
    caseForm.reset(); // Clear previous form data
    caseIdInput.value = ''; // Clear hidden ID
    // currentEditingCaseId ไม่จำเป็นต้องเก็บแล้ว
    caseModal.classList.add('active'); // Show modal
}

// openEditCaseModal ต้องดึงข้อมูลจาก Backend มาแสดงใน Modal
async function openEditCaseModal(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/${id}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const caseToEdit = await response.json();
        
        modalTitle.textContent = 'แก้ไขข้อมูลแฟ้มคดี';
        farmerNameInput.value = caseToEdit.farmer_name;
        farmerAccountNoInput.value = caseToEdit.farmer_account_no;
        cabinetNoInput.value = caseToEdit.cabinet_no;
        shelfNoInput.value = caseToEdit.shelf_no;
        sequenceNoInput.value = caseToEdit.sequence_no;
        caseIdInput.value = caseToEdit.id;
        caseModal.classList.add('active');
    } catch (error) {
        console.error("Error fetching case for edit:", error);
        alert("ไม่สามารถโหลดข้อมูลเพื่อแก้ไขได้");
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
        alert('กรุณากรอกข้อมูลให้ครบถ้วนและถูกต้อง');
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
            response = await fetch(`${API_BASE_URL}/${caseId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(caseData)
            });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            alert('แก้ไขข้อมูลแฟ้มคดีเรียบร้อยแล้ว');
        } else { // Adding new case
            response = await fetch(API_BASE_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(caseData)
            });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            alert('เพิ่มแฟ้มคดีใหม่เรียบร้อยแล้ว');
        }
        
        fetchCases(); // Re-fetch and re-render all cases from backend
        closeModal(caseModal);
    } catch (error) {
        console.error("Error saving case:", error);
        alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่");
    }
}

async function deleteCase(id) {
    if (confirm('คุณต้องการลบแฟ้มคดีนี้หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้')) {
        try {
            const response = await fetch(`${API_BASE_URL}/${id}`, {
                method: 'DELETE'
            });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            alert('ลบแฟ้มคดีเรียบร้อยแล้ว');
            fetchCases(); // Re-fetch and re-render
        } catch (error) {
            console.error("Error deleting case:", error);
            alert("เกิดข้อผิดพลาดในการลบข้อมูล กรุณาลองใหม่");
        }
    }
}


// --- Borrow/Return Functions (ปรับปรุงให้เรียก Backend) ---

// openBorrowReturnModal ต้องดึงข้อมูลจาก Backend มาแสดงใน Modal
async function openBorrowReturnModal(id, type) {
    try {
        const response = await fetch(`${API_BASE_URL}/${id}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const caseToHandle = await response.json();

        borrowReturnCaseIdInput.value = id;
        currentFarmerNameSpan.textContent = caseToHandle.farmer_name; // ใช้ farmer_name จาก Backend
        currentFarmerAccountNoSpan.textContent = caseToHandle.farmer_account_no; // ใช้ farmer_account_no จาก Backend
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
        alert("ไม่สามารถโหลดข้อมูลเพื่อดำเนินการได้");
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

    const currentStatus = currentCaseStatusSpan.textContent === "อยู่ในห้องสำนวน" ? "In Room" : "Borrowed";
    const action = (currentStatus === "In Room") ? "borrow" : "return";

    const requestBody = {
        action: action,
        borrower_name: borrowerName
    };

    try {
        const response = await fetch(`${API_BASE_URL}/${caseId}/status`, {
            method: 'PATCH', // ใช้ PATCH สำหรับการอัปเดตบางส่วน
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.message || response.statusText}`);
        }
        
        if (action === 'borrow') {
            alert(`บันทึกการเบิกแฟ้มคดีเรียบร้อยแล้ว`);
        } else {
            alert(`บันทึกการคืนแฟ้มคดีเรียบร้อยแล้ว`);
        }
        fetchCases(); // Re-fetch and re-render
        closeModal(borrowReturnModal);
    } catch (error) {
        console.error("Error handling borrow/return:", error);
        alert(`เกิดข้อผิดพลาด: ${error.message}`);
    }
}


// --- Search Functionality (ปรับปรุงให้ค้นหาจากข้อมูลล่าสุด) ---
async function performSearch() {
    const searchTerm = searchInput.value.trim().toLowerCase();
    
    const allCases = await fetchCases(); // ดึงข้อมูลล่าสุดทั้งหมดมาก่อน
    if (!allCases) return; // ถ้าดึงมาไม่ได้ ก็หยุด

    if (!searchTerm) {
        renderCases(allCases); // ถ้าไม่มีคำค้นหา ให้แสดงทั้งหมด
        return;
    }

    const filtered = allCases.filter(c => {
        // Search by farmer name, farmer account number, cabinet, shelf, or sequence number
        const farmerNameMatch = c.farmer_name.toLowerCase().includes(searchTerm);
        const farmerAccountNoMatch = c.farmer_account_no.toLowerCase().includes(searchTerm);
        const cabinetMatch = c.cabinet_no.toString().includes(searchTerm);
        const shelfMatch = c.shelf_no.toString().includes(searchTerm);
        const sequenceMatch = c.sequence_no.toString().includes(searchTerm);
        
        // เพิ่มการค้นหาจากคำเต็ม เช่น "ตู้ 3" "ชั้น 4" "ลำดับ 7"
        const fullCabinetMatch = `ตู้ ${c.cabinet_no}`.toLowerCase() === searchTerm;
        const fullShelfMatch = `ชั้น ${c.shelf_no}`.toLowerCase() === searchTerm;
        const fullSequenceMatch = `ลำดับ ${c.sequence_no}`.toLowerCase() === searchTerm;

        const borrowerMatch = (c.borrowed_by_user_name && c.borrowed_by_user_name.toLowerCase().includes(searchTerm));
        const statusMatch = (c.status === "In Room" && "อยู่ในห้องสำนวน".includes(searchTerm)) ||
                            (c.status === "Borrowed" && "ถูกเบิกไป".includes(searchTerm));

        return farmerNameMatch || farmerAccountNoMatch || cabinetMatch || shelfMatch || sequenceMatch ||
               fullCabinetMatch || fullShelfMatch || fullSequenceMatch ||
               borrowerMatch || statusMatch;
    });
    renderCases(filtered);
}


// --- Modal Close Functions (เหมือนเดิม) ---
function closeModal(modalElement) {
    modalElement.classList.remove('active');
}

// --- Event Listeners (ปรับปรุงเล็กน้อย) ---

document.addEventListener('DOMContentLoaded', () => {
    fetchCases(); // เรียกใช้ fetchCases แทน loadCasesFromLocalStorage

    // Event listener for all close buttons and cancel buttons
    document.querySelectorAll('.close-button, .cancel-button').forEach(button => {
        button.addEventListener('click', (e) => {
            // Find the parent modal and close it
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

    addCaseBtn.addEventListener('click', openAddCaseModal);
    caseForm.addEventListener('submit', saveCase);

    borrowReturnForm.addEventListener('submit', handleBorrowReturn);

    searchBtn.addEventListener('click', performSearch);
    searchInput.addEventListener('keyup', (event) => {
        if (event.key === 'Enter') {
            performSearch();
        }
    });
    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        fetchCases(); // Clear search and show all cases
    });
});
