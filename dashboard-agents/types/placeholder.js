/**
 * Placeholder Agent — 尚未实现的格子占位
 */
const BaseAgent = require('../base');

class PlaceholderAgent extends BaseAgent {
  constructor(id, name, icon, category) {
    super(id, { name, icon, category, interval: '0 * * * *' }); // never auto-run
  }

  async fetch() {
    return {
      title: this.name,
      value: '—',
      sub: '即将上线',
      detail: null,
      placeholder: true,
    };
  }
}

module.exports = PlaceholderAgent;
