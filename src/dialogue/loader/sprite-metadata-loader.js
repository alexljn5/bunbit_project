// ============================================================
// SPRITE METADATA LOADER
// ============================================================
// Parses markdown sprite sheet files and exposes:
//   - character
//   - expression
//   - sprite reference
//   - animation metadata
//
// Does NOT hardcode filenames or paths.
// The renderer requests by character + expression;
// this loader resolves the ASCII representation.
// ============================================================

/**
 * Parses a markdown sprite sheet file content into structured metadata.
 * The markdown format is:
 *   ExpressionName
 *   (line1)
 *   (line2)
 *   ...
 * Blank lines separate entries.
 *
 * @param {string} content - Raw markdown file content.
 * @returns {object} Parsed sprite metadata map keyed by expression name.
 */
export function parseSpriteSheetMarkdown(content) {
    const expressions = {};
    const lines = content.split('\n');
    let currentExpression = null;
    let currentLines = [];

    for (const rawLine of lines) {
        const line = rawLine.trim();

        // Skip empty lines
        if (line === '') {
            if (currentExpression && currentLines.length > 0) {
                expressions[currentExpression] = currentLines.join('\n');
                currentExpression = null;
                currentLines = [];
            }
            continue;
        }

        // Check if this line is an expression name (no parentheses, no backslashes)
        // Expression names are single words or two-word identifiers like "tiny grin"
        if (!line.includes('(') && !line.includes(')') && !line.includes('\\')) {
            // Save previous expression if any
            if (currentExpression && currentLines.length > 0) {
                expressions[currentExpression] = currentLines.join('\n');
            }
            currentExpression = line;
            currentLines = [];
        } else {
            // This is a sprite line (contains ASCII art)
            if (currentExpression) {
                currentLines.push(line);
            }
        }
    }

    // Save the last expression
    if (currentExpression && currentLines.length > 0) {
        expressions[currentExpression] = currentLines.join('\n');
    }

    return expressions;
}

/**
 * Loads sprite metadata from a character JSON definition and its sprite sheet file.
 * @param {object} characterDef - Character metadata object (from characters/*.json).
 * @param {Function} fetchFn - Async function to fetch file content (defaults to fetch).
 * @returns {object} Character metadata with resolved expression sprites.
 */
export async function loadCharacterSpriteMetadata(characterDef, fetchFn = null) {
    const resolvedFetch = fetchFn || (async (path) => {
        const response = await fetch(path);
        return response.text();
    });

    const spriteSheetPath = `${characterDef.spriteFolder}/${characterDef.spriteSheet}`;
    const content = await resolvedFetch(spriteSheetPath);
    const expressionSprites = parseSpriteSheetMarkdown(content);

    return {
        id: characterDef.id,
        displayName: characterDef.displayName,
        defaultExpression: characterDef.defaultExpression,
        expressions: characterDef.expressions,
        expressionSprites,
    };
}

/**
 * Loads multiple character sprite metadata files.
 * @param {object[]} characterDefs - Array of character metadata objects.
 * @param {Function} fetchFn - Optional custom fetch function.
 * @returns {object} Map of character ID to resolved metadata.
 */
export async function loadAllCharacterSpriteMetadata(characterDefs, fetchFn = null) {
    const results = {};
    for (const def of characterDefs) {
        const resolved = await loadCharacterSpriteMetadata(def, fetchFn);
        results[resolved.id] = resolved;
    }
    return results;
}

export default { parseSpriteSheetMarkdown, loadCharacterSpriteMetadata, loadAllCharacterSpriteMetadata };
