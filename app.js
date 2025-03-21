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
const filterSelect = document.getElementById("filterSelect");
const mirrorToggle = document.getElementById("mirrorToggle");
const cameraSelect = document.getElementById("cameraSelect");

// Get multiple canvas elements for stacking photos
const canvasList = [
    document.getElementById("canvas1"),
    document.getElementById("canvas2"),
    document.getElementById("canvas3"),
    document.getElementById("canvas4"),
];

// Open popup when heart button is clicked

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
            audio: false,
            video: {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                facingMode: deviceId ? undefined : "user",
                deviceId: deviceId ? { exact: deviceId } : undefined
            }
        };
        
        // iOS-specific constraints adjustments
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        if (isIOS) {
            console.log("iOS device detected, applying special video constraints");
            // On iOS, simplify constraints and prioritize facingMode over deviceId
            // as deviceId might not work consistently
            constraints.video = {
                facingMode: "user", // or use "environment" for back camera
                width: { ideal: 1280 },
                height: { ideal: 720 }
            };
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
                    retryButton.style.padding = "15px";
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
        
        // Detailed iOS error handling
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

// 🎨 Apply Filter to Live Camera Feed
filterSelect.addEventListener("change", () => {
    video.style.filter = filterSelect.value; // Apply selected filter to live video
});

// 🎭 Function to Apply Filter to Canvas
// IMPROVED Function to Apply Filter to Canvas - Works on all mobile devices
function applyFilter(ctx, canvas, img) {
    // Clear before drawing
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Store the current filter
    const currentFilter = filterSelect.value;
    
    // Always use manual filters on mobile for consistency
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
        // First draw the image without filters
        ctx.filter = "none";
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        try {
            // Manual filter application for mobile
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            
            // Apply filters manually based on selection
            if (currentFilter.includes("grayscale")) {
                for (let i = 0; i < data.length; i += 4) {
                    const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
                    data[i] = avg;     // Red
                    data[i + 1] = avg; // Green
                    data[i + 2] = avg; // Blue
                }
            } else if (currentFilter.includes("sepia")) {
                for (let i = 0; i < data.length; i += 4) {
                    const r = data[i];
                    const g = data[i + 1];
                    const b = data[i + 2];
                    
                    data[i] = Math.min(255, (r * 0.393) + (g * 0.769) + (b * 0.189));
                    data[i + 1] = Math.min(255, (r * 0.349) + (g * 0.686) + (b * 0.168));
                    data[i + 2] = Math.min(255, (r * 0.272) + (g * 0.534) + (b * 0.131));
                }
            } else if (currentFilter.includes("contrast")) {
                // Simple contrast adjustment
                const factor = currentFilter.includes("1.5") ? 1.5 : 1.4;
                const brightnessAdjust = currentFilter.includes("0.7") ? 0.7 : 0.9;
                
                for (let i = 0; i < data.length; i += 4) {
                    data[i] = Math.min(255, Math.max(0, (((data[i] / 255) - 0.5) * factor + 0.5) * 255 * brightnessAdjust));
                    data[i + 1] = Math.min(255, Math.max(0, (((data[i + 1] / 255) - 0.5) * factor + 0.5) * 255 * brightnessAdjust));
                    data[i + 2] = Math.min(255, Math.max(0, (((data[i + 2] / 255) - 0.5) * factor + 0.5) * 255 * brightnessAdjust));
                }
            } else if (currentFilter.includes("saturate")) {
                // Simple saturation increase for "vivid" filter
                for (let i = 0; i < data.length; i += 4) {
                    const r = data[i];
                    const g = data[i + 1];
                    const b = data[i + 2];
                    
                    // Convert RGB to HSL, increase saturation, convert back
                    const brightness = (r + g + b) / 3;
                    
                    // Increase difference between values (crude saturation)
                    data[i] = r > brightness ? Math.min(255, r * 1.2) : Math.max(0, r * 0.8);
                    data[i + 1] = g > brightness ? Math.min(255, g * 1.2) : Math.max(0, g * 0.8);
                    data[i + 2] = b > brightness ? Math.min(255, b * 1.2) : Math.max(0, b * 0.8);
                    
                    // Brightness adjustment for "vivid" filter
                    if (currentFilter.includes("brightness")) {
                        data[i] = Math.min(255, data[i] * 1.1);
                        data[i + 1] = Math.min(255, data[i + 1] * 1.1);
                        data[i + 2] = Math.min(255, data[i + 2] * 1.1);
                    }
                }
            } else if (currentFilter.includes("blur")) {
                // Use a simplified blur approximation
                const copy = new Uint8ClampedArray(data.length);
                copy.set(data);
                
                const width = canvas.width;
                const radius = 2; // Blur radius
                
                for (let y = radius; y < canvas.height - radius; y++) {
                    for (let x = radius; x < width - radius; x++) {
                        const pos = (y * width + x) * 4;
                        
                        let r = 0, g = 0, b = 0, count = 0;
                        
                        // Average pixels in a small area
                        for (let ky = -radius; ky <= radius; ky++) {
                            for (let kx = -radius; kx <= radius; kx++) {
                                const offset = ((y + ky) * width + (x + kx)) * 4;
                                r += copy[offset];
                                g += copy[offset + 1];
                                b += copy[offset + 2];
                                count++;
                            }
                        }
                        
                        // Apply average values
                        data[pos] = r / count;
                        data[pos + 1] = g / count;
                        data[pos + 2] = b / count;
                    }
                }
                
                // Apply brightness if needed
                if (currentFilter.includes("brightness")) {
                    for (let i = 0; i < data.length; i += 4) {
                        data[i] = Math.min(255, data[i] * 1.2);
                        data[i + 1] = Math.min(255, data[i + 1] * 1.2);
                        data[i + 2] = Math.min(255, data[i + 2] * 1.2);
                    }
                }
            }
            
            ctx.putImageData(imageData, 0, 0);
        } catch (error) {
            console.error("Error applying filter manually:", error);
            // Fallback to direct drawing if imageData manipulation fails
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        }
    } else {
        // Use standard filter on desktop
        ctx.filter = currentFilter;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    }
}
function capturePhoto() {
    if (capturedPhotos.length < maxPhotos) {
        console.log("Capturing photo...");

        if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
            console.error("Video feed not ready yet!");
            return;
        }

        // Define fixed dimensions for consistency
        const fixedWidth = 850;
        const fixedHeight = 480;

        const tempCanvas = document.createElement("canvas");
        const ctx = tempCanvas.getContext("2d");

        // Use fixed dimensions
        tempCanvas.width = fixedWidth;
        tempCanvas.height = fixedHeight;

        if (mirrorToggle.checked) {
            ctx.translate(tempCanvas.width, 0);
            ctx.scale(-1, 1);
        }
        
        // Set high quality
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Draw the base image without filters first
        ctx.drawImage(video, 0, 0, fixedWidth, fixedHeight);
        
        // Create a temp image to apply the filter
        const rawPhotoData = tempCanvas.toDataURL("image/png");
        
        // Now apply the selected filter to this image
        const img = new Image();
        img.src = rawPhotoData;
        
        img.onload = function() {
            // Clear canvas before applying filter
            ctx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
            
            // Apply the current filter
            applyFilter(ctx, tempCanvas, img);
            
            // Now get the filtered image data
            const filteredPhotoData = tempCanvas.toDataURL("image/png");
            capturedPhotos.push(filteredPhotoData);
            
            // Update all canvases with the new photo
            canvasList.forEach((canvas, index) => {
                if (canvas && capturedPhotos[index]) {
                    canvas.width = fixedWidth;
                    canvas.height = fixedHeight;
                    
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

            counterText.textContent = `Photos Taken: ${capturedPhotos.length} / ${maxPhotos}`;

            if (capturedPhotos.length === maxPhotos) {
                storePhotosInSession(capturedPhotos);
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
    capturedPhotos = [];
    counterText.textContent = `Photos Taken: 0 / ${maxPhotos}`;
    captureBtn.disabled = true;

    let count = 0;
    const COUNTDOWN_START = 5;
    let countdownTimer = null;

    function countdownAndCapture() {
        if (count >= maxPhotos) {
            captureBtn.disabled = false;
            countdownText.style.display = "none";
            return;
        }

        let countdown = COUNTDOWN_START;
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
        }, 1000);
    }

    if (countdownTimer) clearInterval(countdownTimer);
    countdownAndCapture();
}

// 📸 Generate Final Collage (Complete Version)
function generatePhotoStrip() {
    if (!finalCanvas) return;

    const width = canvasList[0].width;
    const height = canvasList[0].height;
    finalCanvas.width = width;
    finalCanvas.height = height * maxPhotos;

    // Clear previous content
    finalCtx.clearRect(0, 0, finalCanvas.width, finalCanvas.height);

    // Draw all photos
    capturedPhotos.forEach((photo, index) => {
        let img = new Image();
        img.src = photo;
        img.onload = () => {
            // Apply mirror effect if needed
            if (mirrorToggle.checked) {
                finalCtx.save();
                finalCtx.translate(width, 0);
                finalCtx.scale(-1, 1);
                finalCtx.drawImage(img, 0, index * height, width, height);
                finalCtx.restore();
            } else {
                finalCtx.drawImage(img, 0, index * height, width, height);
            }
        };
    });

    // Add final touches
    finalCanvas.style.display = "block";
    finalCanvas.scrollIntoView({ behavior: 'smooth' });
}

// 🚀 Start camera when page loads
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
                startButton.remove(); // Remove the button after starting
            });
        } else {
            // For non-iOS devices, start immediately
            getCameras();
        }
    } else {
        console.error("Camera API not supported in this browser.");
    }
});

if (captureBtn) {
    captureBtn.addEventListener("click", startAutoCapture);
} else {
    console.error("Capture button not found!");
}

mirrorToggle.addEventListener("change", () => {
    const isChecked = mirrorToggle.checked;
    video.style.transform = isChecked ? "scaleX(-1)" : "scaleX(1)"; // Toggle mirroring
    console.log("Mirror state toggled:", isChecked); // Debugging
});

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
        let compressedData = canvas.toDataURL("image/jpeg", 0.9);

        callback(compressedData);
    };
}

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
