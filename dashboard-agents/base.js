/**
 * BaseAgent — 所有子智能体的基类
 *
 * 每个 agent 必须实现:
 *   id       — 唯一标识 (kebab-case)
 *   name     — 显示名称
 *   icon     — emoji 或 SVG path
 *   category — 类型: time | weather | news | stock | social | delivery | util
 *   interval — cron 表达式
 *   fetch()  — async fn 返回 { title, value, sub, detail? }
 */

class BaseAgent {
  constructor(id, config) {
    this.id = id;
    this.name = config.name || id;
    this.icon = config.icon || '📦';
    this.category = config.category || 'util';
    this.interval = config.interval || '*/3 * * * *'; // default every 3 min
    this.config = config;
    this.lastResult = null;
    this.lastRun = null;
    this.running = false;
    this._cronJob = null;
  }

  /** 由子类实现具体抓取逻辑 */
  async fetch() {
    throw new Error(`Agent ${this.id} must implement fetch()`);
  }

  /** 运行一次，返回结果或抛出异常 */
  async run() {
    if (this.running) return this.lastResult;
    this.running = true;
    try {
      this.lastResult = await this.fetch();
      this.lastRun = new Date();
      return this.lastResult;
    } catch (err) {
      console.warn(`[Agent ${this.id}] fetch failed:`, err.message);
      // 失败时保留上次结果
      return this.lastResult || {
        title: this.name,
        value: '—',
        sub: '获取失败',
        error: true,
      };
    } finally {
      this.running = false;
    }
  }

  /** 返回可序列化的状态对象 */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      icon: this.icon,
      category: this.category,
      interval: this.interval,
      lastRun: this.lastRun?.toISOString() || null,
      result: this.lastResult,
    };
  }
}

module.exports = BaseAgent;
