import { app } from "../../scripts/app.js";

function injectStyles() {
    if (document.getElementById("file-gallery-styles")) return;
    const style = document.createElement("style");
    style.id = "file-gallery-styles";
    style.innerHTML = `
        .file-gallery-container {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            height: 300px;
            overflow-y: auto;
            padding: 8px;
            background: #1e1e1e;
            border-radius: 4px;
            border: 1px solid #333;
            box-sizing: border-box;
            width: 100%;
        }
        .file-gallery-item {
            width: 80px;
            height: 80px;
            border-radius: 4px;
            overflow: hidden;
            cursor: pointer;
            border: 2px solid transparent;
            transition: border-color 0.1s, transform 0.1s;
            background: #2a2a2a;
        }
        .file-gallery-item:hover {
            border-color: #4a90e2;
            transform: scale(1.05);
        }
        .file-gallery-item.selected {
            border-color: #43b581;
            box-shadow: 0 0 5px rgba(67, 181, 129, 0.5);
        }
        .file-gallery-item img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        .file-gallery-message {
            color: #ccc;
            font-family: sans-serif;
            font-size: 14px;
            padding: 10px;
        }
        /* Scrollbar customization for the gallery */
        .file-gallery-container::-webkit-scrollbar {
            width: 8px;
        }
        .file-gallery-container::-webkit-scrollbar-track {
            background: #1e1e1e;
        }
        .file-gallery-container::-webkit-scrollbar-thumb {
            background: #555;
            border-radius: 4px;
        }
        .file-gallery-container::-webkit-scrollbar-thumb:hover {
            background: #777;
        }
    `;
    document.head.appendChild(style);
}

