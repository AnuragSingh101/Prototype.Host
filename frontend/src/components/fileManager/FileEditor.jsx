import React, { useEffect, useState } from "react";

export default function FileEditor({ file, currentPath, socket, onClose }) {
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  if (!file) return null;

  const filePath = currentPath === "/" ? `/${file.name}` : `${currentPath}/${file.name}`;

  useEffect(() => {
    if (!socket || !file) return;
    socket.emit("sftp-fetch", filePath);

    const handler = ({ content }) => {
      setContent(atob(content));
    };

    socket.once("sftp-file", handler);

    return () => socket.off("sftp-file", handler);
  }, [file, filePath, socket]);

  const saveFile = () => {
    if (!socket || !file) return;
    setSaving(true);
    const base64 = btoa(content);

    socket.emit("sftp-upload", { path: filePath, contentBase64: base64 });

    const handler = (res) => {
      if (res.ok) {
        setSaving(false);
        onClose();
      } else {
        alert("Failed to save: " + (res.error?.message || "Unknown error"));
        setSaving(false);
      }
    };

    socket.once("sftp-upload-result", handler);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
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
