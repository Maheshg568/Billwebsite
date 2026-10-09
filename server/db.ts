import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import {
  UserWithPasswordHash,
  Product,
  Customer,
  Supplier,
  Invoice,
  PaymentRecord,
  Purchase,
  InventoryMovement,
  ApprovalRequest,
  AuditLog,
  BusinessSettings,
  Permission,
} from '../src/types/index.ts';

export interface DatabaseSchema {
  users: UserWithPasswordHash[];
  products: Product[];
  customers: Customer[];
  suppliers: Supplier[];
  invoices: Invoice[];
  payments: PaymentRecord[];
  purchases: Purchase[];
  inventoryMovements: InventoryMovement[];
  approvalRequests: ApprovalRequest[];
  auditLogs: AuditLog[];
  settings: BusinessSettings;
}

const DATA_DIR = process.env.VERCEL
  ? '/tmp/data'
  : path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'distributor.json');

const ALL_PERMISSIONS: Permission[] = [
  'view_products',
  'add_products',
  'edit_products',
  'change_selling_prices',
  'view_purchase_costs',
  'create_bills',
  'apply_discounts',
  'view_all_bills',
  'view_own_bills',
  'edit_draft_bills',
  'cancel_finalized_bills',
  'initiate_refunds',
  'approve_refunds',
  'view_stock',
  'adjust_stock',
  'view_customers',
  'manage_customers',
  'view_suppliers',
  'manage_suppliers',
  'create_purchases',
  'view_purchases',
  'record_payments',
  'view_payments',
  'view_sales_reports',
  'view_profit',
  'export_reports',
  'manage_employees',
  'view_audit_logs',
  'manage_settings',
  'manage_approvals',
];

const DEFAULT_EMPLOYEE_PERMISSIONS: Permission[] = [
  'view_products',
  'create_bills',
  'apply_discounts',
  'view_own_bills',
  'view_stock',
  'view_customers',
  'manage_customers',
  'record_payments',
  'view_payments',
];

const DEFAULT_MANAGER_PERMISSIONS: Permission[] = [
  'view_products',
  'add_products',
  'edit_products',
  'create_bills',
  'apply_discounts',
  'view_all_bills',
  'view_own_bills',
  'edit_draft_bills',
  'initiate_refunds',
  'view_stock',
  'adjust_stock',
  'view_customers',
  'manage_customers',
  'view_suppliers',
  'create_purchases',
  'view_purchases',
  'record_payments',
  'view_payments',
  'view_sales_reports',
  'export_reports',
  'manage_approvals',
];

