import React from 'react';

const sidebarItems = [
  {
    id: 'terminal',
    name: 'Terminal',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    id: 'filemanager',
    name: 'File Manager',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
      </svg>
    ),
  },
  {
    id: 'processmanager',  // updated id
    name: 'Process Manager', // updated name
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
  },
];

export default function Sidebar({ activeFeature, setActiveFeature, connected, connecting, credentials }) {
  return (
    <div className="w-64 bg-[#1a202c] text-white flex flex-col h-screen">
      {/* Logo/Header */}
      <div className="p-6 border-b border-[#2d3748]">
        <h2 className="text-xl font-bold text-teal-400">SSH Dashboard</h2>
        <p className="text-sm text-gray-400 mt-1">
          {credentials ? `${credentials.username}@${credentials.host}` : 'Not connected'}
        </p>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {sidebarItems.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => setActiveFeature(item.id)}
                disabled={!connected}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors duration-200 ${
                  activeFeature === item.id
                    ? 'bg-teal-600 text-white'
                    : connected
                    ? 'text-gray-400 hover:bg-[#2d3748] hover:text-teal-400'
                    : 'text-gray-600 cursor-not-allowed'
                }`}
              >
                {item.icon}
                <span className="font-medium">{item.name}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Status */}
      <div className="p-4 border-t border-[#2d3748]">
        <div className="flex items-center space-x-2">
          <div
            className={`w-2.5 h-2.5 rounded-full ${
              connected
                ? 'bg-green-500'
                : connecting
                ? 'bg-yellow-500 animate-pulse'
                : 'bg-red-500'
            }`}
          />
          <span className="text-sm text-gray-400">
            {connecting ? 'Connecting...' : connected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>
    </div>
  );
}
