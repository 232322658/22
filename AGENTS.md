# Delivery preference

Deliver editable HTML, JavaScript and configuration source directly in this GitHub repository.
Do not substitute a GLB or other 3D asset export for the webpage source.
After scene changes run `npm run build`, and include the refreshed `convenience-store.html`
and tracked `dist/` files in the same branch's commit. Keep `src/main.js` as the source of truth.
The single HTML uses a pinned Three.js CDN and embedded font; the dist build is for static HTTP hosting.
