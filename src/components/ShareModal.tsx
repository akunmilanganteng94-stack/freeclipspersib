import React, { useState } from 'react';
import { X, Copy, Check, MessageCircle, Share2, Send } from 'lucide-react';
import { ClipItem } from '../types';

interface ShareModalProps {
  isOpen: boolean;
  clip: ClipItem;
  onClose: () => void;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({ isOpen, clip, onClose, onShowToast }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentUrl = `${window.location.origin}/clips/${clip.slug}`;
  const shareText = `Tonton & Download Clip Persib: "${clip.title}" gratis di FREE CLIPS PERSIB! 💙⚽`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(currentUrl);
    setCopied(true);
    onShowToast('Link berhasil disalin!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const shareToWhatsApp = () => {
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(`${shareText}\n${currentUrl}`)}`;
    window.open(url, '_blank');
  };

  const shareToTwitter = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(currentUrl)}`;
    window.open(url, '_blank');
  };

  const shareToTelegram = () => {
    const url = `https://t.me/share/url?url=${encodeURIComponent(currentUrl)}&text=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="neu-card max-w-md w-full p-5 sm:p-6 bg-white relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2 text-blue-900 font-bold text-base">
            <Share2 className="w-5 h-5 text-blue-600" />
            <span>Bagikan Clips Persib</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Clip Preview */}
        <div className="py-4">
          <p className="text-xs text-slate-500 line-clamp-2 font-medium mb-4 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
            "{clip.title}"
          </p>

          {/* Social Buttons */}
          <div className="grid grid-cols-3 gap-2.5 mb-5">
            <button
              onClick={shareToWhatsApp}
              className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl bg-emerald-50 text-emerald-800 hover:bg-emerald-100 transition-colors cursor-pointer border border-emerald-200/60"
            >
              <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                <MessageCircle className="w-5 h-5 fill-current" />
              </div>
              <span className="text-[11px] font-bold">WhatsApp</span>
            </button>

            <button
              onClick={shareToTelegram}
              className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl bg-sky-50 text-sky-800 hover:bg-sky-100 transition-colors cursor-pointer border border-sky-200/60"
            >
              <div className="w-9 h-9 rounded-full bg-sky-500 text-white flex items-center justify-center shadow-xs">
                <Send className="w-4 h-4 ml-0.5" />
              </div>
              <span className="text-[11px] font-bold">Telegram</span>
            </button>

            <button
              onClick={shareToTwitter}
              className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl bg-slate-100 text-slate-800 hover:bg-slate-200 transition-colors cursor-pointer border border-slate-200/60"
            >
              <div className="w-9 h-9 rounded-full bg-black text-white flex items-center justify-center shadow-xs">
                <span className="text-sm font-bold">𝕏</span>
              </div>
              <span className="text-[11px] font-bold">Twitter / X</span>
            </button>
          </div>

          {/* Copy link input */}
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
            Tautan Permanen
          </label>
          <div className="flex items-center gap-2 p-1.5 rounded-xl bg-slate-100 border border-slate-200">
            <input
              type="text"
              readOnly
              value={currentUrl}
              className="w-full text-xs bg-transparent px-2 text-slate-700 outline-none font-mono truncate"
            />
            <button
              onClick={copyToClipboard}
              className="neu-button text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 shrink-0 cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Tersalin' : 'Salin'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
