/**
 * Parses a host string like "z1r2p3" into its components.
 * @param {string} host - Host identifier (e.g., "z1r2p3")
 * @returns {Object|null} - Parsed host object or null if invalid
 */
export function parseHost(host) {
	if (typeof host !== "string") {
		return null;
	}

	const match = host.match(/^z(\d+)r(\d+)p(\d+)$/i);
	if (!match) {
		return null;
	}

	return {
		zone: Number(match[1]),
		row: Number(match[2]),
		place: Number(match[3]),
		normalized: host.toLowerCase(),
	};
}

/**
 * Filters and deduplicates active entries (where end_at is null).
 * @param {Array<Object>} entries - Raw cluster entries
 * @returns {Array<Object>} - Active entries with parsed host info
 */
export function getActiveEntries(entries) {
	if (!Array.isArray(entries)) {
		return [];
	}

	const activeByHost = new Map();

	for (const entry of entries) {
		if (!entry || entry.end_at !== null) {
			continue;
		}

		const parsed = parseHost(entry.host);
		if (!parsed) {
			continue;
		}

		// Keep first occurrence per host (avoid duplicates)
		if (!activeByHost.has(parsed.normalized)) {
			activeByHost.set(parsed.normalized, {
				...entry,
				parsedHost: parsed,
			});
		}
	}

	return Array.from(activeByHost.values());
}

/**
 * Sorts zone entries by zone number ascending.
 * @param {Map<string, number>} map - Zone to count mapping
 * @returns {Array<[string, number]>} - Sorted array of [zone, count] pairs
 */
function sortZoneEntries(map) {
	return Array.from(map.entries()).sort((a, b) => {
		const aNum = Number(a[0].replace("z", ""));
		const bNum = Number(b[0].replace("z", ""));
		return aNum - bNum;
	});
}

/**
 * Builds statistics from active entries and vacant counts.
 * @param {Array<Object>} activeEntries - Filtered active entries
 * @param {Object} vacantCounts - Vacant counts from sidebar
 * @returns {Object} - Computed statistics
 */
export function buildStats(activeEntries, vacantCounts) {
	const byZone = new Map();

	for (const entry of activeEntries) {
		const zoneKey = `z${entry.parsedHost.zone}`;
		byZone.set(zoneKey, (byZone.get(zoneKey) || 0) + 1);
	}

	const occupied = activeEntries.length;
	const ioFree = Number.isFinite(vacantCounts.io) ? vacantCounts.io : 0;
	const discoveryFree = Number.isFinite(vacantCounts.discovery) ? vacantCounts.discovery : 0;
	const free = ioFree + discoveryFree;
	const total = occupied + free;
	const occupancyPercent = total > 0 ? Math.round((occupied / total) * 100) : null;

	return {
		occupied,
		free,
		total,
		occupancyPercent,
		byZone: sortZoneEntries(byZone),
	};
}

/**
 * Returns a human-readable crowd level label.
 * @param {number|null} occupancyPercent - Occupancy percentage
 * @returns {string} - Crowd label
 */
export function getCrowdLabel(occupancyPercent) {
	if (occupancyPercent === null) {
		return "Unknown";
	}
	if (occupancyPercent < 25) {
		return "Quite empty";
	}
	if (occupancyPercent < 50) {
		return "Light";
	}
	if (occupancyPercent < 75) {
		return "Moderate";
	}
	if (occupancyPercent < 90) {
		return "Busy";
	}
	return "Very busy";
}
