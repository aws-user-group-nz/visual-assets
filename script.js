const state = { q: "", tags: new Set(), type: "", size: "", data: [] };
const dimensionCache = new Map();

// Resolve image dimensions (uses cache and falls back to real image load)
function getAssetDimensions(asset) {
    if (!asset) return Promise.reject(new Error("Missing asset"));

    // If width/height already provided in data, use and cache them
    if (asset.width && asset.height) {
        const dims = { width: asset.width, height: asset.height };
        dimensionCache.set(asset.path, dims);
        return Promise.resolve(dims);
    }

    // Cache hit
    const cached = dimensionCache.get(asset.path);
    if (cached) return Promise.resolve(cached);

    // Load image to measure
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const dims = { width: img.naturalWidth, height: img.naturalHeight };
            dimensionCache.set(asset.path, dims);
            resolve(dims);
        };
        img.onerror = () => reject(new Error(`Failed to load ${asset.path} for dimension read`));
        img.src = asset.path;
    });
}

// Resolve video dimensions (uses cache and falls back to real video load)
function getVideoDimensions(asset) {
    if (!asset) return Promise.reject(new Error("Missing asset"));

    // If width/height already provided in data, use and cache them
    if (asset.width && asset.height) {
        const dims = { width: asset.width, height: asset.height };
        dimensionCache.set(asset.path, dims);
        return Promise.resolve(dims);
    }

    // Cache hit
    const cached = dimensionCache.get(asset.path);
    if (cached) return Promise.resolve(cached);

    // Load video to measure
    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.onloadedmetadata = () => {
            const dims = { width: video.videoWidth, height: video.videoHeight };
            dimensionCache.set(asset.path, dims);
            resolve(dims);
        };
        video.onerror = () => reject(new Error(`Failed to load ${asset.path} for dimension read`));
        video.src = asset.path;
    });
}

// Dark mode initialization
function initDarkMode() {
    const saved = localStorage.getItem("darkMode");
    const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = saved !== null ? saved === "true" : systemPrefersDark;

    const html = document.documentElement;
    if (isDark) {
        html.classList.add("dark");
        html.classList.remove("light-mode");
    } else {
        html.classList.remove("dark");
        html.classList.add("light-mode");
    }
    updateDarkModeIcon(isDark);
}

function updateDarkModeIcon(isDark) {
    const icon = document.getElementById("darkModeToggle")?.querySelector(".dark-mode-icon");
    if (icon) {
        icon.textContent = isDark ? "☀️" : "🌙";
    }
}

function toggleDarkMode() {
    const html = document.documentElement;
    const isDark = html.classList.toggle("dark");
    if (isDark) {
        html.classList.remove("light-mode");
    } else {
        html.classList.add("light-mode");
    }
    localStorage.setItem("darkMode", isDark.toString());
    updateDarkModeIcon(isDark);
}

// Extract theme from asset name
function extractTheme(name) {
    if (!name) return "";
    // Extract first part before dash (e.g., "aws-ec2-icon" -> "aws")
    const parts = name.split("-");
    return parts[0] || "";
}

// URL parameter handling
function getParams() {
    const u = new URL(location.href);
    const q = u.searchParams.get("q") || "";
    const tags = (u.searchParams.get("tags") || "").split(",").filter(Boolean);
    const type = u.searchParams.get("type") || "";
    const size = u.searchParams.get("size") || "";
    return { q, tags, type, size };
}

function setParams() {
    const u = new URL(location.href);
    const tags = [...state.tags].join(",");
    if (state.q) u.searchParams.set("q", state.q);
    else u.searchParams.delete("q");
    if (tags) u.searchParams.set("tags", tags);
    else u.searchParams.delete("tags");
    if (state.type) u.searchParams.set("type", state.type);
    else u.searchParams.delete("type");
    if (state.size) u.searchParams.set("size", state.size);
    else u.searchParams.delete("size");
    history.replaceState(null, "", u);
}

