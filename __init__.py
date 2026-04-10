from .node import FileGalleryNode
from .api import setup_api

WEB_DIRECTORY = "./web"

NODE_CLASS_MAPPINGS = {
    "ComfyUI_FileGallery": FileGalleryNode
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "ComfyUI_FileGallery": "File Gallery"
}

setup_api()

__all__ = ['NODE_CLASS_MAPPINGS', 'NODE_DISPLAY_NAME_MAPPINGS', 'WEB_DIRECTORY']