function getInitialData(): DatabaseSchema {
  const salt = bcrypt.genSaltSync(10);
  const adminPasswordHash = bcrypt.hashSync('admin123', salt);
  const managerPasswordHash = bcrypt.hashSync('manager123', salt);
  const staffPasswordHash = bcrypt.hashSync('staff123', salt);

  const initialSettings: BusinessSettings = {
    businessName: 'Apex Distribute Enterprise',
    tagline: 'Authorized Electronics & Appliances Distribution',
    address: 'Plot 42, Midc Industrial Area, Andheri East',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400093',
    phone: '+91 98200 12345',
    email: 'billing@apexdistribute.com',
    gstin: '27AABCA1234F1Z5',
    pan: 'AABCA1234F',
    invoicePrefix: 'APX-26-',
    invoiceNextNumber: 1045,
    termsAndConditions:
      '1. Goods once sold will not be returned unless authorized by management.\n2. Interest @ 18% p.a. will be charged on overdue payments beyond credit period.\n3. All disputes subject to Mumbai jurisdiction.',
    bankDetails: {
      bankName: 'HDFC Bank Ltd',
      accountNumber: '50200012345678',
      ifscCode: 'HDFC0000123',
      branch: 'Andheri East, Mumbai',
      upiId: 'apexdistribute@hdfcbank',
    },
    currencySymbol: '₹',
    currencyCode: 'INR',
    discountApprovalThreshold: 10,
    allowNegativeStock: false,
    defaultPrintLayout: 'a4',
  };

  const initialUsers: UserWithPasswordHash[] = [
    {
      id: 'usr_admin',
      name: 'Vikram Sharma',
      email: 'admin@apexdistribute.com',
      phone: '+91 98200 11111',
      role: 'admin',
      permissions: ALL_PERMISSIONS,
      status: 'active',
      employeeCode: 'EMP-001',
      createdAt: '2026-01-01T09:00:00.000Z',
      passwordHash: adminPasswordHash,
    },
    {
      id: 'usr_mgr',
      name: 'Priya Patel',
      email: 'manager@apexdistribute.com',
      phone: '+91 98200 22222',
      role: 'manager',
      permissions: DEFAULT_MANAGER_PERMISSIONS,
      status: 'active',
      employeeCode: 'EMP-002',
      createdAt: '2026-01-10T10:00:00.000Z',
      passwordHash: managerPasswordHash,
    },
    {
      id: 'usr_emp1',
      name: 'Rahul Verma',
      email: 'rahul@apexdistribute.com',
      phone: '+91 98200 33333',
      role: 'employee',
      permissions: DEFAULT_EMPLOYEE_PERMISSIONS,
      status: 'active',
      employeeCode: 'EMP-003',
      createdAt: '2026-01-15T11:00:00.000Z',
      passwordHash: staffPasswordHash,
    },
  ];

  const initialProducts: Product[] = [
    {
      id: 'prod_1',
      sku: 'SND-SSD-1TB',
      name: 'SanDisk Extreme 1TB Portable NVMe SSD',
      category: 'IT & Storage',
      brand: 'SanDisk',
      barcode: '8901234001',
      description: 'High-speed USB 3.2 Gen 2 type-C external solid state drive',
      unit: 'Pcs',
      stockQuantity: 42,
      minStockThreshold: 10,
      purchaseCost: 7200,
      sellingPrice: 9499,
      wholesalePrice: 8850,
      taxRate: 18,
      status: 'active',
      createdAt: '2026-01-01T10:00:00.000Z',
      updatedAt: '2026-01-01T10:00:00.000Z',
    },
    {
      id: 'prod_2',
      sku: 'LOGI-MXM-3S',
      name: 'Logitech MX Master 3S Wireless Performance Mouse',
      category: 'IT & Accessories',
      brand: 'Logitech',
      barcode: '8901234002',
      description: 'Ergonomic 8K DPI sensor with quiet clicks and dual scroll wheels',
      unit: 'Pcs',
      stockQuantity: 28,
      minStockThreshold: 8,
      purchaseCost: 6500,
      sellingPrice: 8995,
      wholesalePrice: 8200,
      taxRate: 18,
      status: 'active',
      createdAt: '2026-01-01T10:00:00.000Z',
      updatedAt: '2026-01-01T10:00:00.000Z',
    },
    {
      id: 'prod_3',
      sku: 'SONY-WH-1000XM5',
      name: 'Sony WH-1000XM5 Noise-Canceling Wireless Headphones',
      category: 'Audio',
      brand: 'Sony',
      barcode: '8901234003',
      description: 'Industry-leading wireless ANC headphones with 30-hour battery life',
      unit: 'Pcs',
      stockQuantity: 15,
      minStockThreshold: 5,
      purchaseCost: 21500,
      sellingPrice: 28990,
      wholesalePrice: 26500,
      taxRate: 18,
      status: 'active',
      createdAt: '2026-01-01T10:00:00.000Z',
      updatedAt: '2026-01-01T10:00:00.000Z',
    },
    {
      id: 'prod_4',
      sku: 'BOAT-SW-WAVE',
      name: 'boAt Wave Call Smartwatch with Bluetooth Calling',
      category: 'Wearables',
      brand: 'boAt',
      barcode: '8901234004',
      description: '1.69 inch HD display with heart rate and SpO2 tracking',
      unit: 'Pcs',
      stockQuantity: 65,
      minStockThreshold: 15,
      purchaseCost: 1150,
      sellingPrice: 1799,
      wholesalePrice: 1550,
      taxRate: 18,
      status: 'active',
      createdAt: '2026-01-01T10:00:00.000Z',
      updatedAt: '2026-01-01T10:00:00.000Z',
    },
    {
      id: 'prod_5',
      sku: 'MI-PB-20000',
      name: 'Xiaomi 20000mAh Power Bank 3i 18W Fast Charge',
      category: 'Mobile Accessories',
      brand: 'Xiaomi',
      barcode: '8901234005',
      description: 'Triple output ports with dual input micro-USB and Type-C',
      unit: 'Pcs',
      stockQuantity: 8,
      minStockThreshold: 12, // Low stock indicator
      purchaseCost: 1350,
      sellingPrice: 1999,
      wholesalePrice: 1750,
      taxRate: 18,
      status: 'active',
      createdAt: '2026-01-01T10:00:00.000Z',
      updatedAt: '2026-01-01T10:00:00.000Z',
    },
    {
      id: 'prod_6',
      sku: 'ANKER-GAN-65W',
      name: 'Anker Nano II 65W GaN Fast Charger Type-C',
      category: 'Cables & Power',
      brand: 'Anker',
      barcode: '8901234006',
      description: 'Ultra-compact PPS charger for laptops, tablets, and phones',
      unit: 'Pcs',
      stockQuantity: 34,
      minStockThreshold: 10,
      purchaseCost: 2200,
      sellingPrice: 3299,
      wholesalePrice: 2900,
      taxRate: 18,
      status: 'active',
      createdAt: '2026-01-01T10:00:00.000Z',
      updatedAt: '2026-01-01T10:00:00.000Z',
    },
    {
      id: 'prod_7',
      sku: 'DELL-24-IPS',
      name: 'Dell 24-inch Full HD IPS Borderless Monitor (S2421HN)',
      category: 'IT & Displays',
      brand: 'Dell',
      barcode: '8901234007',
      description: '75Hz AMD FreeSync dual HDMI ports with 99% sRGB coverage',
      unit: 'Pcs',
      stockQuantity: 18,
      minStockThreshold: 6,
      purchaseCost: 9100,
      sellingPrice: 11999,
      wholesalePrice: 10900,
      taxRate: 18,
      status: 'active',
      createdAt: '2026-01-01T10:00:00.000Z',
      updatedAt: '2026-01-01T10:00:00.000Z',
    },
    {
      id: 'prod_8',
      sku: 'HP-CART-88A',
      name: 'HP 88A Black Original LaserJet Toner Cartridge',
      category: 'Consumables',
      brand: 'HP',
      barcode: '8901234008',
      description: 'Standard yield 1500 pages laser cartridge for LaserJet P1007/M1213',
      unit: 'Box',
      stockQuantity: 4,
      minStockThreshold: 10, // Critical low stock
      purchaseCost: 3100,
      sellingPrice: 4150,
      wholesalePrice: 3800,
      taxRate: 18,
      status: 'active',
      createdAt: '2026-01-01T10:00:00.000Z',
      updatedAt: '2026-01-01T10:00:00.000Z',
    },
    {
      id: 'prod_9',
      sku: 'SYS-LED-9W',
      name: 'Syska 9W B22 Cool Daylight LED Bulb (Pack of 10)',
      category: 'Electricals',
      brand: 'Syska',
      barcode: '8901234009',
      description: 'Energy-saving 6500K 900 lumen LED bulbs',
      unit: 'Box',
      stockQuantity: 120,
      minStockThreshold: 25,
      purchaseCost: 650,
      sellingPrice: 990,
      wholesalePrice: 850,
      taxRate: 12,
      status: 'active',
      createdAt: '2026-01-01T10:00:00.000Z',
      updatedAt: '2026-01-01T10:00:00.000Z',
    },
    {
      id: 'prod_10',
      sku: 'BELK-SURGE-6',
      name: 'Belkin 6-Socket Essential Surge Protector Extension Strip',
      category: 'Cables & Power',
      brand: 'Belkin',
      barcode: '8901234010',
      description: '2-meter heavy-duty ground wire with 650 Joules spike protection',
      unit: 'Pcs',
      stockQuantity: 50,
      minStockThreshold: 15,
      purchaseCost: 1100,
      sellingPrice: 1699,
      wholesalePrice: 1450,
      taxRate: 18,
      status: 'active',
      createdAt: '2026-01-01T10:00:00.000Z',
      updatedAt: '2026-01-01T10:00:00.000Z',
    },
  ];

  const initialCustomers: Customer[] = [
    {
      id: 'cust_1',
      name: 'Reliance Digital Reseller (Metro Tech)',
      phone: '+91 98201 55551',
      email: 'purchases@metrotech.in',
      address: 'Shop 14, Prime Mall, Linking Road',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400050',
      gstin: '27ABCDE1234F1Z1',
      type: 'wholesale',
      creditLimit: 250000,
      outstandingBalance: 34500,
      status: 'active',
      notes: 'Standard 15-day payment cycle. Trusted wholesale partner.',
      createdAt: '2026-01-05T10:00:00.000Z',
      updatedAt: '2026-01-05T10:00:00.000Z',
    },
    {
      id: 'cust_2',
      name: 'Shree Sai Infotech Solutions',
      phone: '+91 98202 66662',
      email: 'contact@shreesaiinfo.com',
      address: '201 Corporate Tower, Senapati Bapat Marg',
      city: 'Pune',
      state: 'Maharashtra',
      pincode: '411016',
      gstin: '27AABCS9876Q1Z9',
      type: 'wholesale',
      creditLimit: 150000,
      outstandingBalance: 0,
      status: 'active',
      notes: 'Immediate UPI or NEFT settlement customer.',
      createdAt: '2026-01-08T10:00:00.000Z',
      updatedAt: '2026-01-08T10:00:00.000Z',
    },
    {
      id: 'cust_3',
      name: 'Bangalore Computing Hub (Inter-State)',
      phone: '+91 98450 77773',
      email: 'orders@blrhub.in',
      address: '45, Brigade Road, Ashok Nagar',
      city: 'Bengaluru',
      state: 'Karnataka', // Inter-state testing (IGST applies)
      pincode: '560025',
      gstin: '29AAACH5544D1Z2',
      type: 'wholesale',
      creditLimit: 300000,
      outstandingBalance: 52000,
      status: 'active',
      notes: 'Inter-state buyer, Karnataka GSTIN.',
      createdAt: '2026-01-10T10:00:00.000Z',
      updatedAt: '2026-01-10T10:00:00.000Z',
    },
    {
      id: 'cust_4',
      name: 'Amitabh Deshmukh (Retail Walk-in)',
      phone: '+91 98203 88884',
      email: 'amitabh.d@gmail.com',
      address: 'B-402, Green Meadows, Borivali West',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400092',
      type: 'retail',
      creditLimit: 0,
      outstandingBalance: 0,
      status: 'active',
      notes: 'Regular retail customer.',
      createdAt: '2026-01-12T10:00:00.000Z',
      updatedAt: '2026-01-12T10:00:00.000Z',
    },
    {
      id: 'cust_5',
      name: 'Counter Cash / Walk-in Customer',
      phone: '+91 99999 00000',
      address: 'Over Counter',
      city: 'Mumbai',
      state: 'Maharashtra',
      type: 'retail',
      creditLimit: 0,
      outstandingBalance: 0,
      status: 'active',
      notes: 'Default POS Walk-in customer profile.',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ];

  const initialSuppliers: Supplier[] = [
    {
      id: 'sup_1',
      name: 'Redington India Distribution Ltd',
      contactPerson: 'Sunil Kulkarni',
      phone: '+91 98204 11223',
      email: 'orders.west@redington.co.in',
      address: 'B-Wing, Lotus Corporate Park, Goregaon East',
      city: 'Mumbai',
      state: 'Maharashtra',
      gstin: '27AAACR1234N1ZT',
      paymentTerms: '30 Days Net',
      outstandingBalance: 145000,
      status: 'active',
      createdAt: '2026-01-02T10:00:00.000Z',
      updatedAt: '2026-01-02T10:00:00.000Z',
    },
    {
      id: 'sup_2',
      name: 'Ingram Micro India Pvt Ltd',
      contactPerson: 'Anjali Menon',
      phone: '+91 98205 33445',
      email: 'west.sales@ingrammicro.com',
      address: 'Godrej Coliseum, Somaiya Hospital Road, Sion East',
      city: 'Mumbai',
      state: 'Maharashtra',
      gstin: '27AAAAB0567A1ZP',
      paymentTerms: '21 Days Net',
      outstandingBalance: 88200,
      status: 'active',
      createdAt: '2026-01-02T10:00:00.000Z',
      updatedAt: '2026-01-02T10:00:00.000Z',
    },
    {
      id: 'sup_3',
      name: 'Savex Technologies Pvt Ltd',
      contactPerson: 'Mahesh Chawla',
      phone: '+91 98206 55667',
      email: 'orders@savextech.in',
      address: '124 Maker Chambers VI, Nariman Point',
      city: 'Mumbai',
      state: 'Maharashtra',
      gstin: '27AAACS8899K1ZM',
      paymentTerms: '15 Days Net',
      outstandingBalance: 0,
      status: 'active',
      createdAt: '2026-01-03T10:00:00.000Z',
      updatedAt: '2026-01-03T10:00:00.000Z',
    },
  ];

  const now = new Date().toISOString();

  // Initial finalized invoices
  const initialInvoices: Invoice[] = [
    {
      id: 'inv_1043',
      invoiceNumber: 'APX-26-1043',
      date: '2026-10-08T11:30:00.000Z',
      customerId: 'cust_1',
      customerName: 'Reliance Digital Reseller (Metro Tech)',
      customerPhone: '+91 98201 55551',
      customerState: 'Maharashtra',
      customerGstin: '27ABCDE1234F1Z1',
      employeeId: 'usr_emp1',
      employeeName: 'Rahul Verma',
      isInterState: false,
      items: [
        {
          productId: 'prod_1',
          sku: 'SND-SSD-1TB',
          productName: 'SanDisk Extreme 1TB Portable NVMe SSD',
          unit: 'Pcs',
          quantity: 2,
          unitPrice: 9499,
          discountType: 'percent',
          discountValue: 5,
          discountAmount: 949.9,
          taxableAmount: 18048.1,
          gstRate: 18,
          cgstAmount: 1624.33,
          sgstAmount: 1624.33,
          igstAmount: 0,
          totalAmount: 21296.76,
        },
        {
          productId: 'prod_2',
          sku: 'LOGI-MXM-3S',
          productName: 'Logitech MX Master 3S Wireless Performance Mouse',
          unit: 'Pcs',
          quantity: 1,
          unitPrice: 8995,
          discountType: 'fixed',
          discountValue: 500,
          discountAmount: 500,
          taxableAmount: 8495,
          gstRate: 18,
          cgstAmount: 764.55,
          sgstAmount: 764.55,
          igstAmount: 0,
          totalAmount: 10024.1,
        },
      ],
      subtotal: 27993,
      totalDiscount: 1449.9,
      totalTaxable: 26543.1,
      totalCgst: 2388.88,
      totalSgst: 2388.88,
      totalIgst: 0,
      roundOff: 0.14,
      grandTotal: 31321,
      paymentMethod: 'upi',
      amountReceived: 31321,
      balanceDue: 0,
      changeDue: 0,
      paymentStatus: 'paid',
      status: 'finalized',
      notes: 'Counter delivery. Warranty as per manufacturer terms.',
      createdAt: '2026-10-08T11:32:00.000Z',
      updatedAt: '2026-10-08T11:32:00.000Z',
    },
    {
      id: 'inv_1044',
      invoiceNumber: 'APX-26-1044',
      date: '2026-10-08T15:45:00.000Z',
      customerId: 'cust_3',
      customerName: 'Bangalore Computing Hub (Inter-State)',
      customerPhone: '+91 98450 77773',
      customerState: 'Karnataka',
      customerGstin: '29AAACH5544D1Z2',
      employeeId: 'usr_mgr',
      employeeName: 'Priya Patel',
      isInterState: true,
      items: [
        {
          productId: 'prod_7',
          sku: 'DELL-24-IPS',
          productName: 'Dell 24-inch Full HD IPS Borderless Monitor (S2421HN)',
          unit: 'Pcs',
          quantity: 4,
          unitPrice: 11999,
          discountType: 'percent',
          discountValue: 8,
          discountAmount: 3839.68,
          taxableAmount: 44156.32,
          gstRate: 18,
          cgstAmount: 0,
          sgstAmount: 0,
          igstAmount: 7948.14,
          totalAmount: 52104.46,
        },
      ],
      subtotal: 47996,
      totalDiscount: 3839.68,
      totalTaxable: 44156.32,
      totalCgst: 0,
      totalSgst: 0,
      totalIgst: 7948.14,
      roundOff: 0.54,
      grandTotal: 52105,
      paymentMethod: 'credit',
      amountReceived: 0,
      balanceDue: 52105,
      changeDue: 0,
      paymentStatus: 'unpaid',
      status: 'finalized',
      notes: 'Dispatched via VRL Logistics to Bangalore warehouse.',
      createdAt: '2026-10-08T15:50:00.000Z',
      updatedAt: '2026-10-08T15:50:00.000Z',
    },
  ];

  const initialPayments: PaymentRecord[] = [
    {
      id: 'pay_1',
      receiptNumber: 'RCP-26-0089',
      invoiceId: 'inv_1043',
      invoiceNumber: 'APX-26-1043',
      customerId: 'cust_1',
      customerName: 'Reliance Digital Reseller (Metro Tech)',
      type: 'customer_sale',
      amount: 31321,
      paymentMethod: 'upi',
      referenceNumber: 'UPI/HDFC/628192831',
      notes: 'Full payment received at POS counter',
      recordedBy: 'usr_emp1',
      recordedByName: 'Rahul Verma',
      date: '2026-10-08T11:32:00.000Z',
      createdAt: '2026-10-08T11:32:00.000Z',
    },
  ];

  const initialMovements: InventoryMovement[] = [
    {
      id: 'mov_1',
      productId: 'prod_1',
      sku: 'SND-SSD-1TB',
      productName: 'SanDisk Extreme 1TB Portable NVMe SSD',
      movementType: 'SALE_DEDUCTION',
      quantityChange: -2,
      previousStock: 44,
      newStock: 42,
      referenceDoc: 'APX-26-1043',
      reason: 'Finalized Bill POS Sale',
      recordedBy: 'usr_emp1',
      recordedByName: 'Rahul Verma',
      timestamp: '2026-10-08T11:32:00.000Z',
    },
    {
      id: 'mov_2',
      productId: 'prod_2',
      sku: 'LOGI-MXM-3S',
      productName: 'Logitech MX Master 3S Wireless Performance Mouse',
      movementType: 'SALE_DEDUCTION',
      quantityChange: -1,
      previousStock: 29,
      newStock: 28,
      referenceDoc: 'APX-26-1043',
      reason: 'Finalized Bill POS Sale',
      recordedBy: 'usr_emp1',
      recordedByName: 'Rahul Verma',
      timestamp: '2026-10-08T11:32:00.000Z',
    },
    {
      id: 'mov_3',
      productId: 'prod_7',
      sku: 'DELL-24-IPS',
      productName: 'Dell 24-inch Full HD IPS Borderless Monitor (S2421HN)',
      movementType: 'SALE_DEDUCTION',
      quantityChange: -4,
      previousStock: 22,
      newStock: 18,
      referenceDoc: 'APX-26-1044',
      reason: 'Finalized Bill Wholesale Dispatch',
      recordedBy: 'usr_mgr',
      recordedByName: 'Priya Patel',
      timestamp: '2026-10-08T15:50:00.000Z',
    },
  ];

  const initialApprovalRequests: ApprovalRequest[] = [
    {
      id: 'appr_1',
      actionType: 'EXCESSIVE_DISCOUNT',
      requestedBy: 'usr_emp1',
      requestedByName: 'Rahul Verma',
      targetEntityId: 'prod_3',
      targetEntityRef: 'Sony WH-1000XM5 Headphone',
      requestedValues: {
        discountPercent: 15,
        sellingPrice: 28990,
        discountedPrice: 24641.5,
      },
      reason: 'Customer buying corporate bundle of 3 units, requested 15% discount exceeding 10% limit.',
      status: 'PENDING',
      createdAt: '2026-10-09T01:15:00.000Z',
    },
  ];

  const initialAuditLogs: AuditLog[] = [
    {
      id: 'log_1',
      userId: 'usr_admin',
      userName: 'Vikram Sharma',
      userRole: 'admin',
      action: 'SYSTEM_BOOTSTRAP',
      entity: 'BUSINESS',
      entityId: 'APX-CORE',
      details: 'System initialized with initial distributor catalog, users, and GST configuration.',
      timestamp: '2026-01-01T09:00:00.000Z',
      status: 'SUCCESS',
    },
    {
      id: 'log_2',
      userId: 'usr_emp1',
      userName: 'Rahul Verma',
      userRole: 'employee',
      action: 'INVOICE_FINALIZED',
      entity: 'INVOICE',
      entityId: 'inv_1043',
      details: 'Created and finalized invoice APX-26-1043 for amount ₹31,321 (Paid via UPI). Deducted 3 items from inventory.',
      timestamp: '2026-10-08T11:32:00.000Z',
      status: 'SUCCESS',
    },
    {
      id: 'log_3',
      userId: 'usr_mgr',
      userName: 'Priya Patel',
      userRole: 'manager',
      action: 'INVOICE_FINALIZED',
      entity: 'INVOICE',
      entityId: 'inv_1044',
      details: 'Created and finalized inter-state credit invoice APX-26-1044 for amount ₹52,105 (IGST ₹7,948.14). Deducted 4 monitors.',
      timestamp: '2026-10-08T15:50:00.000Z',
      status: 'SUCCESS',
    },
  ];

  return {
    users: initialUsers,
    products: initialProducts,
    customers: initialCustomers,
    suppliers: initialSuppliers,
    invoices: initialInvoices,
    payments: initialPayments,
    purchases: [],
    inventoryMovements: initialMovements,
    approvalRequests: initialApprovalRequests,
    auditLogs: initialAuditLogs,
    settings: initialSettings,
  };
}

class DatabaseService {
  private data: DatabaseSchema;
  private isWriting = false;

  constructor() {
    this.ensureDataDirectory();
    this.data = this.loadData();
  }

  private ensureDataDirectory() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
    } catch (e) {
      // In serverless/read-only environments, this will be caught gracefully
    }
  }

  private loadData(): DatabaseSchema {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed.users && parsed.products && parsed.settings) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('[DB] Using initial data:', e);
    }
    const initial = getInitialData();
    this.saveDataDirect(initial);
    return initial;
  }

  private saveDataDirect(data: DatabaseSchema) {
    try {
      this.ensureDataDirectory();
      const tmpFile = `${DB_FILE}.tmp.${Date.now()}`;
      fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2), 'utf-8');
      fs.renameSync(tmpFile, DB_FILE);
    } catch (e) {
      // Running in read-only / serverless container
    }
  }

  public save() {
    this.saveDataDirect(this.data);
  }

  public resetToDemo(): DatabaseSchema {
    this.data = getInitialData();
    this.save();
    return this.data;
  }

  public getRawData(): DatabaseSchema {
    return this.data;
  }

  // --- USERS & AUTH ---
  public findUserByEmail(email: string): UserWithPasswordHash | undefined {
    return this.data.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  }

  public findUserById(id: string): UserWithPasswordHash | undefined {
    return this.data.users.find((u) => u.id === id);
  }

  public getUsers(): UserWithPasswordHash[] {
    return this.data.users;
  }

  public addUser(user: UserWithPasswordHash) {
    this.data.users.push(user);
    this.save();
  }

  public updateUser(id: string, updates: Partial<UserWithPasswordHash>) {
    const idx = this.data.users.findIndex((u) => u.id === id);
    if (idx !== -1) {
      this.data.users[idx] = { ...this.data.users[idx], ...updates };
      this.save();
      return this.data.users[idx];
    }
    return null;
  }

  // --- PRODUCTS ---
  public getProducts(): Product[] {
    return this.data.products;
  }

  public getProductById(id: string): Product | undefined {
    return this.data.products.find((p) => p.id === id);
  }

  public getProductBySku(sku: string): Product | undefined {
    return this.data.products.find((p) => p.sku.toLowerCase() === sku.toLowerCase());
  }

  public addProduct(product: Product) {
    this.data.products.push(product);
    this.save();
  }

  public updateProduct(id: string, updates: Partial<Product>) {
    const idx = this.data.products.findIndex((p) => p.id === id);
    if (idx !== -1) {
      this.data.products[idx] = { ...this.data.products[idx], ...updates, updatedAt: new Date().toISOString() };
      this.save();
      return this.data.products[idx];
    }
    return null;
  }

  // --- CUSTOMERS ---
  public getCustomers(): Customer[] {
    return this.data.customers;
  }

  public getCustomerById(id: string): Customer | undefined {
    return this.data.customers.find((c) => c.id === id);
  }

  public addCustomer(cust: Customer) {
    this.data.customers.push(cust);
    this.save();
  }

  public updateCustomer(id: string, updates: Partial<Customer>) {
    const idx = this.data.customers.findIndex((c) => c.id === id);
    if (idx !== -1) {
      this.data.customers[idx] = { ...this.data.customers[idx], ...updates, updatedAt: new Date().toISOString() };
      this.save();
      return this.data.customers[idx];
    }
    return null;
  }

  // --- SUPPLIERS ---
  public getSuppliers(): Supplier[] {
    return this.data.suppliers;
  }

  public getSupplierById(id: string): Supplier | undefined {
    return this.data.suppliers.find((s) => s.id === id);
  }

  public addSupplier(supp: Supplier) {
    this.data.suppliers.push(supp);
    this.save();
  }

  public updateSupplier(id: string, updates: Partial<Supplier>) {
    const idx = this.data.suppliers.findIndex((s) => s.id === id);
    if (idx !== -1) {
      this.data.suppliers[idx] = { ...this.data.suppliers[idx], ...updates, updatedAt: new Date().toISOString() };
      this.save();
      return this.data.suppliers[idx];
    }
    return null;
  }

  // --- INVOICES ---
  public getInvoices(): Invoice[] {
    return this.data.invoices;
  }

  public getInvoiceById(id: string): Invoice | undefined {
    return this.data.invoices.find((inv) => inv.id === id);
  }

  public addInvoice(inv: Invoice) {
    this.data.invoices.unshift(inv);
    this.save();
  }

  public updateInvoice(id: string, updates: Partial<Invoice>) {
    const idx = this.data.invoices.findIndex((inv) => inv.id === id);
    if (idx !== -1) {
      this.data.invoices[idx] = { ...this.data.invoices[idx], ...updates, updatedAt: new Date().toISOString() };
      this.save();
      return this.data.invoices[idx];
    }
    return null;
  }

  // --- PAYMENTS ---
  public getPayments(): PaymentRecord[] {
    return this.data.payments;
  }

  public addPayment(pay: PaymentRecord) {
    this.data.payments.unshift(pay);
    this.save();
  }

  // --- PURCHASES ---
  public getPurchases(): Purchase[] {
    return this.data.purchases;
  }

  public addPurchase(pur: Purchase) {
    this.data.purchases.unshift(pur);
    this.save();
  }

  // --- INVENTORY MOVEMENTS ---
  public getInventoryMovements(): InventoryMovement[] {
    return this.data.inventoryMovements;
  }

  public addInventoryMovement(mov: InventoryMovement) {
    this.data.inventoryMovements.unshift(mov);
    this.save();
  }

  // --- APPROVAL REQUESTS ---
  public getApprovalRequests(): ApprovalRequest[] {
    return this.data.approvalRequests;
  }

  public getApprovalRequestById(id: string): ApprovalRequest | undefined {
    return this.data.approvalRequests.find((a) => a.id === id);
  }

  public addApprovalRequest(req: ApprovalRequest) {
    this.data.approvalRequests.unshift(req);
    this.save();
  }

  public updateApprovalRequest(id: string, updates: Partial<ApprovalRequest>) {
    const idx = this.data.approvalRequests.findIndex((a) => a.id === id);
    if (idx !== -1) {
      this.data.approvalRequests[idx] = { ...this.data.approvalRequests[idx], ...updates };
      this.save();
      return this.data.approvalRequests[idx];
    }
    return null;
  }

  // --- AUDIT LOGS ---
  public getAuditLogs(): AuditLog[] {
    return this.data.auditLogs;
  }

  public logAudit(log: Omit<AuditLog, 'id' | 'timestamp'>) {
    const entry: AuditLog = {
      ...log,
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
    };
    this.data.auditLogs.unshift(entry);
    this.save();
    return entry;
  }

  // --- SETTINGS ---
  public getSettings(): BusinessSettings {
    return this.data.settings;
  }

  public updateSettings(settings: Partial<BusinessSettings>) {
    this.data.settings = { ...this.data.settings, ...settings };
    this.save();
    return this.data.settings;
  }

  // Atomically get next invoice number and increment
  public getNextInvoiceNumber(): string {
    const prefix = this.data.settings.invoicePrefix || 'APX-26-';
    const num = this.data.settings.invoiceNextNumber || 1001;
    this.data.settings.invoiceNextNumber = num + 1;
    this.save();
    return `${prefix}${num}`;
  }
}

export const db = new DatabaseService();