// Tag rendering
function renderTags() {
    const all = new Set();
    state.data.forEach(i => {
        if (i.tags) {
            i.tags.forEach(t => all.add(t));
        }
    });
    const wrap = document.getElementById("tags");
    const activeWrap = document.getElementById("activeTags");
    wrap.innerHTML = "";
    activeWrap.innerHTML = "";

    // Show active tags separately
    if (state.tags.size > 0) {
        [...state.tags].sort().forEach(t => {
            const b = document.createElement("button");
            b.textContent = t;
            b.className = "chip chip_on chip-active";
            b.onclick = () => {
                state.tags.delete(t);
                setParams();
                render();
                renderTags();
            };
            activeWrap.appendChild(b);
        });
    }

    // Show all tags
    [...all].sort().forEach(t => {
        const b = document.createElement("button");
        b.textContent = t;
        b.className = state.tags.has(t) ? "chip chip_on" : "chip";
        b.onclick = () => {
            if (state.tags.has(t)) state.tags.delete(t);
            else state.tags.add(t);
            setParams();
            render();
            renderTags();
        };
        wrap.appendChild(b);
    });
}

// Filter matching
function matches(asset) {
    const q = state.q.toLowerCase();
    // Search in name, description, and tags
    const nameHit = asset.name && asset.name.toLowerCase().includes(q);
    const descHit = asset.description && asset.description.toLowerCase().includes(q);
    const tagHit = asset.tags && asset.tags.some(t => t.toLowerCase().includes(q));
    const tagsOk = state.tags.size === 0 || [...state.tags].every(t => asset.tags && asset.tags.includes(t));
    const typeOk = !state.type || asset.type === state.type;
    const sizeOk = !state.size || String(asset.size) === state.size;
    return (q ? (nameHit || descHit || tagHit) : true) && tagsOk && typeOk && sizeOk;
}

// Get file extension (normalized)
function getFileExtension(path) {
    const ext = path.toLowerCase().split('.').pop();
    // Normalize jpeg to jpg
    return ext === 'jpeg' ? 'jpg' : ext;
}

// Check if asset is SVG
function isSvg(path) {
    return getFileExtension(path) === 'svg';
}

// Check if asset is an image (all supported formats)
function isImage(path) {
    const ext = getFileExtension(path);
    return ['svg', 'png', 'jpg', 'webp'].includes(ext);
}

// Check if asset is a video
function isVideo(path) {
    const ext = getFileExtension(path);
    return ['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(ext);
}

// Get image dimensions from asset or image element
async function getImageDimensions(imagePath, asset) {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            resolve({ width: img.naturalWidth, height: img.naturalHeight });
        };
        img.onerror = () => {
            // Fallback to asset size or default
            const size = asset?.size || 512;
            resolve({ width: size, height: size });
        };
        img.src = imagePath;
    });
}

// Generic image to canvas conversion
async function imageToCanvas(imagePath, asset = null) {
    return new Promise(async (resolve, reject) => {
        try {
            const ext = getFileExtension(imagePath);
            let img = new Image();
            img.crossOrigin = 'anonymous';

            if (ext === 'svg') {
                // Handle SVG specially
                const svgText = await fetch(imagePath).then(r => r.text());
                const parser = new DOMParser();
                const svgDoc = parser.parseFromString(svgText, "image/svg+xml");
                const svgElement = svgDoc.documentElement;

                // Get dimensions from SVG
                let width, height;
                const viewBox = svgElement.getAttribute("viewBox");
                if (viewBox) {
                    const [, , vbWidth, vbHeight] = viewBox.split(" ").map(Number);
                    width = vbWidth || 512;
                    height = vbHeight || 512;
                } else {
                    width = Number(svgElement.getAttribute("width")) || 512;
                    height = Number(svgElement.getAttribute("height")) || 512;
                }

                // Use asset size if available
                if (asset && asset.size) {
                    width = asset.size;
                    height = asset.size;
                }

                const svgBlob = new Blob([svgText], { type: "image/svg+xml" });
                const url = URL.createObjectURL(svgBlob);
                img.src = url;

                img.onload = () => {
                    const canvas = document.createElement("canvas");
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext("2d");
                    ctx.drawImage(img, 0, 0, width, height);
                    URL.revokeObjectURL(url);
                    resolve(canvas);
                };
            } else {
                // Handle raster images
                img.src = imagePath;
                img.onload = () => {
                    const canvas = document.createElement("canvas");
                    canvas.width = img.naturalWidth;
                    canvas.height = img.naturalHeight;
                    const ctx = canvas.getContext("2d");
                    ctx.drawImage(img, 0, 0);
                    resolve(canvas);
                };
            }

            img.onerror = reject;
        } catch (error) {
            reject(error);
        }
    });
}

