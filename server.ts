import express from 'express';
import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server } from 'socket.io';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import rateLimit from 'express-rate-limit';
import { Order, OrderItem, OrderStatus, PupusaType } from './lib/types';

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

const port = process.env.PORT || 3000;

const JWT_SECRET = process.env.JWT_SECRET || 'pupuseria-secret-key-123';
const WAITER_PIN = process.env.WAITER_PIN || '1234';
const COOK_PIN = process.env.COOK_PIN || '5678';

// In-memory store
let orders: Order[] = [];
let addOns: {loroco: boolean, ayote: boolean} = {loroco: true, ayote: true}

app.prepare().then(() => {
  const server = express();
  
  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Limit each IP to 1000 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
  });
  
  server.use(limiter);
  server.use(cors());
  server.use(express.json());
  server.use(cookieParser());

  const httpServer = createServer(server);
  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  // Auth Middleware
  const authenticate = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
    if (!token) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      (req as any).user = decoded;
      next();
    } catch (err) {
      res.status(401).json({ error: 'Invalid token' });
    }
  };

  // API Routes
  server.post('/api/auth/login', (req, res) => {
    const { role, pin } = req.body;
    
    if (role === 'waiter' && pin === WAITER_PIN) {
      const token = jwt.sign({ role: 'waiter' }, JWT_SECRET, { expiresIn: '12h' });
      res.cookie('token', token, { httpOnly: true, secure: !dev, sameSite: 'lax' });
      res.json({ token, role });
    } else if (role === 'cook' && pin === COOK_PIN) {
      const token = jwt.sign({ role: 'cook' }, JWT_SECRET, { expiresIn: '12h' });
      res.cookie('token', token, { httpOnly: true, secure: !dev, sameSite: 'lax' });
      res.json({ token, role });
    } else {
      res.status(401).json({ error: 'Invalid PIN' });
    }
  });

  server.post('/api/auth/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ success: true });
  });

  server.get('/api/auth/me', authenticate, (req, res) => {
    res.json({ user: (req as any).user });
  });

  server.get('/api/orders', authenticate, (req, res) => {
    res.json(orders);
  });

  server.post('/api/orders', authenticate, (req, res) => {
    if ((req as any).user.role !== 'waiter') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const { customerName, notes, togo, items, total } = req.body;
    
    // Calculate estimated time: 3 mins per pupusa + 5 mins base if queue exists
    const totalPupusas = items.reduce((sum: number, item: OrderItem) => sum + item.quantity, 0);
    const pupusasInQueue = orders
      .filter(o => o.status === 'In queue')
      .reduce((sum, o) => sum + o.items.reduce((s, i) => s + i.quantity, 0), 0);
    
    const estimatedTime = (pupusasInQueue * 2) + (totalPupusas * 3);

    const newOrder: Order = {
      id: uuidv4(),
      customerName,
      togo,
      notes,
      items,
      total,
      status: 'In queue',
      createdAt: Date.now(),
      estimatedTime
    };

    orders.push(newOrder);
    io.emit('order:created', newOrder);
    res.status(201).json(newOrder);
  });

  server.patch('/api/addons', authenticate, (req, res) => {
    if ((req as any).user.role !== 'cook') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    addOns = req.body

    io.emit('addOns:updated', addOns);
  })

  server.patch('/api/orders/:id/status', authenticate, (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    const orderIndex = orders.findIndex(o => o.id === id);
    if (orderIndex === -1) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    // Only cooks can mark as ready, waiters can mark as delivered
    const userRole = (req as any).user.role;
    if (status === 'ready' && userRole !== 'cook') {
      res.status(403).json({ error: 'Only cooks can mark orders as ready' });
      return;
    }
    if (status === 'delivered' && userRole !== 'waiter') {
      res.status(403).json({ error: 'Only waiters can mark orders as delivered' });
      return;
    }

    orders[orderIndex].status = status;
    io.emit('order:updated', orders[orderIndex]);
    res.json(orders[orderIndex]);
  });

  // Socket.io
  io.on('connection', (socket) => {
    console.log('Client connected');
    socket.emit('orders:sync', orders);
    socket.emit('addOns:sync', addOns);

    socket.on('disconnect', () => {
      console.log('Client disconnected');
    });
  });

  // Next.js handler
  server.all(/.*/, (req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  httpServer.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
  });
});
