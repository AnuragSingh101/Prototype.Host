import React from "react";
import {
  FiMenu, FiArrowUp, FiRefreshCw, FiSearch,
  FiPlus, FiGrid, FiList
} from "react-icons/fi";

export default function Toolbar({
  toggleSidebar, currentPath, pathSections, loading,
  searchQuery, setSearchQuery, navigate, loadDirectory,
  handleNewFolder, handlePaste, clipboard,
  viewMode, setViewMode
}) {
  return (
    <div className="flex items-center px-6 py-4 bg-white shadow-md border-b">
      <button onClick={toggleSidebar} className="p-2 rounded-xl hover:bg-gray-100">
        <FiMenu size={22} />
      </button>
      <div className="ml-4 font-bold text-xl text-blue-600">File Manager</div>

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

      <div className="flex gap-2">
        <button onClick={handleNewFolder} className="p-2"><FiPlus /></button>
        <button onClick={handlePaste} disabled={!clipboard.type} className="p-2">Paste</button>
        <button onClick={() => setViewMode("list")} className="p-2"><FiList /></button>
        <button onClick={() => setViewMode("grid")} className="p-2"><FiGrid /></button>
      </div>
    </div>
  );
}
