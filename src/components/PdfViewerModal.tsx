import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Presentation,
  Loader2,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/* Document Cache (Prevents re-downloading/re-parsing on page turns/re-render)*/
/* -------------------------------------------------------------------------- */
const pdfDocPromiseCache = new Map<string, Promise<any>>();

function getCachedPdfDocument(pdfUrl: string, pdfjs: any): Promise<any> {
  const existing = pdfDocPromiseCache.get(pdfUrl);
  if (existing) return existing;

  const promise = pdfjs.getDocument({
    url: pdfUrl,
    cMapPacked: true,
  }).promise;

  pdfDocPromiseCache.set(pdfUrl, promise);
  return promise;
}

/* -------------------------------------------------------------------------- */
/* High-Performance Native Canvas PDF Renderer (PDF.js)                      */
/* Fixes Android/iOS/Tablet browser issue where <iframe> opens external app   */
/* -------------------------------------------------------------------------- */
interface PdfCanvasViewerProps {
  pdfUrl: string;
  pageNumber: number;
  zoomPercent: number;
  onTotalPagesResolved?: (total: number) => void;
  className?: string;
}

export const PdfCanvasViewer: React.FC<PdfCanvasViewerProps> = ({
  pdfUrl,
  pageNumber,
  zoomPercent,
  onTotalPagesResolved,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [loadingDoc, setLoadingDoc] = useState<boolean>(true);
  const [renderingPage, setRenderingPage] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const renderTaskRef = useRef<any>(null);

  // Keep latest callback in a ref to decouple effect dependency
  const onTotalPagesResolvedRef = useRef(onTotalPagesResolved);
  useEffect(() => {
    onTotalPagesResolvedRef.current = onTotalPagesResolved;
  });

  // Helper to ensure PDF.js script is loaded
  const getPdfJs = async (): Promise<any> => {
    if (typeof window === 'undefined') return null;
    if ((window as any).pdfjsLib) return (window as any).pdfjsLib;

    return new Promise((resolve, reject) => {
      const existing = document.querySelector('script[src*="pdf.min.js"]');
      if (existing) {
        existing.addEventListener('load', () => resolve((window as any).pdfjsLib));
        existing.addEventListener('error', reject);
        return;
      }
      const script = document.createElement('script');
      script.src = '/vendor/pdfjs/pdf.min.js';
      script.onload = () => resolve((window as any).pdfjsLib);
      script.onerror = reject;
      document.head.appendChild(script);
    });
  };

  // 1. Fetch & parse PDF document (Runs ONLY when pdfUrl changes)
  useEffect(() => {
    let isCancelled = false;
    setLoadingDoc(true);
    setError(null);

    const loadDocument = async () => {
      try {
        const pdfjs = await getPdfJs();
        if (!pdfjs) {
          throw new Error('PDF rendering library could not be initialized.');
        }
        pdfjs.GlobalWorkerOptions.workerSrc = '/vendor/pdfjs/pdf.worker.min.js';

        const doc = await getCachedPdfDocument(pdfUrl, pdfjs);
        if (!isCancelled) {
          setPdfDoc(doc);
          setLoadingDoc(false);
          onTotalPagesResolvedRef.current?.(doc.numPages);
        }
      } catch (err: any) {
        if (!isCancelled) {
          console.error('Error loading PDF document:', err);
          setError(err?.message || 'Could not load lecture PDF.');
          setLoadingDoc(false);
        }
      }
    };

    loadDocument();

    return () => {
      isCancelled = true;
    };
  }, [pdfUrl]);

  // 2. Render Page onto Canvas
  const renderCurrentPage = useCallback(async () => {
    if (!pdfDoc || !canvasRef.current || !containerRef.current) return;

    if (renderTaskRef.current) {
      try {
        renderTaskRef.current.cancel();
      } catch {
        // ignore cancel error
      }
      renderTaskRef.current = null;
    }

    setRenderingPage(true);
    try {
      const targetPageNum = Math.min(Math.max(1, pageNumber), pdfDoc.numPages);
      const page = await pdfDoc.getPage(targetPageNum);
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      const unscaledViewport = page.getViewport({ scale: 1 });
      const containerWidth = container.clientWidth || 700;

      // Fit to container width with comfortable margin
      const availableWidth = Math.max(280, containerWidth - 32);
      const baseScale = availableWidth / unscaledViewport.width;
      const effectiveScale = Math.max(0.2, baseScale * (zoomPercent / 100));

      const viewport = page.getViewport({ scale: effectiveScale });
      const pixelRatio = window.devicePixelRatio || 1;

      canvas.width = Math.floor(viewport.width * pixelRatio);
      canvas.height = Math.floor(viewport.height * pixelRatio);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

      const renderTask = page.render({
        canvasContext: ctx,
        viewport,
      });
      renderTaskRef.current = renderTask;
      await renderTask.promise;
      renderTaskRef.current = null;
    } catch (err: any) {
      if (err?.name !== 'RenderingCancelledException') {
        console.warn('Page render warning:', err);
      }
    } finally {
      setRenderingPage(false);
    }
  }, [pdfDoc, pageNumber, zoomPercent]);

  useEffect(() => {
    renderCurrentPage();
  }, [renderCurrentPage]);

  // Responsive re-fit on resize or orientation change (debounced)
  useEffect(() => {
    let timeoutId: any;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        renderCurrentPage();
      }, 150);
    };
    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResize);
    };
  }, [renderCurrentPage]);

  return (
    <div
      ref={containerRef}
      className={`w-full h-full relative overflow-auto bg-slate-950 flex flex-col items-center justify-start p-3 sm:p-4 select-none touch-pan-x touch-pan-y ${className}`}
    >
      {/* Initial load overlay: Only displayed when first loading the document */}
      {loadingDoc && !pdfDoc && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-xs z-10 space-y-3">
          <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
          <p className="text-xs font-semibold text-slate-300">
            Loading Lecture Slide Deck...
          </p>
        </div>
      )}

      {error ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3 max-w-md my-auto">
          <AlertCircle className="w-10 h-10 text-rose-500" />
          <h4 className="text-sm font-bold text-white">Slide Load Failed</h4>
          <p className="text-xs text-slate-400">{error}</p>
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-lg transition-colors inline-flex items-center gap-2"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Open Raw PDF Document
          </a>
        </div>
      ) : (
        <div className="relative my-auto flex items-center justify-center">
          <canvas
            ref={canvasRef}
            className="rounded-lg shadow-2xl bg-white max-w-none transition-shadow duration-200"
          />
          {renderingPage && canvasRef.current?.width && (
            <div className="absolute top-3 right-3 bg-slate-900/80 text-amber-300 text-[10px] font-mono px-2 py-1 rounded backdrop-blur border border-amber-500/30 flex items-center gap-1.5 shadow-lg">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Rendering...</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Fullscreen PDF Viewer Modal                                                */
/* -------------------------------------------------------------------------- */
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
}) => {
  const displayTitle = title || lectureTitle || 'Lecture PDF Document';
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageInput, setPageInput] = useState<string>('1');
  const [zoomPercent, setZoomPercent] = useState<number>(100);
  const [totalPages, setTotalPages] = useState<number | null>(null);

  const handleTotalPages = useCallback((total: number) => {
    setTotalPages((prev) => (prev === total ? prev : total));
  }, []);

  useEffect(() => {
    if (isOpen) {
      const startPage =
        initialPage && Number.isInteger(Number(initialPage)) && Number(initialPage) > 0
          ? Number(initialPage)
          : 1;
      setCurrentPage(startPage);
      setPageInput(String(startPage));
      setZoomPercent(100);
      setTotalPages(null);
    }
  }, [isOpen, initialPage, pdfUrl]);

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
    let valid = Math.max(1, Math.floor(newPage));
    if (totalPages && valid > totalPages) valid = totalPages;
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
    setZoomPercent((prev) => Math.min(250, Math.max(40, prev + delta)));
  };

  const cleanPdfUrl = pdfUrl?.trim() || null;

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
                Lecture Reference · Showing Slide {currentPage}
                {totalPages ? ` of ${totalPages}` : ''}
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
                  <span className="text-xs text-slate-400 font-sans">Slide</span>
                  <input
                    type="number"
                    min="1"
                    max={totalPages || undefined}
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
                    className="w-12 h-6 text-center text-xs font-mono-tabular font-bold bg-slate-900 border border-slate-700 text-white rounded focus:outline-hidden focus:border-sky-500"
                  />
                  {totalPages && (
                    <span className="text-xs text-slate-400 font-mono-tabular">
                      / {totalPages}
                    </span>
                  )}
                </form>

                <button
                  type="button"
                  aria-label="Next Page"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={Boolean(totalPages && currentPage >= totalPages)}
                  className="p-1 rounded text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-transparent transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Zoom Controls */}
              <div className="hidden sm:flex items-center bg-slate-800 rounded-lg p-1 border border-slate-700 text-xs">
                <button
                  type="button"
                  onClick={() => handleZoom(-15)}
                  disabled={zoomPercent <= 40}
                  className="p-1 rounded text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-40 cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="px-2 text-xs font-mono-tabular text-slate-300 min-w-[42px] text-center">
                  {zoomPercent}%
                </span>
                <button
                  type="button"
                  onClick={() => handleZoom(15)}
                  disabled={zoomPercent >= 250}
                  className="p-1 rounded text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-40 cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoomPercent(100)}
                  className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-700 cursor-pointer"
                  title="Reset Zoom (100%)"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Open in New Tab Link */}
              <a
                href={cleanPdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                title="Open PDF in new browser tab"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          )}

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body with Native Canvas Renderer */}
        <div className="flex-1 bg-slate-950 relative min-h-0 flex flex-col">
          {cleanPdfUrl ? (
            <PdfCanvasViewer
              pdfUrl={cleanPdfUrl}
              pageNumber={currentPage}
              zoomPercent={zoomPercent}
              onTotalPagesResolved={handleTotalPages}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3 bg-white">
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

/* -------------------------------------------------------------------------- */
/* Inline Slide Viewer (Used during Study Mode & Practice)                     */
/* -------------------------------------------------------------------------- */
export interface PdfSlideViewerProps {
  pdfUrl?: string | null;
  initialPage?: number | null;
  title?: string;
  lectureTitle?: string;
  onClose?: () => void;
  containerHeightClass?: string;
  onExpandToModal?: () => void;
}

export const PdfSlideViewer: React.FC<PdfSlideViewerProps> = ({
  pdfUrl,
  initialPage = 1,
  title = 'Lecture Slide Reference',
  onClose,
  containerHeightClass,
  onExpandToModal,
}) => {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageInput, setPageInput] = useState<string>('1');
  const [zoomPercent, setZoomPercent] = useState<number>(100);
  const [totalPages, setTotalPages] = useState<number | null>(null);

  const handleTotalPages = useCallback((total: number) => {
    setTotalPages((prev) => (prev === total ? prev : total));
  }, []);

  useEffect(() => {
    const startPage =
      initialPage && Number.isInteger(Number(initialPage)) && Number(initialPage) > 0
        ? Number(initialPage)
        : 1;
    setCurrentPage(startPage);
    setPageInput(String(startPage));
    setZoomPercent(100);
    setTotalPages(null);
  }, [initialPage, pdfUrl]);

  const handlePageChange = (newPage: number) => {
    let valid = Math.max(1, Math.floor(newPage));
    if (totalPages && valid > totalPages) valid = totalPages;
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
    setZoomPercent((prev) => Math.min(250, Math.max(40, prev + delta)));
  };

  const cleanPdfUrl = pdfUrl?.trim() || null;

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
              Lecture Slide · Showing Slide {currentPage}
              {totalPages ? ` of ${totalPages}` : ''}
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
                    max={totalPages || undefined}
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
                  {totalPages && (
                    <span className="text-[11px] text-slate-400 font-mono-tabular">
                      / {totalPages}
                    </span>
                  )}
                </form>
                <button
                  type="button"
                  aria-label="Next Slide"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={Boolean(totalPages && currentPage >= totalPages)}
                  className="px-2 py-1 rounded text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-40 transition-colors flex items-center gap-1 cursor-pointer"
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
                  onClick={() => handleZoom(-15)}
                  disabled={zoomPercent <= 40}
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
                  onClick={() => handleZoom(15)}
                  disabled={zoomPercent >= 250}
                  className="p-1.5 rounded text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-40 cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoomPercent(100)}
                  className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-700 cursor-pointer"
                  title="Reset Zoom (100%)"
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
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Close Slide Preview"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Native Slide Canvas Viewport */}
      <div className={`w-full ${containerHeightClass || 'h-[540px] sm:h-[620px] lg:h-[700px]'} bg-slate-950 relative min-h-0 flex flex-col`}>
        {cleanPdfUrl ? (
          <PdfCanvasViewer
            pdfUrl={cleanPdfUrl}
            pageNumber={currentPage}
            zoomPercent={zoomPercent}
            onTotalPagesResolved={handleTotalPages}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-2 bg-white">
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
