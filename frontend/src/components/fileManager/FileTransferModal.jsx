import React, { useState } from "react";
import { io } from "socket.io-client";

const socket = io("http://localhost:3001");

export default function FileTransferModal({ isOpen, onClose, currentPath }) {
  const [file, setFile] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [uploading, setUploading] = useState(false);

  if (!isOpen) return null;

  // Upload handler
  const handleUpload = () => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result.split(",")[1];
      socket.emit("sftp-upload", {
        path: `${currentPath}/${file.name}`,
        content: base64,
      });
      setUploading(true);
    };
    reader.readAsDataURL(file);
  };

  // Download handler
  const handleDownload = (filePath) => {
    setDownloading(true);
    socket.emit("sftp-fetch", filePath);
    socket.once("sftp-file", ({ path, content }) => {
      const blob = new Blob([Uint8Array.from(atob(content), c => c.charCodeAt(0))]);
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = path.split("/").pop();
      link.click();
      setDownloading(false);
    });
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
      <div className="bg-white p-4 rounded-xl shadow-lg w-96">
        <h2 className="text-lg font-bold mb-3">File Transfer</h2>

        {/* Upload */}
        <input
          type="file"
          onChange={(e) => setFile(e.target.files[0])}
          className="mb-2"
        />
        <button
          onClick={handleUpload}
          className="px-4 py-2 bg-blue-600 text-white rounded"
          disabled={uploading}
        >
          {uploading ? "Uploading..." : "Upload"}
        </button>

        {/* Download Example */}
        <div className="mt-3">
          <button
            onClick={() => handleDownload(`${currentPath}/example.txt`)}
            className="px-4 py-2 bg-green-600 text-white rounded"
            disabled={downloading}
          >
            {downloading ? "Downloading..." : "Download example.txt"}
          </button>
        </div>

        <button
          onClick={onClose}
          className="mt-4 px-4 py-2 bg-gray-500 text-white rounded"
        >
          Close
        </button>
      </div>
    </div>
  );
}
