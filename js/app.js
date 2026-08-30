// Main App - Coordinator that brings all modules together
class JsonVisualizer {
  constructor() {
    // Initialize state
    this.state = {
      rootData: null,
      pathStack: [],
      view: 'formatted',
      unquoteKeys: false,
      minify: false
    };

    // Initialize modules
    this.parser = new JsonParser();
    this.utils = new Utils();
    this.filters = new Filters(this.utils);
    this.renderers = new Renderers(this.utils, this.filters);
    this.uiHandlers = new UIHandlers(this.state, this.parser, this.utils, this.filters, this.renderers);

    this.init();
  }

  init() {
    this.setupSampleData();
    this.uiHandlers.init();
    this.processInitialJson();
  }

  setupSampleData() {
    const jsonInput = document.getElementById('jsonInput');
    if (!jsonInput || jsonInput.value.trim() !== '') return;

    jsonInput.value = JSON.stringify({
      status: "success",
      code: 200,
      metadata: { page: 1, limit: 10, total: 50 },
      users: [
        {
          id: 101,
          name: "Alice",
          role: "Admin",
          profile: { title: "Lead Architect", department: "Engineering" },
          settings: { theme: "dark", notifications: true }
        },
        {
          id: 102,
          name: "Bob",
          role: "Developer",
          profile: { title: "Backend Engineer", department: "Infrastructure" },
          settings: { theme: "light", notifications: false }
        }
      ]
    }, null, 2);
  }

  processInitialJson() {
    const jsonInput = document.getElementById('jsonInput');
    if (!jsonInput) return;
    this.uiHandlers.onInputChange();
  }
}

// Initialize the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new JsonVisualizer();
});
