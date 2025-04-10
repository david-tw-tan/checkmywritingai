// Array to store uploaded files
let uploadedFiles = [];
// const MAX_FILES = 3;
const MAX_FILES = 1; // set to 1 for testing purposes

const shutterSound = new Audio("shutter1.mp3");

document.addEventListener('DOMContentLoaded', function() {
    // Get references to DOM elements
    const fileInput = document.getElementById('writing-file');
    const feedbackBtn = document.getElementById('feedbackBtn');

    // Initially disable the feedback button
    feedbackBtn.disabled = true;

    // Function to open camera
    function openCamera() {
        // Check if max file limit is reached before opening camera
        if (uploadedFiles.length >= MAX_FILES) {
            showFileLimitWarning();
            return;
        }

        // Create elements for camera interface if they don't exist
        let cameraContainer = document.getElementById('camera-container');
        if (!cameraContainer) {
            // Create camera container
            cameraContainer = document.createElement('div');
            cameraContainer.id = 'camera-container';
            cameraContainer.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50';

            // Create video element
            const videoElement = document.createElement('video');
            videoElement.id = 'camera-feed';
            videoElement.autoplay = true;
            videoElement.playsInline = true; // Important for iOS
            videoElement.style.maxWidth = '100%';
            videoElement.style.maxHeight = '80vh';

            // Create capture button
            const captureButton = document.createElement('button');
            captureButton.id = 'capture-button';
            captureButton.className = 'absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white rounded-full w-16 h-16 flex items-center justify-center shadow-lg';
            captureButton.innerHTML = '<i class="ph ph-camera text-blue-500 text-3xl"></i>';

            // Create close button
            // Create close button (X in the corner) - now positioned in the upper right
            const closeButton = document.createElement('button');
            closeButton.id = 'close-crop';
            closeButton.className = 'absolute top-4 right-4 text-white flex items-center justify-center';
            closeButton.style.zIndex = '10'; // Ensure it's above other elements
            closeButton.innerHTML = '<i class="ph ph-x text-4xl font-bold" style="margin-top: -10px;"></i>';
            closeButton.addEventListener('click', closeCamera);

            // Create camera interface container
            const interfaceContainer = document.createElement('div');
            interfaceContainer.className = 'relative w-full max-w-lg';
            interfaceContainer.id = 'camera-interface';

            // Create canvas for capturing photos
            const canvas = document.createElement('canvas');
            canvas.id = 'capture-canvas';
            canvas.style.display = 'none';

            // Assemble the elements
            interfaceContainer.appendChild(videoElement);
            interfaceContainer.appendChild(captureButton);
            interfaceContainer.appendChild(closeButton);
            interfaceContainer.appendChild(canvas);
            cameraContainer.appendChild(interfaceContainer);
            document.body.appendChild(cameraContainer);

            // Add event listeners
            captureButton.addEventListener('click', capturePhoto);
            closeButton.addEventListener('click', closeCamera);
        } else {
            cameraContainer.style.display = 'flex';
            // Make sure we're showing the camera interface, not the crop interface
            document.getElementById('camera-interface').style.display = 'block';
            const cropContainer = document.getElementById('crop-container');
            if (cropContainer) cropContainer.style.display = 'none';
        }

        // Check if browser supports camera access
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            alert('Your browser does not support camera access');
            return;
        }

        // Access the camera with appropriate facing mode based on device type
        navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: isMobileDevice() ? 'environment' : 'user',
                width: { ideal: 1280 },
                height: { ideal: 720 }
            }
        })
        .then(stream => {
            const videoElement = document.getElementById('camera-feed');
            videoElement.srcObject = stream;
            // Store stream to stop it later
            window.cameraStream = stream;
        })
        .catch(error => {
            console.error('Error accessing camera:', error);
            alert('Could not access camera: ' + error.message);
            closeCamera();
        });
    }

    // Helper function to detect mobile devices
    function isMobileDevice() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }


    function capturePhoto() {

        // Play shutter sound
        shutterSound.play();

        // Add flash animation to the video container
        const videoElement = document.getElementById('camera-feed');
        const flashElement = document.createElement('div');
        flashElement.className = 'camera-flash';
        videoElement.parentElement.appendChild(flashElement);

        // Get video reference now, but delay the actual capture
        const video = document.getElementById('camera-feed');
        const canvas = document.getElementById('capture-canvas');
        const context = canvas.getContext('2d');

        // Set canvas dimensions to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Delay the capture and display to allow animation to be visible
        setTimeout(() => {
            // Draw the video frame to the canvas
            context.drawImage(video, 0, 0, canvas.width, canvas.height);

            // Get image data URL
            const imageDataUrl = canvas.toDataURL('image/jpeg');

            // Show confirmation and cropping interface
            showCropInterface(imageDataUrl);

            // Remove flash element after animation completes
            if (flashElement.parentElement) {
                flashElement.parentElement.removeChild(flashElement);
            }
        }, 300); // 300ms delay - adjust as needed

    }

    function showCropInterface(imageDataUrl) {
        // Hide camera interface
        document.getElementById('camera-interface').style.display = 'none';

        // Create crop container if it doesn't exist
        let cropContainer = document.getElementById('crop-container');
        if (!cropContainer) {
            cropContainer = document.createElement('div');
            cropContainer.id = 'crop-container';
            cropContainer.className = 'relative w-full max-w-lg';

            // Create close button (X in the corner) - now positioned outside the image
            const closeButton = document.createElement('button');
            closeButton.id = 'crop-close-button'; // Different ID to avoid conflicts
            closeButton.className = 'absolute top-4 right-4 text-white flex items-center justify-center';
            closeButton.style.zIndex = '10';
            closeButton.innerHTML = '<i class="ph ph-x text-4xl font-bold" style="margin-top: -10px;"></i>';
            closeButton.addEventListener('click', closeCamera);

            // Create header with simplified instructions
            const header = document.createElement('div');
            header.className = 'text-white text-center mb-4 mt-4';
            header.innerHTML = '<h3 class="text-lg font-medium">Confirm Your Photo!</h3>' +
                              '<p class="text-sm">Drag to resize. Tap "Use Photo" when ready.</p>';

            // Create image container
            const imageContainer = document.createElement('div');
            imageContainer.className = 'relative bg-black rounded-lg overflow-hidden';
            imageContainer.style.maxHeight = '60vh';

            // Create image element
            const image = document.createElement('img');
            image.id = 'crop-image';
            image.className = 'block max-w-full';

            // Create a container for the buttons with the confirm-buttons class
            const buttonsContainer = document.createElement('div');
            buttonsContainer.className = 'confirm-buttons';

            // Create retake button
            const retakeButton = document.createElement('button');
            retakeButton.id = 'retake-button'; // Match the ID in your CSS
            retakeButton.className = 'bg-blue-500 text-white rounded-lg shadow flex items-center justify-center';
            retakeButton.innerHTML = '<i class="ph ph-camera mr-2"></i> Retake';

            // Create confirm button
            const confirmButton = document.createElement('button');
            confirmButton.id = 'use-photo-button'; // Match the ID in your CSS
            confirmButton.className = 'bg-green-500 text-white rounded-lg shadow flex items-center justify-center';
            confirmButton.innerHTML = 'Use Photo <i class="ph ph-check ml-2"></i>';

            // Assemble the elements
            imageContainer.appendChild(image);
            buttonsContainer.appendChild(retakeButton);
            buttonsContainer.appendChild(confirmButton);

            cropContainer.appendChild(closeButton);
            cropContainer.appendChild(header);
            cropContainer.appendChild(imageContainer);
            cropContainer.appendChild(buttonsContainer);

            // Add to camera container
            document.getElementById('camera-container').appendChild(cropContainer);

            // Add event listeners
            confirmButton.addEventListener('click', confirmCrop);
            retakeButton.addEventListener('click', retakePhoto);
        } else {
            cropContainer.style.display = 'block';
        }

        // Set image source
        const image = document.getElementById('crop-image');
        image.src = imageDataUrl;

        // Initialize cropper when image is loaded
        image.onload = function() {
            if (window.cropper) {
                window.cropper.destroy();
            }

            window.cropper = new Cropper(image, {
                viewMode: 1,
                dragMode: 'move',
                aspectRatio: NaN,
                autoCropArea: 0.8,
                restore: false,
                guides: true,
                center: true,
                highlight: false,
                cropBoxMovable: true,
                cropBoxResizable: true,
                toggleDragModeOnDblclick: false
            });
        };
    }

    function confirmCrop() {
      if (!window.cropper) return;

      // Get cropped canvas
      const canvas = window.cropper.getCroppedCanvas({
        width: 800,
        height: 800,
        fillColor: '#fff',
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'high',
      });

      if (!canvas) {
        alert('Error: Could not crop image');
        return;
      }

      // Convert canvas to a data URL
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);

      // Create a blob from the data URL
      canvas.toBlob(async (blob) => {

        // Log original blob size
        console.log(`Original captured image size: ${(blob.size / 1024).toFixed(2)} KB`);

        // Create compression options
        const options = {
          maxSizeMB: 1,
          maxWidthOrHeight: 1200,
          useWebWorker: true,
          fileType: 'image/jpeg'
        };

        try {
          // Compress the blob
          const compressedBlob = await imageCompression(blob, options);

          // Log compressed blob size
          console.log(`Compressed captured image size: ${(compressedBlob.size / 1024).toFixed(2)} KB`);
          console.log(`Compression ratio: ${((1 - compressedBlob.size / blob.size) * 100).toFixed(2)}%`);

          // Create a File object from the compressed blob
          const file = new File([compressedBlob], "camera-capture.jpg", { type: "image/jpeg" });

          // Add to uploaded files
          uploadedFiles.push(file);

          // Update UI
          updateFileStatusContainer();

          // Enable feedback button
          enableFeedbackButton();

          // Close camera
          closeCamera();
        } catch (error) {
          console.error('Compression error:', error);
          alert('An error occurred while compressing your image. Please try again.');
        }
      }, 'image/jpeg', 0.9);
    }


    function retakePhoto() {
        // Hide crop interface
        document.getElementById('crop-container').style.display = 'none';

        // Show camera interface
        document.getElementById('camera-interface').style.display = 'block';

        // Destroy cropper
        if (window.cropper) {
            window.cropper.destroy();
            window.cropper = null;
        }
    }

    function closeCamera() {
        // Stop the camera stream
        if (window.cameraStream) {
            window.cameraStream.getTracks().forEach(track => track.stop());
            window.cameraStream = null;
        }

        // Destroy cropper if it exists
        if (window.cropper) {
            window.cropper.destroy();
            window.cropper = null;
        }

        // Hide the camera container
        const cameraContainer = document.getElementById('camera-container');
        if (cameraContainer) {
            cameraContainer.style.display = 'none';
        }
    }


    // Function to open file gallery
    function openGallery() {
        // Check if max file limit is reached before opening file dialog
        if (uploadedFiles.length >= MAX_FILES) {
            showFileLimitWarning();
            return;
        }
        // Only trigger the file input if we haven't reached the limit
        document.getElementById('writing-file').click();
    }

    // Handle file selection
    fileInput.addEventListener('change', function() {
        if (fileInput.files.length > 0) {
            // File has been selected
            enableFeedbackButton();
        }
    });


    // Function to check writing, now compresses file before uploading
    function checkWriting() {
      if (!document.getElementById('feedbackBtn').disabled) {
        const loadingPopup = document.getElementById('loadingPopup');
        loadingPopup.style.display = 'flex';
        setTimeout(() => {
          loadingPopup.style.opacity = 1;
        }, 50);

        // Get the first file from uploadedFiles array
        const file = uploadedFiles[0];

        // Check if the file is an image
        if (file.type.startsWith('image/')) {

          // Log original file size
          console.log(`Original file size: ${(file.size / 1024).toFixed(2)} KB`);

          // Compression options for images only
          const options = {
            maxSizeMB: 1,
            maxWidthOrHeight: 1200,
            useWebWorker: true,
            fileType: file.type
          };

          // Compress the image
          imageCompression(file, options)
            .then(compressedFile => {

              // Log compressed file size
              console.log(`Compressed file size: ${(compressedFile.size / 1024).toFixed(2)} KB`);
              console.log(`Compression ratio: ${((1 - compressedFile.size / file.size) * 100).toFixed(2)}%`);

              processFileAndSend(compressedFile);

            })
            .catch(error => {
              console.error('Compression error:', error);
              alert('An error occurred while compressing your image. Please try again.');
              loadingPopup.style.display = 'none';
            });
        } else {
          // For non-image files, skip compression and process directly
          processFileAndSend(file);
        }
      }
    }

    // Helper function to process file and send to server
    function processFileAndSend(file) {
      const reader = new FileReader();

      reader.onload = function(event) {
        // Store the full data URL in localStorage for the thumbnail
        localStorage.setItem('uploadedImage', event.target.result);

        // Get base64 data (remove the data:xxx;base64, prefix)
        const base64Data = event.target.result.split(',')[1];

        // Send the data to the server
        fetch('/api/check-writing', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            imageData: base64Data,
            mimeType: file.type
          })
        })
        .then(response => response.json())
        .then(data => {
          // Store the feedback data in localStorage
          localStorage.setItem('writingFeedback', JSON.stringify(data));
          document.body.classList.add('fade-out');
          setTimeout(() => {
            window.location.href = 'results.html';
          }, 250);
        })
        .catch(error => {
          console.error('Error:', error);
          alert('An error occurred while processing your writing. Please try again.');
          document.getElementById('loadingPopup').style.display = 'none';
        });
      };

      // Read the file as a data URL (base64)
      reader.readAsDataURL(file);
    }


  // Expose functions to global scope for HTML onclick attributes
  window.openCamera = openCamera;
  window.openGallery = openGallery;
  window.checkWriting = checkWriting;

  // Add event listener to feedback button
  if (feedbackBtn) {
      feedbackBtn.addEventListener('click', checkWriting);
  }

});


