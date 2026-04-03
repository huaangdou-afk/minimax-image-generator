/**
 * Countdown Agent — 倒计时（劳动节）
 */
const BaseAgent = require('../base');

class CountdownAgent extends BaseAgent {
  constructor() {
    super('countdown', {
      name: '倒计时',
      icon: '⏳',
      category: 'util',
      interval: '*/60 * * * *', // every minute
    });
    // 默认倒计时目标：2026 劳动节
    this.target = new Date('2026-05-01T00:00:00+08:00');
  }

  async fetch() {
    const now = new Date();
    const diff = this.target - now;
    if (diff <= 0) {
      return { title: '倒计时', value: '已到！', sub: '2026 劳动节', detail: null };
    }
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return {
      title: '距劳动节',
      value: `${d}天 ${h}时 ${m}分`,
      sub: this.target.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' }),
      detail: null,
    };
  }
}

module.exports = CountdownAgent;
