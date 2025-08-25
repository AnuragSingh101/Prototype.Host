// src/components/fileManager/FileEditor.jsx
import React, { useEffect, useState } from "react";
import { Controlled as ControlledEditor } from "@monaco-editor/react"; // Monaco editor
// If you prefer CodeMirror instead, we can switch easily

const FileEditor = ({ socket, path, onClose }) => {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Load file content when editor opens
  useEffect(() => {
    if (!socket || !path) return;

    // Ask backend for file
    socket.emit("read-file", { path });

    // Receive file content
    socket.on("file-content", (data) => {
      if (data.ok) {
        setContent(data.content);
        setError(null);
      } else {
        setError(data.error || "Failed to load file");
      }
      setLoading(false);
    });

    // Cleanup listener
    return () => {
      socket.off("file-content");
    };
  }, [socket, path]);

  // Save file back to server
  const handleSave = () => {
    if (!socket) return;
    setSaving(true);

    socket.emit("save-file", { path, content });

    socket.on("file-saved", (data) => {
      setSaving(false);
      if (data.ok) {
        alert(`✅ File saved: ${path}`);
        onClose();
      } else {
        setError(data.error || "Failed to save file");
      }
    });
  };

  if (loading) return <div className="p-4">📂 Loading file...</div>;
  if (error) return <div className="p-4 text-red-600">❌ {error}</div>;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div className="bg-white w-4/5 h-4/5 rounded-xl shadow-lg flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 bg-gray-800 text-white rounded-t-xl">
          <span>Editing: {path}</span>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save"}
            </button>
            <button
              onClick={onClose}
              className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded"
            >
              Close
            </button>
          </div>
        </div>

        {/* Editor */}
        <div className="flex-1 overflow-hidden">
          <ControlledEditor
            height="100%"
            language="javascript" // we can later detect from file extension
            theme="vs-dark"
            value={content}
            onChange={(value) => setContent(value || "")}
          />
        </div>
      </div>
    </div>
  );
};

export default FileEditor;
