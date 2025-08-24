import React, { useState } from 'react';
import ConnectionForm from './components/ConnectionForm';
import Dashboard from './components/Dashboard';
import { SshSessionProvider } from './hooks/useSshSession';

export default function App() {
  const [sshCredentials, setSshCredentials] = useState(null);

  const handleConnect = (creds) => {
    setSshCredentials(creds);
  };

  const handleDisconnect = () => {
    setSshCredentials(null);
  };

  return (
    <div className="h-screen bg-gray-100">
      {sshCredentials ? (
        <SshSessionProvider credentials={sshCredentials}>
          <Dashboard onDisconnect={handleDisconnect} />
        </SshSessionProvider>
      ) : (
        <ConnectionForm onConnect={handleConnect} />
      )}
    </div>
  );
}
