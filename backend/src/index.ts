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
      socket.data.userId = payload.userId;
      socket.data.role = payload.role;

      // Join user specific room for targeted notifications
      socket.join(`user:${payload.userId}`);

      const roleLower = String(payload.role).toLowerCase();
      if (roleLower === 'staff' || roleLower === 'admin' || roleLower === 'manager') {
        socket.join('staff');
      }
    }
  } catch (e) {}

  socket.on('support:join', async (conversationId: string, cb?: (ok: boolean) => void) => {
    const userId = socket.data.userId as string | undefined;
    const role = socket.data.role as string | undefined;
    try {
      if (!userId || !role) {
        cb?.(false);
        return;
      }

      const conv = await SupportConversationModel.findById(conversationId);
      if (!conv) {
        cb?.(false);
        return;
      }

      const isOwner = conv.user_id.toString() === userId;
      const normalizedRole = role.toLowerCase();
      const isStaff = normalizedRole === 'staff' || normalizedRole === 'admin';
      if (!isOwner && !isStaff) {
        cb?.(false);
        return;
      }

      await socket.join(`support:conversation:${conversationId}`);
      cb?.(true);
    } catch (e) {
      cb?.(false);
    }
  });
});

server.listen(PORT, async () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  await connectToDatabase();
});
