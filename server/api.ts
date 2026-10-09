import express, { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { db } from './db.ts';
import {
  User,
  UserWithPasswordHash,
  Permission,
  Product,
  Customer,
  Supplier,
  Invoice,
  InvoiceItem,
  PaymentRecord,
  Purchase,
  InventoryMovement,
  ApprovalRequest,
  DashboardMetrics,
  PaymentMethod,
} from '../src/types/index.ts';

export const apiRouter = express.Router();
apiRouter.use(express.json());

// In-memory token store: token -> { userId, expiresAt }
interface ActiveSession {
  userId: string;
  expiresAt: number;
}
const activeSessions = new Map<string, ActiveSession>();

// Session duration: 24 hours
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

function createSession(userId: string): string {
  const token = crypto.randomBytes(32).toString('hex');
  activeSessions.set(token, {
    userId,
    expiresAt: Date.now() + SESSION_TTL_MS,
  });
  return token;
}

// Strip password hash and optionally purchase costs
function sanitizeUser(user: any): User {
  const { passwordHash, ...rest } = user;
  return rest;
}

function sanitizeProduct(product: Product, canViewCosts: boolean): Product {
  if (canViewCosts) return product;
  const { purchaseCost, ...rest } = product;
  return rest as Product;
}

// Authentication middleware
interface AuthenticatedRequest extends Request {
  user?: User;
  token?: string;
}

function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  let token: string | undefined;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (req.headers['x-session-token']) {
    token = req.headers['x-session-token'] as string;
  }

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. No session token provided.' });
  }

  const session = activeSessions.get(token);
  if (!session || session.expiresAt < Date.now()) {
    if (session) activeSessions.delete(token);
    return res.status(401).json({ error: 'Session expired or invalid. Please log in again.' });
  }

  const userRecord = db.findUserById(session.userId);
  if (!userRecord || userRecord.status !== 'active') {
    return res.status(403).json({ error: 'Account is deactivated or not found.' });
  }

  req.user = sanitizeUser(userRecord);
  req.token = token;
  next();
}

// Permission middleware
function requirePermission(perm: Permission) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    if (req.user.role === 'admin') {
      return next(); // Admin has all permissions
    }
    if (!req.user.permissions.includes(perm)) {
      return res.status(403).json({
        error: `Access Denied: Missing required permission '${perm}'. Contact your administrator.`,
      });
    }
    next();
  };
}

function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access Denied: Admin privileges required.' });
  }
  next();
}

// ==========================================
// AUTHENTICATION ROUTES
// ==========================================

