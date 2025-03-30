console.log("✅ Came from photobooth?", sessionStorage.getItem('cameFromPhotobooth'));
console.log("✅ Photos retrieved from session:", sessionStorage.getItem('photos'));
console.log("EDIT PAGE LOADED");
console.log("DIAGNOSTIC: Came from photobooth?", sessionStorage.getItem('cameFromPhotobooth'));
console.log("DIAGNOSTIC: Photos in storage?", sessionStorage.getItem('photos') ? "Yes" : "No");
if (sessionStorage.getItem('photos')) {
    console.log("DIAGNOSTIC: Storage data length:", sessionStorage.getItem('photos').length);
    console.log("DIAGNOSTIC: First 50 chars:", sessionStorage.getItem('photos').substring(0, 50));
}
console.log("Edit page loaded!");

// Main variables
let editCanvas = document.getElementById('editCanvas');
let editCtx = editCanvas ? editCanvas.getContext('2d') : null;
console.log("Canvas found:", editCanvas !== null);
let downloadBtn = document.getElementById('downloadBtn');
let backBtn = document.getElementById('backBtn');
let bgOptions = document.querySelectorAll('.bg-option');
let colorOptions = document.querySelectorAll('.color-option');

// Photo data
let photoData = [];
let currentBackground = 'none';
let currentColor = null;

// Sticker variables
let stickers = [];
let activeSticker = null;
let isDragging = false;
let offsetX, offsetY;

// Initialize the canvas
function initCanvas() {
    if (!editCanvas) {
        console.error("Canvas element not found!");
        const fallback = document.createElement('div');
        fallback.innerHTML = `
            <h2 style="color: red">Canvas Error</h2>
            <p>Please reload the page</p>
        `;
        const container = document.querySelector('.edit-canvas-container');
        if (container) {
            container.appendChild(fallback);
        } else {
            document.body.appendChild(fallback);
        }
        return;
    }
    
    editCanvas.width = 1300;  
    editCanvas.height = 3700; 
    editCanvas.style.display = 'block';
    editCanvas.style.border = '1px solid #ccc';
    
    console.log("Canvas initialized with dimensions:", editCanvas.width, "x", editCanvas.height);
    
    if (!loadPhotosFromStorage()) {
        console.log("No photos loaded, showing message");
        showNoPhotosMessage();
    } else {
        console.log("Photos loaded successfully, rendering canvas");
        renderCanvas();
    }
    
}


async function drawSimplePhotos() {
    // Clear previous interval if exists
    if (footerInterval) clearInterval(footerInterval);
    
    if (!photoData || photoData.length === 0) {
        console.log("No photo data to draw");
        return;
    }

    console.log("Drawing photos, count:", photoData.length);
    
    const spacing = 10;
    const photoHeight = (editCanvas.height - (spacing * (photoData.length + 1))) / photoData.length;
    const photoWidth = editCanvas.width - (spacing * 2);

    // Clear canvas
    editCtx.clearRect(0, 0, editCanvas.width, editCanvas.height);

    // Load and draw images
    const imagePromises = photoData.map((photoSrc, index) => {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve({ img, index });
            img.onerror = () => resolve({ img: null, index });
            img.src = photoSrc;
        });
    });

    const results = await Promise.all(imagePromises);
    
    // Draw images/error placeholders
    results.forEach(({ img, index }) => {
        const y = spacing + (photoHeight + spacing) * index;
        
        if (img) {
            editCtx.drawImage(img, spacing, y, photoWidth, photoHeight);
        } else {
            editCtx.fillStyle = '#FFDDDD';
            editCtx.fillRect(spacing, y, photoWidth, photoHeight);
            editCtx.fillStyle = '#FF0000';
            editCtx.font = '16px Arial';
            editCtx.textAlign = 'center';
            editCtx.fillText('Failed to load photo', 
                spacing + photoWidth/2, y + photoHeight/2);
        }
    });


}





