/* 
import '../scripts/utils/theme-functions.js';
import '../scripts/utils/css-helpers.js';
*/

window.theme = window.theme || {};

import '../scripts/components/';
import '../scripts/utils/lazy-images.js';
import '../scripts/utils/theme-helpers.js';
import '../scripts/utils/lightbox-custom.js';

console.log('main.bundle.js loaded');

// Dispatch event when theme bundle is loaded
document.dispatchEvent(new CustomEvent('theme:loaded'));
