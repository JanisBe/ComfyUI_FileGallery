# ComfyUI File Gallery

A custom node for [ComfyUI](https://github.com/comfyanonymous/ComfyUI) that allows you to easily browse and select images directly inside the node editor. 

## Features
- **System Folder Browser**: Open a native system file dialog to quickly pick an image folder.
- **Dynamic Thumbnail Gallery**: A flexbox grid displaying high-quality thumbnails of all images inside the selected folder.
- **Adjustable Size**: Live scaling for thumbnails via a dedicated node slider (50px to 300px).
- **Responsive Layout**: The gallery perfectly stretches along with the ComfyUI node and maximizes interface space.
- **Efficient Caching**: Generates and caches lightweight thumbnails powered by Pillow for incredibly fast reloading.

## Installation
1. Go to your `ComfyUI/custom_nodes/` directory.
2. Clone this repository:
   ```bash
   git clone https://github.com/JanisBe/ComfyUI_FileGallery.git
   ```
3. Restart ComfyUI.

## Usage
Add the node via the regular `Add Node` menu under the `image` category (it's named `File Gallery`).
- Use **Browse System Folder** to select a directory safely via a native file dialog.
- The gallery will auto-populate with thumbnails (`.png`, `.jpg`, `.jpeg`, `.webp`).
- Click any image to instantly select it. Its path/tensor is sent via the outputs (`IMAGE`, `STRING`).
- Click **Refresh Gallery** to rescan the folder for new files.

### Requirements
The node uses standard ComfyUI dependencies (`Pillow`, `numpy`, `torch`).
To display the system folder selection window, your environment needs to support `tkinter` (which is typically bundled with standard Python distributions on Windows/Mac/Linux).
