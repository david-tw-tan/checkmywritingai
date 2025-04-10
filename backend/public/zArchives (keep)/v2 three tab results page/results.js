document.addEventListener("DOMContentLoaded", () => {

  // Get data from localStorage instead of fetching from results.json
  const feedbackData = localStorage.getItem('writingFeedback');

  if (feedbackData) {
    try {
      const data = JSON.parse(feedbackData);
      // Call the function to populate the results with the data
      console.log("Retrieved data:", data); // Add this for debugging
      populateResults(data);
    } catch (error) {
      console.error('Error parsing feedback data:', error);
      // You might want to show an error message to the user
    }
  } else {
    console.error('No feedback data found in localStorage');
    // You might want to redirect back to the upload page or show an error message
  }


  // --- Pagination & Navigation ---
  const sections = document.querySelectorAll('.card');
  const progressSteps = document.querySelectorAll('.progress-step');
  let currentSectionIndex = 0; // Changed to index

  function updateNavigation(sectionIndex) {
    //sectionIndex
    console.log(sectionIndex);

    // Hide all sections
    sections.forEach((section, index) => {
      section.style.display = index === sectionIndex ? 'block' : 'none';
    });

    // Update progress bar
    updateProgressBar(sectionIndex);

    // Update active class on progress steps
    progressSteps.forEach((step, index) => {
      if (index <= sectionIndex) {
        step.classList.add('active');
      } else {
        step.classList.remove('active');
      }
    });

    // Enable or disable navigation buttons and arrow pagination buttons
    document.getElementById('prevBtn').style.visibility = sectionIndex === 0 ? 'hidden' : 'visible';
    document.getElementById('nextBtn').style.visibility = sectionIndex === sections.length - 1 ? 'hidden' : 'visible';

    window.scrollTo(0, 0);
  }

  function updateButtons() {
    const prevLabel = currentSectionIndex > 0 ?
      button_text_list[currentSectionIndex - 1] :
      button_text_list[button_text_list.length - 1]; // Show last section when on first page
    const nextLabel = currentSectionIndex < button_text_list.length - 1 ?
      button_text_list[currentSectionIndex + 1] :
      button_text_list[0]; // Show first section when on last page
    document.getElementById('prevLabel').textContent = prevLabel;
    document.getElementById('nextLabel').textContent = nextLabel;
  }

  // for dynamically updating button text depending on what page we are on
  const button_text_list = ["1. Basic Review", "2. Grammar Explanation", "3. Going Next Level"];

  function navigate(direction) {
    let newIndex = currentSectionIndex; // changed from const to let

    if (direction === 'next' && newIndex < sections.length - 1) {
      newIndex++;
    } else if (direction === 'prev' && newIndex > 0) {
      newIndex--;
    }
    currentSectionIndex = newIndex;
    updateButtons();
    updateNavigation(newIndex);

  }

  // Set onClick progress bar to the right label.
  function updateProgressBar(currentStep) {
    progressSteps.forEach((step, index) => {
      if (index <= currentStep) {
        step.classList.add('active');
      } else {
        step.classList.remove('active');
      }
    });
  }


  document.querySelectorAll('.next-button').forEach(link => {
    link.addEventListener('click', () => navigate('next'));
  });
  document.querySelectorAll('.previous-button').forEach(link => {
    link.addEventListener('click', () => navigate('prev'));
  });

  window.goToSection = function(sectionIndex) {
    console.log(sectionIndex);

    updateNavigation(sectionIndex);

    // Update the pagination labels too
    currentSectionIndex = sectionIndex;
    updateButtons();
  }

  updateNavigation(currentSectionIndex);
  updateButtons();

  // Progress bar formatting (Initial)

  //Set current step to active or inactive
  progressSteps[0].classList.add('active');

});


// Function to populate the results with data
function populateResults(data) {

  // Populate Section 1: Essay Basic Review
  const markupEssay = document.getElementById("markup-essay");
  const aiAssess = document.getElementById("ai-assess");
  const thumbnailImage = document.getElementById('thumbnail-image');

  if (thumbnailImage) {
      const storedImage = localStorage.getItem('uploadedImage');
      if (storedImage) {
        thumbnailImage.src = storedImage;
      } else {
        console.error('No uploaded image found in localStorage');
        // You might want to set a default image here
      }
    }

  if (markupEssay && data.essayReview) {
    // split feedback in to separate <p></p> and append to <div>, allows for more visible paragraph breaks
    const paragraphs = data.essayReview.split('\n');
    paragraphs.forEach(paragraph => {
      const p = document.createElement('p');
      p.innerHTML = paragraph;
      markupEssay.appendChild(p);
    });
  }

  if (aiAssess && data.aiAssessment) {
    aiAssess.innerHTML = data.aiAssessment;
  }

  // Populate Section 2: Grammar Mistakes Explained
  const grammarList = document.getElementById("grammar-list");
  if (grammarList && data.grammarReview) {
    // Clear existing items
    grammarList.innerHTML = '';

    data.grammarReview.forEach((item) => {
      const listItem = document.createElement("li");
      listItem.className = "grammar-item";
      listItem.innerHTML = `
        <p><strong><span class="grammar_o">“${item.original}”</span></strong></p>
        <p><span class="grammar_explain">${item.explanation}</span></p>
      `;
      grammarList.appendChild(listItem);
    });
  }

  // Populate Section 3: Advanced Writing Tips
  const tipList = document.getElementById("tip-list");
  if (tipList && data.writingTipsReview) {
    // Clear existing items
    tipList.innerHTML = '';

    data.writingTipsReview.forEach((item) => {
      const listItem = document.createElement("li");
      listItem.className = "tip-item";
      if (item.revised == null) {
        listItem.innerHTML = `
        <p class="tip-original">“${item.original}”</p>
        <p><i>Tip: <span class="tip-feedback">${item.tip}</span></i> &nbsp;👍</p>
        `;
      } else {
        listItem.innerHTML = `
        <p class="tip-original">“${item.original}”</p>
        <p><i>Tip: <span class="tip-feedback">${item.tip}</span></i></p>
        <p class="tip-revised"><i>Revised: </i>${item.revised}</p>
        `;
      }
      tipList.appendChild(listItem);
    });
  }
}


