import React, { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Copy, Download, HardDrive, RotateCcw, Upload, X } from 'lucide-react';
import { useProfileStore } from '../store/profileStore';
import { soundEngine } from '../audio/soundEngine';

interface SaveBackupModalProps {
  open: boolean;
  onClose: () => void;
}

export const SaveBackupModal: React.FC<SaveBackupModalProps> = ({ open, onClose }) => {
  const { exportSaveJson, importSaveJson, resetProfile } = useProfileStore();
  const [pasteText, setPasteText] = useState('');
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!open) return null;

  const flashStatus = (ok: boolean, msg: string) => {
    setStatus({ ok, msg });
    setTimeout(() => setStatus(null), 3500);
  };

  const handleDownload = () => {
    soundEngine.uiClick();
    const json = exportSaveJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateStr = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `aetherbound-save-${dateStr}.json`;
    a.click();
    URL.revokeObjectURL(url);
    flashStatus(true, 'Save file downloaded! Keep it safe as backup.');
  };

  const handleCopy = async () => {
    soundEngine.uiClick();
    try {
      await navigator.clipboard.writeText(exportSaveJson());
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
      flashStatus(true, 'Save JSON copied to clipboard!');
    } catch {
      flashStatus(false, 'Clipboard blocked — use Download JSON instead.');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : '';
      const res = importSaveJson(text);
      if (res.ok) {
        soundEngine.relicAttach();
        flashStatus(true, 'Save restored successfully! Your collection & decks are loaded.');
      } else {
        flashStatus(false, res.error ?? 'Invalid save file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handlePasteImport = () => {
    if (!pasteText.trim()) return;
    const res = importSaveJson(pasteText);
    if (res.ok) {
      soundEngine.relicAttach();
      setPasteText('');
      flashStatus(true, 'Save restored successfully!');
    } else {
      flashStatus(false, res.error ?? 'Invalid JSON save data.');
    }
  };

  return (
    <AnimatePresence>
      <div
        onClick={onClose}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-5 overflow-y-auto"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-lg game-panel clip-chamfer border-cyan-400/60 shadow-[0_0_60px_rgba(34,211,238,0.28)] overflow-hidden my-auto"
        >
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-gradient-to-r from-cyan-950/60 via-slate-950 to-indigo-950/60">
            <div className="flex items-center gap-2.5">
              <HardDrive className="w-5 h-5 text-cyan-300" />
              <div>
                <h3 className="font-display font-extrabold text-sm sm:text-base text-white tracking-wider uppercase">
                  Save Data Backup &amp; Restore
                </h3>
                <p className="text-[11px] text-slate-400">
                  Export or restore your collection, coins, decks, rank &amp; campaign progress
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5 space-y-4">
            {status && (
              <div
                className={`px-3.5 py-2 rounded-xl border text-xs font-semibold ${
                  status.ok
                    ? 'bg-emerald-950/80 border-emerald-400/70 text-emerald-200'
                    : 'bg-rose-950/80 border-rose-400/70 text-rose-200'
                }`}
              >
                {status.msg}
              </div>
            )}

            {/* EXPORT */}
            <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-3.5 space-y-2.5">
              <div className="text-xs font-display font-bold uppercase tracking-wider text-cyan-300">
                1. Backup Your Progress
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleDownload}
                  className="flex-1 clip-skew-btn px-4 py-2.5 bg-gradient-to-r from-cyan-600 to-indigo-600 text-white font-display font-bold text-xs tracking-wider flex items-center justify-center gap-1.5 hover:brightness-110 cursor-pointer"
                >
                  <Download className="w-4 h-4" /> Download .JSON
                </button>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="clip-skew-btn px-4 py-2.5 bg-slate-900 border border-slate-700 hover:border-cyan-400/60 text-slate-200 font-display font-bold text-xs tracking-wider flex items-center gap-1.5 cursor-pointer"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copied!' : 'Copy JSON'}
                </button>
              </div>
            </div>

            {/* IMPORT */}
            <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-3.5 space-y-2.5">
              <div className="text-xs font-display font-bold uppercase tracking-wider text-amber-300">
                2. Restore Save Data
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2.5 rounded-xl bg-slate-900 border border-dashed border-amber-400/60 hover:bg-amber-950/30 text-amber-200 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <Upload className="w-4 h-4" /> Choose Saved .JSON File
              </button>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder="Or paste exported JSON save string here..."
                  className="flex-1 px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-amber-400"
                />
                <button
                  type="button"
                  disabled={!pasteText.trim()}
                  onClick={handlePasteImport}
                  className="px-3.5 py-2 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs disabled:opacity-40 cursor-pointer"
                >
                  Restore
                </button>
              </div>
            </div>

            {/* DANGER ZONE */}
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
              <span className="text-[11px] text-slate-500">Want a fresh start?</span>
              {!confirmReset ? (
                <button
                  type="button"
                  onClick={() => setConfirmReset(true)}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 border border-rose-500/40 text-rose-300 hover:bg-rose-950/50 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Reset Save
                </button>
              ) : (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      resetProfile();
                      setConfirmReset(false);
                      flashStatus(true, 'Profile reset to starter defaults.');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-[11px] font-bold cursor-pointer"
                  >
                    Confirm Wipe
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmReset(false)}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-[11px] font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
