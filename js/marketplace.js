let products = [];
let selectedCategory = 'all';
let visibleProducts = [];
let currentPage = 1;
let selectedQuoteProductId = null;
const savedProducts = new Set();
const money = (amount) => `PKR ${Number(amount).toLocaleString()}`;
const escapeProduct = (value) => String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);

function applyProductFilters() {
  const query = document.getElementById('searchInput')?.value.trim().toLowerCase() || '';
  const city = document.getElementById('locationFilter')?.value || '';
  const minPrice = Number(document.getElementById('priceMin')?.value || 0);
  const maxPrice = Number(document.getElementById('priceMax')?.value || Infinity);
  const verifiedOnly = document.getElementById('fVerified')?.checked;
  const pendingOnly = document.getElementById('fPending')?.checked;
  const moq = document.querySelector('input[name="moq"]:checked')?.value || 'any';
  const locationGroup = [...document.querySelectorAll('.filter-group')].find((group) => group.querySelector('.filter-group-label')?.textContent.trim() === 'Location');
  const selectedLocations = [...(locationGroup?.querySelectorAll('input[type="checkbox"]') || [])]
    .filter((input) => input.checked)
    .map((input) => input.closest('label').textContent.trim().split(/\s+/)[0].toLowerCase());
  const trustChecks = [
    { id: 'fHigh', test: (score) => score >= 80 },
    { id: 'fMed', test: (score) => score >= 60 && score < 80 },
    { id: 'fLow', test: (score) => score < 60 }
  ].filter((filter) => document.getElementById(filter.id)?.checked);

  visibleProducts = products.filter((product) => {
    const matchesQuery = `${product.name} ${product.supplier} ${product.category}`.toLowerCase().includes(query);
    const matchesCity = !city || product.city === city;
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    const matchesVerification = !(verifiedOnly || pendingOnly) || (verifiedOnly && product.verified) || (pendingOnly && !product.verified);
    const matchesTrust = trustChecks.length === 0 || trustChecks.some((filter) => filter.test(product.trust));
    const matchesMoq = moq === 'any' || (moq === 'small' && product.moq <= 50) || (moq === 'medium' && product.moq > 50 && product.moq <= 200) || (moq === 'bulk' && product.moq > 200);
    const matchesLocationFilters = selectedLocations.length === 0 || selectedLocations.includes(product.city.toLowerCase());
    return matchesQuery && matchesCity && matchesCategory && matchesVerification && matchesTrust && matchesMoq && matchesLocationFilters && product.price >= minPrice && product.price <= maxPrice;
  });
  sortProducts(false);
}

function renderProducts() {
  const grid = document.getElementById('productsGrid');
  if (!grid) return;
  const count = document.getElementById('productCountDisplay');
  if (count) count.textContent = String(visibleProducts.length);
  grid.innerHTML = visibleProducts.length ? visibleProducts.map((product) => `<article class="product-card">
    <div class="product-image">${product.icon}<span class="product-trust-badge ${product.verified ? 'verified' : 'pending'}">${product.verified ? '✓ Verified' : 'Review pending'}</span></div>
    <div class="product-info"><div class="product-category">${escapeProduct(product.category)}</div><div class="product-name">${escapeProduct(product.name)}</div>
    <div class="product-supplier"><span class="supplier-avatar">${escapeProduct(product.supplier.slice(0, 1))}</span>${escapeProduct(product.supplier)} · ${escapeProduct(product.city)}</div>
    <div class="product-pricing"><span class="product-price">${money(product.price)}</span><span class="product-unit">${escapeProduct(product.unit)}</span></div>
    <div class="product-meta"><span class="meta-tag">Min. order ${product.moq}</span><span class="meta-tag">Trust ${product.trust}/100</span></div>
    <div class="product-footer"><button class="btn-quote" type="button" data-quote-id="${product.id}">Request quote</button><button class="btn-save ${savedProducts.has(product.id) ? 'saved' : ''}" type="button" data-save-id="${product.id}" aria-label="${savedProducts.has(product.id) ? 'Remove saved product' : 'Save product'}">${savedProducts.has(product.id) ? '♥' : '♡'}</button></div></div>
  </article>`).join('') : '<p class="empty-state">No products match these filters.</p>';
  grid.querySelectorAll('[data-quote-id]').forEach((button) => button.addEventListener('click', () => openQuote(button.dataset.quoteId)));
  grid.querySelectorAll('[data-save-id]').forEach((button) => button.addEventListener('click', () => {
    const id = button.dataset.saveId;
    if (savedProducts.has(id)) savedProducts.delete(id); else savedProducts.add(id);
    renderProducts();
  }));
}

