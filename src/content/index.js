/**
 * 42 Cluster Stats - Content Script Entry Point
 *
 * Displays live cluster occupancy statistics in the sidebar
 * on the 42 intra clusters page.
 */

import { DOM_IDS, TIMING } from "./constants.js";
import { fetchClusterData } from "./api.js";
import { getActiveEntries, buildStats } from "./stats.js";
import { isClustersPage, getSidebar, waitForVacantCounts } from "./page.js";
import { createRootIfNeeded } from "./ui/sidebar-root.js";
import { renderLoading, renderError, renderStats } from "./ui/render.js";
import styles from "./ui/styles.css";

// State
let refreshTimer = null;
let observer = null;
let isUpdating = false;

/**
 * Injects the shared CSS styles into the document head.
 * Guards against duplicate injection.
 */
function injectStyles() {
	if (document.getElementById(DOM_IDS.styles)) {
		return;
	}

	const styleElement = document.createElement("style");
	styleElement.id = DOM_IDS.styles;
	styleElement.textContent = styles;
	document.head.appendChild(styleElement);
}

/**
 * Fetches data and updates the stats display.
 * Guards against concurrent updates.
 */
async function updateStats() {
	if (!isClustersPage() || isUpdating) {
		return;
	}

	const sidebar = getSidebar();
	if (!sidebar) {
		return;
	}

	isUpdating = true;

	try {
		const root = createRootIfNeeded(sidebar);
		renderLoading(root);

		const rawData = await fetchClusterData();
		const activeEntries = getActiveEntries(rawData);
		const vacantCounts = await waitForVacantCounts();
		const stats = buildStats(activeEntries, vacantCounts);

		renderStats(root, stats);
	} catch (error) {
		console.error("[42 Cluster Stats] Failed to update stats:", error);

		const currentSidebar = getSidebar();
		if (currentSidebar) {
			const root = createRootIfNeeded(currentSidebar);
			renderError(root, `Failed to load stats: ${error.message}`);
		}
	} finally {
		isUpdating = false;
	}
}

/**
 * Starts the auto-refresh timer.
 */
function startAutoRefresh() {
	stopAutoRefresh();
	refreshTimer = window.setInterval(() => {
		updateStats();
	}, TIMING.refreshIntervalMs);
}

/**
 * Stops the auto-refresh timer.
 */
function stopAutoRefresh() {
	if (refreshTimer !== null) {
		window.clearInterval(refreshTimer);
		refreshTimer = null;
	}
}

/**
 * Sets up a MutationObserver to handle SPA navigation
 * and ensure the root element exists when needed.
 */
function setupMutationObserver() {
	if (observer) {
		observer.disconnect();
	}

	observer = new MutationObserver(() => {
		if (!isClustersPage()) {
			return;
		}

		const sidebar = getSidebar();
		if (!sidebar) {
			return;
		}

		createRootIfNeeded(sidebar);
	});

	observer.observe(document.body, {
		childList: true,
		subtree: true,
	});
}

/**
 * Initializes the extension on the clusters page.
 */
function bootstrap() {
	if (!isClustersPage()) {
		return;
	}

	injectStyles();
	setupMutationObserver();
	updateStats();
	startAutoRefresh();
}

/**
 * Main initialization with duplicate execution guard.
 */
function init() {
	if (window.__42_CLUSTER_STATS_LOADED__) {
		return;
	}
	window.__42_CLUSTER_STATS_LOADED__ = true;

	bootstrap();

	// Handle SPA navigation
	window.addEventListener("popstate", () => {
		if (isClustersPage()) {
			bootstrap();
		} else {
			stopAutoRefresh();
		}
	});
}

init();
