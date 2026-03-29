/**
 * Build script for 42 Cluster Stats extension
 * Uses esbuild to bundle source files and copy static assets
 */

import * as esbuild from "esbuild";
import * as fs from "fs";
import * as path from "path";

const BUILD_DIR = "build";
const ENTRY_POINT = "src/content/index.js";
const OUTPUT_FILE = `${BUILD_DIR}/content.js`;

/**
 * Plugin to inline CSS imports as JavaScript string exports
 */
const inlineCssPlugin = {
	name: "inline-css",
	setup(build) {
		build.onLoad({ filter: /\.css$/ }, async (args) => {
			const css = await fs.promises.readFile(args.path, "utf8");
			// Basic minification: remove comments and extra whitespace
			const minified = css
				.replace(/\/\*[\s\S]*?\*\//g, "")
				.replace(/\s+/g, " ")
				.replace(/\s*([{}:;,>+~])\s*/g, "$1")
				.trim();
			return {
				contents: `export default ${JSON.stringify(minified)};`,
				loader: "js",
			};
		});
	},
};

/**
 * Copies a file or directory recursively
 */
async function copyRecursive(src, dest) {
	const stat = await fs.promises.stat(src);
	if (stat.isDirectory()) {
		await fs.promises.mkdir(dest, { recursive: true });
		const entries = await fs.promises.readdir(src);
		for (const entry of entries) {
			await copyRecursive(path.join(src, entry), path.join(dest, entry));
		}
	} else {
		await fs.promises.copyFile(src, dest);
	}
}

/**
 * Syncs version from package.json to manifest.json
 */
async function syncVersion() {
	const pkg = JSON.parse(await fs.promises.readFile("package.json", "utf8"));
	const manifestPath = "manifest.json";
	const manifest = JSON.parse(await fs.promises.readFile(manifestPath, "utf8"));

	if (manifest.version !== pkg.version) {
		manifest.version = pkg.version;
		await fs.promises.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
		console.log(`[sync] Updated manifest.json version to ${pkg.version}`);
	}
}

/**
 * Copies static assets to build directory
 */
async function copyAssets() {
	// Read and transform manifest (adjust content script path)
	const manifest = JSON.parse(await fs.promises.readFile("manifest.json", "utf8"));

	// Update content script paths for build output
	if (manifest.content_scripts) {
		for (const cs of manifest.content_scripts) {
			if (cs.js) {
				cs.js = cs.js.map((p) => p.replace(/^build\//, ""));
			}
			if (cs.css) {
				cs.css = cs.css.map((p) => p.replace(/^build\//, ""));
			}
		}
	}

	await fs.promises.writeFile(
		path.join(BUILD_DIR, "manifest.json"),
		JSON.stringify(manifest, null, 2)
	);

	// Copy icons if they exist
	if (fs.existsSync("icons")) {
		await copyRecursive("icons", path.join(BUILD_DIR, "icons"));
		console.log("[copy] icons/");
	}
}

/**
 * Main build function
 */
async function build(watch = false) {
	// Ensure build directory exists
	await fs.promises.mkdir(BUILD_DIR, { recursive: true });

	// Sync version first
	await syncVersion();

	const buildOptions = {
		entryPoints: [ENTRY_POINT],
		bundle: true,
		outfile: OUTPUT_FILE,
		format: "iife",
		target: ["chrome126", "firefox128"],
		minify: false,
		sourcemap: false,
		plugins: [inlineCssPlugin],
		logLevel: "info",
	};

	if (watch) {
		const ctx = await esbuild.context(buildOptions);
		await ctx.watch();
		console.log("[watch] Watching for changes...");

		// Copy assets once at start
		await copyAssets();
	} else {
		await esbuild.build(buildOptions);
		await copyAssets();
		console.log("[build] Done!");
	}
}

// Parse CLI args
const watch = process.argv.includes("--watch") || process.argv.includes("-w");

build(watch).catch((err) => {
	console.error(err);
	process.exit(1);
});
