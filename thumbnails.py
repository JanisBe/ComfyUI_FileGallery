import os
import hashlib
from PIL import Image

CACHE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "thumbnail_cache"))

if not os.path.exists(CACHE_DIR):
    os.makedirs(CACHE_DIR)

VALID_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}

def get_thumbnails_list(folder_path):
    images = []
    try:
        for filename in os.listdir(folder_path):
            ext = os.path.splitext(filename)[1].lower()
            if ext in VALID_EXTENSIONS:
                full_path = os.path.join(folder_path, filename)
                if os.path.isfile(full_path):
                    images.append({
                        "filename": filename,
                        "path": full_path,
                        "thumbnail": f"/file_gallery/thumbnail?file={full_path}"
                    })
    except Exception as e:
        print(f"Error reading folder {folder_path}: {e}")
    
    # Sort files alphabetically
    images.sort(key=lambda x: x["filename"].lower())
    return images

def generate_thumbnail(file_path, size=(512, 512)):
    try:
        if not os.path.exists(file_path):
            return None
        # Create a safe, unique cache filename based on the file path and modified time
        mtime = os.path.getmtime(file_path)
        unique_str = f"{file_path}_{mtime}".encode('utf-8')
        file_hash = hashlib.md5(unique_str).hexdigest()
        ext = os.path.splitext(file_path)[1].lower()
        if not ext:
            ext = ".jpg"
        thumb_filename = f"{file_hash}{ext}"
        thumb_path = os.path.join(CACHE_DIR, thumb_filename)

        if os.path.exists(thumb_path):
            return thumb_path

        img = Image.open(file_path)
        img.thumbnail(size)
        # ensure it saves correctly 
        if img.mode != "RGB" and ext in [".jpg", ".jpeg"]:
            img = img.convert("RGB")
            
        img.save(thumb_path)
        return thumb_path
    except Exception as e:
        print(f"Error generating thumbnail for {file_path}: {e}")
        return None
