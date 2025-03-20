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
        // Stop any existing streams
        if (video.srcObject) {
            video.srcObject.getTracks().forEach(track => track.stop());
        }
        
        // Add necessary attributes for iOS
        video.setAttribute('playsinline', true);
        video.setAttribute('autoplay', true);
        video.setAttribute('muted', true);
        
        // Define constraints with exact dimensions for iOS
        const constraints = {
            audio: false,
            video: {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                facingMode: deviceId ? undefined : "user",
                deviceId: deviceId ? { exact: deviceId } : undefined
            }
        };
        
        console.log("Requesting camera with constraints:", constraints);
        
        // Get media stream
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        
        // Assign stream to video element
        video.srcObject = stream;
        
        // iOS Safari fix - force play
        video.play().catch(e => console.error("Play error:", e));
        
        // Double-check that stream is active
        setTimeout(() => {
            if (video.paused) {
                console.log("Video still paused after 500ms, trying to play again");
                video.play().catch(e => console.error("Second play attempt error:", e));
            }
        }, 500);
        
        console.log("Camera started successfully with stream:", stream);
    } catch (error) {
        console.error("Error accessing the camera:", error);
        alert("Camera access error: " + error.message);
    }
}

// 🎨 Apply Filter to Live Camera Feed
filterSelect.addEventListener("change", () => {
    video.style.filter = filterSelect.value; // Apply selected filter to live video
});

// 🎭 Function to Apply Filter to Canvas
function applyFilter(ctx, canvas, img) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.filter = filterSelect.value;  // Apply selected filter
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
}

// 📸 Capture photo and assign to canvas
function capturePhoto() {
    if (capturedPhotos.length < maxPhotos) {
        console.log("Capturing photo...");

        if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
            console.error("Video feed not ready yet!");
            return;
        }

        const videoWidth = video.videoWidth;
        const videoHeight = video.videoHeight;

        canvasList.forEach(canvas => {
            if (canvas) {
                canvas.width = videoWidth;
                canvas.height = videoHeight;
            }
        });

        const tempCanvas = document.createElement("canvas");
        const ctx = tempCanvas.getContext("2d");

        tempCanvas.width = videoWidth;
        tempCanvas.height = videoHeight;

        if (mirrorToggle.checked) {
            ctx.translate(tempCanvas.width, 0);
            ctx.scale(-1, 1);
        }

        ctx.filter = filterSelect.value;  // Apply filter to captured image
        ctx.drawImage(video, 0, 0, videoWidth, videoHeight);

        const photoData = tempCanvas.toDataURL("image/png");
        capturedPhotos.push(photoData);

        canvasList.forEach((canvas, index) => {
            if (canvas && capturedPhotos[index]) {
                const targetCtx = canvas.getContext("2d");
                let img = new Image();
                img.src = capturedPhotos[index];

                img.onload = () => {
                    applyFilter(targetCtx, canvas, img);
                    canvas.style.display = "block";
                };
            }
        });

        counterText.textContent = `Photos Taken: ${capturedPhotos.length} / ${maxPhotos}`;
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
const countdownInterval = 1000; // 1 second per tick
let countdownTimer = null;

// 🔥 Preload sounds to remove delay
const beepSound = new Audio("countdown.mp3");
const shutterSound = new Audio("shutter.mp3");

beepSound.volume = 1.0;
shutterSound.volume = 1.0;
beepSound.load();
shutterSound.load();

// 📢 Function to Play Sound Instantly
function playSound(sound) {
    sound.pause();
    sound.currentTime = 0;
    sound.play().catch(err => console.log(`Sound error: ${err}`));
}

// ⏳ Countdown and Auto-Capture


function startAutoCapture() {
    capturedPhotos = [];
    counterText.textContent = `Photos Taken: 0 / ${maxPhotos}`;
    captureBtn.disabled = true;

    let count = 0;

    function countdownAndCapture() {
        if (count >= maxPhotos) {
            captureBtn.disabled = false;
            countdownText.style.display = "none";
            beepSound.pause();  // Stop any remaining beeps
            beepSound.currentTime = 0;
            return;
        }

        let countdown = 5;
        countdownText.textContent = countdown;
        countdownText.style.display = "block";

        playSound(beepSound); // First beep instantly

        countdownTimer = setInterval(() => {
            countdown--;

            if (countdown > 0) {
                countdownText.textContent = countdown;
                if (count < maxPhotos) {
                    playSound(beepSound); // Only play if more photos are needed
                }
            } else {
                clearInterval(countdownTimer);
                countdownText.textContent = "";
                countdownText.style.display = "none";

                setTimeout(() => {
                    playSound(shutterSound);
                    capturePhoto();
                    count++;

                    if (count < maxPhotos) {
                        setTimeout(countdownAndCapture, 800);
                    } else {
                        setTimeout(() => {
                            countdownText.textContent = "";  // Ensure it's cleared
                            countdownText.style.display = "none";  // Hide it
                            captureBtn.disabled = false;
                            beepSound.pause();  // Stop any remaining beeps
                            beepSound.currentTime = 0;
                        }, 700);
                    }
                }, 100);
            }
        }, countdownInterval);
    }

    countdownAndCapture();
}


// 📸 Generate Final Collage
function generatePhotoStrip() {
    if (!finalCanvas) return;

    const width = canvasList[0].width;
    const height = canvasList[0].height;
    finalCanvas.width = width;
    finalCanvas.height = height * maxPhotos;

    capturedPhotos.forEach((photo, index) => {
        let img = new Image();
        img.src = photo;
        img.onload = () => {
            finalCtx.drawImage(img, 0, index * height, width, height);
        };
    });

    finalCanvas.style.display = "block";
}
function fixIOSCamera() {
    // iOS detection
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    
    if (isIOS) {
        console.log("iOS device detected, applying special fixes");
        
        // Force user interaction
        document.body.addEventListener('click', function iosClickFix() {
            if (video.paused) {
                video.play().catch(e => console.log("iOS click fix play error:", e));
            }
            // Only need this once
            document.body.removeEventListener('click', iosClickFix);
        });
        
        // Handle orientation changes
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                // Restart camera after orientation change
                if (video.srcObject) {
                    const currentStream = video.srcObject;
                    video.srcObject = null;
                    setTimeout(() => {
                        video.srcObject = currentStream;
                        video.play().catch(e => console.log("Orientation change play error:", e));
                    }, 300);
                }
            }, 500);
        });
    }
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

