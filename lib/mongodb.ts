import { MongoClient, Db } from 'mongodb';

const MONGO_URL = process.env.MONGO_URL || '';
const DB_NAME = process.env.DB_NAME || 'property_app';

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

export async function connectToDatabase(): Promise<{ client: MongoClient; db: Db }> {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  if (!MONGO_URL) {
    throw new Error('MONGO_URL environment variable is not set');
  }

  const client = new MongoClient(MONGO_URL);
  await client.connect();
  const db = client.db(DB_NAME);

  cachedClient = client;
  cachedDb = db;

  return { client, db };
}

export async function getDb(): Promise<Db> {
  const { db } = await connectToDatabase();
  return db;
}
