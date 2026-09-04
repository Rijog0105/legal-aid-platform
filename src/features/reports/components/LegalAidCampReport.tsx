import React, { useRef, useMemo } from 'react';
import {
  Printer,
  Download,
  ArrowLeft,
  Building,
  BookOpen,
  Scale,
  CheckCircle2
} from 'lucide-react';
import type { SurveyResponseData } from '@/types/survey';
import { reportCalculationService } from '@/services/reportCalculationService';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface LegalAidCampReportProps {
  surveys: SurveyResponseData[];
  campName?: string;
  villageName?: string;
  district?: string;
  campDate?: string;
  venue?: string;
  facultyInCharge?: string;
  studentVolunteersCount?: number;
  onBack?: () => void;
}

export const LegalAidCampReport: React.FC<LegalAidCampReportProps> = ({
  surveys,
  campName = 'Institutional Legal Aid & Data Collection Camp 2026',
  villageName = 'Rampur Rural Panchayat',
  district = 'Bangalore Urban',
  campDate = new Date().toISOString().split('T')[0],
  venue = 'Gram Panchayat Community Hall',
  facultyInCharge = 'Prof. Dr. A. Sharma (Head, Legal Aid Cell)',
  studentVolunteersCount = 18,
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
      pdf.save(`Master_Legal_Aid_Camp_Report_${villageName.replace(/\s+/g, '_')}.pdf`);
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
            Print Camp Report
          </button>

          <button
            onClick={handleDownloadPDF}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all"
          >
            <Download className="w-4 h-4" />
            Download Institutional PDF
          </button>
        </div>
      </div>

      {/* ─── INSTITUTIONAL CAMP REPORT CONTAINER ─── */}
      <div
        ref={reportRef}
        className="max-w-5xl mx-auto bg-white text-slate-900 rounded-2xl shadow-2xl p-8 sm:p-12 border border-slate-200 font-sans print:shadow-none print:border-none print:p-0 print:m-0 print:w-full"
      >
        {/* Institutional Masthead: REVA University & CivicForgeLabs */}
        <div className="flex items-center justify-between border-b-2 border-slate-200 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <img
              src="/reva-logo.png"
              alt="REVA University"
              className="h-10 sm:h-12 w-auto object-contain"
            />
            <div>
              <span className="text-sm sm:text-base font-black text-slate-900 tracking-tight block uppercase">
                REVA University
              </span>
              <span className="text-[10px] sm:text-xs text-slate-500 font-semibold block">
                School of Legal Studies • Legal Aid Clinic
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-indigo-700 bg-indigo-50 px-3 py-1 rounded-xl border border-indigo-200 shadow-2xs">
              CivicForgeLabs
            </span>
          </div>
        </div>

        {/* Title Header */}
        <div className="border-b-4 border-indigo-900 pb-6 mb-8 text-center">
          <div className="flex items-center justify-center gap-2 text-indigo-950 font-black text-2xl uppercase tracking-wider mb-1">
            <Scale className="w-8 h-8 text-indigo-800" />
            Legal Aid & Community Literacy Outreach
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">{campName}</h1>
          <p className="text-xs text-slate-600 font-semibold tracking-wide">
            MASTER INSTITUTIONAL CAMP PROCEEDINGS & COMPREHENSIVE DATA COLLECTION REPORT
          </p>
        </div>

        {/* 1. Camp Details & Executive Summary */}
        <div className="mb-8">
          <h3 className="text-xs font-bold uppercase tracking-wider bg-indigo-950 text-white p-2.5 rounded-lg mb-4 flex items-center gap-2">
            <Building className="w-4 h-4 text-indigo-300" />
            1. Institutional Camp Overview & Administration
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <span className="text-slate-500 block">Target Location:</span>
              <span className="font-bold text-slate-900">{villageName}, {district}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Date of Execution:</span>
              <span className="font-semibold text-slate-800">{campDate}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Camp Venue:</span>
              <span className="font-semibold text-slate-800">{venue}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Faculty In-Charge:</span>
              <span className="font-semibold text-slate-800">{facultyInCharge}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Student Volunteers:</span>
              <span className="font-semibold text-slate-800">{studentVolunteersCount} Student Volunteers</span>
            </div>
            <div>
              <span className="text-slate-500 block">Total Families Surveyed:</span>
              <span className="font-bold text-indigo-900">{stats.totalSurveys} Households ({stats.recordedFamilyMembers} Family Members)</span>
            </div>
          </div>
        </div>

        {/* 2. Executive Narrative */}
        <div className="mb-8">
          <h3 className="text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-900 p-2.5 rounded-lg border-l-4 border-indigo-800 mb-3 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-indigo-700" />
            2. Executive Summary & Camp Proceedings
          </h3>
          <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-200">
            The Legal Aid & Human Rights Cell successfully executed a comprehensive Legal Aid Data Collection Camp at {villageName}, {district} on {campDate}.
            Under the direction of {facultyInCharge}, a delegation of {studentVolunteersCount} student volunteers completed door-to-door data collection sheets,
            surveying document non-availability, legal aid eligibility under Section 12, basic infrastructure, and pending court litigations.
          </p>
        </div>

        {/* 3. Survey Summary & Statistical Analysis */}
        <div className="mb-8">
          <h3 className="text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-900 p-2.5 rounded-lg border-l-4 border-indigo-800 mb-3">
            3. Empirical Survey Summary
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs mb-4">
            <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-200">
              <span className="text-slate-500 block">Total Households:</span>
              <span className="text-xl font-bold text-indigo-950">{stats.totalSurveys}</span>
            </div>
            <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200">
              <span className="text-slate-500 block">Family Members:</span>
              <span className="text-xl font-bold text-emerald-950">{stats.recordedFamilyMembers}</span>
            </div>
            <div className="bg-amber-50 p-3 rounded-xl border border-amber-200">
              <span className="text-slate-500 block">Pending Litigations:</span>
              <span className="text-xl font-bold text-amber-950">{stats.pendingLitigationCount}</span>
            </div>
            <div className="bg-cyan-50 p-3 rounded-xl border border-cyan-200">
              <span className="text-slate-500 block">Legal Aid Eligible:</span>
              <span className="text-xl font-bold text-cyan-950">
                {stats.freeLegalAidCategoryCounts.reduce((a, b) => a + b.count, 0)}
              </span>
            </div>
          </div>
        </div>

        {/* 4. Key Findings */}
        <div className="mb-8">
          <h3 className="text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-900 p-2.5 rounded-lg border-l-4 border-indigo-800 mb-3">
            4. Key Institutional Findings
          </h3>
          <div className="space-y-2 text-xs text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <p>
                <strong>Pending Litigations:</strong> {stats.pendingLitigationCount} families reported active court litigations requiring legal representation.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <p>
                <strong>Document Availability Gaps:</strong> Key document non-availability was observed in Ration Cards, UDID disability cards, and Ayushman Bharat health account registration.
              </p>
            </div>
          </div>
        </div>

        {/* 5. Recommendations */}
        <div className="mb-8">
          <h3 className="text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-900 p-2.5 rounded-lg border-l-4 border-indigo-800 mb-3">
            5. Recommendations & Follow-Up Plan
          </h3>
          <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-200 text-xs text-slate-800 space-y-2">
            <p>1. <strong>Legal Services Clinic Follow-up:</strong> Inform beneficiaries about NALSA Helpline No. 15100 and nearby Legal Services Authority Clinics.</p>
            <p>2. <strong>Free Legal Counsel:</strong> Connect families with pending litigation to DLSA panel lawyers under Section 12.</p>
          </div>
        </div>

        {/* Sign-off Block */}
        <div className="border-t-2 border-indigo-900 pt-6 mt-8">
          <div className="grid grid-cols-2 gap-8 text-xs text-slate-800 pt-6">
            <div>
              <p className="font-bold">{facultyInCharge}</p>
              <p className="text-[10px] text-slate-500">Faculty Convener & Director</p>
            </div>
            <div className="text-right">
              <p className="font-bold">Member Secretary / Representative</p>
              <p className="text-[10px] text-slate-500">District Legal Services Authority (DLSA)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
