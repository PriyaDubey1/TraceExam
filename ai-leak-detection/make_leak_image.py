from PIL import Image, ImageDraw, ImageFont

with open('copy_2.txt', 'r') as f:
    text = f.read()

img = Image.new('RGB', (800, 500), color='white')
draw = ImageDraw.Draw(img)
draw.multiline_text((20, 20), text, fill='black')
img.save('leaked_photo.png')

print('leaked_photo.png created!')