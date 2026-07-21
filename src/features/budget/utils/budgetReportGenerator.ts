import { jsPDF } from 'jspdf';
import type { Camp, Expense } from '@/types';
import { formatCurrency, formatDate } from '@/utils';

export interface BudgetReportOptions {
  camp: Camp;
  expenses: Expense[];
  allocatedBudget: number;
  totalSpent: number;
  remainingBudget: number;
  categoryTotals: Record<string, number>;
}

/**
 * Generates and triggers download of a standalone PDF Budget Report.
 */
export function generateBudgetReportPDF(options: BudgetReportOptions): void {
  const { camp, expenses, allocatedBudget, totalSpent, remainingBudget, categoryTotals } = options;

  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;

  // Header Banner
  doc.setFillColor(30, 58, 95); // Deep primary Navy #1e3a5f
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('LEGAL AID CAMP PLATFORM', 14, 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Official Budget & Financial Expenditure Statement', 14, 19);

  doc.setFontSize(9);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth - 14, 19, { align: 'right' });

  y = 36;

  // Camp Details Section
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('1. Camp Metadata', 14, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text(`Camp Name: ${camp.camp_name}`, 14, y);
  doc.text(`Date: ${formatDate(camp.camp_date)}`, 120, y);
  y += 5;
  doc.text(`Location: ${camp.village_name}, ${camp.taluk}, ${camp.district}`, 14, y);
  doc.text(`Status: ${camp.status.toUpperCase()}`, 120, y);
  y += 10;

  // Financial Summary Cards
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('2. Financial Summary Overview', 14, y);
  y += 6;

  const colWidth = (pageWidth - 28 - 9) / 4;
  const cards = [
    { label: 'Allocated Budget', val: formatCurrency(allocatedBudget), color: [37, 99, 235] },
    { label: 'Total Spent', val: formatCurrency(totalSpent), color: [225, 29, 72] },
    { label: 'Remaining Balance', val: formatCurrency(remainingBudget), color: remainingBudget >= 0 ? [22, 163, 74] : [220, 38, 38] },
    { label: 'Line Items Count', val: `${expenses.length} Items`, color: [100, 116, 139] },
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

  // Category Breakdown Table
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('3. Category-Wise Expense Totals', 14, y);
  y += 6;

  const categories = Object.keys(categoryTotals);
  if (categories.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    doc.text('No expense categories recorded yet.', 14, y);
    y += 8;
  } else {
    // Header
    doc.setFillColor(241, 245, 249);
    doc.rect(14, y, pageWidth - 28, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text('Category', 18, y + 4.5);
    doc.text('Total Spent', pageWidth - 18, y + 4.5, { align: 'right' });
    y += 7;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);

    categories.forEach((cat) => {
      const amount = categoryTotals[cat];
      doc.text(cat, 18, y + 4);
      doc.text(formatCurrency(amount), pageWidth - 18, y + 4, { align: 'right' });
      doc.setDrawColor(241, 245, 249);
      doc.line(14, y + 6, pageWidth - 14, y + 6);
      y += 7;
    });
    y += 4;
  }

  // Line-Item Expense Table Header
  if (y > 220) {
    doc.addPage();
    y = 20;
  }

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('4. Detailed Expense Line Items', 14, y);
  y += 6;

  // Table Headers
  doc.setFillColor(30, 58, 95);
  doc.rect(14, y, pageWidth - 28, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);

  doc.text('Date', 17, y + 4.5);
  doc.text('Category', 38, y + 4.5);
  doc.text('Description / Remarks', 75, y + 4.5);
  doc.text('Unit Cost', 135, y + 4.5, { align: 'right' });
  doc.text('Qty', 155, y + 4.5, { align: 'right' });
  doc.text('Total', pageWidth - 17, y + 4.5, { align: 'right' });

  y += 8;

  if (expenses.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    doc.text('No expense entries recorded for this camp.', 14, y + 4);
  } else {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);

    expenses.forEach((item, i) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }

      if (i % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(14, y - 2, pageWidth - 28, 7, 'F');
      }

      const dateStr = item.expense_date ? formatDate(item.expense_date) : formatDate(item.created_at);
      const descStr = (item.description || item.remarks || '—').substring(0, 32);

      doc.text(dateStr, 17, y + 2.5);
      doc.text((item.category || 'Misc').substring(0, 18), 38, y + 2.5);
      doc.text(descStr, 75, y + 2.5);
      doc.text(formatCurrency(item.unit_cost), 135, y + 2.5, { align: 'right' });
      doc.text(String(item.quantity), 155, y + 2.5, { align: 'right' });
      doc.text(formatCurrency(item.total_amount), pageWidth - 17, y + 2.5, { align: 'right' });

      y += 7;
    });
  }

  // Footer / Sign-off
  if (y > 250) {
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
  const sanitizeName = camp.camp_name.replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`Budget_Report_${sanitizeName}.pdf`);
}
