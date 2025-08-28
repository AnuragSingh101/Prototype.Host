import React from "react";

export default function FilePropertiesModal({ file, currentPath, onClose, formatBytes }) {
  if (!file) return null;

  // Build full file path
  const filePath = currentPath === "/" ? `/${file.name}` : `${currentPath}/${file.name}`;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl shadow-lg w-[400px] flex flex-col gap-3">
        <h2 className="text-lg font-bold mb-2">Properties: {file.name}</h2>

        <div className="flex flex-col gap-1 text-sm">
          <div><strong>Path:</strong> {filePath}</div>
          <div><strong>Type:</strong> {file.type}</div>
          <div><strong>Size:</strong> {file.type === "directory" ? "-" : formatBytes(file.size)}</div>
          <div><strong>Owner:</strong> {file.owner}</div>
          <div><strong>Permissions:</strong> {file.permissions}</div>
          <div><strong>Modified:</strong> {new Date(file.modified).toLocaleString()}</div>
        </div>

        <div className="flex justify-end mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-500 text-white rounded"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
