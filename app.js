console.log("app.js is loaded!");

// Get references to elements
const video = document.getElementById("video");
video.addEventListener('loadedmetadata', () => {
    console.log('Video dimensions:', video.videoWidth, 'x', video.videoHeight);
});
const captureBtn = document.getElementById("captureBtn");
const counterText = document.getElementById("counterText");
const countdownText = document.getElementById("countdownText");
const finalCanvas = document.getElementById("finalCanvas");
const finalCtx = finalCanvas ? finalCanvas.getContext("2d") : null; // Only if exists
const cameraSelect = document.getElementById("cameraSelect");
let timerValue = parseInt(document.getElementById('timerSelect').value);
let countdownDisplay = document.getElementById('countdownDisplay');
const filterSelect = document.getElementById("filterSelect"); 
const brightnessSlider = document.getElementById("brightness");
const contrastSlider = document.getElementById("contrast");
const mirrorToggle = document.getElementById("mirrorToggle");



// Get multiple canvas elements for stacking photos
const canvasList = [
    document.getElementById("canvas1"),
    document.getElementById("canvas2"),
    document.getElementById("canvas3"),
    document.getElementById("canvas4"),
];

// Open popup when heart button is clicked
let isUploadMode = false;
let selectedFiles = []; // Store selected files
let capturedPhotos = [];
const maxPhotos = 4;
let photoIndex = 0;

if (canvasList.some(canvas => canvas === null)) {
    console.error("One or more photo stack canvases not found!");
}

