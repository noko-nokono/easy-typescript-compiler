export const errors = new Map();
export function error(location, message) {
    const pos = typeof location === 'number' ? location : location.pos;
    if (!errors.has(pos)) {
        errors.set(pos, { pos, message });
    }
}
//# sourceMappingURL=error.js.map