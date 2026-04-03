/**
 * Clock Agent — 实时时钟，每 10 秒更新
 */

const BaseAgent = require('../base');

class ClockAgent extends BaseAgent {
  constructor() {
    super('clock', {
      name: '时钟',
      icon: '🕐',
      category: 'time',
      interval: '*/10 * * * * *', // every 10 seconds
    });
  }

  async fetch() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    const dateStr = now.toLocaleDateString('zh-CN', {
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    });
    return {
      title: '现在时间',
      value: timeStr,
      sub: dateStr,
      detail: null,
    };
  }
}

module.exports = ClockAgent;
