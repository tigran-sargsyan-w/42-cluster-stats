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

// ─────────────────────────────────────────────────────────────
// Console output formatting
// ─────────────────────────────────────────────────────────────

const colors = {
	reset: "\x1b[0m",
	dim: "\x1b[2m",
	cyan: "\x1b[36m",
	green: "\x1b[32m",
	yellow: "\x1b[33m",
	red: "\x1b[31m",
	bold: "\x1b[1m",
};

const LINE = "━".repeat(40);

function formatSize(bytes) {
	if (bytes < 1024) return `${bytes} B`;
	const kb = bytes / 1024;
	return `${kb.toFixed(1)} KB`;
}

function log(emoji, label, value = "") {
	const paddedLabel = label.padEnd(10);
	console.log(`${emoji} ${colors.dim}${paddedLabel}${colors.reset}${value}`);
}

function logHeader(version) {
	console.log(colors.dim + LINE + colors.reset);
	console.log(`🚀 ${colors.bold}42 Cluster Stats${colors.reset} ${colors.dim}— Build started${colors.reset}`);
	log("🏷️ ", "Version", `${colors.cyan}${version}${colors.reset}`);
	console.log(colors.dim + LINE + colors.reset);
}

function logSuccess(duration) {
	console.log(`✅ ${colors.green}Success${colors.reset}   ${colors.dim}Build complete in ${duration} ms${colors.reset}`);
	log("📁", "Output", `${colors.cyan}${BUILD_DIR}/${colors.reset}`);
	console.log(colors.dim + LINE + colors.reset);
}

function logError(err) {
	console.log(colors.dim + LINE + colors.reset);
	console.log(`❌ ${colors.red}${colors.bold}Build failed${colors.reset}`);
	console.log(colors.dim + LINE + colors.reset);
	console.error(colors.red + (err.message || err) + colors.reset);
}

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
 * Copies a file or directory recursively, returns count of files copied
 */
async function copyRecursive(src, dest) {
	const stat = await fs.promises.stat(src);
	if (stat.isDirectory()) {
		await fs.promises.mkdir(dest, { recursive: true });
		const entries = await fs.promises.readdir(src);
		let count = 0;
		for (const entry of entries) {
			count += await copyRecursive(path.join(src, entry), path.join(dest, entry));
		}
		return count;
	} else {
		await fs.promises.copyFile(src, dest);
		return 1;
	}
}

/**
 * Reads version from package.json
 */
async function getVersion() {
	const pkg = JSON.parse(await fs.promises.readFile("package.json", "utf8"));
	return pkg.version;
}

/**
 * Syncs version from package.json to manifest.json
 */
async function syncVersion(version) {
	const manifestPath = "manifest.json";
	const manifest = JSON.parse(await fs.promises.readFile(manifestPath, "utf8"));

	if (manifest.version !== version) {
		manifest.version = version;
		await fs.promises.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
		log("🔄", "Synced", `manifest.json version → ${colors.cyan}${version}${colors.reset}`);
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
	log("📄", "Copied", "manifest.json");

	// Copy icons if they exist
	if (fs.existsSync("icons")) {
		const count = await copyRecursive("icons", path.join(BUILD_DIR, "icons"));
		log("🖼️ ", "Copied", `icons/ ${colors.dim}(${count} files)${colors.reset}`);
	}
}

/**
 * Main build function
 */
async function build(watch = false) {
	const startTime = Date.now();
	const version = await getVersion();

	// Print header
	logHeader(version);

	// Ensure build directory exists
	await fs.promises.mkdir(BUILD_DIR, { recursive: true });

	// Sync version first
	await syncVersion(version);

	const buildOptions = {
		entryPoints: [ENTRY_POINT],
		bundle: true,
		outfile: OUTPUT_FILE,
		format: "iife",
		target: ["chrome126", "firefox128"],
		minify: false,
		sourcemap: false,
		plugins: [inlineCssPlugin],
		logLevel: "silent",
		metafile: true,
	};

	if (watch) {
		const ctx = await esbuild.context(buildOptions);
		await ctx.watch();
		log("👀", "Watching", "for changes...");

		// Copy assets once at start
		await copyAssets();
		console.log(colors.dim + LINE + colors.reset);
	} else {
		const result = await esbuild.build(buildOptions);

		// Log bundle info
		const outputSize = result.metafile?.outputs?.[OUTPUT_FILE.replace(/\\/g, "/")]?.bytes;
		const sizeStr = outputSize ? formatSize(outputSize) : "";
		log("📦", "Bundled", `content.js ${colors.cyan}${sizeStr}${colors.reset}`);

		await copyAssets();

		const duration = Date.now() - startTime;
		logSuccess(duration);
	}
}

// Parse CLI args
const watch = process.argv.includes("--watch") || process.argv.includes("-w");

build(watch).catch((err) => {
	logError(err);
	process.exit(1);
});
