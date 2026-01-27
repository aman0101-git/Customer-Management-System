import express from 'express';
import cors from 'cors';
import authRoutes from './modules/auth/auth.routes.js';

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));
app.use(express.json());
app.use('/auth', authRoutes);

export default app;
