import { MongoClient } from 'mongodb';

class DBClient {
  constructor() {
    const host = process.env.DB_HOST || 'localhost';
    const port = process.env.DB_PORT || 27017;
    const database = process.env.DB_DATABASE || 'files_manager';
    const url = `mongodb://${host}:${port}`;

    this.client = new MongoClient(url, { useUnifiedTopology: true });
    this.dbName = database;

    this.client.connect()
      .then(() => {
        this.db = this.client.db(this.dbName);
        console.log('Connected successfully to MongoDB server');
      })
      .catch((err) => {
        console.error(`MongoDB connection error: ${err.message}`);
      });
  }

  isAlive() {
    return this.client.topology.isConnected();
  }

  async nbUsers() {
    try {
      return await this.db.collection('users').countDocuments();
    } catch (err) {
      console.error(`Error counting users: ${err.message}`);
      return null;
    }
  }

  async nbFiles() {
    try {
      return await this.db.collection('files').countDocuments();
    } catch (err) {
      console.error(`Error counting files: ${err.message}`);
      return null;
    }
  }
}

const dbClient = new DBClient();
export default dbClient;
