// ============================================================
// CONDITION MANAGER
// ============================================================
// Evaluates dialogue conditions against game flags.
// Supports equality, comparison, and existence operators.
// Conditions are data-driven — no hardcoded logic.
// ============================================================

/**
 * Supported comparison operators for dialogue conditions.
 */
export const ConditionOperators = Object.freeze({
    EQ: 'eq',
    NEQ: 'neq',
    GT: 'gt',
    LT: 'lt',
    GTE: 'gte',
    LTE: 'lte',
    HAS: 'has',
    NOT_HAS: 'notHas',
});

/**
 * Evaluates a single condition against the current flags.
 * @param {object} condition - The condition to evaluate.
 * @param {string} condition.flag - The flag name to check.
 * @param {*} [condition.value] - The value to compare against.
 * @param {string} [condition.operator='eq'] - The comparison operator.
 * @param {object} flags - Current game flags.
 * @returns {boolean} Whether the condition is met.
 */
export function evaluateCondition(condition, flags) {
    if (!condition || typeof condition !== 'object') return false;

    const { flag, value, operator } = condition;
    if (!flag) return false;

    const flagValue = flags[flag];
    const op = operator || ConditionOperators.EQ;

    switch (op) {
        case ConditionOperators.EQ:
            return flagValue === value;
        case ConditionOperators.NEQ:
            return flagValue !== value;
        case ConditionOperators.GT:
            return typeof flagValue === 'number' && typeof value === 'number' && flagValue > value;
        case ConditionOperators.LT:
            return typeof flagValue === 'number' && typeof value === 'number' && flagValue < value;
        case ConditionOperators.GTE:
            return typeof flagValue === 'number' && typeof value === 'number' && flagValue >= value;
        case ConditionOperators.LTE:
            return typeof flagValue === 'number' && typeof value === 'number' && flagValue <= value;
        case ConditionOperators.HAS:
            return flagValue !== undefined && flagValue !== null;
        case ConditionOperators.NOT_HAS:
            return flagValue === undefined || flagValue === null;
        default:
            console.warn(`[ConditionManager] Unknown operator "${op}", defaulting to eq.`);
            return flagValue === value;
    }
}

/**
 * Evaluates an array of conditions with AND logic.
 * All conditions must be true for the result to be true.
 * @param {object[]} conditions - Array of condition objects.
 * @param {object} flags - Current game flags.
 * @returns {boolean} Whether all conditions are met.
 */
export function evaluateConditions(conditions, flags) {
    if (!Array.isArray(conditions)) return false;
    return conditions.every((condition) => evaluateCondition(condition, flags));
}

/**
 * Evaluates an array of conditions with OR logic.
 * At least one condition must be true for the result to be true.
 * @param {object[]} conditions - Array of condition objects.
 * @param {object} flags - Current game flags.
 * @returns {boolean} Whether any condition is met.
 */
export function evaluateAnyCondition(conditions, flags) {
    if (!Array.isArray(conditions)) return false;
    return conditions.some((condition) => evaluateCondition(condition, flags));
}

export default { ConditionOperators, evaluateCondition, evaluateConditions, evaluateAnyCondition };
