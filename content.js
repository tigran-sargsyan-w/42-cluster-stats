(() => {
	"use strict";

	const EXTENSION_ROOT_ID = "cluster-stats-root";
	const REFRESH_INTERVAL_MS = 30000;

	let refreshTimer = null;
	let observer = null;
	let isUpdating = false;

	function isClustersPage() {
		return window.location.pathname.startsWith("/clusters");
	}

	function waitForSidebar() {
		return document.querySelector(".app-sidebar-left");
	}

	function createRootIfNeeded(sidebar) {
		let root = document.getElementById(EXTENSION_ROOT_ID);
		if (root) {
			return root;
		}

		root = document.createElement("div");
		root.id = EXTENSION_ROOT_ID;
		root.className = "cluster-stats-root";

		const hr = sidebar.querySelector("hr");
		if (hr) {
			hr.insertAdjacentElement("afterend", root);
		} else {
			sidebar.appendChild(root);
		}

		return root;
	}

	function escapeHtml(value) {
		const div = document.createElement("div");
		div.textContent = String(value);
		return div.innerHTML;
	}

	function renderLoading(root) {
		root.innerHTML = `
			<div class="cluster-stats-card">
				<div class="cluster-stats-title">Cluster Stats</div>
				<div class="cluster-stats-muted">Loading...</div>
			</div>
		`;
	}

	function renderError(root, message) {
		root.innerHTML = `
			<div class="cluster-stats-card">
				<div class="cluster-stats-title">Cluster Stats</div>
				<div class="cluster-stats-error">${escapeHtml(message)}</div>
			</div>
		`;
	}

	function parseHost(host) {
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
			normalized: host.toLowerCase()
		};
	}

	function getActiveEntries(entries) {
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

			if (!activeByHost.has(parsed.normalized)) {
				activeByHost.set(parsed.normalized, {
					...entry,
					parsedHost: parsed
				});
			}
		}

		return Array.from(activeByHost.values());
	}

	function sleep(ms) {
		return new Promise((resolve) => {
			window.setTimeout(resolve, ms);
		});
	}

	function getVacantCountsFromSidebar() {
		const result = {
			io: null,
			discovery: null
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

	function hasValidVacantCounts(vacantCounts) {
		return Number.isFinite(vacantCounts.io) && Number.isFinite(vacantCounts.discovery);
	}

	async function waitForVacantCounts(maxAttempts = 20, delayMs = 300) {
		for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
			const vacantCounts = getVacantCountsFromSidebar();

			if (hasValidVacantCounts(vacantCounts)) {
				return vacantCounts;
			}

			await sleep(delayMs);
		}

		return getVacantCountsFromSidebar();
	}

	function sortZoneEntries(map) {
		return Array.from(map.entries()).sort((a, b) => {
			const aNum = Number(a[0].replace("z", ""));
			const bNum = Number(b[0].replace("z", ""));
			return aNum - bNum;
		});
	}

	function buildStats(activeEntries, vacantCounts) {
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
		const occupancyPercent = total > 0
			? Math.round((occupied / total) * 100)
			: null;

		return {
			occupied,
			free,
			total,
			occupancyPercent,
			byZone: sortZoneEntries(byZone)
		};
	}

	function getCrowdLabel(occupancyPercent) {
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

	function formatTime(date) {
		return new Intl.DateTimeFormat(undefined, {
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit"
		}).format(date);
	}

	function renderStats(root, stats) {
		const zoneHtml = stats.byZone.length
			? stats.byZone
				.map(([zone, count]) => {
					return `
						<div class="cluster-stat-line">
							<span>${escapeHtml(zone.toUpperCase())}</span>
							<strong>${count}</strong>
						</div>
					`;
				})
				.join("")
			: `<div class="cluster-stats-muted">No active seats found.</div>`;

		const percentText = stats.occupancyPercent !== null
			? `${stats.occupancyPercent}%`
			: "—";

		root.innerHTML = `
			<div class="cluster-stats-card">
				<div class="cluster-stats-title">Cluster Stats</div>

				<div class="cluster-big-number">${stats.occupied}</div>
				<div class="cluster-stats-subtitle">occupied seats</div>

				<div class="cluster-status-badge">${escapeHtml(getCrowdLabel(stats.occupancyPercent))}</div>

				<div class="cluster-stats-section">
					<div class="cluster-stats-section-title">Overview</div>

					<div class="cluster-stat-line">
						<span>Occupied</span>
						<strong>${stats.occupied}</strong>
					</div>

					<div class="cluster-stat-line">
						<span>Free</span>
						<strong>${stats.free}</strong>
					</div>

					<div class="cluster-stat-line">
						<span>Total</span>
						<strong>${stats.total}</strong>
					</div>

					<div class="cluster-stat-line">
						<span>Occupancy</span>
						<strong>${percentText}</strong>
					</div>
				</div>

				<div class="cluster-stats-section">
					<div class="cluster-stats-section-title">By zone</div>
					${zoneHtml}
				</div>

				<div class="cluster-stats-footer">
					Updated: ${escapeHtml(formatTime(new Date()))}
				</div>
			</div>
		`;
	}

	async function fetchClusterData() {
		const response = await fetch("https://meta.intra.42.fr/clusters.json", {
			method: "GET",
			credentials: "include",
			cache: "no-store"
		});

		if (!response.ok) {
			throw new Error(`HTTP ${response.status}`);
		}

		return response.json();
	}

	async function updateStats() {
		if (!isClustersPage() || isUpdating) {
			return;
		}

		const sidebar = waitForSidebar();
		if (!sidebar) {
			return;
		}

		isUpdating = true;

		try {
			const root = createRootIfNeeded(sidebar);
			renderLoading(root);

			const rawData = await fetchClusterData();
			const allActiveEntries = getActiveEntries(rawData);

			const vacantCounts = await waitForVacantCounts();

			const stats = buildStats(allActiveEntries, vacantCounts);
			renderStats(root, stats);
		} catch (error) {
			console.error("[42 Cluster Stats] Failed to update stats:", error);

			const currentSidebar = waitForSidebar();
			if (currentSidebar) {
				const root = createRootIfNeeded(currentSidebar);
				renderError(root, `Failed to load stats: ${error.message}`);
			}
		} finally {
			isUpdating = false;
		}
	}

	function startAutoRefresh() {
		stopAutoRefresh();
		refreshTimer = window.setInterval(() => {
			updateStats();
		}, REFRESH_INTERVAL_MS);
	}

	function stopAutoRefresh() {
		if (refreshTimer !== null) {
			window.clearInterval(refreshTimer);
			refreshTimer = null;
		}
	}

	function setupMutationObserver() {
		if (observer) {
			observer.disconnect();
		}

		observer = new MutationObserver(() => {
			if (!isClustersPage()) {
				return;
			}

			const sidebar = waitForSidebar();
			if (!sidebar) {
				return;
			}

			createRootIfNeeded(sidebar);
		});

		observer.observe(document.body, {
			childList: true,
			subtree: true
		});
	}

	function bootstrap() {
		if (!isClustersPage()) {
			return;
		}

		setupMutationObserver();
		updateStats();
		startAutoRefresh();
	}

	bootstrap();

	window.addEventListener("popstate", () => {
		if (isClustersPage()) {
			bootstrap();
		} else {
			stopAutoRefresh();
		}
	});
})();