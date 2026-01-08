/**
 * PostCSS Configuration
 *
 * Processes modular CSS files for production optimization.
 * Pipeline:
 *   1. postcss-import - Flatten @import statements
 *   2. autoprefixer - Add vendor prefixes
 *   3. cssnano - Minify CSS (production only)
 */

import path from 'path';
import { fileURLToPath } from 'url';
import postcssImport from 'postcss-import';
import autoprefixer from 'autoprefixer';
import cssnano from 'cssnano';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProduction = process.env.NODE_ENV === 'production';

export default {
  plugins: [
    // Flatten @import statements so all CSS is in one file
    postcssImport({
      path: [path.join(__dirname, 'src/css')],
    }),

    // Add vendor prefixes for browser compatibility
    autoprefixer({
      overrideBrowserslist: [
        'last 2 versions',
        'Firefox ESR',
        '> 1%',
      ],
    }),

    // Minify CSS in production only
    ...(isProduction ? [cssnano()] : []),
  ],
};
