import { BusinessSettings } from '@/hooks/useBusinessSettings';
import { SystemSettings } from '@/hooks/useSystemSettings';
import { formatCurrency } from './currency';
import { formatDate } from './time';

export interface InvoiceData {
  invoice: {
    number: string;
    date: string;
  };
  customer: {
    name: string;
    addressLine1?: string;
    addressLine2?: string;
    email?: string;
    phone?: string;
  };
  business: {
    name: string;
    logoUrl?: string;
    emailPrimary?: string;
    emailSecondary?: string;
    phone?: string;
    hours?: string;
    addressLine1?: string;
    addressLine2?: string;
    brandColor: string;
  };
  items: Array<{
    name: string;
    description?: string;
    price: string;
    quantity: number;
    total: string;
  }>;
  totals: {
    subtotal: string;
    discount: string;
    discountLabel: string;
    tax: string;
    taxLabel: string;
    grand: string;
    paid: string;
    due: string;
  };
  payment: {
    method: string;
    maskedDetails?: string;
  };
  notes: {
    important?: string;
  };
  terms?: string;
  signature?: {
    imageUrl: string;
    name: string;
    title: string;
  };
}

export const processInvoiceTemplate = (
  htmlTemplate: string,
  saleData: any,
  businessSettings: BusinessSettings,
  systemSettings: SystemSettings
): string => {
  // Prepare the invoice data
  const invoiceData: InvoiceData = {
    invoice: {
      number: saleData.invoice_number,
      date: formatDate(new Date(saleData.created_at), systemSettings.date_format)
    },
    customer: {
      name: saleData.customer_name,
      addressLine1: saleData.customer_address?.split('\n')[0] || '',
      addressLine2: saleData.customer_address?.split('\n').slice(1).join('\n') || '',
      email: saleData.customer_email || '',
      phone: saleData.customer_phone || ''
    },
    business: {
      name: businessSettings.business_name,
      logoUrl: businessSettings.logo_url || '',
      emailPrimary: businessSettings.primary_email || businessSettings.email || '',
      emailSecondary: businessSettings.secondary_email || '',
      phone: businessSettings.phone || '',
      hours: businessSettings.business_hours || '',
      addressLine1: businessSettings.address_line1 || '',
      addressLine2: businessSettings.address_line2 || '',
      brandColor: businessSettings.brand_color || '#2c7be5'
    },
    items: saleData.sale_items?.map((item: any) => ({
      name: item.product_name,
      description: item.variant_id ? 'Variant item' : '',
      price: formatCurrency(item.rate, systemSettings.currency_symbol),
      quantity: item.quantity,
      total: formatCurrency(item.total, systemSettings.currency_symbol)
    })) || [],
    totals: {
      subtotal: formatCurrency(saleData.subtotal, systemSettings.currency_symbol),
      discount: formatCurrency(saleData.discount_amount || 0, systemSettings.currency_symbol),
      discountLabel: saleData.discount_percent ? `(${saleData.discount_percent}%)` : '',
      tax: formatCurrency(0, systemSettings.currency_symbol), // No tax in current schema
      taxLabel: '',
      grand: formatCurrency(saleData.grand_total, systemSettings.currency_symbol),
      paid: formatCurrency(saleData.amount_paid || 0, systemSettings.currency_symbol),
      due: formatCurrency(saleData.amount_due || 0, systemSettings.currency_symbol)
    },
    payment: {
      method: saleData.payment_method || 'Cash',
      maskedDetails: ''
    },
    notes: {
      important: businessSettings.invoice_footer_message || ''
    },
    terms: 'Thank you for your business!'
  };

  // Process the template
  let processedHtml = htmlTemplate;

  // Replace CSS variable for brand color
  processedHtml = processedHtml.replace(
    /:root\s*\{\s*--accent:\s*[^;]*;/g,
    `:root { --accent: ${invoiceData.business.brandColor};`
  );

  // Replace simple placeholders
  const replacements: Record<string, string> = {
    '{{invoice.number}}': invoiceData.invoice.number,
    '{{invoice.date}}': invoiceData.invoice.date,
    '{{customer.name}}': invoiceData.customer.name,
    '{{customer.addressLine1}}': invoiceData.customer.addressLine1 || '',
    '{{customer.addressLine2}}': invoiceData.customer.addressLine2 || '',
    '{{customer.email}}': invoiceData.customer.email || '',
    '{{customer.phone}}': invoiceData.customer.phone || '',
    '{{business.name}}': invoiceData.business.name,
    '{{business.logoUrl}}': invoiceData.business.logoUrl || '/placeholder.svg',
    '{{business.emailPrimary}}': invoiceData.business.emailPrimary || '',
    '{{business.emailSecondary}}': invoiceData.business.emailSecondary || '',
    '{{business.phone}}': invoiceData.business.phone || '',
    '{{business.hours}}': invoiceData.business.hours || '',
    '{{business.addressLine1}}': invoiceData.business.addressLine1 || '',
    '{{business.addressLine2}}': invoiceData.business.addressLine2 || '',
    '{{totals.subtotal}}': invoiceData.totals.subtotal,
    '{{totals.discount}}': invoiceData.totals.discount,
    '{{totals.discountLabel}}': invoiceData.totals.discountLabel,
    '{{totals.tax}}': invoiceData.totals.tax,
    '{{totals.taxLabel}}': invoiceData.totals.taxLabel,
    '{{totals.grand}}': invoiceData.totals.grand,
    '{{totals.paid}}': invoiceData.totals.paid,
    '{{totals.due}}': invoiceData.totals.due,
    '{{payment.method}}': invoiceData.payment.method,
    '{{payment.maskedDetails}}': invoiceData.payment.maskedDetails || '',
    '{{notes.important}}': invoiceData.notes.important || '',
    '{{terms}}': invoiceData.terms || '',
    '{{signature.imageUrl}}': invoiceData.signature?.imageUrl || '',
    '{{signature.name}}': invoiceData.signature?.name || '',
    '{{signature.title}}': invoiceData.signature?.title || ''
  };

  // Apply simple replacements
  Object.entries(replacements).forEach(([placeholder, value]) => {
    processedHtml = processedHtml.replace(new RegExp(escapeRegExp(placeholder), 'g'), value);
  });

  // Handle the items loop {{#each items}}...{{/each}}
  const itemsLoopRegex = /\{\{#each items\}\}([\s\S]*?)\{\{\/each\}\}/g;
  processedHtml = processedHtml.replace(itemsLoopRegex, (match, itemTemplate) => {
    return invoiceData.items.map((item, index) => {
      let itemHtml = itemTemplate;
      
      // Replace item-specific placeholders
      itemHtml = itemHtml.replace(/\{\{this\.name\}\}/g, item.name);
      itemHtml = itemHtml.replace(/\{\{this\.description\}\}/g, item.description || '');
      itemHtml = itemHtml.replace(/\{\{this\.price\}\}/g, item.price);
      itemHtml = itemHtml.replace(/\{\{this\.quantity\}\}/g, item.quantity.toString());
      itemHtml = itemHtml.replace(/\{\{this\.total\}\}/g, item.total);
      
      // Handle conditional styling for even rows
      const isEven = index % 2 === 0;
      itemHtml = itemHtml.replace(/\{\{#if @even\}\}tm_gray_bg\{\{\/if\}\}/g, isEven ? 'tm_gray_bg' : '');
      
      return itemHtml;
    }).join('');
  });

  return processedHtml;
};

// Helper function to escape special regex characters
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Default HTML template
export const DEFAULT_INVOICE_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Invoice — {{invoice.number}}</title>
  <style>
    :root { --accent: {{business.brandColor}}; --primary:#111827; --muted:#6b7280; }
    *{box-sizing:border-box} body{font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif; color:#111; margin:0; background:#f8fafc}
    .tm_container{padding:24px}
    .tm_invoice_wrap{max-width:900px;margin:0 auto}
    .tm_invoice{background:#fff;border-radius:12px;padding:28px;box-shadow:0 10px 30px rgba(0,0,0,.06)}
    .tm_top_head{display:flex;gap:16px;align-items:center;justify-content:space-between}
    .tm_logo img{height:48px}
    .tm_grid_row{display:grid;gap:8px}
    .tm_col_3{grid-template-columns:repeat(3,minmax(0,1fr))}
    .tm_mb20{margin-bottom:20px} .tm_mb15{margin-bottom:15px} .tm_mb10{margin-bottom:10px}
    .tm_primary_color{color:var(--primary)} .tm_accent_bg{background:var(--accent)} .tm_white_color{color:#fff} .tm_white_color_60{color:rgba(255,255,255,.85)}
    .tm_invoice_info{display:flex;gap:16px;justify-content:space-between;align-items:flex-start}
    .tm_invoice_title{letter-spacing:.1em}
    .tm_table table{width:100%;border-collapse:separate;border-spacing:0}
    .tm_table th,.tm_table td{padding:12px 14px;border-bottom:1px solid #e5e7eb;vertical-align:top}
    .tm_table thead th{font-weight:600;color:#374151;background:#f3f4f6}
    .tm_text_right{text-align:right} .tm_gray_bg{background:#fafafa}
    .tm_invoice_footer{display:flex;gap:16px;align-items:flex-start;justify-content:space-between}
    .tm_card_note{padding:10px 12px;border-radius:8px;background:#111827;color:#fff;display:inline-block}
    .tm_ternary_color{color:#374151}
    .tm_note{margin-top:24px}
    .tm_radius_6_0_0_6{border-radius:6px 0 0 6px} .tm_radius_0_6_6_0{border-radius:0 6px 6px 0}
  </style>
</head>
<body>
  <div class="tm_container">
    <div class="tm_invoice_wrap">
      <div class="tm_invoice tm_style2" id="tm_download_section">
        <div class="tm_invoice_in">
          <div class="tm_invoice_head tm_top_head tm_mb20">
            <div class="tm_invoice_left">
              <div class="tm_logo">
                <img src="{{business.logoUrl}}" alt="{{business.name}} logo" />
              </div>
            </div>
            <div class="tm_invoice_right">
              <div class="tm_grid_row tm_col_3">
                <div>
                  <b class="tm_primary_color">Email</b><br />
                  {{business.emailPrimary}}<br />
                  {{business.emailSecondary}}
                </div>
                <div>
                  <b class="tm_primary_color">Phone</b><br />
                  {{business.phone}}<br />
                  {{business.hours}}
                </div>
                <div>
                  <b class="tm_primary_color">Address</b><br />
                  {{business.addressLine1}}<br />
                  {{business.addressLine2}}
                </div>
              </div>
            </div>
          </div>
          <div class="tm_invoice_info tm_mb10">
            <div class="tm_invoice_info_left">
              <p class="tm_mb2"><b>Invoice To:</b></p>
              <p>
                <b class="tm_f16 tm_primary_color">{{customer.name}}</b><br />
                {{customer.addressLine1}}<br />
                {{customer.addressLine2}}<br />
                {{customer.email}}<br />
                {{customer.phone}}
              </p>
            </div>
            <div class="tm_invoice_info_right">
              <div class="tm_ternary_color tm_f50 tm_text_uppercase tm_text_center tm_invoice_title tm_mb15 tm_mobile_hide">Invoice</div>
              <div class="tm_grid_row tm_col_3 tm_invoice_info_in tm_accent_bg" style="padding:12px;border-radius:8px;">
                <div>
                  <span class="tm_white_color_60">Grand Total:</span><br />
                  <b class="tm_f16 tm_white_color">{{totals.grand}}</b>
                </div>
                <div>
                  <span class="tm_white_color_60">Invoice Date:</span><br />
                  <b class="tm_f16 tm_white_color">{{invoice.date}}</b>
                </div>
                <div>
                  <span class="tm_white_color_60">Invoice No:</span><br />
                  <b class="tm_f16 tm_white_color">{{invoice.number}}</b>
                </div>
              </div>
            </div>
          </div>
          <div class="tm_table tm_style1">
            <div class="tm_round_border">
              <div class="tm_table_responsive">
                <table>
                  <thead>
                    <tr>
                      <th class="tm_width_7 tm_semi_bold tm_accent_color">Item</th>
                      <th class="tm_width_2 tm_semi_bold tm_accent_color">Price</th>
                      <th class="tm_width_1 tm_semi_bold tm_accent_color">Qty</th>
                      <th class="tm_width_2 tm_semi_bold tm_accent_color tm_text_right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {{#each items}}
                    <tr class="{{#if @even}}tm_gray_bg{{/if}}">
                      <td class="tm_width_7">
                        <p class="tm_m0 tm_f16 tm_primary_color">{{this.name}}</p>
                        {{this.description}}
                      </td>
                      <td class="tm_width_2">{{this.price}}</td>
                      <td class="tm_width_1">{{this.quantity}}</td>
                      <td class="tm_width_2 tm_text_right">{{this.total}}</td>
                    </tr>
                    {{/each}}
                  </tbody>
                </table>
              </div>
            </div>
            <div class="tm_invoice_footer tm_mb15 tm_m0_md">
              <div class="tm_left_footer">
                <div class="tm_card_note tm_ternary_bg tm_white_color"><b>Payment info: </b>{{payment.method}} {{payment.maskedDetails}}</div>
                <p class="tm_mb2"><b class="tm_primary_color">Important Note:</b></p>
                <p class="tm_m0">{{notes.important}}</p>
              </div>
              <div class="tm_right_footer">
                <table class="tm_mb15">
                  <tbody>
                    <tr>
                      <td class="tm_width_3 tm_primary_color tm_border_none tm_bold">Subtotal</td>
                      <td class="tm_width_3 tm_primary_color tm_text_right tm_border_none tm_bold">{{totals.subtotal}}</td>
                    </tr>
                    <tr>
                      <td class="tm_width_3 tm_danger_color tm_border_none tm_pt0">Discount {{totals.discountLabel}}</td>
                      <td class="tm_width_3 tm_danger_color tm_text_right tm_border_none tm_pt0">{{totals.discount}}</td>
                    </tr>
                    <tr>
                      <td class="tm_width_3 tm_primary_color tm_border_none tm_pt0">Tax {{totals.taxLabel}}</td>
                      <td class="tm_width_3 tm_primary_color tm_text_right tm_border_none tm_pt0">{{totals.tax}}</td>
                    </tr>
                    <tr>
                      <td class="tm_width_3 tm_border_top_0 tm_bold tm_f16 tm_white_color tm_accent_bg tm_radius_6_0_0_6">Grand Total</td>
                      <td class="tm_width_3 tm_border_top_0 tm_bold tm_f16 tm_primary_color tm_text_right tm_white_color tm_accent_bg tm_radius_0_6_6_0">{{totals.grand}}</td>
                    </tr>
                    <tr>
                      <td class="tm_width_3 tm_border_none tm_pt0">Paid</td>
                      <td class="tm_width_3 tm_text_right tm_border_none tm_pt0">{{totals.paid}}</td>
                    </tr>
                    <tr>
                      <td class="tm_width_3 tm_border_none tm_pt0">Due</td>
                      <td class="tm_width_3 tm_text_right tm_border_none tm_pt0">{{totals.due}}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          <div class="tm_note tm_font_style_normal tm_text_center">
            <hr class="tm_mb15" />
            <p class="tm_mb2"><b class="tm_primary_color">Terms &amp; Conditions:</b></p>
            <p class="tm_m0">{{terms}}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;