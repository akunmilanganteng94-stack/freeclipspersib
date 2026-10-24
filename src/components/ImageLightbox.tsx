import React from 'react';
import { X, Download, ZoomIn } from 'lucide-react';

interface ImageLightboxProps {
  isOpen: boolean;
  imageUrl: string;
  title: string;
  label?: string;
  onClose: () => void;
  onDownload: () => void;
}

export const ImageLightbox: React.FC<ImageLightboxProps> = ({
  isOpen,
  imageUrl,
  title,
  label = 'Foto HD Persib',
  onClose,
  onDownload,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative max-w-5xl w-full max-h-[90vh] flex flex-col items-center justify-between"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top bar */}
        <div className="w-full flex items-center justify-between pb-3 text-white">
          <div className="truncate mr-4">
            <span className="text-xs font-bold text-blue-400 block uppercase tracking-wider">
              {label}
            </span>
            <h3 className="text-sm sm:text-base font-semibold truncate text-slate-100">
              {title}
            </h3>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onDownload}
              className="neu-button px-3 py-1.5 rounded-xl text-xs font-bold text-white flex items-center gap-1.5"
            >
              <Download className="w-4 h-4" />
              <span>Download Foto</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              aria-label="Tutup"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Image Display */}
        <div className="relative w-full max-h-[75vh] flex items-center justify-center overflow-hidden rounded-2xl bg-black/40 border border-white/10">
          <img
            src={imageUrl}
            alt={title}
            className="max-h-[75vh] max-w-full object-contain rounded-xl select-none"
            referrerPolicy="no-referrer"
          />
        </div>

        <p className="text-center text-[11px] text-slate-400 pt-3">
          Klik tombol download untuk mengunduh resolusi penuh tanpa kompresi
        </p>
      </div>
    </div>
  );
};
