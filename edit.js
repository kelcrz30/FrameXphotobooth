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

// Initialize the canvas
function initCanvas() {
    // Set initial canvas size
    editCanvas.width = 500;
    editCanvas.height = 1300;
    
    // Clear canvas with white background
    editCtx.fillStyle = '#FFFFFF';
    editCtx.fillRect(0, 0, editCanvas.width, editCanvas.height);
    
    // Try to load photos from session storage
    loadPhotosFromStorage();
}

// Load photos from session storage
function loadPhotosFromStorage() {
    const storedPhotos = sessionStorage.getItem('capturedPhotos');
    
    if (storedPhotos) {
        photoData = JSON.parse(storedPhotos);
        renderCanvas();
    } else {
        // If no photos found, show a message on canvas
        editCtx.fillStyle = '#333333';
        editCtx.font = '24px "League Spartan", sans-serif';
        editCtx.textAlign = 'center';
        editCtx.fillText('No photos available. Please go back and take photos.', 
            editCanvas.width / 2, editCanvas.height / 2);
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

    // Draw other backgrounds (except City)
    if (currentBackground && currentBackground !== '/city.png' && currentBackground !== 'none') {
        const bgImage = new Image();
        bgImage.src = currentBackground;
        
        bgImage.onload = function () {
            editCtx.drawImage(bgImage, 0, 0, editCanvas.width, editCanvas.height);
            drawPhotos(); // Draw photos on top
        };

        return; // Stop here to avoid drawing City too early
    }

    // Draw photos first (if no background is selected or City is selected)
    drawPhotos();

    // Now, apply "City" overlay on top
    if (currentBackground === '/city.png') {
        const cityOverlay = new Image();
        cityOverlay.src = '/city.png'; // Ensure correct path

        cityOverlay.onload = function () {
            editCtx.drawImage(cityOverlay, 0, 0, editCanvas.width, editCanvas.height);
        };
    }
}

// Draw photos on the canvas
function drawPhotos() {
    if (photoData.length === 0) return;
    
    const topPadding = 50; // Extra space on top
    const bottomPadding = 100; // Extra space for the date
    const spacing = 20; 
    const availableHeight = editCanvas.height - (topPadding + bottomPadding + spacing * (photoData.length - 1));
    const photoHeight = availableHeight / photoData.length;
    
    photoData.forEach((photo, index) => {
        const img = new Image();
        img.src = photo;
    
        img.onload = function() {
            const aspectRatio = img.width / img.height;
            const photoWidth = photoHeight * aspectRatio;
            const xOffset = (editCanvas.width - photoWidth) / 2;
            const yPosition = topPadding + index * (photoHeight + spacing);
    
            editCtx.drawImage(img, xOffset, yPosition, photoWidth, photoHeight);
        };
    });
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

// Initialize when page loads
window.addEventListener('load', initCanvas);