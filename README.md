# SPheRe — Smart Phenotyping Research

A responsive dashboard website for the SPheRe project, displaying real-time environmental sensor data from Google Sheets using the CSV export method (works on GitHub Pages without CORS issues).

## How to Test Locally

Because the site uses **JSONP** to fetch data from Google Sheets, you need a local HTTP server — opening `index.html` directly from the file system (`file://`) will **not** work for the live data feed.

### Option 1: Python HTTP Server

```bash
# Python 3
python -m http.server 8000

# Then open http://localhost:8000 in your browser
```

### Option 2: VS Code Live Server

1. Install the **Live Server** extension (by Ritwick Dey).
2. Right-click `index.html` → **Open with Live Server**.

### Option 3: Any static server

```bash
npx serve .
# or
php -S localhost:8000
```

## How to Deploy to GitHub Pages

1. Push the four files (`index.html`, `styles.css`, `script.js`, `README.md`) to a GitHub repository.
2. Go to **Settings → Pages**.
3. Under **Source**, select `Deploy from a branch`.
4. Choose `main` (or `master`) branch and `/` (root) folder.
5. Click **Save**.
6. Your site will be live at `https://<username>.github.io/<repository>/` within a few minutes.

No build step or configuration required — the site works as-is on GitHub Pages.

## Google Sheet Data

The dashboard fetches sensor data from a **public Google Sheet** using the GViz JSONP endpoint (no API key needed).

**Important:** The Google Sheet must be **published to the web** for the data to load:

1. Open the sheet → **File → Share → Publish to web**.
2. Choose **Entire Document** or the specific sheet.
3. Click **Publish**.

If the sheet is unreachable (private, network issue), the dashboard falls back to embedded sample data and shows a yellow warning banner.

### Sensor Columns

| Column       | Metric        | Unit | Card Icon            |
|------------- |---------------|------|----------------------|
| `tempBME`    | Temperature   | °C   | `fa-temperature-low` |
| `humBME`     | Humidity      | %    | `fa-droplet`         |
| `pressBME`   | Pressure      | hPa  | `fa-gauge-high`      |
| `co2SGP`     | CO₂           | ppm  | `fa-wind`            |
| `tlsLUX`     | Light         | lux  | `fa-sun`             |

## File Structure

```
├── index.html      # Main page (all sections)
├── styles.css      # Full stylesheet (green palette, responsive)
├── script.js       # Data fetching (JSONP), Chart.js, auto-refresh, scroll spy
└── README.md       # This file
```

## Features

- **JSONP fetch** — works on GitHub Pages without CORS issues
- **Live dashboard** — metric cards, dual-axis line chart, data table
- **Auto-refresh** — polls the sheet every 5 minutes
- **Pulse animation** — cards pulse when values update
- **Scroll spy** — active nav section highlights as you scroll
- **Hamburger menu** — responsive navigation for mobile
- **Fallback data** — sample data when the sheet is unreachable
- **Soft green theme** — customisable via CSS variables

## Customisation

Edit the CSS variables in `styles.css` to change the palette:

```css
:root {
  --primary: #66BB6A;
  --primary-light: #81C784;
  --primary-dark: #2E7D32;
  --bg: #F5F9F5;
  /* … */
}
```

To use a different Google Sheet, change the `SHEET_ID` constant in `script.js`:

```javascript
const SHEET_ID = 'your-sheet-id-here';
```

## Dependencies (CDN)

| Library       | Purpose          |
|-------------- |------------------|
| Chart.js 4.4  | Interactive chart |
| Font Awesome 6| Icons             |
| Google Fonts  | Inter typeface    |

All loaded via CDN — no local install needed.
