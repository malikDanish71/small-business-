const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { after, before, test } = require('node:test');
const { once } = require('node:events');
const { createApp } = require('../server/app');
const { openDatabase } = require('../server/database');

let database;
let server;
let baseUrl;

before(async () => {
  database = openDatabase(':memory:');
  server = createApp(database).listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  database.close();
});

async function request(path, options) {
  const response = await fetch(`${baseUrl}${path}`, options);
  return { response, body: await response.json() };
}

test('health and product routes return seeded data', async () => {
  const health = await request('/api/health');
  const products = await request('/api/products');
  assert.equal(health.body.status, 'ok');
  assert.equal(products.body.length, 9);
  assert.equal(typeof products.body[0].verified, 'boolean');
});

test('agreement route filters and persists a new draft', async () => {
  const filtered = await request('/api/agreements?status=active');
  assert.equal(filtered.body.length, 2);
  const created = await request('/api/agreements', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ product: 'Test item', supplier: 'Test supplier', price: 12.5, quantity: 4, delivery: '2026-12-01', payment: 'Net 30', notes: 'Test terms' })
  });
  assert.equal(created.response.status, 201);
  assert.equal(created.body.status, 'draft');
  assert.equal(database.prepare('SELECT COUNT(*) AS count FROM agreements').get().count, 7);
});

test('quote and RFQ submissions are stored and validated', async () => {
  const quote = await request('/api/quotes', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ productId: 'p1', quantity: 20, city: 'Karachi', paymentTerms: 'Net 30', note: '' })
  });
  assert.equal(quote.response.status, 201);
  assert.equal(database.prepare('SELECT COUNT(*) AS count FROM quotes').get().count, 1);

  const rfq = await request('/api/rfqs', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ product: 'Bulk rice', category: 'food', quantity: 100, budget: 3000, deliveryDate: '2026-12-15', description: 'Test request' })
  });
  assert.equal(rfq.response.status, 201);
  assert.equal(database.prepare('SELECT COUNT(*) AS count FROM rfqs').get().count, 1);

  const invalid = await request('/api/quotes', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ productId: 'p1', quantity: 0, city: 'Karachi', paymentTerms: 'Net 30' })
  });
  assert.equal(invalid.response.status, 400);
});

test('server serves the home page but not project files', async () => {
  const page = await fetch(baseUrl);
  assert.equal(page.status, 200);
  assert.match(await page.text(), /SmartB2B/);
  const hiddenFile = await fetch(`${baseUrl}/server/database.js`);
  assert.equal(hiddenFile.status, 404);
});

test('API writes survive closing and reopening the SQLite database', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'smartb2b-'));
  const filename = path.join(directory, 'test.sqlite');
  let fileDatabase;
  let fileServer;
  try {
    fileDatabase = openDatabase(filename);
    fileServer = createApp(fileDatabase).listen(0);
    await once(fileServer, 'listening');
    const url = `http://127.0.0.1:${fileServer.address().port}`;
    const response = await fetch(`${url}/api/rfqs`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ product: 'Durable test item', category: 'food', quantity: 5, budget: 500, deliveryDate: '2026-12-20' })
    });
    assert.equal(response.status, 201);
    await new Promise((resolve, reject) => fileServer.close((error) => error ? reject(error) : resolve()));
    fileServer = null;
    fileDatabase.close();
    fileDatabase = null;

    const reopened = openDatabase(filename);
    try {
      assert.equal(reopened.prepare('SELECT COUNT(*) AS count FROM rfqs WHERE product = ?').get('Durable test item').count, 1);
    } finally {
      reopened.close();
    }
  } finally {
    if (fileServer) await new Promise((resolve) => fileServer.close(resolve));
    if (fileDatabase) fileDatabase.close();
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
