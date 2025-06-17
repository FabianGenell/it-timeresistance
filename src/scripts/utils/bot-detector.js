// simplified-bot-detector.js
// Passive bot detection - just tags cart, doesn't block

// Simple configuration - easy to modify
const CONFIG = {
    // Basic settings
    DEBUG: false,
    MIN_TIME_ATC_MS: 1500,

    REQUIRE_MOUSE_MOVEMENT: true,
    REQUIRE_VARIANT_CHANGE: false,
    REQUIRE_ADD_BUTTON_CLICK: false,
    REQUIRE_CHECKOUT_CLICK: false,
    CHECK_WEBDRIVER: true,
    HONEYPOT_FIELD_NAME: 'website',

    CART_ATTR_RESULT: 'is-human',
    CART_ATTR_TIMESTAMP: 'bot-check-timestamp',
    CART_ATTR_DETAILS: 'bot-check-details'
};

class BotDetector {
    constructor(customConfig = {}) {
        // Merge custom config with defaults
        this.config = { ...CONFIG, ...customConfig };

        this.isHuman = false;
        this.startTime = Date.now();
        this.hasMouseMoved = false;
        this.honeypotTriggered = false;
        this.variantChanged = false;
        this.addButtonClicked = false;
        this.checkoutButtonClicked = false;

        this.log('🤖 Bot detector initialized', this.config);
        this.init();
    }

    log(message, data = null) {
        if (!this.config.DEBUG) return;

        const timestamp = new Date().toLocaleTimeString();
        console.log(`[${timestamp}] ${message}`, data || '');
    }

    // Create honeypot field for bot detection
    createHoneypot() {
        const forms = document.querySelectorAll('form[action*="/cart/add"]');

        forms.forEach((form) => {
            // Skip if honeypot already exists
            if (form.querySelector('.bot-trap')) return;

            const trap = document.createElement('div');
            trap.className = 'bot-trap';
            trap.style.cssText = 'position:absolute;left:-9999px;opacity:0;pointer-events:none;';
            trap.innerHTML = `<input type="text" name="${this.config.HONEYPOT_FIELD_NAME}" tabindex="-1" autocomplete="off">`;

            form.appendChild(trap);

            // Monitor honeypot
            trap.querySelector('input').addEventListener('input', () => {
                this.honeypotTriggered = true;
                this.log('🍯 Honeypot triggered - likely bot');
            });
        });

        this.log(`🍯 Honeypot added to ${forms.length} forms`);
    }

    // Track basic human interactions
    trackInteractions() {
        // Mouse movement detection (only if required)
        if (this.config.REQUIRE_MOUSE_MOVEMENT) {
            document.addEventListener(
                'mousemove',
                () => {
                    if (!this.hasMouseMoved) {
                        this.hasMouseMoved = true;
                        this.log('🖱️ Mouse movement detected');
                    }
                },
                { once: true, passive: true }
            );
        } else {
            this.hasMouseMoved = true; // Skip check if not required
        }

        // Variant change detection
        if (this.config.REQUIRE_VARIANT_CHANGE) {
            document.addEventListener('product:variant-change', () => {
                if (!this.variantChanged) {
                    this.variantChanged = true;
                    this.log('🔄 Variant change detected');
                }
            });
        } else {
            this.variantChanged = true; // Skip check if not required
        }

        // Button click monitoring
        document.addEventListener('click', (e) => {
            // Check for add to cart button
            const isAddToCart = e.target.closest('[data-add-to-cart], button[name="add"], input[name="add"]');
            if (isAddToCart) {
                // Track specific add button click if required
                if (e.target.matches('button[name="add"]') || e.target.closest('button[name="add"]')) {
                    this.addButtonClicked = true;
                    this.log('🛒 Add button clicked');
                }
                this.handleAddToCart(e);
            }

            // Check for checkout button
            const isCheckoutButton =
                e.target.matches('button[name="checkout"]') || e.target.closest('button[name="checkout"]');
            if (isCheckoutButton) {
                this.checkoutButtonClicked = true;
                this.log('💳 Checkout button clicked');
            }
        });

        // Set defaults for non-required checks
        if (!this.config.REQUIRE_ADD_BUTTON_CLICK) {
            this.addButtonClicked = true;
        }
        if (!this.config.REQUIRE_CHECKOUT_CLICK) {
            this.checkoutButtonClicked = true;
        }
    }

    // Main bot detection logic - just tag, don't block
    handleAddToCart(event) {
        const timeElapsed = Date.now() - this.startTime;
        const results = this.runDetection(timeElapsed);

        this.log('🔍 Bot detection results:', results);

        // Always allow the add to cart to proceed
        // Just tag the cart with our findings
        this.updateCartAttributes(results);

        this.isHuman = results.isHuman;
        return true;
    }

