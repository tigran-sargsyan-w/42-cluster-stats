import { API } from "./constants.js";

/**
 * Fetches raw cluster data from the 42 intra API.
 * @returns {Promise<Array<Object>>} - Raw cluster entries
 * @throws {Error} - If the fetch fails
 */
export async function fetchClusterData() {
	const response = await fetch(API.clustersUrl, {
		method: "GET",
		credentials: "include",
		cache: "no-store",
	});

	if (!response.ok) {
		throw new Error(`HTTP ${response.status}`);
	}

	return response.json();
}
