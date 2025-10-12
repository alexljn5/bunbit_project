// textureloaderworker.js - runs in a worker to fetch and decode images as ImageBitmap
self.onmessage = async function (e) {
    const data = e.data;
    if (!data || data.type !== 'load' || !Array.isArray(data.textures)) return;

    for (const item of data.textures) {
        const key = item.key;
        const url = item.url;
        const frameIndex = item.frameIndex;
        try {
            const resp = await fetch(url, { mode: 'cors' });
            const blob = await resp.blob();
            let bitmap = null;
            try {
                bitmap = await createImageBitmap(blob, { premultiplyAlpha: 'none' });
            } catch (err) {
                // fallback to default createImageBitmap if the option is unsupported
                try {
                    bitmap = await createImageBitmap(blob);
                } catch (err2) {
                    self.postMessage({ type: 'error', key, message: 'createImageBitmap failed: ' + (err2 && err2.message) });
                    continue;
                }
            }

            // Try to detect transparency using OffscreenCanvas if available
            let hasTransparency = null;
            let sampledColumnBuffer = null;
            try {
                if (typeof OffscreenCanvas !== 'undefined') {
                    const oc = new OffscreenCanvas(bitmap.width, bitmap.height);
                    const ctx = oc.getContext('2d');
                    ctx.drawImage(bitmap, 0, 0);
                    try {
                        const img = ctx.getImageData(0, 0, bitmap.width, bitmap.height);
                        const pixels = img.data;
                        for (let i = 3; i < pixels.length; i += 4) {
                            if (pixels[i] < 255) { hasTransparency = true; break; }
                        }
                        if (hasTransparency !== true) hasTransparency = false;

                        // Extract center column (1px wide) as sampled column buffer
                        try {
                            const sx = Math.floor(bitmap.width / 2);
                            const col = ctx.getImageData(sx, 0, 1, bitmap.height).data; // Uint8ClampedArray
                            // copy into a transferable ArrayBuffer
                            sampledColumnBuffer = new Uint8ClampedArray(col.length);
                            sampledColumnBuffer.set(col);
                        } catch (errCol) {
                            sampledColumnBuffer = null;
                        }
                    } catch (errImg) {
                        // getImageData may not be supported in some worker contexts; leave as null
                        hasTransparency = null;
                    }
                }
            } catch (err) {
                hasTransparency = null;
                sampledColumnBuffer = null;
            }

            // Post back the decoded ImageBitmap and metadata; transfer the bitmap
            const transferList = [bitmap];
            const payload = { type: 'loaded', key, frameIndex: frameIndex, width: bitmap.width, height: bitmap.height, hasTransparency, imageBitmap: bitmap };
            if (sampledColumnBuffer) {
                payload.sampledColumnBuffer = sampledColumnBuffer.buffer;
                transferList.push(sampledColumnBuffer.buffer);
            }
            self.postMessage(payload, transferList);
        } catch (err) {
            try { self.postMessage({ type: 'error', key, message: err && err.message ? err.message : String(err) }); } catch (e) { /* best effort */ }
        }
    }
};
