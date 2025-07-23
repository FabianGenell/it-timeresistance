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
        this.chars = parseInt(this.dataset.chars, 10) || null;
        this.lines = parseInt(this.dataset.lines || 3, 10);
        this.init();
    }

    init() {
        this.originalContent = this.innerHTML;

        this.wrapper = document.createElement('div');
        this.wrapper.classList.add('expand-text-wrapper');

        this.contentEl = document.createElement('div');
        this.contentEl.classList.add('expand-text-content');

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
        this.button.textContent = window.theme?.strings?.expand_text?.see_more || 'See more';
        this.button.addEventListener('click', () => this.toggleExpand());

        let maxChars;

        if (this.chars !== null) {
            maxChars = this.chars;
        } else {
            const measureEl = document.createElement('div');
            measureEl.style.position = 'absolute';
            measureEl.style.visibility = 'hidden';
            measureEl.style.width = 'auto';
            measureEl.style.height = 'auto';
            measureEl.innerHTML = this.originalContent;
            document.body.appendChild(measureEl);

            const parentWidth = this.parentElement ? this.parentElement.offsetWidth : 500;
            measureEl.style.width = `${parentWidth}px`;

            const sampleText = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz 0123456789';
            const sampleEl = document.createElement('div');
            sampleEl.textContent = sampleText;
            sampleEl.style.whiteSpace = 'nowrap';
            measureEl.appendChild(sampleEl);

            const charsPerSample = sampleText.length;
            const sampleWidth = sampleEl.offsetWidth;
            const charsPerLine = Math.floor((parentWidth / sampleWidth) * charsPerSample);

            maxChars = charsPerLine * this.lines;

            document.body.removeChild(measureEl);
        }

        this.setupContent(maxChars);

        this.innerHTML = '';
        this.wrapper.appendChild(this.contentEl);
        this.appendChild(this.wrapper);
        this.appendChild(this.button);
    }

    setupContent(maxChars) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = this.originalContent;
        const textContent = tempDiv.textContent || tempDiv.innerText || '';

        const needsTruncation = textContent.length > maxChars;

        if (needsTruncation) {
            this.fullContent = this.originalContent;

            let truncatePosition = maxChars;
            while (
                truncatePosition > 0 &&
                textContent.charAt(truncatePosition) !== ' ' &&
                textContent.charAt(truncatePosition) !== '.'
            ) {
                truncatePosition--;
            }

            if (truncatePosition === 0) {
                truncatePosition = maxChars;
            }

            const truncatedText = truncateText(textContent, truncatePosition);

            this.contentEl.textContent = truncatedText;

            this.button.classList.remove('hidden');
            this.truncated = true;

            this.maxChars = truncatePosition;
        } else {
            this.contentEl.innerHTML = this.originalContent;
            this.truncated = false;
        }
    }

    toggleExpand() {
        this.expanded = !this.expanded;

        if (this.expanded) {
            this.contentEl.innerHTML = this.originalContent;
            this.button.textContent = window.theme?.strings?.expand_text?.see_less || 'See less';
        } else {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = this.originalContent;
            const textContent = tempDiv.textContent || tempDiv.innerText || '';

            const truncatedText = truncateText(textContent, this.maxChars);
            this.contentEl.textContent = truncatedText;

            this.button.textContent = window.theme?.strings?.expand_text?.see_more || 'See more';
        }
    }
}

customElements.define('expand-text', ExpandText);
