'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetcher } from '@/lib/api';
import { motion } from 'motion/react';
import { Utensils, ChefHat, Lock, Delete } from 'lucide-react';

export default function Home() {
  const [role, setRole] = useState<'waiter' | 'cook' | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (pin: string) => {
    setError('');
    try {
      await fetcher('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ role, pin }),
      });
      router.push(`/${role}`);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleKeyPress = (num: string) => {
    setError('');
    const newPin = '' + pin + num
    if (pin.length < 4) {
      setPin((prev) => prev + num);
    }

    if (newPin.length === 4) {
      handleLogin(newPin)
    }
  };

  const handleDelete = () => {
    setError('');
    setPin((prev) => prev.slice(0, -1));
  };

  return (
    <div className="min-h-screen bg-stone-100 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-stone-800 mb-2">Pupusería</h1>
          <p className="text-stone-500">Selecciona tu rol para continuar</p>
        </div>

        {!role ? (
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setRole('waiter')}
              className="flex flex-col items-center justify-center p-6 bg-stone-50 rounded-xl border-2 border-transparent hover:border-emerald-500 hover:bg-emerald-50 transition-all group"
            >
              <Utensils className="w-12 h-12 text-stone-400 group-hover:text-emerald-500 mb-4" />
              <span className="font-semibold text-stone-700 group-hover:text-emerald-600">Mesero</span>
            </button>
            <button
              onClick={() => setRole('cook')}
              className="flex flex-col items-center justify-center p-6 bg-stone-50 rounded-xl border-2 border-transparent hover:border-amber-500 hover:bg-amber-50 transition-all group"
            >
              <ChefHat className="w-12 h-12 text-stone-400 group-hover:text-amber-500 mb-4" />
              <span className="font-semibold text-stone-700 group-hover:text-amber-600">Cocinero</span>
            </button>
          </div>
        ) : (
          <form className="space-y-6">
            <div className="flex items-center justify-center mb-6">
              <div className="bg-stone-100 p-4 rounded-full">
                {role === 'waiter' ? (
                  <Utensils className="w-8 h-8 text-emerald-500" />
                ) : (
                  <ChefHat className="w-8 h-8 text-amber-500" />
                )}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2 text-center">
                PIN de Acceso
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                <input
                  type="password"
                  value={pin}
                  readOnly
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-stone-200 bg-stone-50 focus:ring-2 focus:ring-stone-500 focus:border-stone-500 outline-none transition-all text-2xl tracking-[0.5em] text-center cursor-default"
                  placeholder="••••"
                  maxLength={4}
                  required
                />
              </div>
            </div>

            {/* Custom Numeric Keypad */}
            <div className="grid grid-cols-3 gap-3">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleKeyPress(num.toString())}
                  className="py-4 text-2xl font-semibold bg-stone-50 rounded-xl border border-stone-100 hover:bg-stone-100 hover:border-stone-200 active:bg-stone-200 transition-colors text-stone-700"
                >
                  {num}
                </button>
              ))}
              <div /> {/* Empty space for layout */}
              <button
                type="button"
                onClick={() => handleKeyPress('0')}
                className="py-4 text-2xl font-semibold bg-stone-50 rounded-xl border border-stone-100 hover:bg-stone-100 hover:border-stone-200 active:bg-stone-200 transition-colors text-stone-700"
              >
                0
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="py-4 flex items-center justify-center bg-stone-50 rounded-xl border border-stone-100 hover:bg-stone-100 hover:border-stone-200 active:bg-stone-200 transition-colors text-stone-600"
              >
                <Delete className="w-7 h-7" />
              </button>
            </div>

            {error && (
              <p className="text-red-500 text-sm text-center font-medium bg-red-50 py-2 rounded-lg">{error}</p>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setRole(null);
                  setPin('');
                  setError('');
                }}
                className="flex-1 py-4 px-4 bg-stone-100 text-stone-700 rounded-xl font-medium hover:bg-stone-200 transition-colors"
              >
                Volver
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
}