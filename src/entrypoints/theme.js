/* 
import '../scripts/utils/theme-functions.js';
import '../scripts/utils/css-helpers.js';
*/

window.theme = {};

import '../scripts/components/';
import '../scripts/utils/lazy-images.js';

// Dispatch event when theme bundle is loaded
document.dispatchEvent(new CustomEvent('theme:loaded'));
