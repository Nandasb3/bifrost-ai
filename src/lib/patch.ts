/**
 * Applies a list of patch operations to a JSON document.
 * Supports dot-notation paths (e.g. "scope.in_scope", "stakeholders.0.name")
 */

import type { RefinementPatch } from "./schemas";

type JsonValue = string | number | boolean | null | JsonObject | JsonArray;
type JsonObject = { [key: string]: JsonValue };
type JsonArray = JsonValue[];

function getNestedValue(obj: unknown, path: string): unknown {
    const parts = path.split(".");
    let current: unknown = obj;
    for (const part of parts) {
        if (current === null || current === undefined) return undefined;
        if (Array.isArray(current)) {
            const idx = parseInt(part, 10);
            current = isNaN(idx) ? undefined : current[idx];
        } else if (typeof current === "object") {
            current = (current as Record<string, unknown>)[part];
        } else {
            return undefined;
        }
    }
    return current;
}

function setNestedValue(obj: unknown, path: string, value: unknown): unknown {
    const parts = path.split(".");
    if (parts.length === 0) return obj;

    const result = typeof obj === "object" && obj !== null
        ? Array.isArray(obj) ? [...obj] : { ...(obj as Record<string, unknown>) }
        : ({} as Record<string, unknown>);

    const [head, ...rest] = parts;
    const target = result as Record<string, unknown>;

    if (rest.length === 0) {
        target[head] = value;
    } else {
        target[head] = setNestedValue(target[head], rest.join("."), value);
    }

    return result;
}

function appendToNestedArray(obj: unknown, path: string, value: unknown): unknown {
    const current = getNestedValue(obj, path);
    const arr = Array.isArray(current) ? [...current, value] : [value];
    return setNestedValue(obj, path, arr);
}

function removeNestedValue(obj: unknown, path: string): unknown {
    const parts = path.split(".");
    if (parts.length === 0) return obj;

    const result = typeof obj === "object" && obj !== null
        ? Array.isArray(obj) ? [...obj] : { ...(obj as Record<string, unknown>) }
        : ({} as Record<string, unknown>);

    const [head, ...rest] = parts;
    const target = result as Record<string, unknown>;

    if (rest.length === 0) {
        if (Array.isArray(result)) {
            const idx = parseInt(head, 10);
            if (!isNaN(idx)) {
                (result as unknown[]).splice(idx, 1);
            }
        } else {
            delete target[head];
        }
    } else {
        target[head] = removeNestedValue(target[head], rest.join("."));
    }

    return result;
}

export function applyPatch(
    content: unknown,
    operations: RefinementPatch["operations"]
): unknown {
    let current = content;

    for (const op of operations) {
        switch (op.op) {
            case "update":
                current = setNestedValue(current, op.path, op.value);
                break;
            case "append":
                current = appendToNestedArray(current, op.path, op.value);
                break;
            case "remove":
                current = removeNestedValue(current, op.path);
                break;
        }
    }

    return current;
}
