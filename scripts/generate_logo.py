"""
Generate atCollege logo and favicon
Orange @ symbol on white background
"""

from PIL import Image, ImageDraw, ImageFont
import os

# Colors
ORANGE = '#F97316'  # Tailwind orange-500 (matches the app)
WHITE = '#FFFFFF'

# Output directory
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'public')
os.makedirs(OUTPUT_DIR, exist_ok=True)

def create_logo(size, filename, font_size_ratio=0.7):
    """Create a logo with @ symbol"""
    # Create image with white background
    img = Image.new('RGBA', (size, size), WHITE)
    draw = ImageDraw.Draw(img)
    
    # Try to use a bold font, fall back to default
    font_size = int(size * font_size_ratio)
    try:
        # Try Windows fonts
        font = ImageFont.truetype("arialbd.ttf", font_size)
    except:
        try:
            font = ImageFont.truetype("arial.ttf", font_size)
        except:
            try:
                font = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", font_size)
            except:
                # Ultimate fallback
                font = ImageFont.load_default()
    
    # Draw @ symbol
    text = "@"
    
    # Get text bounding box for centering
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    
    # Center the text
    x = (size - text_width) // 2 - bbox[0]
    y = (size - text_height) // 2 - bbox[1]
    
    # Draw the @ symbol in orange
    draw.text((x, y), text, font=font, fill=ORANGE)
    
    # Save
    filepath = os.path.join(OUTPUT_DIR, filename)
    img.save(filepath)
    print(f"Created: {filepath}")
    return filepath

def create_favicon_ico():
    """Create multi-size favicon.ico"""
    sizes = [16, 32, 48]
    images = []
    
    for size in sizes:
        img = Image.new('RGBA', (size, size), WHITE)
        draw = ImageDraw.Draw(img)
        
        font_size = int(size * 0.75)
        try:
            font = ImageFont.truetype("arialbd.ttf", font_size)
        except:
            try:
                font = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", font_size)
            except:
                font = ImageFont.load_default()
        
        text = "@"
        bbox = draw.textbbox((0, 0), text, font=font)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]
        
        x = (size - text_width) // 2 - bbox[0]
        y = (size - text_height) // 2 - bbox[1]
        
        draw.text((x, y), text, font=font, fill=ORANGE)
        images.append(img)
    
    # Save as ICO with multiple sizes
    filepath = os.path.join(OUTPUT_DIR, 'favicon.ico')
    images[0].save(filepath, format='ICO', sizes=[(s, s) for s in sizes], append_images=images[1:])
    print(f"Created: {filepath}")
    return filepath

def create_rounded_logo(size, filename, corner_radius=None):
    """Create a logo with rounded corners"""
    if corner_radius is None:
        corner_radius = size // 8
    
    # Create image with white background
    img = Image.new('RGBA', (size, size), (255, 255, 255, 0))
    draw = ImageDraw.Draw(img)
    
    # Draw rounded rectangle background
    draw.rounded_rectangle(
        [(0, 0), (size - 1, size - 1)],
        radius=corner_radius,
        fill=WHITE,
        outline=None
    )
    
    # Draw @ symbol
    font_size = int(size * 0.65)
    try:
        font = ImageFont.truetype("arialbd.ttf", font_size)
    except:
        try:
            font = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", font_size)
        except:
            font = ImageFont.load_default()
    
    text = "@"
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    
    x = (size - text_width) // 2 - bbox[0]
    y = (size - text_height) // 2 - bbox[1]
    
    draw.text((x, y), text, font=font, fill=ORANGE)
    
    filepath = os.path.join(OUTPUT_DIR, filename)
    img.save(filepath)
    print(f"Created: {filepath}")
    return filepath

if __name__ == "__main__":
    print("Generating atCollege logos and favicons...")
    print(f"Output directory: {OUTPUT_DIR}")
    print()
    
    # Create various sizes
    create_logo(512, 'logo-512.png')
    create_logo(192, 'logo-192.png')
    create_logo(180, 'apple-touch-icon.png')
    create_logo(32, 'favicon-32x32.png', font_size_ratio=0.8)
    create_logo(16, 'favicon-16x16.png', font_size_ratio=0.85)
    
    # Create favicon.ico with multiple sizes
    create_favicon_ico()
    
    # Create rounded version for PWA/app icon
    create_rounded_logo(512, 'logo-rounded-512.png')
    create_rounded_logo(192, 'logo-rounded-192.png')
    
    print()
    print("✅ All logos generated successfully!")
    print()
    print("Update your index.html with:")
    print('  <link rel="icon" type="image/x-icon" href="/favicon.ico">')
    print('  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">')
    print('  <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">')
    print('  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">')

