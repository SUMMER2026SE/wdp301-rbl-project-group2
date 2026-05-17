import mongoose from 'mongoose';
import { MONGODB_URI } from '../constants/env';

const connectToDatabase = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to database');
  } catch (error) {
    console.log('Could not connect to database');
    process.exit(1);
    //shutdown server if connection fails
  }
};

export default connectToDatabase;
