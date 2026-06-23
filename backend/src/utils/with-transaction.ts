import mongoose, { ClientSession } from 'mongoose';

/**
 * Runs handler inside a MongoDB transaction (replica set).
 * Falls back to running WITHOUT a session on standalone instances
 * (catches "Transaction numbers are only allowed on a replica set member").
 */
const withTransaction = async <T>(handler: (session: ClientSession) => Promise<T>): Promise<T> => {
  const session = await mongoose.startSession();

  try {
    let result!: T;

    await session.withTransaction(async () => {
      result = await handler(session);
    });

    return result;
  } catch (error: any) {
    // Standalone MongoDB doesn't support transactions — fallback to no-session
    if (error?.codeName === 'IllegalOperation' || error?.code === 20) {
      console.warn('⚠ MongoDB standalone detected — running without transaction');
      return await handler(null as unknown as ClientSession);
    }
    throw error;
  } finally {
    session.endSession();
  }
};

export default withTransaction;