// Convert image to target format
async function convertImage(imagePath, targetFormat, asset = null) {
    try {
        const canvas = await imageToCanvas(imagePath, asset);
        const mimeTypes = {
            'png': 'image/png',
            'jpg': 'image/jpeg',
            'webp': 'image/webp'
        };

        if (targetFormat === 'svg') {
            // Convert raster to embedded SVG
            const base64 = canvas.toDataURL('image/png');
            const dims = { width: canvas.width, height: canvas.height };
            const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${dims.width}" height="${dims.height}"><image href="${base64}" width="${dims.width}" height="${dims.height}"/></svg>`;
            return new Blob([svg], { type: "image/svg+xml" });
        } else {
            // Convert to raster format
            const mimeType = mimeTypes[targetFormat] || 'image/png';
            const quality = targetFormat === 'jpg' || targetFormat === 'jpeg' ? 0.92 : undefined;
            return new Promise((resolve) => {
                canvas.toBlob(resolve, mimeType, quality);
            });
        }
    } catch (error) {
        console.error(`Conversion to ${targetFormat} failed:`, error);
        throw error;
    }
}

// Copy image in specified format
async function copyImage(asset, format, button) {
    try {
        const currentExt = getFileExtension(asset.path);
        const oldHTML = button.innerHTML;
        const oldTitle = button.title;
        let blob;

        // Handle clipboard write
        if (format === 'svg') {
            // SVG: copy as text
            if (format === currentExt) {
                const svg = await fetch(asset.path).then(r => r.text());
                await navigator.clipboard.writeText(svg);
            } else {
                const blob = await convertImage(asset.path, format, asset);
                const text = await blob.text();
                await navigator.clipboard.writeText(text);
            }
        } else {
            // Raster images: Clipboard API only supports PNG, so always convert to PNG
            const canvas = await imageToCanvas(asset.path, asset);
            const pngBlob = await new Promise((resolve) => {
                canvas.toBlob(resolve, 'image/png');
            });
            await navigator.clipboard.write([
                new ClipboardItem({ 'image/png': pngBlob })
            ]);
        }

        button.innerHTML = "✓";
        button.title = "Copied!";
        setTimeout(() => {
            button.innerHTML = oldHTML;
            button.title = oldTitle;
        }, 1000);
    } catch (err) {
        console.error(`Failed to copy ${format}:`, err);
        alert(`Failed to copy ${format.toUpperCase()} to clipboard`);
    }
}

// Download image in specified format
async function downloadImage(asset, format) {
    try {
        const currentExt = getFileExtension(asset.path);
        let blob, filename;

        if (format === currentExt) {
            // Download original file
            const response = await fetch(asset.path);
            blob = await response.blob();
            filename = asset.path.split("/").pop();
        } else {
            // Convert and download
            blob = await convertImage(asset.path, format, asset);
            const baseName = asset.path.split("/").pop().replace(/\.[^/.]+$/, "");
            filename = `${baseName}.${format}`;
        }

        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    } catch (err) {
        console.error(`Failed to download ${format}:`, err);
        alert(`Failed to download ${format.toUpperCase()}`);
    }
}

// Download video (original only)
async function downloadVideo(asset) {
    try {
        const response = await fetch(asset.path);
        const blob = await response.blob();
        const filename = asset.path.split("/").pop();

        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    } catch (err) {
        console.error("Failed to download video:", err);
        alert("Failed to download video");
    }
}

