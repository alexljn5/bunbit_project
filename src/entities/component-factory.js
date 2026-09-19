// Component Factory
// Generic utilities for creating image component descriptors and instances.
// The build-time discovery flow is handled by scripts/discover-entities.mjs,
// which scans src/img/entities/<entity>/ directly.
//
// These helpers are kept for future entity tooling and runtime component
// creation. No special-case logic for specific filenames or entity names.
//
// Usage:
//   createComponentDescriptor(file) — Browser, creates descriptor from filename
//   createImageComponent(desc)      — Creates editable component state
//   createImageComponents(descs)    — Creates multiple component instances

const SUPPORTED_EXTENSIONS = new Set([
    '.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.svg',
]);

/**
 * Check if a filename has a supported image extension.
 */
export function isImageFile(filename) {
    const ext = filename.toLowerCase().match(/\.[^.]+$/)?.[0] || '';
    return SUPPORTED_EXTENSIONS.has(ext);
}

/**
 * Create a generic component descriptor from an image asset filename.
 * No special cases — operates on asset type, not semantic meaning.
 */
export function createComponentDescriptor(filename, entityDirectory = '') {
    const ext = filename.toLowerCase().match(/\.[^.]+$/)?.[0] || '';
    const name = ext ? filename.slice(0, -ext.length) : filename;

    return {
        id: name,
        label: name,
        assetPath: entityDirectory ? `${entityDirectory}/assets/${filename}` : `assets/${filename}`,
        filename,
        extension: ext,
        defaultWidth: 0,
        defaultHeight: 0,
        defaultOffsetX: 0,
        defaultOffsetY: 0,
        defaultScale: 1.0,
        defaultLayer: 0,
        placeholderColor: '#2a2a3a',
        placeholderBorderColor: '#5a5a7a',
    };
}

/**
 * Node.js: Discover image components in an entity directory.
 * Scans the assets/ subdirectory for supported image files.
 * Returns sorted array of component descriptors.
 * Used by scripts/discover-entities.mjs at build time.
 */
export async function discoverComponents(directoryPath, assetsSubdir = 'assets') {
    const fs = await import('fs');
    const path = await import('path');

    const assetDir = path.join(directoryPath, assetsSubdir);
    const components = [];

    if (!fs.existsSync(assetDir)) return components;

    const files = fs.readdirSync(assetDir).sort();
    for (const file of files) {
        if (isImageFile(file)) {
            const descriptor = createComponentDescriptor(file, directoryPath);
            components.push(descriptor);
        }
    }

    return components;
}

/**
 * Create a generic ImageComponent instance from a descriptor.
 * Returns a component object with state for editor manipulation.
 */
export function createImageComponent(descriptor, overrides = {}) {
    return {
        id: descriptor.id,
        label: descriptor.label,
        assetPath: descriptor.assetPath,
        filename: descriptor.filename,
        extension: descriptor.extension,
        offsetX: overrides.offsetX ?? descriptor.defaultOffsetX,
        offsetY: overrides.offsetY ?? descriptor.defaultOffsetY,
        scaleX: overrides.scaleX ?? descriptor.defaultScale,
        scaleY: overrides.scaleY ?? descriptor.defaultScale,
        rotation: overrides.rotation ?? 0,
        visible: overrides.visible ?? true,
        layerOrder: overrides.layerOrder ?? 0,
        opacity: overrides.opacity ?? 1,
        image: null,
        loaded: false,
        naturalWidth: 0,
        naturalHeight: 0,
    };
}

/**
 * Create multiple ImageComponents from descriptors.
 */
export function createImageComponents(descriptors, overrides = {}) {
    return descriptors.map(desc => createImageComponent(desc, overrides));
}
