# Deployment and cache consistency

[Back to Running, hosting and saves](../operations.md).

## Deployment and cache consistency

The HTTP server serves HTML and unversioned public assets with `Cache-Control: no-cache`, `version.json` with `no-store`, and content-hashed JS/CSS bundles with `public, max-age=31536000, immutable`. Vite separates dependencies into `vendors-[hash].js`; unchanged vendor content retains its filename while changed app code gets a new one. Deploy the client HTML, version file and hashed assets together as one release, retaining older hashed assets while existing clients may request them. Keep the SQLite database across deployments. Live scenes are deliberately not persisted; restarting returns recovered players to the village.

The client build generate smaller `.br` and `.gz` companions for text assets
over 1 KiB through `vite-plugin-compression2`, retaining the original files.
Deploy these companions with their matching originals. The server negotiates
`Accept-Encoding`, honor quality weights and explicit exclusions, and prefer
Brotli on ties, then gzip. Missing companions fall back to another acceptable
representation; requests rejecting every available encoding receive 406.
Responses include `Vary: Accept-Encoding`, the original MIME/cache policy,
and the selected representation's content length; HEAD sends the same headers
without a body. `version.json` is excluded from compression to keep build checks
fresh. Compression affects downloads only, not game simulation or frame rate.
