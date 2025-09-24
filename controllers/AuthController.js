import { v4 as uuidv4 } from 'uuid';
import sha1 from 'sha1';
import redisClient from '../utils/redis';
import dbClient from '../utils/db';

const getConnect = async (req, res) => {
  try {
    const authorizationHeader = req.headers.authorization;
    if (!authorizationHeader || !authorizationHeader.startsWith('Basic ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const userCredentials = Buffer.from(authorizationHeader.split(' ')[1], 'base64').toString('utf-8').split(':');
    const email = userCredentials[0];
    const password = userCredentials[1];

    if (!email || !password) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const hashedPassword = sha1(password);
    const isRegisteredUser = await dbClient.db.collection('users').findOne({ email });
    if (!isRegisteredUser) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const isPasswordCorrect = hashedPassword === isRegisteredUser.password ? true : null;
    if (!isPasswordCorrect) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const randToken = uuidv4();
    const userId = isRegisteredUser._id;
    const redisKey = `auth_${randToken}`;

    await redisClient.set(redisKey, userId.toString(), 86400); // 86400 seconds = 24 hours)
    return res.status(200).json({ token: randToken });
  } catch (err) {
    console.error(`Could not connect user: ${err}`);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const getDisconnect = async (req, res) => {
  const xToken = req.headers['x-token'];
  if (!xToken) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const redisKey = `auth_${xToken}`;
  const currentConnectedUser = await redisClient.get(redisKey);
  if (!currentConnectedUser) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  await redisClient.del(redisKey);
  return res.status(204).end();
};

export default { getConnect, getDisconnect };