// 🎥 Start the camera
async function startCamera(deviceId = null) {
    try {
        // Debug browser info
        console.log("Browser info:", navigator.userAgent);
        console.log("MediaDevices support:", !!navigator.mediaDevices);
        console.log("getUserMedia support:", !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia));
        
        // Stop any existing streams
        if (video.srcObject) {
            video.srcObject.getTracks().forEach(track => track.stop());
        }
        
        // Add necessary attributes for iOS
        video.setAttribute('playsinline', true);
        video.setAttribute('autoplay', true);
        video.setAttribute('muted', true);
        
        // Define constraints with iOS-specific handling
        let constraints = {
            audio: false,  // No microphone input
            video: {
                width: { ideal: 1300 },  // Preferred video width
                height: { ideal: 900 },  // Preferred video height
                aspectRatio: 12 / 9,  // Forces 12:9 aspect ratio
                facingMode: "user"  // Uses the front camera (selfie cam)
            }
        };
        
        // iOS-specific constraints adjustments
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        if (isIOS) {
            constraints.video.width = { ideal: 1200 };
            constraints.video.height = { ideal: 900 };
            constraints.video.aspectRatio = { ideal: 12 / 9 };
        }
        
        console.log("Requesting camera with constraints:", constraints);
        
        // Get media stream
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        
        // Assign stream to video element
        video.srcObject = stream;
        
        // iOS Safari specific setup
        if (isIOS) {
            // Set explicit dimensions
            video.width = constraints.video.width.ideal;
            video.height = constraints.video.height.ideal;
            
            // iOS needs a short delay before playing
            setTimeout(() => {
                video.play().catch(e => console.error("iOS delayed play error:", e));
            }, 100);
            
            // iOS workaround for orientation changes
            window.addEventListener('resize', () => {
                setTimeout(() => {
                    if (video.srcObject) {
                        video.play().catch(e => console.error("iOS resize play error:", e));
                    }
                }, 300);
            });
        }
        
        // Force play for all browsers
        video.play().catch(e => console.error("Play error:", e));
        
        // Double-check that stream is active
        setTimeout(() => {
            if (video.paused) {
                console.log("Video still paused after 500ms, trying to play again");
                video.play().catch(e => console.error("Second play attempt error:", e));
            }
            
            // Log video stream state
            console.log("Video stream active:", !video.paused);
            console.log("Video dimensions:", video.videoWidth, "x", video.videoHeight);
            
            if (video.videoWidth === 0 || video.videoHeight === 0) {
                console.warn("Video dimensions are zero - stream might not be properly initialized");
                // Add one more retry with explicit user interaction on iOS
                if (isIOS) {
                    const retryButton = document.createElement('button');
                    retryButton.textContent = "Tap to activate camera";
                    retryButton.style.position = "absolute";
                    retryButton.style.zIndex = "999";
                    retryButton.style.top = "50%";
                    retryButton.style.left = "50%";
                    retryButton.style.transform = "translate(-50%, -50%)";
                    retryButton.style.padding = "1px";
                    document.body.appendChild(retryButton);
                    
                    retryButton.addEventListener('click', () => {
                        video.play().catch(e => console.error("Retry button play error:", e));
                        retryButton.remove();
                    });
                }
            }
        }, 500);
        
        console.log("Camera started successfully with stream:", stream);
    } catch (error) {
        console.error("Error accessing the camera:", error);
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        if (isIOS) {
            console.error("iOS specific camera error:", error.name, error.message);
            
            if (error.name === "NotAllowedError") {
                alert("Camera access denied. Please enable camera access in iOS Settings > Safari > Camera.");
            } else if (error.name === "NotFoundError") {
                alert("No camera found on this iOS device or camera is in use by another application.");
            } else if (error.name === "NotReadableError") {
                alert("iOS camera is already in use or not available.");
            } else {
                alert("iOS camera error: " + error.name + ". Please check Safari settings and permissions.");
            }
        } else {
            alert("Camera access error: " + error.message);
        }
    }
}
  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.multiple = true;
  fileInput.accept = "image/*";
  fileInput.style.display = "none";
  fileInput.id = "photoFileInput";
  document.body.appendChild(fileInput);
  
  function handleUploadBtnClick() {
    const photoFileInput = document.getElementById("photoFileInput");
    const uploadBtn = document.getElementById("uploadBtn");
    const videoElement = document.getElementById("video");

    if (!isUploadMode) {
        isUploadMode = true;
        videoElement.style.display = "none";
        uploadBtn.textContent = "Switch to Camera";
        photoFileInput.click();
        

    } else {
        isUploadMode = false;
        videoElement.style.display = "block";
        uploadBtn.textContent = "Upload Photo";
    }
  } 
   function handleUploadBtnClick() {
    const photoFileInput = document.getElementById("photoFileInput");
    const videoElement = document.getElementById("video");
    const uploadBtn = document.getElementById("uploadBtn"); // You might not need this anymore

    // Switch to upload mode
    isUploadMode = true;
    videoElement.style.display = "none";
    // uploadBtn.textContent = "Switch to Camera"; // Removed this line

    // Open file dialog
    photoFileInput.click();

    // Add the "Select More" button
}

  
  // Handle file selection
  function handleFileSelection(event) {
    const files = event.target.files;
    
    if (files.length === 0) return;
    
    // Calculate how many more photos we can add
    const remainingSlots = maxPhotos - capturedPhotos.filter(Boolean).length;
    
    
    // Process only up to remaining slots
    const filesToProcess = Math.min(files.length, remainingSlots);
    
    // Find the next available index in capturedPhotos array
    let startIndex = 0;
    while (startIndex < maxPhotos && capturedPhotos[startIndex]) {
      startIndex++;
    }
    
    // Process each file and add to the next available slots
    for (let i = 0; i < filesToProcess; i++) {
      const file = files[i];
      const reader = new FileReader();
      const currentIndex = startIndex + i;
      
      reader.onload = function(e) {
        processUploadedImage(e.target.result, currentIndex);
      };
      
      reader.readAsDataURL(file);
    }
    
    // Show the "Select More Photos" button when in upload mode
  }
  
  // Function to process uploaded images
  function processUploadedImage(dataUrl, index) {
    const img = new Image();
    img.src = dataUrl;
    
    img.onload = function() {
      const tempCanvas = document.createElement("canvas");
      const ctx = tempCanvas.getContext("2d");
      
      // Set fixed 12:9 aspect ratio
      tempCanvas.width = 1200;
      tempCanvas.height = 900;
      
      // Calculate scaling to properly fit image
      const imgAspectRatio = img.width / img.height;
      const canvasAspectRatio = tempCanvas.width / tempCanvas.height;
      
      let drawWidth, drawHeight, offsetX = 0, offsetY = 0;
      
      if (imgAspectRatio > canvasAspectRatio) {
        // Image is wider than canvas - fit to height
        drawHeight = tempCanvas.height;
        drawWidth = drawHeight * imgAspectRatio;
        offsetX = (tempCanvas.width - drawWidth) / 2;
      } else {
        // Image is taller than canvas - fit to width
        drawWidth = tempCanvas.width;
        drawHeight = drawWidth / imgAspectRatio;
        offsetY = (tempCanvas.height - drawHeight) / 2;
      }
      
      // Draw image properly centered
      ctx.drawImage(
        img, 
        0, 0, img.width, img.height,
        offsetX, offsetY, drawWidth, drawHeight
      );
      
      // Store the processed image
      const photoData = tempCanvas.toDataURL("image/jpeg", 0.95);
      capturedPhotos[index] = photoData;
      
      // Update canvas display
      if (canvasList[index]) {
        const canvas = canvasList[index];
        canvas.width = tempCanvas.width;
        canvas.height = tempCanvas.height;
        
        const targetCtx = canvas.getContext("2d");
        targetCtx.clearRect(0, 0, canvas.width, canvas.height);
        
        const displayImg = new Image();
        displayImg.src = photoData;
        
        displayImg.onload = () => {
          // Apply any filters if needed
          if (typeof applyFilter === 'function') {
            applyFilter(targetCtx, canvas, displayImg);
          } else {
            targetCtx.drawImage(displayImg, 0, 0, canvas.width, canvas.height);
          }
          canvas.style.display = "block";
        };
      }
      
      // Update photo counter
      const photosCount = capturedPhotos.filter(Boolean).length;
      counterText.textContent = `Photos: ${photosCount} / ${maxPhotos}`;
      
      // Show next page button if all photos are added
      if (photosCount === maxPhotos) {
        if (document.getElementById("nextPageBtn")) {
          document.getElementById("nextPageBtn").style.display = "block";
        }
        storePhotosInSession(capturedPhotos);
      }
    };
  }
  
  // Add event listeners after DOM is fully loaded
  document.addEventListener("DOMContentLoaded", function() {
    const uploadBtn = document.getElementById("uploadBtn");
    if (uploadBtn) {
      // Remove any existing event listeners to prevent duplicates
      uploadBtn.removeEventListener("click", handleUploadBtnClick);
      // Add the event listener
      uploadBtn.addEventListener("click", handleUploadBtnClick);
    } else {
      console.error("Upload button not found!");
    }
    
    // File input change event
    const fileInput = document.getElementById("photoFileInput");
    if (fileInput) {
      fileInput.removeEventListener("change", handleFileSelection);
      fileInput.addEventListener("change", handleFileSelection);
    }
  });
  
  // If you're in upload mode but need to select more photos,
  // add this helper function
  function triggerPhotoSelection() {
    // Reset file input to allow selecting the same files again
    const fileInput = document.getElementById("photoFileInput");
    if (fileInput) {
      fileInput.value = "";
      fileInput.click();
    }
  }
  function displaySelectedPhotos() {
    const previewContainer = document.getElementById("previewContainer");
    previewContainer.innerHTML = ""; // Clear previous previews

    selectedFiles.forEach((file) => {
        const imgElement = document.createElement("img");
        imgElement.src = URL.createObjectURL(file);
        imgElement.style.width = "100px";
        imgElement.style.margin = "5px";
        previewContainer.appendChild(imgElement);
    });
}
  document.getElementById("photoFileInput").addEventListener("change", function(event) {
    if (event.target.files.length > 0) {
        for (const file of event.target.files) {
            selectedFiles.push(file); // Store files without overwriting previous ones
        }
        displaySelectedPhotos(); // Update display
    }
});