apiRouter.post('/auth/login', (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const user = db.findUserByEmail(email);
  if (!user) {
    db.logAudit({
      userId: 'anonymous',
      userName: email,
      userRole: 'unknown',
      action: 'LOGIN_FAILED',
      entity: 'AUTH',
      entityId: email,
      details: 'Login failed: user not found',
      status: 'FAILED',
    });
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  if (user.status !== 'active') {
    return res.status(403).json({ error: 'This account has been deactivated by the Administrator.' });
  }

  const isMatch = bcrypt.compareSync(password, user.passwordHash);
  if (!isMatch) {
    db.logAudit({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: 'LOGIN_FAILED',
      entity: 'AUTH',
      entityId: user.id,
      details: 'Login failed: invalid password',
      status: 'FAILED',
    });
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const token = createSession(user.id);
  db.updateUser(user.id, { lastLoginAt: new Date().toISOString() });

  db.logAudit({
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    action: 'LOGIN_SUCCESS',
    entity: 'AUTH',
    entityId: user.id,
    details: `User logged in successfully as ${user.role}`,
    status: 'SUCCESS',
  });

  return res.json({
    token,
    user: sanitizeUser(user),
  });
});

apiRouter.get('/auth/me', authenticate, (req: AuthenticatedRequest, res: Response) => {
  return res.json({ user: req.user });
});

apiRouter.post('/auth/logout', authenticate, (req: AuthenticatedRequest, res: Response) => {
  if (req.token) {
    activeSessions.delete(req.token);
  }
  db.logAudit({
    userId: req.user!.id,
    userName: req.user!.name,
    userRole: req.user!.role,
    action: 'LOGOUT',
    entity: 'AUTH',
    entityId: req.user!.id,
    details: 'User logged out',
    status: 'SUCCESS',
  });
  return res.json({ message: 'Logged out successfully.' });
});

// Demo account quick switch
apiRouter.post('/auth/switch-demo', (req: Request, res: Response) => {
  const { role } = req.body;
  let targetUser = db.getUsers().find((u) => u.role === role && u.status === 'active');
  if (!targetUser) {
    return res.status(404).json({ error: `Demo user for role ${role} not found.` });
  }

  const token = createSession(targetUser.id);
  db.logAudit({
    userId: targetUser.id,
    userName: targetUser.name,
    userRole: targetUser.role,
    action: 'DEMO_ROLE_SWITCH',
    entity: 'AUTH',
    entityId: targetUser.id,
    details: `Switched demo role to ${targetUser.role} (${targetUser.name})`,
    status: 'SUCCESS',
  });

  return res.json({
    token,
    user: sanitizeUser(targetUser),
  });
});

// ==========================================
// DASHBOARD & METRICS
// ==========================================

apiRouter.get('/dashboard', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const invoices = db.getInvoices();
  const products = db.getProducts();
  const customers = db.getCustomers();
  const movements = db.getInventoryMovements();
  const approvals = db.getApprovalRequests();

  const user = req.user!;
  const isAdminOrMgr = user.role === 'admin' || user.role === 'manager';
  const canViewReports = user.role === 'admin' || user.permissions.includes('view_sales_reports');
  const canViewAllBills = user.role === 'admin' || user.permissions.includes('view_all_bills');

  // Filter invoices for today
  const todayStr = new Date().toISOString().slice(0, 10);
  const relevantInvoices = canViewAllBills
    ? invoices
    : invoices.filter((i) => i.employeeId === user.id);

  const todayInvoices = relevantInvoices.filter(
    (inv) => inv.date.slice(0, 10) === todayStr && inv.status === 'finalized'
  );

  const todaySales = todayInvoices.reduce((acc, curr) => acc + curr.grandTotal, 0);
  const todayBillsCount = todayInvoices.length;

  const totalReceivables = customers.reduce((acc, curr) => acc + (curr.outstandingBalance || 0), 0);
  const activeProducts = products.filter((p) => p.status === 'active');
  const lowStockProducts = products.filter((p) => p.status === 'active' && p.stockQuantity <= p.minStockThreshold);
  const pendingApprovals = approvals.filter((a) => a.status === 'PENDING');

  const canViewCosts = user.role === 'admin' || user.permissions.includes('view_purchase_costs');
  const sanitizedLowStock = lowStockProducts.map((p) => sanitizeProduct(p, canViewCosts));

  const metrics: DashboardMetrics = {
    todaySales: canViewReports ? todaySales : 0,
    todayBillsCount,
    totalReceivables: isAdminOrMgr ? totalReceivables : 0,
    totalActiveProducts: activeProducts.length,
    lowStockCount: lowStockProducts.length,
    pendingApprovalsCount: pendingApprovals.length,
    recentInvoices: relevantInvoices.slice(0, 5),
    lowStockProducts: sanitizedLowStock.slice(0, 5),
    recentMovements: movements.slice(0, 5),
  };

  return res.json(metrics);
});

// ==========================================
// PRODUCTS
// ==========================================

apiRouter.get('/products', authenticate, requirePermission('view_products'), (req: AuthenticatedRequest, res: Response) => {
  const canViewCosts = req.user!.role === 'admin' || req.user!.permissions.includes('view_purchase_costs');
  const products = db.getProducts().map((p) => sanitizeProduct(p, canViewCosts));
  return res.json(products);
});

apiRouter.post('/products', authenticate, requirePermission('add_products'), (req: AuthenticatedRequest, res: Response) => {
  const {
    sku,
    name,
    category,
    brand,
    barcode,
    description,
    unit = 'Pcs',
    stockQuantity = 0,
    minStockThreshold = 5,
    purchaseCost = 0,
    sellingPrice,
    wholesalePrice,
    taxRate = 18,
    status = 'active',
  } = req.body;

  if (!sku || !name || !sellingPrice) {
    return res.status(400).json({ error: 'SKU, Product Name, and Selling Price are required.' });
  }

  // Prevent duplicate SKU
  const existing = db.getProductBySku(sku);
  if (existing) {
    return res.status(400).json({ error: `Product with SKU "${sku}" already exists.` });
  }

  const newProduct: Product = {
    id: `prod_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    sku: sku.trim().toUpperCase(),
    name: name.trim(),
    category: category || 'General',
    brand: brand || 'Generic',
    barcode: barcode?.trim(),
    description: description?.trim(),
    unit,
    stockQuantity: Number(stockQuantity) || 0,
    minStockThreshold: Number(minStockThreshold) || 5,
    purchaseCost: Number(purchaseCost) || 0,
    sellingPrice: Number(sellingPrice),
    wholesalePrice: wholesalePrice ? Number(wholesalePrice) : undefined,
    taxRate: Number(taxRate),
    status,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.addProduct(newProduct);

  // Record opening stock movement if stock > 0
  if (newProduct.stockQuantity > 0) {
    db.addInventoryMovement({
      id: `mov_${Date.now()}`,
      productId: newProduct.id,
      sku: newProduct.sku,
      productName: newProduct.name,
      movementType: 'MANUAL_ADJUSTMENT',
      quantityChange: newProduct.stockQuantity,
      previousStock: 0,
      newStock: newProduct.stockQuantity,
      referenceDoc: 'OPENING_STOCK',
      reason: 'Initial opening stock creation',
      recordedBy: req.user!.id,
      recordedByName: req.user!.name,
      timestamp: new Date().toISOString(),
    });
  }

  db.logAudit({
    userId: req.user!.id,
    userName: req.user!.name,
    userRole: req.user!.role,
    action: 'PRODUCT_CREATED',
    entity: 'PRODUCT',
    entityId: newProduct.id,
    details: `Added new product: ${newProduct.name} (${newProduct.sku}) with price ₹${newProduct.sellingPrice}`,
    status: 'SUCCESS',
  });

  const canViewCosts = req.user!.role === 'admin' || req.user!.permissions.includes('view_purchase_costs');
  return res.status(201).json(sanitizeProduct(newProduct, canViewCosts));
});

apiRouter.put('/products/:id', authenticate, requirePermission('edit_products'), (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const existing = db.getProductById(id);
  if (!existing) {
    return res.status(404).json({ error: 'Product not found.' });
  }

  const {
    name,
    category,
    brand,
    barcode,
    description,
    unit,
    minStockThreshold,
    purchaseCost,
    sellingPrice,
    wholesalePrice,
    taxRate,
    status,
  } = req.body;

  const canChangePrices = req.user!.role === 'admin' || req.user!.permissions.includes('change_selling_prices');
  if (sellingPrice !== undefined && Number(sellingPrice) !== existing.sellingPrice && !canChangePrices) {
    return res.status(403).json({ error: 'Permission denied: Not authorized to change product selling prices.' });
  }

  const canViewCosts = req.user!.role === 'admin' || req.user!.permissions.includes('view_purchase_costs');

  const updates: Partial<Product> = {};
  if (name !== undefined) updates.name = name;
  if (category !== undefined) updates.category = category;
  if (brand !== undefined) updates.brand = brand;
  if (barcode !== undefined) updates.barcode = barcode;
  if (description !== undefined) updates.description = description;
  if (unit !== undefined) updates.unit = unit;
  if (minStockThreshold !== undefined) updates.minStockThreshold = Number(minStockThreshold);
  if (purchaseCost !== undefined && canViewCosts) updates.purchaseCost = Number(purchaseCost);
  if (sellingPrice !== undefined && canChangePrices) updates.sellingPrice = Number(sellingPrice);
  if (wholesalePrice !== undefined) updates.wholesalePrice = Number(wholesalePrice);
  if (taxRate !== undefined) updates.taxRate = Number(taxRate);
  if (status !== undefined) updates.status = status;

  const updated = db.updateProduct(id, updates);

  db.logAudit({
    userId: req.user!.id,
    userName: req.user!.name,
    userRole: req.user!.role,
    action: 'PRODUCT_UPDATED',
    entity: 'PRODUCT',
    entityId: id,
    details: `Updated product ${existing.sku} (${existing.name}). Updates: ${JSON.stringify(updates)}`,
    status: 'SUCCESS',
  });

  return res.json(sanitizeProduct(updated!, canViewCosts));
});

// ==========================================
// CUSTOMERS
// ==========================================

apiRouter.get('/customers', authenticate, requirePermission('view_customers'), (req: AuthenticatedRequest, res: Response) => {
  return res.json(db.getCustomers());
});

apiRouter.post('/customers', authenticate, requirePermission('manage_customers'), (req: AuthenticatedRequest, res: Response) => {
  const { name, phone, email, address, city, state, pincode, gstin, type = 'retail', creditLimit = 0, notes } = req.body;

  if (!name || !phone) {
    return res.status(400).json({ error: 'Customer Name and Phone are required.' });
  }

  const settings = db.getSettings();

  const newCust: Customer = {
    id: `cust_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    name: name.trim(),
    phone: phone.trim(),
    email: email?.trim(),
    address: address?.trim(),
    city: city?.trim() || settings.city,
    state: state?.trim() || settings.state,
    pincode: pincode?.trim(),
    gstin: gstin?.trim()?.toUpperCase(),
    type,
    creditLimit: Number(creditLimit) || 0,
    outstandingBalance: 0,
    status: 'active',
    notes,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.addCustomer(newCust);

  db.logAudit({
    userId: req.user!.id,
    userName: req.user!.name,
    userRole: req.user!.role,
    action: 'CUSTOMER_CREATED',
    entity: 'CUSTOMER',
    entityId: newCust.id,
    details: `Added customer ${newCust.name} (${newCust.phone})`,
    status: 'SUCCESS',
  });

  return res.status(201).json(newCust);
});

apiRouter.put('/customers/:id', authenticate, requirePermission('manage_customers'), (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const existing = db.getCustomerById(id);
  if (!existing) {
    return res.status(404).json({ error: 'Customer not found.' });
  }

  const updated = db.updateCustomer(id, req.body);
  return res.json(updated);
});

// ==========================================
// SUPPLIERS
// ==========================================

apiRouter.get('/suppliers', authenticate, requirePermission('view_suppliers'), (req: AuthenticatedRequest, res: Response) => {
  return res.json(db.getSuppliers());
});

apiRouter.post('/suppliers', authenticate, requirePermission('manage_suppliers'), (req: AuthenticatedRequest, res: Response) => {
  const { name, contactPerson, phone, email, address, city, state, gstin, paymentTerms } = req.body;
  if (!name || !phone) {
    return res.status(400).json({ error: 'Supplier name and phone are required.' });
  }

  const settings = db.getSettings();
  const newSup: Supplier = {
    id: `sup_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    name: name.trim(),
    contactPerson: contactPerson?.trim(),
    phone: phone.trim(),
    email: email?.trim(),
    address: address?.trim(),
    city: city?.trim() || settings.city,
    state: state?.trim() || settings.state,
    gstin: gstin?.trim()?.toUpperCase(),
    paymentTerms: paymentTerms || '30 Days Net',
    outstandingBalance: 0,
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.addSupplier(newSup);
  return res.status(201).json(newSup);
});

// ==========================================
// BILLING & POS - CRITICAL MODULE
// ==========================================

apiRouter.get('/invoices', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const canViewAll = user.role === 'admin' || user.permissions.includes('view_all_bills');
  const invoices = db.getInvoices();

  if (canViewAll) {
    return res.json(invoices);
  } else if (user.permissions.includes('view_own_bills')) {
    return res.json(invoices.filter((i) => i.employeeId === user.id));
  } else {
    return res.status(403).json({ error: 'Permission denied: Cannot view invoices.' });
  }
});

apiRouter.get('/invoices/:id', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const inv = db.getInvoiceById(id);
  if (!inv) {
    return res.status(404).json({ error: 'Invoice not found.' });
  }

  const user = req.user!;
  const canViewAll = user.role === 'admin' || user.permissions.includes('view_all_bills');
  if (!canViewAll && user.permissions.includes('view_own_bills') && inv.employeeId !== user.id) {
    return res.status(403).json({ error: 'Access denied: You can only view your own invoices.' });
  }

  return res.json(inv);
});

// Finalize Bill - Server-side re-calculation, stock deduction, atomic commit
apiRouter.post('/invoices/finalize', authenticate, requirePermission('create_bills'), (req: AuthenticatedRequest, res: Response) => {
  const {
    customerId,
    items: rawItems,
    paymentMethod = 'cash',
    splitDetails,
    amountReceived = 0,
    notes,
    isDraft = false,
  } = req.body;

  if (!rawItems || !Array.isArray(rawItems) || rawItems.length === 0) {
    return res.status(400).json({ error: 'Invoice must contain at least one item.' });
  }

  const settings = db.getSettings();
  const user = req.user!;

  // 1. Validate Customer
  let customer: Customer | undefined;
  if (customerId) {
    customer = db.getCustomerById(customerId);
  }
  if (!customer) {
    // Default to Walk-in customer
    customer = db.getCustomers().find((c) => c.phone === '+91 99999 00000') || db.getCustomers()[0];
  }

  // 2. Determine Inter-state vs Intra-state GST
  const businessState = (settings.state || 'Maharashtra').trim().toLowerCase();
  const customerState = (customer.state || settings.state || 'Maharashtra').trim().toLowerCase();
  const isInterState = customerState !== businessState;

  // 3. Re-fetch and re-calculate every single item from the database
  const validatedItems: InvoiceItem[] = [];
  let subtotal = 0;
  let totalDiscount = 0;
  let totalTaxable = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  let totalIgst = 0;

  for (const raw of rawItems) {
    const product = db.getProductById(raw.productId);
    if (!product) {
      return res.status(400).json({ error: `Product with ID ${raw.productId} does not exist.` });
    }

    if (product.status !== 'active') {
      return res.status(400).json({ error: `Product ${product.name} (${product.sku}) is inactive.` });
    }

    const qty = Number(raw.quantity);
    if (isNaN(qty) || qty <= 0) {
      return res.status(400).json({ error: `Invalid quantity for product ${product.name}.` });
    }

    // Verify stock availability
    if (!isDraft && !settings.allowNegativeStock && product.stockQuantity < qty) {
      return res.status(400).json({
        error: `Insufficient stock for "${product.name}". Available: ${product.stockQuantity}, Requested: ${qty}`,
      });
    }

    // Use authorized product selling price (or wholesale price if customer is wholesale)
    let unitPrice = product.sellingPrice;
    if (customer.type === 'wholesale' && product.wholesalePrice && product.wholesalePrice > 0) {
      unitPrice = product.wholesalePrice;
    }

    // Discounts
    let discountType: 'percent' | 'fixed' = raw.discountType === 'percent' ? 'percent' : 'fixed';
    let discountVal = Number(raw.discountValue) || 0;
    if (discountVal < 0) discountVal = 0;

    // Check discount limit
    let discountPercent = discountType === 'percent' ? discountVal : (discountVal / (unitPrice * qty)) * 100;
    if (discountPercent > settings.discountApprovalThreshold && user.role === 'employee') {
      return res.status(403).json({
        error: `Discount of ${discountPercent.toFixed(1)}% exceeds the authorized threshold of ${settings.discountApprovalThreshold}%. Requires supervisor approval.`,
        requiresApproval: true,
        actionType: 'EXCESSIVE_DISCOUNT',
      });
    }

    const lineGross = unitPrice * qty;
    let discountAmount = 0;
    if (discountType === 'percent') {
      discountAmount = Math.min(lineGross, (lineGross * discountVal) / 100);
    } else {
      discountAmount = Math.min(lineGross, discountVal);
    }

    const taxableAmount = Math.max(0, lineGross - discountAmount);
    const gstRate = Number(product.taxRate) || 0;

    let cgstAmount = 0;
    let sgstAmount = 0;
    let igstAmount = 0;

    if (isInterState) {
      igstAmount = Number(((taxableAmount * gstRate) / 100).toFixed(2));
    } else {
      cgstAmount = Number(((taxableAmount * (gstRate / 2)) / 100).toFixed(2));
      sgstAmount = Number(((taxableAmount * (gstRate / 2)) / 100).toFixed(2));
    }

    const lineTotal = Number((taxableAmount + cgstAmount + sgstAmount + igstAmount).toFixed(2));

    subtotal += lineGross;
    totalDiscount += discountAmount;
    totalTaxable += taxableAmount;
    totalCgst += cgstAmount;
    totalSgst += sgstAmount;
    totalIgst += igstAmount;

    // Line item snapshot
    validatedItems.push({
      productId: product.id,
      sku: product.sku,
      productName: product.name,
      unit: product.unit,
      quantity: qty,
      unitPrice,
      discountType,
      discountValue: discountVal,
      discountAmount: Number(discountAmount.toFixed(2)),
      taxableAmount: Number(taxableAmount.toFixed(2)),
      gstRate,
      cgstAmount,
      sgstAmount,
      igstAmount,
      totalAmount: lineTotal,
    });
  }

  const rawGrandTotal = totalTaxable + totalCgst + totalSgst + totalIgst;
  const roundedGrandTotal = Math.round(rawGrandTotal);
  const roundOff = Number((roundedGrandTotal - rawGrandTotal).toFixed(2));

  let received = Number(amountReceived) || 0;
  if (received < 0) received = 0;

  // Credit sale check
  let balanceDue = 0;
  let changeDue = 0;

  if (paymentMethod === 'credit') {
    received = 0;
    balanceDue = roundedGrandTotal;

    // Credit limit check
    if (customer.creditLimit > 0 && customer.outstandingBalance + balanceDue > customer.creditLimit) {
      return res.status(400).json({
        error: `Credit limit exceeded! Customer limit: ₹${customer.creditLimit}, Current balance: ₹${customer.outstandingBalance}, New bill: ₹${balanceDue}. Total exceeds limit.`,
      });
    }
  } else {
    if (received >= roundedGrandTotal) {
      changeDue = Number((received - roundedGrandTotal).toFixed(2));
      balanceDue = 0;
    } else {
      balanceDue = Number((roundedGrandTotal - received).toFixed(2));
    }
  }

  let paymentStatus: 'paid' | 'partial' | 'unpaid' = 'paid';
  if (balanceDue === roundedGrandTotal) {
    paymentStatus = 'unpaid';
  } else if (balanceDue > 0) {
    paymentStatus = 'partial';
  }

  const invoiceNumber = isDraft ? `DRAFT-${Date.now()}` : db.getNextInvoiceNumber();
  const invoiceId = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const timestamp = new Date().toISOString();

  const newInvoice: Invoice = {
    id: invoiceId,
    invoiceNumber,
    date: timestamp,
    customerId: customer.id,
    customerName: customer.name,
    customerPhone: customer.phone,
    customerState: customer.state,
    customerGstin: customer.gstin,
    employeeId: user.id,
    employeeName: user.name,
    items: validatedItems,
    isInterState,
    subtotal: Number(subtotal.toFixed(2)),
    totalDiscount: Number(totalDiscount.toFixed(2)),
    totalTaxable: Number(totalTaxable.toFixed(2)),
    totalCgst: Number(totalCgst.toFixed(2)),
    totalSgst: Number(totalSgst.toFixed(2)),
    totalIgst: Number(totalIgst.toFixed(2)),
    roundOff,
    grandTotal: roundedGrandTotal,
    paymentMethod,
    splitDetails,
    amountReceived: received > roundedGrandTotal ? roundedGrandTotal : received,
    balanceDue,
    changeDue,
    paymentStatus,
    status: isDraft ? 'draft' : 'finalized',
    notes,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  // ATOMIC COMMIT: Save invoice, deduct stock, record movements, record payment, update customer
  db.addInvoice(newInvoice);

  if (!isDraft) {
    // 1. Deduct Stock & Record Inventory Movement
    for (const item of validatedItems) {
      const prod = db.getProductById(item.productId)!;
      const prevStock = prod.stockQuantity;
      const nextStock = prevStock - item.quantity;
      db.updateProduct(item.productId, { stockQuantity: nextStock });

      db.addInventoryMovement({
        id: `mov_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        productId: item.productId,
        sku: item.sku,
        productName: item.productName,
        movementType: 'SALE_DEDUCTION',
        quantityChange: -item.quantity,
        previousStock: prevStock,
        newStock: nextStock,
        referenceDoc: invoiceNumber,
        reason: `Sold in invoice ${invoiceNumber}`,
        recordedBy: user.id,
        recordedByName: user.name,
        timestamp,
      });
    }

    // 2. Record Payment Receipt if received > 0
    const actualCollected = Math.min(received, roundedGrandTotal);
    if (actualCollected > 0) {
      db.addPayment({
        id: `pay_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        receiptNumber: `RCP-${Date.now().toString().slice(-6)}`,
        invoiceId: newInvoice.id,
        invoiceNumber: newInvoice.invoiceNumber,
        customerId: customer.id,
        customerName: customer.name,
        type: 'customer_sale',
        amount: actualCollected,
        paymentMethod,
        notes: `Received for invoice ${invoiceNumber}`,
        recordedBy: user.id,
        recordedByName: user.name,
        date: timestamp,
        createdAt: timestamp,
      });
    }

    // 3. Update customer outstanding balance if balanceDue > 0
    if (balanceDue > 0 && customer.id !== 'cust_5') {
      db.updateCustomer(customer.id, {
        outstandingBalance: (customer.outstandingBalance || 0) + balanceDue,
      });
    }

    // 4. Log Audit Event
    db.logAudit({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: 'INVOICE_FINALIZED',
      entity: 'INVOICE',
      entityId: newInvoice.id,
      details: `Finalized Invoice ${newInvoice.invoiceNumber} for ₹${newInvoice.grandTotal} (${customer.name}). Received: ₹${actualCollected}, Balance: ₹${balanceDue}.`,
      status: 'SUCCESS',
    });
  }

  return res.status(201).json(newInvoice);
});

// Cancel or Refund Invoice
apiRouter.post('/invoices/:id/cancel', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { reason } = req.body;
  const user = req.user!;

  if (!reason || !reason.trim()) {
    return res.status(400).json({ error: 'A cancellation reason is required.' });
  }

  const invoice = db.getInvoiceById(id);
  if (!invoice) {
    return res.status(404).json({ error: 'Invoice not found.' });
  }

  if (invoice.status === 'cancelled') {
    return res.status(400).json({ error: 'Invoice is already cancelled.' });
  }

  const canCancelDirectly = user.role === 'admin' || user.permissions.includes('cancel_finalized_bills');

  // If user is employee and does not have direct cancel permission, create approval request
  if (!canCancelDirectly) {
    const approvalReq: ApprovalRequest = {
      id: `appr_${Date.now()}`,
      actionType: 'BILL_CANCELLATION',
      requestedBy: user.id,
      requestedByName: user.name,
      targetEntityId: invoice.id,
      targetEntityRef: invoice.invoiceNumber,
      requestedValues: { reason: reason.trim(), grandTotal: invoice.grandTotal },
      reason: reason.trim(),
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    };
    db.addApprovalRequest(approvalReq);

    db.logAudit({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: 'CANCELLATION_REQUESTED',
      entity: 'INVOICE',
      entityId: invoice.id,
      details: `Requested cancellation for ${invoice.invoiceNumber}. Reason: ${reason}`,
      status: 'SUCCESS',
    });

    return res.json({
      message: 'Cancellation request submitted for supervisor approval.',
      approvalRequired: true,
      requestId: approvalReq.id,
    });
  }

  // Execute cancellation: Restore stock, reverse payment, log movements
  const timestamp = new Date().toISOString();
  for (const item of invoice.items) {
    const prod = db.getProductById(item.productId);
    if (prod) {
      const prev = prod.stockQuantity;
      const next = prev + item.quantity;
      db.updateProduct(item.productId, { stockQuantity: next });

      db.addInventoryMovement({
        id: `mov_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        productId: item.productId,
        sku: item.sku,
        productName: item.productName,
        movementType: 'CUSTOMER_RETURN',
        quantityChange: item.quantity,
        previousStock: prev,
        newStock: next,
        referenceDoc: invoice.invoiceNumber,
        reason: `Restored from cancelled invoice ${invoice.invoiceNumber}: ${reason}`,
        recordedBy: user.id,
        recordedByName: user.name,
        timestamp,
      });
    }
  }

  // If invoice had balanceDue, deduct from customer outstanding
  if (invoice.balanceDue > 0 && invoice.customerId) {
    const cust = db.getCustomerById(invoice.customerId);
    if (cust) {
      const newBalance = Math.max(0, (cust.outstandingBalance || 0) - invoice.balanceDue);
      db.updateCustomer(cust.id, { outstandingBalance: newBalance });
    }
  }

  // Mark invoice cancelled
  const updatedInvoice = db.updateInvoice(invoice.id, {
    status: 'cancelled',
    cancellationReason: reason.trim(),
    cancelledAt: timestamp,
    cancelledBy: user.id,
    cancelledByName: user.name,
  });

  db.logAudit({
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    action: 'INVOICE_CANCELLED',
    entity: 'INVOICE',
    entityId: invoice.id,
    details: `Cancelled invoice ${invoice.invoiceNumber} (₹${invoice.grandTotal}). Stock restored. Reason: ${reason}`,
    status: 'SUCCESS',
  });

  return res.json({ message: 'Invoice cancelled successfully and inventory restored.', invoice: updatedInvoice });
});

