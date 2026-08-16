import pytesseract
from PIL import Image, UnidentifiedImageError
from rapidfuzz import fuzz
import os

pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

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

def check_leak(image_path):
    print(f"\n--- Testing: {image_path} ---")

    if not os.path.exists(image_path):
        print("ERROR: File nahi mili. Filename check karo.")
        return

    try:
        img = Image.open(image_path)
    except UnidentifiedImageError:
        print("ERROR: Ye file ek valid image nahi hai (corrupt ho sakti hai).")
        return

    extracted_text = pytesseract.image_to_string(img)

    if extracted_text.strip() == "":
        print("ERROR: OCR ko koi text nahi mila is image mein.")
        return
    print(f"OCR ne ye nikala: {extracted_text}")
    match_score = fuzz.ratio(extracted_text, master_text)
    print(f"Match score with master paper: {match_score:.1f}%")

    if match_score > 50:
        print("CONFIRMED: Ye leaked paper hamara exam paper hai.")

        found_center = None
        matched_via = None

        for name, center in name_to_center.items():
            if name in extracted_text:
                found_center = center
                matched_via = f"name fingerprint ('{name}')"
                break

        if not found_center:
            for code, center in refcode_to_center.items():
                if code in extracted_text:
                    found_center = center
                    matched_via = f"reference code fingerprint ('{code}')"
                    break

        if found_center:
            print(f"Fingerprint matched via: {matched_via}")
            print(f"Leak traced to: {found_center}")
        else:
            print("Dono fingerprints (naam aur ref code) nahi mile.")
            print("Suggestion: Manual review needed, image bahut zyada crop/blur hai.")
    else:
        print("Ye hamara exam paper nahi lagta (match score bahut kam hai).")

check_leak('leaked_photo.png')
check_leak('blurry_leak.png')
check_leak('random_image.png')