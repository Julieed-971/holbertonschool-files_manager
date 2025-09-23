import sha1 from 'sha1';
import dbClient from '../utils/db';

const postNew = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Missing email' });
    }
    if (!password) {
      return res.status(400).json({ error: 'Missing password' });
    }

    const foundUser = await dbClient.db.collection('users').findOne({ email });
    if (foundUser) {
      return res.status(400).json({ error: 'Already exist' });
    }
    const hashedPassword = sha1(password);

    const newUser = await dbClient.db.collection('users').insertOne({
      email,
      password: hashedPassword,
    });

    return res.status(201).json({ id: newUser.insertedId, email });
  } catch (err) {
    console.error(`Could not create user in database: ${err}`);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export default { postNew };
