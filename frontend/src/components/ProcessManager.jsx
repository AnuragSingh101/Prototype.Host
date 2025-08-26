import React, { useState, useEffect } from 'react';
import { FiRefreshCw, FiTrash2, FiPlay, FiStopCircle } from 'react-icons/fi';
import { useSshSession } from '../hooks/useSshSession';

export default function ProcessManager() {
  const { sessionReady, executeCommand } = useSshSession();
  const [processes, setProcesses] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('processes');

  useEffect(() => {
    if (sessionReady) {
      if (activeTab === 'processes') loadProcesses();
      else loadServices();
    }
  }, [sessionReady, activeTab]);

  const loadProcesses = () => {
    setLoading(true);
    executeCommand('ps aux --sort=-%cpu | head -20', (result) => {
      const lines = result.output.split('\n').slice(1);
      const parsed = lines.filter(l => l.trim()).map(l => {
        const parts = l.trim().split(/\s+/);
        if (parts.length >= 11) {
          return {
            user: parts[0], pid: parts[1], cpu: parts[2], mem: parts[3],
            command: parts.slice(10).join(' ')
          };
        }
        return null;
      }).filter(Boolean);
      setProcesses(parsed);
      setLoading(false);
    });
  };

  const loadServices = () => {
    setLoading(true);
    executeCommand('systemctl list-units --type=service --state=running --no-pager', (result) => {
      const lines = result.output.split('\n').filter(l => l.includes('.service'));
      const parsed = lines.map(l => {
        const parts = l.trim().split(/\s+/);
        if (parts.length >= 5) {
          return { unit: parts[0], load: parts[1], active: parts[2], sub: parts[3], description: parts.slice(4).join(' ') };
        }
        return null;
      }).filter(Boolean);
      setServices(parsed);
      setLoading(false);
    });
  };

  const killProcess = pid => {
    if (window.confirm(`Kill process ${pid}?`)) {
      executeCommand(`kill ${pid}`, () => loadProcesses());
    }
  };

  const toggleService = (service, action) => {
    executeCommand(`sudo systemctl ${action} ${service}`, () => loadServices());
  };

  if (!sessionReady) return <div className="flex h-full items-center justify-center text-gray-500 text-xl">Connecting to system…</div>;

  return (
    <div className="relative flex flex-col h-full bg-gradient-to-br from-gray-50 to-white text-gray-800 font-sans">
      <div className="flex items-center px-6 py-4 bg-white shadow-md border-b border-gray-200">
        <div className="font-extrabold text-2xl tracking-wide text-blue-600">Process Manager</div>
        <div className="ml-10 flex gap-6">
          {[{id:'processes',name:'Processes'},{id:'services',name:'Services'}].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg font-medium text-lg transition ${activeTab===tab.id?"bg-blue-100 text-blue-700":"text-gray-600 hover:text-blue-600"}`}>
              {tab.name}
            </button>
          ))}
        </div>
        <div className="ml-auto">
          <button onClick={activeTab==='processes'?loadProcesses:loadServices} disabled={loading}
            className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-40">
            <FiRefreshCw size={22} className={loading?"animate-spin text-blue-500":""}/>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {activeTab==='processes'? (
          <table className="w-full rounded-lg bg-white border border-gray-200 shadow-md">
            <thead className="bg-gray-50">
              <tr>{['PID','User','CPU%','MEM%','Command','Actions'].map(h=>(<th key={h} className="py-3 px-5 text-left text-base font-bold uppercase text-gray-600 border-b">{h}</th>))}</tr>
            </thead>
            <tbody>
              {processes.map((p,i)=>(
                <tr key={i} className="hover:bg-blue-50 cursor-pointer">
                  <td className="py-3 px-5 font-mono">{p.pid}</td>
                  <td className="py-3 px-5">{p.user}</td>
                  <td className="py-3 px-5">{p.cpu}</td>
                  <td className="py-3 px-5">{p.mem}</td>
                  <td className="py-3 px-5 truncate max-w-xs">{p.command}</td>
                  <td className="py-3 px-5">
                    <button onClick={()=>killProcess(p.pid)} className="flex items-center gap-1 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700">
                      <FiTrash2/> Kill
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="w-full rounded-lg bg-white border border-gray-200 shadow-md">
            <thead className="bg-gray-50">
              <tr>{['Service','Load','Active','Sub','Description','Actions'].map(h=>(<th key={h} className="py-3 px-5 text-left text-base font-bold uppercase text-gray-600 border-b">{h}</th>))}</tr>
            </thead>
            <tbody>
              {services.map((s,i)=>(
                <tr key={i} className="hover:bg-blue-50 cursor-pointer">
                  <td className="py-3 px-5 font-mono">{s.unit}</td>
                  <td className="py-3 px-5">{s.load}</td>
                  <td className="py-3 px-5"><span className={`px-2 py-1 rounded-full text-xs ${s.active==='active'?"bg-green-100 text-green-800":"bg-red-100 text-red-800"}`}>{s.active}</span></td>
                  <td className="py-3 px-5">{s.sub}</td>
                  <td className="py-3 px-5 truncate max-w-xs">{s.description}</td>
                  <td className="py-3 px-5 space-x-2">
                    <button onClick={()=>toggleService(s.unit,'restart')} className="px-3 py-1 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700"><FiRefreshCw/> Restart</button>
                    <button onClick={()=>toggleService(s.unit,'stop')} className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"><FiStopCircle/> Stop</button>
                    <button onClick={()=>toggleService(s.unit,'start')} className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"><FiPlay/> Start</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}