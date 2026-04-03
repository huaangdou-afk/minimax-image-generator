/**
 * Weather Agent — 中国城市天气（和风天气 API）
 * 使用心知天气免费接口，无需 key
 */
const axios = require('axios');
const BaseAgent = require('../base');

class WeatherAgent extends BaseAgent {
  constructor() {
    super('weather', {
      name: '上海天气',
      icon: '🌤️',
      category: 'weather',
      interval: '*/5 * * * *', // every 5 min
    });
    this.city = '上海';
  }

  async fetch() {
    try {
      // 心知天气免费接口（可换成和风天气 key）
      const resp = await axios.get('https://api.seniverse.com/v3/weather/now.json', {
        params: {
          key: 'SENSERVER_KEY',
          location: this.city,
          language: 'zh-Hans',
          unit: 'c',
        },
        timeout: 5000,
      });
      const d = resp.data.results?.[0]?.now;
      if (!d) throw new Error('No weather data');

      const weatherEmoji = this._emoji(d.text);
      return {
        title: `${this.city} · ${d.text}`,
        value: `${d.temperature}°C`,
        sub: `体感 ${d.feels_like}°C  ·  ${d.wind_direction}${d.wind_scale}级`,
        detail: null,
        icon: weatherEmoji,
      };
    } catch {
      // Fallback: 模拟数据（无 key 时使用）
      return {
        title: '上海天气',
        value: '26°C',
        sub: '晴  ·  南风 3级',
        detail: '（需配置天气 API Key）',
      };
    }
  }

  _emoji(text) {
    const map = {
      '晴': '☀️', '多云': '⛅', '阴': '☁️',
      '小雨': '🌧️', '中雨': '🌧️', '大雨': '⛈️',
      '雷阵雨': '⛈️', '小雪': '🌨️', '雪': '❄️',
      '雾': '🌫️', '霾': '🌫️', '台风': '🌀',
    };
    return map[text] || '🌤️';
  }
}

module.exports = WeatherAgent;
