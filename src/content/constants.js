/**
 * Extension identifiers and DOM IDs
 */
export const DOM_IDS = {
	root: "cluster-stats-root",
	styles: "cluster-stats-styles",
};

/**
 * API endpoints
 */
export const API = {
	clustersUrl: "https://meta.intra.42.fr/clusters.json",
};

/**
 * Timing configuration
 */
export const TIMING = {
	refreshIntervalMs: 30000,
	vacantPollDelayMs: 300,
	vacantPollMaxAttempts: 20,
};

/**
 * CSS class names used in rendering
 */
export const CSS_CLASSES = {
	root: "cluster-stats-root",
	card: "cluster-stats-card",
	title: "cluster-stats-title",
	bigNumber: "cluster-big-number",
	subtitle: "cluster-stats-subtitle",
	statusBadge: "cluster-status-badge",
	section: "cluster-stats-section",
	sectionTitle: "cluster-stats-section-title",
	statLine: "cluster-stat-line",
	footer: "cluster-stats-footer",
	muted: "cluster-stats-muted",
	error: "cluster-stats-error",
};
