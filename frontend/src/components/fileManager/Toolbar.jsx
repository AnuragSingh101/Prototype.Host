import React, { useState } from "react";
import {
  FiMenu, FiArrowUp, FiRefreshCw, FiSearch,
  FiGrid, FiList, FiFilePlus, FiFolderPlus
} from "react-icons/fi";

export default function Toolbar({
  toggleSidebar, currentPath, pathSections, loading,
  searchQuery, setSearchQuery, navigate, loadDirectory,
  handleCreate, // new -> pass {type, name}
  handlePaste, clipboard,
  viewMode, setViewMode
}) {
  const [showPrompt, setShowPrompt] = useState(null); // "file" or "folder"
  const [name, setName] = useState("");

  const createItem = () => {
    if (!name.trim()) return;
    handleCreate(showPrompt, name);
    setShowPrompt(null);
    setName("");
  };

  return (
    <div className="flex items-center px-6 py-4 bg-white shadow-md border-b">
      {/* Sidebar toggle */}
      <button onClick={toggleSidebar} className="p-2 rounded-xl hover:bg-gray-100">
        <FiMenu size={22} />
      </button>

      {/* Title */}
      <div className="ml-4 font-bold text-xl text-blue-600">File Manager</div>

      {/* Search + nav + breadcrumbs */}
      <div className="ml-8 flex-1 flex items-center gap-3">
        <div className="relative w-64">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-3 py-2 border rounded-xl"
          />
        </div>

        <button onClick={() => navigate("..")} disabled={currentPath === "/"} className="p-2">
          <FiArrowUp size={20} />
        </button>
        <button onClick={() => loadDirectory(currentPath)} disabled={loading} className="p-2">
          <FiRefreshCw size={20} className={loading ? "animate-spin text-blue-500" : ""} />
        </button>

        {/* Breadcrumbs */}
        <nav className="flex gap-2 text-sm">
          {pathSections.map((crumb, idx) => (
            <React.Fragment key={crumb.path}>
              <button
                onClick={() => loadDirectory(crumb.path)}
                className={idx === pathSections.length - 1
                  ? "text-blue-700 font-bold"
                  : "text-blue-500 hover:underline"}
              >
                {crumb.label}
              </button>
              {idx < pathSections.length - 1 && <span>/</span>}
            </React.Fragment>
          ))}
        </nav>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button onClick={() => setShowPrompt("file")} className="p-2" title="New File">
          <FiFilePlus size={20} />
        </button>
        <button onClick={() => setShowPrompt("folder")} className="p-2" title="New Folder">
          <FiFolderPlus size={20} />
        </button>
        <button onClick={handlePaste} disabled={!clipboard.type} className="px-3 py-1 border rounded">
          Paste
        </button>
        <button onClick={() => setViewMode("list")} className="p-2" title="List View">
          <FiList />
        </button>
        <button onClick={() => setViewMode("grid")} className="p-2" title="Grid View">
          <FiGrid />
        </button>
      </div>

      {/* Modal Prompt */}
      {showPrompt && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 shadow w-80">
            <h2 className="text-md font-bold mb-3">
              Create {showPrompt === "file" ? "File" : "Folder"}
            </h2>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={`Enter ${showPrompt} name`}
              className="border p-2 w-full rounded mb-3"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowPrompt(null)}
                className="px-3 py-1 bg-gray-500 text-white rounded"
              >
                Cancel
              </button>
              <button
                onClick={createItem}
                className="px-3 py-1 bg-blue-600 text-white rounded"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