function showNoPhotosMessage() {
    console.log("Showing no photos message");
    
    // Clear canvas if it exists
    if (editCtx) {
        editCtx.clearRect(0, 0, editCanvas.width, editCanvas.height);
        editCtx.fillStyle = '#f8f9fa';
        editCtx.fillRect(0, 0, editCanvas.width, editCanvas.height);
        
        // Add text directly to canvas
        editCtx.fillStyle = '#dc3545';
        editCtx.font = '24px Arial';
        editCtx.textAlign = 'center';
        editCtx.fillText('No Photos Found', editCanvas.width/2, editCanvas.height/2 - 20);
        editCtx.font = '16px Arial';
        editCtx.fillText('Please return to the photobooth and take photos first.', 
            editCanvas.width/2, editCanvas.height/2 + 20);
    }
    
    // Create a message container
    const messageContainer = document.createElement('div');
    messageContainer.className = 'no-photos-message';
    messageContainer.style.textAlign = 'center';
    messageContainer.style.padding = '20px';
    messageContainer.style.margin = '20px auto';
    messageContainer.style.maxWidth = '500px';
    messageContainer.style.backgroundColor = '#f8d7da';
    messageContainer.style.color = '#721c24';
    messageContainer.style.borderRadius = '5px';
    messageContainer.style.border = '1px solid #f5c6cb';
    
    messageContainer.innerHTML = `
        <h3>No Photos Found</h3>
        <p>Please return to the photobooth and take photos first.</p>
        <button id="returnToPhotoBooth" 
            style="background-color: #007bff; color: white; border: none; padding: 10px 15px; 
            border-radius: 5px; cursor: pointer; margin-top: 10px;">
            Return to Photobooth
        </button>
    `;
    
    
    // Find the canvas container and append the message
    const canvasContainer = document.querySelector('.edit-canvas-container');
    if (canvasContainer) {
        canvasContainer.appendChild(messageContainer);
        
        // Add event listener to the return button
        document.getElementById('returnToPhotoBooth').addEventListener('click', function() {
            window.location.href = 'photobooth.html';
        });
    } else {
        // Fallback to body if container not found
        document.body.appendChild(messageContainer);
    }
}
function debugSessionStorage() {
    console.log("---- SESSION STORAGE DEBUG ----");
    console.log("All keys:", Object.keys(sessionStorage));
    
    let totalSize = 0;
    for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        const value = sessionStorage.getItem(key);
        const size = (value ? value.length : 0);
        totalSize += size;
        console.log(`Key: ${key}, Size: ${size} bytes`);
    }
    
    console.log(`Total session storage size: ${totalSize} bytes`);
    console.log("---- END DEBUG ----");
}

// Call this debug function early in page load
window.addEventListener('load', function() {
    console.log("Window loaded - Edit Page");
    debugSessionStorage();
    
    // Rest of your initialization code...
});
// Load photos from session storage
// Replace the existing loadPhotosFromStorage() with:
function loadPhotosFromStorage() {
    console.log("Loading photos from session storage...");
    try {
        const storedData = sessionStorage.getItem('photos');
        if (!storedData) {
            console.error("No photos found in session storage.");
            return false;
        }

        photoData = JSON.parse(storedData);
        
        if (!Array.isArray(photoData)) {
            console.log("Converting to array");
            photoData = [photoData];
        }

        console.log("Loaded", photoData.length, "photos");
        return photoData.length > 0;
    } catch (error) {
        console.error("Error loading photos:", error);
        return false;
    }
}

// Render the canvas with photos and background
function renderCanvas() {
    if (!editCanvas || !editCtx) {
        console.error("Cannot render - canvas or context missing");
        return;
    }
    
    console.log("Rendering canvas with photos...");
    
    // Clear canvas
    editCtx.clearRect(0, 0, editCanvas.width, editCanvas.height);
    
    // Draw background
    if (currentColor) {
        // Draw color background
        editCtx.fillStyle = currentColor;
        editCtx.fillRect(0, 0, editCanvas.width, editCanvas.height);
    } else if (currentBackground && currentBackground !== 'none') {
        // Draw image background
        const bgImg = new Image();
        bgImg.src = currentBackground;
        bgImg.onload = function() {
            editCtx.drawImage(bgImg, 0, 0, editCanvas.width, editCanvas.height);
            drawPhotos(); // Draw photos after background loads
        };
        return; // Exit to avoid double drawing photos
    } else {
        // Default white background
        editCtx.fillStyle = '#FFFFFF';
        editCtx.fillRect(0, 0, editCanvas.width, editCanvas.height);
    }
    
    // Draw photos directly if no image background to wait for
    drawPhotos();
}

