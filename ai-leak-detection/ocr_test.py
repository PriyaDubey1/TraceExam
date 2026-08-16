import pytesseract
from PIL import Image

pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

img = Image.open('leaked_photo.png')
extracted_text = pytesseract.image_to_string(img)

print("OCR ne ye text nikala:")
print(extracted_text)