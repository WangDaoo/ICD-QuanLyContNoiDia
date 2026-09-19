import { Injectable, Logger } from '@nestjs/common';
import PDFDocument from 'pdfkit';

export interface InvoicePdfData {
  invoiceNumber: string;
  customerName: string;
  customerTaxCode?: string;
  customerAddress?: string;
  currency: string;
  subtotalAmount: number | string;
  vatAmount: number | string;
  totalAmount: number | string;
  status: string;
  issueDate: Date | string;
  dueDate?: Date | string;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number | string;
    amount: number | string;
  }>;
}

@Injectable()
export class InvoicePdfService {
  private readonly logger = new Logger(InvoicePdfService.name);

  async generateInvoicePdf(invoice: InvoicePdfData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 40, size: 'A4' });
        const buffers: Buffer[] = [];

        doc.on('data', (chunk) => buffers.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', (err) => reject(err));

        // Header
        doc
          .fontSize(20)
          .text('ICD MANAGEMENT SYSTEM', { align: 'center' })
          .moveDown(0.5);

        doc
          .fontSize(16)
          .text('TAX INVOICE / HOÁ ĐƠN DỊCH VỤ', { align: 'center' })
          .moveDown(1);

        // Invoice Meta
        doc.fontSize(10);
        doc.text(`Invoice No: ${invoice.invoiceNumber}`, { align: 'right' });
        doc.text(
          `Date: ${new Date(invoice.issueDate).toISOString().slice(0, 10)}`,
          { align: 'right' },
        );
        doc.text(`Status: ${invoice.status}`, { align: 'right' });
        doc.moveDown(1);

        // Customer Info
        doc.fontSize(11).text('Customer Information:', { underline: true });
        doc.fontSize(10).text(`Customer: ${invoice.customerName}`);
        if (invoice.customerTaxCode) {
          doc.text(`Tax Code: ${invoice.customerTaxCode}`);
        }
        if (invoice.customerAddress) {
          doc.text(`Address: ${invoice.customerAddress}`);
        }
        doc.moveDown(1);

        // Table Header
        const startY = doc.y;
        doc.rect(40, startY, 515, 20).fill('#f0f0f0');
        doc.fillColor('#000000');
        doc.fontSize(10).text('Description', 50, startY + 5);
        doc.text('Qty', 320, startY + 5);
        doc.text('Unit Price', 380, startY + 5);
        doc.text(`Amount (${invoice.currency})`, 460, startY + 5);

        let currentY = startY + 25;

        // Line Items
        for (const item of invoice.items) {
          doc.text(item.description, 50, currentY, { width: 260 });
          doc.text(item.quantity.toString(), 320, currentY);
          doc.text(Number(item.unitPrice).toLocaleString('en-US'), 380, currentY);
          doc.text(Number(item.amount).toLocaleString('en-US'), 460, currentY);
          currentY += 20;
        }

        // Summary
        doc.moveTo(40, currentY).lineTo(555, currentY).stroke();
        currentY += 10;

        doc.text(`Subtotal:`, 380, currentY);
        doc.text(
          `${Number(invoice.subtotalAmount).toLocaleString('en-US')} ${invoice.currency}`,
          460,
          currentY,
        );
        currentY += 15;

        doc.text(`VAT:`, 380, currentY);
        doc.text(
          `${Number(invoice.vatAmount).toLocaleString('en-US')} ${invoice.currency}`,
          460,
          currentY,
        );
        currentY += 15;

        doc.fontSize(11).font('Helvetica-Bold');
        doc.text(`Total:`, 380, currentY);
        doc.text(
          `${Number(invoice.totalAmount).toLocaleString('en-US')} ${invoice.currency}`,
          460,
          currentY,
        );

        // Footer
        doc.moveDown(4);
        doc
          .fontSize(9)
          .font('Helvetica')
          .text(
            'This is a computer-generated document. No signature required.',
            40,
            750,
            { align: 'center', width: 515 },
          );

        doc.end();
      } catch (err) {
        this.logger.error(`Error generating invoice PDF: ${err}`);
        reject(err);
      }
    });
  }
}