let isMirrored = true;
video.style.transform = "scaleX(-1)"; // Mirror video by default

function toggleMirror() {
    isMirrored = !isMirrored;
    console.log("Mirror toggled:", isMirrored);
    
    // Update video preview only - don't modify existing photos
    video.style.transform = isMirrored ? "scaleX(-1)" : "scaleX(1)";
    
    // Visual feedback
    document.querySelector(".cbx").classList.toggle("active", isMirrored);
}
    // Update existing canvas displays
    canvasList.forEach((canvas, index) => {
        if (canvas && capturedPhotos[index]) {
            const ctx = canvas.getContext("2d");
            let img = new Image();
            img.src = capturedPhotos[index];
            
            img.onload = () => {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                
                if (isMirrored) {
                    ctx.save();
                    ctx.translate(canvas.width, 0);
                    ctx.scale(-1, 1);
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    ctx.restore();
                } else {
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                }
            };
        }
    });

    function applyMirroringToCanvas(canvas, ctx, img) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        if (isMirrored) {
            ctx.save();
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            ctx.restore();
        } else {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        }
    }

function toggleSlider(id) {
    var slider = document.getElementById(id);
    slider.style.display = (slider.style.display === "none" || slider.style.display === "") ? "block" : "none";
}
let currentFilter = "none"; // Track selected filter
function setupFilterDropdown() {
    console.log('Initializing dropdown...');
    const filterOptions = {
        "none": "No Filter",
        "grayscale(100%)": "B&W",
        "sepia(100%)": "Sepia",
        "contrast(1.4) brightness(0.9)": "Vintage",
        "blur(1.2px) brightness(1.2)": "Soft",
        "contrast(1.5) brightness(0.7)": "Noir",
        "saturate(2) brightness(1.1)": "Vivid"
    };
    
    const dropdown = document.createElement('div');
    console.log('Dropdown element created:', dropdown);
    
    dropdown.id = "filterDropdown";
    dropdown.className = "filter-dropdown";
    dropdown.style.display = "none";
    
    Object.entries(filterOptions).forEach(([value, text]) => {
        const option = document.createElement('button');
        option.className = "filter-option";
        option.textContent = text;
        option.dataset.filter = value;
        dropdown.appendChild(option);
    });
    
    // Append dropdown to the filter-control container instead of body
    document.querySelector('.filter-control').appendChild(dropdown);
    
    // Toggle dropdown
    const filterSelect = document.getElementById('filterSelect');
    filterSelect.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
        
        // Position dropdown directly below button
        positionDropdown();
    });
    
    // Position dropdown function
    function positionDropdown() {
        const buttonRect = filterSelect.getBoundingClientRect();
        dropdown.style.top = buttonRect.height + 'px';
        dropdown.style.left = '0';
        dropdown.style.right = 'auto';
    }
    
    // Handle filter selection
    dropdown.addEventListener('click', (e) => {
        if (e.target.classList.contains('filter-option')) {
            currentFilter = e.target.dataset.filter;
            applyFilterToVideo(currentFilter);
            dropdown.style.display = 'none';
        }
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!filterSelect.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.style.display = 'none';
        }
    });
}

// Replace video CSS filters with canvas-based processing
function applyFilter(ctx, canvas, img) {
    // iOS compatible filter application
    const brightness = brightnessSlider.value / 100;
    const contrast = contrastSlider.value / 100;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
    
    // Manual brightness/contrast adjustment
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
        // Apply brightness and contrast
        data[i] = ((data[i] - 128) * contrast + 128) * brightness;   // Red
        data[i + 1] = ((data[i + 1] - 128) * contrast + 128) * brightness; // Green
        data[i + 2] = ((data[i + 2] - 128) * contrast + 128) * brightness; // Blue
    }
    
    // Apply currentFilter effects
    if (currentFilter.includes('grayscale')) {
        // Convert to grayscale
        for (let i = 0; i < data.length; i += 4) {
            const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
            data[i] = gray;
            data[i + 1] = gray;
            data[i + 2] = gray;
        }
    } else if (currentFilter.includes('sepia')) {
        // Apply sepia
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            data[i] = Math.min(255, (r * 0.393) + (g * 0.769) + (b * 0.189));     // Red
            data[i + 1] = Math.min(255, (r * 0.349) + (g * 0.686) + (b * 0.168)); // Green
            data[i + 2] = Math.min(255, (r * 0.272) + (g * 0.534) + (b * 0.131)); // Blue
        }
    } else if (currentFilter.includes('blur')) {
        // Apply blur (simplified)
        // Note: Actual blur implementation is complex; consider using a library or alternative method
        ctx.filter = currentFilter;
        ctx.drawImage(img, 0, 0);
    }
    
    ctx.putImageData(imageData, 0, 0);
}
document.addEventListener('DOMContentLoaded', function() {
    // Setup the dropdown filters properly
    setupFilterDropdown();
    
    // Fix the filter option event handlers
    const dropdown = document.getElementById('filterDropdown');
    if (dropdown) {
        dropdown.addEventListener('click', (e) => {
            if (e.target.classList.contains('filter-option')) {
                const filterValue = e.target.dataset.filter;
                console.log("Selected filter:", filterValue);
                
                // Store just the selected preset filter, excluding brightness/contrast
                currentFilter = filterValue;
                
                // Update the video preview
                updateFilters();
                
                // Update all canvases with new filter
                canvasList.forEach((canvas, index) => {
                    if (canvas && capturedPhotos[index]) {
                        const targetCtx = canvas.getContext("2d");
                        let img = new Image();
                        img.src = capturedPhotos[index];
                        
                        img.onload = () => {
                            applyFilter(targetCtx, canvas, img);
                        };
                    }
                });
                
                dropdown.style.display = 'none';
            }
        });
    }
});

