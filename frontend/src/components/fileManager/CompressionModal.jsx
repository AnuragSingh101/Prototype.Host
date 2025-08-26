import React, { useState } from "react";
import { io } from "socket.io-client";

const socket = io("http://localhost:3001");

export default function CompressionModal({ cwd, selected, isOpen, onClose }) {
  const [archiveName, setArchiveName] = useState("archive.tar.gz");

  if (!isOpen) return null;

  const handleCompress = () => {
    socket.emit("file-action", {
      action: "compress",
      payload: { cwd, archiveName, items: selected },
    });
  };

  const handleExtract = () => {
    socket.emit("file-action", {
      action: "extract",
      payload: { cwd, archives: selected },
    });
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
      <div className="bg-white p-4 rounded-xl shadow-lg w-96">
        <h2 className="text-lg font-bold mb-3">Compression / Extraction</h2>

        <input
          type="text"
          value={archiveName}
          onChange={(e) => setArchiveName(e.target.value)}
          className="border p-1 w-full mb-3"
        />

        <div className="flex gap-2">
          <button onClick={handleCompress} className="px-4 py-2 bg-blue-600 text-white rounded">
            Compress
          </button>
          <button onClick={handleExtract} className="px-4 py-2 bg-green-600 text-white rounded">
            Extract
          </button>
        </div>

        <button onClick={onClose} className="mt-3 px-4 py-2 bg-gray-500 text-white rounded">
          Close
        </button>
      </div>
    </div>
  );
}