// ==========================================
// INVENTORY & STOCK MANAGEMENT
// ==========================================

apiRouter.get('/inventory/movements', authenticate, requirePermission('view_stock'), (req: AuthenticatedRequest, res: Response) => {
  return res.json(db.getInventoryMovements());
});

apiRouter.post('/inventory/adjust', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const { productId, quantityChange, reason, type = 'MANUAL_ADJUSTMENT' } = req.body;
  const user = req.user!;

  if (!productId || quantityChange === undefined || !reason) {
    return res.status(400).json({ error: 'Product ID, quantity change, and reason are required.' });
  }

  const product = db.getProductById(productId);
  if (!product) {
    return res.status(404).json({ error: 'Product not found.' });
  }

  const qtyDelta = Number(quantityChange);
  if (isNaN(qtyDelta) || qtyDelta === 0) {
    return res.status(400).json({ error: 'Quantity change must be a non-zero number.' });
  }

  const canAdjustDirectly = user.role === 'admin' || user.permissions.includes('adjust_stock');

  if (!canAdjustDirectly) {
    const approvalReq: ApprovalRequest = {
      id: `appr_${Date.now()}`,
      actionType: 'STOCK_ADJUSTMENT',
      requestedBy: user.id,
      requestedByName: user.name,
      targetEntityId: product.id,
      targetEntityRef: `${product.sku} - ${product.name}`,
      requestedValues: {
        quantityChange: qtyDelta,
        currentStock: product.stockQuantity,
        projectedStock: product.stockQuantity + qtyDelta,
        reason,
      },
      reason,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    };
    db.addApprovalRequest(approvalReq);

    return res.json({
      message: 'Stock adjustment request submitted for supervisor approval.',
      approvalRequired: true,
      requestId: approvalReq.id,
    });
  }

  const prev = product.stockQuantity;
  const next = prev + qtyDelta;
  if (next < 0 && !db.getSettings().allowNegativeStock) {
    return res.status(400).json({ error: `Cannot reduce stock below zero. Current stock: ${prev}` });
  }

  db.updateProduct(product.id, { stockQuantity: next });

  const mov: InventoryMovement = {
    id: `mov_${Date.now()}`,
    productId: product.id,
    sku: product.sku,
    productName: product.name,
    movementType: type,
    quantityChange: qtyDelta,
    previousStock: prev,
    newStock: next,
    referenceDoc: 'MANUAL_ADJ',
    reason,
    recordedBy: user.id,
    recordedByName: user.name,
    timestamp: new Date().toISOString(),
  };
  db.addInventoryMovement(mov);

  db.logAudit({
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    action: 'STOCK_ADJUSTED',
    entity: 'INVENTORY',
    entityId: product.id,
    details: `Adjusted stock for ${product.sku} by ${qtyDelta > 0 ? '+' : ''}${qtyDelta} (from ${prev} to ${next}). Reason: ${reason}`,
    status: 'SUCCESS',
  });

  return res.json({ message: 'Stock adjusted successfully.', movement: mov, currentStock: next });
});