function updateFilters() {
    const brightness = brightnessSlider.value;
    const contrast = contrastSlider.value;
    
    // Update video display
    video.style.filter = `brightness(${brightness}%) contrast(${contrast}%) ${currentFilter === "none" ? "" : currentFilter}`;
    
    // Important: Update the currentFilter value to include brightness/contrast
    // Preserve any existing filter while adding brightness/contrast
    if (currentFilter === "none") {
        currentFilter = `brightness(${brightness}%) contrast(${contrast}%)`;
    } else {
        // Extract existing filters that aren't brightness/contrast
        let filters = currentFilter.split(') ').filter(f => 
            !f.startsWith('brightness') && !f.startsWith('contrast')
        );
        
        // Add updated brightness/contrast
        filters.push(`brightness(${brightness}%)`);
        filters.push(`contrast(${contrast}%)`);
        
        // Combine filters
        currentFilter = `brightness(${brightness}%) contrast(${contrast}%) ${filterSelect.value}`;
    }
    
    // Update any already captured photos with new filter
    canvasList.forEach((canvas, index) => {
        if (canvas && capturedPhotos[index]) {
            const ctx = canvas.getContext("2d");
            let img = new Image();
            img.src = capturedPhotos[index];
            img.onload = () => applyFilter(ctx, canvas, img);
        }
    });
}

// Event listeners to update filters in real time
brightnessSlider.addEventListener("input", updateFilters);
contrastSlider.addEventListener("input", updateFilters);
function capturePhoto() {
    if (capturedPhotos.length < maxPhotos) {
        const videoWidth = video.videoWidth;
        const videoHeight = video.videoHeight;
        const tempCanvas = document.createElement("canvas");
        const ctx = tempCanvas.getContext("2d");
        
        tempCanvas.width = 1200; 
        tempCanvas.height = 900; 
        
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        if (isMirrored) {
            ctx.translate(tempCanvas.width, 0);
            ctx.scale(-1, 1);
        }

        const videoAspectRatio = videoWidth / videoHeight;
        const canvasAspectRatio = tempCanvas.width / tempCanvas.height;
        
        let drawWidth, drawHeight, offsetX = 0, offsetY = 0;
        
        if (videoAspectRatio > canvasAspectRatio) {
            // Video is wider than canvas - fit to height
            drawHeight = tempCanvas.height;
            drawWidth = drawHeight * videoAspectRatio;
            offsetX = (tempCanvas.width - drawWidth) / 2;
        } else {
            // Video is taller than canvas - fit to width
            drawWidth = tempCanvas.width;
            drawHeight = drawWidth / videoAspectRatio;
            offsetY = (tempCanvas.height - drawHeight) / 2;
        }

        // Draw video properly centered and scaled without stretching
        ctx.drawImage(
            video, 
            0, 0, videoWidth, videoHeight,  // Source rectangle
            offsetX, offsetY, drawWidth, drawHeight  // Destination rectangle
        );

        // Reset transformation
        ctx.setTransform(1, 0, 0, 1, 0, 0);

        // Capture raw photo data with correct aspect ratio
        const rawPhotoData = tempCanvas.toDataURL("image/png");

        // Create image to apply filter
        const img = new Image();
        img.src = rawPhotoData;

        img.onload = function () {
            // Clear canvas before applying filter
            ctx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);

            // Apply the current filter
            applyFilter(ctx, tempCanvas, img);

            // Store high-quality data
            const photoData = tempCanvas.toDataURL("image/jpeg", 0.95);
            capturedPhotos.push(photoData);

            // Update canvases with photo
            canvasList.forEach((canvas, index) => {
                if (canvas && capturedPhotos[index]) {
                    // Use same dimensions for consistent display
                    canvas.width = tempCanvas.width;
                    canvas.height = tempCanvas.height;

                    const targetCtx = canvas.getContext("2d");
                    targetCtx.imageSmoothingEnabled = true;
                    targetCtx.imageSmoothingQuality = 'high';

                    let displayImg = new Image();
                    displayImg.src = capturedPhotos[index];

                    displayImg.onload = () => {
                        targetCtx.drawImage(displayImg, 0, 0, canvas.width, canvas.height);
                        canvas.style.display = "block";
                    
                        // Delay the button only after the last photo is fully displayed
                        if (index === maxPhotos - 1) { 
                            console.log("✅ Last canvas displayed. Waiting before showing button...");
                    
                            requestAnimationFrame(() => { // Ensures canvas update is complete
                                setTimeout(() => {
                                    console.log("🚀 Showing Next Page button.");
                                    document.getElementById("nextPageBtn").style.display = "block";
                                }, 3000); // Adjust delay time (in milliseconds)
                            });
                        }
                    };
                }
            });

            // Update photo counter
            counterText.textContent = `Photos Taken: ${capturedPhotos.length} / ${maxPhotos}`;

            // Show "Next page" button only if all photos are taken
            if (capturedPhotos.length === maxPhotos) {
                document.getElementById("nextPageBtn").style.display = "block";
                storePhotosInSession(capturedPhotos);
            } else {
                document.getElementById("nextPageBtn").style.display = "none"; // Ensure it remains hidden
            }
        };
    }
}



