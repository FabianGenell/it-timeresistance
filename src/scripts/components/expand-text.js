/**
 * ExpandText Component
 * 
 * A custom element that collapses text to a specified number of lines or characters
 * and adds a "See more" button to expand the full text when clicked.
 * 
 * Usage:
 * <expand-text data-lines="3">
 *   <p>Your content here...</p>
 * </expand-text>
 * 
 * OR:
 * 
 * <expand-text data-chars="158">
 *   <p>Your content here...</p>
 * </expand-text>
 * 
 * Attributes:
 * - data-lines: Number of lines to show before collapsing (default: 3)
 * - data-chars: Maximum number of characters to show before collapsing (overrides data-lines if both are provided)
 */
import { truncateText } from '../utils/utils.js';

class ExpandText extends HTMLElement {
  constructor() {
    super();
    this.expanded = false;
  }

  connectedCallback() {
    // Check whether to use character-based or line-based truncation
    this.chars = parseInt(this.dataset.chars, 10) || null;
    this.lines = parseInt(this.dataset.lines || 3, 10);
    this.init();
  }

  init() {
    // Save original content
    this.originalContent = this.innerHTML;
    
    // Create wrapper for the component
    this.wrapper = document.createElement('div');
    this.wrapper.classList.add('expand-text-wrapper');
    
    // Create content element
    this.contentEl = document.createElement('div');
    this.contentEl.classList.add('expand-text-content');
    
    // Create button element
    this.button = document.createElement('button');
    this.button.type = 'button';
    this.button.classList.add(
      'expand-text-toggle',
      'mt-2',
      'text-sm',
      'font-medium',
      'underline',
      'focus:outline-none',
      'hidden'
    );
    this.button.textContent = 'See more';
    this.button.addEventListener('click', () => this.toggleExpand());
    
    let maxChars;
    
    // If character limit is directly specified, use that
    if (this.chars !== null) {
      maxChars = this.chars;
    } else {
      // Otherwise calculate based on lines
      // Create temporary measurement element
      const measureEl = document.createElement('div');
      measureEl.style.position = 'absolute';
      measureEl.style.visibility = 'hidden';
      measureEl.style.width = 'auto';
      measureEl.style.height = 'auto';
      measureEl.innerHTML = this.originalContent;
      document.body.appendChild(measureEl);
      
      // Calculate width for determining chars per line
      const parentWidth = this.parentElement ? this.parentElement.offsetWidth : 500;
      measureEl.style.width = `${parentWidth}px`;
      
      // Measure a sample text to determine chars per line
      const sampleText = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz 0123456789';
      const sampleEl = document.createElement('div');
      sampleEl.textContent = sampleText;
      sampleEl.style.whiteSpace = 'nowrap';
      measureEl.appendChild(sampleEl);
      
      // Calculate chars per line based on width
      const charsPerSample = sampleText.length;
      const sampleWidth = sampleEl.offsetWidth;
      const charsPerLine = Math.floor((parentWidth / sampleWidth) * charsPerSample);
      
      // Calculate total allowed characters
      maxChars = charsPerLine * this.lines;
      
      // Cleanup measurement elements
      document.body.removeChild(measureEl);
    }
    
    // Initial setup - show truncated content if needed
    this.setupContent(maxChars);
    
    // Clear original content and build component
    this.innerHTML = '';
    this.wrapper.appendChild(this.contentEl);
    this.appendChild(this.wrapper);
    this.appendChild(this.button);
  }
  
  setupContent(maxChars) {
    // Get plain text content to measure length
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = this.originalContent;
    const textContent = tempDiv.textContent || tempDiv.innerText || '';
    
    // Check if truncation is needed
    const needsTruncation = textContent.length > maxChars;
    
    if (needsTruncation) {
      // Store original content for expanded state
      this.fullContent = this.originalContent;
      
      // Try to find a word boundary near the maxChars position
      let truncatePosition = maxChars;
      while (truncatePosition > 0 && 
             textContent.charAt(truncatePosition) !== ' ' && 
             textContent.charAt(truncatePosition) !== '.') {
        truncatePosition--;
      }
      
      // If we couldn't find a good break point, use the max
      if (truncatePosition === 0) {
        truncatePosition = maxChars;
      }
      
      // Use the utility function to truncate at the word boundary
      const truncatedText = truncateText(textContent, truncatePosition);
      
      // Set truncated content
      this.contentEl.textContent = truncatedText;
      
      // Show the toggle button
      this.button.classList.remove('hidden');
      this.truncated = true;
      
      // Store maxChars for toggle
      this.maxChars = truncatePosition;
    } else {
      // No truncation needed, just set the content
      this.contentEl.innerHTML = this.originalContent;
      this.truncated = false;
    }
  }
  
  toggleExpand() {
    this.expanded = !this.expanded;
    
    if (this.expanded) {
      // Show full content (with HTML)
      this.contentEl.innerHTML = this.originalContent; 
      this.button.textContent = 'See less';
    } else {
      // Show truncated content
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = this.originalContent;
      const textContent = tempDiv.textContent || tempDiv.innerText || '';
      
      // Use the utility function to truncate
      const truncatedText = truncateText(textContent, this.maxChars);
      this.contentEl.textContent = truncatedText;
      
      this.button.textContent = 'See more';
    }
  }
}

customElements.define('expand-text', ExpandText);