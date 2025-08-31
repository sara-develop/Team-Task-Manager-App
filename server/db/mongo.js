// db/mongo.js
import mongoose from 'mongoose';

export const initMongo = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');
  } catch (err) {
    console.error('Mongo connection failed:', err.message);
    throw err;
  }
};