function updatePhotoDisplays() {
    canvasList.forEach((canvas, index) => {
        if (canvas && capturedPhotos[index]) {
            canvas.width = 1200;
            canvas.height = 900;
            
            const ctx = canvas.getContext("2d");
            const img = new Image();
            img.src = capturedPhotos[index];
            
            img.onload = () => {
                if (isMirrored) {
                    ctx.save();
                    ctx.translate(canvas.width, 0);
                    ctx.scale(-1, 1);
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    ctx.restore();
                } else {
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                }
                canvas.style.display = "block";
            };
        }
    });
}
// Add this function
function updateCanvasMirroring() {
    canvasList.forEach((canvas, index) => {
        if (canvas && capturedPhotos[index]) {
            const ctx = canvas.getContext("2d");
            let img = new Image();
            img.src = capturedPhotos[index];
            
            img.onload = () => {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                
                if (isMirrored) {
                    ctx.save();
                    ctx.translate(canvas.width, 0);
                    ctx.scale(-1, 1);
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    ctx.restore();
                } else {
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                }
            };
        }
    });
}
// Event listeners to update filters in real time
brightnessSlider.addEventListener("input", function() {
    // Update video display
    updateFilters();
    
    console.log("Brightness changed to:", brightnessSlider.value);
    
    // Update all canvases with new filter values
    canvasList.forEach((canvas, index) => {
        if (canvas && capturedPhotos[index]) {
            const targetCtx = canvas.getContext("2d");
            let img = new Image();
            img.src = capturedPhotos[index];
            
            img.onload = () => {
                applyFilter(targetCtx, canvas, img);
            };
        }
    });
});

