/* 
import '../scripts/utils/theme-functions.js';
import '../scripts/utils/css-helpers.js';
*/

// Initialize theme object
window.theme = window.theme || {};

import '../scripts/components/';
import '../scripts/utils/helpers';
import '../scripts/utils/localization-manager.js';
import '../scripts/legacy/theme-new.js';
import '../scripts/utils/hotfixes/jdgm-form.js';

console.log('main.bundle.js loaded');

// Dispatch event when theme bundle is loaded
document.dispatchEvent(new CustomEvent('theme:loaded'));
window.theme.loaded = true;
