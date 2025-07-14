from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import json
import os
import datetime
import uuid
import logging
from functools import wraps # Import wraps for decorator

# --- Flask App Initialization ---
# Set static_folder to 'static' (recommended)
# This means static files (index.html, css, js) will be in the 'static' folder
app = Flask(__name__, static_folder='static', static_url_path='')

# --- Configure CORS ---
# Explicitly specify allowed Origins for security
# You should replace 'https://sugar-vzh6.onrender.com' with your actual Frontend domain on Render
# And add localhost for local development
origins = [
    "https://sugar-vzh6.onrender.com",
    "http://localhost:3000",  # Example: If Frontend dev server runs here
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5500",  # Example: If using Live Server in VS Code
    "http://localhost:5500",
    # Add other Frontend domains you might have
]

CORS(app, origins=origins, supports_credentials=True) # supports_credentials=True if Frontend sends cookies/auth headers

# --- Configure logging ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# --- Define the database file name (JSON file simulation) ---
DATA_FILE = 'cases_data.json'

# --- Timezone Configuration ---
# Define the offset for Thailand Standard Time (UTC+7)
THAILAND_TIMEZONE_OFFSET_HOURS = 7

def get_thai_current_time_iso():
    """
    Returns the current time in Thailand Standard Time (UTC+7) in ISO format.
    """
    utc_now = datetime.datetime.utcnow()
    thai_time = utc_now + datetime.timedelta(hours=THAILAND_TIMEZONE_OFFSET_HOURS)
    return thai_time.isoformat()

# --- Admin Password Configuration ---
ADMIN_PASSWORD = "lawsugar6" # Define the admin password

