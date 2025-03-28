/**
 * Sets a 'scrollbar-width' custom property on the root element.
 */
function setScrollbarWidth() {
    document.documentElement.style.setProperty(
        '--scrollbar-width',
        `${window.innerWidth - document.documentElement.clientWidth}px`
    );
}

function setViewportHeight() {
    document.documentElement.style.setProperty('--viewport-height', `${window.innerHeight}px`);
}

function setCSSVariables() {
    setScrollbarWidth();
    setViewportHeight();
}

window.addEventListener('resize', setCSSVariables);
document.addEventListener('DOMContentLoaded', setCSSVariables);
