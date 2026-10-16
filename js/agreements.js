let agreementRecords = [];
let agreementFilter = 'all';
let agreementQuery = '';
const escapeAgreement = (value) => String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const formatPKR = (value) => `PKR ${Number(value).toLocaleString()}`;

function renderAgreements() {
  const list = document.getElementById('agreementsList');
  if (!list) return;
  const visible = agreementRecords.filter((agreement) => {
    const matchesStatus = agreementFilter === 'all' || agreement.status === agreementFilter;
    const haystack = `${agreement.id} ${agreement.product} ${agreement.buyer} ${agreement.supplier}`.toLowerCase();
    return matchesStatus && haystack.includes(agreementQuery);
  });
  list.innerHTML = visible.length ? visible.map((agreement) => {
    const stages = ['Draft', 'Negotiation', 'Signed'];
    const currentStage = agreement.status === 'completed' || agreement.status === 'active' ? 2 : agreement.status === 'negotiating' ? 1 : 0;
    return `<article class="agreement-card ${agreement.status}" data-agreement-id="${agreement.id}" tabindex="0" role="button" aria-label="View agreement ${agreement.id}">
      <div class="ag-card-header"><div><div class="ag-card-id">${agreement.id} · ${escapeAgreement(agreement.product)}</div><div class="ag-card-date">Created ${escapeAgreement(agreement.date)}</div></div><div class="ag-card-badges"><span class="status-badge ${agreement.status}">${agreement.status}</span></div></div>
      <div class="ag-card-parties"><div class="ag-party"><span class="ag-party-avatar" style="background:#40886f">${escapeAgreement(agreement.buyer.slice(0, 2).toUpperCase())}</span><div class="ag-party-info"><div class="ag-party-name">${escapeAgreement(agreement.buyer)}</div><div class="ag-party-role">Buyer</div></div></div><span class="ag-arrow">→</span><div class="ag-party"><span class="ag-party-avatar" style="background:#a66e35">${escapeAgreement(agreement.supplier.slice(0, 2).toUpperCase())}</span><div class="ag-party-info"><div class="ag-party-name">${escapeAgreement(agreement.supplier)}</div><div class="ag-party-role">Supplier</div></div></div></div>
      <div class="ag-card-details"><div class="ag-detail-item"><div class="ag-detail-label">Agreed price</div><div class="ag-detail-value">${formatPKR(agreement.price)} / unit</div></div><div class="ag-detail-item"><div class="ag-detail-label">Quantity</div><div class="ag-detail-value">${Number(agreement.quantity).toLocaleString()} units</div></div><div class="ag-detail-item"><div class="ag-detail-label">Delivery date</div><div class="ag-detail-value">${escapeAgreement(agreement.delivery)}</div></div><div class="ag-detail-item"><div class="ag-detail-label">Payment</div><div class="ag-detail-value">${escapeAgreement(agreement.payment)}</div></div></div>
      <div class="ag-card-footer"><div class="ag-timeline">${stages.map((stage, index) => `<div class="ag-step"><span class="ag-step-dot ${index < currentStage ? 'done' : index === currentStage ? 'current' : ''}"></span><span class="ag-step-label">${stage}</span>${index < stages.length - 1 ? `<span class="ag-step-line ${index < currentStage ? 'done' : ''}"></span>` : ''}</div>`).join('')}</div><div class="ag-actions"><button class="ag-action-btn primary" type="button">View details</button></div></div>
    </article>`;
  }).join('') : '<p class="empty-state">No agreements match this search.</p>';
  list.querySelectorAll('[data-agreement-id]').forEach((card) => {
    const open = () => showAgreement(card.dataset.agreementId);
    card.addEventListener('click', open);
    card.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(); }
    });
  });
  updateAgreementCounts();
}

function updateAgreementCounts() {
  document.querySelectorAll('.ag-tab').forEach((tab) => {
    const status = tab.getAttribute('onclick')?.match(/filterAgreements\('([^']+)'/)?.[1];
    if (!status) return;
    const label = status === 'all' ? 'All' : status[0].toUpperCase() + status.slice(1);
    tab.textContent = `${label} (${status === 'all' ? agreementRecords.length : agreementRecords.filter((agreement) => agreement.status === status).length})`;
  });
  document.querySelectorAll('.ag-stat').forEach((stat) => {
    const label = stat.querySelector('.ag-stat-label')?.textContent.trim().toLowerCase();
    const key = label === 'negotiating' ? 'negotiating' : label === 'draft' ? 'draft' : label === 'completed' ? 'completed' : 'active';
    const number = stat.querySelector('.ag-stat-num');
    if (number) number.textContent = String(agreementRecords.filter((agreement) => agreement.status === key).length).padStart(2, '0');
  });
}