// ==========================================
// PURCHASES & INWARD STOCK
// ==========================================

apiRouter.get('/purchases', authenticate, requirePermission('view_purchases'), (req: AuthenticatedRequest, res: Response) => {
  return res.json(db.getPurchases());
});

apiRouter.post('/purchases', authenticate, requirePermission('create_purchases'), (req: AuthenticatedRequest, res: Response) => {
  const { supplierId, supplierInvoiceRef, date, items: rawItems, amountPaid = 0, notes } = req.body;
  const user = req.user!;

  if (!supplierId || !rawItems || !Array.isArray(rawItems) || rawItems.length === 0) {
    return res.status(400).json({ error: 'Supplier and purchase items are required.' });
  }

  const supplier = db.getSupplierById(supplierId);
  if (!supplier) {
    return res.status(404).json({ error: 'Supplier not found.' });
  }

  let subtotal = 0;
  let taxAmount = 0;
  const validatedItems = [];

  for (const raw of rawItems) {
    const product = db.getProductById(raw.productId);
    if (!product) {
      return res.status(400).json({ error: `Product ${raw.productId} not found.` });
    }

    const qty = Number(raw.quantity);
    const pPrice = Number(raw.purchasePrice);
    const taxRate = Number(raw.taxRate || product.taxRate || 18);

    if (qty <= 0 || pPrice <= 0) {
      return res.status(400).json({ error: 'Quantity and Purchase price must be positive numbers.' });
    }

    const lineSubtotal = qty * pPrice;
    const lineTax = Number(((lineSubtotal * taxRate) / 100).toFixed(2));
    const lineTotal = Number((lineSubtotal + lineTax).toFixed(2));

    subtotal += lineSubtotal;
    taxAmount += lineTax;

    validatedItems.push({
      productId: product.id,
      sku: product.sku,
      productName: product.name,
      unit: product.unit,
      quantity: qty,
      purchasePrice: pPrice,
      taxRate,
      taxAmount: lineTax,
      totalAmount: lineTotal,
    });
  }

  const totalAmount = Math.round(subtotal + taxAmount);
  const paid = Math.min(Number(amountPaid) || 0, totalAmount);
  const outstandingBalance = totalAmount - paid;

  const purchaseNumber = `PO-${Date.now().toString().slice(-6)}`;
  const timestamp = date || new Date().toISOString();

  const newPurchase: Purchase = {
    id: `pur_${Date.now()}`,
    purchaseNumber,
    supplierId: supplier.id,
    supplierName: supplier.name,
    supplierInvoiceRef: supplierInvoiceRef || `SUP-INV-${Date.now().toString().slice(-4)}`,
    date: timestamp,
    items: validatedItems,
    subtotal: Number(subtotal.toFixed(2)),
    taxAmount: Number(taxAmount.toFixed(2)),
    totalAmount,
    amountPaid: paid,
    outstandingBalance,
    notes,
    status: 'received',
    recordedBy: user.id,
    recordedByName: user.name,
    createdAt: new Date().toISOString(),
  };

  db.addPurchase(newPurchase);

  // Update Inventory and log movements
  for (const item of validatedItems) {
    const prod = db.getProductById(item.productId)!;
    const prev = prod.stockQuantity;
    const next = prev + item.quantity;

    // Update product stock and optionally update purchaseCost
    db.updateProduct(item.productId, {
      stockQuantity: next,
      purchaseCost: item.purchasePrice,
    });

    db.addInventoryMovement({
      id: `mov_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      productId: item.productId,
      sku: item.sku,
      productName: item.productName,
      movementType: 'PURCHASE_RECEIPT',
      quantityChange: item.quantity,
      previousStock: prev,
      newStock: next,
      referenceDoc: purchaseNumber,
      reason: `Purchased from ${supplier.name} (Ref: ${newPurchase.supplierInvoiceRef})`,
      recordedBy: user.id,
      recordedByName: user.name,
      timestamp: new Date().toISOString(),
    });
  }

  // Update supplier outstanding balance if credit
  if (outstandingBalance > 0) {
    db.updateSupplier(supplier.id, {
      outstandingBalance: (supplier.outstandingBalance || 0) + outstandingBalance,
    });
  }

  db.logAudit({
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    action: 'PURCHASE_CREATED',
    entity: 'PURCHASE',
    entityId: newPurchase.id,
    details: `Recorded purchase ${purchaseNumber} from ${supplier.name} for ₹${totalAmount}. Added stock for ${validatedItems.length} items.`,
    status: 'SUCCESS',
  });

  return res.status(201).json(newPurchase);
});

// ==========================================
// PAYMENTS & OUTSTANDING DUES
// ==========================================

apiRouter.get('/payments', authenticate, requirePermission('view_payments'), (req: AuthenticatedRequest, res: Response) => {
  return res.json(db.getPayments());
});

apiRouter.post('/payments/customer-due', authenticate, requirePermission('record_payments'), (req: AuthenticatedRequest, res: Response) => {
  const { customerId, amount, paymentMethod = 'cash', referenceNumber, notes } = req.body;
  const user = req.user!;

  if (!customerId || !amount || Number(amount) <= 0) {
    return res.status(400).json({ error: 'Valid Customer ID and positive amount are required.' });
  }

  const customer = db.getCustomerById(customerId);
  if (!customer) {
    return res.status(404).json({ error: 'Customer not found.' });
  }

  const payAmount = Number(amount);
  const prevBalance = customer.outstandingBalance || 0;
  const nextBalance = Math.max(0, prevBalance - payAmount);

  db.updateCustomer(customer.id, { outstandingBalance: nextBalance });

  const receipt: PaymentRecord = {
    id: `pay_${Date.now()}`,
    receiptNumber: `RCP-DUE-${Date.now().toString().slice(-6)}`,
    customerId: customer.id,
    customerName: customer.name,
    type: 'customer_due_payment',
    amount: payAmount,
    paymentMethod,
    referenceNumber,
    notes: notes || `Settlement of outstanding balance for ${customer.name}`,
    recordedBy: user.id,
    recordedByName: user.name,
    date: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };

  db.addPayment(receipt);

  db.logAudit({
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    action: 'PAYMENT_COLLECTED',
    entity: 'PAYMENT',
    entityId: receipt.id,
    details: `Collected ₹${payAmount} from ${customer.name}. Outstanding balance reduced from ₹${prevBalance} to ₹${nextBalance}.`,
    status: 'SUCCESS',
  });

  return res.status(201).json({ receipt, newOutstandingBalance: nextBalance });
});

// ==========================================
// APPROVAL WORKFLOW
// ==========================================

apiRouter.get('/approvals', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const allApprovals = db.getApprovalRequests();

  if (user.role === 'admin' || user.permissions.includes('manage_approvals')) {
    return res.json(allApprovals);
  } else {
    // Employees can only view their own requests
    return res.json(allApprovals.filter((a) => a.requestedBy === user.id));
  }
});

apiRouter.post('/approvals/:id/review', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { decision, reviewComments } = req.body; // 'APPROVE' or 'REJECT'
  const user = req.user!;

  if (user.role !== 'admin' && !user.permissions.includes('manage_approvals')) {
    return res.status(403).json({ error: 'Access denied: Only managers or admins can review approvals.' });
  }

  const approval = db.getApprovalRequestById(id);
  if (!approval) {
    return res.status(404).json({ error: 'Approval request not found.' });
  }

  if (approval.status !== 'PENDING') {
    return res.status(400).json({ error: `Request has already been ${approval.status.toLowerCase()}.` });
  }

  // Prevent approving own request
  if (approval.requestedBy === user.id && user.role !== 'admin') {
    return res.status(403).json({ error: 'Security policy: You cannot approve your own request.' });
  }

  const status = decision === 'APPROVE' ? 'APPROVED' : 'REJECTED';
  const timestamp = new Date().toISOString();

  // If approved, execute action atomically
  if (status === 'APPROVED') {
    if (approval.actionType === 'BILL_CANCELLATION') {
      const inv = db.getInvoiceById(approval.targetEntityId);
      if (inv && inv.status !== 'cancelled') {
        for (const item of inv.items) {
          const prod = db.getProductById(item.productId);
          if (prod) {
            const prev = prod.stockQuantity;
            const next = prev + item.quantity;
            db.updateProduct(item.productId, { stockQuantity: next });

            db.addInventoryMovement({
              id: `mov_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              productId: item.productId,
              sku: item.sku,
              productName: item.productName,
              movementType: 'CUSTOMER_RETURN',
              quantityChange: item.quantity,
              previousStock: prev,
              newStock: next,
              referenceDoc: inv.invoiceNumber,
              reason: `Approval #${approval.id}: Bill cancellation by ${user.name}`,
              recordedBy: user.id,
              recordedByName: user.name,
              timestamp,
            });
          }
        }
        db.updateInvoice(inv.id, {
          status: 'cancelled',
          cancellationReason: approval.reason,
          cancelledAt: timestamp,
          cancelledBy: user.id,
          cancelledByName: user.name,
        });
      }
    } else if (approval.actionType === 'STOCK_ADJUSTMENT') {
      const prod = db.getProductById(approval.targetEntityId);
      if (prod) {
        const delta = approval.requestedValues.quantityChange;
        const prev = prod.stockQuantity;
        const next = prev + delta;
        db.updateProduct(prod.id, { stockQuantity: next });

        db.addInventoryMovement({
          id: `mov_${Date.now()}`,
          productId: prod.id,
          sku: prod.sku,
          productName: prod.name,
          movementType: 'MANUAL_ADJUSTMENT',
          quantityChange: delta,
          previousStock: prev,
          newStock: next,
          referenceDoc: `APPR-${approval.id}`,
          reason: `Approved adjustment: ${approval.reason}`,
          recordedBy: user.id,
          recordedByName: user.name,
          timestamp,
        });
      }
    }
  }

  const updated = db.updateApprovalRequest(id, {
    status,
    reviewedBy: user.id,
    reviewedByName: user.name,
    reviewedAt: timestamp,
    reviewComments: reviewComments?.trim(),
  });

  db.logAudit({
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    action: `APPROVAL_${status}`,
    entity: 'APPROVAL',
    entityId: id,
    details: `${status} request #${id} for ${approval.actionType} (${approval.targetEntityRef}). Comment: ${reviewComments || 'None'}`,
    status: 'SUCCESS',
  });

  return res.json({ message: `Request successfully ${status.toLowerCase()}.`, request: updated });
});

