import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { ObjectId } from 'mongodb';
import redisClient from '../utils/redis';
import dbClient from '../utils/db';

const getAuthenticatedUserId = async (req) => {
  const xToken = req.headers['x-token'];
  if (!xToken) {
    return null;
  }
  const redisKey = `auth_${xToken}`;
  const userId = await redisClient.get(redisKey);
  return userId || null;
};

const postUpload = async (req, res) => {
  const currentConnectedUserId = await getAuthenticatedUserId(req);
  if (!currentConnectedUserId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const filesCollection = dbClient.db.collection('files');
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

    const newFile = {
      userId: ObjectId(currentConnectedUserId),
      name,
      type,
      isPublic,
      parentId: parentId === 0 ? 0 : ObjectId(parentId),
      localPath: null,
    };

    if (parentId !== 0) {
      const filePresentInDb = await filesCollection.findOne({ _id: ObjectId(parentId) });
      if (!filePresentInDb) {
        return res.status(400).json({ error: 'Parent not found' });
      }
      if (filePresentInDb.type !== 'folder') {
        return res.status(400).json({ error: 'Parent is not a folder' });
      }
    }

    if (type === 'folder') {
      const insertedFile = await filesCollection.insertOne(newFile);
      return res.status(201).json({
        id: insertedFile.insertedId.toString(),
        userId: newFile.userId.toString(),
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
      const insertedFile = await filesCollection.insertOne(newFile);
      return res.status(201).json({
        id: insertedFile.insertedId.toString(),
        userId: newFile.userId.toString(),
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

const getShow = async (req, res) => {
  const currentConnectedUserId = await getAuthenticatedUserId(req);
  if (!currentConnectedUserId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  let userFile;
  try {
    const fileId = ObjectId(req.params.id);
    const query = {
      _id: fileId,
      userId: ObjectId(currentConnectedUserId),
    };

    const filesCollection = dbClient.db.collection('files');
    userFile = await filesCollection.findOne(query);
    if (!userFile) {
      return res.status(404).json({ error: 'Not found' });
    }
    return res.status(200).json({
      id: userFile._id.toString(),
      userId: userFile.userId.toString(),
      name: userFile.name,
      type: userFile.type,
      isPublic: userFile.isPublic,
      parentId: userFile.parentId === '0' || userFile.parentId === 0
        ? 0
        : userFile.parentId.toString(),
    });
  } catch (err) {
    console.error(`Could not get user file in database: ${err}`);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const getIndex = async (req, res) => {
  const currentConnectedUserId = await getAuthenticatedUserId(req);
  if (!currentConnectedUserId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const parentIdQuery = req.query.parentId || '0';
  const page = parseInt(req.query.page, 10) || 0;

  try {
    const filesCollection = dbClient.db.collection('files');
    const pipeline = [
      {
        $match: {
          userId: ObjectId(currentConnectedUserId),
          parentId: parentIdQuery === '0' || parentIdQuery === 0 ? 0 : ObjectId(parentIdQuery),
        },
      },
      { $skip: page * 20 },
      { $limit: 20 },
    ];

    const userFiles = await filesCollection.aggregate(pipeline).toArray();

    const result = userFiles.map((doc) => ({
      id: doc._id.toString(),
      userId: doc.userId.toString(),
      name: doc.name,
      type: doc.type,
      isPublic: doc.isPublic,
      parentId: doc.parentId === 0 || doc.parentId === '0' ? 0 : doc.parentId.toString(),
    }));
    return res.status(200).json(result);
  } catch (err) {
    console.error(`Could not get user files in database: ${err}`);
    return res.status(500).json([]);
  }
};

const putPublish = async (req, res) => {
  const currentConnectedUserId = await getAuthenticatedUserId(req);
  if (!currentConnectedUserId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const parameterDocId = ObjectId(req.params.id);
    const userId = ObjectId(currentConnectedUserId);
    const filesCollection = dbClient.db.collection('files');

    const file = await filesCollection.findOne({
      _id: parameterDocId,
      userId,
    });

    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }

    await filesCollection.updateOne(
      { _id: parameterDocId, userId },
      { $set: { isPublic: true } },
    );

    const updatedFile = await filesCollection.findOne({
      _id: parameterDocId,
      userId,
    });

    return res.status(200).json({
      id: updatedFile._id.toString(),
      userId: updatedFile.userId.toString(),
      name: updatedFile.name,
      type: updatedFile.type,
      isPublic: updatedFile.isPublic,
      parentId: updatedFile.parentId === '0' || updatedFile.parentId === 0
        ? 0
        : updatedFile.parentId.toString(),
    });
  } catch (err) {
    console.error(`Could not publish file: ${err}`);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const putUnpublish = async (req, res) => {
  const currentConnectedUserId = await getAuthenticatedUserId(req);
  if (!currentConnectedUserId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const parameterDocId = ObjectId(req.params.id);
    const userId = ObjectId(currentConnectedUserId);
    const filesCollection = dbClient.db.collection('files');

    const file = await filesCollection.findOne({
      _id: parameterDocId,
      userId,
    });

    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }

    await filesCollection.updateOne(
      { _id: parameterDocId, userId },
      { $set: { isPublic: false } },
    );

    const updatedFile = await filesCollection.findOne({
      _id: parameterDocId,
      userId,
    });

    return res.status(200).json({
      id: updatedFile._id.toString(),
      userId: updatedFile.userId.toString(),
      name: updatedFile.name,
      type: updatedFile.type,
      isPublic: updatedFile.isPublic,
      parentId: updatedFile.parentId === '0' || updatedFile.parentId === 0
        ? 0
        : updatedFile.parentId.toString(),
    });
  } catch (err) {
    console.error(`Could not unpublish file: ${err}`);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export default {
  postUpload, getShow, getIndex, putPublish, putUnpublish,
};
