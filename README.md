# 42 Cluster Stats

A browser extension that displays live cluster occupancy statistics in the sidebar on the 42 intra clusters page.

## Features

- Real-time display of occupied seats across all zones
- Crowd level indicator (Empty, Light, Moderate, Busy, Very Busy)
- Overview statistics: occupied, free, total seats, and occupancy percentage
- Per-zone breakdown of active users
- Auto-refresh every 30 seconds
- SPA navigation support with mutation observer
- Light, unobtrusive UI that matches the 42 intra style

## Installation

### From source (development)

1. Clone this repository:
   ```bash
   git clone https://github.com/your-username/42-cluster-stats.git
   cd 42-cluster-stats
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the extension:
   ```bash
   npm run build
   ```

4. Load in Chrome/Edge:
   - Navigate to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `build/` folder

5. Load in Firefox:
   - Navigate to `about:debugging#/runtime/this-firefox`
   - Click "Load Temporary Add-on"
   - Select `build/manifest.json`

## Development

Start the watch mode for automatic rebuilds:

```bash
npm run watch
```

After making changes, reload the extension in your browser to see updates.

## Build

Build the extension for production:

```bash
npm run build
```

Output is placed in the `build/` directory, ready to be loaded as an unpacked extension or packaged for distribution.

## Project Structure

```
42-cluster-stats/
├── src/
│   └── content/
│       ├── index.js           # Entry point, bootstrap, refresh logic
│       ├── constants.js       # DOM IDs, API URLs, timing config
│       ├── api.js             # Cluster data fetching
│       ├── utils.js           # Pure utilities (escape, sleep, format)
│       ├── stats.js           # Stats computation (parse, build, labels)
│       ├── page.js            # Page detection, vacant count extraction
│       └── ui/
│           ├── sidebar-root.js  # Root element creation
│           ├── render.js        # Loading, error, stats rendering
│           └── styles.css       # All CSS styles
├── icons/                     # Extension icons
├── build/                     # Build output (generated)
├── build.js                   # esbuild build script
├── manifest.json              # Extension manifest (source)
├── package.json               # Project configuration
└── README.md
```

## How It Works

1. The extension runs on `https://meta.intra.42.fr/clusters*`
2. On page load, it injects a stats card into the left sidebar
3. It fetches cluster data from the 42 intra API
4. Active entries (where `end_at` is null) are filtered and deduplicated
5. Vacant seat counts are read from the existing sidebar DOM
6. Statistics are computed and rendered in the card
7. The data auto-refreshes every 30 seconds
8. A mutation observer ensures the card persists through SPA navigation

## Technical Notes

- Built with plain JavaScript (no frameworks)
- Uses Manifest V3
- CSS is inlined during build for single-file deployment
- Supports both Chrome/Edge and Firefox
- Guards against duplicate initialization
- HTML content is escaped to prevent XSS

## License

MIT