import type { FC } from 'react';
import type { FinalReportData } from '@/features/projects/services/finalReportService';

interface FinalEventReportDocumentProps {
  data: FinalReportData;
  forPdfExport?: boolean;
}

export const FinalEventReportDocument: FC<FinalEventReportDocumentProps> = ({
  data,
  forPdfExport = false,
}) => {
  // Split photos into chunks of 2 for clean institutional A4 pages (just like the attached PDF)
  const photoPages: (typeof data.photos)[] = [];
  for (let i = 0; i < data.photos.length; i += 2) {
    photoPages.push(data.photos.slice(i, i + 2));
  }

  const pageContainerClass = forPdfExport
    ? 'report-page bg-white mx-auto border border-slate-300 flex flex-col justify-between'
    : 'report-page bg-white w-full max-w-full sm:max-w-[210mm] sm:min-h-[297mm] mx-auto p-3.5 sm:p-12 md:p-16 mb-6 sm:mb-8 shadow-md sm:shadow-xl border border-slate-300 flex flex-col justify-between print:shadow-none print:border-none print:m-0 print:p-12 print:w-[210mm] print:min-h-[297mm] print:break-after-page';

  const pageContainerStyle = forPdfExport
    ? {
        width: '794px',
        minHeight: '1123px',
        padding: '48px 44px',
        boxSizing: 'border-box' as const,
        marginBottom: '0px',
      }
    : undefined;

  // Common Institutional Masthead on TOP of every page
  const renderMasthead = () => (
    <div
      className={`flex items-center justify-between border-b-2 border-slate-800 ${
        forPdfExport ? 'pb-3 mb-6' : 'pb-2 sm:pb-3 mb-4 sm:mb-8'
      } gap-2`}
    >
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <img
          src="/reva-logo.png"
          alt="REVA University Logo"
          className={`${
            forPdfExport ? 'h-14' : 'h-8 sm:h-12 md:h-14'
          } w-auto object-contain shrink-0`}
        />
        <div className="min-w-0">
          <h2
            className={`${
              forPdfExport
                ? 'text-lg font-black'
                : 'text-[11px] sm:text-base md:text-lg font-black'
            } tracking-tight text-slate-900 uppercase leading-tight truncate`}
          >
            REVA UNIVERSITY
          </h2>
          <p
            className={`${
              forPdfExport
                ? 'text-xs font-semibold'
                : 'text-[8px] sm:text-[11px] font-semibold'
            } text-slate-600 tracking-wide mt-0.5 truncate`}
          >
            School of Legal Studies • Legal Aid & Community Outreach
          </p>
        </div>
      </div>
      <div className="flex items-center shrink-0">
        <span
          className={`${
            forPdfExport
              ? 'text-xs px-3 py-1 rounded-xl'
              : 'text-[9px] sm:text-xs px-1.5 sm:px-3 py-0.5 sm:py-1 rounded sm:rounded-xl'
          } font-black text-indigo-900 bg-indigo-50 border border-indigo-200 shadow-2xs`}
        >
          CivicForgeLabs
        </span>
      </div>
    </div>
  );

  return (
    <div
      className={`final-report-root font-serif text-slate-900 leading-relaxed print:m-0 print:p-0 ${
        forPdfExport ? 'w-[794px]' : ''
      }`}
    >
      {/* ──────────────────────────────────────────────────────────
          PAGE 1: INSTITUTIONAL TITLE / COVER PAGE
          ────────────────────────────────────────────────────────── */}
      <div className={pageContainerClass} style={pageContainerStyle}>
        <div>
          {renderMasthead()}

          {/* Institutional Boxed Event Identity Blocks */}
          <div className="my-6 sm:my-16 border-2 border-slate-300 divide-y-2 divide-slate-300">
            {/* Box 1: Name of Event */}
            <div className="p-4 sm:p-8 text-center space-y-2 sm:space-y-4">
              <h3 className="text-base sm:text-xl md:text-2xl font-bold uppercase tracking-wider text-slate-900 font-sans">
                NAME OF EVENT –
              </h3>
              <p className="text-sm sm:text-base md:text-lg font-bold text-slate-800 leading-snug px-2 sm:px-4">
                {data.eventName}
              </p>
            </div>

            {/* Box 2: Date of Event */}
            <div className="p-4 sm:p-8 text-center space-y-2 sm:space-y-4">
              <h3 className="text-base sm:text-xl md:text-2xl font-bold uppercase tracking-wider text-slate-900 font-sans">
                DATE OF EVENT –
              </h3>
              <p className="text-sm sm:text-base md:text-lg font-bold text-slate-800">
                {data.dateOfEvent}
              </p>
            </div>

            {/* Box 3: Venue */}
            <div className="p-4 sm:p-8 text-center space-y-2 sm:space-y-4">
              <h3 className="text-base sm:text-xl md:text-2xl font-bold uppercase tracking-wider text-slate-900 font-sans">
                VENUE –
              </h3>
              <p className="text-sm sm:text-base md:text-lg font-bold text-slate-800">
                {data.venue}
              </p>
            </div>
          </div>
        </div>

        {/* Institutional Footer */}
        <div className="pt-3 sm:pt-4 border-t border-slate-300 flex items-center justify-between text-[10px] sm:text-[11px] font-sans text-slate-500">
          <span className="truncate">School of Legal Studies, REVA</span>
          <span className="hidden sm:inline">CivicForgeLabs Legal Aid Platform</span>
          <span>Cover Page</span>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────
          PAGE 2 & 3: EVENT REPORT TABLE
          ────────────────────────────────────────────────────────── */}
      <div className={pageContainerClass} style={pageContainerStyle}>
        <div>
          {renderMasthead()}

          {/* Table Container */}
          <div className="border border-slate-400 overflow-hidden font-sans">
            {/* Table Header Row */}
            <div className="bg-slate-50 border-b border-slate-400 py-2 sm:py-3 text-center">
              <h2 className="text-sm sm:text-xl font-black uppercase tracking-wider text-slate-900 font-serif">
                EVENT REPORT
              </h2>
            </div>

            {/* Rows */}
            <div className="divide-y divide-slate-400 text-[11px] sm:text-xs md:text-sm">
              {/* Name of Event */}
              <div className="grid grid-cols-12 divide-x divide-slate-400">
                <div className="col-span-5 sm:col-span-4 p-2 sm:p-3 font-bold bg-slate-50 text-slate-900 break-words">
                  Name of Event
                </div>
                <div className="col-span-7 sm:col-span-8 p-2 sm:p-3 text-slate-800 font-medium break-words overflow-hidden">
                  {data.eventName}
                </div>
              </div>

              {/* Date of Event */}
              <div className="grid grid-cols-12 divide-x divide-slate-400">
                <div className="col-span-5 sm:col-span-4 p-2 sm:p-3 font-bold bg-slate-50 text-slate-900 break-words">
                  Date of Event
                </div>
                <div className="col-span-7 sm:col-span-8 p-2 sm:p-3 text-slate-800 font-medium break-words overflow-hidden">
                  {data.dateOfEvent}
                </div>
              </div>

              {/* Organized in collaboration with */}
              <div className="grid grid-cols-12 divide-x divide-slate-400">
                <div className="col-span-5 sm:col-span-4 p-2 sm:p-3 font-bold bg-slate-50 text-slate-900 break-words">
                  Organized in collaboration with:
                </div>
                <div className="col-span-7 sm:col-span-8 p-2 sm:p-3 text-slate-800 font-medium break-words overflow-hidden">
                  {data.collaborators || <span className="text-slate-400 italic">Not specified</span>}
                </div>
              </div>

              {/* Organized by */}
              <div className="grid grid-cols-12 divide-x divide-slate-400">
                <div className="col-span-5 sm:col-span-4 p-2 sm:p-3 font-bold bg-slate-50 text-slate-900 break-words">
                  Organized by:
                </div>
                <div className="col-span-7 sm:col-span-8 p-2 sm:p-3 text-slate-800 font-medium break-words overflow-hidden">
                  {data.organizedBy}
                </div>
              </div>

              {/* Total Students Participated (Deduplicated) */}
              <div className="grid grid-cols-12 divide-x divide-slate-400">
                <div className="col-span-5 sm:col-span-4 p-2 sm:p-3 font-bold bg-slate-50 text-slate-900 break-words">
                  Total Students Participated:
                </div>
                <div className="col-span-7 sm:col-span-8 p-2 sm:p-3 text-slate-800 font-semibold break-words overflow-hidden">
                  <span className="text-indigo-950 font-bold">
                    {data.totalUniqueStudents} Students
                  </span>{' '}
                  <span className="text-[10px] sm:text-[11px] text-slate-500 font-normal block sm:inline mt-0.5 sm:mt-0">
                    (Unique attendees verified across Survey and Camp phases without duplication)
                  </span>
                </div>
              </div>

              {/* Overall Budget */}
              <div className="grid grid-cols-12 divide-x divide-slate-400">
                <div className="col-span-5 sm:col-span-4 p-2 sm:p-3 font-bold bg-slate-50 text-slate-900 break-words">
                  Overall Project Budget:
                </div>
                <div className="col-span-7 sm:col-span-8 p-2 sm:p-3 text-slate-800 font-medium break-words overflow-hidden">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] sm:text-xs">
                    <span>
                      <strong className="text-slate-900">Allocated:</strong> ₹
                      {data.overallBudget.allocated.toLocaleString()}
                    </span>
                    <span>
                      <strong className="text-slate-900">Spent:</strong> ₹
                      {data.overallBudget.spent.toLocaleString()}
                    </span>
                    <span>
                      <strong className="text-slate-900">Balance:</strong> ₹
                      {data.overallBudget.balance.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Schedule of Event */}
              <div className="grid grid-cols-12 divide-x divide-slate-400">
                <div className="col-span-5 sm:col-span-4 p-2 sm:p-3 font-bold bg-slate-50 text-slate-900 break-words">
                  Schedule of Event
                </div>
                <div className="col-span-7 sm:col-span-8 p-2 sm:p-3 text-slate-800 space-y-1.5 font-medium leading-relaxed break-words overflow-hidden">
                  {data.scheduleItems.filter((i) => i.trim().length > 0).length === 0 ? (
                    <p className="text-[11px] sm:text-xs text-slate-400 italic">No schedule items entered yet.</p>
                  ) : (
                    data.scheduleItems
                      .filter((i) => i.trim().length > 0)
                      .map((item, idx) => (
                        <p key={idx} className="text-[11px] sm:text-xs md:text-[13px]">
                          • {item}
                        </p>
                      ))
                  )}
                </div>
              </div>

              {/* Venue */}
              <div className="grid grid-cols-12 divide-x divide-slate-400">
                <div className="col-span-5 sm:col-span-4 p-2 sm:p-3 font-bold bg-slate-50 text-slate-900 break-words">
                  Venue
                </div>
                <div className="col-span-7 sm:col-span-8 p-2 sm:p-3 text-slate-800 font-medium break-words overflow-hidden">
                  {data.venue}
                </div>
              </div>

              {/* Faculty Convener */}
              <div className="grid grid-cols-12 divide-x divide-slate-400">
                <div className="col-span-5 sm:col-span-4 p-2 sm:p-3 font-bold bg-slate-50 text-slate-900 break-words">
                  Faculty Convener
                </div>
                <div className="col-span-7 sm:col-span-8 p-2 sm:p-3 text-slate-800 font-medium break-words overflow-hidden">
                  {data.facultyConveners || <span className="text-slate-400 italic">Not specified</span>}
                </div>
              </div>

              {/* Student Convener */}
              <div className="grid grid-cols-12 divide-x divide-slate-400">
                <div className="col-span-5 sm:col-span-4 p-2 sm:p-3 font-bold bg-slate-50 text-slate-900 break-words">
                  Student Convener
                </div>
                <div className="col-span-7 sm:col-span-8 p-2 sm:p-3 text-slate-800 font-medium break-words overflow-hidden">
                  {data.studentConveners || <span className="text-slate-400 italic">Not specified</span>}
                </div>
              </div>

              {/* List of Guests Invited */}
              <div className="grid grid-cols-12 divide-x divide-slate-400">
                <div className="col-span-5 sm:col-span-4 p-2 sm:p-3 font-bold bg-slate-50 text-slate-900 break-words">
                  List of Guests Invited
                </div>
                <div className="col-span-7 sm:col-span-8 p-2 sm:p-3 text-slate-800 space-y-1.5 font-medium break-words overflow-hidden">
                  {data.guestsInvited.filter((g) => g.trim().length > 0).length === 0 ? (
                    <p className="text-[11px] sm:text-xs text-slate-400 italic">No guests entered yet.</p>
                  ) : (
                    data.guestsInvited
                      .filter((g) => g.trim().length > 0)
                      .map((guest, idx) => (
                        <p key={idx} className="text-[11px] sm:text-xs md:text-[13px]">
                          • {guest}
                        </p>
                      ))
                  )}
                </div>
              </div>

              {/* Objective of Event */}
              <div className="grid grid-cols-12 divide-x divide-slate-400">
                <div className="col-span-5 sm:col-span-4 p-2 sm:p-3 font-bold bg-slate-50 text-slate-900 break-words">
                  Objective of Event
                </div>
                <div className="col-span-7 sm:col-span-8 p-2 sm:p-3 text-slate-800 font-medium leading-relaxed break-words overflow-hidden">
                  {data.objective || <span className="text-slate-400 italic">No objective entered yet.</span>}
                </div>
              </div>

              {/* Detailed report of Day */}
              <div className="grid grid-cols-12 divide-x divide-slate-400">
                <div className="col-span-5 sm:col-span-4 p-2 sm:p-3 font-bold bg-slate-50 text-slate-900 break-words">
                  Detailed report of Day
                </div>
                <div className="col-span-7 sm:col-span-8 p-2 sm:p-3 text-slate-800 space-y-3 font-medium leading-relaxed font-serif break-words overflow-hidden">
                  {data.detailedReportParagraphs.filter((p) => p.trim().length > 0).length === 0 ? (
                    <p className="text-[11px] sm:text-xs text-slate-400 italic font-sans">No detailed report entered yet.</p>
                  ) : (
                    data.detailedReportParagraphs
                      .filter((p) => p.trim().length > 0)
                      .map((para, idx) => (
                        <p key={idx} className="text-[11px] sm:text-xs md:text-sm whitespace-pre-line text-justify">
                          {para}
                        </p>
                      ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Institutional Footer */}
        <div className="pt-3 sm:pt-4 border-t border-slate-300 flex items-center justify-between text-[10px] sm:text-[11px] font-sans text-slate-500 mt-4 sm:mt-6">
          <span className="truncate">School of Legal Studies, REVA</span>
          <span className="hidden sm:inline">CivicForgeLabs Legal Aid Platform</span>
          <span>Event Report</span>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────
          PAGES 4+: PHOTOGRAPHS
          ────────────────────────────────────────────────────────── */}
      {photoPages.map((pagePhotos, pageIndex) => (
        <div
          key={`photo-page-${pageIndex}`}
          className={pageContainerClass}
          style={pageContainerStyle}
        >
          <div>
            {renderMasthead()}

            {pageIndex === 0 && (
              <h3 className="text-sm sm:text-lg font-bold uppercase tracking-wider text-slate-900 mb-4 sm:mb-6 font-sans border-b border-slate-300 pb-2">
                Photographs
              </h3>
            )}

            {/* Photos Layout */}
            <div className="space-y-4 sm:space-y-6">
              {pagePhotos.map((photo) => (
                <div
                  key={photo.id}
                  className={`mx-auto ${
                    photo.displayWidth === 'half' ? 'max-w-md' : 'w-full'
                  }`}
                  style={{
                    maxWidth: `${photo.scalePercent}%`,
                  }}
                >
                  <div
                    className={`w-full overflow-hidden border border-slate-300 bg-slate-50 shadow-2xs ${
                      photo.aspectRatio === '16:9'
                        ? 'aspect-video'
                        : photo.aspectRatio === '4:3'
                        ? 'aspect-4/3'
                        : photo.aspectRatio === '1:1'
                        ? 'aspect-square'
                        : 'aspect-auto max-h-[380px]'
                    }`}
                  >
                    <img
                      src={photo.url}
                      alt={photo.caption || 'Camp photo'}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {photo.caption && (
                    <p className="text-[10px] sm:text-xs font-sans text-center text-slate-600 italic mt-1.5 sm:mt-2">
                      {photo.caption}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Institutional Footer */}
          <div className="pt-3 sm:pt-4 border-t border-slate-300 flex items-center justify-between text-[10px] sm:text-[11px] font-sans text-slate-500 mt-4 sm:mt-6">
            <span className="truncate">School of Legal Studies, REVA</span>
            <span className="hidden sm:inline">CivicForgeLabs Legal Aid Platform</span>
            <span>Documentation Photos • Part {pageIndex + 1}</span>
          </div>
        </div>
      ))}

      {/* ──────────────────────────────────────────────────────────
          FINAL PAGE: PRESS NOTE
          ────────────────────────────────────────────────────────── */}
      <div className={pageContainerClass} style={pageContainerStyle}>
        <div>
          {renderMasthead()}

          {/* Press Note Table Layout */}
          <div className="border border-slate-400 overflow-hidden font-sans my-4 sm:my-8">
            <div className="grid grid-cols-12 divide-x divide-slate-400 min-h-[160px] sm:min-h-[320px]">
              <div className="col-span-5 sm:col-span-3 p-2.5 sm:p-4 font-bold bg-slate-50 text-slate-900 text-[11px] sm:text-sm break-words">
                Press Note
              </div>
              <div className="col-span-7 sm:col-span-9 p-2.5 sm:p-6 text-slate-800 text-[11px] sm:text-sm leading-relaxed font-serif whitespace-pre-line text-justify break-words">
                {data.pressNote || <span className="text-slate-400 italic font-sans">No press note entered yet.</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Institutional Footer */}
        <div className="pt-3 sm:pt-4 border-t border-slate-300 flex items-center justify-between text-[10px] sm:text-[11px] font-sans text-slate-500">
          <span className="truncate">School of Legal Studies, REVA</span>
          <span className="hidden sm:inline">CivicForgeLabs Legal Aid Platform</span>
          <span>Official Press Release</span>
        </div>
      </div>
    </div>
  );
};
