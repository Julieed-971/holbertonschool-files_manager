import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { ObjectId } from 'mongodb';
import redisClient from '../utils/redis';
import dbClient from '../utils/db';

const postUpload = async (req, res) => {
  const xToken = req.headers['x-token'];
  if (!xToken) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const redisKey = `auth_${xToken}`;
  const currentConnectedUser = await redisClient.get(redisKey);

  if (!currentConnectedUser) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const files = dbClient.db.collection('files');
    const {
      name,
      type,
      parentId = 0,
      isPublic = false,
      data,
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Missing name' });
    }

    const acceptedType = ['folder', 'file', 'image'];
    if (!type || !acceptedType.includes(type)) {
      return res.status(400).json({ error: 'Missing type' });
    }

    if (!data && type !== 'folder') {
      return res.status(400).json({ error: 'Missing data' });
    }

    const parentIdQuery = parentId === 0 ? 0 : ObjectId(parentId);
    const newFile = {
      userId: ObjectId(currentConnectedUser),
      name,
      type,
      isPublic,
      parentId: parentIdQuery,
      localPath: null,
    };

    if (parentId !== 0) {
      const filePresentInDb = await files.findOne({ _id: parentIdQuery });
      if (!filePresentInDb) {
        return res.status(400).json({ error: 'Parent not found' });
      }
      if (filePresentInDb.type !== 'folder') {
        return res.status(400).json({ error: 'Parent is not a folder' });
      }
    }

    if (type === 'folder') {
      const insertedFile = await files.insertOne(newFile);
      return res.status(201).json({
        id: insertedFile.insertedId,
        userId: newFile.userId,
        name: newFile.name,
        type: newFile.type,
        isPublic: newFile.isPublic,
        parentId: newFile.parentId,
      });
    }

    if (type === 'file' || type === 'image') {
      const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';
      fs.mkdirSync(folderPath, { recursive: true });

      const fileUUID = uuidv4();
      const localPath = `${folderPath}/${fileUUID}`;
      const buffer = Buffer.from(data, 'base64');

      fs.writeFileSync(localPath, buffer);

      newFile.localPath = localPath;
      const insertedFile = await files.insertOne(newFile);
      return res.status(201).json({
        id: insertedFile.insertedId,
        userId: newFile.userId,
        name: newFile.name,
        type: newFile.type,
        isPublic: newFile.isPublic,
        parentId: newFile.parentId,
      });
    }
    return res.status(400).json({ error: 'Invalid request' });
  } catch (err) {
    console.error(`Could not create file in database: ${err}`);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export default { postUpload };