// Set background image
function setBackgroundImage(bgSrc) {
    console.log("Setting background:", bgSrc);
    currentBackground = bgSrc;
    currentColor = null; // Reset color when using image

    // Update UI
    bgOptions.forEach(option => {
        option.classList.remove('selected');
        if (option.getAttribute('data-bg') === bgSrc) {
            option.classList.add('selected');
        }
    });

    colorOptions.forEach(option => {
        option.classList.remove('selected');
    });

    renderCanvas();
}

// Draw photos on the canvas
function drawPhotos() {
    if (!photoData || photoData.length === 0) {
        console.log("No photo data to draw");
        return;
    }

    console.log("Drawing photos, count:", photoData.length);
    
    let loadedCount = 0;
    const totalPhotos = photoData.length;
    
    const topPadding = 70; // Extra space on top
    const bottomPadding = 200; // Extra space for the date
    const spacing = 25;
    const availableHeight = editCanvas.height - (topPadding + bottomPadding + spacing * (totalPhotos - 1));
    const photoHeight = availableHeight / totalPhotos;
    const borderRadius = 8; // Change this for more or less rounding

    photoData.forEach((photo, index) => {
        const img = new Image();
        img.crossOrigin = "Anonymous"; // Handle cross-origin issues
        img.src = photo;

        img.onload = function () {
            const aspectRatio = img.width / img.height;
            const photoWidth = 1100; // Match photobooth size
            const photoHeight = 800;
            const xOffset = (editCanvas.width - photoWidth) / 2;
            const yPosition = topPadding + index * (photoHeight + spacing);
            

            // Draw rounded rectangle
            editCtx.imageSmoothingEnabled = true;
            editCtx.imageSmoothingQuality = 'high';

            editCtx.save();
            editCtx.beginPath();
            drawRoundedRect(editCtx, xOffset, yPosition, photoWidth, photoHeight, borderRadius);
            editCtx.clip(); // Clip the image to the rounded rectangle

            // Draw the image
            editCtx.drawImage(img, xOffset, yPosition, photoWidth, photoHeight);
            
            editCtx.restore(); // Restore to avoid affecting other drawings

            loadedCount++;
            console.log(`Photo ${index + 1}/${totalPhotos} loaded`);
            
            // Draw stickers after all photos are loaded
            if (loadedCount === totalPhotos) {
                console.log("All photos loaded, drawing stickers");
                drawStickers();
            }
        };
        
        img.onerror = function() {
            console.error("Failed to load photo at index", index, "URL:", photo.substring(0, 50) + "...");
            loadedCount++;
            
            // Still attempt to draw stickers even if some photos fail
            if (loadedCount === totalPhotos) {
                drawStickers();
            }
        };
    });
}

