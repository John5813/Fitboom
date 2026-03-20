import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';

const COMPANY = {
  name: '"FITBOOM" MCHJ',
  stir: '310 551 850',
  address: '100100, Toshkent sh., Yunusobod t.,\n1-mavze, 28-uy',
  phone: '+998 71 200 00 01',
  mxik: '62023390',
  mxikName: "Kompyuter dasturlari va ma'lumotlar bazasi",
  kassaNo: 'VK-20240001',
};

const CREDIT_PRICE_UZS = 15000;

function getTashkentNow(): Date {
  const now = new Date();
  const offsetMs = 5 * 60 * 60 * 1000;
  return new Date(now.getTime() + offsetMs);
}

function formatDate(date: Date): string {
  const d = String(date.getUTCDate()).padStart(2, '0');
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const y = date.getUTCFullYear();
  return `${d}.${m}.${y}`;
}

function formatTime(date: Date): string {
  const h = String(date.getUTCHours()).padStart(2, '0');
  const min = String(date.getUTCMinutes()).padStart(2, '0');
  const s = String(date.getUTCSeconds()).padStart(2, '0');
  return `${h}:${min}:${s}`;
}

function makeFiscalSign(paymentId: string): string {
  let hash = 0;
  for (let i = 0; i < paymentId.length; i++) {
    hash = ((hash << 5) - hash) + paymentId.charCodeAt(i);
    hash |= 0;
  }
  const abs = Math.abs(hash);
  return `${abs.toString().padStart(10, '0').slice(0, 4)} ${abs.toString().padStart(10, '0').slice(4, 8)} ${abs.toString().padStart(10, '0').slice(0, 4)}`;
}

function makeCheckNumber(paymentId: string): string {
  const num = parseInt(paymentId.replace(/\D/g, '').slice(0, 6) || '100001');
  return String(num % 999999 + 100001);
}

export interface ReceiptData {
  paymentId: string;
  userName: string;
  userPhone?: string;
  credits: number;
  totalAmount: number;
  paidAt?: Date;
}

