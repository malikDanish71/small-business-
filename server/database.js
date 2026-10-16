const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');

const seedProducts = [
  ['p1', 'Premium Basmati Rice, 25 kg', 'food', 'City Grain Traders', 'Karachi', 3250, 'per bag', 20, 96, 1, '🌾'],
  ['p2', 'Corrugated Shipping Cartons', 'packaging', 'Prime Packaging Co.', 'Lahore', 185, 'per carton', 50, 91, 1, '📦'],
  ['p3', 'LED Panel Light, 24W', 'electronics', 'Bright Electricals', 'Islamabad', 2450, 'per unit', 10, 88, 1, '💡'],
  ['p4', 'Cotton Fabric, 180 GSM', 'textile', 'Faisalabad Textiles', 'Faisalabad', 680, 'per metre', 100, 94, 1, '🧵'],
  ['p5', 'Industrial Safety Gloves', 'safety', 'SafeWork Supplies', 'Karachi', 320, 'per pair', 25, 76, 1, '🦺'],
  ['p6', 'Food Grade Cleaning Solution', 'chemicals', 'CleanLine Industries', 'Lahore', 890, 'per litre', 20, 82, 0, '🧪'],
  ['p7', 'Commercial Grain Mill', 'machinery', 'AgriTech Equipment', 'Rawalpindi', 78500, 'per unit', 1, 68, 1, '⚙️'],
  ['p8', 'Sunflower Cooking Oil, 16 L', 'food', 'Harvest Foods', 'Peshawar', 7400, 'per tin', 12, 89, 1, '🫙'],
  ['p9', 'Kraft Paper Shopping Bags', 'packaging', 'EcoPack Pakistan', 'Karachi', 28, 'per bag', 500, 55, 0, '🛍️']
];

const seedAgreements = [
  ['AG-2847', 'active', 'Rice, 25 kg bags', 'Northside Grocers', 'City Grain Traders', 3250, 120, '2026-10-24', '50% Advance, 50% on Delivery', '', '2026-10-12'],
  ['AG-2846', 'negotiating', 'Recycled shipping cartons', 'Pak Parcel Supply', 'Prime Packaging Co.', 185, 800, '2026-11-02', 'Net 30', '', '2026-10-11'],
  ['AG-2842', 'draft', 'LED panel lights', 'Metro Electrical Store', 'Bright Electricals', 2450, 60, '2026-11-10', 'Payment on Delivery', '', '2026-10-09'],
  ['AG-2839', 'completed', 'Cotton fabric rolls', 'Sana Garments', 'Faisalabad Textiles', 680, 240, '2026-10-04', 'Full Advance', '', '2026-10-01'],
  ['AG-2836', 'active', 'Basmati rice, 25 kg bags', 'Green Basket Market', 'City Grain Traders', 4100, 80, '2026-10-28', '50% Advance, 50% on Delivery', '', '2026-09-29'],
  ['AG-2831', 'negotiating', 'Food-grade pouches', 'Daily Pantry', 'Prime Packaging Co.', 32, 2500, '2026-11-16', 'Net 30', '', '2026-09-25']
];

function openDatabase(filename = path.join(__dirname, '..', 'data', 'smartb2b.sqlite')) {
  if (filename !== ':memory:') fs.mkdirSync(path.dirname(filename), { recursive: true });
  const db = new Database(filename);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      supplier TEXT NOT NULL,
      city TEXT NOT NULL,
      price REAL NOT NULL CHECK (price >= 0),
      unit TEXT NOT NULL,
      moq INTEGER NOT NULL CHECK (moq > 0),
      trust INTEGER NOT NULL CHECK (trust BETWEEN 0 AND 100),
      verified INTEGER NOT NULL CHECK (verified IN (0, 1)),
      icon TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS agreements (
      id TEXT PRIMARY KEY,
      status TEXT NOT NULL CHECK (status IN ('active', 'negotiating', 'draft', 'completed')),
      product TEXT NOT NULL,
      buyer TEXT NOT NULL,
      supplier TEXT NOT NULL,
      price REAL NOT NULL CHECK (price >= 0),
      quantity INTEGER NOT NULL CHECK (quantity > 0),
      delivery TEXT NOT NULL,
      payment TEXT NOT NULL,
      notes TEXT NOT NULL DEFAULT '',
      date TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS quotes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id TEXT NOT NULL REFERENCES products(id),
      quantity INTEGER NOT NULL CHECK (quantity > 0),
      city TEXT NOT NULL,
      payment_terms TEXT NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS rfqs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product TEXT NOT NULL,
      category TEXT NOT NULL,
      quantity INTEGER NOT NULL CHECK (quantity > 0),
      budget REAL NOT NULL CHECK (budget >= 0),
      delivery_date TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'open',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const insertProduct = db.prepare(`INSERT OR IGNORE INTO products
    (id, name, category, supplier, city, price, unit, moq, trust, verified, icon)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const insertAgreement = db.prepare(`INSERT OR IGNORE INTO agreements
    (id, status, product, buyer, supplier, price, quantity, delivery, payment, notes, date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const seed = db.transaction(() => {
    seedProducts.forEach((product) => insertProduct.run(...product));
    seedAgreements.forEach((agreement) => insertAgreement.run(...agreement));
  });
  seed();
  return db;
}

module.exports = { openDatabase };