// Function to enable the feedback button
function enableFeedbackButton() {
    // Enable the feedback button once a file is uploaded
    feedbackBtn.disabled = false;
    feedbackBtn.classList.add('animate-pulse');
    feedbackBtn.classList.add('feedback-btn-active');

    // Remove pulse animation after 1.5 seconds
    setTimeout(() => {
        feedbackBtn.classList.remove('animate-pulse');
    }, 0); // reduce to 0 so that CTA button becomes active instantly
}

function handleFileSelect(input) {
    if (input.files && input.files.length > 0) {
        // Check if adding these files would exceed the limit
        const remainingSlots = MAX_FILES - uploadedFiles.length;

        if (remainingSlots <= 0) {
            // Show inline warning instead of alert
            showFileLimitWarning();
            return;
        }

        // Only take as many files as we have slots for
        const filesToAdd = Array.from(input.files).slice(0, remainingSlots);

        // Add new files to our tracking array
        filesToAdd.forEach(file => {
            uploadedFiles.push(file);
        });

        // Update the UI to show all files
        updateFileStatusContainer();

        // Enable the feedback button
        enableFeedbackButton();
    }
}

function updateFileStatusContainer() {
    const container = document.getElementById('fileStatusContainer');
    const fileDisplayEl = document.getElementById('fileNameDisplay');

    // Clear previous content
    fileDisplayEl.innerHTML = '';

    // Remove any existing warning
    const warningEl = document.getElementById('file-limit-warning');
    if (warningEl) warningEl.remove();

    if (uploadedFiles.length === 0) {
        container.style.display = 'none';
        return;
    }

    // Add file counter at the top - centered with simplified text
    const counterEl = document.createElement('div');
    counterEl.className = 'file-counter text-xs text-gray-500 mb-3';
    counterEl.style.textAlign = 'center';
    counterEl.style.width = '100%';
    counterEl.textContent = `${uploadedFiles.length} files uploaded (max 3)`;
    fileDisplayEl.appendChild(counterEl);

    // Create file entries for each uploaded file
    uploadedFiles.forEach((file, index) => {
        const fileEntry = document.createElement('div');
        fileEntry.className = 'file-entry';
        fileEntry.style.display = 'flex';
        fileEntry.style.alignItems = 'center';
        fileEntry.style.padding = '6px 0';
        fileEntry.style.borderBottom = index < uploadedFiles.length - 1 ? '1px solid #e2e8f0' : 'none';

        // Add numbered indicator for each file - using a more subtle style
        const numberIndicator = document.createElement('span');
        numberIndicator.className = 'file-number';
        numberIndicator.textContent = `${index + 1}`;
        numberIndicator.style.marginRight = '16px';
        fileEntry.appendChild(numberIndicator);

        // Create thumbnail or icon
        const iconElement = document.createElement('span');
        iconElement.style.marginRight = '8px';
        iconElement.style.display = 'inline-block';
        iconElement.style.flexShrink = '0';

        if (file.type.startsWith('image/')) {
            // For image files, create thumbnail
            const img = document.createElement('img');
            img.style.width = '30px';
            img.style.height = '30px';
            img.style.objectFit = 'cover';
            img.style.borderRadius = '4px';

            const reader = new FileReader();
            reader.onload = (e) => {
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);

            iconElement.appendChild(img);
        } else if (file.type === 'application/pdf') {
            // For PDF files, use pdf.js to create a thumbnail
            const reader = new FileReader();
            reader.onload = function(event) {
                const typedarray = new Uint8Array(event.target.result);

                // Initialize pdf.js
                const loadingTask = pdfjsLib.getDocument(typedarray);
                loadingTask.promise.then(function(pdf) {
                    // Get the first page
                    pdf.getPage(1).then(function(page) {
                        const viewport = page.getViewport({scale: 0.5});

                        // Create a canvas for the PDF
                        const canvas = document.createElement('canvas');
                        canvas.width = 30;
                        canvas.height = 30;
                        canvas.style.borderRadius = '4px';

                        // Render the PDF page to the canvas
                        const renderContext = {
                            canvasContext: canvas.getContext('2d'),
                            viewport: viewport
                        };

                        page.render(renderContext).promise.then(function() {
                            iconElement.innerHTML = '';
                            iconElement.appendChild(canvas);
                        });
                    });
                }).catch(function() {
                    // Fallback to icon if rendering fails
                    iconElement.innerHTML = '<i class="ph ph-file-pdf text-red-500 text-xl"></i>';
                });
            };
            reader.readAsArrayBuffer(file);
        } else {
            // For document files, show document icon
            iconElement.innerHTML = '<i class="ph ph-file-doc text-blue-500 text-xl"></i>';
        }

        // Create text element for filename
        const textElement = document.createElement('span');
        textElement.textContent = file.name;
        textElement.style.verticalAlign = 'middle';
        textElement.style.flexGrow = '1';
        textElement.style.overflow = 'hidden';
        textElement.style.textOverflow = 'ellipsis';
        textElement.style.whiteSpace = 'nowrap';

        // Create remove button
        const removeButton = document.createElement('button');
        removeButton.innerHTML = '<i class="ph ph-x text-lg"></i>';
        removeButton.className = 'text-gray-500 hover:text-red-500 ml-2 flex-shrink-0';
        removeButton.onclick = function(e) {
            e.stopPropagation();
            removeFileByIndex(index);
        };

        // Append elements to file entry
        fileEntry.appendChild(iconElement);
        fileEntry.appendChild(textElement);
        fileEntry.appendChild(removeButton);

        // Add to display
        fileDisplayEl.appendChild(fileEntry);
    });

    // Show the container
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
}


