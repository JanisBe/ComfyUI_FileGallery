import { app } from "../../scripts/app.js";

function injectStyles() {
    if (document.getElementById("file-gallery-styles")) return;
    const style = document.createElement("style");
    style.id = "file-gallery-styles";
    style.innerHTML = `
        /* ── Outer wrapper ── */
        .file-gallery-wrapper {
            display: flex;
            flex-direction: column;
            box-sizing: border-box;
            overflow: hidden;
        }

        /* ── Toolbar ── */
        .file-gallery-toolbar {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 4px;
            padding: 4px;
            background: #252525;
            border: 1px solid #3a3a3a;
            border-bottom: none;
            border-radius: 4px 4px 0 0;
            box-sizing: border-box;
            flex-shrink: 0;
        }
        .fg-toolbar-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            height: 26px;
            min-width: 26px;
            padding: 0 6px;
            background: #333;
            color: #ddd;
            border: 1px solid #555;
            border-radius: 4px;
            cursor: pointer;
            font-size: 13px;
            font-family: sans-serif;
            transition: background 0.15s, border-color 0.15s;
            white-space: nowrap;
            user-select: none;
        }
        .fg-toolbar-btn:hover {
            background: #444;
            border-color: #777;
        }
        .fg-toolbar-btn.active {
            background: #4a90e2;
            border-color: #4a90e2;
            color: #fff;
        }
        .fg-toolbar-btn:disabled {
            opacity: 0.35;
            cursor: default;
        }
        .fg-toolbar-btn:disabled:hover {
            background: #333;
            border-color: #555;
        }
        .fg-sort-select {
            height: 26px;
            background: #333;
            color: #ddd;
            border: 1px solid #555;
            border-radius: 4px;
            padding: 0 4px;
            font-size: 13px;
            font-family: sans-serif;
            cursor: pointer;
            outline: none;
        }
        .fg-sort-select:hover {
            border-color: #777;
        }
        .fg-filter-input {
            flex: 1;
            min-width: 60px;
            height: 26px;
            background: #2b2b2b;
            color: #ddd;
            border: 1px solid #555;
            border-radius: 4px;
            padding: 0 6px;
            font-size: 13px;
            font-family: sans-serif;
            outline: none;
            box-sizing: border-box;
        }
        .fg-filter-input:focus {
            border-color: #4a90e2;
        }
        .fg-filter-input::placeholder {
            color: #666;
        }

        /* ── Gallery grid ── */
        .file-gallery-container {
            flex: 1;
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            overflow-y: auto;
            padding: 8px;
            background: #1e1e1e;
            border-radius: 0 0 4px 4px;
            border: 1px solid #333;
            box-sizing: border-box;
            align-content: flex-start;
            min-height: 0;
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
            position: relative;
        }
        .file-gallery-item:hover {
            border-color: #4a90e2;
            transform: scale(1.02);
        }
        .file-gallery-item.selected {
            border-color: #ff9500;
            box-shadow: 0 0 10px rgba(255, 149, 0, 0.5);
        }
        .file-gallery-item .file-gallery-checkbox {
            position: absolute;
            top: 4px;
            left: 4px;
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background: rgba(0,0,0,0.5);
            border: 1px solid #fff;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10;
            transition: background 0.2s, border-color 0.2s;
        }
        .file-gallery-item.selected .file-gallery-checkbox {
            background: #ff9500;
            border-color: #ff9500;
        }
        .file-gallery-item .file-gallery-checkbox::after {
            content: "✓";
            color: white;
            font-size: 10px;
            font-weight: bold;
            display: none;
        }
        .file-gallery-item.selected .file-gallery-checkbox::after {
            display: block;
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
        /* Scrollbar */
        .file-gallery-container::-webkit-scrollbar { width: 8px; }
        .file-gallery-container::-webkit-scrollbar-track { background: #1e1e1e; }
        .file-gallery-container::-webkit-scrollbar-thumb { background: #555; border-radius: 4px; }
        .file-gallery-container::-webkit-scrollbar-thumb:hover { background: #777; }
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
                if (thumbSizeWidget && (Number.isNaN(thumbSizeWidget.value) || thumbSizeWidget.value == null)) {
                    thumbSizeWidget.value = 100;
                }

                // ── State ──────────────────────────────────────────────
                let currentPath = "";
                let allImages = [];   // full list from server
                let imageElements = [];   // rendered DOM items

                let sortBy = "name";  // "name" | "date" | "size"
                let sortAsc = true;
                let filterText = "";

                // Folder navigation history (Back button)
                let folderHistory = [];   // stack of previously visited paths

                // ── Helpers: navigate to a path ────────────────────────
                const navigateTo = (path, pushHistory = true) => {
                    if (pushHistory && currentPath && currentPath !== path) {
                        folderHistory.push(currentPath);
                    }
                    backBtn.disabled = folderHistory.length === 0;

                    if (folderPathWidget) {
                        folderPathWidget.value = path;
                        if (folderPathWidget.callback) folderPathWidget.callback(path);
                    }
                    refreshGallery();
                };

                // ── Outer wrapper ──────────────────────────────────────
                // wrapper fills the space ComfyUI gives to the DOM widget.
                // Its height is explicitly set in onResize so the inner
                // flexbox can distribute space correctly.
                const wrapper = document.createElement("div");
                wrapper.className = "file-gallery-wrapper";

                // ── Toolbar ───────────────────────────────────────────
                const toolbar = document.createElement("div");
                toolbar.className = "file-gallery-toolbar";

                // Back button (← history)
                const backBtn = document.createElement("button");
                backBtn.className = "fg-toolbar-btn";
                backBtn.title = "Go back";
                backBtn.innerHTML = "&#8592;"; // ←
                backBtn.disabled = true;
                backBtn.addEventListener("click", () => {
                    if (folderHistory.length === 0) return;
                    const prev = folderHistory.pop();
                    backBtn.disabled = folderHistory.length === 0;
                    // Navigate without pushing to history (we're going back)
                    navigateTo(prev, false);
                });

                // UP button (parent folder)
                const upBtn = document.createElement("button");
                upBtn.className = "fg-toolbar-btn";
                upBtn.title = "Go to parent folder";
                upBtn.innerHTML = "&#8679;"; // ⇑
                upBtn.addEventListener("click", () => {
                    const path = folderPathWidget?.value;
                    if (!path) return;
                    const normalized = path.replace(/[\\/]+$/, "");
                    // Support both Windows (\) and POSIX (/) separators
                    const sep = normalized.includes("\\") ? "\\" : "/";
                    const parts = normalized.split(sep);
                    if (parts.length <= 1) return;
                    parts.pop();
                    const parent = parts.join(sep) || sep;
                    navigateTo(parent);
                });

                // Sort dropdown
                const sortSelect = document.createElement("select");
                sortSelect.className = "fg-sort-select";
                sortSelect.title = "Sort by";
                [["name", "Name"], ["date", "Date"], ["size", "Size"]].forEach(([val, label]) => {
                    const opt = document.createElement("option");
                    opt.value = val;
                    opt.textContent = label;
                    sortSelect.appendChild(opt);
                });
                sortSelect.value = sortBy;
                sortSelect.addEventListener("change", () => {
                    sortBy = sortSelect.value;
                    renderImages();
                });

                // ASC/DESC toggle
                const orderBtn = document.createElement("button");
                orderBtn.className = "fg-toolbar-btn active";
                orderBtn.title = "Toggle sort direction";
                orderBtn.textContent = "ASC";
                orderBtn.addEventListener("click", () => {
                    sortAsc = !sortAsc;
                    orderBtn.textContent = sortAsc ? "ASC" : "DESC";
                    orderBtn.classList.toggle("active", sortAsc);
                    renderImages();
                });

                // Filter input
                const filterInput = document.createElement("input");
                filterInput.type = "text";
                filterInput.className = "fg-filter-input";
                filterInput.placeholder = "Filter… (*.jpg, asd)";
                filterInput.title = "Filter by name. Use *.ext for extension or text for substring.";
                filterInput.addEventListener("input", () => {
                    filterText = filterInput.value.trim();
                    renderImages();
                });

                // Refresh icon button
                const refreshBtn = document.createElement("button");
                refreshBtn.className = "fg-toolbar-btn";
                refreshBtn.title = "Refresh gallery";
                refreshBtn.innerHTML = "&#8635;"; // ↻
                refreshBtn.style.fontSize = "16px";
                refreshBtn.addEventListener("click", () => refreshGallery());

                toolbar.appendChild(backBtn);
                toolbar.appendChild(upBtn);
                toolbar.appendChild(sortSelect);
                toolbar.appendChild(orderBtn);
                toolbar.appendChild(filterInput);
                toolbar.appendChild(refreshBtn);

                // ── Gallery grid ───────────────────────────────────────
                const galleryContent = document.createElement("div");
                galleryContent.className = "file-gallery-container";

                wrapper.appendChild(toolbar);
                wrapper.appendChild(galleryContent);

                // ── Filter logic ──────────────────────────────────────

                function matchesFilter(filename) {
                    if (!filterText) return true;
                    const f = filterText.toLowerCase();
                    const name = filename.toLowerCase();

                    if (f.startsWith("*.")) {
                        return name.endsWith(f.slice(1)); // *.jpg → ends with .jpg
                    }
                    if (f.endsWith("*")) {
                        return name.startsWith(f.slice(0, -1));
                    }
                    return name.includes(f);
                }

                // ── Render (sort + filter + DOM rebuild) ───────────────

                function renderImages() {
                    // snapshot values so the closure is stable
                    const _sortBy = sortBy;
                    const _sortAsc = sortAsc;

                    let list = allImages.filter(img => matchesFilter(img.filename));

                    list.sort((a, b) => {
                        let cmp = 0;
                        switch (_sortBy) {
                            case "name":
                                cmp = a.filename.toLowerCase().localeCompare(b.filename.toLowerCase());
                                break;
                            case "date":
                                cmp = (Number(a.mtime) || 0) - (Number(b.mtime) || 0);
                                break;
                            case "size":
                                cmp = (Number(a.size) || 0) - (Number(b.size) || 0);
                                break;
                        }
                        // Tiebreaker by name for stable sort
                        if (cmp === 0) {
                            cmp = a.filename.toLowerCase().localeCompare(b.filename.toLowerCase());
                        }
                        return _sortAsc ? cmp : -cmp;
                    });

                    if (list.length === 0) {
                        galleryContent.innerHTML = "<div class='file-gallery-message'>No images match the filter.</div>";
                        imageElements = [];
                        return;
                    }

                    galleryContent.innerHTML = "";
                    imageElements = [];

                    const selectedRaw = selectedImageWidget ? selectedImageWidget.value : "";
                    let selectedList = [];
                    try {
                        if (selectedRaw.startsWith("[") && selectedRaw.endsWith("]")) {
                            selectedList = JSON.parse(selectedRaw);
                        } else if (selectedRaw) {
                            selectedList = [selectedRaw];
                        }
                    } catch {
                        selectedList = selectedRaw ? [selectedRaw] : [];
                    }

                    list.forEach(img => {
                        const item = document.createElement("div");
                        item.className = "file-gallery-item";
                        if (selectedList.includes(img.filename)) item.classList.add("selected");

                        const checkbox = document.createElement("div");
                        checkbox.className = "file-gallery-checkbox";
                        item.appendChild(checkbox);

                        const imgEl = document.createElement("img");
                        imgEl.src = img.thumbnail;
                        imgEl.loading = "lazy";
                        imgEl.title = img.filename;
                        item.appendChild(imgEl);

                        item.addEventListener("click", () => {
                            imageElements.forEach(el => el.classList.remove("selected"));
                            item.classList.add("selected");
                            if (selectedImageWidget) {
                                selectedImageWidget.value = img.filename;
                                if (selectedImageWidget.callback) selectedImageWidget.callback(img.filename);
                            }
                        });

                        galleryContent.appendChild(item);
                        imageElements.push(item);
                    });

                    updateThumbnailSize();
                }

                // ── Thumbnail size sync ────────────────────────────────

                const updateThumbnailSize = () => {
                    if (!thumbSizeWidget) return;
                    const size = thumbSizeWidget.value + "px";
                    imageElements.forEach(item => {
                        item.style.width = size;
                        item.style.height = size;
                    });
                };

                // ── Fetch from server ──────────────────────────────────

                const refreshGallery = async () => {
                    const path = folderPathWidget?.value;
                    if (!path) return;

                    if (path !== currentPath) {
                        currentPath = path;
                        galleryContent.innerHTML = "<div class='file-gallery-message'>Loading images…</div>";
                    }

                    try {
                        const res = await fetch(`/file_gallery/folder_images?path=${encodeURIComponent(path)}`);
                        if (!res.ok) {
                            let msg = res.statusText;
                            try { const d = await res.json(); msg = d.error || msg; } catch { }
                            galleryContent.innerHTML = `<div class='file-gallery-message' style='color:#f44336;'>Error: ${msg}</div>`;
                            return;
                        }

                        const data = await res.json();
                        allImages = data.images || [];

                        if (allImages.length === 0) {
                            galleryContent.innerHTML = "<div class='file-gallery-message'>No images found in folder.</div>";
                            imageElements = [];
                            return;
                        }

                        renderImages();
                    } catch (error) {
                        galleryContent.innerHTML = `<div class='file-gallery-message' style='color:#f44336;'>Failed to fetch: ${error.message}</div>`;
                    }
                };

                // ── Wire thumb-size widget ─────────────────────────────
                if (thumbSizeWidget) {
                    const ogThumbCallback = thumbSizeWidget.callback;
                    thumbSizeWidget.callback = function () {
                        const result = ogThumbCallback ? ogThumbCallback.apply(this, arguments) : undefined;
                        updateThumbnailSize();
                        return result;
                    };
                }

                // ── Browse button (Comfy widget, BEFORE DOM widget) ────
                this.addWidget("button", "Browse System Folder", "browse", async () => {
                    try {
                        const res = await fetch("/file_gallery/browse_folder");
                        const data = await res.json();
                        if (data.path) {
                            navigateTo(data.path);
                        }
                    } catch (e) {
                        console.error("Browse error", e);
                    }
                });

                // ── DOM widget ─────────────────────────────────────────
                const galleryWidget = this.addDOMWidget("Gallery", "div", wrapper, {
                    serialize: false,
                    hideOnZoom: false,
                });

                // ── Resize handler ─────────────────────────────────────
                // We give `wrapper` an explicit pixel height equal to the
                // space available after the top Comfy widgets, then let
                // CSS flexbox fill the toolbar + scrollable gallery inside.
                //
                // Top widget heights (approx):
                //   Title bar    : 30 px
                //   folder_path  : 22 px
                //   thumbnail_size: 22 px
                //   Browse button: 22 px
                //   Gaps/padding : 14 px
                //                 ─────
                //   Total offset : 110 px
                //
                // We subtract an extra 10 px safety margin so the node
                // border is never clipped.
                const TOP_OFFSET = 135;

                const onResize = this.onResize;
                this.onResize = function (size) {
                    if (onResize) onResize.apply(this, arguments);
                    const h = Math.max(size[1] - TOP_OFFSET, 150);
                    wrapper.style.height = h + "px";
                };

                // Tell ComfyUI layout engine a constant height so it
                // doesn't grow the node infinitely.
                galleryWidget.computeSize = function (width) {
                    return [width, 320];
                };

                // ── Initial size & first load ──────────────────────────
                this.setSize([380, 520]);
                // Trigger onResize to set initial wrapper height
                this.onResize(this.size);

                // ── Intercept folder_path changes ──────────────────────
                if (folderPathWidget) {
                    const originalCallback = folderPathWidget.callback;
                    folderPathWidget.callback = function () {
                        const result = originalCallback ? originalCallback.apply(this, arguments) : undefined;
                        if (this._timeout) clearTimeout(this._timeout);
                        this._timeout = setTimeout(() => refreshGallery(), 800);
                        return result;
                    };

                    if (folderPathWidget.value) {
                        setTimeout(() => refreshGallery(), 500);
                    }
                }

                return r;
            };
        }
    }
});
