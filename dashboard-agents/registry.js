/**
 * Agent Registry — 16 个默认格子智能体
 */

const ClockAgent = require('./types/clock');
const WeatherAgent = require('./types/weather');
const NewsAgent = require('./types/news');
const StockAgent = require('./types/stock');
const WeiboAgent = require('./types/weibo');
const CountdownAgent = require('./types/countdown');
const PlaceholderAgent = require('./types/placeholder');

const registry = [
  new ClockAgent(),
  new WeatherAgent(),
  new StockAgent(),
  new NewsAgent(),
  new WeiboAgent(),
  new CountdownAgent(),
  // 剩余格子：待扩展
  new PlaceholderAgent('delivery', '外卖状态', '🛵', 'delivery'),
  new PlaceholderAgent('kids', '孩子轨迹', '🎒', 'util'),
  new PlaceholderAgent('horoscope', '星座运势', '✨', 'social'),
  new PlaceholderAgent('air-quality', '空气质量', '💨', 'weather'),
  new PlaceholderAgent('lottery', '彩票开奖', '🎰', 'util'),
  new PlaceholderAgent('sports', '体育赛事', '⚽', 'news'),
  new PlaceholderAgent('crypto', '加密行情', '🪙', 'stock'),
  new PlaceholderAgent('tasks', '待办事项', '📝', 'util'),
  new PlaceholderAgent('sysinfo', '系统信息', '💻', 'util'),
];

module.exports = registry;
