import { CSS_CLASSES } from "../constants.js";
import { escapeHtml, formatTime } from "../utils.js";
import { getCrowdLabel } from "../stats.js";

/**
 * Renders a loading state in the root container.
 * @param {HTMLElement} root - The root container
 */
export function renderLoading(root) {
	root.innerHTML = `
		<div class="${CSS_CLASSES.card}">
			<div class="${CSS_CLASSES.title}">Cluster Stats</div>
			<div class="${CSS_CLASSES.muted}">Loading...</div>
		</div>
	`;
}

/**
 * Renders an error state in the root container.
 * @param {HTMLElement} root - The root container
 * @param {string} message - Error message to display
 */
export function renderError(root, message) {
	root.innerHTML = `
		<div class="${CSS_CLASSES.card}">
			<div class="${CSS_CLASSES.title}">Cluster Stats</div>
			<div class="${CSS_CLASSES.error}">${escapeHtml(message)}</div>
		</div>
	`;
}

/**
 * Builds HTML for the zone breakdown section.
 * @param {Array<[string, number]>} byZone - Sorted zone entries
 * @returns {string} - HTML string
 */
function buildZoneHtml(byZone) {
	if (!byZone.length) {
		return `<div class="${CSS_CLASSES.muted}">No active seats found.</div>`;
	}

	return byZone
		.map(([zone, count]) => {
			return `
				<div class="${CSS_CLASSES.statLine}">
					<span>${escapeHtml(zone.toUpperCase())}</span>
					<strong>${count}</strong>
				</div>
			`;
		})
		.join("");
}

/**
 * Renders the full stats view in the root container.
 * @param {HTMLElement} root - The root container
 * @param {Object} stats - Computed statistics
 */
export function renderStats(root, stats) {
	const zoneHtml = buildZoneHtml(stats.byZone);
	const percentText = stats.occupancyPercent !== null ? `${stats.occupancyPercent}%` : "—";
	const crowdLabel = getCrowdLabel(stats.occupancyPercent);

	root.innerHTML = `
		<div class="${CSS_CLASSES.card}">
			<div class="${CSS_CLASSES.title}">Cluster Stats</div>

			<div class="${CSS_CLASSES.bigNumber}">${stats.occupied}</div>
			<div class="${CSS_CLASSES.subtitle}">occupied seats</div>

			<div class="${CSS_CLASSES.statusBadge}">${escapeHtml(crowdLabel)}</div>

			<div class="${CSS_CLASSES.section}">
				<div class="${CSS_CLASSES.sectionTitle}">Overview</div>

				<div class="${CSS_CLASSES.statLine}">
					<span>Occupied</span>
					<strong>${stats.occupied}</strong>
				</div>

				<div class="${CSS_CLASSES.statLine}">
					<span>Free</span>
					<strong>${stats.free}</strong>
				</div>

				<div class="${CSS_CLASSES.statLine}">
					<span>Total</span>
					<strong>${stats.total}</strong>
				</div>

				<div class="${CSS_CLASSES.statLine}">
					<span>Occupancy</span>
					<strong>${percentText}</strong>
				</div>
			</div>

			<div class="${CSS_CLASSES.section}">
				<div class="${CSS_CLASSES.sectionTitle}">By zone</div>
				${zoneHtml}
			</div>

			<div class="${CSS_CLASSES.footer}">
				Updated: ${escapeHtml(formatTime(new Date()))}
			</div>
		</div>
	`;
}
