import React, { useEffect, useRef } from "react";

export default function ContextMenu({ ctx, setCtx, onAction }) {
  const menuRef = useRef();

  // Close on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (ctx.visible && menuRef.current && !menuRef.current.contains(e.target)) {
        setCtx({ visible: false, x: 0, y: 0, file: null });
      }
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [ctx, setCtx]);

  if (!ctx?.visible || !ctx?.file) return null;

  const { x, y, file } = ctx;

  const close = () => setCtx({ visible: false, x: 0, y: 0, file: null });

  return (
    <ul
      ref={menuRef}
      className="absolute bg-white border rounded shadow-md text-sm z-50"
      style={{ top: y, left: x }}
    >
      <li className="px-4 py-2 hover:bg-gray-100 cursor-pointer" onClick={() => { onAction("edit", file); close(); }}>
        Edit
      </li>
      <li className="px-4 py-2 hover:bg-gray-100 cursor-pointer" onClick={() => { onAction("properties", file); close(); }}>
        Properties
      </li>
      <li className="px-4 py-2 hover:bg-gray-100 cursor-pointer" onClick={() => { onAction("download", file); close(); }}>
        Download
      </li>
      <li className="px-4 py-2 hover:bg-gray-100 cursor-pointer" onClick={() => { onAction("rename", file); close(); }}>
        Rename
      </li>
      <li className="px-4 py-2 text-red-500 hover:bg-gray-100 cursor-pointer" onClick={() => { onAction("delete", file); close(); }}>
        Delete
      </li>
      <li className="px-4 py-2 hover:bg-gray-100 cursor-pointer" onClick={() => { onAction("compress", file); close(); }}>
        Compress / Extract
      </li>
    </ul>
  );
}
