import React, { useState, useEffect } from "react";
import { useSshSession } from "../../hooks/useSshSession";
import Toolbar from "./Toolbar";
import FileTable from "./FileTable";
import FileTransferModal from "./FileTransferModal";
import FileEditor from "./FileEditor";
import FilePropertiesModal from "./FilePropertiesModal";
import CompressionModal from "./CompressionModal";
import ContextMenu from "./ContextMenu";
import Sidebar from "./Sidebar";

export default function FileManagerPanel({ toggleSidebar }) {
  const { sessionReady, socket } = useSshSession();
  const [currentPath, setCurrentPath] = useState("/");
  const [files, setFiles] = useState([]);
  const [filteredFiles, setFilteredFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("list");
  const [sortBy, setSortBy] = useState("name");
  const [selected, setSelected] = useState(new Set());
  const [clipboard, setClipboard] = useState({ type: null, files: [] });

  // Context menu
  const [ctx, setCtx] = useState({ visible: false, x: 0, y: 0, file: null });

  // Modals
  const [showTransfer, setShowTransfer] = useState(null);
  const [showEditor, setShowEditor] = useState(null);
  const [showProps, setShowProps] = useState(null);
  const [showCompression, setShowCompression] = useState(null);

  const [favorites, setFavorites] = useState([]);

  // Socket listeners
  useEffect(() => {
  if (!socket) return;

  // Handle directory listing
  socket.on("directory-data", (data) => {
    setLoading(false);
    if (data.ok) {
      setFiles(data.items);
    } else {
      console.error("Directory load error:", data.error?.message || data.error);
    }
  });

  // Handle file actions (create, delete, rename, etc.)
  socket.on("file-action-result", (data) => {
    if (data.ok) {
      // ✅ Prefer backend cwd if provided, fallback to currentPath
      const reloadPath = data.cwd || currentPath;
      setCurrentPath(reloadPath);
      loadDirectory(reloadPath);
    } else {
      alert("Error: " + (data.error?.message || data.error));
    }
  });

  // ✅ Always load currentPath when it changes (auto-refresh on navigation)
  if (currentPath) {
    setLoading(true);
    loadDirectory(currentPath);
  }

  return () => {
    socket.off("directory-data");
    socket.off("file-action-result");
  };
}, [socket, currentPath]);



  // Load directory
  const loadDirectory = (path) => {
    setLoading(true);
    socket.emit("list-directory", { path });
  };

  // Sorting + Filtering
  useEffect(() => {
    let sorted = [...files];
    if (sortBy === "size") sorted.sort((a, b) => b.size - a.size);
    if (sortBy === "date") sorted.sort((a, b) => new Date(b.modified) - new Date(a.modified));
    const lower = searchQuery.toLowerCase();
    setFilteredFiles(sorted.filter((f) => f.name.toLowerCase().includes(lower)));
  }, [files, sortBy, searchQuery]);

  // Navigation
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

  // Selection
  const toggleSelect = (name) => {
    setSelected((prev) => {
      const newSet = new Set(prev);
      newSet.has(name) ? newSet.delete(name) : newSet.add(name);
      return newSet;
    });
  };

  // Actions
const doAction = (action, payload) => {
  socket.emit("file-action", { action, payload });   // ✅ wrap payload
};


  const handleRename = (oldName, newName) => {
  doAction("rename", {
    from: currentPath === "/" ? `/${oldName}` : `${currentPath}/${oldName}`,
    to: currentPath === "/" ? `/${newName}` : `${currentPath}/${newName}`,
  });
};


  const handleAction = (action, file) => {
    switch (action) {
      case "edit":
        setShowEditor(file);
        break;
      case "properties":
        setShowProps(file);
        break;
      case "download":
        setShowTransfer(file);
        break;
      case "rename":
        const newName = prompt("Enter new name:", file.name);
        if (newName && newName !== file.name) handleRename(file.name, newName);
        break;
      case "delete":
        if (window.confirm(`Delete ${file.name}?`)) {
          doAction("delete", {
            paths: [currentPath === "/" ? `/${file.name}` : `${currentPath}/${file.name}`],
          });
        }
        break;
      case "compress":
        setShowCompression(file);
        break;
      default:
        break;
    }
  };

  const handleCreate = (type, name) => {
    const fullPath = currentPath === "/" ? `/${name}` : `${currentPath}/${name}`;
    if (type === "file") {
      doAction("create-file", { path: fullPath });
    } else if (type === "folder") {
      doAction("create-folder", { path: fullPath });
    }
  };

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

  if (!sessionReady) {
    return (
      <div className="flex h-full items-center justify-center text-gray-900 text-xl">
        Connecting...
      </div>
    );
  }

  return (
    <div className="relative flex flex-row h-full bg-gradient-to-br from-white to-gray-100">
      {/* Sidebar */}
      <Sidebar
        favorites={favorites}
        setFavorites={setFavorites}
        onNavigate={(p) => {
          setCurrentPath(p);
          loadDirectory(p);
        }}
      />

      {/* Main Panel */}
      <div className="flex flex-col flex-1">
        <Toolbar
          toggleSidebar={toggleSidebar}
          currentPath={currentPath}
          pathSections={pathSections}
          loading={loading}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          navigate={navigate}
          loadDirectory={loadDirectory}
          clipboard={clipboard}
          viewMode={viewMode}
          setViewMode={setViewMode}
          onUpload={() => setShowTransfer(true)}
          handleCreate={handleCreate}   // ✅ fixed
        />

        <FileTable
          currentPath={currentPath}
          filteredFiles={filteredFiles}
          selected={selected}
          toggleSelect={toggleSelect}
          navigate={navigate}
          formatBytes={formatBytes}
          loading={loading}
          onRightClick={(file, x, y) =>
            setCtx({ visible: true, x, y, file })
          }
        />
      </div>

      {/* Context Menu */}
      <ContextMenu ctx={ctx} setCtx={setCtx} onAction={handleAction} />

      {/* Modals */}
      {showTransfer && (
        <FileTransferModal
          socket={socket}
          currentPath={currentPath}
          file={showTransfer}
          onClose={() => setShowTransfer(null)}
        />
      )}

      {showEditor && (
        <FileEditor
          file={showEditor}
          currentPath={currentPath}
          socket={socket}
          onClose={() => setShowEditor(null)}
        />
      )}

      {showProps && (
        <FilePropertiesModal
          file={showProps}
          currentPath={currentPath}
          formatBytes={formatBytes}
          onClose={() => setShowProps(null)}
        />
      )}

      {showCompression && (
        <CompressionModal
          socket={socket}
          cwd={currentPath}
          selected={selected}
          isOpen={true}
          reloadDirectory={loadDirectory}
          onClose={() => setShowCompression(null)}
        />
      )}
    </div>
  );
}
