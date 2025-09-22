import redis from 'redis';
import { promisify } from 'util';

class RedisClient {
  constructor() {
    this.client = redis.createClient({
      host: '127.0.0.1',
      port: 6379,
    });

    this.client.on('error', (err) => {
      console.log(`Redis client not connected to the server: ${err.message}`);
    });

    this.getAsync = promisify(this.client.get).bind(this.client);
    this.setAsync = promisify(this.client.setex).bind(this.client);
    this.delAsync = promisify(this.client.del).bind(this.client);
  }

  isAlive() {
    return this.client.connected;
  }

  async get(key) {
    try {
      const value = await this.getAsync(key);
      return value;
    } catch (err) {
      console.error(`No value found for item ${key}. Error message: ${err}`);
      return null;
    }
  }

  async set(key, value, duration) {
    try {
      await this.setAsync(key, duration, value);
    } catch (err) {
      console.error(`Error when setting value ${value} for key ${key}. Error message: ${err}`);
    }
  }

  async del(key) {
    try {
      await this.delAsync(key);
    } catch (err) {
      console.error(`Error when trying to delete value at key ${key}. Error message: ${err}`);
    }
  }
}

const redisClient = new RedisClient();
export default redisClient;
