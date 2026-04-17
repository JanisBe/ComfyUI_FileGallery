import os
import torch
import numpy as np
from PIL import Image, ImageOps

class FileGalleryNode:
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "folder_path": ("STRING", {"default": "", "multiline": False}),
                "selected_image": ("STRING", {"default": ""}),
                "thumbnail_size": ("INT", {"default": 150, "min": 50, "max": 300, "step": 10}),
            }
        }

    RETURN_TYPES = ("IMAGE", "STRING", "INT", "INT")
    RETURN_NAMES = ("image", "path", "width", "height")
    FUNCTION = "load_image"
    CATEGORY = "image"

    def load_image(self, folder_path, selected_image, thumbnail_size=150):
        if not folder_path or not selected_image:
            # return dummy if nothing is selected yet to avoid crashing
            dummy_img = torch.zeros((1, 64, 64, 3), dtype=torch.float32)
            return (dummy_img, "", 0, 0)

        image_path = os.path.join(folder_path, selected_image)
        if not os.path.exists(image_path):
             dummy_img = torch.zeros((1, 64, 64, 3), dtype=torch.float32)
             return (dummy_img, "", 0, 0)

        img = Image.open(image_path)
        img = ImageOps.exif_transpose(img)
        image = img.convert("RGB")
        image = np.array(image).astype(np.float32) / 255.0
        image = torch.from_numpy(image)[None,]
        
        width, height = img.size
        
        return (image, image_path, width, height)
