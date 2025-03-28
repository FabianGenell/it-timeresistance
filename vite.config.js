import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    build: {
        chunkSizeWarningLimit: 3000,
        outDir: 'assets',
        emptyOutDir: false,
        minify: true,
        sourcemap: true,
        rollupOptions: {
            input: {
                main: './src/entrypoints/theme.js',
                style: './src/entrypoints/theme.css'
            },
            output: {
                entryFileNames: '[name].bundle.js',
                assetFileNames: '[name].bundle.css',
                chunkFileNames: '[name].js',
                manualChunks: undefined, // Disable code splitting
                inlineDynamicImports: false // Disable code splitting
            }
        }
    },
    resolve: {
        alias: {
            '~': resolve(__dirname, 'src/')
        }
    },
    server: {
        watch: {
            exclude: ['assets/*']
        }
    }
});
