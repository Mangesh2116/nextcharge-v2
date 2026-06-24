const { createClient } = require('redis');
const logger = require('../utils/logger');

let client;

const connectRedis = async () => {
  client = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });

  client.on('error', (err) => logger.error('Redis error:', err));
  client.on('connect', () => logger.info('✅ Redis connected'));
  client.on('reconnecting', () => logger.warn('Redis reconnecting...'));

  await client.connect();
  return client;
};

const getRedis = () => {
  if (!client) throw new Error('Redis not initialized');
  return client;
};

const memoryCache = new Map();

// Helper wrappers
const setCache = async (key, value, ttlSeconds = 300) => {
  if (client) {
    try {
      await client.setEx(key, ttlSeconds, JSON.stringify(value));
      return;
    } catch (_) {}
  }
  const expiresAt = Date.now() + ttlSeconds * 1000;
  memoryCache.set(key, { value, expiresAt });
};

const getCache = async (key) => {
  if (client) {
    try {
      const data = await client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (_) {}
  }
  const cached = memoryCache.get(key);
  if (!cached) return null;
  if (Date.now() > cached.expiresAt) {
    memoryCache.delete(key);
    return null;
  }
  return cached.value;
};

const deleteCache = async (key) => {
  if (client) {
    try {
      await client.del(key);
      return;
    } catch (_) {}
  }
  memoryCache.delete(key);
};

const deleteCachePattern = async (pattern) => {
  if (!client) return; // 🔥 prevent crash
  const keys = await client.keys(pattern);
  if (keys.length) await client.del(keys);
};

module.exports = { connectRedis, getRedis, setCache, getCache, deleteCache, deleteCachePattern };
