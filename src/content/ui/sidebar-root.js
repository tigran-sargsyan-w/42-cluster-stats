import { DOM_IDS, CSS_CLASSES } from "../constants.js";

/**
 * Creates the root container element if it doesn't exist.
 * Inserts it after the first <hr> in the sidebar, or appends it.
 * @param {HTMLElement} sidebar - The sidebar element
 * @returns {HTMLElement} - The root container
 */
export function createRootIfNeeded(sidebar) {
	let root = document.getElementById(DOM_IDS.root);
	if (root) {
		return root;
	}

	root = document.createElement("div");
	root.id = DOM_IDS.root;
	root.className = CSS_CLASSES.root;

	const hr = sidebar.querySelector("hr");
	if (hr) {
		hr.insertAdjacentElement("afterend", root);
	} else {
		sidebar.appendChild(root);
	}

	return root;
}