def admin_password_required(f):
    """
    Decorator to check for a valid admin password in the request JSON.
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not request.is_json:
            logging.warning("Admin password check: Request is not JSON.")
            return jsonify({"message": "Request must be JSON"}), 400
        
        data = request.json
        provided_password = data.get('admin_password')

        if not provided_password:
            logging.warning("Admin password check: Password not provided.")
            return jsonify({"message": "Admin password required"}), 401 # Unauthorized
        
        if provided_password != ADMIN_PASSWORD:
            logging.warning("Admin password check: Incorrect password.")
            return jsonify({"message": "Incorrect admin password"}), 403 # Forbidden
        
        # Remove the password from the request data before passing to the function
        # to avoid it being saved or processed further unnecessarily.
        if 'admin_password' in data:
            del data['admin_password']
            request.json = data # Update request.json after removal

        return f(*args, **kwargs)
    return decorated_function

# --- Helper functions for data management ---
def load_cases_data():
    """
    Loads case data from DATA_FILE. If the file doesn't exist, is empty,
    or corrupted, it initializes with an empty list.
    """
    if not os.path.exists(DATA_FILE) or os.stat(DATA_FILE).st_size == 0:
        logging.info(f"'{DATA_FILE}' not found or is empty. Initializing with an empty list.")
        return [] # Return empty list, no dummy data generation
    
    try:
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
            logging.info(f"Successfully loaded data from '{DATA_FILE}'. Number of cases: {len(data)}")
            return data
    except json.JSONDecodeError as e:
        logging.error(f"JSONDecodeError while loading '{DATA_FILE}': {e}. File might be corrupted. Initializing with an empty list.")
        return [] # Return empty list if corrupted
    except IOError as e:
        logging.error(f"IOError while loading '{DATA_FILE}': {e}. Initializing with an empty list.")
        return [] # Return empty list if IOError

def save_cases_data(cases):
    """
    Saves the current cases data to DATA_FILE.
    """
    try:
        with open(DATA_FILE, 'w', encoding='utf-8') as f:
            json.dump(cases, f, indent=4, ensure_ascii=False)
        logging.info(f"Successfully saved data to '{DATA_FILE}'. Number of cases: {len(cases)}")
    except IOError as e:
        logging.error(f"IOError while saving data to '{DATA_FILE}': {e}")
        # In a real app, you might want to notify an administrator or use a fallback.
    except Exception as e:
        logging.error(f"An unexpected error occurred while saving data to '{DATA_FILE}': {e}")

# This function is no longer called for initial data generation,
# but kept here in case it's needed for other purposes later.
def generate_initial_dummy_data():
    """
    Generates a list of dummy case data.
    This function is no longer used for initial app startup data.
    """
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
            borrowed_date = get_thai_current_time_iso() # Use Thai time for dummy data
        if status == "In Room" and (i % 10 < 3):
            borrower = user_names[(i+1) % len(user_names)]
            borrowed_by_user_name = borrower
            borrowed_date = get_thai_current_time_iso() # Use Thai time for dummy data
            returned_date = get_thai_current_time_iso() # Use Thai time for dummy data

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
            "last_updated_timestamp": get_thai_current_time_iso() # Use Thai time for dummy data
        })
    logging.info(f"Generated {len(dummy_data)} dummy cases.")
    return dummy_data

# Load data when the app starts. It will now start with an empty list if the file is new/empty.
cases_data = load_cases_data()

# --- ROUTES for Static Files ---
# / will serve index.html from the static folder
@app.route('/')
def serve_index():
    try:
        return send_from_directory(app.static_folder, 'index.html')
    except Exception as e:
        logging.error(f"Error serving index.html: {e}")
        return "Error serving index.html", 500

# /style.css will serve style.css from the static folder
@app.route('/style.css')
def serve_css():
    try:
        return send_from_directory(app.static_folder, 'style.css')
    except Exception as e:
        logging.error(f"Error serving style.css: {e}")
        return "Error serving style.css", 500

# /script.js will serve script.js from the static folder
@app.route('/script.js')
def serve_js():
    try:
        return send_from_directory(app.static_folder, 'script.js')
    except Exception as e:
        logging.error(f"Error serving script.js: {e}")
        return "Error serving script.js", 500

# --- API Endpoints ---

# 1. GET /api/cases - Retrieve all cases
@app.route('/api/cases', methods=['GET'])
def get_all_cases():
    try:
        return jsonify(cases_data)
    except Exception as e:
        logging.error(f"Error getting all cases: {e}")
        return jsonify({"message": "Failed to retrieve case data"}), 500

# 2. GET /api/cases/<id> - Retrieve a single case
@app.route('/api/cases/<id>', methods=['GET'])
def get_case(id):
    try:
        case = next((c for c in cases_data if c['id'] == id), None)
        if case:
            return jsonify(case)
        return jsonify({"message": "Case not found"}), 404
    except Exception as e:
        logging.error(f"Error getting case with ID {id}: {e}")
        return jsonify({"message": "Failed to retrieve case data"}), 500

# 3. POST /api/cases - Add a new case (no password required for adding)
@app.route('/api/cases', methods=['POST'])
def add_case():
    try:
        data = request.json
        if not all(k in data for k in ["farmer_name", "farmer_account_no", "cabinet_no", "shelf_no", "sequence_no"]):
            logging.warning("Missing required fields for adding a case.")
            return jsonify({"message": "Missing required fields"}), 400

        new_case = {
            "id": str(uuid.uuid4()), # Generate a unique ID
            "farmer_name": data["farmer_name"],
            "farmer_account_no": data["farmer_account_no"],
            "cabinet_no": int(data["cabinet_no"]),
            "shelf_no": int(data["shelf_no"]),
            "sequence_no": int(data["sequence_no"]),
            "status": "In Room", # New case status is initially "In Room"
            "borrowed_by_user_name": None,
            "borrowed_date": None,
            "returned_date": None,
            "last_updated_by_user_name": "System", # Or specify the user who added it
            "last_updated_timestamp": get_thai_current_time_iso() # Use Thai time
        }
        cases_data.append(new_case)
        save_cases_data(cases_data)
        logging.info(f"New case added successfully: {new_case['id']}")
        return jsonify(new_case), 201 # 201 Created
    except ValueError as e:
        logging.error(f"ValueError when adding case (e.g., cabinet_no not int): {e}")
        return jsonify({"message": "Invalid input for numeric fields"}), 400
    except Exception as e:
        logging.error(f"Error adding new case: {e}")
        return jsonify({"message": "An error occurred while saving data. Please try again."}), 500 # Custom error message

# 4. PUT /api/cases/<id> - Update case data (requires admin password)
@app.route('/api/cases/<id>', methods=['PUT'])
@admin_password_required # Apply the decorator here
def update_case(id):
    try:
        data = request.json # Data will already have 'admin_password' removed by the decorator
        case = next((c for c in cases_data if c['id'] == id), None)
        if not case:
            logging.warning(f"Case with ID {id} not found for update.")
            return jsonify({"message": "Case not found"}), 404

        # Update only the fields received
        if 'farmer_name' in data: case['farmer_name'] = data['farmer_name']
        if 'farmer_account_no' in data: case['farmer_account_no'] = data['farmer_account_no']
        if 'cabinet_no' in data: case['cabinet_no'] = int(data['cabinet_no'])
        if 'shelf_no' in data: case['shelf_no'] = int(data['shelf_no'])
        if 'sequence_no' in data: case['sequence_no'] = int(data['sequence_no'])

        case["last_updated_by_user_name"] = "System"
        case["last_updated_timestamp"] = get_thai_current_time_iso() # Use Thai time

        save_cases_data(cases_data)
        logging.info(f"Case with ID {id} updated successfully.")
        return jsonify(case)
    except ValueError as e:
        logging.error(f"ValueError when updating case {id}: {e}")
        return jsonify({"message": "Invalid input for numeric fields"}), 400
    except Exception as e:
        logging.error(f"Error updating case {id}: {e}")
        return jsonify({"message": "Failed to update case data"}), 500

# 5. PATCH /api/cases/<id>/status - Update borrow/return status (no password required for this)
@app.route('/api/cases/<id>/status', methods=['PATCH'])
def update_case_status(id):
    try:
        data = request.json
        case = next((c for c in cases_data if c['id'] == id), None)
        if not case:
            logging.warning(f"Case with ID {id} not found for status update.")
            return jsonify({"message": "Case not found"}), 404

        action = data.get('action') # 'borrow' or 'return'
        borrower_name = data.get('borrower_name')

        if not action or not borrower_name:
             logging.warning("Missing action or borrower_name for status update.")
             return jsonify({"message": "Missing action or borrower_name"}), 400

        current_timestamp = get_thai_current_time_iso() # Use Thai time

        if action == 'borrow':
            if case['status'] == 'Borrowed':
                return jsonify({"message": "Case is already borrowed"}), 409 # Conflict
            case['status'] = 'Borrowed'
            case['borrowed_by_user_name'] = borrower_name
            case['borrowed_date'] = current_timestamp
            case['returned_date'] = None
            logging.info(f"Case {id} status changed to Borrowed by {borrower_name}.")
        elif action == 'return':
            if case['status'] == 'In Room':
                return jsonify({"message": "Case is already in room"}), 409
            case['status'] = 'In Room'
            case['returned_date'] = current_timestamp
            logging.info(f"Case {id} status changed to In Room (returned) by {borrower_name}.")
        else:
            logging.warning(f"Invalid action '{action}' for status update.")
            return jsonify({"message": "Invalid action"}), 400

        case["last_updated_by_user_name"] = borrower_name
        case["last_updated_timestamp"] = current_timestamp

        save_cases_data(cases_data)
        return jsonify(case)
    except Exception as e:
        logging.error(f"Error updating case status for {id}: {e}")
        return jsonify({"message": "Failed to update case status"}), 500

# 6. DELETE /api/cases/<id> - Delete a case (requires admin password)
@app.route('/api/cases/<id>', methods=['DELETE'])
@admin_password_required # Apply the decorator here
def delete_case(id):
    global cases_data
    try:
        initial_len = len(cases_data)
        cases_data = [c for c in cases_data if c['id'] != id]
        if len(cases_data) < initial_len:
            save_cases_data(cases_data)
            logging.info(f"Case with ID {id} deleted successfully.")
            return jsonify({"message": "Case deleted successfully"}), 200
        logging.warning(f"Case with ID {id} not found for deletion.")
        return jsonify({"message": "Case not found"}), 404
    except Exception as e:
        logging.error(f"Error deleting case {id}: {e}")
        return jsonify({"message": "Failed to delete case"}), 500

# --- Main entry point for Flask (for local development and Render) ---
if __name__ == '__main__':
    # For running on Render, Render will assign the PORT.
    # For local development, port 5000 is used by default.
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port, debug=True) # host='0.0.0.0' to accept connections from external sources
