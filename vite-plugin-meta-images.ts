import type { Plugin } from 'vite';
import fs from 'fs';
import path from 'path';

/**
 * Vite plugin that updates og:image and twitter:image meta tags
 * to point to the app's opengraph image with the correct domain.
 *
 * Set APP_DOMAIN in .env for production (e.g. "vaclaimnavigator.com").
 * In dev, meta tags use relative paths (no domain prefix needed).
 */
export function metaImagesPlugin(): Plugin {
  return {
    name: 'vite-plugin-meta-images',
    transformIndexHtml(html) {
      const baseUrl = getDeploymentUrl();
      if (!baseUrl) {
        // In dev, relative /attached_assets/opengraph.png works fine
        return html;
      }

      // Check if opengraph image exists in attached_assets
      const assetsDir = path.resolve(process.cwd(), 'attached_assets');
      const opengraphPngPath = path.join(assetsDir, 'opengraph.png');
      const opengraphJpgPath = path.join(assetsDir, 'opengraph.jpg');
      const opengraphJpegPath = path.join(assetsDir, 'opengraph.jpeg');

      let imageExt: string | null = null;
      if (fs.existsSync(opengraphPngPath)) {
        imageExt = 'png';
      } else if (fs.existsSync(opengraphJpgPath)) {
        imageExt = 'jpg';
      } else if (fs.existsSync(opengraphJpegPath)) {
        imageExt = 'jpeg';
      }

      if (!imageExt) {
        return html;
      }

      const imageUrl = `${baseUrl}/attached_assets/opengraph.${imageExt}`;

      html = html.replace(
        /<meta\s+property="og:image"\s+content="[^"]*"\s*\/>/g,
        `<meta property="og:image" content="${imageUrl}" />`
      );

      html = html.replace(
        /<meta\s+name="twitter:image"\s+content="[^"]*"\s*\/>/g,
        `<meta name="twitter:image" content="${imageUrl}" />`
      );

      return html;
    },
  };
}

function getDeploymentUrl(): string | null {
  // Use APP_DOMAIN from .env (e.g. "https://vaclaimnavigator.com")
  if (process.env.APP_DOMAIN) {
    const domain = process.env.APP_DOMAIN.replace(/\/+$/, '');
    return domain.startsWith('http') ? domain : `https://${domain}`;
  }
  return null;
}
