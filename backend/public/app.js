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

    // Helper function to detect mobile devices
    function isMobileDevice() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }


    function openGallery(isChangingPhoto = false) {
      // Skip the file limit check if we're changing an existing photo
      if (!isChangingPhoto && uploadedFiles.length >= MAX_FILES) {
        showFileLimitWarning();
        return;
      }

      // Remove capture attribute to allow gallery selection
      const fileInput = document.getElementById('writing-file');
      if (fileInput) {
        if (fileInput.hasAttribute('capture')) {
          fileInput.removeAttribute('capture');
        }
        fileInput.click();
      } else {
        console.error("File input element not found");
      }
    }

    // Function to check writing, now compresses file before uploading
    function checkWriting() {
      if (!document.getElementById('feedbackBtn').disabled) {
        const loadingPopup = document.getElementById('loadingPopup');
        loadingPopup.style.display = 'flex';
        setTimeout(() => {
          loadingPopup.style.opacity = 1;
        }, 50);

        const file = uploadedFiles[0];
        if (file.type.startsWith('image/')) {
          console.log(`Original file size: ${(file.size / 1024).toFixed(2)} KB`);
          const options = {
            maxSizeMB: 1,
            maxWidthOrHeight: 1200,
            useWebWorker: true,
            fileType: file.type
          };
          imageCompression(file, options)
            .then(compressedFile => {
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
          processFileAndSend(file);
        }
      }
    }

    function processFileAndSend(file) {
      const reader = new FileReader();
      reader.onload = function(event) {
        localStorage.setItem('uploadedImage', event.target.result);
        const base64Data = event.target.result.split(',')[1];
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
          if (data.error === "NOT_WRITING_SAMPLE") {
            showErrorPopup("<p>Oops! That doesn’t look like a writing sample.</p><p>Please try a different photo!</p>");
          } else {
            localStorage.setItem('writingFeedback', JSON.stringify(data));
            document.body.classList.add('fade-out');
            setTimeout(() => {
              window.location.href = 'results.html';
            }, 250);
          }
        })
        .catch(error => {
          console.error('Error:', error);
          alert('An error occurred while processing your writing. Please try again.');
        })
        .finally(() => {
          document.getElementById('loadingPopup').style.display = 'none';
        });
      };
      reader.readAsDataURL(file);
    }

    function showErrorPopup(message) {
      const popup = document.createElement('div');
      popup.className = 'error-popup';
      popup.innerHTML = `
        <div class="error-content">
          <p>${message}</p>
          <button onclick="closeErrorPopup()">OK</button>
        </div>
      `;
      document.body.appendChild(popup);
      document.body.classList.add('dimmed');
    }


  // Expose functions to global scope for HTML onclick attributes
  // window.openCamera = openCamera;
  window.openGallery = openGallery;
  window.checkWriting = checkWriting;

  // Add event listener to feedback button
  if (feedbackBtn) {
      feedbackBtn.addEventListener('click', checkWriting);
  }

});

function closeErrorPopup() {
  const popup = document.querySelector('.error-popup');
  if (popup) {
    document.body.classList.remove('dimmed');
    popup.remove();
  }
  console.log("closing pop up")
  removeFile();
  // resetUploadState();
}

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
        // Clear previous files
        uploadedFiles = [];

        // Get the selected file
        const file = input.files[0];

        // Create a FileReader to get the image data URL
        const reader = new FileReader();
        reader.onload = function(e) {
            const imageDataUrl = e.target.result;

            // Show the cropping interface
            showCropInterface(imageDataUrl, file);
        };
        reader.readAsDataURL(file);
    }
}


// Function to display uploaded file in the upload area
function displayUploadedFile(file) {
  // Show the uploaded state and hide empty state
  document.getElementById('emptyUploadState').classList.add('hidden');
  document.getElementById('fileUploadedState').classList.remove('hidden');

  // Update filename
  document.getElementById('fileName').textContent = file.name;

  // Create thumbnail for image files
  const thumbnailContainer = document.getElementById('fileThumbnail');
  thumbnailContainer.innerHTML = '';

  if (file.type.startsWith('image/')) {
    const reader = new FileReader();
    reader.onload = function(e) {
      const img = document.createElement('img');
      img.src = e.target.result;
      img.className = 'w-full h-full object-cover';
      thumbnailContainer.appendChild(img);
    };
    reader.readAsDataURL(file);
  } else {
    // For non-image files, show an icon
    const icon = document.createElement('div');
    icon.className = 'w-full h-full flex items-center justify-center bg-gray-100';
    icon.innerHTML = '📄';
    thumbnailContainer.appendChild(icon);
  }

}

// Function to remove file
function removeFile() {
  uploadedFiles = [];

  // Show empty state and hide uploaded state
  document.getElementById('emptyUploadState').classList.remove('hidden');
  document.getElementById('fileUploadedState').classList.add('hidden');

  // Disable feedback button
  document.getElementById('feedbackBtn').disabled = true;
  document.getElementById('feedbackBtn').classList.remove('feedback-btn-active');
  document.getElementById('step1Label').classList.remove('step-complete');

  // Clear file input
  document.getElementById('writing-file').value = '';
}

// Function to show upload options (for mobile)
function showUploadOptions() {
  // On mobile, this would trigger the native photo selection UI
  // For web compatibility, we can simulate with our own dropdown
  if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
    // On mobile, we can try to use the device's native file picker
    document.getElementById('writing-file').click();
  } else {
    // For desktop fallback, show a custom dropdown
    openGallery();
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

  // Show empty state and hide uploaded state
  document.getElementById('emptyUploadState').classList.remove('hidden');
  document.getElementById('fileUploadedState').classList.add('hidden');

  // Disable feedback button
  document.getElementById('feedbackBtn').disabled = true;
  document.getElementById('feedbackBtn').classList.remove('feedback-btn-active');
  document.getElementById('step1Label').classList.remove('step-complete');

  // Clear file input
  document.getElementById('writing-file').value = '';

}

