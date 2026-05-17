import mongoose from 'mongoose';
import { IApiResponse } from './src/types/dto/apiResponse.type';
import { IUser } from './src/types';
import { Role } from './src/types/user.type';

declare global {
  namespace Express {
    interface Request {
      userId: mongoose.Types.ObjectId;
      role: Role;
      sessionId: mongoose.Types.ObjectId;
    }

    interface Response {
      success<T>(
        status: number,
        options?: { data?: T; message?: string; [key: string]: any }
      ): this;

      error(
        status: number,
        options?: {
          message?: string;
          code?: string;
          details?: any;
          [key: string]: any;
        }
      ): this;
    }
  }
}

declare module 'socket.io' {
  interface Socket {
    user?: Omit<IUser, 'password'>;
    userId?: mongoose.Types.ObjectId;
  }
}

export {};
