import redisClient from '../utils/redis';
import dbClient from '../utils/db';

const getStatus = (req, res) => {
  const isRedisAlive = redisClient.isAlive();
  const isDbAlive = dbClient.isAlive();
  return res.status(200).json({ redis: isRedisAlive, db: isDbAlive });
};

const getStats = async (req, res) => {
  try {
    const nbUsers = await dbClient.nbUsers();
    const nbFiles = await dbClient.nbFiles();
    return res.status(200).json({ users: nbUsers, files: nbFiles });
  } catch (err) {
    console.error(`Could not get stats from database: ${err}`);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export default { getStatus, getStats };
