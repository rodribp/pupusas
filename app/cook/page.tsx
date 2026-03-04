'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { fetcher } from '@/lib/api';
import { Order, AddOns } from '@/lib/types';
import { io, Socket } from 'socket.io-client';
import { motion, AnimatePresence } from 'motion/react';
import { ChefHat, CheckCircle2, LogOut, Clock, AlertCircle } from 'lucide-react';

export default function CookDashboard() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [addOns, setAddOns] = useState<AddOns>({loroco: false, ayote: false})
  const [now, setNow] = useState(0);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(Date.now());
    const interval = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetcher('/api/auth/me').catch(() => router.push('/'));

    const newSocket = io({ path: '/socket.io' });

    newSocket.on('orders:sync', (data: Order[]) => {
      setOrders(data);
    });

    newSocket.on('addOns:sync', (data: AddOns) => {
      setAddOns(data);
    });

    newSocket.on('addOns:updated', (data: AddOns) => {
      setAddOns(data);
    });

    newSocket.on('order:created', (order: Order) => {
      setOrders(prev => [...prev, order]);
    });

    newSocket.on('order:updated', (updatedOrder: Order) => {
      setOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o));
    });

    return () => {
      newSocket.disconnect();
    };
  }, [router]);

  const handleLogout = async () => {
    await fetcher('/api/auth/logout', { method: 'POST' });
    router.push('/');
  };

  const markReady = async (id: string) => {
    try {
      await fetcher(`/api/orders/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'ready' })
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleToggle = async (addon: keyof typeof addOns) => {
    const newState = {
      ...addOns,
      [addon]: !addOns[addon]
    };
    
    setAddOns(newState);

    try {
      await fetcher('/api/addons', {
        method: 'PATCH',
        body: JSON.stringify(newState)
      });
    } catch (error) {
      console.error(error);
    }
  };

  const queueOrders = orders
    .filter(o => o.status === 'In queue')
    .sort((a, b) => a.createdAt - b.createdAt);

  return (
    <div className="min-h-screen bg-stone-900 text-stone-100 flex flex-col">
      <header className="bg-stone-950 px-6 py-4 flex justify-between items-center sticky top-0 z-10 border-b border-stone-800">
        <div className="flex items-center gap-4">
          <ChefHat className="w-8 h-8 text-amber-500" />
          <h1 className="text-2xl font-bold text-white tracking-wide">Cocina</h1>
          <div className="bg-stone-800 px-3 py-1 rounded-full text-sm font-medium text-amber-400 flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
            </span>
            {queueOrders.length} en cola
          </div>
          <div className="flex flex-wrap gap-4">
            {/* Loroco Checkbox */}
            <label className="flex items-center gap-3 cursor-pointer group p-2 pr-4 rounded-lg hover:bg-gray-700 transition-colors border border-transparent hover:border-gray-500">
              <div className="relative flex items-center">
                <input
                  type="checkbox"
                  checked={addOns.loroco}
                  onChange={() => handleToggle('loroco')}
                  className="peer w-5 h-5 cursor-pointer appearance-none rounded border-2 border-gray-400 checked:border-blue-500 checked:bg-blue-500 transition-all bg-stone-900"
                />
                {/* Custom Checkmark Icon */}
                <svg
                  className="absolute w-5 h-5 pointer-events-none opacity-0 peer-checked:opacity-100 text-white fill-current p-1"
                  viewBox="0 0 20 20"
                >
                  <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                </svg>
              </div>
              <span className="text-white font-medium select-none group-hover:text-blue-500 transition-colors">
                Loroco
              </span>
            </label>
            
            {/* Ayote Checkbox */}
            <label className="flex items-center gap-3 cursor-pointer group p-2 pr-4 rounded-lg hover:bg-gray-700 transition-colors border border-transparent hover:border-gray-500">
              <div className="relative flex items-center">
                <input
                  type="checkbox"
                  checked={addOns.ayote}
                  onChange={() => handleToggle('ayote')}
                  className="peer w-5 h-5 cursor-pointer appearance-none rounded border-2 border-gray-400 checked:border-blue-500 checked:bg-blue-500 transition-all bg-stone-900"
                />
                {/* Custom Checkmark Icon */}
                <svg
                  className="absolute w-5 h-5 pointer-events-none opacity-0 peer-checked:opacity-100 text-white fill-current p-1"
                  viewBox="0 0 20 20"
                >
                  <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                </svg>
              </div>
              <span className="text-white font-medium select-none group-hover:text-blue-500 transition-colors">
                Ayote
              </span>
            </label>
          </div>
        </div>
        <button onClick={handleLogout} className="text-stone-400 hover:text-white flex items-center gap-2 transition-colors">
          <LogOut className="w-6 h-6" />
        </button>
      </header>

      <main className="flex-1 p-6 overflow-x-auto">
        {queueOrders.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-stone-600">
            <ChefHat className="w-24 h-24 mb-6 opacity-20" />
            <h2 className="text-2xl font-medium">No hay órdenes pendientes</h2>
            <p className="text-stone-500 mt-2">¡Buen trabajo!</p>
          </div>
        ) : (
          <div className="flex gap-6 h-full items-start pb-8">
            <AnimatePresence>
              {queueOrders.map((order, index) => {
                const isNext = index === 0;
                const totalPupusas = order.items.reduce((sum, item) => sum + item.quantity, 0);
                const waitTime = Math.floor((now - order.createdAt) / 60000);
                const isDelayed = waitTime > order.estimatedTime;

                return (
                  <motion.div
                    key={order.id}
                    layout
                    initial={{ opacity: 0, x: 50, scale: 0.9 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
                    className={`min-w-[350px] max-w-[400px] rounded-3xl flex flex-col overflow-hidden shadow-2xl transition-all ${
                      isNext ? 'bg-stone-800 border-2 border-amber-500 ring-4 ring-amber-500/20' : 'bg-stone-800/50 border border-stone-700'
                    }`}
                  >
                    <div className={`p-5 ${isNext ? 'bg-amber-500/10' : 'bg-stone-800'}`}>
                      <div className="flex justify-between items-start mb-2">
                        <h3 className={`text-2xl font-black uppercase tracking-wider ${isNext ? 'text-amber-400' : 'text-white'}`}>
                          {order.customerName ? order.customerName : 'Orden #' + (queueOrders.indexOf(order) + 1)}
                        </h3>
                        <div className="flex items-center gap-2">
                          {isDelayed && (
                            <AlertCircle className="w-5 h-5 text-red-500 animate-pulse" />
                          )}
                          <span className={`text-sm font-bold px-2 py-1 rounded-lg flex items-center gap-1 ${
                            isDelayed ? 'bg-red-500/20 text-red-400' : 'bg-stone-700 text-stone-300'
                          }`}>
                            <Clock className="w-4 h-4" />
                            {waitTime}m
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 mt-4">
                        <span className="bg-stone-700 px-3 py-1 rounded-full text-sm font-bold text-white">
                          {totalPupusas} pupusas
                        </span>
                        <span className="bg-stone-700 px-3 py-1 rounded-full text-sm font-bold text-white">
                          {order.togo ? 'Para llevar' : 'En restaurante'} 
                        </span>
                        {isNext && (
                          <span className="bg-amber-500 text-stone-900 px-3 py-1 rounded-full text-sm font-black uppercase tracking-widest">
                            Preparando
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="p-5 flex-1 overflow-y-auto space-y-3">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="bg-stone-900/50 p-4 rounded-2xl border border-stone-700/50">
                          <div className="flex items-center gap-4">
                            <span className="text-3xl font-black text-amber-500 min-w-[2ch] text-center">
                              {item.quantity}
                            </span>
                            <div>
                              <p className="text-xl font-bold text-white leading-tight">{item.type}</p>
                              {item.addOns.length > 0 && (
                                <p className="text-amber-400 font-medium mt-1 flex items-center gap-2 text-sm uppercase tracking-wider">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                                  {item.addOns.join(', ')}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}

                      {order.notes && (
                        <div className="mt-4 bg-stone-700/30 p-4 rounded-2xl border border-stone-600/50">
                          <p className="text-sm font-bold text-stone-400 uppercase tracking-wider mb-1">Notas del mesero:</p>
                          <p className="text-white text-lg leading-snug">{order.notes}</p>
                        </div>
                      )}
                    </div>

                    <div className="p-5 bg-stone-900/50 mt-auto">
                      <button
                        onClick={() => markReady(order.id)}
                        className={`w-full py-6 rounded-2xl font-black text-2xl uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-3 ${
                          isNext 
                            ? 'bg-amber-500 hover:bg-amber-400 text-stone-900 shadow-[0_0_40px_rgba(245,158,11,0.3)]' 
                            : 'bg-stone-700 hover:bg-stone-600 text-white'
                        }`}
                      >
                        <CheckCircle2 className="w-8 h-8" />
                        ¡Orden Lista!
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </main>
    </div>
  );
}