contrastSlider.addEventListener("input", function() {
    // Update video display
    updateFilters();
    
    console.log("Contrast changed to:", contrastSlider.value);
    
    // Update all canvases with new filter values
    canvasList.forEach((canvas, index) => {
        if (canvas && capturedPhotos[index]) {
            const targetCtx = canvas.getContext("2d");
            let img = new Image();
            img.src = capturedPhotos[index];
            
            img.onload = () => {
                applyFilter(targetCtx, canvas, img);
            };
        }
    });
});
function setupPhotoUpload() {
    const uploadBtn = document.getElementById("uploadBtn");
    const videoContainer = document.getElementById("video-container");
    const uploadContainer = document.createElement("div");
    
    // Create and configure the file input
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "image/*";
    fileInput.multiple = true;
    fileInput.style.display = "none";
    fileInput.id = "photoFileInput";
    
    // Create a visible placeholder for when video is hidden
    uploadContainer.id = "upload-container";
    uploadContainer.style.display = "none";
    uploadContainer.style.width = "100%";
    uploadContainer.style.height = "100%";
    uploadContainer.style.backgroundColor = "#f5f5f5";
    uploadContainer.style.borderRadius = "8px";
    uploadContainer.style.display = "flex";
    uploadContainer.style.flexDirection = "column";
    uploadContainer.style.justifyContent = "center";
    uploadContainer.style.alignItems = "center";
    uploadContainer.innerHTML = `
        <div id="upload-placeholder">
            <div style="font-size: 24px; margin-bottom: 15px;">📷 Click "Upload Photo" to select images</div>
            <div id="upload-preview" style="display: flex; flex-wrap: wrap; justify-content: center; gap: 10px;"></div>
        </div>
    `;
    
    // Insert the upload container after the video container
    videoContainer.parentNode.insertBefore(uploadContainer, videoContainer.nextSibling);
    document.body.appendChild(fileInput);
    
    // Function to toggle between video and upload mode
    function toggleUploadMode(showUpload) {
        if (showUpload) {
            videoContainer.style.display = "none";
            uploadContainer.style.display = "flex";
            uploadBtn.textContent = "Switch to Camera";
            captureBtn.disabled = true; // Disable capture button in upload mode
        } else {
            videoContainer.style.display = "block";
            uploadContainer.style.display = "none";
            uploadBtn.textContent = "Upload Photo";
            captureBtn.disabled = false; // Enable capture button in camera mode
        }
    }
    
    // Handle click on the upload button
    uploadBtn.addEventListener("click", function() {
        const isInUploadMode = uploadContainer.style.display !== "none";
        
        if (isInUploadMode) {
            // Switch back to camera mode
            toggleUploadMode(false);
        } else {
            // Switch to upload mode
            toggleUploadMode(true);
            fileInput.click(); // Open file dialog
        }
    });
    
    // Handle file selection
    fileInput.addEventListener("change", function(event) {
        const files = event.target.files;
        if (files.length === 0) return;

        // Calculate remaining slots
        const remaining = maxPhotos - capturedPhotos.length;
        if (remaining <= 0) {
            alert("Maximum photos reached.");
            return;
        }
        
        // Limit to 4 photos max
        const selectedFiles = Array.from(files).slice(0, maxPhotos);
        const startIndex = capturedPhotos.length;
        const indices = Array.from({ length: selectedFiles.length }, (_, i) => startIndex + i);
        
        
        // Clear existing photos
        capturedPhotos = [];
        
        // Clear preview area
        const previewArea = document.getElementById("upload-preview");
        previewArea.innerHTML = "";
        
        // Process each selected file
        selectedFiles.forEach((file, i) => {
            const index = indices[i];
            const reader = new FileReader();
            reader.onload = function(e) {
                processUploadedImage(e.target.result, index);
            };
            reader.readAsDataURL(file);
        });
    });
    
    // Function to process the uploaded image
    function processUploadedImage(dataUrl, index) {
        const img = new Image();
        img.src = dataUrl;
        
        img.onload = function() {
            const tempCanvas = document.createElement("canvas");
            const ctx = tempCanvas.getContext("2d");
            
            // Set fixed 12:9 aspect ratio as used in the capturePhoto function
            tempCanvas.width = 1200;
            tempCanvas.height = 900;
            
            // Calculate scaling to properly fit image into 12:9 canvas without stretching
            const imgAspectRatio = img.width / img.height;
            const canvasAspectRatio = tempCanvas.width / tempCanvas.height;
            
            let drawWidth, drawHeight, offsetX = 0, offsetY = 0;
            
            if (imgAspectRatio > canvasAspectRatio) {
                // Image is wider than canvas - fit to height
                drawHeight = tempCanvas.height;
                drawWidth = drawHeight * imgAspectRatio;
                offsetX = (tempCanvas.width - drawWidth) / 2;
            } else {
                // Image is taller than canvas - fit to width
                drawWidth = tempCanvas.width;
                drawHeight = drawWidth / imgAspectRatio;
                offsetY = (tempCanvas.height - drawHeight) / 2;
            }
            
            // Draw image properly centered and scaled without stretching
            ctx.drawImage(
                img, 
                0, 0, img.width, img.height,  // Source rectangle
                offsetX, offsetY, drawWidth, drawHeight  // Destination rectangle
            );
            
            // Apply any current filters if needed
            const filteredCtx = tempCanvas.getContext("2d");
            applyFilter(filteredCtx, tempCanvas, img);
            
            // Store the processed image
            const photoData = tempCanvas.toDataURL("image/jpeg", 0.95);
            capturedPhotos[index] = photoData;
            if (capturedPhotos.length === maxPhotos) {
                document.getElementById("nextPageBtn").style.display = "block";
                storePhotosInSession(capturedPhotos);
            }
            
            // Update canvas display
            if (canvasList[index]) {
                const canvas = canvasList[index];
                canvas.width = tempCanvas.width;
                canvas.height = tempCanvas.height;
                
                const targetCtx = canvas.getContext("2d");
                let displayImg = new Image();
                displayImg.src = photoData;
                
                displayImg.onload = () => {
                    targetCtx.drawImage(displayImg, 0, 0, canvas.width, canvas.height);
                    canvas.style.display = "block";
                };
            }
            
            // Update photo counter
            counterText.textContent = `Photos: ${capturedPhotos.filter(Boolean).length} / ${maxPhotos}`;
            
            // Show next page button if all photos are populated
            if (capturedPhotos.filter(Boolean).length === maxPhotos) {
                document.getElementById("nextPageBtn").style.display = "block";
                storePhotosInSession(capturedPhotos);
            }
        };
    }
}

// Call this function at the end of the window load event


// Updated storage function with detailed compression
function storePhotosInSession(photos) {
    if (!Array.isArray(photos) || photos.length === 0) {
        console.error("❌ Invalid photos array provided to storePhotosInSession.");
        return;
    }

    let compressedPhotos = [];
    let processedCount = 0;

    photos.forEach((photo, index) => {
        compressImage(photo, (compressedData) => {
            compressedPhotos[index] = compressedData;
            processedCount++;

            if (processedCount === photos.length) {
                try {
                    sessionStorage.setItem("photos", JSON.stringify(compressedPhotos));
                    console.log("✅ Photos successfully stored in session storage.");
                } catch (e) {
                    console.error("❌ Failed to store photos: ", e);
                }
            }
        });
    });

    // Additional helper function for compression
    function compressImage(photoData, callback) {
        let img = new Image();
        img.src = photoData;

        img.onload = function () {
            // Clear canvas before applying filter
            ctx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);

            // Apply the current filter
            applyFilter(ctx, tempCanvas, img);

            // Compress the image
            const compressedPhotoData = compressImage(tempCanvas);
            capturedPhotos.push(compressedPhotoData);

            // Update canvases with compressed photo
            canvasList.forEach((canvas, index) => {
                if (canvas && capturedPhotos[index]) {
                    canvas.width = tempCanvas.width;
                    canvas.height = tempCanvas.height;

                    const targetCtx = canvas.getContext("2d");
                    targetCtx.imageSmoothingEnabled = true;
                    targetCtx.imageSmoothingQuality = 'high';

                    let displayImg = new Image();
                    displayImg.src = capturedPhotos[index];

                    displayImg.onload = () => {
                        targetCtx.drawImage(displayImg, 0, 0, canvas.width, canvas.height);
                        canvas.style.display = "block";
                    };
                }
            });

            // Update photo counter
            counterText.textContent = `Photos Taken: ${capturedPhotos.length} / ${maxPhotos}`;

            if (capturedPhotos.length === maxPhotos) {
                storePhotosInSession(capturedPhotos);
            
                setTimeout(() => {
                    document.getElementById("nextPageBtn").style.display = "block"; // Show the button after 2 seconds
                }, 2000); // 2000ms = 2 seconds delay
            }
        };
    }
}

