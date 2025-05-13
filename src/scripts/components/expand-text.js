/**
 * ExpandText Component
 * 
 * A custom element that collapses text to a specified number of lines and adds a "See more" button
 * to expand the full text when clicked.
 * 
 * Usage:
 * <expand-text data-lines="3">
 *   <p>Your content here...</p>
 * </expand-text>
 * 
 * Attributes:
 * - data-lines: Number of lines to show before collapsing (default: 3)
 * 
 * Features:
 * - Automatically hides the "See more" button if content is shorter than the specified lines
 * - Toggles between expanded and collapsed states
 * - Uses Tailwind classes for styling
 */
class ExpandText extends HTMLElement {
  constructor() {
    super();
    this.expanded = false;
  }

  connectedCallback() {
    this.lines = parseInt(this.dataset.lines || 3, 10);
    this.init();
  }

  init() {
    // Create container for the text with line clamp
    this.contentContainer = document.createElement('div');
    this.contentContainer.classList.add(
      'overflow-hidden',
      'transition-all',
      'duration-300',
      'relative'
    );

    // Create ellipsis element to show when text is truncated
    this.ellipsis = document.createElement('span');
    this.ellipsis.textContent = '...';
    this.ellipsis.classList.add(
      'inline-block',
      'ml-1',
      'align-bottom',
      'hidden'
    );

    // Move all content to the container
    while (this.firstChild) {
      this.contentContainer.appendChild(this.firstChild);
    }
    
    this.contentContainer.appendChild(this.ellipsis);
    this.appendChild(this.contentContainer);

    // Create "See more" button
    this.button = document.createElement('button');
    this.button.type = 'button';
    this.button.classList.add(
      'mt-2',
      'text-sm',
      'font-medium',
      'underline',
      'focus:outline-none',
      'transition-opacity',
      'duration-300'
    );
    this.button.textContent = 'See more';
    this.button.addEventListener('click', this.toggleExpand.bind(this));
    this.appendChild(this.button);

    // Check if content needs expansion
    this.checkContentHeight();
  }

  checkContentHeight() {
    // Get line height to calculate total height
    const style = window.getComputedStyle(this.contentContainer);
    const lineHeight = parseInt(style.lineHeight, 10) || 
                       parseInt(style.fontSize, 10) * 1.5;
    
    // Calculate max height based on number of lines
    const maxHeight = this.lines * lineHeight;
    
    // Get the scrollHeight of the content
    const contentHeight = this.contentContainer.scrollHeight - this.ellipsis.offsetHeight; // Adjust for ellipsis
    
    if (contentHeight <= maxHeight) {
      // Content is shorter than max lines, no need for expand functionality
      this.button.classList.add('hidden');
      this.ellipsis.classList.add('hidden');
      return;
    }
    
    // Apply line clamp
    this.contentContainer.style.maxHeight = `${maxHeight}px`;
    this.contentContainer.classList.add('line-clamp-' + this.lines);
    
    // Show the button and ellipsis
    this.button.classList.remove('hidden');
    this.ellipsis.classList.remove('hidden');
    
    // Store original height for expansion
    this.fullHeight = contentHeight;
  }

  toggleExpand() {
    this.expanded = !this.expanded;
    
    if (this.expanded) {
      // Expand the content
      this.contentContainer.style.maxHeight = `${this.fullHeight}px`;
      this.contentContainer.classList.remove('line-clamp-' + this.lines);
      this.button.textContent = 'See less';
      this.ellipsis.classList.add('hidden'); // Hide ellipsis when expanded
    } else {
      // Collapse the content
      const style = window.getComputedStyle(this.contentContainer);
      const lineHeight = parseInt(style.lineHeight, 10) || 
                         parseInt(style.fontSize, 10) * 1.5;
      const maxHeight = this.lines * lineHeight;
      
      this.contentContainer.style.maxHeight = `${maxHeight}px`;
      this.contentContainer.classList.add('line-clamp-' + this.lines);
      this.button.textContent = 'See more';
      this.ellipsis.classList.remove('hidden'); // Show ellipsis when collapsed
    }
  }
}

customElements.define('expand-text', ExpandText);