function showFileLimitWarning() {
    const container = document.getElementById('fileStatusContainer');

    // Create warning message if it doesn't exist
    let warningEl = document.getElementById('file-limit-warning');
    if (!warningEl) {
        warningEl = document.createElement('div');
        warningEl.id = 'file-limit-warning';
        warningEl.className = 'text-white font-medium text-sm mt-3 mb-3 p-3 rounded-lg';
        warningEl.style.backgroundColor = '#E53E3E'; // Using your brand red color from CSS
        warningEl.style.border = '1px solid #C53030';
        warningEl.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
        warningEl.innerHTML = `<i class="ph ph-warning text-white"></i> Maximum ${MAX_FILES} files allowed. Please remove a file first.`;

        // Add animation
        warningEl.style.animation = 'fadeInShake 0.5s ease-in-out';

        // Insert the warning
        container.parentNode.insertBefore(warningEl, container.nextSibling);

        // Auto-hide after 5 seconds
        setTimeout(() => {
            if (warningEl.parentNode) {
                warningEl.style.animation = 'fadeOut 0.5s ease-in-out';
                setTimeout(() => {
                    if (warningEl.parentNode) {
                        warningEl.parentNode.removeChild(warningEl);
                    }
                }, 500);
            }
        }, 5000);
    }
}


function removeFileByIndex(index) {
    if (index >= 0 && index < uploadedFiles.length) {
        uploadedFiles.splice(index, 1);
        updateFileStatusContainer();

        // Disable feedback button if no files
        if (uploadedFiles.length === 0) {
            document.getElementById('feedbackBtn').disabled = true;
            document.getElementById('feedbackBtn').classList.remove('feedback-btn-active');
            document.getElementById('step1Label').classList.remove('step-complete');
        }
    }
}

function removeFile() {
    uploadedFiles = [];
    updateFileStatusContainer();
    document.getElementById('feedbackBtn').disabled = true;
    document.getElementById('feedbackBtn').classList.remove('feedback-btn-active');
    document.getElementById('step1Label').classList.remove('step-complete');
}