// 🎛 Update canvas filter when user changes filter
filterSelect.addEventListener("change", () => {
    canvasList.forEach((canvas, index) => {
        if (canvas && capturedPhotos[index]) {
            const ctx = canvas.getContext("2d");
            let img = new Image();
            img.src = capturedPhotos[index];

            img.onload = () => {
                applyFilter(ctx, canvas, img);
            };
        }
    });
});

// 🎵 Sound and Countdown Setup
const countdownInterval = 50000; // 1 second per tick
let countdownTimer = null;

// 🔥 Preload sounds to remove delay
const beepSound = new Audio("countdown.mp3");
const shutterSound = new Audio("shutter.mp3");

beepSound.volume = 0.5; // Reduced volume
shutterSound.volume = 0.5; // Reduced volume
beepSound.load();
shutterSound.load();

// 📢 Function to Play Sound Instantly
function playSound(sound) {
    sound.pause();
    sound.currentTime = 0;
    sound.play().catch(err => console.log(`Sound error: ${err}`));
}

// ⏳ Final Countdown and Auto-Capture with Sound Cleanup
function startAutoCapture() {
    // Get the selected timer value
    timerValue = parseInt(timerSelect.value);
    
    capturedPhotos = [];
    counterText.textContent = `Photos Taken: 0 / ${maxPhotos}`;
    captureBtn.disabled = true;

    let count = 0;
    // Use the selected timer value, or default to 0 (no timer)
    const COUNTDOWN_START = timerValue > 0 ? timerValue : 0;
    let countdownTimer = null;

    function countdownAndCapture() {
        if (count >= maxPhotos) {
            captureBtn.disabled = false;
            countdownText.style.display = "none";
            return;
        }

        let countdown = COUNTDOWN_START;
        
        // Only show countdown text if there's an actual countdown
        if (countdown > 0) {
            countdownText.textContent = countdown;
            countdownText.style.display = "block";
            playSound(beepSound);

            countdownTimer = setInterval(() => {
                countdown--;
                countdownText.textContent = countdown;

                if (countdown > 0) {
                    playSound(beepSound);
                } else {
                    clearInterval(countdownTimer);
                    countdownText.style.display = "none";
                    capturePhotoSequence();
                }
            }, 1000);
        } else {
            // If no timer, capture immediately
            capturePhotoSequence();
        }

        function capturePhotoSequence() {
            setTimeout(() => {
                // Always play shutter sound before capture
                playSound(shutterSound);
                capturePhoto();
                count++;

                if (count < maxPhotos) {
                    setTimeout(countdownAndCapture, 350);
                } else {
                    // Add slight delay before cleanup
                    setTimeout(() => {
                        captureBtn.disabled = false;
                        beepSound.pause();
                        shutterSound.pause();
                    }, 200); // Wait for shutter sound to finish
                }
            }, 500);
        }
    }

    if (countdownTimer) clearInterval(countdownTimer);
    countdownAndCapture();
}
if (captureBtn) {
    captureBtn.addEventListener("click", startAutoCapture);
}
// 📸 Generate Final Collage (Complete Version)
function generatePhotoStrip() {
    if (!finalCanvas) return;

    const width = 1000;  // Match the width used in capturePhoto
    const height = Math.round(width * (9/16));  // Fixed 16:9 ratio
    
    finalCanvas.width = width;
    finalCanvas.height = height * maxPhotos;

    // Clear previous content
    finalCtx.clearRect(0, 0, finalCanvas.width, finalCanvas.height);

    // Function to draw each photo correctly
    function drawPhoto(index) {
        if (index >= capturedPhotos.length) {
            finalCanvas.style.display = "block";
            finalCanvas.scrollIntoView({ behavior: 'smooth' });
            return;
        }

        let img = new Image();
        img.src = capturedPhotos[index];

        img.onload = () => {
            finalCtx.save();
            if (isMirrored) {
                finalCtx.translate(width, (index * height));
                finalCtx.scale(-1, 1);
                finalCtx.drawImage(img, 0, 0, width, height);
            } else {
                finalCtx.drawImage(img, 0, index * height, width, height);
            }
            finalCtx.restore();

            drawPhoto(index + 1);
        };
    }

    // Start drawing the first photo
    drawPhoto(0);
}
window.addEventListener("load", () => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        // On iOS, we need user interaction first
        if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
            // Create a temporary button if needed
            const startButton = document.createElement('button');
            startButton.textContent = "Start Camera";
            startButton.className = "start-camera-btn";
            
            // Add styling to center the button
            startButton.style.position = "fixed";
            startButton.style.top = "50%";
            startButton.style.left = "50%";
            startButton.style.transform = "translate(-50%, -50%)";
            startButton.style.padding = "12px 24px";
            startButton.style.fontSize = "16px";
            startButton.style.zIndex = "1000";
            
            document.body.appendChild(startButton);
            
            startButton.addEventListener('click', () => {
                getCameras();
                startButton.remove(); 
            });
        } else {
            getCameras();
        }
    } else {
        console.error("Camera API not supported in this browser.");
    }
});

function applyFilterToVideo(filter) {
    video.style.filter = filter;
    canvasList.forEach((canvas, index) => {
        if (canvas && capturedPhotos[index]) {
            const ctx = canvas.getContext("2d");
            let img = new Image();
            img.src = capturedPhotos[index];
            img.onload = () => applyFilter(ctx, canvas, img);
        }
    });
}

