import React, { useEffect, useState } from "react";
import { io } from "socket.io-client";

const socket = io("http://localhost:3001");

export default function FileEditor({ filePath, isOpen, onClose }) {
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && filePath) {
      socket.emit("sftp-fetch", filePath);
      socket.once("sftp-file", ({ content }) => {
        setContent(atob(content));
      });
    }
  }, [isOpen, filePath]);

  const saveFile = () => {
    setSaving(true);
    const base64 = btoa(content);
    socket.emit("sftp-upload", { path: filePath, content: base64 });
    socket.once("file-action-result", () => {
      setSaving(false);
      onClose();
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
      <div className="bg-white p-4 rounded-xl shadow-lg w-[600px] h-[400px] flex flex-col">
        <h2 className="text-lg font-bold mb-3">Editing: {filePath}</h2>

        <textarea
          className="flex-1 border p-2 font-mono text-sm"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />

        <div className="flex justify-end gap-2 mt-2">
          <button onClick={onClose} className="px-4 py-2 bg-gray-500 text-white rounded">
            Cancel
          </button>
          <button
            onClick={saveFile}
            className="px-4 py-2 bg-blue-600 text-white rounded"
            disabled={saving}
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