// ==========================================
// EMPLOYEE MANAGEMENT (ADMIN ONLY)
// ==========================================

apiRouter.get('/employees', authenticate, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const users = db.getUsers().map(sanitizeUser);
  return res.json(users);
});

apiRouter.post('/employees', authenticate, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { name, email, phone, role = 'employee', permissions = [], password = 'password123' } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required.' });
  }

  const existing = db.findUserByEmail(email);
  if (existing) {
    return res.status(400).json({ error: 'User with this email already exists.' });
  }

  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(password, salt);

  const newEmp: UserWithPasswordHash = {
    id: `usr_${Date.now()}`,
    name: name.trim(),
    email: email.trim().toLowerCase(),
    phone: phone?.trim(),
    role,
    permissions,
    status: 'active',
    employeeCode: `EMP-${Math.floor(100 + Math.random() * 900)}`,
    createdAt: new Date().toISOString(),
    passwordHash,
  };

  db.addUser(newEmp);

  db.logAudit({
    userId: req.user!.id,
    userName: req.user!.name,
    userRole: req.user!.role,
    action: 'EMPLOYEE_CREATED',
    entity: 'USER',
    entityId: newEmp.id,
    details: `Created user ${newEmp.name} (${newEmp.email}) with role ${newEmp.role}`,
    status: 'SUCCESS',
  });

  return res.status(201).json(sanitizeUser(newEmp));
});