// 🎥 Start Camera with Selected Device


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
  function storePhotosInSession() {
    // Convert the captured photos array to JSON and store in session storage
    sessionStorage.setItem('capturedPhotos', JSON.stringify(capturedPhotos));
}

// Modify the capturePhoto function to store photos after capturing
function capturePhoto() {
    if (capturedPhotos.length < maxPhotos) {
        console.log("Capturing photo...");

        if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
            console.error("Video feed not ready yet!");
            return;
        }

        const videoWidth = video.videoWidth;
        const videoHeight = video.videoHeight;

        canvasList.forEach(canvas => {
            if (canvas) {
                canvas.width = videoWidth;
                canvas.height = videoHeight;
            }
        });

        const tempCanvas = document.createElement("canvas");
        const ctx = tempCanvas.getContext("2d");

        tempCanvas.width = videoWidth;
        tempCanvas.height = videoHeight;

        if (mirrorToggle.checked) {
            ctx.translate(tempCanvas.width, 0);
            ctx.scale(-1, 1);
        }

        ctx.filter = filterSelect.value;  // Apply filter to captured image
        ctx.drawImage(video, 0, 0, videoWidth, videoHeight);

        const photoData = tempCanvas.toDataURL("image/png");
        capturedPhotos.push(photoData);

        canvasList.forEach((canvas, index) => {
            if (canvas && capturedPhotos[index]) {
                const targetCtx = canvas.getContext("2d");
                let img = new Image();
                img.src = capturedPhotos[index];

                img.onload = () => {
                    applyFilter(targetCtx, canvas, img);
                    canvas.style.display = "block";
                };
            }
        });

        counterText.textContent = `Photos Taken: ${capturedPhotos.length} / ${maxPhotos}`;
        
        // Store photos in session storage
        storePhotosInSession();
    }
}

// Add event listener for the Next Page button
document.querySelector("a[href='edit.html']").addEventListener("click", function(e) {
    // Make sure photos are stored before navigating
    storePhotosInSession();
});