// Function to draw a rounded rectangle
function drawRoundedRect(ctx, x, y, width, height, radius) {
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

// Draw stickers on the canvas
function drawStickers() {
    if (!stickers || stickers.length === 0) return;
    
    console.log("Drawing stickers, count:", stickers.length);
    
    stickers.forEach(sticker => {
        if (sticker && sticker.image) {
            editCtx.drawImage(
                sticker.image, 
                sticker.x, 
                sticker.y, 
                sticker.width, 
                sticker.height
            );
        }
    });
}

// Handle sticker click to move to top
function handleStickerClick(e) {
    if (!editCanvas || stickers.length === 0) return;
    
    const rect = editCanvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Check in reverse order to handle topmost stickers first
    for (let i = stickers.length - 1; i >= 0; i--) {
        const sticker = stickers[i];
        
        if (
            mouseX >= sticker.x && 
            mouseX <= sticker.x + sticker.width &&
            mouseY >= sticker.y && 
            mouseY <= sticker.y + sticker.height
        ) {
            // Found a sticker that was clicked
            activeSticker = sticker;
            
            // Move sticker to top (y = 50)
            sticker.y = 50;
            
            // Re-render the canvas
            renderCanvas();
            
            // Stop checking once we've found a sticker
            break;
        }
    }
}

// Set background color
function setBackgroundColor(color) {
    currentColor = color;
    currentBackground = 'none'; // Reset image when using color
    
    // Update UI
    colorOptions.forEach(option => {
        option.classList.remove('selected');
        if (option.getAttribute('data-color') === color) {
            option.classList.add('selected');
        }
    });
    
    bgOptions.forEach(option => {
        option.classList.remove('selected');
        if (option.getAttribute('data-bg') === 'none') {
            option.classList.add('selected');
        }
    });
    
    renderCanvas();
}

// Download the edited photo
function downloadPhoto() {
    if (!editCanvas) return;
    
    // Use PNG for highest quality
    const link = document.createElement('a');
    link.download = 'framex-photobooth.png';
    link.href = editCanvas.toDataURL('image/png', 1.0);
    link.click();
}

// Go back to photobooth
function goBack() {
    window.location.href = 'photobooth.html';
}

// Sticker preset configurations
const stickerPresets = {
    "girlpop": [
        { src: "stickers/black.png", x: 50, y: 100, size: 500 },
        { src: "stickers/", x: 400, y: 200, size: 80 },
        { src: "stickers/star.png", x: 100, y: 700, size: 60 },
        { src: "stickers/butterfly.png", x: 350, y: 800, size: 75 },
        { src: "stickers/sparkle.png", x: 200, y: 400, size: 65 }
    ],
    "cute": [
        { src: "stickers/sanrio.png", x: 980, y: -30, size: 400 },
        { src: "stickers/sanrio1.png", x: -50, y: 550, size: 400 },
        { src: "stickers/sanrio2.png", x: 970, y: 1400, size: 400 },
        { src: "stickers/sanrio3.png", x: -80, y: 2250, size: 400 },
        { src: "stickers/sanrio4.png", x: 950, y: 3000, size: 400 }
    ],
    "mofusand": [
        { src: "stickers/cat1.png", x: 920, y: -140, size: 500 },
        { src: "stickers/cat2.png", x: 950, y: 1350, size: 550},
        { src: "stickers/cat3.png", x: -150, y: 550, size: 500 },
        { src: "stickers/cat4.png", x: -150, y: 2220, size: 500 },
        { src: "stickers/cat6.png", x: 900, y: 2900, size: 550 }
    ],
    "shinchan": [
        { src: "stickers/black.png", x: -100, y: -150, size: 500 },
        { src: "stickers/black1.png", x: 1000, y: 700, size: 300 },
        { src: "stickers/black2.png", x: 1050, y: 2400, size: 250 },
        { src: "stickers/black3.png", x: -30, y: 1500, size: 350 },
        { src: "stickers/black4.png", x: -20, y: 3000, size: 300 },
        { src: "stickers/black5.png", x: -20, y: 3000, size: 300 },
        { src: "stickers/black6.png", x: -20, y: 2300, size: 250 },
        { src: "stickers/black7.png", x: -20, y: 800, size: 250 },
        { src: "stickers/black8.png", x: 1050, y: 1500, size: 250 },
        { src: "stickers/black9.png", x: 1050, y: 3100, size: 250 },
        { src: "stickers/black10.png", x: 1050, y: -10, size: 250 },
    ],
    "miffy": [ // Corrected from "piffy" to "miffy"
        { src: "stickers/ghibli.png", x: -50, y: 20, size: 450 },
        { src: "stickers/ghibli1.png", x: 1000, y: 800, size: 300 },
        { src: "stickers/ghibli5.png", x: 1000, y: -10, size: 300 },
        { src: "stickers/ghibli2.png", x: -10, y: 1500, size: 350 },
        { src: "stickers/ghibli6.png", x: -40, y: 800, size: 550 },
        { src: "stickers/ghibli3.png", x: 1000, y: 2250, size: 300 },
        { src: "stickers/ghibli8.png", x: -10, y: 2250, size: 300 },
        { src: "stickers/ghibli7.png", x: 1000, y: 1800, size: 300 },
        { src: "stickers/ghibli4.png", x: -50, y: 3100, size: 400 },
        { src: "stickers/ghibli9.png", x: 1000, y: 3100, size: 400 }
    ],
    "hirono": [ 
        { src: "stickers/hirono1.png", x: -50, y: -10, size: 350 },
        { src: "stickers/hirono10.png", x: -50, y: 700, size: 350 },
        { src: "stickers/hirono9.png", x: 1100, y: -10, size: 280 },
        { src: "stickers/hirono2.png", x: 1000, y: 750, size: 350 },
        { src: "stickers/hirono8.png", x: 1000, y: 1350, size: 450 },
        { src: "stickers/hirono3.png", x: -10, y: 1500, size: 350 },
        { src: "stickers/hirono4.png", x: 1000, y: 2250, size: 300 },
        { src: "stickers/hirono7.png", x: 1000, y: 3100, size: 300 },
        { src: "stickers/hirono5.png", x: -50, y: 2500, size: 300 },
        { src: "stickers/hirono6.png", x: -50, y: 2100, size: 300 },
    ]
};

// Function to apply sticker preset
function applyStickerPreset(presetName) {
    console.log("Applying sticker preset:", presetName);
    
    // Clear existing stickers
    stickers = [];
    activeSticker = null;
    
    if (presetName === "none" || presetName === "no stickers") {
        renderCanvas();
        return;
    }
    
    const preset = stickerPresets[presetName.toLowerCase()];
    if (!preset) {
        console.error("Preset not found:", presetName);
        return;
    }
    
    // Load all stickers from the preset
    let loadedCount = 0;
    preset.forEach(stickerInfo => {
        if (!stickerInfo.src) {
            loadedCount++;
            return;
        }
        
        const sticker = new Image();
        sticker.src = stickerInfo.src;
        
        sticker.onload = function() {
            const aspectRatio = sticker.width / sticker.height;
            const width = stickerInfo.size;
            const height = width / aspectRatio;
            
            const newSticker = {
                image: sticker,
                x: stickerInfo.x,
                y: stickerInfo.y,
                width: width,
                height: height
            };
            
            stickers.push(newSticker);
            loadedCount++;
            
            // Render when all stickers are loaded
            if (loadedCount === preset.length) {
                renderCanvas();
            }
        };
        
        sticker.onerror = function() {
            console.error("Failed to load sticker:", stickerInfo.src);
            loadedCount++;
            
            // Continue rendering even if some stickers fail
            if (loadedCount === preset.length) {
                renderCanvas();
            }
        };
    });
}

// Check if photos are stored in session storage after page load
function checkSessionStorage() {
    const storedPhotos = sessionStorage.getItem('photos'); // Changed from 'capturedPhotos'
    console.log("Initial session storage check:", storedPhotos ? "Found photos" : "No photos found");
}

// Initialize when page loads
window.addEventListener('load', function() {
    console.log("Window loaded - Edit Page");
    checkSessionStorage();
    
    // Initialize event listeners
    if (downloadBtn) {
        downloadBtn.addEventListener('click', downloadPhoto);
        console.log("Download button listener added");
    } else {
        console.error("Download button not found");
    }
    
    if (backBtn) {
        backBtn.addEventListener('click', goBack);
        console.log("Back button listener added");
    } else {
        console.error("Back button not found");
    }
    
    // Background image selection
    if (bgOptions && bgOptions.length > 0) {
        console.log("Found", bgOptions.length, "background options");
        bgOptions.forEach(option => {
            option.addEventListener('click', function() {
                const bgSrc = this.getAttribute('data-bg');
                setBackgroundImage(bgSrc);
            });
        });
    } else {
        console.error("Background options not found");
    }
    
    // Background color selection
    if (colorOptions && colorOptions.length > 0) {
        console.log("Found", colorOptions.length, "color options");
        colorOptions.forEach(option => {
            option.addEventListener('click', function() {
                const color = this.getAttribute('data-color');
                setBackgroundColor(color);
            });
        });
    } else {
        console.error("Color options not found");
    }
    
    // Add click event listener to the canvas for handling sticker clicks
    if (editCanvas) {
        editCanvas.addEventListener('click', handleStickerClick);
        console.log("Canvas click listener added");
    }
    
    // Initialize canvas
    initCanvas();
    
    // Initialize empty stickers array
    stickers = [];
    
    // Add sticker category event listeners
    const stickerCategories = document.querySelectorAll('.sticker-category');
    if (stickerCategories && stickerCategories.length > 0) {
        console.log("Found", stickerCategories.length, "sticker categories");
        stickerCategories.forEach(category => {
            category.addEventListener('click', function() {
                console.log("Sticker category clicked:", this.textContent);
                
                // Update UI
                stickerCategories.forEach(cat => cat.classList.remove('selected'));
                this.classList.add('selected');
                
                // Apply the selected preset
                const presetName = this.getAttribute('data-category');
                applyStickerPreset(presetName);
            });
        });
    } else {
        console.error("Sticker categories not found");
    }
});
console.log("Canvas element exists:", document.getElementById('editCanvas') !== null);
window.onload = function () {
    let photos = JSON.parse(sessionStorage.getItem('photos'));
    if (photos && photos.length > 0) {
        let img = document.createElement('img');
        img.src = photos[0]; // Load the first image
        img.style.width = "300px"; // Adjust size if needed
    } else {
        console.log("No images found in sessionStorage.");
    }
};
