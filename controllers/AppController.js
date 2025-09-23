import redisClient from '../utils/redis';
import dbClient from '../utils/db';

const getStatus = (req, res) => {
  const isRedisAlive = redisClient.isAlive();
  const isDbAlive = dbClient.isAlive();
  if (isRedisAlive && isDbAlive) {
    return res.status(200).json({ redis: isRedisAlive, db: isDbAlive });
  }
  return res.status(404).json({ redis: isRedisAlive, db: isDbAlive });
};

const getStats = async (req, res) => {
  const nbUsers = await dbClient.nbUsers();
  const nbFiles = await dbClient.nbFiles();

  if (nbUsers && nbFiles) {
    return res.status(200).json({ users: nbUsers, files: nbFiles });
  }
  return res.status(404).json({ users: nbUsers, files: nbFiles });
};

export default { getStatus, getStats };
