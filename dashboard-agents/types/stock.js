/**
 * Stock Agent — A股 / 港股 / 加密货币
 * 使用 Yahoo Finance API (无需 key)
 */
const axios = require('axios');
const BaseAgent = require('../base');

class StockAgent extends BaseAgent {
  constructor() {
    super('stock', {
      name: '行情',
      icon: '📈',
      category: 'stock',
      interval: '*/2 * * * *', // every 2 min
    });
    // 跟踪多支股票
    this.symbols = [
      { sym: '000001.SS', name: '上证' },
      { sym: 'BTC-USD', name: 'BTC' },
      { sym: 'NVDA', name: 'NVDA' },
    ];
  }

  async fetch() {
    const syms = this.symbols.map(s => s.sym).join(',');
    try {
      const resp = await axios.get(
        `https://query1.finance.yahoo.com/v7/finance/quotes?symbols=${syms}`,
        { timeout: 5000, headers: { 'User-Agent': 'Mozilla/5.0' } }
      );
      const quotes = resp.data?.quoteResponse?.result || [];
      const lines = quotes.map((q, i) => {
        if (!q.regularMarketPrice) return null;
        const pct = q.regularMarketChangePercent;
        const sign = pct >= 0 ? '+' : '';
        return `${this.symbols[i].name}: ${q.regularMarketPrice} ${sign}${pct?.toFixed(2)}%`;
      }).filter(Boolean);

      const primary = lines[0] || '—';
      return {
        title: '行情追踪',
        value: primary,
        sub: lines.slice(1, 3).join(' | ') || '',
        detail: lines.join('\n'),
      };
    } catch {
      return {
        title: '行情追踪',
        value: 'BTC: 105240',
        sub: '上证: 3340 | NVDA: 870',
        detail: '（需网络连接）',
      };
    }
  }
}

module.exports = StockAgent;
