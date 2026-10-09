import React, { useState } from 'react';
import { Invoice, BusinessSettings } from '../../types/index.ts';
import { formatCurrency, formatDate, amountInWords } from '../../utils/format.ts';
import { Printer, X, FileText, CheckCircle2 } from 'lucide-react';

interface InvoicePrintModalProps {
  invoice: Invoice;
  settings: BusinessSettings;
  onClose: () => void;
}

export const InvoicePrintModal: React.FC<InvoicePrintModalProps> = ({
  invoice,
  settings,
  onClose,
}) => {
  const [layout, setLayout] = useState<'a4' | 'thermal'>(settings.defaultPrintLayout === 'thermal_80mm' ? 'thermal' : 'a4');

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs overflow-y-auto">
      {/* Controls Bar */}
      <div className="w-full max-w-4xl rounded-xl bg-white shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        <div className="flex items-center justify-between border-b border-gray-200 bg-slate-50 px-6 py-3.5 print:hidden">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            <h3 className="text-sm font-bold text-gray-800">
              Tax Invoice — {invoice.invoiceNumber}
            </h3>
          </div>

          <div className="flex items-center gap-3">
            {/* Layout switch */}
            <div className="flex rounded-lg border border-gray-300 bg-white p-0.5 text-xs">
              <button
                onClick={() => setLayout('a4')}
                className={`rounded-md px-3 py-1 font-medium transition ${
                  layout === 'a4' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                A4 Standard
              </button>
              <button
                onClick={() => setLayout('thermal')}
                className={`rounded-md px-3 py-1 font-medium transition ${
                  layout === 'thermal' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Thermal (80mm)
              </button>
            </div>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition"
            >
              <Printer className="h-4 w-4" />
              <span>Print Invoice</span>
            </button>

            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-200 hover:text-gray-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Printable Content Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-100 flex justify-center print:bg-white print:p-0">
          {layout === 'a4' ? (
            /* A4 TAX INVOICE */
            <div
              id="printable-tax-invoice"
              className="w-full max-w-[800px] bg-white p-8 border border-gray-200 shadow-sm print:border-none print:shadow-none print:p-4 text-[#1F2937]"
            >
              {/* Header */}
              <div className="flex justify-between items-start border-b-2 border-slate-800 pb-4 mb-4">
                <div>
                  <h1 className="text-xl font-extrabold uppercase text-slate-900 tracking-tight">
                    {settings.businessName}
                  </h1>
                  <p className="text-xs text-gray-600">{settings.tagline}</p>
                  <p className="text-xs text-gray-600 mt-1 max-w-sm">
                    {settings.address}, {settings.city}, {settings.state} - {settings.pincode}
                  </p>
                  <p className="text-xs text-gray-600">
                    Phone: {settings.phone} | Email: {settings.email}
                  </p>
                  <p className="text-xs font-bold text-gray-800 mt-1">
                    GSTIN: {settings.gstin} | PAN: {settings.pan}
                  </p>
                </div>

                <div className="text-right">
                  <span className="inline-block rounded-md bg-slate-900 px-3 py-1 text-xs font-bold text-white uppercase tracking-wider mb-2">
                    TAX INVOICE
                  </span>
                  <div className="text-xs space-y-0.5 text-gray-700">
                    <p>
                      <span className="font-semibold">Invoice No:</span>{' '}
                      <span className="font-mono font-bold text-slate-900">{invoice.invoiceNumber}</span>
                    </p>
                    <p>
                      <span className="font-semibold">Date:</span> {formatDate(invoice.date)}
                    </p>
                    <p>
                      <span className="font-semibold">Billed By:</span> {invoice.employeeName}
                    </p>
                    <p>
                      <span className="font-semibold">Status:</span>{' '}
                      <span className="uppercase font-bold text-emerald-700">{invoice.status}</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Bill To & Dispatch */}
              <div className="grid grid-cols-2 gap-4 border border-gray-200 rounded-lg p-3 mb-4 bg-slate-50/50 text-xs">
                <div>
                  <p className="text-[11px] font-bold uppercase text-gray-500 mb-1">Billed To (Customer):</p>
                  <p className="font-bold text-gray-900 text-sm">{invoice.customerName}</p>
                  <p className="text-gray-600">Phone: {invoice.customerPhone}</p>
                  <p className="text-gray-600">State: {invoice.customerState}</p>
                  {invoice.customerGstin && (
                    <p className="font-semibold text-gray-800">GSTIN: {invoice.customerGstin}</p>
                  )}
                </div>
                <div className="border-l border-gray-200 pl-4">
                  <p className="text-[11px] font-bold uppercase text-gray-500 mb-1">Place of Supply:</p>
                  <p className="font-semibold text-gray-800">
                    {invoice.isInterState ? `Inter-State (${invoice.customerState} - IGST Applicable)` : `Intra-State (${invoice.customerState} - CGST + SGST)`}
                  </p>
                  <p className="text-gray-600 mt-1">Payment Method: <span className="uppercase font-semibold">{invoice.paymentMethod}</span></p>
                  <p className="text-gray-600">Payment Status: <span className="font-bold text-emerald-700 uppercase">{invoice.paymentStatus}</span></p>
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full text-left text-xs mb-4 border border-gray-200 border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 border-b border-gray-200 font-semibold">
                    <th className="p-2 border-r border-gray-200 w-8 text-center">#</th>
                    <th className="p-2 border-r border-gray-200">Item Description</th>
                    <th className="p-2 border-r border-gray-200 text-center w-14">Qty</th>
                    <th className="p-2 border-r border-gray-200 text-right w-20">Rate (₹)</th>
                    <th className="p-2 border-r border-gray-200 text-right w-16">Disc</th>
                    <th className="p-2 border-r border-gray-200 text-right w-20">Taxable</th>
                    <th className="p-2 border-r border-gray-200 text-center w-14">GST %</th>
                    <th className="p-2 text-right w-24">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {invoice.items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-2 border-r border-gray-200 text-center text-gray-500">{idx + 1}</td>
                      <td className="p-2 border-r border-gray-200">
                        <div className="font-semibold text-gray-900">{item.productName}</div>
                        <div className="text-[10px] text-gray-500 font-mono">SKU: {item.sku}</div>
                      </td>
                      <td className="p-2 border-r border-gray-200 text-center font-medium">
                        {item.quantity} {item.unit}
                      </td>
                      <td className="p-2 border-r border-gray-200 text-right">{item.unitPrice.toFixed(2)}</td>
                      <td className="p-2 border-r border-gray-200 text-right text-gray-600">
                        {item.discountAmount > 0 ? item.discountAmount.toFixed(2) : '-'}
                      </td>
                      <td className="p-2 border-r border-gray-200 text-right font-medium">
                        {item.taxableAmount.toFixed(2)}
                      </td>
                      <td className="p-2 border-r border-gray-200 text-center font-medium">
                        {item.gstRate}%
                      </td>
                      <td className="p-2 text-right font-bold text-gray-900">{item.totalAmount.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Tax Summary & Totals */}
              <div className="grid grid-cols-2 gap-6 mb-4 text-xs">
                {/* Left: Bank details & Words */}
                <div className="space-y-3">
                  <div className="rounded-lg border border-gray-200 p-2.5 bg-slate-50/70">
                    <p className="font-bold text-gray-800 text-[11px] mb-1">Bank Settlement Details:</p>
                    <p className="text-gray-600">Bank: {settings.bankDetails.bankName}</p>
                    <p className="text-gray-600 font-mono">A/C: {settings.bankDetails.accountNumber}</p>
                    <p className="text-gray-600 font-mono">IFSC: {settings.bankDetails.ifscCode}</p>
                    <p className="text-gray-600">UPI ID: {settings.bankDetails.upiId}</p>
                  </div>

                  <div>
                    <p className="text-[11px] font-semibold text-gray-500 uppercase">Amount in Words:</p>
                    <p className="font-bold text-gray-800 italic">{amountInWords(invoice.grandTotal)}</p>
                  </div>
                </div>

                {/* Right: Calculations */}
                <div className="border border-gray-200 rounded-lg p-3 space-y-1.5 bg-slate-50/30">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal Gross:</span>
                    <span>{formatCurrency(invoice.subtotal)}</span>
                  </div>
                  {invoice.totalDiscount > 0 && (
                    <div className="flex justify-between text-emerald-700">
                      <span>Total Discounts:</span>
                      <span>-{formatCurrency(invoice.totalDiscount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-gray-600">
                    <span>Taxable Value:</span>
                    <span>{formatCurrency(invoice.totalTaxable)}</span>
                  </div>

                  {invoice.isInterState ? (
                    <div className="flex justify-between text-gray-600">
                      <span>IGST (Integrated Tax):</span>
                      <span>{formatCurrency(invoice.totalIgst)}</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between text-gray-600">
                        <span>CGST (Central Tax):</span>
                        <span>{formatCurrency(invoice.totalCgst)}</span>
                      </div>
                      <div className="flex justify-between text-gray-600">
                        <span>SGST (State Tax):</span>
                        <span>{formatCurrency(invoice.totalSgst)}</span>
                      </div>
                    </>
                  )}

                  <div className="flex justify-between text-gray-600">
                    <span>Round Off:</span>
                    <span>{invoice.roundOff >= 0 ? `+₹${invoice.roundOff}` : `-₹${Math.abs(invoice.roundOff)}`}</span>
                  </div>

                  <div className="border-t border-gray-300 pt-2 flex justify-between text-base font-extrabold text-slate-900">
                    <span>Grand Total:</span>
                    <span>{formatCurrency(invoice.grandTotal)}</span>
                  </div>

                  <div className="pt-1 border-t border-gray-200 text-xs flex justify-between text-gray-700">
                    <span>Amount Received:</span>
                    <span className="font-semibold text-emerald-700">{formatCurrency(invoice.amountReceived)}</span>
                  </div>

                  {invoice.balanceDue > 0 && (
                    <div className="flex justify-between text-xs text-red-600 font-bold">
                      <span>Balance Due:</span>
                      <span>{formatCurrency(invoice.balanceDue)}</span>
                    </div>
                  )}

                  {invoice.changeDue > 0 && (
                    <div className="flex justify-between text-xs text-blue-600 font-bold">
                      <span>Change Returned:</span>
                      <span>{formatCurrency(invoice.changeDue)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Terms & Signature */}
              <div className="border-t border-gray-200 pt-3 flex justify-between items-end text-[11px] text-gray-500">
                <div className="max-w-md">
                  <p className="font-semibold text-gray-700">Terms & Conditions:</p>
                  <p className="whitespace-pre-line text-[10px] mt-0.5">{settings.termsAndConditions}</p>
                </div>
                <div className="text-center">
                  <div className="h-12 w-32 border-b border-gray-400 mb-1"></div>
                  <p className="font-semibold text-gray-800">For {settings.businessName}</p>
                  <p className="text-[10px] text-gray-500">Authorized Signatory</p>
                </div>
              </div>
            </div>
          ) : (
            /* THERMAL 80MM RECEIPT */
            <div
              id="printable-thermal-receipt"
              className="w-[320px] bg-white p-4 border border-gray-300 font-mono text-[11px] leading-tight text-black shadow-sm print:border-none print:shadow-none"
            >
              <div className="text-center mb-2">
                <p className="text-sm font-bold uppercase">{settings.businessName}</p>
                <p className="text-[10px]">{settings.address}, {settings.city}</p>
                <p className="text-[10px]">Ph: {settings.phone}</p>
                <p className="text-[10px] font-bold">GSTIN: {settings.gstin}</p>
                <p className="text-xs font-bold border-y border-dashed border-black py-0.5 my-1">
                  CASH / TAX RECEIPT
                </p>
              </div>

              <div className="text-[10px] mb-2 space-y-0.5">
                <div className="flex justify-between">
                  <span>Bill No: {invoice.invoiceNumber}</span>
                  <span>{formatDate(invoice.date)}</span>
                </div>
                <div>Cust: {invoice.customerName}</div>
                <div>Billed By: {invoice.employeeName}</div>
              </div>

              <div className="border-b border-dashed border-black pb-1 mb-1 font-bold flex justify-between text-[10px]">
                <span>Item</span>
                <span>Qty x Rate = Total</span>
              </div>

              <div className="space-y-1.5 border-b border-dashed border-black pb-2 mb-2 text-[10px]">
                {invoice.items.map((item, idx) => (
                  <div key={idx}>
                    <div className="font-bold">{item.productName}</div>
                    <div className="flex justify-between text-gray-700">
                      <span>{item.quantity} {item.unit} @ ₹{item.unitPrice}</span>
                      <span className="font-bold">₹{item.totalAmount}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-0.5 text-[10px] border-b border-dashed border-black pb-1 mb-1">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>₹{invoice.subtotal.toFixed(2)}</span>
                </div>
                {invoice.totalDiscount > 0 && (
                  <div className="flex justify-between">
                    <span>Discount:</span>
                    <span>-₹{invoice.totalDiscount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>GST Total:</span>
                  <span>₹{(invoice.totalCgst + invoice.totalSgst + invoice.totalIgst).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs font-bold pt-0.5">
                  <span>TOTAL:</span>
                  <span>₹{invoice.grandTotal}</span>
                </div>
                <div className="flex justify-between">
                  <span>Paid ({invoice.paymentMethod}):</span>
                  <span>₹{invoice.amountReceived}</span>
                </div>
                {invoice.balanceDue > 0 && (
                  <div className="flex justify-between font-bold">
                    <span>Balance Due:</span>
                    <span>₹{invoice.balanceDue}</span>
                  </div>
                )}
              </div>

              <div className="text-center text-[9px] pt-1 space-y-0.5">
                <p>Thank You For Your Business!</p>
                <p>Goods once sold cannot be returned.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
