# app.py

from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import os
import datetime
import uuid # สำหรับสร้าง ID ที่ไม่ซ้ำกัน

app = Flask(__name__)
CORS(app) # เปิดใช้งาน CORS สำหรับทุกโดเมน (สำหรับการพัฒนา)

# --- กำหนดชื่อไฟล์ฐานข้อมูล (SQLite) ---
# จะเก็บข้อมูลแฟ้มคดีในไฟล์ JSON ที่จำลองเป็นฐานข้อมูล SQLite
# ในอนาคตจะเปลี่ยนไปใช้ฐานข้อมูล SQL จริงๆ เช่น SQLAlchemy
DATA_FILE = 'cases_data.json'

# --- ฟังก์ชันช่วยเหลือสำหรับการจัดการข้อมูล ---
def load_cases_data():
    if not os.path.exists(DATA_FILE) or os.stat(DATA_FILE).st_size == 0:
        # ถ้าไฟล์ไม่มีหรือว่างเปล่า ให้สร้างข้อมูล dummy
        cases = generate_initial_dummy_data()
        save_cases_data(cases)
        return cases
    with open(DATA_FILE, 'r', encoding='utf-8') as f:
        try:
            return json.load(f)
        except json.JSONDecodeError:
            # ถ้าไฟล์เสีย ให้เริ่มใหม่ด้วยข้อมูล dummy
            cases = generate_initial_dummy_data()
            save_cases_data(cases)
            return cases

def save_cases_data(cases):
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(cases, f, indent=4, ensure_ascii=False)

def generate_initial_dummy_data():
    dummy_data = []
    statuses = ["In Room", "Borrowed"]
    names = ["นายสมชาย ใจดี", "นางสาวสมหญิง สุขสันต์", "นายธนาคาร ร่ำรวย", "นางสาววิไลลักษณ์ งามตา", "นายประยุทธ์ มั่นคง", "นางสาวสุดารัตน์ เจริญสุข", "ด.ช.อัจฉริยะ น้อย", "นางสาวกุลธิดา สุภาพ"]
    account_prefixes = ["AC", "BC", "CR", "PL"]
    cabinet_count = 50
    shelf_count = 10
    seq_count = 5

    user_names = ["เจนนิเฟอร์", "โรเบิร์ต", "สุชาดา", "วิชัย", "เมษายน", "ธนากร"]

    for i in range(300):
        status = statuses[i % len(statuses)] # สลับสถานะ In Room / Borrowed
        borrowed_by_user_name = None
        borrowed_date = None
        returned_date = None

        if status == "Borrowed":
            borrower = user_names[i % len(user_names)] # สลับผู้ยืม
            borrowed_by_user_name = borrower
            borrowed_date = datetime.datetime.now().isoformat()

        # 30% ของคดีที่อยู่ในห้อง (In Room) เคยถูกยืมแล้วคืน
        if status == "In Room" and (i % 10 < 3):
            borrower = user_names[(i+1) % len(user_names)]
            borrowed_by_user_name = borrower
            borrowed_date = datetime.datetime.now().isoformat()
            returned_date = datetime.datetime.now().isoformat()

        dummy_data.append({
            "id": str(uuid.uuid4()), # ใช้ UUID เพื่อสร้าง ID ที่ไม่ซ้ำกัน
            "farmer_name": f"{names[i % len(names)]} คดีที่ {i + 1}",
            "farmer_account_no": f"{account_prefixes[i % len(account_prefixes)]}-{str(10000 + i).zfill(5)}",
            "cabinet_no": (i % cabinet_count) + 1,
            "shelf_no": (i % shelf_count) + 1,
            "sequence_no": (i % seq_count) + 1,
            "status": status,
            "borrowed_by_user_name": borrowed_by_user_name,
            "borrowed_date": borrowed_date,
            "returned_date": returned_date,
            "last_updated_by_user_name": user_names[i % len(user_names)],
            "last_updated_timestamp": datetime.datetime.now().isoformat()
        })
    return dummy_data

# โหลดข้อมูลเมื่อแอปเริ่มทำงาน
cases_data = load_cases_data()

# --- API Endpoints ---

# 1. GET /api/cases - ดึงข้อมูลคดีทั้งหมด
@app.route('/api/cases', methods=['GET'])
def get_all_cases():
    return jsonify(cases_data)

# 2. GET /api/cases/<id> - ดึงข้อมูลคดีเดียว
@app.route('/api/cases/<id>', methods=['GET'])
def get_case(id):
    case = next((c for c in cases_data if c['id'] == id), None)
    if case:
        return jsonify(case)
    return jsonify({"message": "Case not found"}), 404