apiRouter.put('/employees/:id', authenticate, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { name, phone, role, permissions, status, password } = req.body;

  const target = db.findUserById(id);
  if (!target) {
    return res.status(404).json({ error: 'Employee not found.' });
  }

  // Prevent self-deactivation of primary admin
  if (id === req.user!.id && status === 'inactive') {
    return res.status(400).json({ error: 'Cannot deactivate your own administrator account.' });
  }

  const updates: Partial<UserWithPasswordHash> = {};
  if (name !== undefined) updates.name = name.trim();
  if (phone !== undefined) updates.phone = phone?.trim();
  if (role !== undefined) updates.role = role;
  if (permissions !== undefined) updates.permissions = permissions;
  if (status !== undefined) updates.status = status;

  if (password && password.trim().length >= 6) {
    const salt = bcrypt.genSaltSync(10);
    updates.passwordHash = bcrypt.hashSync(password.trim(), salt);
  }

  const updated = db.updateUser(id, updates);

  db.logAudit({
    userId: req.user!.id,
    userName: req.user!.name,
    userRole: req.user!.role,
    action: 'EMPLOYEE_UPDATED',
    entity: 'USER',
    entityId: id,
    details: `Updated employee ${target.name}. Changes: ${Object.keys(updates).join(', ')}`,
    status: 'SUCCESS',
  });

  return res.json(sanitizeUser(updated!));
});

