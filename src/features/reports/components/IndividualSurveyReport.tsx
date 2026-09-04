import React, { useRef } from 'react';
import { Printer, Download, ArrowLeft, Camera } from 'lucide-react';
import type { SurveyResponseData } from '@/types/survey';
import { ImageWithSignedUrl } from '@/components/ImageWithSignedUrl';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface IndividualSurveyReportProps {
  survey: SurveyResponseData;
  onBack?: () => void;
}

export const IndividualSurveyReport: React.FC<IndividualSurveyReportProps> = ({ survey, onBack }) => {
  const reportRef = useRef<HTMLDivElement>(null);

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
      pdf.save(`Data_Collection_Sheet_${survey.surveyReferenceId || 'Report'}.pdf`);
    } catch (err) {
      console.error('Failed to generate PDF', err);
      window.print();
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 p-4 sm:p-8">
      {/* ─── TOOLBAR ─── */}
      <div className="max-w-4xl mx-auto mb-8 flex items-center justify-between gap-4 print:hidden">
        <button
          onClick={onBack}
          className="px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Workspace</span>
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print Sheet</span>
          </button>

          <button
            onClick={handleDownloadPDF}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Download PDF</span>
          </button>
        </div>
      </div>

      {/* ─── OFFICIAL DATA COLLECTION SHEET ─── */}
      <div
        ref={reportRef}
        className="max-w-4xl mx-auto bg-white text-slate-900 rounded-3xl shadow-xl p-8 sm:p-14 border border-slate-300 font-sans print:shadow-none print:border-none print:p-0 print:m-0 print:w-full space-y-10"
      >
        {/* Institutional Masthead: REVA University & CivicForgeLabs */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-2">
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

        {/* Top Header - Village/District */}
        <div className="text-right text-xs font-semibold text-slate-800 space-y-0.5">
          <div>
            Village/District : <span className="font-bold underline underline-offset-4 text-slate-900">{survey.villageDistrict || '________________________'}</span>
          </div>
          <span className="block text-[11px] text-slate-500 font-normal">ಗ್ರಾಮ / ಜಿಲ್ಲೆ</span>
        </div>

        {/* Title */}
        <div className="text-center border-b-2 border-slate-900 pb-5 space-y-2">
          <h1 className="text-2xl font-black uppercase tracking-wider text-slate-900">
            DATA COLLECTION SHEET
          </h1>
          <h2 className="text-base font-bold text-slate-700">ವಿವರ ಸಂಗ್ರಹಣಾ ನಮೂನೆ</h2>
          <p className="text-xs text-slate-500 font-mono pt-1">Ref ID: {survey.surveyReferenceId}</p>
        </div>

        {/* Preliminary Details Block */}
        <div className="border border-slate-300 rounded-2xl p-6 text-xs space-y-5 bg-slate-50/80">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-1">
              <span className="font-bold text-slate-700 block">Date of Data collection :</span>
              <span className="block font-black text-slate-900 text-sm">{survey.dateOfDataCollection || 'N/A'}</span>
              <span className="text-[11px] text-slate-500">ಸಮೀಕ್ಷೆಯ ದಿನಾಂಕ</span>
            </div>
            <div className="space-y-1">
              <span className="font-bold text-slate-700 block">Name of the Data Collector :</span>
              <span className="block font-black text-slate-900 text-sm">{survey.nameOfDataCollector || 'N/A'}</span>
              <span className="text-[11px] text-slate-500">ಸಮೀಕ್ಷೆಕಾರರ ಹೆಸರು</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-5 border-t border-slate-200">
            <div className="space-y-1">
              <span className="font-bold text-slate-700 block">Name of Organization/College :</span>
              <span className="block font-black text-slate-900 text-sm">{survey.nameOfOrganizationCollege || 'N/A'}</span>
              <span className="text-[11px] text-slate-500">ಸಂಸ್ಥೆ / ಕಾಲೇಜಿನ ಹೆಸರು</span>
            </div>
            <div className="space-y-1">
              <span className="font-bold text-slate-700 block">Address of the family whose data is collected :</span>
              <span className="block font-black text-slate-900 text-sm">{survey.addressOfFamily || 'N/A'}</span>
              <span className="text-[11px] text-slate-500">ಕುಟುಂಬ ವಿವರ ಮತ್ತು ವಿಳಾಸ</span>
            </div>
          </div>
        </div>

        {/* Family Members Roster Table */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider bg-slate-100 px-4 py-2.5 rounded-t-xl border border-slate-300 border-b-0 text-slate-800">
            Family Members Details (ಕುಟುಂಬದ ಸದಸ್ಯರ ವಿವರ)
          </h3>
          <div className="overflow-x-auto border border-slate-300 rounded-b-xl text-xs shadow-xs">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-200 font-bold border-b border-slate-300 text-slate-800">
                <tr>
                  <th className="p-3 border-r border-slate-300 w-16">Sl. No.</th>
                  <th className="p-3 border-r border-slate-300">Name of the family members<br /><span className="font-normal text-[10px]">ಕುಟುಂಬದ ಸದಸ್ಯರ ಹೆಸರು</span></th>
                  <th className="p-3 border-r border-slate-300 w-28">Age<br /><span className="font-normal text-[10px]">ವಯಸ್ಸು</span></th>
                  <th className="p-3 w-28">Gender<br /><span className="font-normal text-[10px]">ಲಿಂಗ</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300">
                {(!survey.familyMembers || survey.familyMembers.length === 0) ? (
                  <tr>
                    <td colSpan={4} className="p-4 text-center text-slate-400 italic">No family members registered in roster.</td>
                  </tr>
                ) : (
                  survey.familyMembers.map((m, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-3 border-r border-slate-300 font-semibold">{m.slNo || idx + 1}</td>
                      <td className="p-3 border-r border-slate-300 font-bold text-slate-900">{m.name || 'N/A'}</td>
                      <td className="p-3 border-r border-slate-300">{m.age} Yrs</td>
                      <td className="p-3">{m.gender}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Questions 1 to 8 */}
        <div className="space-y-6 text-xs">
          <h3 className="text-xs font-bold uppercase tracking-wider bg-slate-100 px-4 py-2.5 rounded-xl border border-slate-300 text-slate-800">
            Socio-Economic & Legal Questions (Q1 - Q8)
          </h3>

          <div className="p-5 border border-slate-300 rounded-2xl bg-white space-y-2.5 shadow-2xs">
            <p className="font-bold text-sm text-slate-900">1. Total number of earning persons and dependent member in the house ?</p>
            <p className="text-[11px] text-slate-500">ಕುಟುಂಬದಲ್ಲಿ ದುಡಿಯುವ ವ್ಯಕ್ತಿಗಳ ಸಂಖ್ಯೆ ಮತ್ತು ಅವಲಂಬಿತರ ಸಂಖ್ಯೆ :</p>
            <p className="font-bold text-indigo-950 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">{survey.q1TotalEarningAndDependents || 'N/A'}</p>
          </div>

          <div className="p-5 border border-slate-300 rounded-2xl bg-white space-y-2.5 shadow-2xs">
            <p className="font-bold text-sm text-slate-900">2. Main occupation of your family :</p>
            <p className="text-[11px] text-slate-500">ಕುಟುಂಬದ ಪ್ರಮುಖ ಉದ್ಯೋಗ :</p>
            <p className="font-bold text-slate-900 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">{survey.q2MainOccupation || 'N/A'}</p>
            {survey.q2MainOccupation === 'Other' && survey.q2MainOccupationOther && (
              <p className="text-xs text-slate-600 pl-1"><span className="font-bold">Occupation (specify):</span> {survey.q2MainOccupationOther}</p>
            )}
          </div>

          <div className="p-5 border border-slate-300 rounded-2xl bg-white space-y-2.5 shadow-2xs">
            <p className="font-bold text-sm text-slate-900">3. Which type of house you have ? :</p>
            <p className="text-[11px] text-slate-500">ನೀವು ಹೊಂದಿರುವ ಮನೆಯ ವಿಧ :</p>
            <p className="font-bold text-slate-900 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">{survey.q3HouseType || 'N/A'}</p>
            {survey.q3HouseType === 'Other' && survey.q3HouseTypeOther && (
              <p className="text-xs text-slate-600 pl-1"><span className="font-bold">House Type (specify):</span> {survey.q3HouseTypeOther}</p>
            )}
          </div>

          <div className="p-5 border border-slate-300 rounded-2xl bg-white space-y-2.5 shadow-2xs">
            <p className="font-bold text-sm text-slate-900">4. Ownership of the House :</p>
            <p className="text-[11px] text-slate-500">ಮನೆಯ ಮಾಲೀಕತ್ವ :</p>
            <p className="font-bold text-slate-900 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">{survey.q4HouseOwnership || 'N/A'}</p>
          </div>

          <div className="p-5 border border-slate-300 rounded-2xl bg-white space-y-2.5 shadow-2xs">
            <p className="font-bold text-sm text-slate-900">5. Do they fall into any of the following category to avail free legal aid :</p>
            <p className="text-[11px] text-slate-500">ಉಚಿತ ಕಾನೂನು ನೆರವು ಪಡೆಯಲು ಅರ್ಹತೆಯ ವರ್ಗಗಳು :</p>
            <div className="flex flex-wrap gap-2 pt-1">
              {(survey.q5FreeLegalAidCategory || []).length === 0 ? (
                <span className="text-slate-400 italic">None selected</span>
              ) : (
                survey.q5FreeLegalAidCategory.map((cat, i) => (
                  <span key={i} className="px-3 py-1.5 bg-indigo-50 border border-indigo-200 text-indigo-900 font-bold rounded-xl text-xs">
                    {cat}
                  </span>
                ))
              )}
            </div>
          </div>

          <div className="p-5 border border-slate-300 rounded-2xl bg-white space-y-2.5 shadow-2xs">
            <p className="font-bold text-sm text-slate-900">6. Do you have a vehicle, if yes do you have a valid :</p>
            <p className="text-[11px] text-slate-500">ನೀವು ವಾಹನ ಹೊಂದಿದ್ದೀರಾ ಮತ್ತು ಅಗತ್ಯ ದಾಖಲೆಗಳು ಇವೆಯೇ :</p>
            <p className="font-bold text-slate-900 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">Vehicle Owned: {survey.q6HasVehicle}</p>
            {survey.q6HasVehicle === 'Yes' && (
              <div className="pl-4 pt-2 space-y-2 text-slate-700 text-xs border-l-2 border-indigo-200 ml-2">
                <p>• Driving License: <span className="font-bold text-slate-900">{survey.q6aDrivingLicense ?? 'Not Recorded'}</span></p>
                <p>• Insurance Coverage: <span className="font-bold text-slate-900">{survey.q6bInsuranceCoverage ?? 'Not Recorded'}</span></p>
                <p>• Registration Certificate (RC): <span className="font-bold text-slate-900">{survey.q6cRegistrationCertificate ?? 'Not Recorded'}</span></p>
              </div>
            )}
          </div>

          <div className="p-5 border border-slate-300 rounded-2xl bg-white space-y-2.5 shadow-2xs">
            <p className="font-bold text-sm text-slate-900">7. Is there any pending litigation your family is involved in? if yes, for how long? :</p>
            <p className="text-[11px] text-slate-500">ಕುಟುಂಬವು ಯಾವುದೇ ಬಾಕಿ ಮೊಕದ್ದಮೆಯಲ್ಲಿ ತೊಡಗಿದೆಯೇ :</p>
            <p className="font-bold text-slate-900 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
              {survey.q7PendingLitigation}
            </p>
            {survey.q7PendingLitigation === 'Yes' && survey.q7PendingLitigationDuration && (
              <p className="text-xs text-slate-600 pl-1"><span className="font-bold">Duration:</span> {survey.q7PendingLitigationDuration}</p>
            )}
          </div>

          <div className="p-5 border border-slate-300 rounded-2xl bg-white space-y-2.5 shadow-2xs">
            <p className="font-bold text-sm text-slate-900">8. Do you have membership of any organization? :</p>
            <p className="text-[11px] text-slate-500">ನೀವು ಯಾವುದೇ ಸಂಸ್ಥೆಯ ಸದಸ್ಯತ್ವವನ್ನು ಹೊಂದಿದ್ದೀರಾ :</p>
            <p className="font-bold text-slate-900 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">{survey.q8MembershipOrganization}</p>
            {survey.q8MembershipOrganization === 'Yes' && (
              <div className="pl-4 pt-2 space-y-2 text-slate-700 text-xs border-l-2 border-indigo-200 ml-2">
                <p>• Self Help Group (SHG): <span className="font-bold text-slate-900">{survey.q8aSelfHelpGroup ?? 'Not Recorded'}</span></p>
                <p>• Microfinance Group: <span className="font-bold text-slate-900">{survey.q8bMicroFinanceGroup ?? 'Not Recorded'}</span></p>
                <p>• Milk Producers Cooperative: <span className="font-bold text-slate-900">{survey.q8cMilkProcurersCoop ?? 'Not Recorded'}</span></p>
                <p>• Other Local Organization: <span className="font-bold text-slate-900">
                  {survey.q8dOtherOrg === 'Yes' ? `Yes (${survey.q8dOtherOrgName || 'Unnamed'})` : (survey.q8dOtherOrg ?? 'Not Recorded')}
                </span></p>
              </div>
            )}
          </div>
        </div>

        {/* Document Non-Availability Survey Table */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider bg-slate-100 px-4 py-2.5 rounded-t-xl border border-slate-300 border-b-0 text-slate-800">
            SURVEY REGARDING NON-AVAILABILITY OF NECESSARY DOCUMENTS (ಅವಶ್ಯಕ ಪ್ರಮಾಣಪತ್ರಗಳ ವಿವರ)
          </h3>
          <div className="overflow-x-auto border border-slate-300 rounded-b-xl text-xs shadow-xs">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-200 font-bold border-b border-slate-300 text-slate-800">
                <tr>
                  <th className="p-3 border-r border-slate-300 w-12">Sl. No.</th>
                  <th className="p-3 border-r border-slate-300">Certificate (ಪ್ರಮಾಣ ಪತ್ರ)</th>
                  <th className="p-3 border-r border-slate-300 w-28">Availability</th>
                  <th className="p-3 border-r border-slate-300">Missing Member Details</th>
                  <th className="p-3 w-32">Whether Applied</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300">
                {[
                  { sl: 1, name: '1. Ration Card (ಪಡಿತರ ಚೀಟಿ)', doc: survey.doc1RationCard },
                  { sl: 2, name: '2. Aadhar Card (ಆಧಾರ್ ಕಾರ್ಡ್)', doc: survey.doc2AadharCard },
                  { sl: 3, name: '3. Birth Certificate (ಜನನ ಪ್ರಮಾಣ ಪತ್ರ)', doc: survey.doc3BirthCertificate },
                  { sl: 4, name: '4. Death Certificate (ಮರಣ ಪ್ರಮಾಣ ಪತ್ರ)', doc: survey.doc4DeathCertificate },
                  { sl: 5, name: '5. Old Age pension (ವೃದ್ಧಾಪ್ಯ ವೇತನ)', doc: survey.doc5OldAgePension },
                  { sl: 6, name: '6. Widow pension (ವಿಧವಾ ವೇತನ)', doc: survey.doc6WidowPension },
                  { sl: 7, name: '7. Unique disability identify Card (UDID)', doc: survey.doc7UdidDisabilityCard },
                  { sl: 8, name: '8. Ayushman Bharat Health Account Card', doc: survey.doc8AyushmanHealthCard },
                ].map((row) => (
                  <tr key={row.sl} className="hover:bg-slate-50">
                    <td className="p-3 border-r border-slate-300 font-bold">{row.sl}</td>
                    <td className="p-3 border-r border-slate-300 font-semibold text-slate-800">{row.name}</td>
                    <td className="p-3 border-r border-slate-300 font-bold">
                      <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold ${
                        row.doc?.hasDocument === 'Yes'
                          ? 'bg-emerald-100 text-emerald-800'
                          : row.doc?.hasDocument === 'No'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {row.doc?.hasDocument || 'Not Recorded'}
                      </span>
                    </td>
                    <td className="p-3 border-r border-slate-300 text-slate-700">{row.doc?.namesMissing || '-'}</td>
                    <td className="p-3 font-medium">{row.doc?.whetherApplied || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Questions 9 to 21 */}
        <div className="space-y-6 text-xs">
          <h3 className="text-xs font-bold uppercase tracking-wider bg-slate-100 px-4 py-2.5 rounded-xl border border-slate-300 text-slate-800">
            Education, Employment & Vulnerability Details (Q9 - Q21)
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 bg-slate-50 p-6 rounded-2xl border border-slate-300">
            <div className="space-y-1">
              <span className="font-bold text-slate-700 block">9. Education Qualification:</span>
              <span className="font-black text-slate-900 text-sm block">{survey.q9EducationQualification}</span>
              {survey.q9EducationQualification === 'Other' && survey.q9EducationQualificationOther && (
                <span className="block text-xs text-slate-600 mt-0.5"><span className="font-bold">Specification:</span> {survey.q9EducationQualificationOther}</span>
              )}
            </div>
            <div className="space-y-1">
              <span className="font-bold text-slate-700 block">10. Discontinued Education:</span>
              <span className="font-black text-slate-900 text-sm block">{survey.q10DiscontinuedEducation}</span>
              {survey.q10DiscontinuedEducation === 'Yes' && survey.q10DiscontinuedReason && (
                <span className="block text-xs text-slate-600 mt-0.5"><span className="font-bold">Reason:</span> {survey.q10DiscontinuedReason}</span>
              )}
            </div>
            <div className="space-y-1 pt-2 border-t border-slate-200">
              <span className="font-bold text-slate-700 block">11. Nature of employment:</span>
              <span className="font-black text-slate-900 text-sm block">{survey.q11NatureOfEmployment}</span>
              {survey.q11NatureOfEmployment === 'Unemployed' && (survey.q11UnemployedCount || survey.q11UnemployedReason) && (
                <span className="block text-xs text-slate-600 mt-0.5">
                  {survey.q11UnemployedCount && <span><span className="font-bold">Unemployed count:</span> {survey.q11UnemployedCount} &nbsp;</span>}
                  {survey.q11UnemployedReason && <span><span className="font-bold">Reason:</span> {survey.q11UnemployedReason}</span>}
                </span>
              )}
            </div>
            <div className="space-y-1 pt-2 border-t border-slate-200">
              <span className="font-bold text-slate-700 block">12. Transgender in family:</span>
              <span className="font-black text-slate-900 text-sm block">{survey.q12TransgenderInFamily}</span>
              {survey.q12TransgenderInFamily === 'Yes' && survey.q12TransgenderDetails && (
                <span className="block text-xs text-slate-600 mt-0.5"><span className="font-bold">Details:</span> {survey.q12TransgenderDetails}</span>
              )}
            </div>
            <div className="space-y-1 pt-2 border-t border-slate-200">
              <span className="font-bold text-slate-700 block">13. Victim of Child Marriage:</span>
              <span className="font-black text-slate-900 text-sm block">{survey.q13VictimOfChildMarriage}</span>
              {survey.q13VictimOfChildMarriage === 'Yes' && survey.q13ChildMarriageDetails && (
                <span className="block text-xs text-slate-600 mt-0.5"><span className="font-bold">Details:</span> {survey.q13ChildMarriageDetails}</span>
              )}
            </div>
            <div className="space-y-1 pt-2 border-t border-slate-200">
              <span className="font-bold text-slate-700 block">14. Affected with HIV / Incurable disease:</span>
              <span className="font-black text-slate-900 text-sm block">{survey.q14AffectedHivIncurableDisease}</span>
              {survey.q14AffectedHivIncurableDisease === 'Yes' && survey.q14HivDetails && (
                <span className="block text-xs text-slate-600 mt-0.5"><span className="font-bold">Details:</span> {survey.q14HivDetails}</span>
              )}
            </div>
            <div className="space-y-1 pt-2 border-t border-slate-200">
              <span className="font-bold text-slate-700 block">15. Victim of Child Labour:</span>
              <span className="font-black text-slate-900 text-sm block">{survey.q15VictimOfChildLabour}</span>
              {survey.q15VictimOfChildLabour === 'Yes' && survey.q15ChildLabourDetails && (
                <span className="block text-xs text-slate-600 mt-0.5"><span className="font-bold">Details:</span> {survey.q15ChildLabourDetails}</span>
              )}
            </div>
            <div className="space-y-1 pt-2 border-t border-slate-200">
              <span className="font-bold text-slate-700 block">16. Victim of Bonded Labour:</span>
              <span className="font-black text-slate-900 text-sm block">{survey.q16VictimOfBondedLabour}</span>
              {survey.q16VictimOfBondedLabour === 'Yes' && survey.q16BondedLabourDetails && (
                <span className="block text-xs text-slate-600 mt-0.5"><span className="font-bold">Details:</span> {survey.q16BondedLabourDetails}</span>
              )}
            </div>
            <div className="space-y-1 pt-2 border-t border-slate-200">
              <span className="font-bold text-slate-700 block">17. Victim of Devadasi System:</span>
              <span className="font-black text-slate-900 text-sm block">{survey.q17VictimOfDevadasiSystem}</span>
              {survey.q17VictimOfDevadasiSystem === 'Yes' && survey.q17DevadasiDetails && (
                <span className="block text-xs text-slate-600 mt-0.5"><span className="font-bold">Details:</span> {survey.q17DevadasiDetails}</span>
              )}
            </div>
            <div className="space-y-1 pt-2 border-t border-slate-200">
              <span className="font-bold text-slate-700 block">18. Mental or Intellectual Disability:</span>
              <span className="font-black text-slate-900 text-sm block">{survey.q18MentalOrIntellectualDisability}</span>
              {survey.q18MentalOrIntellectualDisability === 'Yes' && survey.q18DisabilityDetails && (
                <span className="block text-xs text-slate-600 mt-0.5"><span className="font-bold">Details:</span> {survey.q18DisabilityDetails}</span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50 p-6 rounded-2xl border border-slate-300">
            <div className="space-y-1">
              <span className="font-bold text-slate-700 block">19a. Water:</span>
              <span className="font-black text-slate-900 text-sm">{survey.q19aWater}</span>
            </div>
            <div className="space-y-1">
              <span className="font-bold text-slate-700 block">19b. Electricity:</span>
              <span className="font-black text-slate-900 text-sm">{survey.q19bElectricity}</span>
            </div>
            <div className="space-y-1">
              <span className="font-bold text-slate-700 block">19c. Roads:</span>
              <span className="font-black text-slate-900 text-sm">{survey.q19cRoadsPathways}</span>
            </div>
            <div className="space-y-1">
              <span className="font-bold text-slate-700 block">19d. Health Facilities:</span>
              <span className="font-black text-slate-900 text-sm">{survey.q19dHealthFacilities}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-6 rounded-2xl border border-slate-300">
            <div className="space-y-1">
              <span className="font-bold text-slate-700 block">20a. Land Property Documents (RTC/Khata):</span>
              <span className="font-black text-slate-900 text-sm">{survey.q20aLandProperties}</span>
            </div>
            <div className="space-y-1">
              <span className="font-bold text-slate-700 block">20b. House Property Documents:</span>
              <span className="font-black text-slate-900 text-sm">{survey.q20bHouseProperty}</span>
            </div>
          </div>

          <div className="p-6 border border-slate-300 rounded-2xl bg-white space-y-2">
            <p className="font-bold text-sm text-slate-900">21. Any other legal information / observations :</p>
            <p className="text-[11px] text-slate-500">ಇತರೆ ಯಾವುದೇ ಕಾನೂನು ಮಾಹಿತಿ ಅಥವಾ ಗಮನಿಸಿದ ಅಂಶಗಳು :</p>
            <p className="font-semibold text-slate-800 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs leading-relaxed">
              {survey.q21OtherLegalProblems || 'No additional remarks recorded.'}
            </p>
          </div>
        </div>

        {/* Verification Proof Photo Block */}
        {survey.proofPhotoUrl && (
          <div className="border border-slate-300 rounded-2xl p-6 bg-slate-50 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <Camera size={16} className="text-indigo-600" />
              <span>Survey Location & Family Verification Photo</span>
            </h3>
            <div className="w-full max-w-sm rounded-xl overflow-hidden border border-slate-300 bg-white">
              <ImageWithSignedUrl
                src={survey.proofPhotoUrl}
                alt="Survey Proof Photo"
                className="w-full h-auto object-cover"
              />
            </div>
          </div>
        )}

        {/* Signatures & Footer */}
        <div className="pt-8 border-t-2 border-slate-900 grid grid-cols-2 gap-8 text-xs">
          <div className="space-y-4">
            <div className="h-12 border-b border-dashed border-slate-400" />
            <p className="font-bold text-slate-900">Signature / Thumb Impression of Informant</p>
            <p className="text-[10px] text-slate-500">ಮಾಹಿತಿ ನೀಡಿದವರ ಸಹಿ / ಹೆಬ್ಬೆರಳ ಗುರುತು</p>
          </div>
          <div className="space-y-4 text-right">
            <div className="h-12 border-b border-dashed border-slate-400" />
            <p className="font-bold text-slate-900">Signature of Data Collector (Volunteer)</p>
            <p className="text-[10px] text-slate-500">ಮಾಹಿತಿ ಸಂಗ್ರಹಿಸಿದವರ ಸಹಿ</p>
          </div>
        </div>
      </div>
    </div>
  );
};
