export function applyPatch<T>(target: T, patch: Record<string, unknown>): T {
	const next = structuredClone(target) as Record<string, unknown>;
	for (const [rawPath, value] of Object.entries(patch)) {
		const parts = rawPath.split('/').filter(Boolean);
		if (parts.length === 0) continue;
		let cursor: Record<string, unknown> = next;
		for (let i = 0; i < parts.length - 1; i++) {
			const key = parts[i];
			if (!key) continue;
			const cur = cursor[key];
			if (typeof cur !== 'object' || cur === null || Array.isArray(cur)) {
				cursor[key] = {};
			}
			cursor = cursor[key] as Record<string, unknown>;
		}
		const last = parts[parts.length - 1];
		if (!last) continue;
		if (value === null) delete cursor[last];
		else cursor[last] = value;
	}
	return next as T;
}