// ==========================================
// REPORTS & ANALYTICS
// ==========================================

apiRouter.get('/reports/sales', authenticate, requirePermission('view_sales_reports'), (req: AuthenticatedRequest, res: Response) => {
  const invoices = db.getInvoices().filter((i) => i.status === 'finalized');
  const products = db.getProducts();
  const canViewCosts = req.user!.role === 'admin' || req.user!.permissions.includes('view_purchase_costs');

  // Aggregates
  let totalGross = 0;
  let totalDiscounts = 0;
  let totalTaxable = 0;
  let totalTax = 0;
  let totalRevenue = 0;
  let totalCostOfGoods = 0;

  const productSalesMap = new Map<string, { name: string; sku: string; unitsSold: number; totalSales: number; estimatedCost: number }>();
  const employeeSalesMap = new Map<string, { name: string; billsCount: number; totalRevenue: number }>();

  for (const inv of invoices) {
    totalRevenue += inv.grandTotal;
    totalDiscounts += inv.totalDiscount;
    totalTaxable += inv.totalTaxable;
    totalTax += inv.totalCgst + inv.totalSgst + inv.totalIgst;
    totalGross += inv.subtotal;

    // Employee aggregation
    const empData = employeeSalesMap.get(inv.employeeId) || { name: inv.employeeName, billsCount: 0, totalRevenue: 0 };
    empData.billsCount += 1;
    empData.totalRevenue += inv.grandTotal;
    employeeSalesMap.set(inv.employeeId, empData);

    // Product breakdown
    for (const item of inv.items) {
      const prod = products.find((p) => p.id === item.productId);
      const costPerUnit = prod?.purchaseCost || 0;
      const lineCost = costPerUnit * item.quantity;
      totalCostOfGoods += lineCost;

      const pData = productSalesMap.get(item.productId) || {
        name: item.productName,
        sku: item.sku,
        unitsSold: 0,
        totalSales: 0,
        estimatedCost: 0,
      };
      pData.unitsSold += item.quantity;
      pData.totalSales += item.totalAmount;
      pData.estimatedCost += lineCost;
      productSalesMap.set(item.productId, pData);
    }
  }

  const estimatedProfit = canViewCosts ? totalTaxable - totalCostOfGoods : undefined;
  const profitMarginPercent = canViewCosts && totalTaxable > 0 ? (estimatedProfit! / totalTaxable) * 100 : undefined;

  return res.json({
    summary: {
      totalInvoices: invoices.length,
      totalGross: Number(totalGross.toFixed(2)),
      totalDiscounts: Number(totalDiscounts.toFixed(2)),
      totalTaxable: Number(totalTaxable.toFixed(2)),
      totalTax: Number(totalTax.toFixed(2)),
      totalRevenue: Number(totalRevenue.toFixed(2)),
      totalCostOfGoods: canViewCosts ? Number(totalCostOfGoods.toFixed(2)) : null,
      estimatedProfit: canViewCosts ? Number(estimatedProfit!.toFixed(2)) : null,
      profitMarginPercent: canViewCosts ? Number(profitMarginPercent!.toFixed(1)) : null,
    },
    topProducts: Array.from(productSalesMap.values())
      .sort((a, b) => b.totalSales - a.totalSales)
      .slice(0, 10),
    employeePerformance: Array.from(employeeSalesMap.values()),
  });
});

// ==========================================
// AUDIT LOGS (ADMIN ONLY)
// ==========================================

apiRouter.get('/audit-logs', authenticate, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  return res.json(db.getAuditLogs());
});

// ==========================================
// SETTINGS
// ==========================================

apiRouter.get('/settings', authenticate, (req: AuthenticatedRequest, res: Response) => {
  return res.json(db.getSettings());
});

apiRouter.put('/settings', authenticate, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const updated = db.updateSettings(req.body);

  db.logAudit({
    userId: req.user!.id,
    userName: req.user!.name,
    userRole: req.user!.role,
    action: 'SETTINGS_UPDATED',
    entity: 'SETTINGS',
    entityId: 'GLOBAL',
    details: `Updated business settings. Next invoice sequence: ${updated.invoiceNextNumber}`,
    status: 'SUCCESS',
  });

  return res.json(updated);
});

// System Backup and Demo Reset
apiRouter.get('/system/backup', authenticate, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  return res.json(db.getRawData());
});

apiRouter.post('/system/reset-demo', authenticate, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const resetData = db.resetToDemo();
  return res.json({ message: 'Database reset to initial demo state successfully.', settings: resetData.settings });
});
