import { defineConfig } from 'astro/config';

export default defineConfig({
  output: 'static',
  site: process.env.SITE_URL || 'https://bibi-is-typing.github.io',
  base: process.env.SITE_BASE_PATH || '/',
  trailingSlash: 'always',
  devToolbar: { enabled: false },
});
