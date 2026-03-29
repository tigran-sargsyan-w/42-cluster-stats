import { TIMING } from "./constants.js";
import { sleep } from "./utils.js";

/**
 * Checks if the current page is the clusters page.
 * @returns {boolean}
 */
export function isClustersPage() {
	return window.location.pathname.startsWith("/clusters");
}

/**
 * Returns the sidebar element if present.
 * @returns {HTMLElement|null}
 */
export function getSidebar() {
	return document.querySelector(".app-sidebar-left");
}

/**
 * Extracts vacant post counts from the sidebar DOM.
 * @returns {Object} - Vacant counts for io and discovery
 */
export function getVacantCountsFromSidebar() {
	const result = {
		io: null,
		discovery: null,
	};

	const items = document.querySelectorAll(".clusters-state li");

	for (const item of items) {
		const id = (item.id || "").trim().toLowerCase();
		const code = item.querySelector("code");

		if (!code) {
			continue;
		}

		const text = (code.textContent || "").trim();
		const match = text.match(/(\d+)\s+vacant\s+posts\.?/i);

		if (!match) {
			continue;
		}

		const count = Number(match[1]);

		if (id === "io") {
			result.io = count;
		} else if (id === "discovery") {
			result.discovery = count;
		}
	}

	return result;
}

/**
 * Checks if vacant counts are valid (both present).
 * @param {Object} vacantCounts - Vacant counts object
 * @returns {boolean}
 */
function hasValidVacantCounts(vacantCounts) {
	return Number.isFinite(vacantCounts.io) && Number.isFinite(vacantCounts.discovery);
}

/**
 * Polls for vacant counts until available or max attempts reached.
 * @returns {Promise<Object>} - Vacant counts
 */
export async function waitForVacantCounts() {
	const { vacantPollMaxAttempts, vacantPollDelayMs } = TIMING;

	for (let attempt = 0; attempt < vacantPollMaxAttempts; attempt += 1) {
		const vacantCounts = getVacantCountsFromSidebar();

		if (hasValidVacantCounts(vacantCounts)) {
			return vacantCounts;
		}

		await sleep(vacantPollDelayMs);
	}

	// Return whatever we have after max attempts
	return getVacantCountsFromSidebar();
}
