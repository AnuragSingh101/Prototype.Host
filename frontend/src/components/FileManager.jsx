import React, { useState, useEffect, useRef } from 'react';
import { FiMenu, FiFolder, FiFile, FiLink2, FiArrowUp, FiRefreshCw, FiEdit2, FiTrash2, FiCopy, FiScissors, FiInfo, FiLock, FiSearch, FiGrid, FiList, FiPlus, FiUpload } from 'react-icons/fi';
import { useSshSession } from '../hooks/useSshSession';

export default function FileManager({ toggleSidebar }) {
  const { sessionReady, executeCommand } = useSshSession();
  const [currentPath, setCurrentPath] = useState('/');
  const [files, setFiles] = useState([]);
  const [filteredFiles, setFilteredFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'grid'
  const [preview, setPreview] = useState({ open: false, content: '' });
  const [sortBy, setSortBy] = useState('name'); // 'name', 'size', 'date'
  const [renameModal, setRenameModal] = useState({ open: false, target: null, newName: '' });
  const [selected, setSelected] = useState(new Set());
  const [clipboard, setClipboard] = useState({ type: null, files: [] });

  const [ctx, setCtx] = useState({ visible: false, x: 0, y: 0, target: null });
  const ctxRef = useRef();
  const renameInputRef = useRef(null);

  useEffect(() => {
    const onClick = e => {
      if (ctx.visible && ctxRef.current && !ctxRef.current.contains(e.target)) {
        setCtx(c => ({ ...c, visible: false, target: null }));
      }
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [ctx.visible]);

  useEffect(() => {
    if (sessionReady) loadDirectory(currentPath);
  }, [sessionReady, currentPath]);

  useEffect(() => {
    let sorted = [...files];
    if (sortBy === 'size') sorted.sort((a, b) => parseInt(b.size) - parseInt(a.size));
    if (sortBy === 'date') sorted.sort((a, b) => new Date(b.date) - new Date(a.date));
    const lowerQuery = searchQuery.toLowerCase();
    setFilteredFiles(sorted.filter(f => f.name.toLowerCase().includes(lowerQuery)));
  }, [searchQuery, files, sortBy]);

  useEffect(() => {
    if (renameModal.open && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renameModal.open]);

  const loadDirectory = path => {
    setLoading(true);
    executeCommand(`ls -la "${path}"`, ({ output }) => {
      const lines = output.split('\n').slice(1);
      const parsed = lines
        .filter(l => l.trim())
        .map(l => {
          const cols = l.trim().split(/\s+/);
          if (cols.length < 9) return null;
          return {
            permissions: cols[0],
            owner: cols[2],
            size: cols[4],
            date: `${cols[5]} ${cols[6]}`,
            name: cols.slice(8).join(' '),
            isDirectory: cols[0].startsWith('d'),
            isLink: cols[0].startsWith('l'),
            typeColor: getTypeColor(cols[0], cols.slice(8).join(' ')),
          };
        })
        .filter(Boolean);
      setFiles(parsed);
      setLoading(false);
    });
  };

  const getTypeColor = (perm, name) => {
    if (perm.startsWith('d')) return 'text-yellow-600';
    if (perm.startsWith('l')) return 'text-green-600';
    if (name.endsWith('.jpg') || name.endsWith('.png')) return 'text-purple-600';
    return 'text-blue-600';
  };

  const getFullPath = (name) => currentPath === '/' ? `/${name}` : `${currentPath}/${name}`;

  const navigate = name => {
    let next = '/';
    if (name !== '..') {
      next = currentPath === '/' ? `/${name}` : `${currentPath}/${name}`;
    } else if (currentPath !== '/') {
      const arr = currentPath.split('/').filter(Boolean);
      arr.pop();
      next = arr.length ? '/' + arr.join('/') : '/';
    }
    setCurrentPath(next);
  };

  const toggleSelect = (name) => {
    setSelected((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(name)) {
        newSet.delete(name);
      } else {
        newSet.add(name);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    setSelected(new Set(filteredFiles.map(f => f.name)));
  };

  const clearSelect = () => {
    setSelected(new Set());
  };

  const handleBulkDelete = () => {
    if (!window.confirm(`Delete ${selected.size} items?`)) return;
    const paths = Array.from(selected).map(n => `"${getFullPath(n)}"`).join(' ');
    executeCommand(`rm -rf ${paths}`, () => {
      loadDirectory(currentPath);
      clearSelect();
    });
  };

  const handleCut = () => {
    const files = Array.from(selected).map(getFullPath);
    setClipboard({ type: 'cut', files });
    clearSelect();
  };

  const handleCopy = () => {
    const files = Array.from(selected).map(getFullPath);
    setClipboard({ type: 'copy', files });
    clearSelect();
  };

  const handlePaste = () => {
    if (!clipboard.type) return;
    const srcs = clipboard.files.map(f => `"${f}"`).join(' ');
    const dest = `"${currentPath}"`;
    const cmd = clipboard.type === 'cut' ? `mv ${srcs} ${dest}` : `cp -r ${srcs} ${dest}`;
    executeCommand(cmd, () => {
      loadDirectory(currentPath);
      if (clipboard.type === 'cut') setClipboard({ type: null, files: [] });
    });
  };

  const handleCompress = () => {
    const archiveName = prompt('Archive name:', 'archive.tar.gz');
    if (!archiveName) return;
    const items = Array.from(selected).map(n => `"${n}"`).join(' ');
    const cmd = `tar -czf "${currentPath}/${archiveName}" -C "${currentPath}" ${items}`;
    executeCommand(cmd, () => {
      loadDirectory(currentPath);
      clearSelect();
    });
  };

  const handleExtract = () => {
    const commands = Array.from(selected).map(n => `tar -xzf "${getFullPath(n)}" -C "${currentPath}"`);
    const cmd = commands.join(' && ');
    executeCommand(cmd, () => {
      loadDirectory(currentPath);
      clearSelect();
    });
  };

  const handleContextMenu = (e, file) => {
    e.preventDefault();
    setCtx({ visible: true, x: e.pageX, y: e.pageY, target: file });
  };

  const onOpen = () => {
    if (ctx.target.isDirectory) {
      navigate(ctx.target.name);
    } else {
      executeCommand(`cat "${currentPath}/${ctx.target.name}"`, ({ output }) => {
        setPreview({ open: true, content: output.slice(0, 1000) });
      });
    }
    closeCtx();
  };

  const onRename = () => {
    setRenameModal({ open: true, target: ctx.target, newName: ctx.target.name });
    closeCtx();
  };

  const handleRenameConfirm = () => {
    const { target, newName } = renameModal;
    if (newName && newName !== target.name) {
      executeCommand(`mv "${currentPath}/${target.name}" "${currentPath}/${newName}"`, () => loadDirectory(currentPath));
    }
    setRenameModal({ open: false, target: null, newName: '' });
  };

  const onDelete = () => {
    if (window.confirm(`Delete ${ctx.target.name}?`)) {
      executeCommand(`rm -rf "${currentPath}/${ctx.target.name}"`, () => loadDirectory(currentPath));
    }
    closeCtx();
  };

  const onCut = () => {
    setClipboard({ type: 'cut', files: [getFullPath(ctx.target.name)] });
    closeCtx();
  };

  const onCopy = () => {
    setClipboard({ type: 'copy', files: [getFullPath(ctx.target.name)] });
    closeCtx();
  };

  const onDuplicate = () => {
    executeCommand(`cp -r "${currentPath}/${ctx.target.name}" "${currentPath}/${ctx.target.name}_copy"`, () => loadDirectory(currentPath));
    closeCtx();
  };
  const onLock = () => { executeCommand(`chmod 000 "${currentPath}/${ctx.target.name}"`); closeCtx(); };
  const onShowInfo = () => {
    executeCommand(`stat "${currentPath}/${ctx.target.name}"`, ({ output }) => {
      alert(output);
    });
    closeCtx();
  };

  const closeCtx = () => setCtx(c => ({ ...c, visible: false, target: null }));

  const formatBytes = b => {
    const n = parseInt(b, 10);
    if (isNaN(n) || n === 0) return '-';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(n) / Math.log(1024));
    return `${(n / Math.pow(1024, i)).toFixed(i ? 1 : 0)} ${sizes[i]}`;
  };

  const onNewFolder = () => {
    const name = prompt('New folder name:');
    if (name) {
      executeCommand(`mkdir "${currentPath}/${name}"`, () => loadDirectory(currentPath));
    }
  };

  const onUpload = () => {
    alert('Upload to be implemented.');
  };

  const onSmartSort = () => {
    setSortBy(sortBy === 'name' ? 'size' : sortBy === 'size' ? 'date' : 'name');
  };

  if (!sessionReady) {
    return <div className="flex h-full items-center justify-center text-gray-900 text-xl">Connecting...</div>;
  }

  const pathSections = currentPath === '/' 
    ? [{ label: '/', path: '/' }] 
    : [{ label: '/', path: '/' }, ...currentPath.split('/').filter(Boolean).map((seg, i, arr) => ({ label: seg, path: '/' + arr.slice(0, i + 1).join('/') })) ];

  return (
    <div className="relative flex flex-col h-full bg-gradient-to-br from-white to-gray-100 text-gray-900 font-sans">
      <div className="flex items-center px-6 py-4 bg-white/90 backdrop-blur-lg shadow-lg border-b border-gray-200/30">
        <button onClick={toggleSidebar} className="rounded-xl p-2 hover:bg-gray-100/70 transition" aria-label="Menu">
          <FiMenu size={24} />
        </button>
        <div className="font-extrabold text-2xl ml-4 tracking-wide select-none text-blue-600">File Manager</div>
        <div className="ml-8 flex-1 flex items-center gap-4">
          <div className="relative w-64">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input 
              type="text" 
              placeholder="Search files..." 
              value={searchQuery} 
              onChange={e => setSearchQuery(e.target.value)} 
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-white/70 border border-gray-200/30 focus:outline-none focus:ring-2 focus:ring-blue-500 transition backdrop-blur-sm"
            />
          </div>
          <button onClick={() => navigate('..')} disabled={currentPath === '/'} className="p-2 rounded-xl hover:bg-gray-100/70 disabled:opacity-40"><FiArrowUp size={20} /></button>
          <button onClick={() => loadDirectory(currentPath)} disabled={loading} className="p-2 rounded-xl hover:bg-gray-100/70 disabled:opacity-40"><FiRefreshCw size={20} className={loading ? 'animate-spin text-blue-500' : ''} /></button>
          <nav className="flex items-center gap-2 text-lg">
            {pathSections.map((crumb, idx) => (
              <React.Fragment key={crumb.path}>
                <button
                  onClick={() => setCurrentPath(crumb.path)}
                  disabled={idx === pathSections.length - 1}
                  className={`px-3 py-1.5 rounded-xl transition ${idx === pathSections.length - 1 ? 'text-blue-700 font-bold bg-blue-100/70 backdrop-blur-sm' : 'text-blue-600 hover:text-blue-800'}`}
                >
                  {crumb.label}
                </button>
                {idx < pathSections.length - 1 && <span className="mx-1 text-gray-400">/</span>}
              </React.Fragment>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={onNewFolder} className="p-2 rounded-xl hover:bg-gray-100/70"><FiPlus size={20} /></button>
          <button onClick={onUpload} className="p-2 rounded-xl hover:bg-gray-100/70"><FiUpload size={20} /></button>
          <button onClick={() => setViewMode('list')} className={`p-2 rounded-xl ${viewMode === 'list' ? 'bg-blue-100/70' : 'hover:bg-gray-100/70'}`}><FiList size={20} /></button>
          <button onClick={() => setViewMode('grid')} className={`p-2 rounded-xl ${viewMode === 'grid' ? 'bg-blue-100/70' : 'hover:bg-gray-100/70'}`}><FiGrid size={20} /></button>
          <button onClick={onSmartSort} className="p-2 rounded-xl hover:bg-gray-100/70">Smart Sort</button>
          <button onClick={handlePaste} disabled={!clipboard.type} className={`p-2 rounded-xl ${clipboard.type ? 'hover:bg-gray-100/70' : 'opacity-40'}`}>Paste</button>
        </div>
      </div>
      {selected.size > 0 && (
        <div className="flex items-center px-6 py-3 bg-blue-100/90 shadow-md border-b border-blue-200/30 gap-4">
          <span className="font-bold text-blue-800">{selected.size} selected</span>
          <button onClick={handleBulkDelete} className="flex items-center gap-2 px-4 py-1 bg-red-500 text-white rounded-xl"><FiTrash2 /> Delete</button>
          <button onClick={handleCut} className="flex items-center gap-2 px-4 py-1 bg-gray-600 text-white rounded-xl"><FiScissors /> Cut</button>
          <button onClick={handleCopy} className="flex items-center gap-2 px-4 py-1 bg-gray-600 text-white rounded-xl"><FiCopy /> Copy</button>
          <button onClick={handleCompress} className="flex items-center gap-2 px-4 py-1 bg-green-500 text-white rounded-xl">Compress</button>
          <button onClick={handleExtract} className="flex items-center gap-2 px-4 py-1 bg-green-500 text-white rounded-xl">Extract</button>
          <button onClick={selectAll} className="px-4 py-1 bg-blue-500 text-white rounded-xl">Select All</button>
          <button onClick={clearSelect} className="px-4 py-1 bg-gray-300 text-gray-800 rounded-xl">Clear</button>
        </div>
      )}
      <div className="flex-1 overflow-auto p-8 relative">
        {loading && <div className="absolute inset-0 backdrop-blur-md flex items-center justify-center text-gray-900 bg-white/50">Loading...</div>}
        {!loading && filteredFiles.length === 0 ? (
          <div className="flex h-full items-center justify-center text-gray-900 text-lg font-bold">No files found</div>
        ) : viewMode === 'list' ? (
          <table className="w-full rounded-2xl bg-white/80 border border-gray-200/40 shadow-xl overflow-hidden backdrop-blur-lg">
            <thead>
              <tr className="bg-gradient-to-r from-gray-50 to-gray-100">
                <th className="py-4 px-4 w-12 border-b border-gray-200/50"></th>
                {['Name', 'Size', 'Owner', 'Permissions', 'Modified'].map(h => (
                  <th key={h} className="py-4 px-6 text-left text-base font-bold uppercase tracking-wider text-gray-800 border-b border-gray-200/50">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {currentPath !== '/' && (
                <tr onClick={() => navigate('..')} onContextMenu={e => handleContextMenu(e, { name: '..', isDirectory: true })} className="hover:bg-blue-50/70 cursor-pointer text-lg transition">
                  <td className="px-4"></td>
                  <td colSpan={5} className="py-4 px-6 italic text-gray-700 font-bold">.. (Parent Directory)</td>
                </tr>
              )}
              {filteredFiles.map((f, i) => (
                <tr key={i} onClick={() => f.isDirectory && navigate(f.name)} onContextMenu={e => handleContextMenu(e, f)} className="group hover:bg-blue-50/70 cursor-pointer transition text-lg">
                  <td className="px-4">
                    <input 
                      type="checkbox" 
                      checked={selected.has(f.name)} 
                      onChange={() => toggleSelect(f.name)} 
                      onClick={e => e.stopPropagation()} 
                    />
                  </td>
                  <td className="py-4 px-6 flex items-center gap-4">
                    {f.isDirectory ? <FiFolder className={`${f.typeColor}`} size={24} /> : f.isLink ? <FiLink2 className={`${f.typeColor}`} size={24} /> : <FiFile className={`${f.typeColor}`} size={24} />}
                    <span className="truncate group-hover:text-blue-700 font-bold text-black">{f.name}</span>
                  </td>
                  <td className="py-4 px-6 text-gray-700 font-medium">{f.isDirectory ? '-' : formatBytes(f.size)}</td>
                  <td className="py-4 px-6 text-gray-700 font-medium">{f.owner}</td>
                  <td className="py-4 px-6 text-gray-600">{f.permissions}</td>
                  <td className="py-4 px-6 text-gray-700 font-medium">{f.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8">
            {currentPath !== '/' && (
              <div onClick={() => navigate('..')} onContextMenu={e => handleContextMenu(e, { name: '..', isDirectory: true })} className="p-6 rounded-2xl bg-white/80 shadow-md hover:shadow-2xl hover:scale-105 transition-all cursor-pointer text-center backdrop-blur-lg">
                <FiArrowUp className="mx-auto text-gray-700" size={48} />
                <p className="mt-3 text-lg font-bold text-black">.. (Up)</p>
                <p className="text-sm text-gray-700 mt-1">Parent Directory</p>
              </div>
            )}
            {filteredFiles.map((f, i) => (
              <div key={i} onClick={() => f.isDirectory && navigate(f.name)} onContextMenu={e => handleContextMenu(e, f)} className="p-6 rounded-2xl bg-white/80 shadow-md hover:shadow-2xl hover:scale-105 transition-all cursor-pointer text-center group backdrop-blur-lg relative">
                <input 
                  type="checkbox" 
                  checked={selected.has(f.name)} 
                  onChange={() => toggleSelect(f.name)} 
                  onClick={e => e.stopPropagation()} 
                  className="absolute top-2 left-2"
                />
                {f.isDirectory ? <FiFolder className={`mx-auto ${f.typeColor}`} size={48} /> : f.isLink ? <FiLink2 className={`mx-auto ${f.typeColor}`} size={48} /> : <FiFile className={`mx-auto ${f.typeColor}`} size={48} />}
                <p className="mt-3 truncate text-lg font-bold text-black group-hover:text-blue-700">{f.name}</p>
                <p className="text-sm text-gray-700 mt-1">{f.isDirectory ? 'Folder' : formatBytes(f.size)} • {f.date}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {ctx.visible && (
        <div ref={ctxRef} className="fixed z-50 w-64 rounded-2xl shadow-2xl border border-gray-200/40 bg-white/90 backdrop-blur-lg animate-fade-in text-base" style={{ top: ctx.y, left: ctx.x }}>
          <ul className="divide-y divide-gray-100/50">
            <li className="px-5 py-3 hover:bg-blue-50/70 cursor-pointer flex items-center gap-2" onClick={onOpen}>{ctx.target.isDirectory ? <FiFolder /> : <FiFile />} {ctx.target.isDirectory ? 'Open folder' : 'Preview'}</li>
            <li className="px-5 py-3 hover:bg-blue-50/70 cursor-pointer flex items-center gap-2" onClick={onRename}><FiEdit2 /> Rename</li>
            <li className="px-5 py-3 hover:bg-blue-50/70 cursor-pointer flex items-center gap-2" onClick={onCut}><FiScissors /> Cut</li>
            <li className="px-5 py-3 hover:bg-blue-50/70 cursor-pointer flex items-center gap-2" onClick={onCopy}><FiCopy /> Copy</li>
            <li className="px-5 py-3 hover:bg-blue-50/70 cursor-pointer" onClick={onDuplicate}>Duplicate</li>
            <li className="px-5 py-3 hover:bg-blue-50/70 cursor-pointer flex items-center gap-2" onClick={onLock}><FiLock /> Lock</li>
            <li className="px-5 py-3 hover:bg-blue-50/70 cursor-pointer flex items-center gap-2" onClick={onShowInfo}><FiInfo /> Info</li>
            <li className="px-5 py-3 text-red-600 hover:bg-red-50/70 cursor-pointer flex items-center gap-2" onClick={onDelete}><FiTrash2 /> Delete</li>
          </ul>
        </div>
      )}

      {preview.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-md" onClick={() => setPreview({ open: false, content: '' })}>
          <div className="bg-white/90 p-8 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[80vh] overflow-auto backdrop-blur-lg" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold mb-4 text-black">File Preview</h3>
            <pre className="whitespace-pre-wrap text-sm text-gray-800">{preview.content}</pre>
            <button onClick={() => setPreview({ open: false, content: '' })} className="mt-6 px-6 py-2 bg-blue-500 text-white rounded-xl">Close</button>
          </div>
        </div>
      )}

      {renameModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-md" onClick={() => setRenameModal({ open: false, target: null, newName: '' })}>
          <div className="bg-white/90 p-4 rounded-xl shadow-2xl w-80 backdrop-blur-lg" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-3 text-black">Rename {renameModal.target.isDirectory ? 'Folder' : 'File'}</h3>
            <input
              type="text"
              value={renameModal.newName}
              onChange={e => setRenameModal(prev => ({ ...prev, newName: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              ref={renameInputRef}
              onKeyDown={e => { if (e.key === 'Enter') handleRenameConfirm(); }}
            />
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setRenameModal({ open: false, target: null, newName: '' })} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg">Cancel</button>
              <button onClick={handleRenameConfirm} className="px-4 py-2 bg-blue-500 text-white rounded-lg">OK</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}