/**
 * FR-09 Certificate of Appreciation and FR-15 printable monthly report.
 * PDFKit writes straight to a file under certificates/ or reports/.
 */
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const BRAND = '#96122A';
const INK = '#1A1714';
const MUTED = '#6B635A';

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function peso(n) {
  return '₱' + Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 });
}

/** FR-09 — one page, landscape, ready to print. */
function certificate(volunteer, cert, outDir) {
  const dir = ensureDir(outDir || path.join(__dirname, '..', 'certificates'));
  const file = path.join(dir, 'certificate-' + volunteer._id + '-' + cert._id + '.pdf');
  const doc = new PDFDocument({ size: 'LETTER', layout: 'landscape', margin: 54 });
  doc.pipe(fs.createWriteStream(file));

  const w = doc.page.width - 108;
  doc.rect(27, 27, doc.page.width - 54, doc.page.height - 54).lineWidth(2).stroke(BRAND);

  doc.fillColor(BRAND).fontSize(13).text('BAHAY PAG-IBIG', 54, 70, { width: w, align: 'center' });
  doc.fillColor(MUTED).fontSize(10)
     .text('Home for the Aged · Archdiocese of San Fernando, Pampanga',
           54, 90, { width: w, align: 'center' });

  doc.fillColor(INK).fontSize(32)
     .text('Certificate of Appreciation', 54, 140, { width: w, align: 'center' });

  doc.fillColor(MUTED).fontSize(12)
     .text('is presented to', 54, 196, { width: w, align: 'center' });

  doc.fillColor(BRAND).fontSize(26)
     .text(volunteer.full_name, 54, 222, { width: w, align: 'center' });

  const start = new Date(cert.service_start).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' });
  const end = new Date(cert.service_end).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' });

  doc.fillColor(INK).fontSize(12).text(
    'in grateful recognition of ' + cert.total_hours + ' hours of volunteer service in ' +
    (cert.activity || 'service to our residents') + ', rendered from ' + start + ' to ' + end + '.',
    110, 272, { width: w - 112, align: 'center', lineGap: 4 });

  const y = doc.page.height - 130;
  doc.moveTo(110, y).lineTo(320, y).lineWidth(1).stroke(MUTED);
  doc.fillColor(MUTED).fontSize(9).text('Authorized Signature', 110, y + 8, { width: 210, align: 'center' });
  doc.moveTo(doc.page.width - 320, y).lineTo(doc.page.width - 110, y).stroke(MUTED);
  doc.text('Date Issued: ' + new Date(cert.date_issued).toLocaleDateString('en-PH'),
           doc.page.width - 320, y + 8, { width: 210, align: 'center' });

  doc.end();
  return file;
}

/** FR-15 — monthly operational report. */
function monthlyReport(report, detail, outDir) {
  const dir = ensureDir(outDir || path.join(__dirname, '..', 'reports'));
  const file = path.join(dir, 'monthly-report-' + report.report_month + '.pdf');
  const doc = new PDFDocument({ size: 'LETTER', margin: 54 });
  doc.pipe(fs.createWriteStream(file));
  const w = doc.page.width - 108;

  doc.fillColor(BRAND).fontSize(11).text('BAHAY PAG-IBIG', { width: w });
  doc.fillColor(INK).fontSize(22).text('Monthly Operational Report', { width: w });
  doc.fillColor(MUTED).fontSize(11).text('Reporting period: ' + report.report_month, { width: w });
  doc.moveDown(1);
  doc.moveTo(54, doc.y).lineTo(54 + w, doc.y).lineWidth(1).stroke('#E0D7C9');
  doc.moveDown(1);

  const rows = [
    ['Total monetary donations', peso(report.total_monetary_donations)],
    ['In-kind donation records', String(report.total_inkind_donations)],
    ['Volunteer hours rendered', String(report.total_volunteer_hours)],
    ['Events held', String(report.total_events)],
  ];
  doc.fontSize(12);
  rows.forEach(([label, value]) => {
    const y = doc.y;
    doc.fillColor(MUTED).text(label, 54, y, { width: w * 0.6 });
    doc.fillColor(INK).text(value, 54 + w * 0.6, y, { width: w * 0.4, align: 'right' });
    doc.moveDown(0.6);
  });

  if (detail && detail.donations && detail.donations.length) {
    doc.moveDown(1).fillColor(INK).fontSize(14).text('Donations recorded', { width: w });
    doc.moveDown(0.4).fontSize(10);
    detail.donations.slice(0, 40).forEach(d => {
      const when = new Date(d.date_donated).toLocaleDateString('en-PH');
      const what = d.donation_type === 'Monetary'
        ? peso(d.amount)
        : (d.item_description || 'In-kind') + ' × ' + (d.quantity || 1);
      doc.fillColor(MUTED).text(
        when + '  ·  ' + (d.donor_name || 'Anonymous') + '  ·  ' + what +
        (d.reference_number ? '  ·  Ref ' + d.reference_number : ''),
        { width: w });
    });
  }

  doc.moveDown(2).fillColor(MUTED).fontSize(9)
     .text('Generated ' + new Date(report.generated_at).toLocaleString('en-PH') +
           ' by the Bahay Pag-ibig Operations Management System.', { width: w });

  doc.end();
  return file;
}

module.exports = { certificate, monthlyReport, peso };
