import os
from PIL import Image

def process_logo():
    input_path = "/Users/periskop/.gemini/antigravity-ide/brain/2c76700d-6cad-401c-8924-b092fb61fdf5/media__1783610408968.jpg"
    output_dir = "apps/web/public"
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, "logo.png")

    print(f"Loading logo image from: {input_path}")
    img = Image.open(input_path).convert("RGBA")
    datas = img.getdata()

    new_data = []
    for item in datas:
        r, g, b, a = item
        # If the pixel is close to white (background), make it fully transparent
        if r > 210 and g > 210 and b > 210:
            new_data.append((255, 255, 255, 0))
        # If the pixel is dark navy/black (the word "Torque" or "USED CAR INTELLIGENCE" or dark parts)
        # we want to convert it to white so it stands out on our dark navy website background!
        elif r < 60 and g < 60 and b < 60:
            # Scale alpha based on how dark it is (to preserve anti-aliasing)
            darkness = 255 - int((r + g + b) / 3)
            new_data.append((255, 255, 255, darkness))
        else:
            # It's a blue/cyan pixel (the word "Scout", the speed lines, or speedometer details).
            # We want to keep its original color but remove the white background component.
            # A simple way is to compute transparency based on the distance to white.
            max_val = max(r, g, b)
            min_val = min(r, g, b)
            
            # If it's a very light blue/cyan, it might have background bleed.
            # We can calculate transparency to blend it smoothly.
            if r > 160 and g > 160 and b > 160:
                new_data.append((r, g, b, 0))
            else:
                # Keep blue/cyan pixels intact
                new_data.append((r, g, b, 255))

    img.putdata(new_data)
    
    # Crop the image to remove unnecessary transparent padding around the logo text
    # Get the bounding box of non-transparent pixels
    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)
        print(f"Cropped image to bounding box: {bbox}")

    img.save(output_path, "PNG")
    print(f"Processed logo saved successfully to: {output_path}")

if __name__ == "__main__":
    process_logo()
