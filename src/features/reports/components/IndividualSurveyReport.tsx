import React, { useRef } from 'react';
import { Printer, Download, ArrowLeft, Scale, Camera, CheckCircle2, MapPin } from 'lucide-react';
import type { SurveyResponseData } from '@/types/survey';
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
      <div className="max-w-4xl mx-auto mb-6 flex items-center justify-between gap-4 print:hidden">
        <button
          onClick={onBack}
          className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5 transition-all shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Workspace
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
          >
            <Printer className="w-4 h-4" />
            Print Data Collection Sheet
          </button>

          <button
            onClick={handleDownloadPDF}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all"
          >
            <Download className="w-4 h-4" />
            Download PDF
          </button>
        </div>
      </div>

      {/* ─── OFFICIAL DATA COLLECTION SHEET PDF-EXACT LAYOUT ─── */}
      <div
        ref={reportRef}
        className="max-w-4xl mx-auto bg-white text-slate-900 rounded-2xl shadow-2xl p-8 sm:p-12 border border-slate-300 font-sans print:shadow-none print:border-none print:p-0 print:m-0 print:w-full space-y-6"
      >
        {/* Top Header - Village/District */}
        <div className="text-right text-xs font-semibold text-slate-800">
          Village/District : <span className="font-bold underline underline-offset-4 text-slate-900">{survey.villageDistrict || '________________________'}</span>
          <span className="block text-[10px] text-slate-500 font-normal">ಗ್ರಾಮ/ಜಿಲ್ಲೆ</span>
        </div>

        {/* Title */}
        <div className="text-center border-b-2 border-slate-900 pb-3">
          <h1 className="text-2xl font-extrabold uppercase tracking-wider text-slate-900 flex items-center justify-center gap-2">
            <Scale className="w-6 h-6 text-slate-800" />
            DATA COLLECTION SHEET
          </h1>
          <h2 className="text-lg font-bold text-slate-700">ವಿವರ ಸಂಗ್ರಹಣಾ ನಮೂನೆ</h2>
          <p className="text-[11px] text-slate-500 font-mono mt-1">Ref ID: {survey.surveyReferenceId}</p>
        </div>

        {/* Preliminary Details Block */}
        <div className="border border-slate-300 rounded-xl p-4 text-xs space-y-2 bg-slate-50">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <span className="font-semibold text-slate-700">Date of Data collection :</span>
              <span className="block font-bold text-slate-900">{survey.dateOfDataCollection || 'N/A'}</span>
              <span className="text-[10px] text-slate-500">ಸಮೀಕ್ಷೆಯ ದಿನಾಂಕ :</span>
            </div>
            <div>
              <span className="font-semibold text-slate-700">Name of the Data Collector :</span>
              <span className="block font-bold text-slate-900">{survey.nameOfDataCollector || 'N/A'}</span>
              <span className="text-[10px] text-slate-500">ಸಮೀಕ್ಷೆಕಾರರ ಹೆಸರು :</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200">
            <div>
              <span className="font-semibold text-slate-700">Name of Organization/College :</span>
              <span className="block font-bold text-slate-900">{survey.nameOfOrganizationCollege || 'N/A'}</span>
              <span className="text-[10px] text-slate-500">ಸಂಸ್ಥೆ/ಕಾಲೇಜಿನ ಹೆಸರು :</span>
            </div>
            <div>
              <span className="font-semibold text-slate-700">Address of the family whose data is collected :</span>
              <span className="block font-bold text-slate-900">{survey.addressOfFamily || 'N/A'}</span>
              <span className="text-[10px] text-slate-500">ಕುಟುಂಬ ವಿವರ ಮತ್ತು ವಿಳಾಸ :</span>
            </div>
          </div>
        </div>

        {/* Family Members Roster Table */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider bg-slate-100 p-2 rounded-t-lg border border-slate-300 border-b-0">
            Family Members Details (ಕುಟುಂಬದ ಸದಸ್ಯರ ವಿವರ)
          </h3>
          <div className="overflow-x-auto border border-slate-300 rounded-b-lg text-xs">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-200 font-bold border-b border-slate-300 text-slate-800">
                <tr>
                  <th className="p-2.5 border-r border-slate-300 w-16">Sl. No.</th>
                  <th className="p-2.5 border-r border-slate-300">Name of the family members<br /><span className="font-normal text-[10px]">ಕುಟುಂಬದ ಸದಸ್ಯರ ಹೆಸರು</span></th>
                  <th className="p-2.5 border-r border-slate-300 w-24">Age<br /><span className="font-normal text-[10px]">ವಯಸ್ಸು</span></th>
                  <th className="p-2.5 w-24">Gender<br /><span className="font-normal text-[10px]">ಲಿಂಗ</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300">
                {(!survey.familyMembers || survey.familyMembers.length === 0) ? (
                  <tr>
                    <td colSpan={4} className="p-3 text-center text-slate-400 italic">No family members registered in roster.</td>
                  </tr>
                ) : (
                  survey.familyMembers.map((m, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-2.5 border-r border-slate-300 font-semibold">{m.slNo || idx + 1}</td>
                      <td className="p-2.5 border-r border-slate-300 font-bold text-slate-900">{m.name || 'N/A'}</td>
                      <td className="p-2.5 border-r border-slate-300">{m.age} Yrs</td>
                      <td className="p-2.5">{m.gender}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Questions 1 to 8 */}
        <div className="space-y-3 text-xs">
          <h3 className="text-xs font-bold uppercase tracking-wider bg-slate-100 p-2 rounded-lg border border-slate-300">
            Socio-Economic & Legal Questions (Q1 - Q8)
          </h3>

          <div className="p-3 border border-slate-300 rounded-xl bg-white space-y-1">
            <p className="font-bold text-slate-900">1. Total number of earning persons and dependent member in the house ?</p>
            <p className="text-[11px] text-slate-600">ಕುಟುಂಬದಲ್ಲಿ ದುಡಿಯುವ ವ್ಯಕ್ತಿಗಳ ಸಂಖ್ಯೆ ಮತ್ತು ಅವಲಂಬಿತರ ಸಂಖ್ಯೆ :</p>
            <p className="font-semibold text-indigo-900 bg-slate-50 p-2 rounded border border-slate-200">{survey.q1TotalEarningAndDependents || 'N/A'}</p>
          </div>

          <div className="p-3 border border-slate-300 rounded-xl bg-white space-y-1">
            <p className="font-bold text-slate-900">2. Main occupation of your family :</p>
            <p className="font-semibold text-slate-800 bg-slate-50 p-2 rounded border border-slate-200">{survey.q2MainOccupation || 'N/A'}</p>
          </div>

          <div className="p-3 border border-slate-300 rounded-xl bg-white space-y-1">
            <p className="font-bold text-slate-900">3. Which type of house you have ? :</p>
            <p className="font-semibold text-slate-800 bg-slate-50 p-2 rounded border border-slate-200">{survey.q3HouseType || 'N/A'}</p>
          </div>

          <div className="p-3 border border-slate-300 rounded-xl bg-white space-y-1">
            <p className="font-bold text-slate-900">4. Ownership of the House :</p>
            <p className="font-semibold text-slate-800 bg-slate-50 p-2 rounded border border-slate-200">{survey.q4HouseOwnership || 'N/A'}</p>
          </div>

          <div className="p-3 border border-slate-300 rounded-xl bg-white space-y-1">
            <p className="font-bold text-slate-900">5. Do they fall into any of the following category to avail free legal aid :</p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {(survey.q5FreeLegalAidCategory || []).length === 0 ? (
                <span className="text-slate-400 italic">None selected</span>
              ) : (
                survey.q5FreeLegalAidCategory.map((cat, i) => (
                  <span key={i} className="px-2.5 py-1 bg-indigo-50 border border-indigo-200 text-indigo-900 font-bold rounded-lg text-[11px]">
                    {cat}
                  </span>
                ))
              )}
            </div>
          </div>

          <div className="p-3 border border-slate-300 rounded-xl bg-white space-y-1">
            <p className="font-bold text-slate-900">6. Do you have a vehicle, if yes do you have a valid :</p>
            <p className="font-semibold text-slate-800 bg-slate-50 p-2 rounded border border-slate-200">Vehicle Owned: {survey.q6HasVehicle}</p>
          </div>

          <div className="p-3 border border-slate-300 rounded-xl bg-white space-y-1">
            <p className="font-bold text-slate-900">7. Is there any pending litigation your family is involved in? if yes, for how long? :</p>
            <p className="font-semibold text-slate-800 bg-slate-50 p-2 rounded border border-slate-200">
              {survey.q7PendingLitigation === 'Yes' ? `Yes (Duration: ${survey.q7PendingLitigationDuration || 'N/A'})` : 'No'}
            </p>
          </div>

          <div className="p-3 border border-slate-300 rounded-xl bg-white space-y-1">
            <p className="font-bold text-slate-900">8. Do you have membership of any organization? :</p>
            <p className="font-semibold text-slate-800 bg-slate-50 p-2 rounded border border-slate-200">{survey.q8MembershipOrganization}</p>
          </div>
        </div>

        {/* Document Non-Availability Survey Table */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider bg-slate-100 p-2 rounded-t-lg border border-slate-300 border-b-0">
            SURVEY REGARDING NON-AVAILABILITY OF NECESSARY DOCUMENTS (ಅವಶ್ಯಕ ಪ್ರಮಾಣಪತ್ರಗಳ ವಿವರ)
          </h3>
          <div className="overflow-x-auto border border-slate-300 rounded-b-lg text-xs">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-200 font-bold border-b border-slate-300 text-slate-800">
                <tr>
                  <th className="p-2 border-r border-slate-300 w-12">Sl. No.</th>
                  <th className="p-2 border-r border-slate-300">Certificate (ಪ್ರಮಾಣ ಪತ್ರ)</th>
                  <th className="p-2 border-r border-slate-300 w-24">Availability</th>
                  <th className="p-2 border-r border-slate-300">Missing Member Details</th>
                  <th className="p-2 w-28">Whether Applied</th>
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
                    <td className="p-2 border-r border-slate-300 font-bold">{row.sl}</td>
                    <td className="p-2 border-r border-slate-300 font-semibold text-slate-800">{row.name}</td>
                    <td className="p-2 border-r border-slate-300 font-bold">
                      <span className={`px-2 py-0.5 rounded text-[11px] ${row.doc?.hasDocument === 'Yes' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                        {row.doc?.hasDocument || 'N/A'}
                      </span>
                    </td>
                    <td className="p-2 border-r border-slate-300 text-slate-700">{row.doc?.namesMissing || '-'}</td>
                    <td className="p-2 font-medium">{row.doc?.whetherApplied || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Questions 9 to 21 */}
        <div className="space-y-3 text-xs">
          <h3 className="text-xs font-bold uppercase tracking-wider bg-slate-100 p-2 rounded-lg border border-slate-300">
            Education, Employment & Vulnerability Details (Q9 - Q21)
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-300">
            <div>
              <span className="font-semibold text-slate-700 block">9. Education Qualification:</span>
              <span className="font-bold text-slate-900">{survey.q9EducationQualification}</span>
            </div>
            <div>
              <span className="font-semibold text-slate-700 block">10. Discontinued Education:</span>
              <span className="font-bold text-slate-900">{survey.q10DiscontinuedEducation}</span>
            </div>
            <div>
              <span className="font-semibold text-slate-700 block">11. Nature of employment:</span>
              <span className="font-bold text-slate-900">{survey.q11NatureOfEmployment}</span>
            </div>
            <div>
              <span className="font-semibold text-slate-700 block">12. Transgender in family:</span>
              <span className="font-bold text-slate-900">{survey.q12TransgenderInFamily}</span>
            </div>
            <div>
              <span className="font-semibold text-slate-700 block">13. Victim of Child Marriage:</span>
              <span className="font-bold text-slate-900">{survey.q13VictimOfChildMarriage}</span>
            </div>
            <div>
              <span className="font-semibold text-slate-700 block">14. Affected with HIV / Incurable disease:</span>
              <span className="font-bold text-slate-900">{survey.q14AffectedHivIncurableDisease}</span>
            </div>
            <div>
              <span className="font-semibold text-slate-700 block">15. Victim of Child Labour:</span>
              <span className="font-bold text-slate-900">{survey.q15VictimOfChildLabour}</span>
            </div>
            <div>
              <span className="font-semibold text-slate-700 block">16. Victim of Bonded Labour:</span>
              <span className="font-bold text-slate-900">{survey.q16VictimOfBondedLabour}</span>
            </div>
            <div>
              <span className="font-semibold text-slate-700 block">17. Victim of Devadasi System:</span>
              <span className="font-bold text-slate-900">{survey.q17VictimOfDevadasiSystem}</span>
            </div>
            <div>
              <span className="font-semibold text-slate-700 block">18. Mental or Intellectual Disability:</span>
              <span className="font-bold text-slate-900">{survey.q18MentalOrIntellectualDisability}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-300">
            <div>
              <span className="font-semibold text-slate-700 block">19a. Water:</span>
              <span className="font-bold text-slate-900">{survey.q19aWater}</span>
            </div>
            <div>
              <span className="font-semibold text-slate-700 block">19b. Electricity:</span>
              <span className="font-bold text-slate-900">{survey.q19bElectricity}</span>
            </div>
            <div>
              <span className="font-semibold text-slate-700 block">19c. Roads:</span>
              <span className="font-bold text-slate-900">{survey.q19cRoadsPathways}</span>
            </div>
            <div>
              <span className="font-semibold text-slate-700 block">19d. Health Facilities:</span>
              <span className="font-bold text-slate-900">{survey.q19dHealthFacilities}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-300">
            <div>
              <span className="font-semibold text-slate-700 block">20a. Land Property Documents (RTC/Khata):</span>
              <span className="font-bold text-slate-900">{survey.q20aLandProperties}</span>
            </div>
            <div>
              <span className="font-semibold text-slate-700 block">20b. House Property Documents:</span>
              <span className="font-bold text-slate-900">{survey.q20bHouseProperty}</span>
            </div>
          </div>

          <div className="p-3 border border-slate-300 rounded-xl bg-white">
            <span className="font-bold text-slate-900 block">21. Any other Legal problems:</span>
            <p className="text-slate-800 mt-1 font-medium">{survey.q21OtherLegalProblems || 'None specified.'}</p>
          </div>
        </div>

        {/* ─── PROOF OF SURVEY PHOTO VERIFICATION SECTION ─── */}
        <div className="border border-slate-300 rounded-xl p-4 bg-slate-50 text-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
              <Camera className="w-4 h-4 text-indigo-600" />
              Proof of Survey Photo Verification (ಸಮೀಕ್ಷೆ ಸ್ಥಳದ ಭಾವಚಿತ್ರ)
            </span>
            {survey.proofPhotoUrl && (
              <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded-full text-[10px] flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Verified On-Site Photo
              </span>
            )}
          </div>

          {survey.proofPhotoUrl ? (
            <div className="space-y-2">
              <div className="max-w-md mx-auto rounded-xl overflow-hidden border-2 border-slate-300 shadow bg-white p-2">
                <img
                  src={survey.proofPhotoUrl}
                  alt="Proof of Survey Location"
                  className="w-full max-h-80 object-contain rounded-lg"
                />
              </div>
              
              <div className="bg-indigo-50 border border-indigo-200 p-2.5 rounded-xl text-center text-xs text-indigo-950 font-medium max-w-md mx-auto space-y-0.5">
                <div className="flex items-center justify-center gap-1.5 font-bold">
                  <MapPin className="w-3.5 h-3.5 text-indigo-700" />
                  <span>GPS Geotag Location: {survey.gpsLocation?.formattedLocation || `${survey.gpsLocation?.latitude || 12.9716}° N, ${survey.gpsLocation?.longitude || 77.5946}° E`}</span>
                </div>
                <p className="text-[10px] text-slate-600">
                  Photo Captured Timestamp: {survey.photoCapturedAt || survey.submittedAt || new Date().toLocaleString()}
                </p>
              </div>
            </div>
          ) : (
            <div className="p-4 border-2 border-dashed border-slate-300 rounded-xl text-center text-slate-400 italic">
              No proof photo attached.
            </div>
          )}
        </div>

        {/* Official Note & Signatures */}
        <div className="border-t-2 border-slate-400 pt-4 mt-6 text-xs space-y-4">
          <div className="bg-amber-50 border border-amber-300 p-3 rounded-xl text-amber-950 font-medium leading-relaxed">
            <p className="font-bold">Note :</p>
            <p>1) Inform about NALSA Helpline No. 15100</p>
            <p>2) Inform them to visit nearest Legal Services Clinic / Legal Services Authority or Committee for any legal assistance.</p>
            <p className="text-[10px] text-amber-800 mt-1">ಸೂಚನೆ : 1) ರಾಷ್ಟ್ರೀಯ ಕಾನೂನು ಸೇವೆಗಳ ಪ್ರಾಧಿಕಾರದ ಸಹಾಯವಾಣಿ ಸಂಖ್ಯೆ 15100 ಬಗ್ಗೆ ತಿಳಿಸುವುದು. 2) ಉಚಿತ ಕಾನೂನು ನೆರವು/ಸಹಾಯಕ್ಕಾಗಿ ಹತ್ತಿರದ ಕಾನೂನು ಸೇವೆಗಳ ಕೇಂದ್ರವನ್ನು ಸಂಪರ್ಕಿಸುವುದು.</p>
          </div>

          <div className="pt-8 flex items-end justify-between text-xs text-slate-800">
            <div>
              <p className="font-bold underline">{survey.nameOfDataCollector || 'Data Collector'}</p>
              <p className="text-[10px] text-slate-600">Signature of Data Collector (ಸಮೀಕ್ಷೆಕಾರರ ಸಹಿ)</p>
            </div>
            <div className="text-right">
              <p className="font-bold underline">Faculty Convener / Legal Aid Director</p>
              <p className="text-[10px] text-slate-600">Legal Aid Cell Stamp & Verification</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
