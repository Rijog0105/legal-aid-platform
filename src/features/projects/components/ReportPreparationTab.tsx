import { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Eye,
  Download,
  Printer,
  Lock,
  Plus,
  Trash2,
  CheckCircle2,
  Save,
  RotateCcw,
  Sparkles,
  Users,
  ShieldCheck,
  Calendar,
  MapPin,
  ArrowRight,
} from 'lucide-react';
import { Spinner, IndianRupeeIcon } from '@/components/ui';
import { useProject } from '../hooks/useProject';
import {
  type FinalReportData,
  initializeFinalReportData,
  saveFinalReportDraft,
  fetchReportConvenerAndGuestOptions,
  type ConvenerAndGuestOptions,
} from '../services/finalReportService';
import { ReportPhotoManager } from './ReportPhotoManager';
import { FinalEventReportDocument } from '@/features/reports/components/FinalEventReportDocument';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { saveAs } from 'file-saver';

/**
 * Overrides window.getComputedStyle and provides a color converter so that
 * Tailwind CSS v4's oklch(...) color specifications do not crash html2canvas.
 */
function setupOklchColorConverter() {
  const originalGetComputedStyle = window.getComputedStyle;
  const dummyCanvas = document.createElement('canvas');
  dummyCanvas.width = 1;
  dummyCanvas.height = 1;
  const ctx = dummyCanvas.getContext('2d', { willReadFrequently: true });
  const colorCache = new Map<string, string>();

  const convertOklchToRgb = (cssText: string): string => {
    if (!cssText || !cssText.includes('oklch')) return cssText;
    if (!ctx) return cssText;

    return cssText.replace(/oklch\([^)]+\)/g, (match) => {
      const cached = colorCache.get(match);
      if (cached) return cached;

      try {
        ctx.fillStyle = match;
        ctx.clearRect(0, 0, 1, 1);
        ctx.fillRect(0, 0, 1, 1);
        const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
        const rgbStr =
          a === 255
            ? `rgb(${r}, ${g}, ${b})`
            : `rgba(${r}, ${g}, ${b}, ${(a / 255).toFixed(3)})`;
        colorCache.set(match, rgbStr);
        return rgbStr;
      } catch (e) {
        return 'rgb(79, 70, 229)';
      }
    });
  };

  // Global override of getComputedStyle on the main window during html2canvas capture
  window.getComputedStyle = function (element, pseudoElt) {
    const style = originalGetComputedStyle(element, pseudoElt);
    return new Proxy(style, {
      get(target, prop) {
        if (prop === 'getPropertyValue') {
          return (propertyName: string) => {
            const val = target.getPropertyValue(propertyName);
            if (typeof val === 'string' && val.includes('oklch')) {
              return convertOklchToRgb(val);
            }
            return val;
          };
        }
        const val = Reflect.get(target, prop);
        if (typeof val === 'string' && val.includes('oklch')) {
          return convertOklchToRgb(val);
        }
        if (typeof val === 'function') {
          return val.bind(target);
        }
        return val;
      },
    });
  };

  return {
    convertOklchToRgb,
    cleanup: () => {
      window.getComputedStyle = originalGetComputedStyle;
    },
  };
}

interface ReportPreparationTabProps {
  projectId: string;
  project?: any;
  onNavigateTab?: (tabKey: 'activities' | 'photos') => void;
}

