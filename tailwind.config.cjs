/** @type {import('tailwindcss').Config} */
module.exports = {
    mode: "jit",
    content: ["./**/*.liquid", "./src/**/*.{js,ts,jsx,tsx}", "./templates/**/*.{liquid,json}"],
    safelist: ["grid-cols-3", "grid-cols-2"],
    theme: {
        extend: {
            colors: {
                text: "var(--color-text)",
                textLink: "var(--color-text-link)",
                textError: "var(--color-text-error)",
                textSuccess: "var(--color-text-success)",
                background: "var(--color-background)",
                border: "var(--color-border)",
                textButton: "var(--color-text-button)",
                backgroundButton: "var(--color-background-button)",
                backgroundButtonHover: "var(--color-background-button-hover)"
            },
            fontFamily: {
                logo: "var(--font-logo)",
                heading: "var(--font-heading)",
                body: "var(--font-body)"
            }
        }
    },
    plugins: [],
    blocklist: ["container"]
};
