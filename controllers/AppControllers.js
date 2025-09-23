// Inside the folder controllers, create a file AppController.js
//  that contains the definition of the 2 endpoints:

//     GET /status should return if Redis is alive and
// if the DB is alive too by using the
// 2 utils created previously: { "redis": true, "db": true }
// with a status code 200

//     GET /stats should return the number of users and files in DB:
//  { "users": 12, "files": 1231 } with a status code 200
//         users collection must be used for counting all users
//         files collection must be used for counting all files

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