export function ReportPreparationTab({
  projectId,
  project: initialProject,
}: ReportPreparationTabProps) {
  const { project: fetchedProject, isLoading: projectLoading } = useProject(projectId);
  const project = initialProject || fetchedProject;

  // 3-Stage Navigation State: 'wizard' | 'preview' | 'generate'
  const [activeStage, setActiveStage] = useState<'wizard' | 'preview' | 'generate'>('wizard');
  const [reportData, setReportData] = useState<FinalReportData | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<string>('');
  const [saveToast, setSaveToast] = useState(false);
  const [lastGeneratedPdfUrl, setLastGeneratedPdfUrl] = useState<string | null>(null);
  const [lastGeneratedPdfFilename, setLastGeneratedPdfFilename] = useState<string>('');

  const [convenerOptions, setConvenerOptions] = useState<ConvenerAndGuestOptions>({
    availableStudents: [],
    availableFaculty: [],
    availableGuests: [],
  });

  const previewContainerRef = useRef<HTMLDivElement>(null);
  const pdfExportContainerRef = useRef<HTMLDivElement>(null);

  // Initialize report data and dropdown options
  useEffect(() => {
    if (!project) return;
    let isMounted = true;
    setIsLoadingData(true);

    Promise.all([
      initializeFinalReportData(projectId, project),
      fetchReportConvenerAndGuestOptions(projectId),
    ])
      .then(([data, options]) => {
        if (isMounted) {
          setReportData(data);
          setConvenerOptions(options);
          setIsLoadingData(false);
        }
      })
      .catch((err) => {
        console.error('Failed to initialize report data:', err);
        if (isMounted) setIsLoadingData(false);
      });

    return () => {
      isMounted = false;
    };
  }, [projectId, project]);

  // Save changes to state and localStorage
  const updateReportData = (updates: Partial<FinalReportData>) => {
    if (!reportData) return;
    const updated = { ...reportData, ...updates };
    setReportData(updated);
    saveFinalReportDraft(projectId, updated);
  };

  const handleManualSave = () => {
    if (!reportData) return;
    saveFinalReportDraft(projectId, reportData);
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2500);
  };

  const handleResetToDefault = async () => {
    if (!project || !window.confirm('Reset all editable fields to blank?')) return;
    localStorage.removeItem(`final_report_draft_${projectId}`);
    setIsLoadingData(true);
    const fresh = await initializeFinalReportData(projectId, project);
    setReportData(fresh);
    setIsLoadingData(false);
  };

  // Schedule items helpers (can add or edit, cannot delete section)
  const handleScheduleItemChange = (index: number, value: string) => {
    if (!reportData) return;
    const next = [...reportData.scheduleItems];
    next[index] = value;
    updateReportData({ scheduleItems: next });
  };

  const handleAddScheduleItem = () => {
    if (!reportData) return;
    updateReportData({
      scheduleItems: [...reportData.scheduleItems, ''],
    });
  };

  const handleRemoveScheduleItem = (index: number) => {
    if (!reportData) return;
    if (reportData.scheduleItems.length <= 1) {
      alert('Core section requirement: At least one schedule agenda item entry must remain.');
      return;
    }
    const next = reportData.scheduleItems.filter((_, idx) => idx !== index);
    updateReportData({ scheduleItems: next });
  };

  // Guests items helpers
  const handleGuestChange = (index: number, value: string) => {
    if (!reportData) return;
    const next = [...reportData.guestsInvited];
    next[index] = value;
    updateReportData({ guestsInvited: next });
  };

  const handleAddGuest = () => {
    if (!reportData) return;
    updateReportData({
      guestsInvited: [...reportData.guestsInvited, ''],
    });
  };

  const handleRemoveGuest = (index: number) => {
    if (!reportData) return;
    if (reportData.guestsInvited.length <= 1) {
      alert('At least one guest entry must remain.');
      return;
    }
    const next = reportData.guestsInvited.filter((_, idx) => idx !== index);
    updateReportData({ guestsInvited: next });
  };

  // Narrative paragraphs helpers
  const handleParagraphChange = (index: number, value: string) => {
    if (!reportData) return;
    const next = [...reportData.detailedReportParagraphs];
    next[index] = value;
    updateReportData({ detailedReportParagraphs: next });
  };

  const handleAddParagraph = () => {
    if (!reportData) return;
    updateReportData({
      detailedReportParagraphs: [
        ...reportData.detailedReportParagraphs,
        '',
      ],
    });
  };

  const handleRemoveParagraph = (index: number) => {
    if (!reportData) return;
    if (reportData.detailedReportParagraphs.length <= 1) {
      alert('Core section requirement: Detailed report narrative must not be deleted.');
      return;
    }
    const next = reportData.detailedReportParagraphs.filter((_, idx) => idx !== index);
    updateReportData({ detailedReportParagraphs: next });
  };

  const handleSelectFacultyConvener = (val: string) => {
    if (!val || !reportData) return;
    if (!reportData.facultyConveners.trim()) {
      updateReportData({ facultyConveners: val });
    } else if (!reportData.facultyConveners.includes(val)) {
      updateReportData({ facultyConveners: `${reportData.facultyConveners}, ${val}` });
    }
  };

  const handleSelectStudentConvener = (val: string) => {
    if (!val || !reportData) return;
    if (!reportData.studentConveners.trim()) {
      updateReportData({ studentConveners: val });
    } else if (!reportData.studentConveners.includes(val)) {
      updateReportData({ studentConveners: `${reportData.studentConveners}, ${val}` });
    }
  };

  const handleSelectGuest = (val: string) => {
    if (!val || !reportData) return;
    const emptyIndex = reportData.guestsInvited.findIndex((g) => !g.trim());
    if (emptyIndex !== -1) {
      const next = [...reportData.guestsInvited];
      next[emptyIndex] = val;
      updateReportData({ guestsInvited: next });
    } else {
      updateReportData({ guestsInvited: [...reportData.guestsInvited, val] });
    }
  };

  // Generate multi-page PDF matching exact preview A4 dimensions
  const handleGenerateFinalReport = async () => {
    if (!reportData) return;
    setIsGeneratingPDF(true);
    setGenerationProgress('Preparing high-fidelity institutional pages...');

    const { convertOklchToRgb, cleanup } = setupOklchColorConverter();
    const savedScrollX = typeof window !== 'undefined' ? window.scrollX : 0;
    const savedScrollY = typeof window !== 'undefined' ? window.scrollY : 0;

    try {
      const container = pdfExportContainerRef.current;
      if (!container) {
        throw new Error('PDF export container is not mounted.');
      }

      // Convert images inside the export container to base64 data URLs to eliminate CORS & canvas taint issues
      const images = Array.from(container.querySelectorAll('img'));
      if (images.length > 0) {
        setGenerationProgress('Decoding logos and photographs...');
        await Promise.all(
          images.map(async (img) => {
            if (img.src && !img.src.startsWith('data:')) {
              try {
                const res = await fetch(img.src);
                const blob = await res.blob();
                await new Promise<void>((resolve) => {
                  const reader = new FileReader();
                  reader.onloadend = () => {
                    if (typeof reader.result === 'string') {
                      img.src = reader.result;
                    }
                    resolve();
                  };
                  reader.onerror = () => resolve();
                  reader.readAsDataURL(blob);
                });
              } catch {
                // If fetch fails, retain original src with useCORS
              }
            }
            if (img.complete && img.naturalHeight !== 0) return Promise.resolve();
            return new Promise((resolve) => {
              img.onload = resolve;
              img.onerror = resolve;
              setTimeout(resolve, 3000);
            });
          })
        );
      }

      // Scroll window to (0,0) during capture to guarantee html2canvas never offsets or crops the top header
      if (typeof window !== 'undefined') {
        window.scrollTo(0, 0);
      }

      // Extra tick for rendering stability
      await new Promise((res) => setTimeout(res, 200));

      const pages = container.querySelectorAll('.report-page');
      if (pages.length === 0) {
        throw new Error('No printable pages found.');
      }

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth(); // 210mm
      const pdfHeight = pdf.internal.pageSize.getHeight(); // 297mm

      for (let i = 0; i < pages.length; i++) {
        setGenerationProgress(
          `Rendering Page ${i + 1} of ${pages.length} with REVA University & CivicForgeLabs branding...`
        );
        if (i > 0) pdf.addPage();

        const pageEl = pages[i] as HTMLElement;
        const canvas = await html2canvas(pageEl, {
          scale: 2,
          useCORS: true,
          allowTaint: false,
          logging: false,
          backgroundColor: '#ffffff',
          windowWidth: 794,
          scrollX: 0,
          scrollY: 0,
          onclone: (clonedDoc) => {
            // Normalize text spacing styles and font-family to prevent character collapse
            clonedDoc.querySelectorAll('*').forEach((node) => {
              const htmlEl = node as HTMLElement;
              if (htmlEl.style) {
                htmlEl.style.setProperty(
                  'font-family',
                  'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
                  'important'
                );
                htmlEl.style.setProperty('letter-spacing', 'normal', 'important');
                htmlEl.style.setProperty('word-spacing', 'normal', 'important');
              }
            });

            // Replace stylesheets with oklch-sanitized styles
            const head = clonedDoc.head;
            clonedDoc
              .querySelectorAll('style, link[rel="stylesheet"]')
              .forEach((node) => node.remove());

            Array.from(document.styleSheets).forEach((sheet) => {
              try {
                let cssText = '';
                const rules = sheet.cssRules || sheet.rules;
                if (rules) {
                  cssText = Array.from(rules)
                    .map((rule) => rule.cssText)
                    .join('\n');
                }
                const cleanCss = convertOklchToRgb(cssText);
                const styleEl = clonedDoc.createElement('style');
                styleEl.textContent = cleanCss;
                head.appendChild(styleEl);
              } catch (e) {
                // Cross-origin stylesheet safely ignored
              }
            });
          },
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
      }

      setGenerationProgress('Finalizing PDF download package...');
      const cleanCampName = (reportData.eventName || 'Camp')
        .replace(/[^a-zA-Z0-9]/g, '_')
        .slice(0, 30);
      const filename = `Final_Institutional_Report_${cleanCampName}.pdf`;

      const pdfBlob = pdf.output('blob');
      saveAs(pdfBlob, filename);

      const blobUrl = URL.createObjectURL(pdfBlob);
      setLastGeneratedPdfUrl(blobUrl);
      setLastGeneratedPdfFilename(filename);
    } catch (err) {
      console.error('Failed to generate final report PDF:', err);
      alert('Automatic high-resolution PDF creation encountered an issue. Triggering native print dialog.');
      window.print();
    } finally {
      cleanup();
      if (typeof window !== 'undefined') {
        window.scrollTo(savedScrollX, savedScrollY);
      }
      setIsGeneratingPDF(false);
      setGenerationProgress('');
    }
  };

  if (projectLoading || isLoadingData || !reportData) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-3">
        <Spinner size="lg" />
        <p className="text-xs font-semibold text-slate-500">
          Compiling attendance records, budget expenditures, and institutional template...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* ──────────────────────────────────────────────────────────
          TOP BAR: 3 STAGES (Edit Wizard | Preview | Generate Final)
          ────────────────────────────────────────────────────────── */}
      <div className="bg-slate-900 text-white p-3.5 sm:p-5 rounded-2xl border border-slate-800 shadow-md flex flex-col md:flex-row md:items-center md:justify-between gap-3 sm:gap-4">
        {/* Header Title & Co-Branding */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-300 shrink-0">
            <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <h2 className="text-sm sm:text-base md:text-lg font-bold">Final Institutional Event Report</h2>
              <span className="text-[10px] font-bold text-indigo-300">
                • CivicForgeLabs
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-400 truncate">
              REVA University official event proceedings, deduplicated attendance, and budget statement
            </p>
          </div>
        </div>

        {/* 3 Main Workflow Options: 3-column grid on mobile, flex on desktop */}
        <div className="grid grid-cols-3 gap-1 bg-slate-800/90 p-1 sm:p-1.5 rounded-xl border border-slate-700 w-full md:w-auto shrink-0">
          {/* 1. Edit Wizard Button */}
          <button
            type="button"
            onClick={() => setActiveStage('wizard')}
            className={`flex items-center justify-center gap-1 sm:gap-1.5 px-1.5 sm:px-3 py-2 rounded-lg text-[10px] xs:text-[11px] sm:text-xs font-bold transition-all cursor-pointer min-h-[42px] ${
              activeStage === 'wizard'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">1. Wizard</span>
          </button>

          {/* 2. Preview Option Button */}
          <button
            type="button"
            onClick={() => setActiveStage('preview')}
            className={`flex items-center justify-center gap-1 sm:gap-1.5 px-1.5 sm:px-3 py-2 rounded-lg text-[10px] xs:text-[11px] sm:text-xs font-bold transition-all cursor-pointer min-h-[42px] ${
              activeStage === 'preview'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <Eye className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">2. Preview</span>
          </button>

          {/* 3. Generate Final Report Tab */}
          <button
            type="button"
            onClick={() => setActiveStage('generate')}
            className={`flex items-center justify-center gap-1 sm:gap-1.5 px-1.5 sm:px-3 py-2 rounded-lg text-[10px] xs:text-[11px] sm:text-xs font-bold transition-all cursor-pointer min-h-[42px] ${
              activeStage === 'generate'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <Download className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">3. Generate</span>
          </button>
        </div>
      </div>

      {/* Save Toast Notification */}
      {saveToast && (
        <div className="fixed top-6 right-6 z-50 bg-emerald-700 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-top-3">
          <CheckCircle2 className="w-4 h-4" />
          Draft saved to local workspace.
        </div>
      )}

      {/* PDF Generation Loading Modal */}
      {isGeneratingPDF && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-md w-full text-center space-y-4 border border-slate-200">
            <Spinner size="lg" />
            <h3 className="text-base font-bold text-slate-900">Compiling Final Event Report</h3>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              {generationProgress || 'Rendering institutional format with REVA logo & CivicForgeLabs badge...'}
            </p>
            <p className="text-[11px] text-slate-400">Please do not close this browser window.</p>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────
          STAGE 1: EDIT WIZARD (Side options + Live format)
          ────────────────────────────────────────────────────────── */}
      {activeStage === 'wizard' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* ── SIDEBAR (Left 4 cols): Autofill status, photo management, options ── */}
          <div className="lg:col-span-4 space-y-5">
            {/* Sidebar Card 1: System Autofilled Metrics (Locked) */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Autofilled Institutional Facts</span>
                </div>
                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Lock className="w-3 h-3 text-slate-400" />
                  Locked
                </span>
              </div>

              {/* Deduplicated Attendance Card */}
              <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200/80 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-emerald-700" />
                    Unique Student Attendance
                  </span>
                  <span className="text-xs font-black text-emerald-700">
                    {reportData.totalUniqueStudents} Students
                  </span>
                </div>
                <p className="text-[11px] text-emerald-800 leading-tight">
                  Extracted from Survey & Camp phase check-in sessions with zero duplication.
                </p>
              </div>

              {/* Overall Budget Card */}
              <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-200/80 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-950 flex items-center gap-1">
                    <IndianRupeeIcon className="w-3.5 h-3.5 text-indigo-700" />
                    Overall Budget Statement
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1 pt-1 text-center">
                  <div className="bg-white/80 p-1.5 rounded-lg border border-indigo-100">
                    <span className="text-[9px] text-slate-500 block font-semibold">Allocated</span>
                    <span className="text-[11px] font-bold text-slate-900">
                      ₹{reportData.overallBudget.allocated.toLocaleString()}
                    </span>
                  </div>
                  <div className="bg-white/80 p-1.5 rounded-lg border border-indigo-100">
                    <span className="text-[9px] text-slate-500 block font-semibold">Spent</span>
                    <span className="text-[11px] font-bold text-rose-600">
                      ₹{reportData.overallBudget.spent.toLocaleString()}
                    </span>
                  </div>
                  <div className="bg-white/80 p-1.5 rounded-lg border border-indigo-100">
                    <span className="text-[9px] text-slate-500 block font-semibold">Balance</span>
                    <span className="text-[11px] font-bold text-emerald-600">
                      ₹{reportData.overallBudget.balance.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Event Name & Venue summary */}
              <div className="space-y-2 text-xs text-slate-600">
                <div className="flex items-start gap-2">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-semibold text-slate-800">Date: </span>
                    {reportData.dateOfEvent}
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-semibold text-slate-800">Venue: </span>
                    {reportData.venue}
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar Card 2: Camp Photos Studio */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3">
              <ReportPhotoManager
                projectId={projectId}
                photos={reportData.photos}
                onChange={(photos) => updateReportData({ photos })}
              />
            </div>

            {/* Sidebar Card 3: Draft Controls */}
            <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-4 shadow-sm flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleResetToDefault}
                className="flex-1 px-3 py-2.5 text-slate-600 hover:text-slate-900 text-xs font-semibold flex items-center justify-center gap-1.5 rounded-xl hover:bg-slate-100 transition-all cursor-pointer min-h-[42px]"
                title="Reset editable fields to default template"
              >
                <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Reset Template</span>
              </button>

              <button
                type="button"
                onClick={handleManualSave}
                className="flex-1 px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center gap-1.5 rounded-xl border border-indigo-200 transition-all cursor-pointer min-h-[42px]"
              >
                <Save className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Save Draft</span>
              </button>
            </div>
          </div>

          {/* ── MAIN WORKSPACE (Right 8 cols): Live Formatted Document Editor ── */}
          <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                  Institutional Event Report Live Editor
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                  Autofilled data is permanently preserved. Faculty can edit details and add entries without deleting core sections.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveStage('preview')}
                className="w-full sm:w-auto min-h-[42px] justify-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer shrink-0"
              >
                <span>Preview Document</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* 1. COVER PAGE FORMAT BLOCK */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center">
                  1
                </span>
                <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                  Cover Page Details (Institutional Boxed Format)
                </h4>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-4">
                {/* Box 1: Event Name */}
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      NAME OF EVENT –
                    </label>
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5" /> Autofilled
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm font-bold text-slate-900">
                    {reportData.eventName}
                  </p>
                </div>

                {/* Box 2: Date of Event */}
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      DATE OF EVENT –
                    </label>
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5" /> Autofilled
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm font-bold text-slate-900">
                    {reportData.dateOfEvent}
                  </p>
                </div>

                {/* Box 3: Venue */}
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      VENUE –
                    </label>
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5" /> Autofilled
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm font-bold text-slate-900">
                    {reportData.venue}
                  </p>
                </div>
              </div>
            </div>

            {/* 2. EVENT REPORT TABLE BLOCK */}
            <div className="space-y-4 pt-4 border-t border-slate-200">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center">
                  2
                </span>
                <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                  Event Report Table Fields
                </h4>
              </div>

              <div className="space-y-4">
                {/* Field: Organized in collaboration with */}
                <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-1.5 focus-within:border-indigo-500 transition-colors">
                  <label className="text-xs font-bold text-slate-800 block">
                    Organized in collaboration with:
                  </label>
                  <input
                    type="text"
                    value={reportData.collaborators}
                    onChange={(e) => updateReportData({ collaborators: e.target.value })}
                    placeholder="e.g. Department Of Justice, Ministry of Law and Justice, and Government of India"
                    className="w-full text-xs text-slate-800 border border-slate-200 rounded-lg p-2 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Field: Organized by (Locked) */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Organized by:</span>
                    <span className="text-xs text-slate-700 font-medium">
                      {reportData.organizedBy}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-200 px-2 py-0.5 rounded flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5" /> Fixed Institutional Standard
                  </span>
                </div>

                {/* Field: Schedule of Event (Editable & Addable) */}
                <div className="p-3.5 sm:p-4 bg-white rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs font-bold text-slate-800 block">
                      Schedule of Event (Agenda Sequence)
                    </label>
                    <button
                      type="button"
                      onClick={handleAddScheduleItem}
                      className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg border border-indigo-200 flex items-center gap-1 cursor-pointer min-h-[36px] shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5 shrink-0" />
                      <span>Add Item</span>
                    </button>
                  </div>

                  <div className="space-y-2">
                    {reportData.scheduleItems.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-400 w-5 text-right shrink-0">
                          {idx + 1}.
                        </span>
                        <input
                          type="text"
                          value={item}
                          onChange={(e) => handleScheduleItemChange(idx, e.target.value)}
                          className="flex-1 min-w-0 text-xs text-slate-800 border border-slate-200 rounded-lg p-2 focus:outline-none focus:border-indigo-500 bg-white"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveScheduleItem(idx)}
                          className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer min-h-[38px] min-w-[38px] flex items-center justify-center shrink-0"
                          title="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Conveners & Guests Grid with Dropdowns */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Faculty Convener */}
                  <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-2 focus-within:border-indigo-500">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800 block">
                        Faculty Convener(s)
                      </label>
                      <span className="text-[10px] text-slate-400 font-semibold">Dropdown or type</span>
                    </div>

                    {/* Dropdown for Available Faculty */}
                    <div className="space-y-1">
                      <select
                        value=""
                        onChange={(e) => handleSelectFacultyConvener(e.target.value)}
                        className="w-full text-xs text-indigo-900 font-medium bg-indigo-50/80 border border-indigo-200 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                      >
                        <option value="">
                          {convenerOptions.availableFaculty.length > 0
                            ? '▼ Choose assigned faculty convener for this camp...'
                            : '▼ No assigned faculty convener for this camp'}
                        </option>
                        {convenerOptions.availableFaculty.map((fac) => (
                          <option key={fac.id} value={fac.name}>
                            {fac.name} {fac.subtitle ? `— ${fac.subtitle}` : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <input
                      type="text"
                      value={reportData.facultyConveners}
                      onChange={(e) => updateReportData({ facultyConveners: e.target.value })}
                      placeholder="e.g. Dr. Priya Sharma, Prof. K. R. Gowda"
                      className="w-full text-xs text-slate-800 border border-slate-200 rounded-lg p-2 focus:outline-none focus:border-indigo-500 bg-white"
                    />
                    <p className="text-[10px] text-slate-400 leading-tight">
                      Select assigned faculty coordinators for this camp from dropdown, or edit / add names directly.
                    </p>
                  </div>

                  {/* Student / Team Lead Convener */}
                  <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-2 focus-within:border-indigo-500">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800 block">
                        Student / Team Lead Convener(s)
                      </label>
                      <span className="text-[10px] text-slate-400 font-semibold">Dropdown or type</span>
                    </div>

                    {/* Dropdown for Available Students */}
                    <div className="space-y-1">
                      <select
                        value=""
                        onChange={(e) => handleSelectStudentConvener(e.target.value)}
                        className="w-full text-xs text-indigo-900 font-medium bg-indigo-50/80 border border-indigo-200 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                      >
                        <option value="">
                          {convenerOptions.availableStudents.length > 0
                            ? '▼ Choose assigned team lead convener for this camp...'
                            : '▼ No assigned team leads for this camp'}
                        </option>
                        {convenerOptions.availableStudents.map((stu) => (
                          <option key={stu.id} value={stu.name}>
                            {stu.name} {stu.subtitle ? `— ${stu.subtitle}` : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <input
                      type="text"
                      value={reportData.studentConveners}
                      onChange={(e) => updateReportData({ studentConveners: e.target.value })}
                      placeholder="e.g. Rahul Sharma, Ananya Verma"
                      className="w-full text-xs text-slate-800 border border-slate-200 rounded-lg p-2 focus:outline-none focus:border-indigo-500 bg-white"
                    />
                    <p className="text-[10px] text-slate-400 leading-tight">
                      Select assigned student team leads / conveners for this camp from dropdown, or edit / add names directly.
                    </p>
                  </div>
                </div>

                {/* List of Guests Invited with Dropdown */}
                <div className="p-3.5 sm:p-4 bg-white rounded-xl border border-slate-200 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <label className="text-xs font-bold text-slate-800 block">
                        List of Guests Invited
                      </label>
                      <p className="text-[10px] text-slate-400">
                        Choose dignitaries from dropdown or enter custom guest details below.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleAddGuest}
                        className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg border border-indigo-200 flex items-center gap-1 cursor-pointer min-h-[36px] shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5 shrink-0" />
                        <span>Add Blank Row</span>
                      </button>
                    </div>
                  </div>

                  {/* Dropdown for Guests */}
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-700 shrink-0">
                      Choose Dignitary / Guest:
                    </span>
                    <select
                      value=""
                      onChange={(e) => handleSelectGuest(e.target.value)}
                      className="flex-1 text-xs text-slate-800 font-medium bg-white border border-slate-300 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                    >
                      <option value="">▼ Select guest from available / suggested directory...</option>
                      {convenerOptions.availableGuests.map((guest) => (
                        <option
                          key={guest.id}
                          value={`${guest.name}${guest.subtitle ? `, ${guest.subtitle}` : ''}`}
                        >
                          {guest.name} {guest.subtitle ? `(${guest.subtitle})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    {reportData.guestsInvited.map((guest, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-400 w-5 text-right shrink-0">
                          {idx + 1}.
                        </span>
                        <input
                          type="text"
                          value={guest}
                          placeholder={`Guest ${idx + 1} Name & Title`}
                          onChange={(e) => handleGuestChange(idx, e.target.value)}
                          className="flex-1 min-w-0 text-xs text-slate-800 border border-slate-200 rounded-lg p-2 focus:outline-none focus:border-indigo-500 bg-white"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveGuest(idx)}
                          className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer min-h-[38px] min-w-[38px] flex items-center justify-center shrink-0"
                          title="Remove guest"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Objective of Event */}
                <div className="p-3.5 sm:p-4 bg-white rounded-xl border border-slate-200 space-y-1.5 focus-within:border-indigo-500">
                  <label className="text-xs font-bold text-slate-800 block">
                    Objective of Event
                  </label>
                  <textarea
                    rows={3}
                    value={reportData.objective}
                    onChange={(e) => updateReportData({ objective: e.target.value })}
                    className="w-full text-xs text-slate-800 border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-indigo-500 leading-relaxed font-sans"
                  />
                </div>

                {/* Detailed report of Day (Multi-paragraph) */}
                <div className="p-3.5 sm:p-4 bg-white rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <label className="text-xs font-bold text-slate-800 block">
                        Detailed report of Day (Proceedings & Speeches)
                      </label>
                      <p className="text-[10px] sm:text-[11px] text-slate-500">
                        Institutional comprehensive narrative of speeches, skits, and community outreach.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddParagraph}
                      className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg border border-indigo-200 flex items-center gap-1 cursor-pointer min-h-[36px] shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5 shrink-0" />
                      <span>Add Paragraph</span>
                    </button>
                  </div>

                  <div className="space-y-3">
                    {reportData.detailedReportParagraphs.map((para, idx) => (
                      <div key={idx} className="relative group">
                        <textarea
                          rows={4}
                          value={para}
                          onChange={(e) => handleParagraphChange(idx, e.target.value)}
                          className="w-full text-xs text-slate-800 border border-slate-200 rounded-lg p-3 focus:outline-none focus:border-indigo-500 leading-relaxed font-serif"
                        />
                        {reportData.detailedReportParagraphs.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveParagraph(idx)}
                            className="absolute top-2 right-2 p-2 bg-white/90 text-slate-400 hover:text-rose-600 rounded-lg border border-slate-200 shadow-xs transition-all cursor-pointer min-h-[34px] min-w-[34px] flex items-center justify-center"
                            title="Remove paragraph"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Press Note */}
                <div className="p-3.5 sm:p-4 bg-white rounded-xl border border-slate-200 space-y-1.5 focus-within:border-indigo-500">
                  <label className="text-xs font-bold text-slate-800 block">
                    Press Note (Official Media Release)
                  </label>
                  <textarea
                    rows={4}
                    value={reportData.pressNote}
                    onChange={(e) => updateReportData({ pressNote: e.target.value })}
                    className="w-full text-xs text-slate-800 border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-indigo-500 leading-relaxed font-serif"
                  />
                </div>
              </div>
            </div>

            {/* Bottom Proceed Bar */}
            <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <span className="text-xs text-slate-500 font-medium text-center sm:text-left">
                Template edits saved in real time.
              </span>
              <button
                type="button"
                onClick={() => setActiveStage('preview')}
                className="w-full sm:w-auto min-h-[44px] justify-center px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 shadow-md transition-all cursor-pointer"
              >
                <span>Proceed to Final Preview</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────
          STAGE 2: PREVIEW OPTION (Exact A4 PDF format view)
          ────────────────────────────────────────────────────────── */}
      {activeStage === 'preview' && (
        <div className="space-y-6">
          {/* Preview Action Toolbar */}
          <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 print:hidden">
            <button
              type="button"
              onClick={() => setActiveStage('wizard')}
              className="w-full sm:w-auto min-h-[42px] justify-center px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <span>← Back to Edit Wizard</span>
            </button>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
              <button
                type="button"
                disabled={isGeneratingPDF}
                onClick={handleGenerateFinalReport}
                className="w-full sm:w-auto min-h-[42px] justify-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>Download PDF</span>
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="w-full sm:w-auto min-h-[42px] justify-center px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print Document</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveStage('generate')}
                className="w-full sm:w-auto min-h-[42px] justify-center px-5 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition-all cursor-pointer"
              >
                <span>Proceed to Generation Hub</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Paginated Institutional Document Canvas */}
          <div
            ref={previewContainerRef}
            className="p-1 sm:p-4 md:p-8 bg-slate-100/90 rounded-2xl border border-slate-200/80 overflow-x-auto print:bg-white print:border-none print:p-0"
          >
            <FinalEventReportDocument data={reportData} />
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────
          STAGE 3: GENERATE FINAL REPORT (Compilation & Download Hub)
          ────────────────────────────────────────────────────────── */}
      {activeStage === 'generate' && (
        <div className="space-y-6">
          {/* Generation & Download Hub Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 md:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Report Ready for Final Generation
                  </span>
                  <span className="text-xs font-bold text-indigo-700">
                    • CivicForgeLabs
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  Generate & Download Final Institutional Report
                </h3>
                <p className="text-xs text-slate-500">
                  School of Legal Studies • REVA University Official Event Report Package
                </p>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setActiveStage('preview')}
                  className="flex-1 sm:flex-none min-h-[40px] justify-center px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Eye className="w-4 h-4" />
                  <span>View Preview</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveStage('wizard')}
                  className="flex-1 sm:flex-none min-h-[40px] justify-center px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Edit Wizard</span>
                </button>
              </div>
            </div>

            {/* Verification Metadata Summary Table */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Event Identity
                </span>
                <p className="text-xs font-bold text-slate-900 line-clamp-2">
                  {reportData.eventName || 'Legal Aid Camp Outreach'}
                </p>
                <p className="text-[11px] text-slate-500">
                  {reportData.dateOfEvent} • {reportData.venue}
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Attendance & Budget Summary
                </span>
                <p className="text-xs font-bold text-slate-900">
                  {reportData.totalUniqueStudents} Unique Students Participated
                </p>
                <p className="text-[11px] text-slate-600">
                  Allocated: ₹{reportData.overallBudget.allocated.toLocaleString()} • Spent: ₹{reportData.overallBudget.spent.toLocaleString()}
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Document Specifications
                </span>
                <p className="text-xs font-bold text-slate-900">
                  {2 + Math.ceil(reportData.photos.length / 2) + 1} A4 Document Pages
                </p>
                <p className="text-[11px] text-slate-500">
                  Includes Cover Page, Event Report Table, {reportData.photos.length} Camp Photos & Press Note
                </p>
              </div>
            </div>

            {/* Download Action Area */}
            <div className="p-4 sm:p-6 bg-slate-50 rounded-2xl border border-slate-200 text-center space-y-4">
              <div className="max-w-md mx-auto space-y-1.5">
                <h4 className="text-sm font-bold text-slate-900">Download Institutional PDF Package</h4>
                <p className="text-xs text-slate-500">
                  Click the button below to compile and save the official high-resolution PDF with REVA University and CivicForgeLabs mastheads.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
                <button
                  type="button"
                  disabled={isGeneratingPDF}
                  onClick={handleGenerateFinalReport}
                  className="w-full sm:w-auto min-h-[48px] justify-center px-6 py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 shadow-md shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isGeneratingPDF ? (
                    <Spinner size="sm" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  <span>Download Final Report (PDF)</span>
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="w-full sm:w-auto min-h-[48px] justify-center px-5 py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Document</span>
                </button>
              </div>

              {/* Direct Re-Download Link if generated */}
              {lastGeneratedPdfUrl && (
                <div className="mt-4 p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex flex-col sm:flex-row items-center justify-between gap-2 max-w-lg mx-auto text-xs">
                  <div className="flex items-center gap-1.5 text-emerald-800 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>PDF successfully compiled!</span>
                  </div>
                  <a
                    href={lastGeneratedPdfUrl}
                    download={lastGeneratedPdfFilename}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-2xs transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Direct Download Link</span>
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Dedicated container for preview rendering */}
          <div ref={previewContainerRef} className="p-1 sm:p-4 bg-slate-100/90 rounded-2xl border border-slate-200/80 overflow-x-auto print:bg-white print:border-none print:p-0">
            <FinalEventReportDocument data={reportData} />
          </div>
        </div>
      )}

      {/* Offscreen A4 container permanently mounted for 100% desktop fidelity PDF export */}
      <div
        ref={pdfExportContainerRef}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: '794px',
          backgroundColor: '#ffffff',
          zIndex: -100,
          pointerEvents: 'none',
          opacity: 1,
        }}
        aria-hidden="true"
      >
        <FinalEventReportDocument data={reportData} forPdfExport={true} />
      </div>
    </div>
  );
}