# 3. POST /api/cases - เพิ่มคดีใหม่
@app.route('/api/cases', methods=['POST'])
def add_case():
    data = request.json
    if not all(k in data for k in ["farmer_name", "farmer_account_no", "cabinet_no", "shelf_no", "sequence_no"]):
        return jsonify({"message": "Missing required fields"}), 400

    new_case = {
        "id": str(uuid.uuid4()), # สร้าง ID ที่ไม่ซ้ำกัน
        "farmer_name": data["farmer_name"],
        "farmer_account_no": data["farmer_account_no"],
        "cabinet_no": int(data["cabinet_no"]),
        "shelf_no": int(data["shelf_no"]),
        "sequence_no": int(data["sequence_no"]),
        "status": "In Room", # คดีใหม่สถานะเริ่มต้นคืออยู่ในห้อง
        "borrowed_by_user_name": None,
        "borrowed_date": None,
        "returned_date": None,
        "last_updated_by_user_name": "System", # หรือจะระบุชื่อผู้ใช้ที่เพิ่ม
        "last_updated_timestamp": datetime.datetime.now().isoformat()
    }
    cases_data.append(new_case)
    save_cases_data(cases_data)
    return jsonify(new_case), 201 # 201 Created

# 4. PUT /api/cases/<id> - อัปเดตข้อมูลคดี
@app.route('/api/cases/<id>', methods=['PUT'])
def update_case(id):
    data = request.json
    case = next((c for c in cases_data if c['id'] == id), None)
    if not case:
        return jsonify({"message": "Case not found"}), 404

    # อัปเดตเฉพาะฟิลด์ที่ได้รับ
    if 'farmer_name' in data: case['farmer_name'] = data['farmer_name']
    if 'farmer_account_no' in data: case['farmer_account_no'] = data['farmer_account_no']
    if 'cabinet_no' in data: case['cabinet_no'] = int(data['cabinet_no'])
    if 'shelf_no' in data: case['shelf_no'] = int(data['shelf_no'])
    if 'sequence_no' in data: case['sequence_no'] = int(data['sequence_no'])

    # สำหรับสถานะการยืม/คืน จะจัดการใน endpoint แยกเพื่อความชัดเจน

    case["last_updated_by_user_name"] = "System" # หรือจะระบุชื่อผู้ใช้ที่แก้ไข
    case["last_updated_timestamp"] = datetime.datetime.now().isoformat()

    save_cases_data(cases_data)
    return jsonify(case)

# 5. PATCH /api/cases/<id>/status - อัปเดตสถานะยืม/คืน
@app.route('/api/cases/<id>/status', methods=['PATCH'])
def update_case_status(id):
    data = request.json
    case = next((c for c in cases_data if c['id'] == id), None)
    if not case:
        return jsonify({"message": "Case not found"}), 404

    action = data.get('action') # 'borrow' or 'return'
    borrower_name = data.get('borrower_name')

    if not action or not borrower_name:
         return jsonify({"message": "Missing action or borrower_name"}), 400

    current_timestamp = datetime.datetime.now().isoformat()

    if action == 'borrow':
        if case['status'] == 'Borrowed':
            return jsonify({"message": "Case is already borrowed"}), 409 # Conflict
        case['status'] = 'Borrowed'
        case['borrowed_by_user_name'] = borrower_name
        case['borrowed_date'] = current_timestamp
        case['returned_date'] = None
    elif action == 'return':
        if case['status'] == 'In Room':
            return jsonify({"message": "Case is already in room"}), 409
        case['status'] = 'In Room'
        # ยังคงเก็บชื่อผู้เบิกเดิมไว้เพื่อประวัติ แต่บันทึกวันที่คืน
        case['returned_date'] = current_timestamp
    else:
        return jsonify({"message": "Invalid action"}), 400

    case["last_updated_by_user_name"] = borrower_name # ผู้ที่ทำรายการยืม/คืน
    case["last_updated_timestamp"] = current_timestamp

    save_cases_data(cases_data)
    return jsonify(case)

# 6. DELETE /api/cases/<id> - ลบคดี
@app.route('/api/cases/<id>', methods=['DELETE'])
def delete_case(id):
    global cases_data # ต้องระบุ global เพราะเราจะเปลี่ยน list cases_data ทั้งหมด
    initial_len = len(cases_data)
    cases_data = [c for c in cases_data if c['id'] != id]
    if len(cases_data) < initial_len:
        save_cases_data(cases_data)
        return jsonify({"message": "Case deleted successfully"}), 200
    return jsonify({"message": "Case not found"}), 404