// Copy video URL to clipboard
async function copyVideoUrl(asset, button) {
    try {
        const directPath = asset.path.replace(/^assets\//, '');
        const fullUrl = `https://assets.awsug.nz/${directPath}`;
        await navigator.clipboard.writeText(fullUrl);

        const oldHTML = button.innerHTML;
        const oldTitle = button.title;
        button.innerHTML = "✓";
        button.title = "Copied!";
        setTimeout(() => {
            button.innerHTML = oldHTML;
            button.title = oldTitle;
        }, 1000);
    } catch (err) {
        console.error("Failed to copy video URL:", err);
        alert("Failed to copy video URL to clipboard");
    }
}

// Render assets
function render() {
    const grid = document.getElementById("grid");
    grid.innerHTML = "";
    const frag = document.createDocumentFragment();

    const filteredAssets = state.data.filter(matches);
    const count = filteredAssets.length;
    const total = state.data.length;

    // Update asset count display
    const countElement = document.getElementById("assetCount");
    if (countElement) {
        if (count === total) {
            countElement.textContent = `${total} assets`;
        } else {
            countElement.textContent = `${count} of ${total} assets`;
        }
    }

    filteredAssets.forEach(asset => {
        const card = document.createElement("div");
        card.className = "card";

        const displayName = asset.name || 'Unknown';
        const description = asset.description || `${displayName} ${asset.type || 'asset'}`;
        const theme = extractTheme(asset.name);
        const cachedDims = dimensionCache.get(asset.path) || (asset.width && asset.height ? { width: asset.width, height: asset.height } : null);
        const sizeLabel = cachedDims ? `${cachedDims.width}×${cachedDims.height}` : '';
        const isImageAsset = isImage(asset.path);
        const isVideoAsset = isVideo(asset.path);
        const currentFormat = getFileExtension(asset.path);
        const formats = ['svg', 'png', 'jpg', 'webp'];
        // Show all formats except current one (current format shown separately as "original")
        const availableFormats = formats.filter(f => f !== currentFormat);

        // Get direct URL path for copy path button
        const directPath = asset.path.replace(/^assets\//, '');
        const fullUrl = `https://assets.awsug.nz/${directPath}`;

        // Create a 3x3 grid: copies form a cross, downloads at corners, copy path in center
        // Grid layout (positions):
        // [1,1] [2,1] [3,1]  - Top row
        // [1,2] [2,2] [3,2]  - Middle row (center is copy path)
        // [1,3] [2,3] [3,3]  - Bottom row
        // Pattern: Downloads at corners [1,1], [3,1], [1,3], [3,3]
        //          Copies form cross: [2,1], [1,2], [3,2], [2,3]
        //          Copy path at center [2,2]
        const createButton = (format, action, position, title) => {
            const icon = action === 'download'
                ? '<path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>'
                : '<path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>';
            return `<button class="action-btn ${action}-${format}" data-format="${format}" data-action="${action}" title="${title}" style="grid-column: ${position[0]}; grid-row: ${position[1]};">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">${icon}</svg>
            </button>`;
        };

        const createPathButton = (position) => {
            return `<button class="action-btn copy-path" data-path="${fullUrl}" title="Copy full URL: ${fullUrl}" style="grid-column: ${position[0]}; grid-row: ${position[1]};">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M10 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2h-8l-2-2z"/>
                </svg>
            </button>`;
        };

        let buttons = '';

        if (isImageAsset || isVideoAsset) {
            if (isImageAsset) {
                // Always add copy path at center for images
                buttons += createPathButton([2, 2]);

                // Only create format conversion buttons for images, not videos
                // Assign formats to positions
                // Downloads at corners: [1,1], [3,1], [1,3], [3,3]
                // Copies in cross: [2,1], [1,2], [3,2], [2,3]
                const downloadPositions = [[1, 1], [3, 1], [1, 3], [3, 3]];
                const copyPositions = [[2, 1], [1, 2], [3, 2], [2, 3]];

                // Add buttons for available formats
                for (let i = 0; i < Math.min(availableFormats.length, 4); i++) {
                    const format = availableFormats[i];
                    buttons += createButton(format, 'download', downloadPositions[i], `Download as ${format.toUpperCase()}`);
                    buttons += createButton(format, 'copy', copyPositions[i], `Copy as ${format.toUpperCase()}`);
                }

                // If we have fewer than 4 formats, add original format buttons
                if (availableFormats.length < 4) {
                    const remainingSlots = 4 - availableFormats.length;
                    for (let i = 0; i < remainingSlots && i < 2; i++) {
                        const downloadPos = downloadPositions[availableFormats.length + i];
                        const copyPos = copyPositions[availableFormats.length + i];
                        if (downloadPos) {
                            buttons += createButton(currentFormat, 'download', downloadPos, 'Download original');
                        }
                        if (copyPos) {
                            buttons += createButton(currentFormat, 'copy', copyPos, 'Copy original');
                        }
                    }
                }
            } else if (isVideoAsset) {
                // For videos, add only 2 buttons: download and copy URL, centered and on same level
                // Position them at [1, 2] (left-center) and [3, 2] (right-center) for horizontal alignment
                buttons += createButton(currentFormat, 'download', [1, 2], 'Download original');
                buttons += createPathButton([3, 2]);
            }
        }

        const actionButtons = (isImageAsset || isVideoAsset) ? `<div class="card-actions-grid">${buttons}</div>` : '';

        // Use video tag for videos, img tag for images
        const videoId = `video-${asset.path.replace(/[^a-zA-Z0-9]/g, '-')}`;
        const mediaElement = isVideoAsset
            ? `<video id="${videoId}" src="${asset.path}" class="asset-image" controls preload="metadata" playsinline muted></video>`
            : `<img src="${asset.path}" alt="${displayName}" class="asset-image" loading="lazy" onerror="this.style.display='none'; this.parentElement.innerHTML='<div style=\\'padding: 20px; text-align: center; color: var(--text-secondary);\\'>Image not found</div>'">`;

        card.innerHTML = `
            <div class="asset-container">
                ${mediaElement}
                ${isVideoAsset ? '<div class="video-error-fallback" style="display: none; padding: 20px; text-align: center; color: var(--text-secondary); width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; position: absolute; top: 0; left: 0; background: var(--bg-secondary);">Video not available</div>' : ''}
                ${actionButtons}
            </div>
            <div class="asset-tooltip">
                <div class="tooltip-title">${displayName}</div>
                <div class="tooltip-description">${description}</div>
            </div>
            <div class="card-content">
                <div class="name" data-asset-path="${asset.path}">${displayName}${sizeLabel ? ` (${sizeLabel})` : ''}</div>
                <div class="type-badge">${asset.type || 'asset'}</div>
            </div>
        `;

        // Populate dimensions asynchronously when not already cached
        if (!sizeLabel) {
            if (isImageAsset) {
                getAssetDimensions(asset)
                    .then(dims => {
                        const nameEl = card.querySelector(`.name[data-asset-path="${asset.path}"]`);
                        if (nameEl) {
                            nameEl.textContent = `${displayName} (${dims.width}×${dims.height})`;
                        }
                    })
                    .catch(() => {
                        // Do nothing on failure; leave size blank
                    });
            } else if (isVideoAsset) {
                getVideoDimensions(asset)
                    .then(dims => {
                        const nameEl = card.querySelector(`.name[data-asset-path="${asset.path}"]`);
                        if (nameEl) {
                            nameEl.textContent = `${displayName} (${dims.width}×${dims.height})`;
                        }
                    })
                    .catch(() => {
                        // Do nothing on failure; leave size blank
                    });
            }
        }

        // Attach video error handler
        if (isVideoAsset) {
            const videoElement = card.querySelector(`#${videoId}`);
            const errorFallback = card.querySelector('.video-error-fallback');
            if (videoElement) {
                videoElement.addEventListener('error', () => {
                    if (errorFallback) {
                        errorFallback.style.display = 'flex';
                        videoElement.style.display = 'none';
                    }
                });
                // Also handle case where video loads successfully - hide error fallback
                videoElement.addEventListener('loadedmetadata', () => {
                    if (errorFallback) {
                        errorFallback.style.display = 'none';
                    }
                });
            }
        }

        // Attach event listeners for format actions (only for images, not videos)
        if (isImageAsset) {
            const actionButtons = card.querySelectorAll(".card-actions-grid .action-btn");

            actionButtons.forEach(button => {
                button.addEventListener("click", async (e) => {
                    e.stopPropagation();

                    // Handle path copy button
                    if (button.classList.contains('copy-path')) {
                        const path = button.dataset.path;
                        try {
                            await navigator.clipboard.writeText(path);
                            const oldHTML = button.innerHTML;
                            const oldTitle = button.title;
                            button.innerHTML = "✓";
                            button.title = "Copied!";
                            setTimeout(() => {
                                button.innerHTML = oldHTML;
                                button.title = oldTitle;
                            }, 1000);
                        } catch (err) {
                            console.error("Failed to copy path:", err);
                            alert("Failed to copy path to clipboard");
                        }
                        return;
                    }

                const format = button.dataset.format;
                const action = button.dataset.action;

                if (action === 'copy') {
                    await copyImage(asset, format, button);
                } else if (action === 'download') {
                    await downloadImage(asset, format);
                }
                });
            });
        } else if (isVideoAsset) {
            // For videos, handle download and copy path (URL) buttons
            const actionButtons = card.querySelectorAll(".card-actions-grid .action-btn");

            actionButtons.forEach(button => {
                button.addEventListener("click", async (e) => {
                    e.stopPropagation();

                    // Handle copy path button (folder icon)
                    if (button.classList.contains('copy-path')) {
                        const path = button.dataset.path;
                        try {
                            await navigator.clipboard.writeText(path);
                            const oldHTML = button.innerHTML;
                            const oldTitle = button.title;
                            button.innerHTML = "✓";
                            button.title = "Copied!";
                            setTimeout(() => {
                                button.innerHTML = oldHTML;
                                button.title = oldTitle;
                            }, 1000);
                        } catch (err) {
                            console.error("Failed to copy path:", err);
                            alert("Failed to copy path to clipboard");
                        }
                        return;
                    }

                    // Handle download button
                    const format = button.dataset.format;
                    const action = button.dataset.action;

                    if (action === 'download') {
                        await downloadVideo(asset);
                    }
                });
            });
        }

        frag.appendChild(card);
    });

    grid.appendChild(frag);
}

// Toggle tags visibility
function toggleTags() {
    const tags = document.getElementById("tags");
    const icon = document.getElementById("tagsToggleIcon");
    const isCollapsed = tags.classList.contains("tags-collapsed");

    if (isCollapsed) {
        tags.classList.remove("tags-collapsed");
        icon.textContent = "▲";
        document.getElementById("tagsToggleText").textContent = "Hide Tags";
    } else {
        tags.classList.add("tags-collapsed");
        icon.textContent = "▼";
        document.getElementById("tagsToggleText").textContent = "Show Tags";
    }
}

// Populate size filter dropdown
function populateSizeFilter() {
    const sizeFilter = document.getElementById("sizeFilter");
    if (!sizeFilter) return;

    // Get all unique sizes from assets
    const sizes = new Set();
    state.data.forEach(asset => {
        if (asset.size) {
            sizes.add(String(asset.size));
        }
    });

    // Clear existing options (except "All Sizes")
    while (sizeFilter.children.length > 1) {
        sizeFilter.removeChild(sizeFilter.lastChild);
    }

    // Add size options sorted numerically
    [...sizes].sort((a, b) => Number(a) - Number(b)).forEach(size => {
        const option = document.createElement("option");
        option.value = size;
        option.textContent = `${size}×${size}`;
        sizeFilter.appendChild(option);
    });
}

// Toggle README visibility
function toggleReadme() {
    const readme = document.getElementById("readmeContent");
    const icon = document.getElementById("readmeToggleIcon");
    const isCollapsed = readme.classList.contains("readme-collapsed");

    if (isCollapsed) {
        readme.classList.remove("readme-collapsed");
        icon.textContent = "▲";
        document.getElementById("readmeToggleText").textContent = "Hide README";
    } else {
        readme.classList.add("readme-collapsed");
        icon.textContent = "▼";
        document.getElementById("readmeToggleText").textContent = "Show README";
    }
}

// Back to top button
function initBackToTop() {
    const button = document.getElementById("backToTop");
    if (!button) return;

    function toggleVisibility() {
        if (window.pageYOffset > 300) {
            button.classList.add("visible");
        } else {
            button.classList.remove("visible");
        }
    }

    window.addEventListener("scroll", toggleVisibility);
    button.addEventListener("click", () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    });
}

// Simple markdown to HTML converter (basic support)
function markdownToHtml(markdown) {
    if (!markdown) return '';

    let html = markdown;

    // Code blocks first (to avoid processing content inside)
    const codeBlocks = [];
    html = html.replace(/```([\s\S]*?)```/gim, (match, code) => {
        const id = `CODE_BLOCK_${codeBlocks.length}`;
        codeBlocks.push(`<pre><code>${code.trim()}</code></pre>`);
        return id;
    });

    // Inline code
    html = html.replace(/`([^`]+)`/gim, '<code>$1</code>');

    // Headers (must be at start of line)
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

    // Bold
    html = html.replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>');

    // Italic (but not if it's part of bold)
    html = html.replace(/(?<!\*)\*([^*]+?)\*(?!\*)/gim, '<em>$1</em>');

    // Restore code blocks
    codeBlocks.forEach((block, i) => {
        html = html.replace(`CODE_BLOCK_${i}`, block);
    });

    // Split into lines and process paragraphs
    const lines = html.split('\n');
    const processed = [];
    let currentPara = [];

    lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed) {
            if (currentPara.length > 0) {
                processed.push('<p>' + currentPara.join(' ') + '</p>');
                currentPara = [];
            }
            return;
        }

        // If it's already a tag (header, pre, etc.), add it directly
        if (trimmed.match(/^<(h[1-6]|pre|code|ul|ol|li)/)) {
            if (currentPara.length > 0) {
                processed.push('<p>' + currentPara.join(' ') + '</p>');
                currentPara = [];
            }
            processed.push(trimmed);
        } else {
            currentPara.push(trimmed);
        }
    });

    if (currentPara.length > 0) {
        processed.push('<p>' + currentPara.join(' ') + '</p>');
    }

    return processed.join('\n');
}

// Load README content
async function loadReadme() {
    try {
        const response = await fetch("README.md");
        if (!response.ok) {
            console.warn("README.md not found");
            return;
        }
        const markdown = await response.text();
        const html = markdownToHtml(markdown);
        const readmeBody = document.querySelector(".readme-body");
        if (readmeBody) {
            readmeBody.innerHTML = html;
        }
    } catch (error) {
        console.error("Failed to load README:", error);
    }
}

// Load assets data
async function loadAssets() {
    try {
        const response = await fetch("assets.json");
        if (!response.ok) {
            console.warn("assets.json not found, using empty data");
            state.data = [];
            render();
            return;
        }
        const json = await response.json();
        state.data = json.assets || [];

        // Extract tags from names if not provided
        state.data.forEach(asset => {
            if (!asset.tags) {
                asset.tags = [];
            }
            // Add theme as a tag
            const theme = extractTheme(asset.name);
            if (theme && !asset.tags.includes(theme)) {
                asset.tags.push(theme);
            }
            // Add type as a tag
            if (asset.type && !asset.tags.includes(asset.type)) {
                asset.tags.push(asset.type);
            }
            // Add size as a tag if available
            if (asset.size && !asset.tags.includes(`${asset.size}x${asset.size}`)) {
                asset.tags.push(`${asset.size}x${asset.size}`);
            }
        });

        // Populate size filter
        populateSizeFilter();

        render();
        renderTags();
    } catch (error) {
        console.error("Failed to load assets:", error);
        state.data = [];
        render();
    }
}

// Initialize
document.addEventListener("DOMContentLoaded", () => {
    initDarkMode();

    // Dark mode toggle
    document.getElementById("darkModeToggle")?.addEventListener("click", toggleDarkMode);

    // Search
    const searchInput = document.getElementById("search");
    if (searchInput) {
        const params = getParams();
        state.q = params.q;
        state.tags = new Set(params.tags);
        state.type = params.type;
        state.size = params.size;

        if (state.q) searchInput.value = state.q;
        if (state.type) {
            const typeSelect = document.getElementById("typeFilter");
            if (typeSelect) typeSelect.value = state.type;
        }
        if (state.size) {
            const sizeSelect = document.getElementById("sizeFilter");
            if (sizeSelect) sizeSelect.value = state.size;
        }

        searchInput.addEventListener("input", (e) => {
            state.q = e.target.value;
            setParams();
            render();
        });
    }

    // Type filter
    const typeFilter = document.getElementById("typeFilter");
    if (typeFilter) {
        typeFilter.addEventListener("change", (e) => {
            state.type = e.target.value;
            setParams();
            render();
        });
    }

    // Size filter
    const sizeFilter = document.getElementById("sizeFilter");
    if (sizeFilter) {
        sizeFilter.addEventListener("change", (e) => {
            state.size = e.target.value;
            setParams();
            render();
        });
    }

    // Tags toggle
    document.getElementById("tagsToggle")?.addEventListener("click", toggleTags);

    // README toggle
    document.getElementById("readmeToggle")?.addEventListener("click", toggleReadme);

    // Back to top
    initBackToTop();

    // Load README and assets
    loadReadme();
    loadAssets();
});
