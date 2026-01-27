
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRoutes from './modules/auth/auth.routes.js';
import customerRoutes from './modules/customers/customer.routes.js';


const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());
app.use('/auth', authRoutes);
app.use('/api/agent/customers', customerRoutes);

export default app;
