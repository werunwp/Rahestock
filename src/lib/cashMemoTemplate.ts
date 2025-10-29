import { BusinessSettings } from "@/hooks/useBusinessSettings";
import { SystemSettings } from "@/hooks/useSystemSettings";

interface SaleData {
  id: string;
  invoice_number: string;
  created_at: string;
  customer_name: string;
  customer_phone?: string;
  customer_address?: string;
  customer_email?: string;
  subtotal: number;
  discount_percent?: number;
  discount_amount?: number;
  grand_total: number;
  amount_paid?: number;
  amount_due?: number;
  payment_method: string;
  courier_name?: string;
  additional_info?: string;
  sale_items?: Array<{
    id: string;
    product_name: string;
    quantity: number;
    rate: number;
    total: number;
    variant_id?: string;
  }>;
}

// Function to format currency
const formatCurrency = (amount: number, currencySymbol: string = '৳'): string => {
  return `${currencySymbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// Function to format date
const formatDate = (dateString: string, format: string = 'dd/MM/yyyy'): string => {
  const date = new Date(dateString);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  
  return format
    .replace('dd', day)
    .replace('MM', month)
    .replace('yyyy', year.toString());
};

// Generate Cash Memo HTML
export const generateCashMemoHTML = (
  sale: SaleData,
  businessSettings: BusinessSettings,
  systemSettings: SystemSettings
): string => {
  const currencySymbol = systemSettings.currency_symbol || '৳';
  
  // Prepare items - ensure we always have exactly 14 rows
  const items = sale.sale_items || [];
  const itemRows = [];
  
  for (let i = 0; i < 14; i++) {
    if (i < items.length) {
      const item = items[i];
      itemRows.push(`
        <tr>
          <td class="col-sl">${String(i + 1).padStart(2, '0')}</td>
          <td class="col-desc">${item.product_name}</td>
          <td class="col-qty">${item.quantity}</td>
          <td class="col-price">${formatCurrency(item.rate, currencySymbol)}</td>
          <td class="col-amount">${formatCurrency(item.total, currencySymbol)}</td>
        </tr>
      `);
    } else {
      // Empty rows to fill up to 14
      itemRows.push(`
        <tr>
          <td class="col-sl">${String(i + 1).padStart(2, '0')}</td>
          <td class="col-desc"></td>
          <td class="col-qty"></td>
          <td class="col-price"></td>
          <td class="col-amount"></td>
        </tr>
      `);
    }
  }

  const html = `
<!DOCTYPE html>
<html lang="bn">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Cash Memo - ${sale.invoice_number}</title>
<style>
/* ---- PRINT SETUP ---- */
@page { size: A5 portrait; margin: 10mm; }
@media print {
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
/* ---- BASE ---- */
:root{
  --brand:#1f8a3b;      /* main green */
  --brand-dark:#0d5a25; /* deeper green */
  --line:#1f8a3b;       /* table lines */
  --ink:#0a0a0a;
  --muted:#3d3d3d;
  --bg:#eff8f0;         /* very light green tint */
}
*{ box-sizing:border-box; }
html,body{ height:100%; }
body{
  margin:0;
  padding:20px;
  font: 10px/1.3 system-ui, -apple-system, Segoe UI, Roboto, "Noto Sans Bengali", "SolaimanLipi", Arial, sans-serif;
  color:var(--ink);
  background:#e5e7eb;
  display:flex;
  justify-content:center;
  align-items:flex-start;
  min-height:100vh;
}
.memo{
  width: 148mm;
  height: 210mm;
  max-width: 148mm;
  border: 1px solid var(--brand);
  background: #fff;
  position:relative;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  display:flex;
  flex-direction:column;
}
.content-wrapper{
  flex:1;
  display:flex;
  flex-direction:column;
  justify-content:space-between;
}
@media print{
  body{
    background:#fff;
    padding:0;
  }
  .memo{
    box-shadow:none;
  }
}
.title-top{
  text-align:center;
  text-transform:uppercase;
  font-weight:800;
  color:var(--brand-dark);
  letter-spacing:3px;
  font-size:20px;
  padding:2mm 8mm 1mm;
  background: var(--bg);
  border:2px solid var(--brand);
  border-bottom:none;
}
.header{
  display:grid;
  grid-template-columns: auto 1fr;
  align-items:center;
  gap:6mm;
  padding:4mm 8mm;
  background: var(--bg);
  border:2px solid var(--brand);
  border-top:none;
}
.header-left{
  display:flex;
  align-items:center;
  gap:4mm;
}
.header-left .brand{
  font-weight:800;
  letter-spacing:.8px;
  color:var(--brand-dark);
  font-size:18px;
  line-height:1.1;
}
.header-left .tag{
  font-size:7px;
  color:var(--muted);
  max-width:45mm;
  line-height:1.3;
}
.logo{
  width:16mm; height:16mm; background:#fff; border:2px solid var(--brand); border-radius:50%;
  display:grid; place-items:center;
  flex-shrink:0;
  overflow:hidden;
}
.logo img{
  width:100%;
  height:100%;
  object-fit:cover;
  border-radius:50%;
}
.logo svg{ width:10mm; height:10mm; fill:var(--brand); }
.header-right{
  text-align:left;
  font-size:10px;
  line-height:1.5;
}
.header-right .row{
  white-space:nowrap;
  margin-bottom:1mm;
}
.header-right .row:last-child{
  margin-bottom:0;
}

.serial{
  font-size:9px;
}
.serial b{ color:var(--brand-dark); padding-left:2mm; }

/* Items table */
.table-wrap{ padding:2mm 6mm 2mm; }
table.items{
  width:100%; border-collapse:collapse; table-layout:fixed;
  border:1px solid var(--line);
}
.items th, .items td{
  border:1px solid var(--line);
  padding:1.8mm 1.5mm;
  font-size:9px;
}
.items thead th{
  background:rgba(31,138,59,.08);
  font-weight:700; text-transform:capitalize;
}
.col-sl{ width:8%; text-align:center; }
.col-desc{ width:52%; }
.col-qty{ width:12%; text-align:center; }
.col-price{ width:14%; text-align:center; }
.col-amount{ width:14%; text-align:center; }

/* Totals block */
.totals{
  display:flex;
  justify-content:flex-end;
  gap:4mm; margin-top:2mm; align-items:start;
}
.totals:has(.left-section){
  display:grid; grid-template-columns: 1fr 45mm;
}
.left-section{
  display:flex;
  flex-direction:column;
  gap:2mm;
}
.note{
  font-size:10px; color:var(--muted);
}
.courier-name{
  font-size:22px;
  color:var(--ink);
  font-weight:700;
}
.additional-info{
  font-size:11px;
  color:var(--muted);
  font-style:italic;
  margin-top:1mm;
}
.sum{
  border:1px solid var(--line);
}
.sum .row{
  display:grid; grid-template-columns: 1fr 1fr; border-bottom:1px solid var(--line);
}
.sum .row:last-child{ border-bottom:0; }
.sum .row .k{
  padding:2mm; background:rgba(31,138,59,.06); font-weight:700; font-size:11px;
}
.sum .row .v{
  padding:2mm; text-align:right; font-variant-numeric: tabular-nums; font-size:11px;
}

/* Signatures */
.signs{
  display:grid; grid-template-columns:1fr 1fr; gap:8mm;
  padding:2mm 6mm 1mm;
  margin-top:auto;
}
.sig{
  position:relative; padding-top:7mm; text-align:center; font-size:8px; color:var(--muted);
}
.sig:before{
  content:""; position:absolute; left:0; right:0; top:3mm; height:0;
  border-top:1px solid var(--brand);
}

/* Footer Hadith/ayah */
.footer{
  padding:2mm 6mm 3mm;
  border-top: 2px solid var(--brand);
  background:linear-gradient(180deg, #fff 0%, var(--bg) 100%);
  font-size:8.5px; color:#1a1a1a;
}
.footer .ayah{
  display:inline-block; padding:1mm 2mm; border-left:3px solid var(--brand);
}

/* Utility for placeholder lines when values empty */
.placeholder{
  display:inline-block; min-width:22mm; border-bottom:1px dotted #999; height:1.2em;
}

/* Optional watermark for copy control (toggle display:none to hide) */
.watermark{
  position:absolute; inset:auto 0 45%; text-align:center;
  opacity:.06; font-weight:800; letter-spacing:4px; font-size:46px;
  color:var(--brand-dark); display:none;
}
</style>
</head>
<body>
  <div class="memo">
    <div class="content-wrapper">
      <div class="title-top">INVOICE</div>
      
      <div class="header">
        <div class="header-left">
          ${businessSettings.logo_url ? `
          <div class="logo" aria-label="Logo">
            <img src="${businessSettings.logo_url}" alt="${businessSettings.business_name} Logo" />
          </div>
          ` : `
          <div class="logo" aria-label="Logo">
            <!-- simple palm icon fallback -->
            <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
              <path d="M12 2c2.8 0 4.7 1.1 6 2.5-2.6-.3-4.6.2-6 1.7-1.4-1.5-3.4-2-6-1.7C7.3 3.1 9.2 2 12 2ZM8 7c2.5.1 4 .7 4 2.3 0-1.6 1.5-2.2 4-2.3-1.2 1.4-2.6 2.1-4 2.1S9.2 8.4 8 7Zm3 4.5h2v10h-2v-10Z"/>
            </svg>
          </div>
          `}
          <div>
            <div class="brand">${(businessSettings.business_name || 'RAHE DEEN').toUpperCase()}</div>
            <div class="tag">${businessSettings.tagline || 'WE SUPPLY ALL KINDS OF READY MADE GARMENTS'}</div>
            <div class="serial" style="margin-top:2mm;">INV NO: <b>${sale.invoice_number}</b></div>
          </div>
        </div>
        
        <div class="header-right">
          <div class="row"><strong>Name:</strong> ${sale.customer_name || 'Walk-in Customer'}</div>
          <div class="row"><strong>Address:</strong> ${sale.customer_address || '—'}</div>
          <div class="row"><strong>Phone:</strong> ${sale.customer_phone || '—'}</div>
          <div class="row"><strong>Date:</strong> ${formatDate(sale.created_at, systemSettings.date_format || 'dd/MM/yyyy')}</div>
        </div>
        <div class="watermark">INVOICE</div>
      </div>

      <div style="padding:2mm 8mm; font-size:10px; color:var(--muted); border-bottom:1px solid var(--brand);">
        ${businessSettings.phone ? `📞 ${businessSettings.phone}${businessSettings.whatsapp && businessSettings.whatsapp !== businessSettings.phone ? ` | ${businessSettings.whatsapp}` : ''}` : ''}
        ${(businessSettings.primary_email || businessSettings.email) ? ` | ✉️ ${businessSettings.primary_email || businessSettings.email}` : ''}
        ${businessSettings.facebook ? ` | ${businessSettings.facebook}` : ''}
        ${businessSettings.address ? ` | 📍 ${businessSettings.address}` : ''}
        ${businessSettings.address_line1 && !businessSettings.address ? ` | 📍 ${businessSettings.address_line1}` : ''}
      </div>

      <div class="table-wrap">
        <table class="items">
          <thead>
            <tr>
              <th class="col-sl">SL.</th>
              <th class="col-desc">Item Description</th>
              <th class="col-qty">Qty.</th>
              <th class="col-price">Price</th>
              <th class="col-amount">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${itemRows.join('')}
          </tbody>
        </table>

        <div class="totals">
          <div class="left-section">
            ${businessSettings.invoice_footer_message ? `<div class="note">${businessSettings.invoice_footer_message}</div>` : ''}
            ${sale.courier_name ? `<div class="courier-name"><strong>Courier: ${sale.courier_name}</strong></div>` : ''}
            ${sale.additional_info ? `<div class="additional-info">${sale.additional_info}</div>` : ''}
          </div>
          <div class="sum">
            <div class="row"><div class="k">Total</div><div class="v">${formatCurrency(sale.grand_total, currencySymbol)}</div></div>
            <div class="row"><div class="k">Adv</div><div class="v">${formatCurrency(sale.amount_paid || 0, currencySymbol)}</div></div>
            <div class="row"><div class="k">Due</div><div class="v">${formatCurrency(sale.amount_due || 0, currencySymbol)}</div></div>
          </div>
        </div>
      </div>

      <div class="signs">
        <div class="sig">Customer's sign</div>
        <div class="sig">Merchant's sign</div>
      </div>
    </div>

    <div class="footer">
      <div class="ayah">আল্লাহ ব্যবসায়কে হালাল এবং সুদকে হারাম করেছেন (সূরা বাকারা : ২৭৫)</div>
    </div>
  </div>
</body>
</html>`;

  return html;
};

