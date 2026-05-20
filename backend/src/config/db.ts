import mongoose from 'mongoose';
import { MONGODB_URI } from '../constants/env';

const connectToDatabase = async () => {
  try {
    await mongoose.connect(MONGODB_URI, {
      autoIndex: true
    });
    console.log('Connected to database');
  } catch (error) {
    console.error('Could not connect to database:', error);
    process.exit(1);
    //shutdown server if connection fails
  }
};

export default connectToDatabase;