app.registerExtension({
    name: "ComfyUI.FileGallery",
    async setup() {
        injectStyles();
    },
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "ComfyUI_FileGallery") {
            const onNodeCreated = nodeType.prototype.onNodeCreated;

            nodeType.prototype.onNodeCreated = function () {
                const r = onNodeCreated ? onNodeCreated.apply(this, arguments) : undefined;

                // Hide the raw string input for selected_image
                const selectedImageWidget = this.widgets.find(w => w.name === "selected_image");
                if (selectedImageWidget) {
                    selectedImageWidget.type = "hidden";
                    selectedImageWidget.computeSize = () => [0, -4];
                }

                const folderPathWidget = this.widgets.find(w => w.name === "folder_path");
                const thumbSizeWidget = this.widgets.find(w => w.name === "thumbnail_size");

                // Fix NaN initialization for existing nodes
                if (thumbSizeWidget && (Number.isNaN(thumbSizeWidget.value) || thumbSizeWidget.value === undefined || thumbSizeWidget.value === null)) {
                    thumbSizeWidget.value = 100;
                }

                // Create a container for the images
                const container = document.createElement("div");
                container.className = "file-gallery-container";
                container.style.display = "flex";
                container.style.flexDirection = "column";
                container.style.width = "calc(100% - 20px)";
                container.style.marginLeft = "10px";
                container.style.boxSizing = "border-box";
                
                const galleryContent = document.createElement("div");
                galleryContent.style.flex = "1";
                galleryContent.style.overflowY = "auto";
                galleryContent.style.display = "flex";
                galleryContent.style.flexWrap = "wrap";
                galleryContent.style.gap = "8px";
                galleryContent.style.alignContent = "flex-start";
                galleryContent.innerHTML = "";
                
                // Add inner HTML button instead of Comfy widget to stop layout recursive resizing loop
                const refreshBtn = document.createElement("button");
                refreshBtn.innerText = "Refresh Gallery";
                refreshBtn.style.marginTop = "8px";
                refreshBtn.style.padding = "6px";
                refreshBtn.style.background = "#333";
                refreshBtn.style.color = "#eee";
                refreshBtn.style.border = "1px solid #555";
                refreshBtn.style.borderRadius = "4px";
                refreshBtn.style.cursor = "pointer";
                refreshBtn.style.fontFamily = "sans-serif";
                
                container.appendChild(galleryContent);
                container.appendChild(refreshBtn);

                // IMPORTANT: We need local state for tracking elements and selection.
                let currentPath = "";
                let imageElements = [];

                const updateThumbnailSize = () => {
                    if (thumbSizeWidget) {
                        const size = thumbSizeWidget.value + "px";
                        imageElements.forEach(item => {
                            item.style.width = size;
                            item.style.height = size;
                        });
                    }
                };

                const refreshGallery = async () => {
                    const path = folderPathWidget?.value;
                    if (!path) return;

                    if (path !== currentPath) {
                        currentPath = path;
                        galleryContent.innerHTML = "<div class='file-gallery-message'>Loading images...</div>";
                    }

                    try {
                        const res = await fetch(`/file_gallery/folder_images?path=${encodeURIComponent(path)}`);
                        if (!res.ok) {
                            let msg = res.statusText;
                            try {
                                const errData = await res.json();
                                msg = errData.error || res.statusText;
                            } catch { }
                            galleryContent.innerHTML = `<div class='file-gallery-message' style='color:#f44336;'>Error: ${msg}</div>`;
                            return;
                        }

                        const data = await res.json();
                        if (!data.images || data.images.length === 0) {
                            galleryContent.innerHTML = "<div class='file-gallery-message'>No images found in folder.</div>";
                            return;
                        }

                        // Clear container
                        galleryContent.innerHTML = "";
                        imageElements = [];

                        const selectedVal = selectedImageWidget ? selectedImageWidget.value : "";

                        data.images.forEach(img => {
                            const item = document.createElement("div");
                            item.className = "file-gallery-item";
                            if (img.filename === selectedVal) {
                                item.classList.add("selected");
                            }

                            const imgEl = document.createElement("img");
                            imgEl.dataset.src = img.thumbnail;
                            imgEl.src = img.thumbnail;
                            imgEl.loading = "lazy";
                            imgEl.title = img.filename;

                            item.appendChild(imgEl);

                            item.addEventListener("click", () => {
                                imageElements.forEach(el => el.classList.remove("selected"));
                                item.classList.add("selected");

                                if (selectedImageWidget) {
                                    selectedImageWidget.value = img.filename;
                                    if (selectedImageWidget.callback) {
                                        selectedImageWidget.callback(img.filename);
                                    }
                                }
                            });

                            galleryContent.appendChild(item);
                            imageElements.push(item);
                        });
                        updateThumbnailSize();
                    } catch (error) {
                        galleryContent.innerHTML = `<div class='file-gallery-message' style='color:#f44336;'>Failed to fetch: ${error.message}</div>`;
                    }
                };
                
                refreshBtn.addEventListener("click", refreshGallery);

                if (thumbSizeWidget) {
                    const ogThumbCallback = thumbSizeWidget.callback;
                    thumbSizeWidget.callback = function () {
                        const result = ogThumbCallback ? ogThumbCallback.apply(this, arguments) : undefined;
                        updateThumbnailSize();
                        return result;
                    };
                }

                // Add "Browse..." button before the DOM element
                this.addWidget("button", "Browse System Folder", "browse", async () => {
                    try {
                        const res = await fetch("/file_gallery/browse_folder");
                        const data = await res.json();
                        if (data.path) {
                            if (folderPathWidget) {
                                folderPathWidget.value = data.path;
                                if (folderPathWidget.callback) folderPathWidget.callback(data.path);
                            }
                            refreshGallery();
                        }
                    } catch (e) {
                         console.error("Browse error", e);
                    }
                });

                // Add the gallery as a proper DOM widget so Comfy UI calculates its bounds
                const galleryWidget = this.addDOMWidget("Gallery", "div", container, {
                    serialize: false,
                    hideOnZoom: false
                });

                // Track dynamic sizing without infinite loop
                const onResize = this.onResize;
                this.onResize = function(size) {
                    if (onResize) onResize.apply(this, arguments);
                    
                    // The standard top widgets: Title bar(30) + String Input(22) + Int Input(22) + BrowseBtn(22) + Paddings = ~120px overhead
                    let offset = 120;
                    let h = size[1] - offset - 15; // Extra 15px to prevent bottom border from crossing node boundary
                    if (h < 150) h = 150;
                    
                    // We only modify the actual DOM element here. This fills exactly the available space in the node without cascading changes up to computeSize.
                    container.style.height = h + "px";
                };
                
                galleryWidget.computeSize = function(width) {
                    return [width, 320]; // Constant size returned to Comfy layout engine to stop it from recalculating/growing infinitely.
                };

                // Force minimum node size visually when spawned
                this.setSize([350, 480]);

                // Intercept folder_path changes
                if (folderPathWidget) {
                    const originalCallback = folderPathWidget.callback;
                    folderPathWidget.callback = function () {
                        const result = originalCallback ? originalCallback.apply(this, arguments) : undefined;
                        // Debounce
                        if (this._timeout) clearTimeout(this._timeout);
                        this._timeout = setTimeout(() => {
                            refreshGallery();
                        }, 800);
                        return result;
                    };

                    // Initial load if populated
                    if (folderPathWidget.value) {
                        setTimeout(() => refreshGallery(), 500);
                    }
                }

                return r;
            };
        }
    }
});
