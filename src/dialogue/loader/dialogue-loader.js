// ============================================================
// DIALOGUE LOADER
// ============================================================
// Loads dialogue graph JSON files from src/dialogue/dialogues/.
// Uses O(1) node lookup via Map keyed by node ID.
// Does NOT scan or traverse arrays for node resolution.
// ============================================================

/**
 * Loads a dialogue graph JSON file.
 * @param {string} dialogueId - The dialogue ID (filename without .json).
 * @param {string} [basePath="dialogue/dialogues"] - Base directory for dialogue files (relative to HTML root).
 * @returns {Promise<object>} Parsed dialogue graph object.
 */
export async function loadDialogue(dialogueId, basePath = 'dialogue/dialogues') {
    const response = await fetch(`${basePath}/${dialogueId}.json`);
    if (!response.ok) {
        throw new Error(`[DialogueLoader] Failed to load dialogue "${dialogueId}" from ${basePath}/${dialogueId}.json`);
    }
    const data = await response.json();
    validateDialogueGraph(data);
    return data;
}

/**
 * Validates the structure of a dialogue graph.
 * @param {object} graph - The dialogue graph to validate.
 * @throws {Error} If the graph is missing required fields.
 */
export function validateDialogueGraph(graph) {
    if (!graph || typeof graph !== 'object') {
        throw new Error('[DialogueLoader] Dialogue graph must be a non-null object.');
    }
    if (typeof graph.id !== 'string' || graph.id.trim() === '') {
        throw new Error('[DialogueLoader] Dialogue graph must have a non-empty string "id".');
    }
    if (!graph.nodes || typeof graph.nodes !== 'object') {
        throw new Error('[DialogueLoader] Dialogue graph must have a "nodes" object.');
    }
    if (typeof graph.startNode !== 'string' || graph.startNode.trim() === '') {
        throw new Error('[DialogueLoader] Dialogue graph must have a non-empty string "startNode".');
    }
    if (!(graph.startNode in graph.nodes)) {
        throw new Error(`[DialogueLoader] startNode "${graph.startNode}" not found in nodes.`);
    }

    // Validate each node has an ID matching its key
    for (const [nodeId, node] of Object.entries(graph.nodes)) {
        if (typeof nodeId !== 'string') {
            throw new Error(`[DialogueLoader] Node key "${nodeId}" must be a string.`);
        }
        if (!node || typeof node !== 'object') {
            throw new Error(`[DialogueLoader] Node "${nodeId}" must be a non-null object.`);
        }
        if (typeof node.speaker !== 'string') {
            console.warn(`[DialogueLoader] Node "${nodeId}" is missing "speaker" field.`);
        }
    }
}

/**
 * Pre-processes a dialogue graph into a lookup-optimized structure.
 * Converts the nodes object into a Map for O(1) lookup by node ID.
 * @param {object} graph - The raw dialogue graph.
 * @returns {object} Optimised dialogue graph with Map-based node lookup.
 */
export function optimiseDialogueGraph(graph) {
    const nodeMap = new Map();
    for (const [nodeId, node] of Object.entries(graph.nodes)) {
        nodeMap.set(nodeId, node);
    }

    return {
        ...graph,
        _nodeMap: nodeMap,
        getNode: (nodeId) => nodeMap.get(nodeId) || null,
        hasNode: (nodeId) => nodeMap.has(nodeId),
        getNodeIds: () => Array.from(nodeMap.keys()),
    };
}

/**
 * Resolves the next node ID from a current node.
 * Handles linear progression, choices, and conditional branches.
 * @param {object} graph - The optimised dialogue graph.
 * @param {string} currentNodeId - The current node ID.
 * @param {object} [flags={}] - Current game flags for conditional evaluation.
 * @returns {{ nextNodeId: string|null, choiceIndex: number|null }} Resolution result.
 */
export function resolveNextNode(graph, currentNodeId, flags = {}) {
    const node = graph.getNode ? graph.getNode(currentNodeId) : graph.nodes[currentNodeId];
    if (!node) {
        return { nextNodeId: null, choiceIndex: null };
    }

    // If this node has choices, the next node is determined by player selection
    // (handled externally by the renderer/input system)
    if (node.choices && node.choices.length > 0) {
        return { nextNodeId: null, choiceIndex: null };
    }

    // If this node has conditional branches, evaluate them
    if (node.conditionalBranches && node.conditionalBranches.length > 0) {
        for (const branch of node.conditionalBranches) {
            if (evaluateCondition(branch.condition, flags)) {
                return { nextNodeId: branch.next, choiceIndex: null };
            }
        }
    }

    // Default linear progression
    const nextNodeId = node.next || null;
    return { nextNodeId, choiceIndex: null };
}

/**
 * Evaluates a condition object against current flags.
 * @param {object} condition - Condition to evaluate.
 * @param {object} flags - Current game flags.
 * @returns {boolean} Whether the condition is met.
 */
function evaluateCondition(condition, flags) {
    if (!condition || typeof condition !== 'object') return false;

    const { flag, value, operator } = condition;
    if (!flag) return false;

    const flagValue = flags[flag];

    switch (operator || 'eq') {
        case 'eq':
            return flagValue === value;
        case 'neq':
            return flagValue !== value;
        case 'gt':
            return typeof flagValue === 'number' && typeof value === 'number' && flagValue > value;
        case 'lt':
            return typeof flagValue === 'number' && typeof value === 'number' && flagValue < value;
        case 'gte':
            return typeof flagValue === 'number' && typeof value === 'number' && flagValue >= value;
        case 'lte':
            return typeof flagValue === 'number' && typeof value === 'number' && flagValue <= value;
        case 'has':
            return flagValue !== undefined && flagValue !== null;
        case 'notHas':
            return flagValue === undefined || flagValue === null;
        default:
            return flagValue === value;
    }
}

export default { loadDialogue, validateDialogueGraph, optimiseDialogueGraph, resolveNextNode };