function changePhoto() {
    // First remove the existing file
    removeFile();
    // Then open the file selection dialog
    showUploadOptions();
}

function showCropInterface(imageDataUrl) {
    const cameraContainer = document.getElementById('camera-container');

    // Display the fullscreen overlay
    cameraContainer.style.display = 'flex';

    // Set the image source
    const cropImage = document.getElementById('crop-image');

    // Apply proper styling BEFORE setting the src
    // This ensures image displays correctly from the beginning
    cropImage.style.maxWidth = '100%';
    cropImage.style.maxHeight = '100%';
    cropImage.style.width = 'auto';
    cropImage.style.height = 'auto';
    cropImage.style.objectFit = 'contain';
    cropImage.style.objectPosition = 'center';
    cropImage.style.margin = '0 auto';
    cropImage.style.display = 'block';

    // Center the image in the container
    cameraContainer.style.display = 'flex';
    cameraContainer.style.alignItems = 'center';
    cameraContainer.style.justifyContent = 'center';

    // Now set the image source
    cropImage.src = imageDataUrl;

    // Initialize Cropper.js when the image loads
    cropImage.onload = function () {
        if (window.cropper) {
            window.cropper.destroy();
        }

        window.cropper = new Cropper(cropImage, {
            viewMode: 2,
            dragMode: 'none',
            aspectRatio: NaN,
            autoCropArea: 1,
            restore: false,
            guides: true,
            center: true,
            highlight: false,
            responsive: true,
            cropBoxMovable: true,
            cropBoxResizable: true,
            toggleDragModeOnDblclick: false,
            checkOrientation: true,
        });
    };
}




// Close the cropping interface - if press close X button
document.getElementById('crop-close-button').addEventListener('click', function () {
    const cameraContainer = document.getElementById('camera-container');
    // Hide the fullscreen overlay
    cameraContainer.style.display = 'none';
    // Destroy Cropper instance (if applicable)
    if (window.cropper) {
        window.cropper.destroy();
        window.cropper = null;
    }
});

// Close the cropping interface - if press background overlay
document.getElementById('camera-container').addEventListener('click', function () {
  // Check if the click was directly on the overlay (not on its children)
  if (event.target === document.getElementById('camera-container')) {
      const cameraContainer = document.getElementById('camera-container');
      // Hide the fullscreen overlay
      cameraContainer.style.display = 'none';
      // Destroy Cropper instance (if applicable)
      if (window.cropper) {
          window.cropper.destroy();
          window.cropper = null;
      }
  }
});

// Confirm cropped image
document.getElementById('use-photo-button').addEventListener('click', function () {
    if (!window.cropper) return;

    // Automatically scroll down so "Check My Writing Now" button appears above fold
    setTimeout(scrollToContent, 300);

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
        const compressedFile = await compressImage(blob);

        // Add to uploaded files
        uploadedFiles.push(compressedFile);

        // Update UI
        displayUploadedFile(compressedFile);

        // Enable feedback button
        enableFeedbackButton();

        // Close the cropping interface
        document.getElementById('camera-container').style.display = 'none';

        if (window.cropper) {
            window.cropper.destroy();
            window.cropper = null;
        }

    }, 'image/jpeg', 0.9);
});


// Helper function to compress an image
async function compressImage(blob) {
    const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1200,
        useWebWorker: true,
        fileType: 'image/jpeg'
    };
    try {
        const compressedBlob = await imageCompression(blob, options);
        return new File([compressedBlob], "camera-capture.jpg", { type: "image/jpeg" });
    } catch (error) {
        console.error('Compression error:', error);
        alert('An error occurred while compressing your image. Please try again.');
        return blob;
    }
}

// Function to close the cropping interface
function closeCropInterface(imageDataUrl, file) {
    // Destroy cropper if it exists
    if (window.cropper) {
        window.cropper.destroy();
        window.cropper = null;
    }

    // Hide the cropping container
    const cropContainer = document.getElementById('crop-container');
    cropContainer.style.display = 'none';

    // If no cropping was done, use the original image
    if (!window.cropper) {
        uploadedFiles.push(file);
        displayUploadedFile(file);
        enableFeedbackButton();
    }
}

// Adjust top padding so it starts below fixed logo header + fade in whole_page_wrapper
document.addEventListener('DOMContentLoaded', function () {
    // Select the logo header element
    const logoHeader = document.querySelector('.logo-header');
    const body = document.body;

    // Function to update body padding dynamically
    function updateBodyPadding() {
        const headerHeight = logoHeader.offsetHeight; // Get the height of the header
        body.style.paddingTop = `${headerHeight}px`; // Apply it as padding-top to the body
    }

    // Update padding on page load
    updateBodyPadding();

    // Update padding on window resize (to handle responsive design)
    window.addEventListener('resize', updateBodyPadding);

    // fade in whole_page_wrapper
    setTimeout(() => {
      const myDiv = document.getElementById("whole_page_wrapper");
      myDiv.classList.add("fade-in");
    }, 250);

});

// Adjust scrolling of window after selecting photo so that "Check My Writing Now" button appears above the fold
function scrollToContent() {
  // Get the height of the fixed header
  const headerHeight = document.querySelector('.logo-header').offsetHeight;

  // Get the position of the container to scroll to
  const uploadContainer = document.getElementById('uploadArea');
  const containerPosition = uploadContainer.getBoundingClientRect().top + window.pageYOffset;

  // Scroll to the container, accounting for the fixed header
  window.scrollTo({
    top: containerPosition - headerHeight,
    behavior: 'smooth'
  });
}
