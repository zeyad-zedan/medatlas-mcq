import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ExternalLink,
  FileText,
  X,
  AlertCircle,
  Maximize2,
  BookOpen,
  Presentation,
} from 'lucide-react';

interface PdfViewerModalProps {
  isOpen?: boolean;
  onClose: () => void;
  pdfUrl?: string | null;
  initialPage?: number | null;
  title?: string;
  lectureTitle?: string;
  totalEstimatedPages?: number;
}

export const PdfViewerModal: React.FC<PdfViewerModalProps> = ({
  isOpen = true,
  onClose,
  pdfUrl,
  initialPage = 1,
  title,
  lectureTitle,
  totalEstimatedPages = 10,
}) => {
  const displayTitle = title || lectureTitle || 'Lecture PDF Document';
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageInput, setPageInput] = useState<string>('1');
  const [zoomPercent, setZoomPercent] = useState<number>(100);

  // Sync state whenever initialPage or modal opens
  useEffect(() => {
    if (isOpen) {
      const startPage =
        initialPage && Number.isInteger(Number(initialPage)) && Number(initialPage) > 0
          ? Number(initialPage)
          : 1;
      setCurrentPage(startPage);
      setPageInput(String(startPage));
      setZoomPercent(100);
    }
  }, [isOpen, initialPage]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handlePageChange = (newPage: number) => {
    const valid = Math.max(1, Math.floor(newPage));
    setCurrentPage(valid);
    setPageInput(String(valid));
  };

  const handlePageInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseInt(pageInput, 10);
    if (!Number.isNaN(parsed) && parsed > 0) {
      handlePageChange(parsed);
    } else {
      setPageInput(String(currentPage));
    }
  };

  const handleZoom = (delta: number) => {
    setZoomPercent((prev) => Math.min(250, Math.max(50, prev + delta)));
  };

  const cleanPdfUrl = pdfUrl?.trim() || null;
  const embeddedSrc = cleanPdfUrl
    ? `${cleanPdfUrl}#page=${currentPage}&zoom=${zoomPercent}`
    : '';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pdf-viewer-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-2 sm:p-4 lg:p-6 animate-fadeIn"
    >
      <div className="relative w-full max-w-6xl h-[92vh] sm:h-[88vh] bg-white rounded-2xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden">
        {/* Top Header & Toolbar */}
        <div className="bg-slate-900 text-white px-4 py-3 sm:px-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 shrink-0">
          {/* Title Area */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2
                id="pdf-viewer-title"
                className="text-sm sm:text-base font-bold text-white truncate"
              >
                {displayTitle}
              </h2>
              <p className="text-[11px] text-slate-400 font-mono-tabular">
                Lecture Reference · Showing Page {currentPage}
              </p>
            </div>
          </div>

          {/* Navigation & Zoom Controls */}
          {cleanPdfUrl && (
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              {/* Page Navigator */}
              <div className="flex items-center bg-slate-800 rounded-lg p-1 border border-slate-700">
                <button
                  type="button"
                  aria-label="Previous Page"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage <= 1}
                  className="p-1 rounded text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-transparent transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <form onSubmit={handlePageInputSubmit} className="flex items-center px-1.5 gap-1">
                  <span className="text-xs text-slate-400 font-sans">Page</span>
                  <input
                    type="number"
                    min="1"
                    aria-label="Page number"
                    value={pageInput}
                    onChange={(e) => setPageInput(e.target.value)}
                    onBlur={() => {
                      const parsed = parseInt(pageInput, 10);
                      if (!Number.isNaN(parsed) && parsed > 0) {
                        handlePageChange(parsed);
                      } else {
                        setPageInput(String(currentPage));
                      }
                    }}
                    className="w-12 h-6 px-1.5 text-center text-xs font-mono-tabular font-bold bg-slate-900 border border-slate-700 text-white rounded focus:outline-hidden focus:border-sky-500"
                  />
                </form>

                <button
                  type="button"
                  aria-label="Next Page"
                  onClick={() => handlePageChange(currentPage + 1)}
                  className="p-1 rounded text-slate-300 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Zoom Controls */}
              <div className="hidden sm:flex items-center bg-slate-800 rounded-lg p-1 border border-slate-700">
                <button
                  type="button"
                  aria-label="Zoom out"
                  onClick={() => handleZoom(-25)}
                  disabled={zoomPercent <= 50}
                  className="p-1 rounded text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-40 cursor-pointer"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="px-2 text-xs font-mono-tabular text-slate-300 min-w-[50px] text-center">
                  {zoomPercent}%
                </span>
                <button
                  type="button"
                  aria-label="Zoom in"
                  onClick={() => handleZoom(25)}
                  disabled={zoomPercent >= 250}
                  className="p-1 rounded text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-40 cursor-pointer"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  aria-label="Reset zoom"
                  onClick={() => setZoomPercent(100)}
                  title="Reset Zoom"
                  className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-700 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* External / New Tab link */}
              <a
                href={cleanPdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="Open PDF in browser tab"
                className="hidden md:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 hover:text-white border border-slate-700 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>New Tab</span>
              </a>
            </div>
          )}

          {/* Close Button */}
          <button
            type="button"
            aria-label="Close PDF Viewer"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 bg-slate-100 relative min-h-0 flex flex-col">
          {cleanPdfUrl ? (
            <iframe
              key={embeddedSrc}
              src={embeddedSrc}
              title={title}
              className="w-full h-full border-0 bg-white"
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                No Lecture PDF Attached
              </h3>
              <p className="text-xs text-slate-600 max-w-sm">
                A PDF reference has not yet been configured for this lecture. Administrators can add PDF files via the Admin Console.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg cursor-pointer"
              >
                Close Viewer
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export interface PdfSlideViewerProps {
  pdfUrl?: string | null;
  initialPage?: number | null;
  title?: string;
  containerHeightClass?: string;
  onClose: () => void;
  onExpandToModal?: () => void;
}

/**
 * Embedded PowerPoint & Lecture Slide Reference Viewer
 * Formatted in a widescreen 16:9 presentation layout directly below the MCQ
 * with slide controls, zoom, full-screen expansion, and autoscroll support.
 */
export const PdfSlideViewer: React.FC<PdfSlideViewerProps> = ({
  pdfUrl,
  initialPage = 1,
  title = 'Lecture Presentation',
  containerHeightClass,
  onClose,
  onExpandToModal,
}) => {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageInput, setPageInput] = useState<string>('1');
  const [zoomPercent, setZoomPercent] = useState<number>(60);

  useEffect(() => {
    const startPage =
      initialPage && Number.isInteger(Number(initialPage)) && Number(initialPage) > 0
        ? Number(initialPage)
        : 1;
    setCurrentPage(startPage);
    setPageInput(String(startPage));
    setZoomPercent(60);
  }, [initialPage, pdfUrl]);

  const handlePageChange = (newPage: number) => {
    const valid = Math.max(1, Math.floor(newPage));
    setCurrentPage(valid);
    setPageInput(String(valid));
  };

  const handlePageInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseInt(pageInput, 10);
    if (!Number.isNaN(parsed) && parsed > 0) {
      handlePageChange(parsed);
    } else {
      setPageInput(String(currentPage));
    }
  };

  const handleZoom = (delta: number) => {
    setZoomPercent((prev) => Math.min(250, Math.max(30, prev + delta)));
  };

  const cleanPdfUrl = pdfUrl?.trim() || null;
  const embeddedSrc = cleanPdfUrl
    ? `${cleanPdfUrl}#page=${currentPage}&zoom=${zoomPercent}`
    : '';

  return (
    <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-xl flex flex-col overflow-hidden animate-fadeIn">
      {/* Slide Presentation Header Bar */}
      <div className="bg-slate-900 text-white px-4 py-3 sm:px-5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
            <Presentation className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white truncate" title={title}>
                {title}
              </h3>
              <span className="hidden sm:inline-flex px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Slide Reference
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono-tabular">
              Lecture Slide · Showing Page {currentPage}
            </p>
          </div>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {cleanPdfUrl && (
            <>
              {/* Slide Navigator */}
              <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700 text-xs">
                <button
                  type="button"
                  aria-label="Previous Slide"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage <= 1}
                  className="px-2 py-1 rounded text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-40 transition-colors flex items-center gap-1 cursor-pointer"
                  title="Previous Slide"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span className="hidden md:inline text-[11px] font-medium">Prev</span>
                </button>
                <form onSubmit={handlePageInputSubmit} className="flex items-center px-1.5 gap-1">
                  <span className="text-[11px] text-slate-400 font-sans">Slide</span>
                  <input
                    type="number"
                    min="1"
                    aria-label="Slide number"
                    value={pageInput}
                    onChange={(e) => setPageInput(e.target.value)}
                    onBlur={() => {
                      const parsed = parseInt(pageInput, 10);
                      if (!Number.isNaN(parsed) && parsed > 0) {
                        handlePageChange(parsed);
                      } else {
                        setPageInput(String(currentPage));
                      }
                    }}
                    className="w-11 h-6 text-center text-xs font-mono-tabular font-bold bg-slate-900 border border-slate-700 text-white rounded focus:outline-hidden focus:border-amber-500"
                  />
                </form>
                <button
                  type="button"
                  aria-label="Next Slide"
                  onClick={() => handlePageChange(currentPage + 1)}
                  className="px-2 py-1 rounded text-slate-300 hover:text-white hover:bg-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
                  title="Next Slide"
                >
                  <span className="hidden md:inline text-[11px] font-medium">Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Zoom Controls */}
              <div className="hidden sm:flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700 text-xs">
                <button
                  type="button"
                  onClick={() => handleZoom(-20)}
                  disabled={zoomPercent <= 30}
                  className="p-1.5 rounded text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-40 cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="px-1.5 text-xs font-mono-tabular text-slate-300 min-w-[42px] text-center">
                  {zoomPercent}%
                </span>
                <button
                  type="button"
                  onClick={() => handleZoom(20)}
                  disabled={zoomPercent >= 200}
                  className="p-1.5 rounded text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-40 cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoomPercent(60)}
                  className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-700 cursor-pointer"
                  title="Reset Zoom (60%)"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Fullscreen Expansion */}
              {onExpandToModal && (
                <button
                  type="button"
                  onClick={onExpandToModal}
                  className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Expand to Fullscreen Dialog"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              )}

              {/* Open in New Tab */}
              <a
                href={cleanPdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                title="Open PDF in new browser tab"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </>
          )}

          {/* Close Slide Preview */}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close Slide Preview"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Slide Canvas / Viewport - 16:9 Widescreen Presentation Layout */}
      <div className={`w-full ${containerHeightClass || 'h-[540px] sm:h-[620px] lg:h-[700px]'} bg-slate-900/5 relative min-h-0 flex flex-col`}>
        {cleanPdfUrl ? (
          <iframe
            key={embeddedSrc}
            src={embeddedSrc}
            title={title}
            className="w-full h-full border-0 bg-white"
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-2">
            <AlertCircle className="w-8 h-8 text-amber-600" />
            <p className="text-sm font-semibold text-slate-800">
              No lecture PDF attached for this lecture
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export const PdfSideViewer = PdfSlideViewer;
export type PdfSideViewerProps = PdfSlideViewerProps;
