import React, { useRef, useMemo } from 'react';
import {
  Printer,
  Download,
  ArrowLeft,
  PieChart as PieIcon,
  BarChart3,
  Users,
  ShieldCheck,
  Building2,
  FileCheck,
  TrendingUp
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip
} from 'recharts';
import type { SurveyResponseData } from '@/types/survey';
import { reportCalculationService } from '@/services/reportCalculationService';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface ConsolidatedSurveyReportProps {
  surveys: SurveyResponseData[];
  campName?: string;
  onBack?: () => void;
}

const COLORS = ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#64748b'];

export const ConsolidatedSurveyReport: React.FC<ConsolidatedSurveyReportProps> = ({
  surveys,
  campName = 'Legal Aid Camp 2026',
  onBack,
}) => {
  const reportRef = useRef<HTMLDivElement>(null);

  const stats = useMemo(() => {
    return reportCalculationService.calculateConsolidatedStats(surveys);
  }, [surveys]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    if (!reportRef.current) return;
    try {
      const canvas = await html2canvas(reportRef.current, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Consolidated_Survey_Report_${campName.replace(/\s+/g, '_')}.pdf`);
    } catch (err) {
      console.error('Failed to generate PDF', err);
      window.print();
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 p-4 sm:p-8">
      {/* ─── TOOLBAR ─── */}
      <div className="max-w-5xl mx-auto mb-6 flex items-center justify-between gap-4 print:hidden">
        <button
          onClick={onBack}
          className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5 transition-all shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Faculty Dashboard
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
          >
            <Printer className="w-4 h-4" />
            Print Master Digest
          </button>

          <button
            onClick={handleDownloadPDF}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all"
          >
            <Download className="w-4 h-4" />
            Download PDF Report
          </button>
        </div>
      </div>

      {/* ─── CONSOLIDATED REPORT CONTAINER ─── */}
      <div
        ref={reportRef}
        className="max-w-5xl mx-auto bg-white text-slate-900 rounded-2xl shadow-2xl p-8 sm:p-12 border border-slate-200 font-sans print:shadow-none print:border-none print:p-0 print:m-0 print:w-full"
      >
        {/* Header */}
        <div className="border-b-2 border-indigo-950 pb-6 mb-8 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 text-indigo-950 font-black text-2xl tracking-tight uppercase">
              <Building2 className="w-8 h-8 text-indigo-900" />
              Consolidated Legal Aid Survey Report
            </div>
            <p className="text-xs text-slate-600 font-medium mt-1">
              Institutional Statistical Digest & Document Non-Availability Analysis • {campName}
            </p>
          </div>
          <div className="text-right text-xs">
            <span className="inline-block px-3 py-1 bg-indigo-50 border border-indigo-200 text-indigo-950 font-mono font-bold rounded-lg">
              FACULTY OFFICIAL REPORT
            </span>
            <p className="text-slate-500 mt-1">Generated: {new Date().toLocaleDateString('en-US', { dateStyle: 'medium' })}</p>
          </div>
        </div>

        {/* Executive Summary Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="bg-indigo-50/70 p-4 rounded-2xl border border-indigo-200 text-center">
            <Users className="w-5 h-5 text-indigo-700 mx-auto mb-1" />
            <span className="text-2xl font-black text-indigo-950">{stats.totalSurveys}</span>
            <span className="block text-[11px] font-semibold text-indigo-800 uppercase tracking-wider mt-0.5">Surveys Conducted</span>
          </div>

          <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200 text-center">
            <TrendingUp className="w-5 h-5 text-emerald-700 mx-auto mb-1" />
            <span className="text-2xl font-black text-emerald-950">{stats.totalPopulationCovered}</span>
            <span className="block text-[11px] font-semibold text-emerald-800 uppercase tracking-wider mt-0.5">Population Impacted</span>
          </div>

          <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200 text-center">
            <FileCheck className="w-5 h-5 text-amber-700 mx-auto mb-1" />
            <span className="text-2xl font-black text-amber-950">{stats.pendingLitigationCount}</span>
            <span className="block text-[11px] font-semibold text-amber-800 uppercase tracking-wider mt-0.5">Pending Court Litigations</span>
          </div>

          <div className="bg-cyan-50/70 p-4 rounded-2xl border border-cyan-200 text-center">
            <ShieldCheck className="w-5 h-5 text-cyan-700 mx-auto mb-1" />
            <span className="text-2xl font-black text-cyan-950">
              {stats.freeLegalAidCategoryCounts.reduce((acc, curr) => acc + curr.count, 0)}
            </span>
            <span className="block text-[11px] font-semibold text-cyan-800 uppercase tracking-wider mt-0.5">Legal Aid Eligible Claims</span>
          </div>
        </div>

        {/* ─── CHARTS & DEMOGRAPHICS ─── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* Gender Distribution Chart */}
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-4 flex items-center gap-1.5">
              <PieIcon className="w-4 h-4 text-indigo-600" />
              Gender Distribution
            </h4>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.genderDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="count"
                    nameKey="category"
                    label={({ name }) => `${name}`}
                  >
                    {stats.genderDistribution.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Age Distribution Chart */}
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-4 flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-indigo-600" />
              Age Demographics Breakdown
            </h4>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.ageDistribution}>
                  <XAxis dataKey="range" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#4f46e5" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Document Non-Availability Matrix Table */}
        <div className="mb-8">
          <h4 className="font-bold text-slate-900 uppercase tracking-wider text-xs mb-3">
            Survey Regarding Non-Availability of Necessary Documents & Welfare Cards
          </h4>
          <div className="overflow-x-auto border border-slate-200 rounded-xl text-xs">
            <table className="w-full text-left">
              <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">Certificate / Card Type</th>
                  <th className="p-3 text-center">Families Holding Document</th>
                  <th className="p-3 text-center">Missing / Non-Available</th>
                  <th className="p-3 text-center">Coverage Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {stats.documentAvailabilityMatrix.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="p-3 font-semibold text-slate-800">{row.name}</td>
                    <td className="p-3 text-center font-mono font-bold text-emerald-600">{row.hasDoc}</td>
                    <td className="p-3 text-center font-mono text-rose-600">{row.missing}</td>
                    <td className="p-3 text-center font-mono font-bold">{row.percentage}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Basic Amenities Matrix */}
        <div className="mb-8 bg-slate-50 p-5 rounded-2xl border border-slate-200 text-xs">
          <h4 className="font-bold text-slate-900 uppercase tracking-wider text-xs mb-3 border-b border-slate-200 pb-2">
            Q19. Availability of Basic Infrastructure & Amenities
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {stats.basicAmenitiesAvailability.map((item, idx) => (
              <div key={idx} className="bg-white p-3.5 rounded-xl border border-slate-200 text-center">
                <span className="font-medium text-slate-700 block mb-1">{item.amenity}</span>
                <span className="text-xl font-bold text-indigo-900 font-mono">{item.percentage}%</span>
                <span className="block text-[10px] text-slate-400 mt-0.5">({item.availableCount}/{stats.totalSurveys} households)</span>
              </div>
            ))}
          </div>
        </div>

        {/* Observations & Recommendations */}
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 text-xs space-y-4">
          <div>
            <h4 className="font-bold text-slate-900 uppercase tracking-wider text-xs mb-1">
              Faculty Findings & Empirical Observations
            </h4>
            <p className="text-slate-700 leading-relaxed">
              Analysis of {stats.totalSurveys} surveyed families ({stats.totalPopulationCovered} total members) reveals key legal literacy and documentation gaps in UDID disability cards and Ayushman Bharat health account coverage. Additionally, {stats.pendingLitigationCount} families report active pending court litigation.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 uppercase tracking-wider text-xs mb-1">
              Recommendations for Legal Services Clinic Action
            </h4>
            <ul className="list-disc list-inside text-slate-700 space-y-1">
              <li>Organize dedicated legal aid help-desks to process pending UDID and Ration Card applications.</li>
              <li>Provide free legal counsel for the {stats.pendingLitigationCount} families with pending court litigation.</li>
              <li>Refer eligible Section 5 applicants to NALSA Helpline (15100) and DLSA panel advocates.</li>
            </ul>
          </div>
        </div>

        {/* Sign-off Block */}
        <div className="pt-10 border-t border-slate-200 mt-8 flex justify-between items-end text-xs text-slate-600">
          <div>
            <p className="font-bold text-slate-900">Faculty Convener / Director</p>
            <p className="text-[10px]">Legal Aid & Community Outreach Cell</p>
          </div>
          <div className="text-right">
            <p className="font-bold text-slate-900">Dean / Head of Institution</p>
            <p className="text-[10px]">School of Law</p>
          </div>
        </div>
      </div>
    </div>
  );
};