if (captureBtn) {
    captureBtn.addEventListener("click", startAutoCapture);
} else {
    console.error("Capture button not found!");
}


// 🎥 Populate Camera Selection Dropdown
async function getCameras() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === "videoinput");

        cameraSelect.innerHTML = ""; // Clear existing options

        videoDevices.forEach((device, index) => {
            const option = document.createElement("option");
            option.value = device.deviceId;
            option.textContent = device.label || `Camera ${index + 1}`;
            cameraSelect.appendChild(option);
        });

        if (videoDevices.length > 0) {
            startCamera(videoDevices[0].deviceId); // Start with the first camera
        }
    } catch (error) {
        console.error("Error getting camera devices:", error);
    }
}

// 🎛️ Change Camera When User Selects a Different One
cameraSelect.addEventListener("change", () => {
    startCamera(cameraSelect.value);
});

// Add event listener to existing elements
downloadBtn.addEventListener("click", () => {
    // Navigate to editor page after photos are captured
    showEditorPage();
});

// New functions for the editor page
function showEditorPage() {
    // Hide photobooth elements
    document.getElementById("photobooth-container").style.display = "none";
    
    // Show editor elements
    document.getElementById("editor-container").style.display = "block";
    
    // Generate the final photo strip for editing
    generateFinalStripForEdit();
}

function generateFinalStripForEdit() {
    const editorCanvas = document.getElementById("editorCanvas");
    const editorCtx = editorCanvas.getContext("2d");
    
    const width = canvasList[0].width;
    const height = canvasList[0].height;
    editorCanvas.width = width;
    editorCanvas.height = height * maxPhotos;
    
    // First draw the selected background if any
    const selectedBackground = document.querySelector(".bg-option.selected");
    if (selectedBackground) {
        const bgImage = new Image();
        bgImage.src = selectedBackground.getAttribute("data-bg");
        bgImage.onload = () => {
            editorCtx.drawImage(bgImage, 0, 0, editorCanvas.width, editorCanvas.height);
            
            // Then draw the photos on top
            drawPhotosOnEditor(editorCtx, width, height);
        };
    } else {
        // No background, just draw the photos
        drawPhotosOnEditor(editorCtx, width, height);
    }
}

function drawPhotosOnEditor(ctx, width, height) {
    capturedPhotos.forEach((photo, index) => {
        let img = new Image();
        img.src = photo;
        img.onload = () => {
            ctx.drawImage(img, 0, index * height, width, height);
        };
    });
}

// Background selection functionality
document.querySelectorAll(".bg-option").forEach(option => {
    option.addEventListener("click", () => {
        // Remove selected class from all options
        document.querySelectorAll(".bg-option").forEach(item => {
            item.classList.remove("selected");
        });
        
        // Add selected class to clicked option
        option.classList.add("selected");
        
        // Regenerate canvas with new background
        generateFinalStripForEdit();
    });
});

// Download button functionality for the editor page
document.getElementById("saveEditorBtn").addEventListener("click", () => {
    const editorCanvas = document.getElementById("editorCanvas");
    const link = document.createElement("a");
    link.download = "photobooth-strip.png";
    link.href = editorCanvas.toDataURL("image/png");
    link.click();
});

// Back to booth button
document.getElementById("backToBoothBtn").addEventListener("click", () => {
    document.getElementById("editor-container").style.display = "none";
    document.getElementById("photobooth-container").style.display = "block";
});


function compressImage(photoData, callback) {
    let img = new Image();
    img.src = photoData;

    img.onload = function () {
        let canvas = document.createElement("canvas");
        let ctx = canvas.getContext("2d");

        // Use original dimensions for better quality
        canvas.width = img.width;
        canvas.height = img.height;

        // Draw at full size
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Convert to JPEG with 90% quality for better results
        let compressedData = canvas.toDataURL("image/jpeg", 0.98);
        compressedImg.style.maxWidth = '800px';  // Wider

        callback(compressedData);
    };
}

function storePhotosInSession(photos) {
    console.log("🔍 Attempting to store photos:", photos);
    
    if (!Array.isArray(photos) || photos.length === 0) {
        console.error("❌ Invalid photos array provided to storePhotosInSession.");
        return;
    }

    try {
        sessionStorage.setItem("photos", JSON.stringify(photos));
        console.log("✅ Photos successfully stored in session storage.");
        
        // Immediately verify storage
        const storedPhotos = JSON.parse(sessionStorage.getItem("photos"));
        console.log("🕵️ Stored photos retrieved:", storedPhotos);
    } catch (e) {
        console.error("❌ Failed to store photos: ", e);
    }
}


document.getElementById("goToEditBtn").addEventListener("click", function(e) {
    e.preventDefault();

    if (capturedPhotos.length === 0) {
        alert("Please take photos first!");
        return;
    }

    storePhotosInSession(capturedPhotos);

    // ✅ Debug: Confirm the photos before moving to edit.html
    console.log("✅ Photos before navigating:", sessionStorage.getItem('photos'));

    setTimeout(() => {
        window.location.href = 'edit.html';
    }, 500);
});

function showIOSPrompt() {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    if (isIOS) {
        const prompt = document.getElementById("ios-prompt");
        if (prompt) {
            prompt.style.display = "block";
            prompt.addEventListener("click", function() {
                startCamera();
                prompt.style.display = "none";
            });
        }
    }
}