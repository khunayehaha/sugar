from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import json
import os
import datetime
import uuid
import logging
from functools import wraps 

# --- NEW: Firebase Imports ---
import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore

# --- Flask App Initialization ---
app = Flask(__name__, static_folder='static', static_url_path='')

# --- Configure CORS ---
# Allow all origins for debugging, but specify explicitly in production for security
origins = [
    "https://sugar-vzh6.onrender.com",
    "http://localhost:3000",  
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5500",  
    "http://localhost:5500",
    "*" 
]

CORS(app, origins=origins, supports_credentials=True, 
     allow_headers=["Content-Type", "X-Admin-Password"]) 

# --- Configure logging ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# --- NEW: Firebase Initialization ---
# Get the Firebase Service Account Key from environment variable
# This variable must be set on Render.com (e.g., FIREBASE_SERVICE_ACCOUNT_KEY)
firebase_service_account_key_json = os.environ.get('FIREBASE_SERVICE_ACCOUNT_KEY')

if firebase_service_account_key_json:
    try:
        # Load the JSON string into a Python dictionary
        cred_dict = json.loads(firebase_service_account_key_json)
        # Initialize Firebase Admin SDK
        cred = credentials.Certificate(cred_dict)
        firebase_admin.initialize_app(cred)
        db = firestore.client()
        logging.info("Firebase Admin SDK initialized successfully and connected to Firestore.")
    except Exception as e:
        logging.error(f"Error initializing Firebase Admin SDK: {e}")
        # Exit or handle the error gracefully, as database operations will fail
        db = None # Set db to None if initialization fails
else:
    logging.error("FIREBASE_SERVICE_ACCOUNT_KEY environment variable not set. Firestore will not be available.")
    db = None # Set db to None if env var is missing

# --- Timezone Configuration ---
THAILAND_TIMEZONE_OFFSET_HOURS = 7

def get_thai_current_time_iso():
    """
    Returns the current time in Thailand Standard Time (UTC+7) in ISO format.
    """
    utc_now = datetime.datetime.utcnow()
    thai_time = utc_now + datetime.timedelta(hours=THAILAND_TIMEZONE_OFFSET_HOURS)
    return thai_time.isoformat()

# --- Admin Password Configuration ---
ADMIN_PASSWORD = "lawsugar6" 

