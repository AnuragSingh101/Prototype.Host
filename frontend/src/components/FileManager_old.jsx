import React, { useState, useEffect, useRef } from "react";
import {
  FiMenu, FiFolder, FiFile, FiLink2, FiArrowUp, FiRefreshCw,
  FiEdit2, FiTrash2, FiCopy, FiScissors, FiInfo, FiLock,
  FiSearch, FiGrid, FiList, FiPlus, FiUpload
} from "react-icons/fi";
import { useSshSession } from "../hooks/useSshSession";

export default function FileManager({ toggleSidebar }) {
  const { sessionReady, socket } = useSshSession();
  const [currentPath, setCurrentPath] = useState("/");
  const [files, setFiles] = useState([]);
  const [filteredFiles, setFilteredFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("list"); // list/grid
  const [sortBy, setSortBy] = useState("name");
  const [selected, setSelected] = useState(new Set());
  const [clipboard, setClipboard] = useState({ type: null, files: [] });
  const [ctx, setCtx] = useState({ visible: false, x: 0, y: 0, target: null });

  const ctxRef = useRef();

  // ---- Socket listeners ----
  // File: src/components/fileManager/FileManager.jsx
useEffect(() => {
  if (!socket) return;

  socket.on("directory-data", (data) => {
    console.log("Directory data received:", data);
    setLoading(false);
    if (data.ok) {
      setFiles(data.items);
    } else {
      console.error("Directory load error:", data.error?.message || data.error);
    }
  });

  socket.on("file-action-result", (data) => {
    if (data.ok) loadDirectory(currentPath);
    else alert("Error: " + (data.error?.message || data.error));
  });

  // 🔹 Load root directory on first mount
  loadDirectory("/");

  return () => {
    socket.off("directory-data");
    socket.off("file-action-result");
  };
}, [socket]);



  // ---- Context menu cleanup ----
  useEffect(() => {
    const onClick = (e) => {
      if (ctx.visible && ctxRef.current && !ctxRef.current.contains(e.target)) {
        setCtx((c) => ({ ...c, visible: false, target: null }));
      }
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [ctx.visible]);

  // ---- Load directory ----
  const loadDirectory = (path) => {
    setLoading(true);
    socket.emit("list-directory", { path });
  };

  // ---- Filters & Sorting ----
  useEffect(() => {
    let sorted = [...files];
    if (sortBy === "size") sorted.sort((a, b) => b.size - a.size);
    if (sortBy === "date") sorted.sort((a, b) => new Date(b.modified) - new Date(a.modified));
    const lower = searchQuery.toLowerCase();
    setFilteredFiles(sorted.filter((f) => f.name.toLowerCase().includes(lower)));
  }, [files, sortBy, searchQuery]);

  // ---- Path navigation ----
  const navigate = (name) => {
    let next = "/";
    if (name !== "..") {
      next = currentPath === "/" ? `/${name}` : `${currentPath}/${name}`;
    } else if (currentPath !== "/") {
      const arr = currentPath.split("/").filter(Boolean);
      arr.pop();
      next = arr.length ? "/" + arr.join("/") : "/";
    }
    setCurrentPath(next);
    loadDirectory(next);
  };

  // ---- Selection ----
  const toggleSelect = (name) => {
    setSelected((prev) => {
      const newSet = new Set(prev);
      newSet.has(name) ? newSet.delete(name) : newSet.add(name);
      return newSet;
    });
  };

  const clearSelect = () => setSelected(new Set());

  // ---- File actions ----
  const doAction = (action, payload) => {
    socket.emit("file-action", { action, ...payload });
  };

  const handleBulkDelete = () => {
    if (!window.confirm(`Delete ${selected.size} items?`)) return;
    doAction("delete", {
      paths: Array.from(selected).map((n) =>
        currentPath === "/" ? `/${n}` : `${currentPath}/${n}`
      ),
    });
    clearSelect();
  };

  const handleRename = (oldName, newName) => {
    doAction("rename", {
      oldPath: currentPath === "/" ? `/${oldName}` : `${currentPath}/${oldName}`,
      newPath: currentPath === "/" ? `/${newName}` : `${currentPath}/${newName}`,
    });
  };

  const handleNewFolder = () => {
    const name = prompt("New folder name:");
    if (name) doAction("create-folder", { path: `${currentPath}/${name}` });
  };

  const handlePaste = () => {
    if (!clipboard.type) return;
    doAction(clipboard.type === "cut" ? "move" : "copy", {
      sources: clipboard.files,
      destination: currentPath,
    });
    if (clipboard.type === "cut") setClipboard({ type: null, files: [] });
  };

  // ---- Helpers ----
  const formatBytes = (b) => {
    if (!b || isNaN(b)) return "-";
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(b) / Math.log(1024));
    return `${(b / Math.pow(1024, i)).toFixed(i ? 1 : 0)} ${sizes[i]}`;
  };

  const pathSections =
    currentPath === "/"
      ? [{ label: "/", path: "/" }]
      : [
          { label: "/", path: "/" },
          ...currentPath
            .split("/")
            .filter(Boolean)
            .map((seg, i, arr) => ({
              label: seg,
              path: "/" + arr.slice(0, i + 1).join("/"),
            })),
        ];

  // ---- UI ----
  if (!sessionReady) {
    return (
      <div className="flex h-full items-center justify-center text-gray-900 text-xl">
        Connecting...
      </div>
    );
  }

  return (
    <div className="relative flex flex-col h-full bg-gradient-to-br from-white to-gray-100">
      {/* Toolbar */}
      <div className="flex items-center px-6 py-4 bg-white shadow-md border-b">
        <button onClick={toggleSidebar} className="p-2 rounded-xl hover:bg-gray-100">
          <FiMenu size={22} />
        </button>
        <div className="ml-4 font-bold text-xl text-blue-600">File Manager</div>

        <div className="ml-8 flex-1 flex items-center gap-3">
          {/* Search */}
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

          {/* Navigation */}
          <button onClick={() => navigate("..")} disabled={currentPath === "/"} className="p-2">
            <FiArrowUp size={20} />
          </button>
          <button onClick={() => loadDirectory(currentPath)} disabled={loading} className="p-2">
            <FiRefreshCw size={20} className={loading ? "animate-spin text-blue-500" : ""} />
          </button>

          {/* Breadcrumb */}
          <nav className="flex gap-2 text-sm">
            {pathSections.map((crumb, idx) => (
              <React.Fragment key={crumb.path}>
                <button
                  onClick={() => {
                    setCurrentPath(crumb.path);
                    loadDirectory(crumb.path);
                  }}
                  className={`px-2 ${
                    idx === pathSections.length - 1
                      ? "text-blue-700 font-bold"
                      : "text-blue-500 hover:underline"
                  }`}
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
          <button onClick={handleNewFolder} className="p-2">
            <FiPlus />
          </button>
          <button onClick={handlePaste} disabled={!clipboard.type} className="p-2">
            Paste
          </button>
          <button onClick={() => setViewMode("list")} className="p-2">
            <FiList />
          </button>
          <button onClick={() => setViewMode("grid")} className="p-2">
            <FiGrid />
          </button>
        </div>
      </div>

      {/* File list */}
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="text-center text-gray-600">Loading...</div>
        ) : filteredFiles.length === 0 ? (
          <div className="text-center text-gray-600">No files</div>
        ) : (
          <table className="w-full text-left border">
            <thead>
              <tr>
                <th></th>
                <th>Name</th>
                <th>Size</th>
                <th>Owner</th>
                <th>Permissions</th>
                <th>Modified</th>
              </tr>
            </thead>
            <tbody>
              {currentPath !== "/" && (
                <tr onClick={() => navigate("..")} className="cursor-pointer">
                  <td></td>
                  <td colSpan={5}>.. (Parent Directory)</td>
                </tr>
              )}
              {filteredFiles.map((f, i) => (
                <tr key={i} className="hover:bg-gray-50 cursor-pointer">
                  <td>
                    <input
                      type="checkbox"
                      checked={selected.has(f.name)}
                      onChange={() => toggleSelect(f.name)}
                    />
                  </td>
                  <td onClick={() => f.type === "directory" && navigate(f.name)}>
                    {f.type === "directory" ? (
                      <FiFolder className="inline text-yellow-600" />
                    ) : f.type === "symlink" ? (
                      <FiLink2 className="inline text-green-600" />
                    ) : (
                      <FiFile className="inline text-blue-600" />
                    )}{" "}
                    {f.name}
                  </td>
                  <td>{f.type === "directory" ? "-" : formatBytes(f.size)}</td>
                  <td>{f.owner}</td>
                  <td>{f.permissions}</td>
                  <td>{new Date(f.modified).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
