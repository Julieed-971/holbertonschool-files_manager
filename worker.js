import fs from 'fs';
import Queue from 'bull';
import { ObjectId } from 'mongodb';
import imageThumbnail from 'image-thumbnail';
import dbClient from './utils/db';

const fileQueue = new Queue('fileQueue', {
  redis: {
    host: '127.0.0.1',
    port: 6379,
  },
});

fileQueue.process(async (job) => {
  const { userId, fileId } = job.data;

  if (!fileId) {
    throw new Error('Missing fileId');
  }
  if (!userId) {
    throw new Error('Missing userId');
  }

  const filesCollection = dbClient.db.collection('files');
  const file = await filesCollection.findOne({
    _id: ObjectId(fileId),
    userId: ObjectId(userId),
  });

  if (!file) {
    throw new Error('File not found');
  }

  const filePath = file.localPath;
  const widths = [500, 250, 100];
  try {
    await Promise.all(
      widths.map(async (width) => {
        const thumbnail = await imageThumbnail(filePath, { width });
        const thumbnailPath = `${filePath}_${width}`;
        fs.writeFileSync(thumbnailPath, thumbnail);
      }),
    );
  } catch (err) {
    console.error(`Error while generating thumbnails for image: ${fileId}`, err);
  }
});
