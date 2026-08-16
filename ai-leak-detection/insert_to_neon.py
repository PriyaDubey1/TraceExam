import pytesseract
from PIL import Image, UnidentifiedImageError
from rapidfuzz import fuzz
import os
import uuid
import datetime
import psycopg2
from dotenv import load_dotenv

pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

load_dotenv()

with open('master_paper.txt', 'r') as f:
    master_text = f.read()

name_to_center = {
    'Ramesh': 'Center_Kanpur',
    'Suresh': 'Center_Lucknow',
    'Mahesh': 'Center_Delhi'
}

refcode_to_center = {
    'KNP7': 'Center_Kanpur',
    'LKO7': 'Center_Lucknow',
    'DEL7': 'Center_Delhi'
}

def detect_and_insert(image_path):
    img = Image.open(image_path)
    extracted_text = pytesseract.image_to_string(img)
    match_score = fuzz.ratio(extracted_text, master_text)

    if match_score <= 50:
        print("Ye exam paper nahi lagta, insert nahi kiya jayega.")
        return

    found_center = None
    for name, center in name_to_center.items():
        if name in extracted_text:
            found_center = center
            break
    if not found_center:
        for code, center in refcode_to_center.items():
            if code in extracted_text:
                found_center = center
                break

    if not found_center:
        print("Fingerprint nahi mila, insert nahi kiya jayega.")
        return

    print(f"Leak detected! Traced to: {found_center}, Match: {match_score:.1f}%")

    conn = psycopg2.connect(os.getenv("DATABASE_URL"))
    cur = conn.cursor()

    incident_id = str(uuid.uuid4())
    today = datetime.date.today()

    cur.execute("""
        INSERT INTO incidents (
            id, exam_name, date, year, conducting_body, body_type,
            region, leak_status, action_taken, description,
            source_name, confidence, is_demo_seed
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """, (
        incident_id,
        "Demo Exam Paper (TraceExam Test)",
        today,
        today.year,
        "TraceExam Demo Board",
        "Simulated",
        found_center,
        "Detected - Under Investigation",
        "Auto-flagged by AI leak detection module",
        f"Leak detected via fingerprint matching. OCR match score: {match_score:.1f}%",
        "AI Detection System",
        f"{match_score:.1f}%",
        True
    ))

    conn.commit()
    cur.close()
    conn.close()

    print("Incident inserted successfully!")

detect_and_insert('leaked_photo.png')