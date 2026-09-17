// ============================================================
// CHARACTER LOADER
// ============================================================
// Loads character metadata JSON files from src/dialogue/characters/.
// Characters are separate from dialogue — dialogue references
// speakers by ID string, not by file path or filename.
// ============================================================

/**
 * Loads a single character metadata file.
 * @param {string} characterId - The character ID (e.g., "patches").
 * @param {string} [basePath="dialogue/characters"] - Base directory for character files (relative to HTML root).
 * @returns {Promise<object>} Character metadata object.
 */
export async function loadCharacter(characterId, basePath = 'dialogue/characters') {
    const response = await fetch(`${basePath}/${characterId}.json`);
    if (!response.ok) {
        throw new Error(`[CharacterLoader] Failed to load character "${characterId}" from ${basePath}/${characterId}.json`);
    }
    const data = await response.json();
    return data;
}

/**
 * Loads multiple character metadata files.
 * @param {string[]} characterIds - Array of character IDs to load.
 * @param {string} [basePath="dialogue/characters"] - Base directory for character files (relative to HTML root).
 * @returns {Promise<object>} Map of character ID to metadata object.
 */
export async function loadCharacters(characterIds, basePath = 'dialogue/characters') {
    const results = {};
    const loadPromises = characterIds.map(async (id) => {
        results[id] = await loadCharacter(id, basePath);
    });
    await Promise.all(loadPromises);
    return results;
}

/**
 * Lists all available character files in the characters directory.
 * @param {string} [basePath="dialogue/characters"] - Base directory for character files (relative to HTML root).
 * @returns {Promise<string[]>} Array of character IDs (filenames without .json).
 */
export async function listCharacters(basePath = 'dialogue/characters') {
    const response = await fetch(`${basePath}/`);
    if (!response.ok) {
        return [];
    }
    const text = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, 'text/html');
    const links = doc.querySelectorAll('a');
    const ids = [];
    links.forEach((link) => {
        const href = link.getAttribute('href');
        if (href && href.endsWith('.json')) {
            ids.push(href.replace('.json', ''));
        }
    });
    return ids;
}

export default { loadCharacter, loadCharacters, listCharacters };
