import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Terminal from './Terminal';
import FileManager from './FileManager';
import ProcessManager from './ProcessManager'; // updated import
import { useSshSession } from '../hooks/useSshSession';

export default function Dashboard({ onDisconnect }) {
  const [activeFeature, setActiveFeature] = useState('terminal');
  const { credentials, connected, connecting, error, disconnect } = useSshSession();

  const handleDisconnect = () => {
    disconnect();
    onDisconnect();
  };

  const renderActiveFeature = () => {
    switch (activeFeature) {
      case 'terminal':
        return <Terminal />;
      case 'filemanager':
        return <FileManager />;
      case 'processmanager':     // updated case for renamed feature
        return <ProcessManager />;  // updated imported component
      default:
        return <Terminal />;
    }
  };

  return (
    <div className="h-screen flex bg-gray-100">
      {/* Sidebar */}
      <Sidebar
        activeFeature={activeFeature}
        setActiveFeature={setActiveFeature}
        connected={connected}
        connecting={connecting}
        credentials={credentials}
        onDisconnect={handleDisconnect}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div
                className={`w-3 h-3 rounded-full ${
                  connected
                    ? 'bg-green-500 shadow-green-500/50 shadow-md'
                    : connecting
                    ? 'bg-yellow-500 animate-pulse'
                    : 'bg-red-500'
                }`}
              ></div>
              <div>
                <h1 className="text-xl font-semibold text-gray-800 capitalize">
                  {activeFeature.replace('manager', ' Manager')}
                </h1>
                <p className="text-sm text-gray-500">
                  {connecting
                    ? 'Connecting...'
                    : connected
                    ? `Connected to ${credentials.host}`
                    : 'Disconnected'}
                </p>
              </div>
            </div>
            <button
              onClick={handleDisconnect}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200"
            >
              Disconnect
            </button>
          </div>
          {error && (
            <div className="mt-3 bg-red-50 border-l-4 border-red-500 text-red-700 p-3 rounded">
              <p className="text-sm">Error: {error}</p>
            </div>
          )}
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-hidden">{renderActiveFeature()}</main>
      </div>
    </div>
  );
}
