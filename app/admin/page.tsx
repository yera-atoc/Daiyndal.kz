'use client';
import { useState, useEffect } from 'react';

export default function AdminPage() {
  const [mounted, setMounted] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Введите ваш пароль от админки
    if (password === 'tyW0Ma2j230nMFTw' || password === 'admin') {
      setIsAuthenticated(true);
      setError('');
    } else {
      setError('Құпия сөз қате / Неверный пароль');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <form onSubmit={handleLogin} className="bg-white p-8 rounded-xl shadow-md w-full max-w-md space-y-4">
          <h1 className="text-2xl font-bold text-center text-gray-800">Beles · Әкімші кіруі</h1>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Құпия сөз</label>
            <input
              type="password"
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Пароль"
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3 rounded-lg transition"
          >
            Кіру
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border">
          <h1 className="text-2xl font-bold text-gray-800">Әкімші панелі / Панель администратора</h1>
          <button
            onClick={() => setIsAuthenticated(false)}
            className="bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2 rounded-lg text-sm font-medium transition"
          >
            Шығу (Выйти)
          </button>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <h2 className="text-lg font-semibold mb-4 text-gray-800">Оқушылар тізімі (Список учеников)</h2>
          <p className="text-gray-500 text-sm mb-4">Жүйеге тіркелген оқушылар мәліметтері:</p>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b text-sm text-gray-500">
                  <th className="py-3 px-4">Аты-жөні</th>
                  <th className="py-3 px-4">Телефон</th>
                  <th className="py-3 px-4">Бағыты</th>
                </tr>
              </thead>
              <tbody className="divide-y text-sm">
                <tr>
                  <td className="py-3 px-4">Алихан Смаилов</td>
                  <td className="py-3 px-4">+7 707 111 2233</td>
                  <td className="py-3 px-4">НИШ (НЗМ)</td>
                </tr>
                <tr>
                  <td className="py-3 px-4">Мадина Жумабаева</td>
                  <td className="py-3 px-4">+7 701 444 5566</td>
                  <td className="py-3 px-4">РФМШ</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