// Add this to your existing DOMContentLoaded event listener or create a new one
document.addEventListener("DOMContentLoaded", function() {
  const seeEssayBtn = document.getElementById("seeEssayBtn");
  const essayPopup = document.getElementById("essayPopup");
  const essayPopupContent = document.querySelector(".essay-popup-content");
  const closePopup = document.querySelector(".essay-popup-close");

  if (seeEssayBtn) {
    seeEssayBtn.addEventListener("click", function() {
      essayPopup.style.display = "block";
      setTimeout(() => {
        essayPopup.style.opacity = "1";
        essayPopupContent.style.transform = "translateY(0)";
        essayPopupContent.style.opacity = "1";
      }, 50);
    });
  }

  function closePopupWithAnimation() {
    essayPopupContent.style.transform = "translateY(50px)";
    essayPopupContent.style.opacity = "0";
    essayPopup.style.opacity = "0";
    setTimeout(() => {
      essayPopup.style.display = "none";
    }, 300);
  }

  if (closePopup) {
    closePopup.addEventListener("click", closePopupWithAnimation);
  }

  window.addEventListener("click", function(event) {
    if (event.target === essayPopup) {
      closePopupWithAnimation();
    }
  });
});


// Add this function to results.js
async function fetchRevisedEssay() {
  try {
    // Update popup text to show loading state with animation
    const popupTextElement = document.querySelector('.essay-popup-text');
    popupTextElement.innerHTML = `
      <div class="loading-container">
        <div class="spinner"></div>
        <div class="loading-text">Leveling up writing!</div>
      </div>
    `;

    // Get the writing tips data from localStorage
    const data = JSON.parse(localStorage.getItem('writingFeedback'));
    const writingTips = data.writingTipsReview;

    // Make the API call to get the revised essay
    const response = await fetch('/api/get-revised-essay', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ writingTips })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    // First, remove the loading container
    const loadingContainer = document.querySelector('.loading-container');
    if (loadingContainer) {
      loadingContainer.remove();
    }

    const responseData = await response.json(); // Renamed from 'data' to 'responseData'

    // Update the popup with the revised essay
    // split feedback in to separate <p></p> and append to <div>, allows for more visible paragraph breaks
    const paragraphs = responseData.revisedEssay.split('\n');
    paragraphs.forEach(paragraph => {
      const p = document.createElement('p');
      p.innerHTML = paragraph;
      popupTextElement.appendChild(p);
    });


  } catch (error) {
    console.error('Error fetching revised essay:', error);
    const popupTextElement = document.querySelector('.essay-popup-text');
    popupTextElement.innerHTML = `<p>Error fetching revised essay: ${error.message}</p>`;
  }
}



// Update the event listener for the "View as single revision" button
document.addEventListener("DOMContentLoaded", function() {
  const seeEssayBtn = document.getElementById("seeEssayBtn");
  const essayPopup = document.getElementById("essayPopup");
  const essayPopupContent = document.querySelector(".essay-popup-content");
  const closePopup = document.querySelector(".essay-popup-close");

  if (seeEssayBtn) {
    seeEssayBtn.addEventListener("click", function() {
      // Show the popup
      essayPopup.style.display = "block";
      setTimeout(() => {
        essayPopup.style.opacity = "1";
        essayPopupContent.style.transform = "translateY(0)";
        essayPopupContent.style.opacity = "1";
      }, 50);

      // Fetch the joke
      // fetchJoke();
      fetchRevisedEssay();
    });
  }

  function closePopupWithAnimation() {
    essayPopupContent.style.transform = "translateY(50px)";
    essayPopupContent.style.opacity = "0";
    essayPopup.style.opacity = "0";
    setTimeout(() => {
      essayPopup.style.display = "none";
    }, 300);
  }

  if (closePopup) {
    closePopup.addEventListener("click", closePopupWithAnimation);
  }

  window.addEventListener("click", function(event) {
    if (event.target === essayPopup) {
      closePopupWithAnimation();
    }
  });
});
