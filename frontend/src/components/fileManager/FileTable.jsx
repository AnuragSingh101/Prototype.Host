import React from "react";
import { FiFolder, FiFile, FiLink2 } from "react-icons/fi";

export default function FileTable({
  currentPath,
  filteredFiles,
  selected,
  toggleSelect,
  navigate,
  formatBytes,
  loading,
  onRightClick,
}) {
  if (loading) return <div className="text-center text-gray-600">Loading...</div>;
  if (filteredFiles.length === 0) return <div className="text-center text-gray-600">No files</div>;

  return (
    <div className="flex-1 overflow-auto p-6">
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
            <tr
              onClick={() => navigate("..")}
              className="cursor-pointer hover:bg-gray-50"
            >
              <td></td>
              <td colSpan={5}>.. (Parent Directory)</td>
            </tr>
          )}
          {filteredFiles.map((f, i) => (
            <tr
              key={i}
              className="hover:bg-gray-50 cursor-pointer"
              onDoubleClick={() => f.type === "directory" && navigate(f.name)}
              onContextMenu={(e) => {
                e.preventDefault();
                if (onRightClick) onRightClick(f, e.clientX, e.clientY);
              }}
            >
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
    </div>
  );
}
