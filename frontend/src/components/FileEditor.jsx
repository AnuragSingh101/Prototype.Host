import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  FiSave, FiX, FiRotateCcw, FiSearch, FiReplace, FiMaximize2, 
  FiMinimize2, FiCopy, FiScissors, FiClipboard, FiUndo, FiRedo,
  FiZoomIn, FiZoomOut, FiSettings, FiFileText, FiCode, FiImage,
  FiAlertCircle, FiCheckCircle, FiLoader, FiDownload, FiUpload,
  FiToggleLeft, FiToggleRight, FiType, FiEye, FiEdit3
} from 'react-icons/fi';

const FileEditor = ({ 
  isOpen, 
  onClose, 
  filePath, 
  fileName, 
  executeCommand,
  onFileSaved 
}) => {
  const [tabs, setTabs] = useState([]);
  const [activeTab, setActiveTab] = useState(0);
  const [isMaximized, setIsMaximized] = useState(false);
  const [fontSize, setFontSize] = useState(14);
  const [wordWrap, setWordWrap] = useState(true);
  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const [theme, setTheme] = useState('light');
  const [findReplace, setFindReplace] = useState({ 
    show: false, 
    find: '', 
    replace: '', 
    caseSensitive: false,
    wholeWord: false,
    regex: false
  });

  const textareaRef = useRef(null);
  const findInputRef = useRef(null);

  // Initialize editor with file
  useEffect(() => {
    if (isOpen && filePath && fileName && tabs.length === 0) {
      openFile(filePath, fileName);
    }
  }, [isOpen, filePath, fileName]);

  // Focus textarea when tab changes
  useEffect(() => {
    if (textareaRef.current && tabs[activeTab]) {
      textareaRef.current.focus();
    }
  }, [activeTab]);

  const openFile = (path, name) => {
    // Check if file is already open
    const existingIndex = tabs.findIndex(tab => tab.path === path);
    if (existingIndex !== -1) {
      setActiveTab(existingIndex);
      return;
    }

    const newTab = {
      id: Date.now(),
      path,
      name,
      content: '',
      originalContent: '',
      modified: false,
      loading: true,
      error: null,
      cursorPosition: 0,
      scrollPosition: 0,
      language: detectLanguage(name),
      encoding: 'utf-8'
    };

    setTabs(prev => [...prev, newTab]);
    const newIndex = tabs.length;
    setActiveTab(newIndex);

    // Load file content
    executeCommand(`cat "${path}"`, ({ output, error }) => {
      setTabs(prev => prev.map((tab, index) => 
        index === newIndex ? {
          ...tab,
          content: error ? `Error loading file: ${error}` : output,
          originalContent: error ? '' : output,
          loading: false,
          error: error || null
        } : tab
      ));
    });
  };

  const detectLanguage = (filename) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    const languageMap = {
      'js': 'javascript', 'jsx': 'javascript', 'ts': 'typescript', 'tsx': 'typescript',
      'py': 'python', 'rb': 'ruby', 'php': 'php', 'java': 'java', 'c': 'c',
      'cpp': 'cpp', 'h': 'c', 'cs': 'csharp', 'go': 'go', 'rs': 'rust',
      'html': 'html', 'htm': 'html', 'css': 'css', 'scss': 'scss', 'sass': 'sass',
      'json': 'json', 'xml': 'xml', 'yaml': 'yaml', 'yml': 'yaml',
      'md': 'markdown', 'sql': 'sql', 'sh': 'bash', 'bash': 'bash',
      'dockerfile': 'dockerfile', 'config': 'config', 'conf': 'config',
      'log': 'log', 'txt': 'text'
    };
    return languageMap[ext] || 'text';
  };

  const getCurrentTab = () => tabs[activeTab];

  const updateTabContent = (content) => {
    setTabs(prev => prev.map((tab, index) => 
      index === activeTab ? {
        ...tab,
        content,
        modified: content !== tab.originalContent
      } : tab
    ));
  };

  const saveFile = async (tabIndex = activeTab) => {
    const tab = tabs[tabIndex];
    if (!tab || tab.loading) return;

    setTabs(prev => prev.map((t, i) => 
      i === tabIndex ? { ...t, saving: true } : t
    ));

    // Escape content for shell command
    const escapedContent = tab.content.replace(/'/g, "'\"'\"'");
    
    executeCommand(`echo '${escapedContent}' > "${tab.path}"`, ({ error }) => {
      setTabs(prev => prev.map((t, i) => 
        i === tabIndex ? {
          ...t,
          saving: false,
          modified: error ? t.modified : false,
          originalContent: error ? t.originalContent : t.content,
          error: error || null
        } : t
      ));

      if (!error && onFileSaved) {
        onFileSaved(tab.path);
      }
    });
  };

  const saveAllFiles = () => {
    tabs.forEach((tab, index) => {
      if (tab.modified && !tab.loading && !tab.saving) {
        saveFile(index);
      }
    });
  };

  const closeTab = (tabIndex) => {
    const tab = tabs[tabIndex];
    if (tab.modified) {
      const shouldSave = window.confirm(`${tab.name} has unsaved changes. Save before closing?`);
      if (shouldSave) {
        saveFile(tabIndex);
      }
    }

    setTabs(prev => prev.filter((_, i) => i !== tabIndex));
    
    if (tabs.length === 1) {
      onClose();
    } else if (tabIndex === activeTab) {
      setActiveTab(Math.max(0, tabIndex - 1));
    } else if (tabIndex < activeTab) {
      setActiveTab(activeTab - 1);
    }
  };

  const closeAllTabs = () => {
    const modifiedTabs = tabs.filter(tab => tab.modified);
    if (modifiedTabs.length > 0) {
      const shouldSave = window.confirm(`${modifiedTabs.length} file(s) have unsaved changes. Save all before closing?`);
      if (shouldSave) {
        saveAllFiles();
      }
    }
    setTabs([]);
    onClose();
  };

  const handleKeyDown = (e) => {
    const currentTab = getCurrentTab();
    if (!currentTab) return;

    // Save: Ctrl+S
    if (e.ctrlKey && e.key === 's') {
      e.preventDefault();
      saveFile();
      return;
    }

    // Find: Ctrl+F
    if (e.ctrlKey && e.key === 'f') {
      e.preventDefault();
      setFindReplace(prev => ({ ...prev, show: true }));
      setTimeout(() => findInputRef.current?.focus(), 100);
      return;
    }

    // Find & Replace: Ctrl+H
    if (e.ctrlKey && e.key === 'h') {
      e.preventDefault();
      setFindReplace(prev => ({ ...prev, show: true }));
      return;
    }

    // Close tab: Ctrl+W
    if (e.ctrlKey && e.key === 'w') {
      e.preventDefault();
      closeTab(activeTab);
      return;
    }

    // New tab: Ctrl+T
    if (e.ctrlKey && e.key === 't') {
      e.preventDefault();
      // Could implement new file creation here
      return;
    }

    // Tab navigation: Ctrl+Tab, Ctrl+Shift+Tab
    if (e.ctrlKey && e.key === 'Tab') {
      e.preventDefault();
      if (e.shiftKey) {
        setActiveTab(activeTab > 0 ? activeTab - 1 : tabs.length - 1);
      } else {
        setActiveTab(activeTab < tabs.length - 1 ? activeTab + 1 : 0);
      }
      return;
    }
  };

  const handleTextareaChange = (e) => {
    updateTabContent(e.target.value);
  };

  const insertText = (text) => {
    if (!textareaRef.current) return;
    
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentContent = getCurrentTab()?.content || '';
    
    const newContent = currentContent.substring(0, start) + text + currentContent.substring(end);
    updateTabContent(newContent);
    
    // Restore cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + text.length, start + text.length);
    }, 0);
  };

  const formatCode = () => {
    const currentTab = getCurrentTab();
    if (!currentTab) return;

    // Basic formatting - could be enhanced with language-specific formatters
    let formatted = currentTab.content;
    
    // Basic indentation fix for common languages
    if (['javascript', 'json', 'css'].includes(currentTab.language)) {
      try {
        if (currentTab.language === 'json') {
          formatted = JSON.stringify(JSON.parse(formatted), null, 2);
        }
        // Add more formatters as needed
      } catch (e) {
        console.log('Formatting failed:', e);
      }
    }

    updateTabContent(formatted);
  };

  const findNext = () => {
    if (!findReplace.find || !textareaRef.current) return;

    const textarea = textareaRef.current;
    const content = getCurrentTab()?.content || '';
    const searchText = findReplace.caseSensitive ? findReplace.find : findReplace.find.toLowerCase();
    const searchContent = findReplace.caseSensitive ? content : content.toLowerCase();
    
    const currentPos = textarea.selectionEnd;
    const found = searchContent.indexOf(searchText, currentPos);
    
    if (found !== -1) {
      textarea.focus();
      textarea.setSelectionRange(found, found + findReplace.find.length);
    } else {
      // Search from beginning
      const foundFromStart = searchContent.indexOf(searchText);
      if (foundFromStart !== -1) {
        textarea.focus();
        textarea.setSelectionRange(foundFromStart, foundFromStart + findReplace.find.length);
      }
    }
  };

  const replaceNext = () => {
    if (!findReplace.find || !textareaRef.current) return;

    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    
    if (selectedText === findReplace.find || 
        (!findReplace.caseSensitive && selectedText.toLowerCase() === findReplace.find.toLowerCase())) {
      const currentContent = getCurrentTab()?.content || '';
      const newContent = currentContent.substring(0, start) + findReplace.replace + currentContent.substring(end);
      updateTabContent(newContent);
      
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + findReplace.replace.length, start + findReplace.replace.length);
      }, 0);
    }
    
    findNext();
  };

  const replaceAll = () => {
    if (!findReplace.find) return;

    const currentTab = getCurrentTab();
    if (!currentTab) return;

    let content = currentTab.content;
    const searchText = findReplace.find;
    const replaceText = findReplace.replace;
    
    if (findReplace.regex) {
      try {
        const flags = findReplace.caseSensitive ? 'g' : 'gi';
        const regex = new RegExp(searchText, flags);
        content = content.replace(regex, replaceText);
      } catch (e) {
        alert('Invalid regular expression');
        return;
      }
    } else {
      const flags = findReplace.caseSensitive ? 'g' : 'gi';
      const regex = new RegExp(searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);
      content = content.replace(regex, replaceText);
    }
    
    updateTabContent(content);
  };

  if (!isOpen) return null;

  const currentTab = getCurrentTab();

  return (
    <div className={`fixed inset-0 z-50 flex flex-col bg-white ${isMaximized ? '' : 'm-4 rounded-lg shadow-2xl'}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-100 border-b border-gray-200 rounded-t-lg">
        <div className="flex items-center gap-2">
          <FiFileText size={18} className="text-blue-600" />
          <span className="font-semibold text-gray-800">File Editor</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMaximized(!isMaximized)}
            className="p-1 rounded hover:bg-gray-200"
            title={isMaximized ? "Restore" : "Maximize"}
          >
            {isMaximized ? <FiMinimize2 size={16} /> : <FiMaximize2 size={16} />}
          </button>
          <button
            onClick={closeAllTabs}
            className="p-1 rounded hover:bg-gray-200"
            title="Close Editor"
          >
            <FiX size={16} />
          </button>
        </div>
      </div>

      {/* Tab Bar */}
      {tabs.length > 0 && (
        <div className="flex items-center bg-gray-50 border-b border-gray-200 overflow-x-auto">
          {tabs.map((tab, index) => (
            <div
              key={tab.id}
              onClick={() => setActiveTab(index)}
              className={`flex items-center gap-2 px-3 py-2 border-r border-gray-200 cursor-pointer min-w-0 ${
                index === activeTab 
                  ? 'bg-white border-b-2 border-blue-500' 
                  : 'hover:bg-gray-100'
              }`}
            >
              <FiFileText size={14} className={tab.modified ? 'text-orange-500' : 'text-gray-500'} />
              <span className="text-sm truncate max-w-32" title={tab.name}>
                {tab.name}
                {tab.modified && '*'}
              </span>
              {tab.loading && <FiLoader size={12} className="animate-spin text-blue-500" />}
              {tab.saving && <FiLoader size={12} className="animate-spin text-green-500" />}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(index);
                }}
                className="p-0.5 rounded hover:bg-gray-200"
              >
                <FiX size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Toolbar */}
      {currentTab && (
        <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <button
              onClick={() => saveFile()}
              disabled={!currentTab.modified || currentTab.saving}
              className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FiSave size={14} />
              Save
            </button>
            <button
              onClick={saveAllFiles}
              className="flex items-center gap-1 px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
            >
              <FiSave size={14} />
              Save All
            </button>
            <div className="w-px h-6 bg-gray-300 mx-1"></div>
            <button
              onClick={() => setFindReplace(prev => ({ ...prev, show: !prev.show }))}
              className="p-1 rounded hover:bg-gray-200"
              title="Find & Replace (Ctrl+F)"
            >
              <FiSearch size={16} />
            </button>
            <button
              onClick={formatCode}
              className="p-1 rounded hover:bg-gray-200"
              title="Format Code"
            >
              <FiCode size={16} />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-sm text-gray-600">
              <span>Font:</span>
              <button
                onClick={() => setFontSize(Math.max(10, fontSize - 1))}
                className="p-1 rounded hover:bg-gray-200"
              >
                <FiZoomOut size={14} />
              </button>
              <span className="w-8 text-center">{fontSize}</span>
              <button
                onClick={() => setFontSize(Math.min(24, fontSize + 1))}
                className="p-1 rounded hover:bg-gray-200"
              >
                <FiZoomIn size={14} />
              </button>
            </div>
            <button
              onClick={() => setWordWrap(!wordWrap)}
              className={`p-1 rounded ${wordWrap ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-200'}`}
              title="Toggle Word Wrap"
            >
              <FiType size={16} />
            </button>
            <button
              onClick={() => setShowLineNumbers(!showLineNumbers)}
              className={`p-1 rounded ${showLineNumbers ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-200'}`}
              title="Toggle Line Numbers"
            >
              <FiEdit3 size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Find & Replace Panel */}
      {findReplace.show && (
        <div className="flex items-center gap-2 px-3 py-2 bg-yellow-50 border-b border-yellow-200">
          <FiSearch size={16} className="text-gray-600" />
          <input
            ref={findInputRef}
            type="text"
            placeholder="Find..."
            value={findReplace.find}
            onChange={e => setFindReplace(prev => ({ ...prev, find: e.target.value }))}
            className="px-2 py-1 text-sm border border-gray-300 rounded flex-1 max-w-48"
            onKeyDown={e => e.key === 'Enter' && findNext()}
          />
          <input
            type="text"
            placeholder="Replace..."
            value={findReplace.replace}
            onChange={e => setFindReplace(prev => ({ ...prev, replace: e.target.value }))}
            className="px-2 py-1 text-sm border border-gray-300 rounded flex-1 max-w-48"
            onKeyDown={e => e.key === 'Enter' && replaceNext()}
          />
          <button onClick={findNext} className="px-2 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
            Find
          </button>
          <button onClick={replaceNext} className="px-2 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700">
            Replace
          </button>
          <button onClick={replaceAll} className="px-2 py-1 text-sm bg-orange-600 text-white rounded hover:bg-orange-700">
            Replace All
          </button>
          <button
            onClick={() => setFindReplace(prev => ({ ...prev, show: false }))}
            className="p-1 rounded hover:bg-gray-200"
          >
            <FiX size={16} />
          </button>
        </div>
      )}

      {/* Editor Content */}
      <div className="flex-1 flex overflow-hidden">
        {currentTab ? (
          <>
            {/* Line Numbers */}
            {showLineNumbers && (
              <div className="bg-gray-100 border-r border-gray-200 text-right pr-2 py-2 text-sm text-gray-500 font-mono min-w-12 select-none">
                {currentTab.content.split('\n').map((_, i) => (
                  <div key={i} className="leading-6 px-1">
                    {i + 1}
                  </div>
                ))}
              </div>
            )}

            {/* Editor */}
            <div className="flex-1 relative">
              {currentTab.loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <FiLoader className="animate-spin mx-auto mb-2" size={32} />
                    <div className="text-gray-600">Loading file...</div>
                  </div>
                </div>
              ) : currentTab.error ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-red-600">
                    <FiAlertCircle className="mx-auto mb-2" size={32} />
                    <div>Error loading file</div>
                    <div className="text-sm text-gray-600 mt-1">{currentTab.error}</div>
                  </div>
                </div>
              ) : (
                <textarea
                  ref={textareaRef}
                  value={currentTab.content}
                  onChange={handleTextareaChange}
                  onKeyDown={handleKeyDown}
                  className="w-full h-full p-2 font-mono resize-none outline-none bg-white"
                  style={{ 
                    fontSize: `${fontSize}px`,
                    lineHeight: '1.5',
                    whiteSpace: wordWrap ? 'pre-wrap' : 'pre',
                    wordWrap: wordWrap ? 'break-word' : 'normal'
                  }}
                  placeholder="Start typing or paste your content here..."
                  spellCheck={false}
                />
              )}

              {/* Status Indicators */}
              <div className="absolute bottom-2 right-2 flex items-center gap-2">
                {currentTab.saving && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                    <FiLoader size={12} className="animate-spin" />
                    Saving...
                  </div>
                )}
                {currentTab.modified && !currentTab.saving && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs">
                    <FiAlertCircle size={12} />
                    Modified
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <FiFileText className="mx-auto mb-4" size={48} />
              <div className="text-lg mb-2">No files open</div>
              <div className="text-sm">Open a file from the file manager to start editing</div>
            </div>
          </div>
        )}
      </div>

      {/* Status Bar */}
      {currentTab && (
        <div className="flex items-center justify-between px-3 py-1 bg-gray-100 border-t border-gray-200 text-xs text-gray-600">
          <div className="flex items-center gap-4">
            <span>Language: {currentTab.language}</span>
            <span>Encoding: {currentTab.encoding}</span>
            {currentTab.modified && <span className="text-orange-600">● Modified</span>}
          </div>
          <div className="flex items-center gap-4">
            <span>Lines: {currentTab.content.split('\n').length}</span>
            <span>Characters: {currentTab.content.length}</span>
            <span>Size: {new Blob([currentTab.content]).size} bytes</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileEditor;