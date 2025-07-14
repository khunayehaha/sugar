from flask import Flask, request, jsonify, send_from_directory # เพิ่ม send_from_directory
from flask_cors import CORS
import json
import os
import datetime
import uuid

# --- Flask App Initialization ---
# สำคัญ: กำหนด static_folder เป็น '.' (current directory)
# เพื่อให้ Flask สามารถหาไฟล์ index.html, style.css, script.js ได้ในโฟลเดอร์เดียวกัน
# และ static_url_path='' เพื่อให้ไฟล์เหล่านี้เข้าถึงได้โดยตรงที่ root path เช่น /index.html
app = Flask(__name__, static_folder='.', static_url_path='')
CORS(app) # เปิดใช้งาน CORS สำหรับทุกโดเมน (สำหรับการพัฒนา)

# --- กำหนดชื่อไฟล์ฐานข้อมูล (JSON file simulation) ---
DATA_FILE = 'cases_data.json'

# --- ฟังก์ชันช่วยเหลือสำหรับการจัดการข้อมูล ---
def load_cases_data():
    if not os.path.exists(DATA_FILE) or os.stat(DATA_FILE).st_size == 0:
        cases = generate_initial_dummy_data()
        save_cases_data(cases)
        return cases
    with open(DATA_FILE, 'r', encoding='utf-8') as f:
        try:
            return json.load(f)
        except json.JSONDecodeError:
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
        status = statuses[i % len(statuses)]
        borrowed_by_user_name = None
        borrowed_date = None
        returned_date = None

        if status == "Borrowed":
            borrower = user_names[i % len(user_names)]
            borrowed_by_user_name = borrower
            borrowed_date = datetime.datetime.now().isoformat()

        if status == "In Room" and (i % 10 < 3):
            borrower = user_names[(i+1) % len(user_names)]
            borrowed_by_user_name = borrower
            borrowed_date = datetime.datetime.now().isoformat()
            returned_date = datetime.datetime.now().isoformat()

        dummy_data.append({
            "id": str(uuid.uuid4()),
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

# --- ROUTES สำหรับ Static Files ---
# สำคัญ: นี่คือส่วนที่ทำให้ Render หาหน้า Frontend เจอ
@app.route('/')
def serve_index():
    # จะหาไฟล์ index.html ใน static_folder (คือ . หรือ root directory)
    return send_from_directory(app.static_folder, 'index.html')

# หากต้องการให้แน่ใจว่า CSS และ JS ถูกเสิร์ฟอย่างถูกต้อง (แม้ว่า static_url_path='' ควรจะครอบคลุมแล้ว)
# คุณสามารถเพิ่ม route เฉพาะได้ แต่ปกติไม่จำเป็น
@app.route('/style.css')
def serve_css():
    return send_from_directory(app.static_folder, 'style.css')

@app.route('/script.js')
def serve_js():
    return send_from_directory(app.static_folder, 'script.js')


# --- API Endpoints ---
# (ส่วนนี้เหมือนเดิมจากโค้ดที่คุณให้มา)

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

    case["last_updated_by_user_name"] = "System"
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
        case['returned_date'] = current_timestamp
    else:
        return jsonify({"message": "Invalid action"}), 400

    case["last_updated_by_user_name"] = borrower_name
    case["last_updated_timestamp"] = current_timestamp

    save_cases_data(cases_data)
    return jsonify(case)

# 6. DELETE /api/cases/<id> - ลบคดี
@app.route('/api/cases/<id>', methods=['DELETE'])
def delete_case(id):
    global cases_data
    initial_len = len(cases_data)
    cases_data = [c for c in cases_data if c['id'] != id]
    if len(cases_data) < initial_len:
        save_cases_data(cases_data)
        return jsonify({"message": "Case deleted successfully"}), 200
    return jsonify({"message": "Case not found"}), 404

# --- Main entry point for Flask (for local development) ---
if __name__ == '__main__':
    # รันบนพอร์ต 5000 สำหรับการทดสอบในเครื่องของคุณ
    # เมื่อ Deploy บน Render Render จะจัดการเรื่องพอร์ตให้เอง
    app.run(debug=True, port=int(os.environ.get("PORT", 5000)))
