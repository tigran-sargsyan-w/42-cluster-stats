/**
 * Escapes HTML entities in a string to prevent XSS.
 * @param {unknown} value - Value to escape
 * @returns {string} - HTML-safe string
 */
export function escapeHtml(value) {
	const div = document.createElement("div");
	div.textContent = String(value);
	return div.innerHTML;
}

/**
 * Delays execution for a specified duration.
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
export function sleep(ms) {
	return new Promise((resolve) => {
		window.setTimeout(resolve, ms);
	});
}

/**
 * Formats a Date object as a localized time string.
 * @param {Date} date - Date to format
 * @returns {string} - Formatted time string (HH:MM:SS)
 */
export function formatTime(date) {
	return new Intl.DateTimeFormat(undefined, {
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
	}).format(date);
}