function showAgreement(id) {
  const agreement = agreementRecords.find((record) => record.id === id);
  if (!agreement) return;
  document.getElementById('agModalTitle').textContent = `${agreement.id} · ${agreement.product}`;
  document.getElementById('agModalStatus').innerHTML = `<span class="status-badge ${agreement.status}">${agreement.status}</span>`;
  document.getElementById('agModalBody').innerHTML = `<section class="ag-detail-section"><h3 class="ag-detail-section-title">Trade terms</h3><div class="ag-terms-grid"><div class="ag-term-item"><div class="ag-term-label">Buyer</div><div class="ag-term-value">${escapeAgreement(agreement.buyer)}</div></div><div class="ag-term-item"><div class="ag-term-label">Supplier</div><div class="ag-term-value">${escapeAgreement(agreement.supplier)}</div></div><div class="ag-term-item"><div class="ag-term-label">Price and quantity</div><div class="ag-term-value">${formatPKR(agreement.price)} × ${Number(agreement.quantity).toLocaleString()}</div></div><div class="ag-term-item"><div class="ag-term-label">Delivery</div><div class="ag-term-value">${escapeAgreement(agreement.delivery)}</div></div><div class="ag-term-item"><div class="ag-term-label">Payment</div><div class="ag-term-value">${escapeAgreement(agreement.payment)}</div></div></div></section><section class="ag-detail-section"><h3 class="ag-detail-section-title">Agreement history</h3><div class="version-history"><div class="version-item"><span class="version-dot"></span><div class="version-info"><div class="version-action">Draft created</div><div class="version-by">${escapeAgreement(agreement.date)} · Buyer</div></div></div><div class="version-item"><span class="version-dot"></span><div class="version-info"><div class="version-action">Status: ${escapeAgreement(agreement.status)}</div><div class="version-by">Latest agreement update</div></div></div></div></section>`;
  window.openModal('agDetailModal');
}

window.filterAgreements = function (status, button) {
  agreementFilter = status;
  document.querySelectorAll('.ag-tab').forEach((tab) => tab.classList.remove('active'));
  button?.classList.add('active');
  renderAgreements();
};
window.searchAgreements = function (value) { agreementQuery = value.trim().toLowerCase(); renderAgreements(); };
window.createAgreement = async function () {
  const modal = document.getElementById('newAgreementModal');
  const fields = modal.querySelectorAll('input, select, textarea');
  const [productInput, supplierInput, priceInput, quantityInput, deliveryInput, paymentInput, termsInput] = fields;
  if (!productInput.value.trim() || !priceInput.value || !quantityInput.value) {
    window.alert('Enter a product, price, and quantity to create a draft.');
    return;
  }
  try {
    const response = await fetch('/api/agreements', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        product: productInput.value.trim(), supplier: supplierInput.value, price: Number(priceInput.value),
        quantity: Number(quantityInput.value), delivery: deliveryInput.value, payment: paymentInput.value,
        notes: termsInput.value.trim()
      })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Could not create agreement.');
    agreementRecords.unshift(result);
    window.closeModal('newAgreementModal');
    modal.querySelectorAll('input, textarea').forEach((field) => { field.value = ''; });
    agreementFilter = 'all';
    document.querySelectorAll('.ag-tab').forEach((tab) => tab.classList.toggle('active', tab.textContent.startsWith('All')));
    renderAgreements();
  } catch (error) {
    window.alert(error.message);
  }
};

async function loadAgreements() {
  const response = await fetch('/api/agreements');
  if (!response.ok) throw new Error('Could not load agreements from the server.');
  agreementRecords = await response.json();
  renderAgreements();
}

loadAgreements().catch((error) => {
  const list = document.getElementById('agreementsList');
  if (list) list.innerHTML = `<p class="empty-state">${escapeAgreement(error.message)} Start the site with <code>npm run dev</code>.</p>`;
});