window.filterProducts = applyProductFilters;
window.applyFilters = applyProductFilters;
window.filterCat = function (category, button) {
  selectedCategory = category;
  document.querySelectorAll('.category-pill').forEach((pill) => pill.classList.remove('active'));
  button?.classList.add('active');
  applyProductFilters();
};
window.clearFilters = function () {
  document.querySelectorAll('.filter-sidebar input[type="checkbox"]').forEach((input) => { input.checked = false; });
  const verified = document.getElementById('fVerified');
  if (verified) verified.checked = true;
  document.getElementById('priceMin').value = '0';
  document.getElementById('priceMax').value = '50000';
  document.getElementById('locationFilter').value = '';
  document.querySelector('input[name="moq"][value="any"]')?.click();
  window.filterCat('all', document.querySelector('.category-pill[data-cat="all"]'));
};
window.sortProducts = function () {
  const sort = document.getElementById('sortSelect')?.value;
  if (sort === 'price-asc') visibleProducts.sort((left, right) => left.price - right.price);
  else if (sort === 'price-desc') visibleProducts.sort((left, right) => right.price - left.price);
  else if (sort === 'trust') visibleProducts.sort((left, right) => right.trust - left.trust);
  else if (sort === 'newest') visibleProducts.reverse();
  renderProducts();
};
window.setView = function (view, button) {
  document.getElementById('productsGrid')?.classList.toggle('list-view', view === 'list');
  document.querySelectorAll('.view-btn').forEach((item) => item.classList.remove('active'));
  button?.classList.add('active');
};
window.changePage = function (direction) {
  currentPage = Math.max(1, currentPage + direction);
  const activePage = document.querySelector('.pagination .page-btn.active');
  if (activePage) activePage.textContent = String(currentPage);
};

function openQuote(productId) {
  const product = products.find((item) => item.id === productId);
  if (!product) return;
  selectedQuoteProductId = product.id;
  document.getElementById('quoteProductName').textContent = product.name;
  document.getElementById('quoteSupplierName').textContent = `${product.supplier} · ${product.city}`;
  document.getElementById('qUnitPrice').textContent = money(product.price);
  document.getElementById('quoteQty').value = String(product.moq);
  window.calcQuote();
  window.openModal('quoteModal');
}
window.calcQuote = function () {
  const quantity = Math.max(0, Number(document.getElementById('quoteQty')?.value || 0));
  const unitPriceText = document.getElementById('qUnitPrice')?.textContent || '';
  const unitPrice = Number(unitPriceText.replace(/[^\d.]/g, '')) || 0;
  const subtotal = quantity * unitPrice;
  const total = subtotal;
  document.getElementById('qQty').textContent = quantity.toLocaleString();
  document.getElementById('qSubtotal').textContent = money(subtotal);
  document.getElementById('qTotal').textContent = money(total);
};
window.submitQuote = async function () {
  const product = products.find((item) => item.id === selectedQuoteProductId);
  if (!product || Number(document.getElementById('quoteQty').value) < 1) {
    window.alert('Choose a product and enter a quantity greater than zero.');
    return;
  }
  try {
    const response = await fetch('/api/quotes', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        productId: selectedQuoteProductId,
        quantity: Number(document.getElementById('quoteQty').value),
        city: document.getElementById('quoteCity').value,
        paymentTerms: document.getElementById('quotePayment').value,
        note: document.getElementById('quoteNote').value
      })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Could not submit quote request.');
    window.closeModal('quoteModal');
    window.alert(`Quote request #${result.id} was saved.`);
  } catch (error) {
    window.alert(error.message);
  }
};
window.submitRFQ = async function () {
  const fields = [...document.querySelectorAll('#rfqModal input, #rfqModal select, #rfqModal textarea')];
  const [product, categoryLabel, quantity, budget, deliveryDate, description] = fields;
  const category = ({ 'food & grain': 'food', electronics: 'electronics', textiles: 'textile', 'safety equipment': 'safety' })[categoryLabel.value.toLowerCase()] || categoryLabel.value.toLowerCase();
  try {
    const response = await fetch('/api/rfqs', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ product: product.value, category, quantity: Number(quantity.value), budget: Number(budget.value), deliveryDate: deliveryDate.value, description: description.value })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Could not post RFQ.');
    window.closeModal('rfqModal');
    window.alert(`RFQ #${result.id} was saved.`);
  } catch (error) {
    window.alert(error.message);
  }
};

async function loadProducts() {
  const response = await fetch('/api/products');
  if (!response.ok) throw new Error('Could not load products from the server.');
  products = await response.json();
  visibleProducts = products.slice();
  renderProducts();
}

loadProducts().catch((error) => {
  const grid = document.getElementById('productsGrid');
  if (grid) grid.innerHTML = `<p class="empty-state">${escapeProduct(error.message)} Start the site with <code>npm run dev</code>.</p>`;
});
