import React, { useRef, useMemo, useState } from 'react';
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
  TrendingUp,
  ShieldAlert,
  Scale
} from 'lucide-react';
import {
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

// ─── REPORT SUB-SECTIONS ───

const HeaderSection: React.FC<{ campName: string }> = ({ campName }) => (
  <div style={{ borderBottom: '2px solid #1e1b4b', paddingBottom: '16px', marginBottom: '24px', width: '100%' }}>
    {/* Institutional Co-Branding Masthead */}
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <img src="/reva-logo.png" alt="REVA University" style={{ height: '36px', width: 'auto', objectFit: 'contain' }} />
        <div>
          <div style={{ fontSize: '14px', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.01em', textTransform: 'uppercase' }}>
            REVA University
          </div>
          <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 600 }}>
            School of Legal Studies • Legal Aid Clinic
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '11px', fontWeight: 900, color: '#4338ca', backgroundColor: '#eef2ff', padding: '4px 10px', borderRadius: '8px', border: '1px solid #c7d2fe', letterSpacing: '0.02em' }}>
          CivicForgeLabs
        </span>
      </div>
    </div>

    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1e1b4b', fontWeight: 950, fontSize: '22px', textTransform: 'uppercase', letterSpacing: '-0.02em' }}>
          <Building2 style={{ width: '26px', height: '26px', color: '#1e1b4b' }} />
          Consolidated Legal Aid Survey Report
        </div>
        <p style={{ fontSize: '12px', color: '#475569', fontWeight: 500, marginTop: '6px', marginBottom: '0px' }}>
          Institutional Statistical Digest &amp; Document Non-Availability Analysis • {campName}
        </p>
      </div>
      <div style={{ textAlign: 'right', fontSize: '12px' }}>
        <span style={{ display: 'inline-block', padding: '4px 12px', backgroundColor: '#f0f2ff', border: '1px solid #c7d2fe', color: '#1e1b4b', fontFamily: 'monospace', fontWeight: 'bold', borderRadius: '8px' }}>
          FACULTY OFFICIAL REPORT
        </span>
        <p style={{ color: '#64748b', marginTop: '6px', marginBottom: '0px' }}>Generated: {new Date().toLocaleDateString('en-US', { dateStyle: 'medium' })}</p>
      </div>
    </div>
  </div>
);

const MetricsSection: React.FC<{ stats: any }> = ({ stats }) => (
  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full">
    <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-200 text-center" style={{ backgroundColor: '#f0f2ff', borderColor: '#c7d2fe' }}>
      <Users className="w-5 h-5 text-indigo-700 mx-auto mb-1" />
      <span className="text-2xl font-black text-indigo-950">{stats.totalSurveys}</span>
      <span className="block text-[11px] font-semibold text-indigo-800 uppercase tracking-wider mt-0.5">Surveys Conducted</span>
    </div>
    <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-200 text-center" style={{ backgroundColor: '#ecfdf5', borderColor: '#a7f3d0' }}>
      <TrendingUp className="w-5 h-5 text-emerald-700 mx-auto mb-1" />
      <span className="text-2xl font-black text-emerald-950">{stats.recordedFamilyMembers}</span>
      <span className="block text-[11px] font-semibold text-emerald-800 uppercase tracking-wider mt-0.5">Recorded Family Members</span>
    </div>
    <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 text-center" style={{ backgroundColor: '#fffbeb', borderColor: '#fde68a' }}>
      <FileCheck className="w-5 h-5 text-amber-700 mx-auto mb-1" />
      <span className="text-2xl font-black text-amber-950">{stats.pendingLitigationCount}</span>
      <span className="block text-[11px] font-semibold text-amber-800 uppercase tracking-wider mt-0.5">Pending Court Litigations</span>
    </div>
    <div className="bg-cyan-50 p-4 rounded-2xl border border-cyan-200 text-center" style={{ backgroundColor: '#ecfeff', borderColor: '#a5f3fc' }}>
      <ShieldCheck className="w-5 h-5 text-cyan-700 mx-auto mb-1" />
      <span className="text-2xl font-black text-cyan-950">
        {stats.freeLegalAidCategoryCounts.reduce((acc: number, curr: any) => acc + curr.count, 0)}
      </span>
      <span className="block text-[11px] font-semibold text-cyan-800 uppercase tracking-wider mt-0.5">Legal Aid Eligible Claims</span>
    </div>
  </div>
);

