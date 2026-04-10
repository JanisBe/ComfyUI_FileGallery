import os
import asyncio
import tkinter as tk
from tkinter import filedialog
from server import PromptServer
from aiohttp import web
from .thumbnails import get_thumbnails_list, generate_thumbnail

def open_dialog():
    root = tk.Tk()
    root.withdraw()
    root.attributes("-topmost", True)
    folder_path = filedialog.askdirectory(title="Select Folder")
    root.destroy()
    return folder_path

def setup_api():
    @PromptServer.instance.routes.get("/file_gallery/browse_folder")
    async def browse_folder(request):
        folder_path = await asyncio.to_thread(open_dialog)
        return web.json_response({"path": folder_path})

    @PromptServer.instance.routes.get("/file_gallery/folder_images")
    async def get_folder_images(request):
        folder_path = request.query.get("path", "")
        if not folder_path or not os.path.exists(folder_path) or not os.path.isdir(folder_path):
            return web.json_response({"error": "Invalid folder path"}, status=400)
        
        images = get_thumbnails_list(folder_path)
        return web.json_response({"images": images})

    @PromptServer.instance.routes.get("/file_gallery/thumbnail")
    async def get_thumbnail(request):
        file_path = request.query.get("file", "")
        if not file_path or not os.path.exists(file_path):
            return web.Response(status=404)
        
        thumb_path = generate_thumbnail(file_path)
        if not thumb_path:
             return web.Response(status=404)
             
        return web.FileResponse(thumb_path)