def admin_password_required(f):
    """
    Decorator to check for a valid admin password in the request Headers (X-Admin-Password).
    This decorator is used for PUT and DELETE operations on cases.
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        provided_password = request.headers.get('X-Admin-Password')

        if not provided_password:
            logging.warning("Admin password check: Password not provided in X-Admin-Password header.")
            return jsonify({"message": "Admin password required in X-Admin-Password header"}), 401 
        
        if provided_password != ADMIN_PASSWORD:
            logging.warning("Admin password check: Incorrect password.")
            return jsonify({"message": "Incorrect admin password"}), 403 
        
        return f(*args, **kwargs)
    return decorated_function

# --- Helper functions for data management (Now using Firestore) ---
# load_cases_data and save_cases_data are no longer needed as we interact directly with Firestore

# --- ROUTES for Static Files ---
@app.route('/')
def serve_index():
    try:
        return send_from_directory(app.static_folder, 'index.html')
    except Exception as e:
        logging.error(f"Error serving index.html: {e}")
        return "Error serving index.html", 500

@app.route('/style.css')
def serve_css():
    try:
        return send_from_directory(app.static_folder, 'style.css')
    except Exception as e:
        logging.error(f"Error serving style.css: {e}")
        return "Error serving style.css", 500

@app.route('/script.js')
def serve_js():
    try:
        return send_from_directory(app.static_folder, 'script.js')
    except Exception as e:
        logging.error(f"Error serving script.js: {e}")
        return "Error serving script.js", 500

# --- API Endpoints (Modified to use Firestore) ---

# 1. GET /api/cases - Retrieve all cases
@app.route('/api/cases', methods=['GET'])
async def get_all_cases():
    if db is None:
        return jsonify({"message": "Database not initialized. Please check server logs."}), 500
    try:
        cases_ref = db.collection('cases') # Reference to 'cases' collection
        docs = cases_ref.stream() # Get all documents
        
        all_cases = []
        for doc in docs:
            case_data = doc.to_dict()
            case_data['id'] = doc.id # Add document ID to the data
            all_cases.append(case_data)
        
        logging.info(f"Retrieved {len(all_cases)} cases from Firestore.")
        return jsonify(all_cases)
    except Exception as e:
        logging.error(f"Error getting all cases from Firestore: {e}")
        return jsonify({"message": "Failed to retrieve case data from database"}), 500

# 2. GET /api/cases/<id> - Retrieve a single case
@app.route('/api/cases/<id>', methods=['GET'])
async def get_case(id):
    if db is None:
        return jsonify({"message": "Database not initialized. Please check server logs."}), 500
    try:
        case_ref = db.collection('cases').document(id) # Reference to a specific document
        doc = case_ref.get()
        
        if doc.exists:
            case_data = doc.to_dict()
            case_data['id'] = doc.id # Add document ID to the data
            logging.info(f"Retrieved case with ID {id} from Firestore.")
            return jsonify(case_data)
        else:
            logging.warning(f"Case with ID {id} not found in Firestore.")
            return jsonify({"message": "Case not found"}), 404
    except Exception as e:
        logging.error(f"Error getting case with ID {id} from Firestore: {e}")
        return jsonify({"message": "Failed to retrieve case data from database"}), 500

# 3. POST /api/cases - Add a new case
@app.route('/api/cases', methods=['POST'])
async def add_case():
    if db is None:
        return jsonify({"message": "Database not initialized. Please check server logs."}), 500
    try:
        data = request.json
        if not all(k in data for k in ["farmer_name", "farmer_account_no", "cabinet_no", "shelf_no", "sequence_no"]):
            logging.warning("Missing required fields for adding a case.")
            return jsonify({"message": "Missing required fields"}), 400

        new_case_data = {
            "farmer_name": data["farmer_name"],
            "farmer_account_no": data["farmer_account_no"],
            "cabinet_no": int(data["cabinet_no"]),
            "shelf_no": int(data["shelf_no"]),
            "sequence_no": int(data["sequence_no"]),
            "status": "In Room", 
            "borrowed_by_user_name": None,
            "borrowed_date": None,
            "returned_date": None,
            "last_updated_by_user_name": "System", 
            "last_updated_timestamp": get_thai_current_time_iso() 
        }
        
        # Add a new document to the 'cases' collection
        doc_ref = db.collection('cases').document() # Firestore generates a new ID
        doc_ref.set(new_case_data)
        
        new_case_data['id'] = doc_ref.id # Add the generated ID to the response
        logging.info(f"New case added successfully to Firestore: {new_case_data['id']}")
        return jsonify(new_case_data), 201 
    except ValueError as e:
        logging.error(f"ValueError when adding case (e.g., cabinet_no not int): {e}")
        return jsonify({"message": "Invalid input for numeric fields"}), 400
    except Exception as e:
        logging.error(f"Error adding new case to Firestore: {e}")
        return jsonify({"message": "An error occurred while saving data to database. Please try again."}), 500 

# 4. PUT /api/cases/<id> - Update case data
@app.route('/api/cases/<id>', methods=['PUT'])
@admin_password_required 
async def update_case(id):
    if db is None:
        return jsonify({"message": "Database not initialized. Please check server logs."}), 500
    try:
        data = request.json 
        case_ref = db.collection('cases').document(id)
        doc = case_ref.get()

        if not doc.exists:
            logging.warning(f"Case with ID {id} not found in Firestore for update.")
            return jsonify({"message": "Case not found"}), 404

        update_data = {}
        if 'farmer_name' in data: update_data['farmer_name'] = data['farmer_name']
        if 'farmer_account_no' in data: update_data['farmer_account_no'] = data['farmer_account_no']
        if 'cabinet_no' in data: update_data['cabinet_no'] = int(data['cabinet_no'])
        if 'shelf_no' in data: update_data['shelf_no'] = int(data['shelf_no'])
        if 'sequence_no' in data: update_data['sequence_no'] = int(data['sequence_no'])

        update_data["last_updated_by_user_name"] = "System"
        update_data["last_updated_timestamp"] = get_thai_current_time_iso() 

        case_ref.update(update_data) # Update specific fields
        
        # Fetch updated data to return in response
        updated_doc = case_ref.get()
        updated_case_data = updated_doc.to_dict()
        updated_case_data['id'] = updated_doc.id

        logging.info(f"Case with ID {id} updated successfully in Firestore.")
        return jsonify(updated_case_data)
    except ValueError as e:
        logging.error(f"ValueError when updating case {id} in Firestore: {e}")
        return jsonify({"message": "Invalid input for numeric fields"}), 400
    except Exception as e:
        logging.error(f"Error updating case {id} in Firestore: {e}")
        return jsonify({"message": "Failed to update case data in database"}), 500

# 5. PATCH /api/cases/<id>/status - Update borrow/return status
@app.route('/api/cases/<id>/status', methods=['PATCH'])
async def update_case_status(id):
    if db is None:
        return jsonify({"message": "Database not initialized. Please check server logs."}), 500
    try:
        data = request.json
        case_ref = db.collection('cases').document(id)
        doc = case_ref.get()

        if not doc.exists:
            logging.warning(f"Case with ID {id} not found in Firestore for status update.")
            return jsonify({"message": "Case not found"}), 404

        action = data.get('action') 
        borrower_name = data.get('borrower_name')

        if not action or not borrower_name:
             logging.warning("Missing action or borrower_name for status update.")
             return jsonify({"message": "Missing action or borrower_name"}), 400

        current_timestamp = get_thai_current_time_iso() 
        update_data = {}

        if action == 'borrow':
            if doc.to_dict().get('status') == 'Borrowed':
                return jsonify({"message": "Case is already borrowed"}), 409 
            update_data['status'] = 'Borrowed'
            update_data['borrowed_by_user_name'] = borrower_name
            update_data['borrowed_date'] = current_timestamp
            update_data['returned_date'] = None # Clear returned date if borrowed
            logging.info(f"Case {id} status changed to Borrowed by {borrower_name} in Firestore.")
        elif action == 'return':
            if doc.to_dict().get('status') == 'In Room':
                return jsonify({"message": "Case is already in room"}), 409
            update_data['status'] = 'In Room'
            update_data['returned_date'] = current_timestamp
            # Keep borrowed_by_user_name and borrowed_date as they are for history
            logging.info(f"Case {id} status changed to In Room (returned) by {borrower_name} in Firestore.")
        else:
            logging.warning(f"Invalid action '{action}' for status update.")
            return jsonify({"message": "Invalid action"}), 400

        update_data["last_updated_by_user_name"] = borrower_name
        update_data["last_updated_timestamp"] = current_timestamp

        case_ref.update(update_data) # Update specific fields

        # Fetch updated data to return in response
        updated_doc = case_ref.get()
        updated_case_data = updated_doc.to_dict()
        updated_case_data['id'] = updated_doc.id

        return jsonify(updated_case_data)
    except Exception as e:
        logging.error(f"Error updating case status for {id} in Firestore: {e}")
        return jsonify({"message": "Failed to update case status in database"}), 500

# 6. DELETE /api/cases/<id> - Delete a case
@app.route('/api/cases/<id>', methods=['DELETE'])
@admin_password_required 
async def delete_case(id):
    if db is None:
        return jsonify({"message": "Database not initialized. Please check server logs."}), 500
    try:
        case_ref = db.collection('cases').document(id)
        doc = case_ref.get()

        if doc.exists:
            case_ref.delete()
            logging.info(f"Case with ID {id} deleted successfully from Firestore.")
            return jsonify({"message": "Case deleted successfully"}), 200
        else:
            logging.warning(f"Case with ID {id} not found in Firestore for deletion.")
            return jsonify({"message": "Case not found"}), 404
    except Exception as e:
        logging.error(f"Error deleting case {id} from Firestore: {e}")
        return jsonify({"message": "Failed to delete case from database"}), 500

# --- Main entry point for Flask (for local development and Render) ---
if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    # Use async_mode='threading' for Flask-FireBase async operations
    app.run(host='0.0.0.0', port=port, debug=True, threaded=True) 

