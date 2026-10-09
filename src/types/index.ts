export type Role = 'admin' | 'manager' | 'employee';

export type Permission =
  | 'view_products'
  | 'add_products'
  | 'edit_products'
  | 'change_selling_prices'
  | 'view_purchase_costs'
  | 'create_bills'
  | 'apply_discounts'
  | 'view_all_bills'
  | 'view_own_bills'
  | 'edit_draft_bills'
  | 'cancel_finalized_bills'
  | 'initiate_refunds'
  | 'approve_refunds'
  | 'view_stock'
  | 'adjust_stock'
  | 'view_customers'
  | 'manage_customers'
  | 'view_suppliers'
  | 'manage_suppliers'
  | 'create_purchases'
  | 'view_purchases'
  | 'record_payments'
  | 'view_payments'
  | 'view_sales_reports'
  | 'view_profit'
  | 'export_reports'
  | 'manage_employees'
  | 'view_audit_logs'
  | 'manage_settings'
  | 'manage_approvals';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: Role;
  permissions: Permission[];
  status: 'active' | 'inactive';
  employeeCode: string;
  createdAt: string;
  lastLoginAt?: string;
}

export interface UserWithPasswordHash extends User {
  passwordHash: string;
}

export interface SessionUser extends User {
  token: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  brand: string;
  barcode?: string;
  description?: string;
  unit: string; // Pcs, Box, Kg, Mtr, Ltr, Pkts
  stockQuantity: number;
  minStockThreshold: number;
  purchaseCost?: number; // Only exposed if user has view_purchase_costs
  sellingPrice: number;
  wholesalePrice?: number;
  taxRate: number; // e.g. 0, 5, 12, 18, 28
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  city?: string;
  state: string; // Used for GST inter-state check
  pincode?: string;
  gstin?: string;
  type: 'retail' | 'wholesale';
  creditLimit: number;
  outstandingBalance: number;
  status: 'active' | 'inactive';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson?: string;
  phone: string;
  email?: string;
  address?: string;
  city?: string;
  state: string;
  gstin?: string;
  paymentTerms?: string;
  outstandingBalance: number;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceItem {
  productId: string;
  sku: string;
  productName: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  discountType: 'percent' | 'fixed';
  discountValue: number;
  discountAmount: number;
  taxableAmount: number;
  gstRate: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalAmount: number;
}

export type PaymentMethod = 'cash' | 'upi' | 'card' | 'bank_transfer' | 'credit' | 'split';
export type PaymentStatus = 'paid' | 'partial' | 'unpaid';
export type InvoiceStatus = 'finalized' | 'draft' | 'cancelled' | 'refunded';

export interface SplitPaymentDetail {
  method: 'cash' | 'upi' | 'card' | 'bank_transfer';
  amount: number;
  reference?: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  date: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerState: string;
  customerGstin?: string;
  employeeId: string;
  employeeName: string;
  items: InvoiceItem[];
  isInterState: boolean;
  subtotal: number;
  totalDiscount: number;
  totalTaxable: number;
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
  roundOff: number;
  grandTotal: number;
  paymentMethod: PaymentMethod;
  splitDetails?: SplitPaymentDetail[];
  amountReceived: number;
  balanceDue: number;
  changeDue: number;
  paymentStatus: PaymentStatus;
  status: InvoiceStatus;
  notes?: string;
  cancellationReason?: string;
  cancelledAt?: string;
  cancelledBy?: string;
  cancelledByName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentRecord {
  id: string;
  receiptNumber: string;
  invoiceId?: string;
  invoiceNumber?: string;
  customerId?: string;
  customerName?: string;
  supplierId?: string;
  supplierName?: string;
  type: 'customer_sale' | 'customer_due_payment' | 'supplier_payment' | 'refund';
  amount: number;
  paymentMethod: PaymentMethod;
  referenceNumber?: string;
  notes?: string;
  recordedBy: string;
  recordedByName: string;
  date: string;
  createdAt: string;
}

export interface PurchaseItem {
  productId: string;
  sku: string;
  productName: string;
  unit: string;
  quantity: number;
  purchasePrice: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
}

export interface Purchase {
  id: string;
  purchaseNumber: string;
  supplierId: string;
  supplierName: string;
  supplierInvoiceRef: string;
  date: string;
  items: PurchaseItem[];
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  amountPaid: number;
  outstandingBalance: number;
  notes?: string;
  status: 'received' | 'cancelled';
  recordedBy: string;
  recordedByName: string;
  createdAt: string;
}

export type MovementType =
  | 'PURCHASE_RECEIPT'
  | 'SALE_DEDUCTION'
  | 'CUSTOMER_RETURN'
  | 'SUPPLIER_RETURN'
  | 'MANUAL_ADJUSTMENT'
  | 'DAMAGE_WRITEOFF';

export interface InventoryMovement {
  id: string;
  productId: string;
  sku: string;
  productName: string;
  movementType: MovementType;
  quantityChange: number;
  previousStock: number;
  newStock: number;
  referenceDoc: string;
  reason?: string;
  recordedBy: string;
  recordedByName: string;
  timestamp: string;
}

export type ApprovalActionType =
  | 'EXCESSIVE_DISCOUNT'
  | 'PRICE_CHANGE'
  | 'BILL_CANCELLATION'
  | 'REFUND'
  | 'STOCK_ADJUSTMENT'
  | 'CREDIT_LIMIT_OVERRIDE';

export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface ApprovalRequest {
  id: string;
  actionType: ApprovalActionType;
  requestedBy: string;
  requestedByName: string;
  targetEntityId: string;
  targetEntityRef: string;
  requestedValues: Record<string, any>;
  reason: string;
  status: ApprovalStatus;
  reviewedBy?: string;
  reviewedByName?: string;
  reviewedAt?: string;
  reviewComments?: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  action: string;
  entity: string;
  entityId: string;
  details: string;
  timestamp: string;
  ip?: string;
  status: 'SUCCESS' | 'FAILED' | 'REJECTED';
}

export interface BusinessSettings {
  businessName: string;
  tagline: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  email: string;
  gstin: string;
  pan: string;
  invoicePrefix: string;
  invoiceNextNumber: number;
  termsAndConditions: string;
  bankDetails: {
    bankName: string;
    accountNumber: string;
    ifscCode: string;
    branch: string;
    upiId: string;
  };
  currencySymbol: string;
  currencyCode: string;
  discountApprovalThreshold: number; // e.g. 10%
  allowNegativeStock: boolean;
  defaultPrintLayout: 'a4' | 'thermal_80mm';
}

export interface DashboardMetrics {
  todaySales: number;
  todayBillsCount: number;
  totalReceivables: number;
  totalActiveProducts: number;
  lowStockCount: number;
  pendingApprovalsCount: number;
  recentInvoices: Invoice[];
  lowStockProducts: Product[];
  recentMovements: InventoryMovement[];
}
