const path = require('node:path');
const express = require('express');
const helmet = require('helmet');

const projectRoot = path.join(__dirname, '..');
const htmlPages = new Set(['index.html', 'marketplace.html', 'agreements.html', 'coming-soon.html', 'requirement.html']);

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function requiredText(body, key, maxLength, label = key) {
  const value = typeof body[key] === 'string' ? body[key].trim() : '';
  if (!value || value.length > maxLength) throw new HttpError(400, `${label} is required and must be under ${maxLength} characters.`);
  return value;
}

function positiveNumber(body, key, label = key) {
  const value = Number(body[key]);
  if (!Number.isFinite(value) || value <= 0) throw new HttpError(400, `${label} must be a number greater than zero.`);
  return value;
}

function createApp(db) {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(express.json({ limit: '32kb' }));

  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

  app.get('/api/products', (req, res) => {
    const products = db.prepare(`SELECT id, name, category, supplier, city, price, unit, moq, trust,
      verified, icon FROM products ORDER BY name`).all().map((product) => ({ ...product, verified: Boolean(product.verified) }));
    res.json(products);
  });

  app.get('/api/agreements', (req, res) => {
    const { status, q } = req.query;
    const clauses = [];
    const params = [];
    if (typeof status === 'string' && ['active', 'negotiating', 'draft', 'completed'].includes(status)) {
      clauses.push('status = ?');
      params.push(status);
    }
    if (typeof q === 'string' && q.trim()) {
      const term = `%${q.trim().slice(0, 100)}%`;
      clauses.push('(id LIKE ? OR product LIKE ? OR buyer LIKE ? OR supplier LIKE ?)');
      params.push(term, term, term, term);
    }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    res.json(db.prepare(`SELECT id, status, product, buyer, supplier, price, quantity, delivery, payment, notes, date
      FROM agreements ${where} ORDER BY date DESC, id DESC`).all(...params));
  });

  app.post('/api/agreements', (req, res) => {
    const body = req.body || {};
    const product = requiredText(body, 'product', 160, 'Product');
    const supplier = requiredText(body, 'supplier', 120, 'Supplier');
    const price = positiveNumber(body, 'price', 'Price');
    const quantity = positiveNumber(body, 'quantity', 'Quantity');
    if (!Number.isInteger(quantity)) throw new HttpError(400, 'Quantity must be a whole number.');
    const payment = requiredText(body, 'payment', 120, 'Payment terms');
    const delivery = typeof body.delivery === 'string' && body.delivery.trim() ? body.delivery.trim().slice(0, 30) : 'To be confirmed';
    const notes = typeof body.notes === 'string' ? body.notes.trim().slice(0, 2000) : '';
    const id = `AG-${Date.now().toString(36).toUpperCase()}-${require('node:crypto').randomBytes(2).toString('hex').toUpperCase()}`;
    const date = new Date().toISOString().slice(0, 10);
    db.prepare(`INSERT INTO agreements (id, status, product, buyer, supplier, price, quantity, delivery, payment, notes, date)
      VALUES (?, 'draft', ?, 'Your Business', ?, ?, ?, ?, ?, ?, ?)`).run(id, product, supplier, price, quantity, delivery, payment, notes, date);
    const agreement = db.prepare('SELECT * FROM agreements WHERE id = ?').get(id);
    res.status(201).json(agreement);
  });

  app.post('/api/quotes', (req, res) => {
    const body = req.body || {};
    const productId = requiredText(body, 'productId', 80, 'Product');
    const quantity = positiveNumber(body, 'quantity', 'Quantity');
    if (!Number.isInteger(quantity)) throw new HttpError(400, 'Quantity must be a whole number.');
    const city = requiredText(body, 'city', 80, 'Delivery city');
    const paymentTerms = requiredText(body, 'paymentTerms', 120, 'Payment terms');
    const note = typeof body.note === 'string' ? body.note.trim().slice(0, 2000) : '';
    const product = db.prepare('SELECT id FROM products WHERE id = ?').get(productId);
    if (!product) throw new HttpError(404, 'Product was not found.');
    const result = db.prepare(`INSERT INTO quotes (product_id, quantity, city, payment_terms, note)
      VALUES (?, ?, ?, ?, ?)`).run(productId, quantity, city, paymentTerms, note);
    res.status(201).json({ id: result.lastInsertRowid, status: 'submitted' });
  });

  app.post('/api/rfqs', (req, res) => {
    const body = req.body || {};
    const product = requiredText(body, 'product', 160, 'Product');
    const category = requiredText(body, 'category', 80, 'Category');
    const quantity = positiveNumber(body, 'quantity', 'Quantity');
    if (!Number.isInteger(quantity)) throw new HttpError(400, 'Quantity must be a whole number.');
    const budget = positiveNumber(body, 'budget', 'Budget');
    const deliveryDate = requiredText(body, 'deliveryDate', 30, 'Delivery date');
    const description = typeof body.description === 'string' ? body.description.trim().slice(0, 2000) : '';
    const result = db.prepare(`INSERT INTO rfqs (product, category, quantity, budget, delivery_date, description)
      VALUES (?, ?, ?, ?, ?, ?)`).run(product, category, quantity, budget, deliveryDate, description);
    res.status(201).json({ id: result.lastInsertRowid, status: 'open' });
  });

  app.use('/css', express.static(path.join(projectRoot, 'css'), { fallthrough: false, maxAge: '1h' }));
  app.use('/js', express.static(path.join(projectRoot, 'js'), { fallthrough: false, maxAge: '1h' }));
  app.get(['/', ...[...htmlPages].map((page) => `/${page}`)], (req, res) => {
    const page = req.path === '/' ? 'index.html' : path.basename(req.path);
    if (!htmlPages.has(page)) return res.sendStatus(404);
    res.sendFile(path.join(projectRoot, page));
  });

  app.use('/api', (req, res) => res.status(404).json({ error: 'API route not found.' }));
  app.use((req, res) => res.status(404).send('Page not found.'));
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
      return res.status(400).json({ error: 'Request body must be valid JSON.' });
    }
    if (error instanceof HttpError) return res.status(error.status).json({ error: error.message });
    if (error.code && String(error.code).startsWith('SQLITE_CONSTRAINT')) {
      return res.status(400).json({ error: 'The submitted data does not satisfy the database constraints.' });
    }
    console.error(error);
    return res.status(500).json({ error: 'An unexpected server error occurred.' });
  });

  return app;
}

module.exports = { createApp };
