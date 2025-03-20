console.log("Edit page loaded!");

// Main variables
let editCanvas = document.getElementById('editCanvas');
let editCtx = editCanvas.getContext('2d');
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
    // Set canvas dimensions based on the device's screen size
    const canvasWidth = Math.min(window.innerWidth * 0.9, 500); // Adjust width dynamically
    const canvasHeight = Math.min(window.innerHeight * 0.8, 1300); // Adjust height dynamically

    editCanvas.width = canvasWidth;
    editCanvas.height = canvasHeight;

    // Clear canvas with white background
    editCtx.fillStyle = '#FFFFFF';
    editCtx.fillRect(0, 0, editCanvas.width, editCanvas.height);

    // Debugging: Log canvas dimensions
    console.log("Canvas dimensions:", editCanvas.width, editCanvas.height);

    // Try to load photos from session storage
    loadPhotosFromStorage();
}

// Load photos from session storage
function loadPhotosFromStorage() {
    try {
        const storedPhotos = sessionStorage.getItem('capturedPhotos');
        console.log("Stored photos from sessionStorage:", storedPhotos); // Debugging

        if (storedPhotos) {
            photoData = JSON.parse(storedPhotos);
            console.log("Parsed photo data:", photoData); // Debugging
            renderCanvas();
        } else {
            console.error("No photos found in sessionStorage.");
            // Show a message on canvas
            editCtx.fillStyle = '#333333';
            editCtx.font = '24px "League Spartan", sans-serif';
            editCtx.textAlign = 'center';
            editCtx.fillText('No photos available. Please go back and take photos.', 
                editCanvas.width / 2, editCanvas.height / 2);
        }
    } catch (error) {
        console.error("Error loading photos from sessionStorage:", error);
    }
}

// Render the canvas with photos and background
function renderCanvas() {
    // Clear canvas
    editCtx.clearRect(0, 0, editCanvas.width, editCanvas.height);

    // Draw background color if set
    if (currentColor) {
        editCtx.fillStyle = currentColor;
        editCtx.fillRect(0, 0, editCanvas.width, editCanvas.height);
    }

    // Draw background image if set
    if (currentBackground && currentBackground !== 'none') {
        const bgImage = new Image();
        bgImage.src = currentBackground;

        bgImage.onload = function () {
            // Draw the background image
            editCtx.drawImage(bgImage, 0, 0, editCanvas.width, editCanvas.height);

            // Draw photos and stickers on top of the background
            drawPhotos();
            drawStickers();
        };

        bgImage.onerror = function () {
            console.error("Failed to load background image:", currentBackground);
        };
    } else {
        // If no background image, just draw photos and stickers
        drawPhotos();
        drawStickers();
    }
}

