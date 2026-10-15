import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

export default defineConfig({
  site: process.env.SITE_URL || undefined,
  base: process.env.SITE_BASE || '/',
  output: 'static',
  trailingSlash: 'always',
  integrations: [react()],
  i18n: { defaultLocale: 'ko', locales: ['ko', 'en'], routing: { prefixDefaultLocale: true } },
});
