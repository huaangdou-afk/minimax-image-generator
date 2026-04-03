/**
 * Weibo Hot Search Agent
 */
const axios = require('axios');
const cheerio = require('cheerio');
const BaseAgent = require('../base');

class WeiboAgent extends BaseAgent {
  constructor() {
    super('weibo', {
      name: '微博热搜',
      icon: '🔥',
      category: 'social',
      interval: '*/5 * * * *',
    });
  }

  async fetch() {
    try {
      const resp = await axios.get('https://s.weibo.com/top/summary', {
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Cookie': 'SUB=_2A25KLZGeRhPYPBM7lMW9yyrJwzkIHXVpOQjCrDV8PUNbmtAGLRHVkW9NT9MpC2u-Q0f0O6R0U8RitQEVgAqhVAw',
        },
        timeout: 8000,
      });
      const $ = cheerio.load(resp.data);
      const items = [];
      $('#pl_top_realtimehotlist .td-02 a').each((i, el) => {
        if (i >= 5) return;
        const text = $(el).text().trim().replace(/\s+/g, ' ');
        if (text) items.push(`${i + 1}. ${text}`);
      });

      if (items.length > 0) {
        return {
          title: '微博热搜',
          value: items[0].replace(/^\d+\.\s*/, ''),
          sub: items.slice(1, 4).join(' | '),
          detail: items.join('\n'),
        };
      }
      throw new Error('No weibo data');
    } catch {
      return {
        title: '微博热搜',
        value: '暂无数据',
        sub: '登录后查看完整热榜',
        detail: null,
      };
    }
  }
}

module.exports = WeiboAgent;