const GenderSection: React.FC<{ stats: any }> = ({ stats }) => (
  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 w-full" style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }}>
    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-4 flex items-center gap-1.5 border-b border-slate-200 pb-2">
      <PieIcon className="w-4 h-4 text-indigo-600" />
      Gender Distribution
    </h4>
    <div className="flex flex-col sm:flex-row items-center justify-center gap-8 py-2">
      <div className="h-44 w-44 shrink-0 flex items-center justify-center">
        <PieChart width={176} height={176}>
          <Pie
            data={stats.genderDistribution}
            cx="50%"
            cy="50%"
            innerRadius={45}
            outerRadius={70}
            paddingAngle={4}
            dataKey="count"
            nameKey="category"
            isAnimationActive={false}
          >
            {stats.genderDistribution.map((_: any, index: number) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </div>
      <div className="space-y-3 font-sans text-xs">
        {stats.genderDistribution.map((item: any, index: number) => (
          <div key={index} className="flex items-center gap-3">
            <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
            <span className="font-extrabold text-slate-800 uppercase tracking-wide w-16">{item.category}</span>
            <span className="font-mono text-slate-600 font-bold">— {item.count} ({item.percentage}%)</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const AgeSection: React.FC<{ stats: any }> = ({ stats }) => (
  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 w-full" style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }}>
    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-4 flex items-center gap-1.5 border-b border-slate-200 pb-2">
      <BarChart3 className="w-4 h-4 text-indigo-600" />
      Age Demographics Breakdown
    </h4>
    <div className="w-full flex items-center justify-center" style={{ height: '220px' }}>
      <BarChart width={520} height={210} data={stats.ageDistribution} margin={{ top: 10, right: 10, left: -20, bottom: 30 }}>
        <XAxis dataKey="range" tick={{ fontSize: 12 }} interval={0} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip />
        <Bar dataKey="count" fill="#4f46e5" radius={[6, 6, 0, 0]} isAnimationActive={false} />
      </BarChart>
    </div>
  </div>
);

const LitigationSection: React.FC<{ stats: any }> = ({ stats }) => (
  <div style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0', borderWidth: '1px', borderStyle: 'solid', borderRadius: '16px', padding: '24px', width: '100%' }}>
    <h4 style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#1e293b', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '6px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
      <Scale style={{ width: '16px', height: '16px', color: '#4f46e5' }} />
      Litigation Durations Breakdown
    </h4>
    {stats.pendingLitigationCount === 0 ? (
      <div style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center', padding: '40px 0', fontWeight: 600 }}>
        No active litigation cases reported in this survey batch.
      </div>
    ) : (
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {stats.litigationDurationBreakdown
          .filter((d: any) => d.category !== 'Unspecified')
          .map((dur: any, idx: number, arr: any[]) => (
            <div key={idx} style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: idx === arr.length - 1 ? '0px' : '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 'bold' }}>
                <span style={{ color: '#334155', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{dur.category}</span>
                <span style={{ color: '#0f172a', fontFamily: 'monospace' }}>
                  {dur.count} {dur.count === 1 ? 'household' : 'households'} ({dur.percentage}%)
                </span>
              </div>
              <div style={{ width: '100%', backgroundColor: '#e2e8f0', height: '10px', borderRadius: '9999px', overflow: 'hidden' }}>
                <div
                  style={{ width: `${dur.percentage}%`, backgroundColor: '#4f46e5', height: '100%', borderRadius: '9999px' }}
                />
              </div>
            </div>
          ))}
      </div>
    )}
  </div>
);

const DocumentsSection: React.FC<{ stats: any }> = ({ stats }) => (
  <div style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0', borderWidth: '1px', borderStyle: 'solid', borderRadius: '16px', padding: '24px', width: '100%' }}>
    <h4 style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#0f172a', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '8px' }}>
      <FileCheck style={{ width: '16px', height: '16px', color: '#1e3a8a' }} />
      Document Availability Matrix
    </h4>
    <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', backgroundColor: '#ffffff' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: '30%' }} />
          <col style={{ width: '17%' }} />
          <col style={{ width: '17%' }} />
          <col style={{ width: '14%' }} />
          <col style={{ width: '13%' }} />
          <col style={{ width: '9%' }} />
        </colgroup>
        <thead style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #e2e8f0', fontSize: '11px', color: '#1e293b', fontWeight: 'bold' }}>
          <tr>
            <th style={{ padding: '10px 12px', textAlign: 'left' }}>Certificate / Card Type</th>
            <th style={{ padding: '10px 6px', textAlign: 'center' }}>Families Holding</th>
            <th style={{ padding: '10px 6px', textAlign: 'center' }}>Missing / Non-Available</th>
            <th style={{ padding: '10px 6px', textAlign: 'center', color: '#64748b' }}>N/A</th>
            <th style={{ padding: '10px 6px', textAlign: 'center', color: '#94a3b8' }}>Not Recorded</th>
            <th style={{ padding: '10px 6px', textAlign: 'center' }}>Coverage</th>
          </tr>
        </thead>
        <tbody style={{ fontSize: '12px', color: '#334155' }}>
          {stats.documentAvailabilityMatrix.map((row: any, idx: number) => (
            <tr key={idx} style={{ borderBottom: idx === stats.documentAvailabilityMatrix.length - 1 ? 'none' : '1px solid #e2e8f0' }}>
              <td style={{ padding: '10px 12px', fontWeight: 'semibold', color: '#1e293b' }}>{row.name}</td>
              <td style={{ padding: '10px 6px', textAlign: 'center', fontFamily: 'monospace', fontWeight: 'bold', color: '#16a34a' }}>{row.hasDoc}</td>
              <td style={{ padding: '10px 6px', textAlign: 'center', fontFamily: 'monospace', color: '#dc2626' }}>{row.missing}</td>
              <td style={{ padding: '10px 6px', textAlign: 'center', fontFamily: 'monospace', color: '#64748b' }}>{row.notApplicable}</td>
              <td style={{ padding: '10px 6px', textAlign: 'center', fontFamily: 'monospace', color: '#94a3b8' }}>{row.notRecorded}</td>
              <td style={{ padding: '10px 6px', textAlign: 'center', fontFamily: 'monospace', fontWeight: 'bold', color: '#0f172a' }}>{row.percentage}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <p style={{ fontSize: '11px', color: '#64748b', fontStyle: 'italic', marginTop: '16px', marginBottom: '0px', lineHeight: '1.5' }}>
      <strong>Note:</strong> Coverage rate is computed as: [Holding / (Holding + Missing)] × 100. Non-availability indicates an affirmative declaration of a missing card requiring support services intervention.
    </p>
  </div>
);

const AmenitiesSection: React.FC<{ stats: any }> = ({ stats }) => (
  <div style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0', borderWidth: '1px', borderStyle: 'solid', borderRadius: '16px', padding: '24px', width: '100%' }}>
    <h4 style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#0f172a', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
      Availability of Basic Infrastructure &amp; Amenities
    </h4>
    <div style={{ display: 'flex', gap: '16px', width: '100%' }}>
      {stats.basicAmenitiesAvailability.map((item: any, idx: number) => (
        <div key={idx} style={{ flex: 1, backgroundColor: '#ffffff', padding: '16px 12px', border: '1px solid #e2e8f0', borderRadius: '12px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 500, color: '#334155', fontSize: '12px', minHeight: '36px', lineHeight: '1.3', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {item.amenity.split(' (')[0]}
          </span>
          <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e3a8a', fontFamily: 'monospace', display: 'block', marginTop: '6px' }}>
            {item.percentage}%
          </span>
          <span style={{ display: 'block', fontSize: '10px', color: '#94a3b8', marginTop: '4px' }}>
            ({item.availableCount}/{stats.totalSurveys} HHs)
          </span>
        </div>
      ))}
    </div>
  </div>
);

const VulnerabilitiesSection: React.FC<{ stats: any }> = ({ stats }) => (
  <div style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0', borderWidth: '1px', borderStyle: 'solid', borderRadius: '16px', padding: '24px', width: '100%', boxSizing: 'border-box' }}>
    <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '16px', marginBottom: '20px' }}>
      <h4 style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
        <ShieldAlert style={{ width: '16px', height: '16px', color: '#ea580c' }} />
        Special Assistance &amp; Vulnerabilities
      </h4>
      <div style={{ display: 'flex', gap: '12px' }}>
        <span style={{ backgroundColor: '#fff7ed', border: '1px solid #ffedd5', color: '#7c2d12', fontWeight: 'bold', padding: '6px 12px', borderRadius: '8px', fontFamily: 'monospace', fontSize: '11px', textTransform: 'uppercase' }}>
          VULNERABLE HOUSEHOLDS: {stats.vulnerableHouseholds}
        </span>
        <span style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', color: '#78350f', fontWeight: 'bold', padding: '6px 12px', borderRadius: '8px', fontFamily: 'monospace', fontSize: '11px', textTransform: 'uppercase' }}>
          VULNERABILITY CASES: {stats.vulnerableCases}
        </span>
      </div>
    </div>
    
    <div style={{ display: 'flex', gap: '20px', width: '100%' }}>
      <div style={{ flex: 1, border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', backgroundColor: '#ffffff' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #e2e8f0', color: '#1e293b', fontWeight: 'bold' }}>
            <tr>
              <th style={{ padding: '8px 12px', textAlign: 'left' }}>Vulnerability Category</th>
              <th style={{ padding: '8px 12px', textAlign: 'center', width: '30%' }}>HHs Affected</th>
            </tr>
          </thead>
          <tbody style={{ color: '#334155' }}>
            {stats.vulnerableGroupsCounts.map((g: any, idx: number, arr: any[]) => (
              <tr key={idx} style={{ borderBottom: idx === arr.length - 1 ? 'none' : '1px solid #f1f5f9' }}>
                <td style={{ padding: '8px 12px', fontWeight: 500 }}>{g.group}</td>
                <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 'bold', color: '#e11d48', fontFamily: 'monospace' }}>{g.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ flex: 1, padding: '20px', backgroundColor: '#fff7ed', border: '1px solid #ffedd5', borderRadius: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'center', fontSize: '12px', color: '#451a03', lineHeight: '1.6' }}>
        <p style={{ fontWeight: 'bold', color: '#7c2d12', marginBottom: '8px', fontSize: '13px' }}>Affirmative Identification Protocol</p>
        <p style={{ margin: '0' }}>
          Special assistance claims are triggered for households identifying affirmative cases under NALSA welfare guidelines. Actions include priority legal clinic routing and DLSA referrals for immediate legal aid intervention.
        </p>
      </div>
    </div>
  </div>
);

const FindingsSection: React.FC<{ stats: any }> = ({ stats }) => (
  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 w-full" style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }}>
    <h4 className="font-bold text-slate-900 uppercase tracking-wider text-xs mb-3 pb-2 border-b border-slate-200">
      Faculty Findings &amp; Empirical Observations
    </h4>
    <p className="text-[13px] text-slate-700 leading-relaxed">
      Analysis of {stats.totalSurveys} surveyed families ({stats.recordedFamilyMembers} recorded family members) reveals key legal literacy and documentation gaps in UDID disability cards and Ayushman Bharat health account coverage. Additionally, {stats.pendingLitigationCount} {stats.pendingLitigationCount === 1 ? 'family reports' : 'families report'} active pending court litigation requiring immediate attention from the legal services clinic.
    </p>
  </div>
);

const RecommendationsSection: React.FC<{ stats: any }> = ({ stats }) => (
  <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100 w-full" style={{ backgroundColor: '#f0f2ff', borderColor: '#c7d2fe' }}>
    <h4 className="font-bold text-indigo-950 uppercase tracking-wider text-xs mb-4 pb-2 border-b border-indigo-200">
      Recommendations for Legal Services Clinic Action
    </h4>
    <ul className="text-[13px] text-slate-700 space-y-3">
      <li className="flex gap-3">
        <span className="text-indigo-600 font-black mt-0.5 shrink-0">1.</span>
        <span>Organize dedicated legal aid help-desks to process pending UDID and Ration Card applications for identified families.</span>
      </li>
      <li className="flex gap-3">
        <span className="text-indigo-600 font-black mt-0.5 shrink-0">2.</span>
        <span>Provide free legal counsel for the {stats.pendingLitigationCount} {stats.pendingLitigationCount === 1 ? 'family' : 'families'} with pending court litigation.</span>
      </li>
      <li className="flex gap-3">
        <span className="text-indigo-600 font-black mt-0.5 shrink-0">3.</span>
        <span>Refer eligible Section 5 applicants to NALSA Helpline (15100) and DLSA panel advocates for legal aid entitlement registration.</span>
      </li>
    </ul>
  </div>
);

const SignoffSection: React.FC = () => (
  <div className="border-2 border-slate-200 rounded-2xl p-6 w-full" style={{ borderColor: '#e2e8f0' }}>
    <p className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold mb-6 text-center">
      Authorisation &amp; Sign-Off
    </p>
    <div className="flex justify-between items-end gap-8 text-[13px] text-slate-700">
      <div className="flex-1">
        <div className="border-b border-slate-300 mb-3" style={{ borderBottomColor: '#cbd5e1', paddingBottom: '2.5rem' }} />
        <p className="font-bold text-slate-900">Faculty Convener / Director</p>
        <p className="text-[11px] text-slate-500">Legal Aid &amp; Community Outreach Cell</p>
      </div>
      <div className="flex-1 text-right">
        <div className="border-b border-slate-300 mb-3" style={{ borderBottomColor: '#cbd5e1', paddingBottom: '2.5rem' }} />
        <p className="font-bold text-slate-900">Dean / Head of Institution</p>
        <p className="text-[11px] text-slate-500">School of Law</p>
      </div>
    </div>
  </div>
);

// ─── MAIN COMPONENT ───

export const ConsolidatedSurveyReport: React.FC<ConsolidatedSurveyReportProps> = ({
  surveys,
  campName = 'Legal Aid Camp 2026',
  onBack,
}) => {
  const reportRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  
  const [downloading, setDownloading] = useState(false);
  const [pdfPages, setPdfPages] = useState<number[][]>([]);

  const stats = useMemo(() => {
    return reportCalculationService.calculateConsolidatedStats(surveys);
  }, [surveys]);

  const sections = useMemo(() => [
    { key: 'header', content: <HeaderSection campName={campName} /> },
    { key: 'metrics', content: <MetricsSection stats={stats} /> },
    { key: 'gender', content: <GenderSection stats={stats} /> },
    { key: 'age', content: <AgeSection stats={stats} /> },
    { key: 'litigation', content: <LitigationSection stats={stats} /> },
    { key: 'documents', content: <DocumentsSection stats={stats} /> },
    { key: 'amenities', content: <AmenitiesSection stats={stats} /> },
    { key: 'vulnerabilities', content: <VulnerabilitiesSection stats={stats} /> },
    { key: 'findings', content: <FindingsSection stats={stats} /> },
    { key: 'recommendations', content: <RecommendationsSection stats={stats} /> },
    { key: 'signoff', content: <SignoffSection /> }
  ], [stats, campName]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    setDownloading(true);
    
    const originalGetComputedStyle = window.getComputedStyle;
    
    // Create single reusable canvas and cache
    const dummyCanvas = document.createElement('canvas');
    dummyCanvas.width = 1;
    dummyCanvas.height = 1;
    const ctx = dummyCanvas.getContext('2d', { willReadFrequently: true });
    const colorCache = new Map<string, string>();

    const convertOklchToRgb = (cssText: string): string => {
      if (!cssText.includes('oklch')) return cssText;
      if (!ctx) return cssText;
      
      return cssText.replace(/oklch\([^)]+\)/g, (match) => {
        const cached = colorCache.get(match);
        if (cached) return cached;
        
        try {
          ctx.fillStyle = match;
          ctx.clearRect(0, 0, 1, 1);
          ctx.fillRect(0, 0, 1, 1);
          const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
          const rgbStr = a === 255 
            ? `rgb(${r}, ${g}, ${b})` 
            : `rgba(${r}, ${g}, ${b}, ${(a / 255).toFixed(3)})`;
          colorCache.set(match, rgbStr);
          return rgbStr;
        } catch (e) {
          return 'rgb(79, 70, 229)';
        }
      });
    };

    // Global override of getComputedStyle on the main window
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
        }
      });
    };

    // Give browser a moment to render the off-screen measuring container
    setTimeout(async () => {
      if (!measureRef.current) {
        window.getComputedStyle = originalGetComputedStyle;
        setDownloading(false);
        return;
      }
      
      try {
        const children = Array.from(measureRef.current.children);
        const heights = children.map(el => el.getBoundingClientRect().height);
        console.log('[Pagination] Section heights:', heights.map((h, idx) => `${sections[idx].key}: ${h}px`).join(' | '));
        
        // Dynamic content-driven pagination partitioning
        const pageBudget = 920; // Maximum content height on a single A4 page
        const pages: number[][] = [];
        let currentPage: number[] = [];
        let currentHeight = 0;
        
        for (let i = 0; i < children.length; i++) {
          const sectionHeight = heights[i];
          if (currentHeight + sectionHeight > pageBudget && currentPage.length > 0) {
            pages.push(currentPage);
            currentPage = [i];
            currentHeight = sectionHeight;
          } else {
            currentPage.push(i);
            currentHeight += sectionHeight;
          }
        }
        if (currentPage.length > 0) {
          pages.push(currentPage);
        }
        
        console.log('[Pagination] Partitioned pages:', pages);
        setPdfPages(pages);
        
        // Allow DOM to paint the paginated pages off-screen
        setTimeout(async () => {
          try {
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            
            const pageElements = document.querySelectorAll('[data-pdf-compiled-page]');
            
            for (let i = 0; i < pageElements.length; i++) {
              if (i > 0) {
                pdf.addPage();
              }
              const el = pageElements[i] as HTMLDivElement;
              
              // Diagnostic: DOM inspection before html2canvas
              const rect = el.getBoundingClientRect();
              const computedStyle = window.getComputedStyle(el);
              console.log(`[Diagnostic] Page ${i+1} Element:`, {
                width: rect.width,
                height: rect.height,
                top: rect.top,
                left: rect.left,
                display: computedStyle.display,
                visibility: computedStyle.visibility,
                opacity: computedStyle.opacity,
                outerHTML_len: el.outerHTML.length
              });
              
              const canvas = await html2canvas(el, {
                scale: 2,
                useCORS: true,
                onclone: (clonedDoc) => {
                  // Normalize text spacing styles and font-family to prevent html2canvas character spacing collapse bugs
                  clonedDoc.querySelectorAll('*').forEach((node) => {
                    const htmlEl = node as HTMLElement;
                    if (htmlEl.style) {
                      htmlEl.style.setProperty('font-family', 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif', 'important');
                      htmlEl.style.setProperty('letter-spacing', 'normal', 'important');
                      htmlEl.style.setProperty('word-spacing', 'normal', 'important');
                      htmlEl.style.setProperty('font-feature-settings', 'normal', 'important');
                      htmlEl.style.setProperty('font-variation-settings', 'normal', 'important');
                    }
                  });

                  const head = clonedDoc.head;
                  clonedDoc.querySelectorAll('style, link[rel="stylesheet"]').forEach(node => node.remove());
                  
                  Array.from(document.styleSheets).forEach(sheet => {
                    try {
                      let cssText = '';
                      const rules = sheet.cssRules || sheet.rules;
                      if (rules) {
                        cssText = Array.from(rules).map(rule => rule.cssText).join('\n');
                      }
                      const cleanCss = convertOklchToRgb(cssText);
                      const styleEl = clonedDoc.createElement('style');
                      styleEl.textContent = cleanCss;
                      head.appendChild(styleEl);
                    } catch (e) {}
                  });
                }
              });
              
              // Diagnostic: Sample canvas pixels
              let nonBlankPixels = 0;
              const canvasCtx = canvas.getContext('2d');
              if (canvasCtx) {
                const imgDataObj = canvasCtx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imgDataObj.data;
                for (let p = 0; p < data.length; p += 4) {
                  const r = data[p];
                  const g = data[p+1];
                  const b = data[p+2];
                  const a = data[p+3];
                  // Count non-white, non-transparent pixels
                  if (a > 0 && !(r === 255 && g === 255 && b === 255)) {
                    nonBlankPixels++;
                  }
                }
              }
              
              console.log(`[Diagnostic] Page ${i+1} Canvas:`, {
                width: canvas.width,
                height: canvas.height,
                nonBlankPixels,
                percentage: ((nonBlankPixels / (canvas.width * canvas.height)) * 100).toFixed(2) + '%'
              });
              
              // Use JPEG format to dramatically reduce PDF file size and ensure full PDF viewer rendering compatibility
              const imgData = canvas.toDataURL('image/jpeg', 0.95);
              
              // Save to window for Playwright capture
              if (!(window as any).__debug_pngs) {
                (window as any).__debug_pngs = [];
              }
              (window as any).__debug_pngs.push(imgData);
              
              pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
            }
            
            console.log(`[Diagnostic] PDF Pages assembled: ${pdf.getNumberOfPages()}`);
            pdf.save(`Consolidated_Survey_Report_${campName.replace(/\s+/g, '_')}.pdf`);
          } catch (err) {
            console.error('Failed to generate PDF', err);
          } finally {
            window.getComputedStyle = originalGetComputedStyle;
            setTimeout(() => {
              setPdfPages([]);
            }, 5000);
            setDownloading(false);
          }
        }, 300);
        
      } catch (err) {
        console.error('Failed partitioning pages', err);
        window.getComputedStyle = originalGetComputedStyle;
        setDownloading(false);
      }
    }, 200);
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 p-4 sm:p-8">
      {/* ─── TOOLBAR ─── */}
      <div className="max-w-4xl mx-auto mb-6 flex items-center justify-between gap-4 print:hidden">
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
            disabled={downloading}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all"
          >
            <Download className="w-4 h-4" />
            {downloading ? 'Generating PDF...' : 'Download PDF Report'}
          </button>
        </div>
      </div>

      {/* ─── CONSOLIDATED REPORT CONTAINER (Dashboard Flow View) ─── */}
      <div ref={reportRef} className="max-w-4xl mx-auto space-y-6 print:space-y-0 print:m-0 print:w-full">
        {sections.map((s) => (
          <div key={s.key}>
            {s.content}
          </div>
        ))}
      </div>

      {/* ─── MEASURING CONTAINER (Off-screen, invisible but layout-participating) ─── */}
      <div 
        ref={measureRef} 
        style={{
          position: 'absolute',
          left: '-9999px',
          top: '0',
          width: '674px', // Inner width budget
          opacity: 0,
          pointerEvents: 'none',
        }}
      >
        {sections.map((s) => (
          <div key={s.key} style={{ width: '100%', marginBottom: '20px' }}>
            {s.content}
          </div>
        ))}
      </div>

      {/* ─── DYNAMIC PAGINATED RENDER CONTAINER (For html2canvas rendering during download) ─── */}
      {pdfPages.length > 0 && (
        <div 
          style={{
            position: 'absolute',
            left: '0px',
            top: '10000px',
            width: '794px',
            opacity: 1, // Keep opacity: 1 so it is fully captured
            pointerEvents: 'none',
            zIndex: -100,
          }}
        >
          {pdfPages.map((pageIndices, pageIndex) => (
            <div
              key={pageIndex}
              data-pdf-compiled-page
              style={{
                width: '794px',
                height: '1123px',
                padding: '60px',
                boxSizing: 'border-box',
                backgroundColor: '#ffffff',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                color: '#0f172a',
                fontFamily: 'Inter, sans-serif',
              }}
            >
              {/* Running Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', marginBottom: '20px', fontSize: '10px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <span style={{ fontWeight: 600 }}>Consolidated Legal Aid Survey Report</span>
                <span>{campName}</span>
              </div>

              {/* Page Content */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {pageIndices.map((index) => (
                  <div key={index} style={{ width: '100%' }}>
                    {sections[index].content}
                  </div>
                ))}
              </div>

              {/* Running Footer */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e2e8f0', paddingTop: '8px', marginTop: '20px', fontSize: '10px', color: '#64748b' }}>
                <span>Official Statistical Digest</span>
                <span>Page {pageIndex + 1} of {pdfPages.length}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

