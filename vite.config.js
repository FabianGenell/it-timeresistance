import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    build: {
        chunkSizeWarningLimit: 3000,
        outDir: 'assets',
        emptyOutDir: false,
        minify: 'terser',
        terserOptions: {
            mangle: false, // Disable all mangling to prevent conflicts
            compress: {
                keep_fnames: true,
                keep_classnames: true
            }
        },
        sourcemap: true,
        rollupOptions: {
            input: {
                main: './src/entrypoints/theme.js',
                style: './src/entrypoints/theme.css'
            },
            output: {
                entryFileNames: '[name].bundle.js',
                assetFileNames: '[name].bundle.css',
                chunkFileNames: '[name]-chunk.js',
                manualChunks: () => undefined // Force everything into entry chunks
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
