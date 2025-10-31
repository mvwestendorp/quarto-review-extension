/**
 * PostCSS Configuration
 *
 * Processes modular CSS files for production optimization.
 * Pipeline:
 *   1. postcss-import - Flatten @import statements
 *   2. autoprefixer - Add vendor prefixes
 *   3. cssnano - Minify CSS (production only)
 */

const isProduction = process.env.NODE_ENV === 'production';

export default {
  plugins: [
    // Flatten @import statements so all CSS is in one file
    require('postcss-import')({
      path: ['_extensions/review/assets'],
    }),

    // Add vendor prefixes for browser compatibility
    require('autoprefixer')({
      overrideBrowserslist: [
        'last 2 versions',
        'Firefox ESR',
        '> 1%',
      ],
    }),

    // Minify CSS in production only
    ...(isProduction ? [require('cssnano')] : []),
  ],
};
