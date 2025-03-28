function toggleIntroText(button) {
  var introBody = button.parentElement;
  var shortText = introBody.querySelector('.intro-short-text');
  var fullText = introBody.querySelector('.intro-full-text');
  var isOpen = fullText.style.display === "inline";

  if (isOpen) {
    shortText.style.display = "inline";
    fullText.style.display = "none";
    button.textContent = "See More";
  } else {
    shortText.style.display = "none";
    fullText.style.display = "inline";
    button.textContent = "See Less";
  }
}