// Entity Registry
// Central registry of all game entities and their sprite components.
// The editor/debug tools read from this registry to enumerate
// available entities and their constituent sprites.
//
// Following STANDARDISATION.md: this is the single source of truth
// for entity metadata. New entities must register themselves here
// via src/entities/entity-manifest.js.

import { ENTITY_MANIFEST } from './entity-manifest.js';

const entityRegistry = new Map();

for (const descriptor of ENTITY_MANIFEST) {
    entityRegistry.set(descriptor.id, descriptor);
}

// Expose globally so future entity modules can self-register
if (typeof window !== 'undefined') {
    window.__entityRegistry = entityRegistry;
    window.registerEntity = (descriptor) => {
        if (!descriptor || !descriptor.id) {
            console.warn('[EntityRegistry] registerEntity called without a valid id');
            return;
        }
        entityRegistry.set(descriptor.id, descriptor);
        console.log(`[EntityRegistry] Registered entity: ${descriptor.id}`);
    };
}

// ─── Public API ───────────────────────────────────────

/**
 * Get a registered entity descriptor by id.
 * @param {string} id
 * @returns {object|undefined}
 */
export function getEntityDescriptor(id) {
    return entityRegistry.get(id);
}

/**
 * Get all registered entity descriptors.
 * @returns {object[]}
 */
export function getAllEntityDescriptors() {
    return Array.from(entityRegistry.values());
}

/**
 * Get the list of entity ids.
 * @returns {string[]}
 */
export function getEntityIds() {
    return Array.from(entityRegistry.keys());
}

/**
 * Get the sprite components for a given entity.
 * @param {string} entityId
 * @returns {object[]}
 */
export function getSpriteComponentsForEntity(entityId) {
    const descriptor = entityRegistry.get(entityId);
    return descriptor ? descriptor.spriteComponents : [];
}

/**
 * Get the default config for a given entity.
 * @param {string} entityId
 * @returns {object}
 */
export function getDefaultConfigForEntity(entityId) {
    const descriptor = entityRegistry.get(entityId);
    return descriptor ? { ...descriptor.defaultConfig } : {};
}

/**
 * Get the entity class constructor for a given entity id.
 * @param {string} entityId
 * @returns {Promise<object>} Module with the entity class
 */
export async function getEntityClass(entityId) {
    const descriptor = entityRegistry.get(entityId);
    if (!descriptor) {
        throw new Error(`[EntityRegistry] Unknown entity: ${entityId}`);
    }
    return import(descriptor.classPath);
}

/**
 * Get the entity config module for a given entity id.
 * @param {string} entityId
 * @returns {Promise<object>} Config module
 */
export async function getEntityConfig(entityId) {
    const descriptor = entityRegistry.get(entityId);
    if (!descriptor) {
        throw new Error(`[EntityRegistry] Unknown entity: ${entityId}`);
    }
    return import(descriptor.configPath);
}

// Re-export manifest for convenience
export { ENTITY_MANIFEST };
