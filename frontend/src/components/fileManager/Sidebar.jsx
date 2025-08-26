import React from "react";

const favorites = [
  { name: "Root", path: "/" },
  { name: "Web Root", path: "/var/www/html" },
  { name: "Nginx Config", path: "/etc/nginx" },
];

export default function Sidebar({ onNavigate }) {
  return (
    <div className="w-48 bg-gray-100 border-r p-3">
      <h3 className="font-bold mb-2">Favorites</h3>
      <ul>
        {favorites.map((fav) => (
          <li
            key={fav.path}
            onClick={() => onNavigate(fav.path)}
            className="cursor-pointer px-2 py-1 hover:bg-gray-200 rounded"
          >
            {fav.name}
          </li>
        ))}
      </ul>
    </div>
  );
}