// Draw photos on the canvas
function drawPhotos() {
    if (photoData.length === 0) return;

    const topPadding = 50; // Extra space on top
    const bottomPadding = 100; // Extra space for the date
    const spacing = 25;
    const availableHeight = editCanvas.height - (topPadding + bottomPadding + spacing * (photoData.length - 1));
    const photoHeight = availableHeight / photoData.length;
    const borderRadius = 8; // Change this for more or less rounding

    // Create an array of promises for image loading
    const imagePromises = photoData.map((photo, index) => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.src = photo;

            img.onload = function () {
                const aspectRatio = img.width / img.height;
                const photoWidth = editCanvas.width * 0.8; // Adjust width dynamically (80% of canvas width)
                const xOffset = (editCanvas.width - photoWidth) / 2;
                const yPosition = topPadding + index * (photoHeight + spacing);

                // Draw rounded rectangle
                editCtx.save();
                editCtx.beginPath();
                drawRoundedRect(editCtx, xOffset, yPosition, photoWidth, photoHeight, borderRadius);
                editCtx.clip(); // Clip the image to the rounded rectangle

                // Draw the image
                editCtx.drawImage(img, xOffset, yPosition, photoWidth, photoHeight);
                editCtx.restore(); // Restore to avoid affecting other drawings

                resolve();
            };

            img.onerror = function () {
                console.error("Failed to load photo:", photo);
                reject();
            };
        });
    });

    // Wait for all images to load before drawing stickers
    Promise.all(imagePromises)
        .then(() => {
            drawStickers();
        })
        .catch((error) => {
            console.error("Error loading photos:", error);
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
    stickers.forEach(sticker => {
        editCtx.drawImage(
            sticker.image, 
            sticker.x, 
            sticker.y, 
            sticker.width, 
            sticker.height
        );
    });
}

// Handle sticker click to move to top
function handleStickerClick(e) {
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

// Set background image
function setBackgroundImage(bgSrc) {
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
    const link = document.createElement('a');
    link.download = 'framex-photobooth.png';
    link.href = editCanvas.toDataURL('image/png');
    link.click();
}

// Go back to photobooth
function goBack() {
    window.location.href = 'photobooth.html';
}

// Sticker preset configurations
const stickerPresets = {
    "girlypop": [
        { src: "/", x: 50, y: 100, size: 70 },
        { src: "/stickers/flower.png", x: 400, y: 200, size: 80 },
        { src: "/stickers/star.png", x: 100, y: 700, size: 60 },
        { src: "/stickers/butterfly.png", x: 350, y: 800, size: 75 },
        { src: "/stickers/sparkle.png", x: 200, y: 400, size: 65 }
    ],
    "cute": [
        { src: "/stickers/rabbit.png", x: 80, y: 150, size: 80 },
        { src: "/stickers/bear.png", x: 380, y: 250, size: 90 },
        { src: "/stickers/bow.png", x: 120, y: 650, size: 50 },
        { src: "/stickers/icecream.png", x: 300, y: 850, size: 70 }
    ],
    "mofusand": [
        { src: "/", x: 460, y: 150, size: 70 },
        { src: "/stickers/cat.png", x: -50, y: 200, size: 200},
        { src: "/stickers/cat2.png", x: 320, y: 500, size: 200 },
        { src: "/stickers/cat5.png", x: 350, y: -30, size: 200 },
        { src: "/stickers/penguin.png", x: 240, y: 480, size: 70 },
        { src: "/stickers/shinchan2.png", x: 460, y: 500, size: 70 },
        { src: "/stickers/shinchan3.png", x: 240, y: 550, size: 70 },
        { src: "/stickers/hamster.png", x: 440, y: 680, size: 70 },
        { src: "/stickers/paw.png", x: 240, y: 680, size: 40 },
        { src: "/", x: -50, y: 350, size: 250 },
        { src: "/stickers/cat3.png", x: 40  , y: 950, size: 450 }
    ],
    "shinchan": [
        { src: "/stickers/shinchan1.png", x: 80, y: 150, size: 90 },
        { src: "/stickers/shinchan2.png", x: 400, y: 300, size: 90 },
        { src: "/stickers/shinchan3.png", x: 100, y: 500, size: 90 },
        { src: "/stickers/shinchan4.png", x: 350, y: 700, size: 90 }
    ],
    "miffy": [
        { src: "/stickers/miffy1.png", x: 50, y: 120, size: 80 },
        { src: "/stickers/miffy2.png", x: 420, y: 250, size: 80 },
        { src: "/stickers/miffy3.png", x: 100, y: 500, size: 80 },
        { src: "/stickers/miffy4.png", x: 380, y: 650, size: 80 },
        { src: "/stickers/miffy5.png", x: 150, y: 850, size: 80 }
    ]
};

// Function to apply sticker preset
function applyStickerPreset(presetName) {
    // Clear existing stickers
    stickers = [];
    activeSticker = null;
    
    if (presetName === "none") {
        renderCanvas();
        return;
    }
    
    const preset = stickerPresets[presetName];
    if (!preset) {
        console.error("Preset not found:", presetName);
        return;
    }
    
    // Load all stickers from the preset
    let loadedCount = 0;
    preset.forEach(stickerInfo => {
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

// Event listeners
downloadBtn.addEventListener('click', downloadPhoto);
backBtn.addEventListener('click', goBack);

// Background image selection
bgOptions.forEach(option => {
    option.addEventListener('click', function() {
        const bgSrc = this.getAttribute('data-bg');
        setBackgroundImage(bgSrc);
    });
});

// Background color selection
colorOptions.forEach(option => {
    option.addEventListener('click', function() {
        const color = this.getAttribute('data-color');
        setBackgroundColor(color);
    });
});

// Add click event listener to the canvas for handling sticker clicks
editCanvas.addEventListener('click', handleStickerClick);

// Initialize when page loads
window.addEventListener('load', function() {
    initCanvas();
    // Initialize empty stickers array
    stickers = [];
});

// Add event listeners for sticker categories
document.addEventListener('DOMContentLoaded', function() {
    // Add sticker category event listeners
    const stickerCategories = document.querySelectorAll('.sticker-category');
    stickerCategories.forEach(category => {
        category.addEventListener('click', function() {
            // Update UI
            stickerCategories.forEach(cat => cat.classList.remove('selected'));
            this.classList.add('selected');
            
            // Apply the selected preset
            const presetName = this.getAttribute('data-category');
            applyStickerPreset(presetName);
        });
    });
});