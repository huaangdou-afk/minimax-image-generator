/**
 * News Agent — 知乎/微博热搜
 */
const axios = require('axios');
const cheerio = require('cheerio');
const BaseAgent = require('../base');

class NewsAgent extends BaseAgent {
  constructor() {
    super('news', {
      name: '热点新闻',
      icon: '📰',
      category: 'news',
      interval: '*/5 * * * *', // every 5 min
    });
  }

  async fetch() {
    try {
      const resp = await axios.get('https://www.zhihu.com/hot', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Accept': 'text/html',
        },
        timeout: 8000,
      });
      const $ = cheerio.load(resp.data);
      const items = [];
      $('[data-za-detail-view-path="Answer"]').slice(0, 5).each((i, el) => {
        const title = $(el).find('h2').first().text().trim() ||
                      $(el).find('.HotItem-title').first().text().trim();
        if (title) items.push(`${i + 1}. ${title}`);
      });

      if (items.length > 0) {
        return {
          title: '知乎热榜',
          value: items[0].replace(/^\d+\.\s*/, '').slice(0, 30) + '…',
          sub: items.slice(1, 4).join(' | ').slice(0, 60),
          detail: items.join('\n'),
        };
      }
      throw new Error('No news items found');
    } catch {
      return {
        title: '热点新闻',
        value: '暂无数据',
        sub: '请检查网络连接',
        detail: null,
      };
    }
  }
}

module.exports = NewsAgent;
