import React, { useEffect, useRef, useState } from "react";

export default function ContextMenu({ ctx, setCtx, onAction }) {
  const menuRef = useRef();
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleClick = (e) => {
      if (ctx.visible && menuRef.current && !menuRef.current.contains(e.target)) {
        setCtx({ visible: false, x: 0, y: 0, file: null });
      }
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [ctx, setCtx]);

  // Update position to avoid overflow
  useEffect(() => {
    if (ctx.visible && menuRef.current) {
      const { x, y } = ctx;
      const menuRect = menuRef.current.getBoundingClientRect();
      const screenW = window.innerWidth;
      const screenH = window.innerHeight;

      let posX = x;
      let posY = y;

      // If menu goes beyond right edge
      if (x + menuRect.width > screenW) {
        posX = screenW - menuRect.width - 10; // 10px padding from edge
      }

      // If menu goes beyond bottom edge
      if (y + menuRect.height > screenH) {
        posY = screenH - menuRect.height - 10; // 10px padding from edge
      }

      // Prevent negative position
      if (posX < 0) posX = 10;
      if (posY < 0) posY = 10;

      setPosition({ x: posX, y: posY });
    }
  }, [ctx]);

  if (!ctx?.visible || !ctx?.file) return null;

  const close = () => setCtx({ visible: false, x: 0, y: 0, file: null });

  const handleClick = (action) => {
    onAction(action, ctx.file);
    setTimeout(close, 10); // allow parent to process action first
  };

  return (
    <ul
      ref={menuRef}
      className="absolute bg-white border rounded shadow-md text-sm z-50"
      style={{ top: position.y, left: position.x }}
    >
      <li className="px-4 py-2 hover:bg-gray-100 cursor-pointer" onClick={() => handleClick("edit")}>
        Edit
      </li>
      <li className="px-4 py-2 hover:bg-gray-100 cursor-pointer" onClick={() => handleClick("properties")}>
        Properties
      </li>
      <li className="px-4 py-2 hover:bg-gray-100 cursor-pointer" onClick={() => handleClick("download")}>
        Download
      </li>
      <li className="px-4 py-2 hover:bg-gray-100 cursor-pointer" onClick={() => handleClick("rename")}>
        Rename
      </li>
      <li className="px-4 py-2 text-red-500 hover:bg-gray-100 cursor-pointer" onClick={() => handleClick("delete")}>
        Delete
      </li>
      <li className="px-4 py-2 hover:bg-gray-100 cursor-pointer" onClick={() => handleClick("compress")}>
        Compress / Extract
      </li>
    </ul>
  );
}
