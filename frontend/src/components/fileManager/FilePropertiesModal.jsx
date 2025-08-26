import React, { useEffect, useState } from "react";

export default function FileEditor({ socket, file, currentPath, onClose }) {
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  // Build full file path
  const filePath = currentPath === "/" ? `/${file.name}` : `${currentPath}/${file.name}`;

  useEffect(() => {
    if (file) {
      socket.emit("sftp-fetch", filePath);
      socket.once("sftp-file", ({ content }) => {
        try {
          setContent(atob(content));
        } catch (err) {
          console.error("Decode error:", err);
          setContent("");
        }
      });
    }
  }, [file, filePath, socket]);

  const saveFile = () => {
    setSaving(true);
    const base64 = btoa(content);
    socket.emit("sftp-upload", { path: filePath, contentBase64: base64 });
    socket.once("file-action-result", () => {
      setSaving(false);
      onClose();
    });
  };

  if (!file) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
      <div className="bg-white p-4 rounded-xl shadow-lg w-[600px] h-[400px] flex flex-col">
        <h2 className="text-lg font-bold mb-3">Editing: {file.name}</h2>

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