    // Simple human/bot detection
    runDetection(timeElapsed) {
        const issues = [];
        let isHuman = true;

        // Check 1: Honeypot filled (strong bot signal)
        if (this.honeypotTriggered) {
            issues.push('honeypot-filled');
            isHuman = false;
        }

        // Check 2: Too fast (likely bot)
        if (timeElapsed < this.config.MIN_TIME_ATC_MS) {
            issues.push(`too-fast-${timeElapsed}ms`);
            isHuman = false;
        }

        // Check 3: No mouse movement (if required)
        if (this.config.REQUIRE_MOUSE_MOVEMENT && !this.hasMouseMoved) {
            issues.push('no-mouse-movement');
            isHuman = false;
        }

        // Check 4: No variant change (if required)
        if (this.config.REQUIRE_VARIANT_CHANGE && !this.variantChanged) {
            issues.push('no-variant-change');
            isHuman = false;
        }

        // Check 5: No add button click (if required)
        if (this.config.REQUIRE_ADD_BUTTON_CLICK && !this.addButtonClicked) {
            issues.push('no-add-button-click');
            isHuman = false;
        }

        // Check 6: No checkout button click (if required)
        if (this.config.REQUIRE_CHECKOUT_CLICK && !this.checkoutButtonClicked) {
            issues.push('no-checkout-click');
            isHuman = false;
        }

        // Check 7: WebDriver detection (if enabled)
        if (this.config.CHECK_WEBDRIVER && navigator.webdriver) {
            issues.push('webdriver-detected');
            isHuman = false;
        }

        return {
            isHuman,
            issues,
            timeElapsed,
            hasMouseMoved: this.hasMouseMoved,
            variantChanged: this.variantChanged,
            addButtonClicked: this.addButtonClicked,
            checkoutButtonClicked: this.checkoutButtonClicked,
            honeypotTriggered: this.honeypotTriggered
        };
    }

    // Update Shopify cart with detection results
    async updateCartAttributes(results) {
        try {
            const attributes = {};
            attributes[this.config.CART_ATTR_RESULT] = results.isHuman ? 'true' : 'false';
            attributes[this.config.CART_ATTR_TIMESTAMP] = new Date().toISOString();
            attributes[this.config.CART_ATTR_DETAILS] = JSON.stringify({
                timeElapsed: results.timeElapsed,
                issues: results.issues,
                hasMouseMoved: results.hasMouseMoved,
                variantChanged: results.variantChanged,
                addButtonClicked: results.addButtonClicked,
                checkoutButtonClicked: results.checkoutButtonClicked
            });

            await fetch('/cart/update.js', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ attributes })
            });

            this.log(`🛒 Cart tagged: ${results.isHuman ? 'human' : 'bot'}`, {
                isHuman: results.isHuman,
                issues: results.issues,
                interactions: {
                    mouse: results.hasMouseMoved,
                    variant: results.variantChanged,
                    addBtn: results.addButtonClicked,
                    checkoutBtn: results.checkoutButtonClicked
                }
            });
        } catch (error) {
            this.log('❌ Failed to update cart:', error.message);
        }
    }

    // Initialize everything
    init() {
        // Wait for DOM if needed
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.createHoneypot();
                this.trackInteractions();
            });
        } else {
            this.createHoneypot();
            this.trackInteractions();
        }
    }
}

// Auto-initialize with default config (can be disabled by setting window.disableBotDetector = true)
if (typeof window !== 'undefined' && !window.disableBotDetector) {
    window.botDetector = new BotDetector();
}

// Example of custom configuration:
// window.botDetector = new BotDetector({
//   DEBUG: false,                      // Disable logging in production
//   MIN_TIME_ATC_MS: 2000,                // Require 2 seconds minimum
//   REQUIRE_MOUSE_MOVEMENT: false,    // Don't require mouse movement
//   REQUIRE_VARIANT_CHANGE: true,     // Require product variant selection
//   REQUIRE_ADD_BUTTON_CLICK: true,   // Require specific add button click
//   REQUIRE_CHECKOUT_CLICK: true,     // Require checkout button click
//   CHECK_WEBDRIVER: false,           // Skip WebDriver detection
//   CART_ATTR_RESULT: 'human-check'   // Custom cart attribute name
// });

// Cart attributes that will be set:
// - is-human: 'true' or 'false'
// - bot-check-timestamp: ISO timestamp
// - bot-check-details: JSON with detection details including:
//   * timeElapsed, issues, hasMouseMoved, variantChanged,
//   * addButtonClicked, checkoutButtonClicked
