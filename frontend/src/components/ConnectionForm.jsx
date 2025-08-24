import React from 'react';
import useSshConnection from '../hooks/useSshConnection';

export default function ConnectionForm({ onConnect }) {
  const {
    formData,
    usePrivateKey,
    handleChange,
    toggleAuth,
    validate,
    getCredentials,
  } = useSshConnection();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    // Pass credentials object that matches backend API expectation
    onConnect(getCredentials());
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-500 to-indigo-600 flex flex-col">
      <header className="text-center py-8 bg-white/10 backdrop-blur-md border-b border-white/20">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-2 drop-shadow-lg">
          SSH Web Terminal
        </h1>
        <p className="text-xl text-white/90">
          Connect to remote servers via SSH in your browser
        </p>
      </header>

      <form
        onSubmit={handleSubmit}
        className="max-w-lg mx-auto mt-8 p-8 bg-white/95 backdrop-blur-md rounded-xl shadow-2xl space-y-6"
      >
        <div>
          <label htmlFor="host" className="block text-sm font-medium text-gray-700">
            Hostname or IP Address *
          </label>
          <input
            id="host"
            name="host"
            value={formData.host}
            onChange={handleChange}
            className="w-full mt-1 p-3 border rounded-lg focus:ring-blue-500 focus:border-blue-500"
            placeholder="example.com or 192.168.1.100"
            required
          />
        </div>

        <div>
          <label htmlFor="port" className="block text-sm font-medium text-gray-700">
            Port
          </label>
          <input
            id="port"
            name="port"
            type="number"
            value={formData.port}
            onChange={handleChange}
            className="w-full mt-1 p-3 border rounded-lg focus:ring-blue-500 focus:border-blue-500"
            placeholder="22"
            min="1"
            max="65535"
          />
        </div>

        <div>
          <label htmlFor="username" className="block text-sm font-medium text-gray-700">
            Username *
          </label>
          <input
            id="username"
            name="username"
            value={formData.username}
            onChange={handleChange}
            className="w-full mt-1 p-3 border rounded-lg focus:ring-blue-500 focus:border-blue-500"
            placeholder="root"
            required
          />
        </div>

        <div className="flex items-center space-x-2 bg-gray-50 p-4 rounded-lg border">
          <input
            id="toggleKey"
            type="checkbox"
            checked={usePrivateKey}
            onChange={toggleAuth}
            className="h-5 w-5 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="toggleKey" className="text-sm font-medium text-gray-700">
            Use Private Key Authentication
          </label>
        </div>

        {!usePrivateKey ? (
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password *
            </label>
            <input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              className="w-full mt-1 p-3 border rounded-lg focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter your password"
              required={!usePrivateKey}
            />
          </div>
        ) : (
          <div>
            <label htmlFor="privateKey" className="block text-sm font-medium text-gray-700">
              Private Key *
            </label>
            <textarea
              id="privateKey"
              name="privateKey"
              rows="6"
              value={formData.privateKey}
              onChange={handleChange}
              className="w-full mt-1 p-3 border rounded-lg focus:ring-blue-500 focus:border-blue-500 font-mono resize-vertical"
              placeholder="-----BEGIN RSA PRIVATE KEY-----…"
              required={usePrivateKey}
            />
          </div>
        )}

        <button
          type="submit"
          className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-purple-700"
        >
          Connect to SSH
        </button>
      </form>
    </div>
  );
}