export async function generateFiscalReceiptPDF(data: ReceiptData): Promise<Buffer> {
  const now = data.paidAt ? data.paidAt : getTashkentNow();
  const dateStr = formatDate(now);
  const timeStr = formatTime(now);
  const unitPrice = data.totalAmount > 0 ? Math.round(data.totalAmount / data.credits) : CREDIT_PRICE_UZS;
  const totalStr = data.totalAmount.toLocaleString('uz-UZ') + ' so\'m';
  const unitStr = unitPrice.toLocaleString('uz-UZ') + ' so\'m';
  const fiscalSign = makeFiscalSign(data.paymentId);
  const checkNo = makeCheckNumber(data.paymentId);

  const qrPayload = JSON.stringify({
    t: `${dateStr} ${timeStr}`,
    s: data.totalAmount,
    fn: COMPANY.stir,
    i: checkNo,
    fp: fiscalSign.replace(/\s/g, ''),
    n: 1,
  });
  const qrImageBuffer = await QRCode.toBuffer(qrPayload, {
    type: 'png',
    width: 120,
    margin: 1,
    errorCorrectionLevel: 'M',
  });

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: [226, 700],
      margins: { top: 14, bottom: 14, left: 14, right: 14 },
      autoFirstPage: true,
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const W = 226 - 28;
    const LINE_COLOR = '#cccccc';
    const DARK = '#1a1a1a';
    const MID = '#555555';

    function dLine(y: number) {
      doc.moveTo(14, y).lineTo(14 + W, y).strokeColor(LINE_COLOR).lineWidth(0.5).stroke();
    }

    function row(label: string, value: string, y: number, bold = false) {
      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(7).fillColor(MID).text(label, 14, y, { width: W * 0.55, lineBreak: false });
      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(7).fillColor(DARK).text(value, 14 + W * 0.55, y, { width: W * 0.45, align: 'right', lineBreak: false });
    }

    let y = 14;

    doc.font('Helvetica-Bold').fontSize(11).fillColor(DARK).text('FITBOOM', 14, y, { width: W, align: 'center' });
    y += 15;
    doc.font('Helvetica').fontSize(7).fillColor(MID).text(COMPANY.name, 14, y, { width: W, align: 'center' });
    y += 10;
    doc.font('Helvetica').fontSize(6.5).fillColor(MID).text(`STIR: ${COMPANY.stir}`, 14, y, { width: W, align: 'center' });
    y += 9;
    doc.font('Helvetica').fontSize(6).fillColor(MID).text(COMPANY.address, 14, y, { width: W, align: 'center' });
    y += 16;

    dLine(y);
    y += 6;

    doc.font('Helvetica-Bold').fontSize(8).fillColor(DARK).text('ELEKTRON FISKAL CHEK', 14, y, { width: W, align: 'center' });
    y += 12;

    dLine(y);
    y += 7;

    row('Sana:', dateStr, y);
    y += 10;
    row('Vaqt:', timeStr, y);
    y += 10;
    row('Chek №:', checkNo, y);
    y += 10;
    row('Virtual kassa:', COMPANY.kassaNo, y);
    y += 12;

    dLine(y);
    y += 7;

    doc.font('Helvetica-Bold').fontSize(7).fillColor(DARK).text('XIZMAT (TOVAR)', 14, y, { width: W });
    y += 10;
    doc.font('Helvetica').fontSize(7).fillColor(DARK).text('Elektron kredit xaridi (FitBoom ilovasi)', 14, y, { width: W });
    y += 9;
    doc.font('Helvetica').fontSize(6.5).fillColor(MID).text(`MXIK: ${COMPANY.mxik} — ${COMPANY.mxikName}`, 14, y, { width: W });
    y += 12;

    dLine(y);
    y += 7;

    row('Miqdori (dona):', String(data.credits), y);
    y += 10;
    row('Birlik narxi:', unitStr, y);
    y += 10;
    row('Jami summa:', totalStr, y, true);
    y += 12;

    dLine(y);
    y += 7;

    row("To'lov turi:", "Elektron to'lov", y);
    y += 10;
    row('QQS:', 'QQSsiz', y);
    y += 12;

    dLine(y);
    y += 7;

    doc.font('Helvetica-Bold').fontSize(7).fillColor(DARK).text("MIJOZ MA'LUMOTLARI", 14, y, { width: W });
    y += 10;
    row('Ism:', data.userName || 'Noma\'lum', y);
    y += 10;
    if (data.userPhone) {
      row('Telefon:', data.userPhone, y);
      y += 10;
    }
    y += 2;

    dLine(y);
    y += 7;

    doc.font('Helvetica-Bold').fontSize(7).fillColor(DARK).text('FISKAL MA\'LUMOTLAR', 14, y, { width: W });
    y += 10;
    doc.font('Helvetica').fontSize(6.5).fillColor(MID).text(`Fiskal belgi: ${fiscalSign}`, 14, y, { width: W });
    y += 9;
    doc.font('Helvetica').fontSize(6.5).fillColor(MID).text(`To'lov ID: ${data.paymentId.slice(0, 12).toUpperCase()}`, 14, y, { width: W });
    y += 12;

    dLine(y);
    y += 7;

    doc.font('Helvetica').fontSize(6).fillColor(MID).text(
      '"Soliq" ilovasi orqali skanerlang va 1% keshbek oling:',
      14, y, { width: W, align: 'center' }
    );
    y += 11;

    const qrX = 14 + (W - 70) / 2;
    doc.image(qrImageBuffer, qrX, y, { width: 70, height: 70 });
    y += 75;

    dLine(y);
    y += 7;

    doc.font('Helvetica').fontSize(6).fillColor(MID).text(
      'Ushbu chek FitBoom ilovasi tomonidan yaratildi.\nfitboom.uz | +998 71 200 00 01',
      14, y, { width: W, align: 'center' }
    );
    y += 20;

    doc.end();
  });
}
