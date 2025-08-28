import React, { useState } from "react";

export default function CompressionModal({ cwd, selected, isOpen, onClose, socket, reloadDirectory }) {
  const [archiveName, setArchiveName] = useState("archive.tar.gz");
  const [processing, setProcessing] = useState(false);

  if (!isOpen) return null;

  const selectedArray = Array.isArray(selected) ? selected : Array.from(selected);

  const handleCompress = () => {
    if (!selectedArray.length) return alert("No files selected!");

    setProcessing(true);

    socket.emit("file-action", {
      action: "compress",
      payload: { cwd, archiveName, items: selectedArray },
    });

    socket.once("file-action-result", (res) => {
      setProcessing(false);
      if (res.ok) {
        alert("Compression successful!");
        reloadDirectory(cwd);
        onClose();
      } else {
        alert("Compression failed: " + (res.error?.message || "Unknown error"));
      }
    });
  };

  const handleExtract = () => {
    if (!selectedArray.length) return alert("No archives selected!");

    setProcessing(true);

    socket.emit("file-action", {
      action: "extract",
      payload: { cwd, archives: selectedArray },
    });

    socket.once("file-action-result", (res) => {
      setProcessing(false);
      if (res.ok) {
        alert("Extraction successful!");
        reloadDirectory(cwd);
        onClose();
      } else {
        alert("Extraction failed: " + (res.error?.message || "Unknown error"));
      }
    });
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white p-4 rounded-xl shadow-lg w-96">
        <h2 className="text-lg font-bold mb-3">Compression / Extraction</h2>

        <input
          type="text"
          value={archiveName}
          onChange={(e) => setArchiveName(e.target.value)}
          className="border p-1 w-full mb-3"
        />

        <div className="flex gap-2">
          <button
            onClick={handleCompress}
            className="px-4 py-2 bg-blue-600 text-white rounded"
            disabled={processing}
          >
            {processing ? "Processing..." : "Compress"}
          </button>
          <button
            onClick={handleExtract}
            className="px-4 py-2 bg-green-600 text-white rounded"
            disabled={processing}
          >
            {processing ? "Processing..." : "Extract"}
          </button>
        </div>

        <button
          onClick={onClose}
          className="mt-3 px-4 py-2 bg-gray-500 text-white rounded"
          disabled={processing}
        >
          Close
        </button>
      </div>
    </div>
  );
}
