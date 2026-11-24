import React, { useState } from 'react';
import { Bell, UserPlus, UserMinus, Send, Radio } from 'lucide-react';

interface Subscriber {
  id: string;
  name: string;
  channel: 'email' | 'sms' | 'push';
  log: string[];
}

export const ObserverDemo: React.FC = () => {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([
    { id: 'sub_1', name: 'Alice (Email Listener)', channel: 'email', log: [] },
    { id: 'sub_2', name: 'Bob (SMS Listener)', channel: 'sms', log: [] },
  ]);

  const [broadcastMessage, setBroadcastMessage] = useState('New feature released: Class Diagram Editor!');

  const handleAddSubscriber = () => {
    const names = ['Charlie', 'Dana', 'Eve', 'Frank'];
    const channels: ('email' | 'sms' | 'push')[] = ['email', 'sms', 'push'];
    const id = `sub_${Date.now()}`;
    const name = `${names[Math.floor(Math.random() * names.length)]} (${channels[Math.floor(Math.random() * channels.length)].toUpperCase()})`;
    setSubscribers([...subscribers, { id, name, channel: 'email', log: [] }]);
  };

  const handleRemoveSubscriber = (id: string) => {
    setSubscribers(subscribers.filter((s) => s.id !== id));
  };

  const handleBroadcast = () => {
    if (!broadcastMessage.trim()) return;
    const time = new Date().toLocaleTimeString();
    setSubscribers((subs) =>
      subs.map((s) => ({
        ...s,
        log: [`[${time}] Received: "${broadcastMessage}"`, ...s.log.slice(0, 4)],
      }))
    );
  };

  return (
    <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Interactive Observer Demo: Event Broadcasting
            </h4>
            <p className="text-xs text-slate-500">
              Attach and detach subscribers to the Subject dynamically and broadcast state changes.
            </p>
          </div>
        </div>

        <button
          onClick={handleAddSubscriber}
          className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 transition"
        >
          <UserPlus className="w-3.5 h-3.5" /> Attach Observer
        </button>
      </div>

      {/* Publisher Controls */}
      <div className="flex gap-2">
        <input
          type="text"
          value={broadcastMessage}
          onChange={(e) => setBroadcastMessage(e.target.value)}
          placeholder="Type an announcement to broadcast..."
          className="flex-1 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
        />
        <button
          onClick={handleBroadcast}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition"
        >
          <Send className="w-3.5 h-3.5" />
          Broadcast to All
        </button>
      </div>

      {/* Active Subscribers List */}
      <div className="space-y-3">
        <div className="text-xs font-semibold text-slate-500">
          Active Attached Observers ({subscribers.length}):
        </div>

        {subscribers.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
            No active observers. Click "Attach Observer" to register subscribers.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {subscribers.map((sub) => (
              <div
                key={sub.id}
                className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Bell className="w-3.5 h-3.5 text-indigo-500" />
                    {sub.name}
                  </span>
                  <button
                    onClick={() => handleRemoveSubscriber(sub.id)}
                    className="text-[11px] font-semibold text-rose-500 hover:underline flex items-center gap-0.5"
                  >
                    <UserMinus className="w-3 h-3" /> Detach
                  </button>
                </div>

                <div className="bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-800 min-h-[60px] space-y-1 font-mono text-[10px]">
                  {sub.log.length === 0 ? (
                    <span className="text-slate-400 italic">Listening for updates...</span>
                  ) : (
                    sub.log.map((entry, idx) => (
                      <div key={idx} className="text-slate-600 dark:text-slate-300 truncate">
                        {entry}
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
