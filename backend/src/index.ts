import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import http from 'http';
import { Server } from 'socket.io';
import { parse as parseCookie } from 'cookie';
import { APP_ORIGIN, PORT } from './constants/env';
import appRoutes from './routes';
import connectToDatabase from './config/db';
import { customResponse, errorHandler } from './middlewares';
import { verifyToken } from '@/utils/jwt';
import { SupportConversationModel } from '@/models';

const app = express();
//middleware
const allowedOrigins = [
  APP_ORIGIN,
  'https://fefoa.vercel.app',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
];

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(customResponse);
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//app routes
app.use('/api', appRoutes);

// error handler
app.use(errorHandler);

const server = http.createServer(app);

export const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST'],
  },
});

app.set('io', io);

io.on('connection', (socket) => {
  // Auth from cookie or bearer token for mobile clients.
  try {
    const rawCookie = socket.handshake.headers.cookie || '';
    const parsed = parseCookie(rawCookie);
    const authToken =
      typeof socket.handshake.auth?.accessToken === 'string' ? socket.handshake.auth.accessToken : undefined;
    const authHeader =
      typeof socket.handshake.headers.authorization === 'string' ? socket.handshake.headers.authorization : undefined;
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : undefined;
    const accessToken = authToken || bearerToken || parsed.accessToken || '';
    const { payload } = verifyToken(accessToken);
    if (payload) {
      socket.data.userId = payload.user_id;
      socket.data.role = payload.role;
      console.debug(`[Socket] Connected: userId=${payload.user_id} role=${payload.role} socketId=${socket.id}`);

      // Join user specific room for targeted notifications
      socket.join(`user:${payload.user_id}`);
      console.debug(`[Socket] Joined room: user:${payload.user_id}`);
    } else {
      console.debug(`[Socket] Connected UNAUTHENTICATED (no payload) socketId=${socket.id}`);
    }
  } catch (e) {
    console.debug(`[Socket] Auth error socketId=${socket.id}:`, (e as Error).message);
  }

  socket.on('support:join', async (conversationId: string, cb?: (ok: boolean) => void) => {
    const userId = socket.data.userId as string | undefined;
    const role = socket.data.role as string | undefined;
    console.debug(`[Socket] support:join conversationId=${conversationId} userId=${userId} role=${role}`);
    try {
      if (!userId || !role) {
        console.debug(`[Socket] join rejected: unauthenticated`);
        cb?.(false);
        return;
      }

      const conv = await SupportConversationModel.findById(conversationId);
      if (!conv) {
        console.debug(`[Socket] join rejected: conversation not found id=${conversationId}`);
        cb?.(false);
        return;
      }

      const isOwner = conv.user_id.toString() === userId;
      const isStaff = role === 'STAFF' || role === 'ADMIN';
      if (!isOwner && !isStaff) {
        console.debug(`[Socket] join rejected: not authorized userId=${userId} isOwner=${isOwner} isStaff=${isStaff}`);
        cb?.(false);
        return;
      }

      await socket.join(`support:conversation:${conversationId}`);
      console.debug(`[Socket] join SUCCESS room=support:conversation:${conversationId}`);
      cb?.(true);
    } catch (e) {
      console.debug(`[Socket] join error:`, (e as Error).message);
      cb?.(false);
    }
  });
});

server.listen(PORT, async () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  await connectToDatabase();
});
