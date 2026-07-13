import os
from PIL import Image, ImageDraw, ImageFont

def process_logo():
    # 1. Load original logo image
    input_path = "/Users/periskop/.gemini/antigravity-ide/brain/2c76700d-6cad-401c-8924-b092fb61fdf5/media__1783610408968.jpg"
    print(f"Loading original logo from: {input_path}")
    img = Image.open(input_path).convert("RGBA")
    
    # 2. Crop to keep only the TorqueScout brand name and symbol (remove "USED CAR INTELLIGENCE")
    torque_scout_crop = img.crop((40, 80, 996, 215))
    
    # 3. Make the background transparent and convert dark navy text (Torque) to white
    datas = torque_scout_crop.getdata()
    new_data = []
    for item in datas:
        r, g, b, a = item
        # If it is white/very light background, make it transparent
        if r > 240 and g > 240 and b > 240:
            new_data.append((255, 255, 255, 0))
        # If it is dark navy/black (the word "Torque" letters where r, g, b are all dark)
        # Convert them to white so they are perfectly visible on the dark navy background!
        elif r < 60 and g < 60 and b < 60:
            darkness = 255 - int((r + g + b) / 3)
            new_data.append((255, 255, 255, darkness))
        else:
            # Keep original colors (blue/cyan Scout, speed lines, speedometer)
            new_data.append((r, g, b, 255))
            
    torque_scout_crop.putdata(new_data)
    
    # Trim transparent borders to get clean dimensions
    bbox = torque_scout_crop.getbbox()
    if bbox:
        torque_scout_crop = torque_scout_crop.crop(bbox)
    
    # 4. Create a new canvas to compose the logo and the new subtitle
    w, h = torque_scout_crop.size
    canvas_w = w
    canvas_h = h + 65 # Space for subtitle
    
    canvas = Image.new("RGBA", (canvas_w, canvas_h), (255, 255, 255, 0))
    canvas.paste(torque_scout_crop, (0, 0))
    
    # 5. Draw the new subtitle: "İKİNCİ ELDE DOĞRU KARAR" in white/light-grey
    draw = ImageDraw.Draw(canvas)
    
    # Load a clean sans-serif font from macOS
    font_path = "/System/Library/Fonts/Supplemental/Arial.ttf"
    if not os.path.exists(font_path):
        font_path = "/System/Library/Fonts/Helvetica.ttc"
        
    try:
        font = ImageFont.truetype(font_path, 34)
    except IOError:
        font = ImageFont.load_default()
        
    # Format with spaces to match the wide letter spacing in the logo
    subtitle_text = "İ K İ N C İ   E L D E   D O Ğ R U   K A R A R"
    
    # Calculate text width to center it under the logo
    text_bbox = draw.textbbox((0, 0), subtitle_text, font=font)
    text_w = text_bbox[2] - text_bbox[0]
    
    # Position the text: centered horizontally, and 20px below the logo
    text_x = (canvas_w - text_w) // 2
    text_y = h + 20
    
    # Use light grey/white color so it is clearly visible on the dark background!
    text_color = (226, 232, 240, 255) # tailwind slate-200 color
    draw.text((text_x, text_y), subtitle_text, fill=text_color, font=font)
    
    # 6. Save the processed logo
    output_dir = "apps/web/public"
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, "logo.png")
    
    # Resize slightly so it fits beautifully in the header (max height 160px for high-res scaling down)
    target_h = 160
    scale = target_h / canvas_h
    target_w = int(canvas_w * scale)
    
    final_img = canvas.resize((target_w, target_h), Image.Resampling.LANCZOS)
    final_img.save(output_path, "PNG")
    print(f"Successfully generated new brand logo at: {output_path}")

if __name__ == "__main__":
    process_logo()
