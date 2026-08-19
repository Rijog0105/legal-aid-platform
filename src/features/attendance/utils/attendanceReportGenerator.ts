import { jsPDF } from 'jspdf';

export interface AttendanceReportAttendee {
  user_id: string;
  name: string;
  role: string;
  check_in_time: string | null;
  distance: number | null;
  gps_status: 'Within Radius' | 'Outside Radius' | 'No GPS' | 'Pending';
  status: 'present' | 'rejected' | 'pending';
  rejection_reason: string | null;
  usn_employee_id?: string | null;
  category?: string | null;
}

export interface AttendanceReportOptions {
  projectName: string;
  phase: 'survey' | 'camp';
  sessionType: 'check_in' | 'check_out';
  startsAt: string;
  expiresAt: string;
  radiusMeters: number;
  facultyCoords: { latitude: number; longitude: number };
  attendees: AttendanceReportAttendee[];
}

/**
 * Generates and triggers download of a standalone PDF Attendance Verification Report.
 */
export function generateAttendanceReportPDF(options: AttendanceReportOptions): void {
  const {
    projectName,
    phase,
    sessionType,
    startsAt,
    expiresAt,
    radiusMeters,
    facultyCoords,
    attendees,
  } = options;

  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;

  // 1. Header Banner
  doc.setFillColor(30, 58, 95); // Deep Navy
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('LEGAL AID CAMP PLATFORM', 14, 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Official Attendance Verification Statement', 14, 19);

  doc.setFontSize(9);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth - 14, 19, { align: 'right' });

  y = 36;

  // 2. Session Metadata Section
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('1. Session Metadata', 14, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text(`Project Name: ${projectName}`, 14, y);
  doc.text(`Phase: ${phase === 'survey' ? 'Survey Phase' : 'Camp Phase'}`, 120, y);
  y += 5;
  doc.text(`Session Type: ${sessionType === 'check_in' ? 'Check-In' : 'Check-Out'}`, 14, y);
  doc.text(`Window: ${new Date(startsAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} - ${new Date(expiresAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`, 120, y);
  y += 5;
  doc.text(`Geofence Radius: ${radiusMeters} meters`, 14, y);
  doc.text(`Faculty Coords: ${facultyCoords.latitude.toFixed(6)}, ${facultyCoords.longitude.toFixed(6)}`, 120, y);
  y += 10;

  // 3. Stats Summary Cards
  const presentCount = attendees.filter(a => a.status === 'present').length;
  const rejectedCount = attendees.filter(a => a.status === 'rejected').length;
  const absentCount = attendees.filter(a => a.status === 'pending').length;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('2. Attendance Verification Summary', 14, y);
  y += 6;

  const colWidth = (pageWidth - 28 - 9) / 4;
  const cards = [
    { label: 'Total Assigned', val: `${attendees.length} Members`, color: [30, 58, 95] },
    { label: 'Present / Verified', val: `${presentCount} Present`, color: [22, 163, 74] },
    { label: 'Absent / Pending', val: `${absentCount} Absent`, color: [100, 116, 139] },
    { label: 'Rejected (Outside)', val: `${rejectedCount} Rejected`, color: [220, 38, 38] },
  ];

  cards.forEach((card, idx) => {
    const cx = 14 + idx * (colWidth + 3);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(cx, y, colWidth, 18, 2, 2, 'FD');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(card.label, cx + 4, y + 6);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(card.color[0], card.color[1], card.color[2]);
    doc.text(card.val, cx + 4, y + 13);
  });

  y += 24;

  // 4. Detailed Attendee List
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('3. Detailed Roster & Logs', 14, y);
  y += 6;

  // Table Headers
  doc.setFillColor(30, 58, 95);
  doc.rect(14, y, pageWidth - 28, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);

  doc.text('S.No.', 16, y + 4.5);
  doc.text('Attendee Name / Student SRN', 28, y + 4.5);
  doc.text('Roster Role', 90, y + 4.5);
  doc.text('Time Logged', 115, y + 4.5);
  doc.text('Distance', 140, y + 4.5);
  doc.text('GPS Status', 160, y + 4.5);
  doc.text('Status', pageWidth - 16, y + 4.5, { align: 'right' });

  y += 8;

  if (attendees.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    doc.text('No roster members registered for this project.', 14, y + 4);
  } else {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);

    attendees.forEach((item, idx) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }

      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(14, y - 2, pageWidth - 28, 7, 'F');
      }

      const serialStr = `${idx + 1}`;
      const nameStr = item.name;
      const srnStr = item.category === 'student' && item.usn_employee_id ? `SRN: ${item.usn_employee_id.replace(/^SRN:\s*/i, '')}` : '';
      const timeStr = item.check_in_time
        ? new Date(item.check_in_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        : '—';
      const distStr = item.distance !== null ? `${item.distance} m` : '—';
      const gpsStr = item.gps_status;
      const statusStr = item.status === 'present' ? 'Present' : item.status === 'rejected' ? 'Rejected' : 'Absent';

      // S.No
      doc.setFont('helvetica', 'normal');
      doc.text(serialStr, 16, y + 2.5);

      // Name & SRN stacked or inline
      doc.setFont('helvetica', 'bold');
      doc.text(nameStr, 28, y + 1.5);
      if (srnStr) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139);
        doc.text(srnStr, 28, y + 4.5);
        doc.setFontSize(8);
        doc.setTextColor(30, 41, 59);
      } else {
        // center simple text vertically if no SRN
        doc.setFont('helvetica', 'normal');
        doc.text('—', 28, y + 4.5);
      }

      // Role
      doc.setFont('helvetica', 'normal');
      doc.text(item.role, 90, y + 2.5);

      // Time
      doc.text(timeStr, 115, y + 2.5);

      // Distance
      doc.text(distStr, 140, y + 2.5);

      // GPS
      doc.text(gpsStr, 160, y + 2.5);

      // Status
      if (item.status === 'present') {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(22, 163, 74); // green
      } else if (item.status === 'rejected') {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(220, 38, 38); // red
      } else {
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139); // slate
      }
      doc.text(statusStr, pageWidth - 16, y + 2.5, { align: 'right' });
      doc.setTextColor(30, 41, 59);

      y += 8;
    });
  }

  // 5. Signature Footer
  if (y > 255) {
    doc.addPage();
    y = 20;
  } else {
    y += 15;
  }

  doc.setDrawColor(203, 213, 225);
  doc.line(14, y, pageWidth - 14, y);
  y += 8;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Faculty Coordinator Signature', 14, y);
  doc.text('Student Team Lead Signature', pageWidth - 14, y, { align: 'right' });

  // Save PDF file
  const sanitizeName = projectName.replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`Attendance_Report_${sanitizeName}_${sessionType}.pdf`);
}
