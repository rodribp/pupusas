'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { fetcher } from '@/lib/api';
import { Order, PupusaType, MENU, OrderItem, AddOns } from '@/lib/types';
import { io } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Minus, ShoppingCart, Clock, CheckCircle2, LogOut, Info, Trash2, Utensils } from 'lucide-react';

export default function WaiterDashboard() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState<'new' | 'ready'>('new');

  // New Order State
  const [customerName, setCustomerName] = useState('');
  const [notes, setNotes] = useState('');
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addOns, setAddons] = useState<AddOns>({loroco: false, ayote: false})
  const [togo, setTogo] = useState<boolean>(true)

  useEffect(() => {
    fetcher('/api/auth/me').catch(() => router.push('/'));

    const newSocket = io({ path: '/socket.io' });

    newSocket.on('orders:sync', (data: Order[]) => {
      setOrders(data);
    });

    newSocket.on('addOns:sync', (data: AddOns) => {
      setAddons(data);
    })

    newSocket.on('addOns:updated', (data: AddOns) => {
      setAddons(data);
    })

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

  const addToCart = (type: PupusaType, addOns: ('Loroco' | 'Ayote')[]) => {
    const existingItemIndex = cart.findIndex(
      item => item.type === type && JSON.stringify(item.addOns.sort()) === JSON.stringify(addOns.sort())
    );

    if (existingItemIndex >= 0) {
      const newCart = [...cart];
      newCart[existingItemIndex].quantity += 1;
      setCart(newCart);
    } else {
      setCart([...cart, {
        id: uuidv4(),
        type,
        quantity: 1,
        addOns,
        price: MENU[type]
      }]);
    }
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(cart.map(item => {
      if (item.id === id) {
        const newQuantity = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQuantity };
      }
      return item;
    }));
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const totalPupusas = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Calculate estimated time dynamically
  const pupusasInQueue = orders
    .filter(o => o.status === 'In queue')
    .reduce((sum, o) => sum + o.items.reduce((s, i) => s + i.quantity, 0), 0);
  const estimatedTime = (pupusasInQueue * 2) + (totalPupusas * 3);

  const submitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;

    setIsSubmitting(true);
    try {
      await fetcher('/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          customerName,
          togo,
          notes,
          items: cart,
          total: cartTotal
        })
      });
      setCart([]);
      setCustomerName('');
      setNotes('');
      setActiveTab('ready');
    } catch (error) {
      console.error(error);
      alert('Error al crear orden');
    } finally {
      setIsSubmitting(false);
    }
  };

  const markDelivered = async (id: string) => {
    try {
      await fetcher(`/api/orders/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'delivered' })
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleTogo = (togo: boolean) => {
    setTogo(togo);
  }

  const readyOrders = orders.filter(o => o.status === 'ready');
  const queueOrders = orders.filter(o => o.status === 'In queue');

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col">
      <header className="bg-white shadow-sm px-6 py-4 flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-stone-800">Mesero</h1>
          <div className="flex gap-2 bg-stone-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('new')}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${activeTab === 'new' ? 'bg-white shadow-sm text-emerald-600' : 'text-stone-500 hover:text-stone-700'}`}
            >
              Nueva Orden
            </button>
            <button
              onClick={() => setActiveTab('ready')}
              className={`px-4 py-2 rounded-md font-medium transition-colors flex items-center gap-2 ${activeTab === 'ready' ? 'bg-white shadow-sm text-emerald-600' : 'text-stone-500 hover:text-stone-700'}`}
            >
              Listas
              {readyOrders.length > 0 && (
                <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{readyOrders.length}</span>
              )}
            </button>
          </div>
        </div>
        <button onClick={handleLogout} className="text-stone-500 hover:text-stone-800 flex items-center gap-2">
          <LogOut className="w-5 h-5" />
          <span className="hidden sm:inline">Salir</span>
        </button>
      </header>

      <main className="flex-1 p-4 md:p-6 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-3 gap-6">
        {activeTab === 'new' ? (
          <>
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm">
                <h2 className="text-xl font-bold text-stone-800 mb-4">Menú</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {(Object.keys(MENU) as PupusaType[]).map((type) => (
                    <div key={type} className="border border-stone-200 p-4 rounded-xl hover:border-emerald-500 transition-colors">
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="font-semibold text-stone-800">{type}</h3>
                        <span className="text-emerald-600 font-medium">${MENU[type].toFixed(2)}</span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => addToCart(type, [])}
                          className="flex-1 bg-stone-100 hover:bg-stone-200 text-stone-800 py-2 rounded-lg text-sm font-medium transition-colors"
                        >
                          Normal
                        </button>
                        {addOns.loroco ? (
                        <button
                          onClick={() => addToCart(type, ['Loroco'])}
                          className="flex-1 bg-stone-100 hover:bg-stone-200 text-stone-800 py-2 rounded-lg text-sm font-medium transition-colors"
                          >
                          + Loroco
                        </button>) : ''}
                        {addOns.ayote ? (
                        <button
                          onClick={() => addToCart(type, ['Ayote'])}
                          className="flex-1 bg-stone-100 hover:bg-stone-200 text-stone-800 py-2 rounded-lg text-sm font-medium transition-colors"
                        >
                          + Ayote
                        </button>) : ''}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="lg:col-span-1">
              <div className="bg-white p-6 rounded-2xl shadow-sm sticky top-24">
                <h2 className="text-xl font-bold text-stone-800 mb-4 flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5" />
                  Orden Actual
                </h2>

                <form onSubmit={submitOrder} className="space-y-4">

                  <div className='flex flex-nowrap'>
                    {/* Llevar radio */}
                    <label className="flex items-center gap-3 cursor-pointer group p-2 pr-4 rounded-lg hover:bg-gray-200 transition-colors border border-transparent hover:border-gray-300">
                      <div className="relative flex items-center">
                        <input
                          type="radio"
                          name='togo'
                          checked={togo}
                          onChange={e => handleTogo(true)}
                          className="peer w-5 h-5 cursor-pointer appearance-none rounded border-2 border-gray-400 checked:border-blue-500 checked:bg-blue-500 transition-all"
                        />
                        {/* Custom Checkmark Icon */}
                        <svg
                          className="absolute w-5 h-5 pointer-events-none opacity-0 peer-checked:opacity-100 text-white fill-current p-1"
                          viewBox="0 0 20 20"
                        >
                          <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                        </svg>
                      </div>
                      <span className="text-gray-700 font-medium select-none group-hover:text-blue-500 transition-colors">
                        Para llevar
                      </span>
                    </label>

                    {/* Restaurante radio */}
                    <label className="flex items-center gap-3 cursor-pointer group p-2 pr-4 rounded-lg hover:bg-gray-200 transition-colors border border-transparent hover:border-gray-300">
                      <div className="relative flex items-center">
                        <input
                          type="radio"
                          name='togo'
                          checked={!togo}
                          onChange={e => handleTogo(false)}
                          className="peer w-5 h-5 cursor-pointer appearance-none rounded border-2 border-gray-400 checked:border-blue-500 checked:bg-blue-500 transition-all"
                        />
                        {/* Custom Checkmark Icon */}
                        <svg
                          className="absolute w-5 h-5 pointer-events-none opacity-0 peer-checked:opacity-100 text-white fill-current p-1"
                          viewBox="0 0 20 20"
                        >
                          <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                        </svg>
                      </div>
                      <span className="text-gray-700 font-medium select-none group-hover:text-blue-500 transition-colors">
                        En restaurante
                      </span>
                    </label>
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Nombre del cliente"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>

                  <div className="max-h-64 overflow-y-auto space-y-3 pr-2">
                    <AnimatePresence>
                      {cart.map((item) => (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="flex justify-between items-center bg-stone-50 p-3 rounded-xl"
                        >
                          <div className="flex-1">
                            <p className="font-medium text-stone-800 text-sm">{item.type}</p>
                            {item.addOns.length > 0 && (
                              <p className="text-xs text-stone-500">con {item.addOns.join(', ')}</p>
                            )}
                            <p className="text-emerald-600 font-medium text-sm">${(item.price * item.quantity).toFixed(2)}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center bg-white rounded-lg border border-stone-200">
                              <button type="button" onClick={() => updateQuantity(item.id, -1)} className="p-1 hover:bg-stone-100 rounded-l-lg text-stone-600">
                                <Minus className="w-4 h-4" />
                              </button>
                              <span className="w-8 text-center font-medium text-sm">{item.quantity}</span>
                              <button type="button" onClick={() => updateQuantity(item.id, 1)} className="p-1 hover:bg-stone-100 rounded-r-lg text-stone-600">
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>
                            <button type="button" onClick={() => removeFromCart(item.id)} className="text-red-400 hover:text-red-600 p-1">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    {cart.length === 0 && (
                      <p className="text-stone-500 text-center py-8 text-sm">No hay pupusas en la orden</p>
                    )}
                  </div>

                  <div>
                    <textarea
                      placeholder="Notas adicionales (opcional)"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none text-sm resize-none h-20"
                    />
                  </div>

                  <div className="border-t border-stone-100 pt-4 space-y-2">
                    <div className="flex justify-between text-stone-600 text-sm">
                      <span>Total pupusas:</span>
                      <span>{totalPupusas}</span>
                    </div>
                    {totalPupusas > 0 && (
                      <div className="flex justify-between text-amber-600 text-sm font-medium bg-amber-50 p-2 rounded-lg">
                        <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> Tiempo estimado:</span>
                        <span>~{estimatedTime} min</span>
                      </div>
                    )}
                    <div className="flex justify-between text-xl font-bold text-stone-800 pt-2">
                      <span>Total:</span>
                      <span>${cartTotal.toFixed(2)}</span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={cart.length === 0 || isSubmitting}
                    className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-stone-300 text-white rounded-xl font-bold transition-colors shadow-sm"
                  >
                    {isSubmitting ? 'Enviando...' : 'Enviar a Cocina'}
                  </button>
                </form>
              </div>
            </div>
          </>
        ) : (
          <div className="col-span-1 lg:col-span-3">
            <div className="bg-white p-6 rounded-2xl shadow-sm">
              <h2 className="text-xl font-bold text-stone-800 mb-6 flex items-center gap-2">
                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                Órdenes Listas para Entregar
              </h2>
              
              {readyOrders.length === 0 ? (
                <div className="text-center py-12 text-stone-500">
                  <Utensils className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p>No hay órdenes listas en este momento.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 items-start gap-6">
                  <AnimatePresence>
                    {readyOrders.map(order => (
                      <motion.div
                        key={order.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="border-2 border-emerald-500 rounded-2xl p-5 bg-emerald-50 relative overflow-hidden"
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="font-bold text-lg text-stone-800">{order.customerName ? order.customerName : 'Orden #' + (readyOrders.indexOf(order) + 1) }</h3>
                            <p className="text-xs text-stone-500 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                          <div className='flex flex-col gap-1 items-end'>
                            <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2 py-1 rounded-lg uppercase tracking-wider">
                              Lista
                            </span>
                            <span className="text-emerald-800 text-xs px-2 py-1 tracking-wider">
                              {order.togo ? 'Para llevar' : 'En restaurante'}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-2 mb-4">
                          {order.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between text-sm">
                              <span className="text-stone-700">
                                <span className="font-bold mr-2">{item.quantity}x</span>
                                {item.type} {item.addOns.length > 0 && `(+${item.addOns.join(', ')})`}
                              </span>
                              <span className="font-medium text-stone-800">${(item.price * item.quantity).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>

                        {order.notes && (
                          <div className="bg-white/60 p-2 rounded-lg text-sm text-stone-600 mb-4 flex items-start gap-2">
                            <Info className="w-4 h-4 mt-0.5 shrink-0" />
                            <p>{order.notes}</p>
                          </div>
                        )}

                        <div className="flex justify-between items-center pt-4 border-t border-emerald-200 mb-4">
                          <span className="font-bold text-stone-600">Total a cobrar:</span>
                          <span className="text-2xl font-black text-emerald-700">${order.total.toFixed(2)}</span>
                        </div>

                        <button
                          onClick={() => markDelivered(order.id)}
                          className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-colors shadow-sm flex items-center justify-center gap-2"
                        >
                          <CheckCircle2 className="w-5 h-5" />
                          Marcar como Entregada
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {queueOrders.length > 0 && (
              <div className="mt-8">
                <h3 className="text-lg font-bold text-stone-700 mb-4">Órdenes en Preparación ({queueOrders.length})</h3>
                <div className="flex gap-4 overflow-x-auto pb-4">
                  {queueOrders.map(order => (
                    <div key={order.id} className="min-w-[250px] bg-white border border-stone-200 rounded-xl p-4 shadow-sm opacity-70">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-bold text-stone-800">{order.customerName ? order.customerName : 'Orden #' + (queueOrders.indexOf(order) + 1)}</span>
                        <span className="text-xs text-amber-600 font-medium bg-amber-50 px-2 py-1 rounded-md">En cocina</span>
                      </div>
                      <p className="text-sm text-stone-500">{order.items.reduce((acc, item) => acc + item.quantity, 0)} pupusas</p>
                      <p className="text-sm text-stone-500">{order.togo ? 'Para llevar' : 'En restaurante'}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
