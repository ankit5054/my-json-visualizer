# JSON Visualizer

A lightweight, browser-based tool to explore and visualize JSON data in a structured table format — no dependencies, no build step.

🔗 **Live Demo:** [https://jsonviewer.iamankit.in/](https://jsonviewer.iamankit.in/)

## Features

- Paste any JSON and render it as a table instantly
- Drill down into nested objects and arrays with a single click
- Breadcrumb navigation to trace and jump back through nested paths
- Syntax-colored values (strings, numbers, booleans, nulls)
- Inline preview of nested objects without leaving the current view
- Dark theme with minimal scrollbars

## Usage

1. Paste your JSON into the left panel
2. Click **Render Table**
3. Click any **View Object →** or **Array[n] →** button to drill into nested data
4. Use the breadcrumb path at the top to navigate back

## Project Structure

```
my-json-visualizer/
├── index.html   # Markup
├── style.css    # Styles
├── app.js       # Logic
└── README.md
```

## Running Locally

Just open `index.html` in any browser — no server or install needed.
