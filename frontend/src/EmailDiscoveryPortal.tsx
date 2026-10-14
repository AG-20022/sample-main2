import React, { useMemo, useState } from 'react';

type Sensitivity = 'High' | 'Medium' | 'Low';

type MailEmail = {
  id: number;
  code: string;
  scenario: string;
  subject: string;
  from: string;
  mailbox: string;
  source: string;
  sensitivity: Sensitivity;
  date: string;
  attachment: string;
  content: string;
};

type AdvFilters = {
  subject: string;
  sender: string;
  attachment: string;
  sensitivity: '' | Sensitivity;
  from: string;
  to: string;
  hasAttachment: boolean;
};

type EmailDiscoveryWorkItem = {
  work_item_id: string;
  label: string;
  work_item: string;
  customer_request_id: string;
};
type ActionType = 'Change Address' | 'Change Delivery Date' | 'Change Delivery SPOC' | 'Cancel Order' | 'Create Invoice';
type WorkflowAction = 'Create Invoice' | 'View Order' | 'Update Order' | 'Check Delivery Status' | 'Escalate' | 'Reply to Customer';
type OrderMapping = { orderNumber: string; customerName: string; deliveryReference: string; invoiceNumber: string; orderStatus: string };
type CustomerContext = { customerType: string; customerId: string; totalOrders: number; openOrders: number; openDeliveries: number; openInvoices: number; customerStatus: string };
type TrackingDetails = { carrier: string; trackingNumber: string | null; shipmentDate: string; currentLocation: string; deliveryEta: string; shipmentStatus: string; lastUpdated: string; orderStatus: string; expectedDispatchDate: string };

const DEMO_ORDER_LOOKUP: Record<number, OrderMapping> = {
  101: { orderNumber: 'PO-45821', customerName: 'ACME Retail India', deliveryReference: 'DEL-PN-45821', invoiceNumber: 'INV-2026-0881', orderStatus: 'Confirmed' },
  102: { orderNumber: 'SO-77210', customerName: 'Northwind Traders', deliveryReference: 'DEL-BLR-77210', invoiceNumber: 'INV-2026-0888', orderStatus: 'In Fulfillment' },
  103: { orderNumber: 'SO-77314', customerName: 'BrightLabs', deliveryReference: 'DEL-HYD-77314', invoiceNumber: 'INV-2026-0894', orderStatus: 'Scheduled' },
  104: { orderNumber: 'SO-77402', customerName: 'Globex Corporation', deliveryReference: 'DEL-DEL-77402', invoiceNumber: 'INV-2026-0901', orderStatus: 'In Fulfillment' },
  105: { orderNumber: 'PO-46010', customerName: 'Initech', deliveryReference: 'DEL-BLR-46010', invoiceNumber: 'Not created', orderStatus: 'New request' },
  106: { orderNumber: 'SO-76988', customerName: 'Umbrella Corporation', deliveryReference: 'DEL-MUM-76988', invoiceNumber: 'INV-2026-0872', orderStatus: 'Delivered' },
  111: { orderNumber: 'SO-77521', customerName: 'Northstar Medical', deliveryReference: 'DEL-MEM-77521', invoiceNumber: 'INV-2026-0918', orderStatus: 'In Transit' },
  112: { orderNumber: 'SO-77522', customerName: 'Cascade Health Systems', deliveryReference: 'Not assigned', invoiceNumber: 'INV-2026-0919', orderStatus: 'Confirmed' },
};
const DEMO_CUSTOMER_CONTEXT: Record<number, CustomerContext> = {
  101: { customerType: 'Retail Enterprise', customerId: 'CUS-ACME-001', totalOrders: 42, openOrders: 3, openDeliveries: 2, openInvoices: 1, customerStatus: 'Active' },
  102: { customerType: 'Wholesale Partner', customerId: 'CUS-NWT-014', totalOrders: 28, openOrders: 2, openDeliveries: 1, openInvoices: 2, customerStatus: 'Active' },
  103: { customerType: 'Technology Customer', customerId: 'CUS-BRL-022', totalOrders: 16, openOrders: 1, openDeliveries: 1, openInvoices: 0, customerStatus: 'Active' },
  104: { customerType: 'Enterprise Customer', customerId: 'CUS-GLX-031', totalOrders: 35, openOrders: 1, openDeliveries: 1, openInvoices: 1, customerStatus: 'On Hold' },
  105: { customerType: 'Corporate Customer', customerId: 'CUS-INT-044', totalOrders: 11, openOrders: 1, openDeliveries: 0, openInvoices: 0, customerStatus: 'New' },
  106: { customerType: 'Financial Services', customerId: 'CUS-UMB-057', totalOrders: 54, openOrders: 0, openDeliveries: 0, openInvoices: 1, customerStatus: 'Active' },
};
const TRACKING_BY_EMAIL: Record<number, TrackingDetails> = {
  111: { carrier: 'FedEx', trackingNumber: '773400000111', shipmentDate: '2026-10-10', currentLocation: 'Memphis, TN Hub', deliveryEta: '2026-10-16', shipmentStatus: 'In Transit', lastUpdated: '2026-10-14 09:42', orderStatus: 'In Transit', expectedDispatchDate: '2026-10-10' },
  112: { carrier: 'FedEx', trackingNumber: null, shipmentDate: '', currentLocation: '', deliveryEta: '', shipmentStatus: '', lastUpdated: '', orderStatus: 'Confirmed', expectedDispatchDate: '2026-10-18' },
};
const ACTION_BY_SCENARIO: Record<string, ActionType> = {
  'Address Change': 'Change Address', 'Delivery Date Change': 'Change Delivery Date', 'SPOC Change': 'Change Delivery SPOC',
  'Cancel Order': 'Cancel Order', 'Invoice Request': 'Create Invoice', 'New Order Creation': 'Create Invoice',
};
const ACTION_LABEL: Record<ActionType, string> = {
  'Change Address': 'Change Delivery Address',
  'Change Delivery Date': 'Change Delivery Date',
  'Change Delivery SPOC': 'Change SPOC',
  'Cancel Order': 'Cancel Order',
  'Create Invoice': 'Create Invoice',
};
const FORM_BUTTON_LABEL: Record<ActionType, string> = {
  'Change Address': 'Open Address Form',
  'Change Delivery Date': 'Open Delivery Date Form',
  'Change Delivery SPOC': 'Open SPOC Form',
  'Cancel Order': 'Open Cancellation Form',
  'Create Invoice': 'Open Invoice Form',
};
const ACTION_REASON: Record<string, string> = {
  'Address Change': 'Customer requested delivery destination modification.',
  'Delivery Date Change': 'Customer requested a revised delivery date.',
  'SPOC Change': 'Customer provided updated order contact details.',
  'Cancel Order': 'Customer requested the order to be cancelled.',
  'Invoice Request': 'Customer requested an invoice for a completed delivery.',
  'New Order Creation': 'Customer requested creation of a new order from the purchase request.',
};
const WORKFLOW_ACTIONS: WorkflowAction[] = ['Create Invoice', 'View Order', 'Update Order', 'Check Delivery Status', 'Escalate', 'Reply to Customer'];
const MAILBOXES = ['HP Mailbox', 'HR Mailbox', 'Finance Mailbox', 'Legal Mailbox'];
const FEEDS = ['Exchange', 'Outlook', 'Teams', 'Shared Mailbox'];
const SCENARIO_EMAILS: MailEmail[] = [
  {
    id: 101, code: 'EM001', scenario: 'Address Change', subject: 'Change of delivery address for PO-45821',
    from: 'priya.nair@acmeretail.com', mailbox: 'HP Mailbox', source: 'Exchange', sensitivity: 'Medium', date: '2026-10-01', attachment: '',
    content: 'Hi team, we have moved our warehouse. Please update the delivery address for PO-45821 to Plot 14, Industrial Area Phase 2, Pune 411019 before dispatch. The old Hinjewadi address should no longer be used.',
  },
  {
    id: 102, code: 'EM002', scenario: 'SPOC Change', subject: 'Update to single point of contact - Northwind Traders',
    from: 'rahul.mehta@northwind.com', mailbox: 'HP Mailbox', source: 'Outlook', sensitivity: 'Low', date: '2026-10-02', attachment: '',
    content: 'Please note that effective immediately, Anita Desai (anita.desai@northwind.com, +91 98450 11223) will be our SPOC for all orders and invoices, replacing me. Kindly update your records and copy her on open requests.',
  },
  {
    id: 103, code: 'EM003', scenario: 'Delivery Date Change', subject: 'Request to reschedule delivery for order SO-77314',
    from: 'kevin.lee@brightlabs.io', mailbox: 'HP Mailbox', source: 'Exchange', sensitivity: 'Medium', date: '2026-10-03', attachment: '',
    content: 'Our site will be closed for maintenance during the week of 20 October. Could you move the delivery for SO-77314 from 21 October to 28 October? Please confirm the revised date.',
  },
  {
    id: 104, code: 'EM004', scenario: 'Cancel Order', subject: 'Cancellation of order SO-77402',
    from: 'maria.gomez@globex.com', mailbox: 'HP Mailbox', source: 'Shared Mailbox', sensitivity: 'High', date: '2026-10-04', attachment: 'Cancellation_Request_SO-77402.pdf',
    content: 'We need to cancel order SO-77402 (12 x thermal printers) because the project has been put on hold. Please stop shipment and confirm that no cancellation charges apply. The signed cancellation request is attached.',
  },
  {
    id: 105, code: 'EM005', scenario: 'New Order Creation', subject: 'New purchase order PO-46010 - laptop docking stations',
    from: 'procurement@initech.com', mailbox: 'HP Mailbox', source: 'Outlook', sensitivity: 'Medium', date: '2026-10-05', attachment: 'PO-46010.pdf',
    content: 'Please create a new order for 25 USB-C docking stations (model HP G5) against the attached PO-46010. Requested delivery is 15 November to our Bengaluru office. Kindly share the order confirmation.',
  },
  {
    id: 106, code: 'EM006', scenario: 'Invoice Request', subject: 'Request for invoice copy - SO-76988',
    from: 'accounts@umbrella-corp.com', mailbox: 'Finance Mailbox', source: 'Exchange', sensitivity: 'Medium', date: '2026-10-06', attachment: '',
    content: 'We received the delivery for SO-76988 but have not received the invoice. Please send a copy of the tax invoice so we can process the payment this month.',
  },
  {
    id: 107, code: 'EM007', scenario: 'Status Request', subject: 'Status of order SO-77150?',
    from: 'li.wei@starkindustries.com', mailbox: 'HP Mailbox', source: 'Teams', sensitivity: 'Low', date: '2026-10-07', attachment: '',
    content: 'Hi, could you share the current status of SO-77150? The tracking link has not been updated for three days and we need an ETA for our internal planning.',
  },
  {
    id: 108, code: 'EM008', scenario: 'Delivery Issue', subject: 'Damaged items received in shipment SO-77021',
    from: 'ops@wayneenterprises.com', mailbox: 'HP Mailbox', source: 'Exchange', sensitivity: 'High', date: '2026-10-08', attachment: 'Damaged_Goods_Photos.zip',
    content: 'Two of the ten monitors delivered under SO-77021 arrived with cracked screens, and one carton was missing. Photos are attached. Please arrange a replacement and raise a claim with the carrier.',
  },
  {
    id: 109, code: 'EM009', scenario: 'Quantity Change', subject: 'Increase quantity on PO-45990',
    from: 'sanjay.patel@cyberdyne.com', mailbox: 'HP Mailbox', source: 'Outlook', sensitivity: 'Medium', date: '2026-10-09', attachment: 'PO-45990_Rev1.pdf',
    content: 'We would like to increase the quantity on PO-45990 from 40 to 60 wireless keyboards. The revised PO is attached. Please confirm whether the original delivery date still holds.',
  },
  {
    id: 110, code: 'EM010', scenario: 'Invoice Correction', subject: 'Incorrect GST number on invoice INV-2026-0912',
    from: 'finance@oceanic-airlines.com', mailbox: 'Finance Mailbox', source: 'Shared Mailbox', sensitivity: 'High', date: '2026-10-10', attachment: 'INV-2026-0912.pdf',
    content: 'Invoice INV-2026-0912 shows an incorrect GSTIN and billing entity. The correct GSTIN is 27AABCO1234F1Z5 for Oceanic Airlines India Pvt Ltd. Please issue a credit note and a corrected invoice.',
  },
  {
    id: 111, code: 'EM011', scenario: 'Tracking Request', subject: 'Can you provide the FedEx tracking number for my shipment?',
    from: 'shipping@northstarmedical.com', mailbox: 'HP Mailbox', source: 'Exchange', sensitivity: 'Medium', date: '2026-10-14', attachment: '',
    content: 'Hello Support Team, can you provide the FedEx tracking number for my shipment? The order is SO-77521 and invoice INV-2026-0918.',
  },
  {
    id: 112, code: 'EM012', scenario: 'Tracking Request', subject: 'Please share the shipment tracking details.',
    from: 'logistics@cascadehealth.com', mailbox: 'HP Mailbox', source: 'Outlook', sensitivity: 'Medium', date: '2026-10-14', attachment: '',
    content: 'Please share the shipment tracking details for order SO-77522 and invoice INV-2026-0919 if the carrier booking is available.',
  },
];
const EMPTY_ADV: AdvFilters = { subject: '', sender: '', attachment: '', sensitivity: '', from: '', to: '', hasAttachment: false };
const BADGE: Record<Sensitivity, string> = { High: '#ef4444', Medium: '#f59e0b', Low: '#10b981' };
const has = (v: string, q: string) => !q || v.toLowerCase().includes(q.toLowerCase());
const toggle = (list: string[], x: string) => (list.includes(x) ? list.filter((i) => i !== x) : [...list, x]);

const CSS = `
*{box-sizing:border-box}
.edp{min-height:100vh;background:#f1f5f9;font-family:"Segoe UI",system-ui,sans-serif;color:#0f172a}
.edp .hdr{background:#0f172a;color:#fff;display:flex;justify-content:space-between;align-items:center;padding:14px 24px;gap:16px;flex-wrap:wrap}
.edp .hdr h2{margin:0;font-size:20px}
.edp .row{display:flex;gap:8px;align-items:center}
.edp .inp{padding:9px 12px;border:1px solid #cbd5e1;border-radius:8px;font:inherit;width:100%}
.edp .hdr .inp{width:300px;border:none}
.edp .btn{padding:9px 14px;border:none;border-radius:8px;cursor:pointer;font:inherit;font-weight:600;background:#e2e8f0;color:#0f172a;transition:.15s}
.edp .btn:hover{filter:brightness(.92)}.edp .btn:disabled{opacity:.5;cursor:not-allowed}
.edp .pri{background:#2563eb;color:#fff}.edp .dot{background:#f59e0b;border-radius:50%;width:8px;height:8px;display:inline-block;margin-left:6px}
.edp{container-type:inline-size}
.edp .main{display:grid;grid-template-columns:220px minmax(0,1fr) 340px;align-items:start;gap:16px;padding:16px}
.edp .main>section{position:sticky;top:16px}
.edp td:nth-child(1),.edp td:nth-child(5),.edp td:nth-child(6),.edp .badge{white-space:nowrap}
.edp td:nth-child(1){font-weight:600}
@container (max-width:1200px){
.edp .main{grid-template-columns:minmax(0,1fr) 320px}
.edp .main>aside{grid-column:1/-1;display:grid;grid-template-columns:1fr 1fr auto;gap:8px 24px;align-items:start}
.edp .main>aside hr{display:none}
.edp .main>aside>.btn{margin-top:0!important;width:auto!important;align-self:center}
.edp .grp{display:flex;flex-wrap:wrap;gap:0 12px}.edp .grp>.row{flex-basis:100%}.edp .grp h3{margin-bottom:4px}
}
@container (max-width:760px){
.edp .main{grid-template-columns:minmax(0,1fr)}
.edp .main>aside{grid-template-columns:1fr}
.edp .main>section{position:static}
.edp .main>main{display:contents}
.edp .main>main>.stats{order:1;margin-bottom:0}.edp .main>section{order:2}.edp .main>main>.card{order:3}
}
.edp .card{background:#fff;border-radius:12px;padding:18px;box-shadow:0 1px 3px rgba(0,0,0,.08)}
.edp .card h3{margin:0 0 12px;font-size:16px}
.edp .chk{display:flex;align-items:center;gap:8px;padding:6px 4px;border-radius:6px;cursor:pointer}
.edp .chk:hover{background:#f1f5f9}.edp .chk span{flex:1}
.edp .x{background:none;border:none;color:#94a3b8;cursor:pointer;font-size:16px}.edp .x:hover{color:#ef4444}
.edp .link{background:none;border:none;color:#2563eb;cursor:pointer;font-size:12px;padding:0}
.edp .stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px}
.edp .stat{color:#fff;padding:14px 16px;border-radius:12px}.edp .stat p{margin:0;opacity:.85;font-size:13px}.edp .stat b{font-size:28px}
.edp table{width:100%;border-collapse:collapse}.edp th{text-align:left;font-size:12px;color:#64748b;text-transform:uppercase;padding:8px}
.edp td{padding:10px 8px;border-top:1px solid #f1f5f9}.edp tbody tr{cursor:pointer}.edp tbody tr:hover{background:#f8fafc}
.edp tr.sel{background:#eff6ff!important}
.edp .badge{color:#fff;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:600}
.edp .muted{color:#64748b;font-size:14px}.edp .meta p{margin:6px 0;font-size:14px}
.edp .ov{position:fixed;inset:0;background:rgba(15,23,42,.5);display:flex;justify-content:center;align-items:center}
.edp .modal{width:440px;background:#fff;border-radius:12px;padding:22px;display:grid;gap:10px}
.edp .modal h3{margin:0}.edp .lbl{font-size:12px;color:#64748b}
.edp .err{color:#ef4444;font-size:13px}
.edp-workflow{margin:0 16px 16px;background:#fff;border:1px solid #dbeafe}.edp-workflow .workflow-banner{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;border-bottom:1px solid #e2e8f0;padding-bottom:16px}.edp-workflow h2{margin:3px 0 6px}.edp-workflow p{margin:0;color:#475569;max-width:900px}.recommendation{background:#dcfce7;color:#166534;padding:8px 12px;border-radius:999px;font-weight:700;white-space:nowrap}.workflow-track{display:flex;gap:6px;overflow:auto;padding:18px 0}.workflow-step{display:flex;align-items:center;gap:7px;min-width:150px;border:1px solid #cbd5e1;background:#f8fafc;color:#475569;border-radius:8px;padding:9px;text-align:left}.workflow-step b{display:grid;place-items:center;width:23px;height:23px;border-radius:50%;background:#cbd5e1;color:#fff}.workflow-step.done{border-color:#86efac}.workflow-step.done b{background:#16a34a}.workflow-step.active{border-color:#2563eb;background:#eff6ff;color:#1d4ed8}.workflow-step.active b{background:#2563eb}.workflow-columns{display:grid;grid-template-columns:1fr 1fr;gap:20px;border-top:1px solid #e2e8f0;padding-top:16px}.mapping-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:0}.mapping-grid div{background:#f8fafc;padding:10px;border-radius:8px}.mapping-grid dt{font-size:11px;color:#64748b;text-transform:uppercase}.mapping-grid dd{margin:3px 0 0;font-weight:600}.action-bar,.history-strip{display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-top:16px;padding:14px;background:#f8fafc;border-radius:8px}.action-bar span{color:#1d4ed8;font-weight:700}.action-bar .btn{margin-left:auto}.action-form{margin-top:16px;border:1px solid #bfdbfe;border-radius:10px;padding:16px;background:#f8fbff}.action-form .panel-heading{display:flex;justify-content:space-between}.form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin:14px 0}.form-grid label{display:grid;gap:5px;font-size:12px;font-weight:700;color:#475569}.form-grid input,.form-grid textarea{width:100%;border:1px solid #cbd5e1;border-radius:7px;padding:9px;font:inherit;color:#0f172a;background:#fff}.status-pill{color:#166534;background:#dcfce7;border-radius:999px;padding:5px 10px;font-size:12px;font-weight:700}.history-strip{font-size:12px;color:#475569}.history-strip strong{color:#0f172a}@container (max-width:760px){.edp-workflow{margin:0 8px 8px}.edp-workflow .workflow-banner,.workflow-columns{display:block}.recommendation{display:inline-block;margin-top:12px}.form-grid{grid-template-columns:1fr}.action-bar .btn{margin-left:0;width:100%}}
.workflow-context{margin-top:16px;border-top:1px solid #e2e8f0;padding-top:16px}.workflow-context h3{margin:0 0 10px}
.recommendation-details{align-items:flex-end}.recommendation-details>div{flex:1}.recommendation-details h3{margin:0 0 10px}.recommendation-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:0}.recommendation-grid div{background:#fff;border:1px solid #dbe4f0;border-radius:8px;padding:10px}.recommendation-grid dt{font-size:11px;color:#64748b;text-transform:uppercase}.recommendation-grid dd{margin:4px 0 0;font-weight:700;color:#1d4ed8}
.ownership-history{margin-top:16px;border-top:1px solid #e2e8f0;padding-top:16px}.ownership-history h3{margin:0 0 12px}.ownership-timeline{display:grid;gap:0}.ownership-entry{position:relative;display:grid;grid-template-columns:18px 1fr;gap:10px;padding:0 0 16px}.ownership-entry:not(:last-child)::before{content:'';position:absolute;left:8px;top:18px;bottom:0;border-left:2px solid #cbd5e1}.ownership-marker{z-index:1;width:16px;height:16px;margin-top:2px;border:3px solid #cbd5e1;border-radius:50%;background:#fff}.ownership-entry.completed .ownership-marker{border-color:#16a34a;background:#dcfce7}.ownership-entry.current .ownership-marker{border-color:#2563eb;background:#dbeafe}.ownership-entry.next .ownership-marker{border-color:#94a3b8}.ownership-entry strong{display:block;color:#173b69}.ownership-entry small{display:block;margin-top:3px;color:#64748b}.ownership-entry p{margin:5px 0 0;color:#475569;font-size:13px}
.action-modal-card{width:min(720px,calc(100vw - 32px));max-height:calc(100vh - 32px);overflow:auto}.action-modal-card .action-form{margin-top:12px}.action-modal-card .action-form .panel-heading{display:none}
.form-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:14px}
.confirmation-box{display:grid;gap:8px;margin-top:14px;padding:14px;border:1px solid #fca5a5;border-radius:8px;background:#fff1f2}.confirmation-box p{margin:0;color:#7f1d1d}.confirmation-box .btn{justify-self:end}
.invoice-parties>div{min-height:78px}.invoice-parties span{display:block}.mock-invoice-lines th,.mock-invoice-lines td{padding:8px 7px;font-size:11px}.mock-invoice-summary{display:grid;grid-template-columns:1fr 260px;border-bottom:1px solid #7d8790}.mock-invoice-summary-left{display:grid}.mock-invoice-box{display:grid;gap:7px;padding:12px;border-bottom:1px solid #7d8790}.mock-invoice-box:last-child{border-bottom:0}.mock-invoice-totals{width:100%;border-left:1px solid #7d8790}.mock-invoice-totals th,.mock-invoice-totals td{padding:7px 10px}.mock-invoice-totals th{text-align:left}.mock-invoice-totals td{text-align:right;white-space:nowrap}.mock-invoice-totals .invoice-grand-total th,.mock-invoice-totals .invoice-grand-total td{background:#dcefdc;font-weight:800;border-top:1px solid #7d8790}.mock-invoice-bottom ol{margin:0;padding-left:18px}.mock-invoice-bottom .invoice-signatory{display:flex;flex-direction:column;justify-content:space-between;align-items:center;min-height:120px}.invoice-signatory span{border-top:1px solid #182433;padding-top:5px;min-width:180px;text-align:center}.mock-invoice-record footer{border-top:1px solid #7d8790;color:#667085;font-style:italic;text-align:center;padding:8px}.invoice-top-grid strong{font-weight:700}
.record-edit-button{margin:0 0 12px}.invoice-edit-panel{border:1px solid #dbeafe;background:#f8fbff;padding:20px}.invoice-edit-panel header{display:flex;justify-content:space-between;align-items:center;margin-bottom:18px}.invoice-edit-panel h2{margin:3px 0;color:#173b69}.invoice-edit-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.invoice-edit-grid label{display:grid;gap:5px;color:#475569;font-size:12px;font-weight:700}.invoice-edit-grid input,.invoice-edit-lines input{padding:10px;border:1px solid #cbd5e1;border-radius:6px;font:inherit;background:#fff}.invoice-edit-lines{display:grid;gap:10px;margin-top:18px;padding:14px;border:1px solid #dbe4f0;background:#fff}.invoice-edit-lines>div{display:grid;grid-template-columns:1fr 100px 120px 100px;gap:8px;align-items:center}.invoice-edit-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:18px}@media(max-width:640px){.invoice-edit-grid,.invoice-edit-lines>div{grid-template-columns:1fr}.invoice-edit-actions{justify-content:stretch}.invoice-edit-actions .btn{flex:1}}
.record-view-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}.record-modal{position:relative;width:min(900px,calc(100vw - 32px));max-height:calc(100vh - 32px);overflow:auto;background:#fff;border-radius:10px;padding:18px}.record-close{position:absolute;right:12px;top:10px;border:0;background:transparent;color:#64748b;font-size:24px;cursor:pointer}.mock-invoice-record{border:1px solid #7d8790;color:#111827;font-family:Arial,sans-serif;font-size:12px}.mock-invoice-record header{display:flex;justify-content:space-between;padding:14px;border-bottom:1px solid #7d8790}.mock-invoice-record header strong{font-size:20px;letter-spacing:.12em}.mock-invoice-record header span{color:#667085}.mock-invoice-grid{display:grid;grid-template-columns:1fr 1fr}.mock-invoice-grid>div{display:grid;gap:5px;min-height:86px;padding:12px;border-bottom:1px solid #7d8790}.mock-invoice-grid>div:nth-child(even){border-left:1px solid #7d8790}.mock-invoice-grid b,.mock-invoice-bottom b{color:#4d6074;font-size:10px;letter-spacing:.06em}.mock-invoice-record table{width:100%;border-collapse:collapse}.mock-invoice-record th,.mock-invoice-record td{padding:8px;border-bottom:1px solid #d5d9de;text-align:left}.mock-invoice-record th{background:#f1f3f5}.mock-invoice-bottom{display:grid;grid-template-columns:1fr 260px;border-bottom:1px solid #7d8790}.mock-invoice-bottom>div{display:grid;gap:10px;padding:12px}.mock-invoice-bottom>div+div{border-left:1px solid #7d8790}.mock-invoice-bottom strong:last-child{padding:10px;background:#dcefdc}.mock-invoice-record footer{padding:18px;text-align:right}.mock-consignment-record{border:1px solid #111;color:#111;background:#fff;font-family:Arial,sans-serif;font-size:11px}.mock-consignment-brand{display:flex;justify-content:space-between;gap:15px;padding:15px 12px}.mock-consignment-brand strong{display:block;color:#4f148d;font-size:26px}.mock-consignment-brand strong span{color:#f04b24}.mock-consignment-brand small,.mock-consignment-brand b{display:block;font-size:9px}.mock-consignment-brand>div:last-child{text-align:right;color:#4f148d}.mock-consignment-record section{margin:0 12px 7px;border:1px solid #111}.mock-consignment-record h4{margin:0;padding:5px 7px;background:#4f148d;color:#fff;font-size:11px}.mock-consignment-fields{display:grid;grid-template-columns:repeat(4,1fr)}.mock-consignment-fields span,.mock-consignment-columns>div{display:grid;gap:4px;min-height:44px;padding:7px;border-right:1px solid #111;border-top:1px solid #111}.mock-consignment-fields span:last-child{border-right:0}.mock-consignment-fields b{font-size:9px}.mock-consignment-columns{display:grid;grid-template-columns:1fr 1fr}.mock-consignment-columns>div{border-top:0}.mock-consignment-columns>div+div{border-left:1px solid #111}.mock-consignment-columns h5{margin:-7px -7px 3px;padding:5px 7px;background:#4f148d;color:#fff}.mock-consignment-declaration{margin:0;padding:9px}.mock-consignment-signature{display:grid;grid-template-columns:1fr 1fr 1fr}.mock-consignment-signature span{padding:12px 7px;border-top:1px solid #111;border-right:1px solid #111;font-size:9px}@media(max-width:700px){.mock-invoice-grid,.mock-invoice-bottom,.mock-consignment-fields,.mock-consignment-columns{grid-template-columns:1fr}.mock-invoice-grid>div:nth-child(even),.mock-invoice-bottom>div+div{border-left:0}.mock-consignment-signature{grid-template-columns:1fr}}
.tracking-request-workflow{margin:0 16px 16px;padding:18px;background:#fff;border:1px solid #dbeafe}.tracking-request-progress{display:flex;gap:6px;overflow:auto;padding-bottom:14px;margin-bottom:16px;border-bottom:1px solid #e2e8f0}.tracking-request-progress span{white-space:nowrap;padding:8px 10px;border-radius:7px;background:#f8fafc;color:#64748b;font-size:12px;font-weight:700}.tracking-request-progress .done{background:#f0fdf4;color:#166534}.tracking-request-progress .active{background:#eff6ff;color:#1d4ed8}.tracking-request-summary{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;padding-bottom:16px;border-bottom:1px solid #e2e8f0}.tracking-request-summary h2{margin:4px 0 6px}.tracking-status{padding:7px 10px;border-radius:999px;background:#dbeafe;color:#1d4ed8;font-weight:700;white-space:nowrap}.tracking-request-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:16px}.tracking-request-card{padding:16px;border:1px solid #dbe4f0;border-radius:9px;background:#f8fafc}.tracking-request-card h3{margin:0 0 12px;color:#173b69}.tracking-request-card dl{display:grid;gap:10px;margin:0}.tracking-request-card dl div{display:grid;gap:3px}.tracking-request-card dt{font-size:11px;color:#64748b;text-transform:uppercase}.tracking-request-card dd{margin:0;font-weight:600}.tracking-number{color:#1d4ed8;font-size:1.1rem;letter-spacing:.04em}.tracking-unavailable{padding:12px;border:1px solid #fed7aa;border-radius:7px;background:#fff7ed;color:#9a3412}.tracking-request-actions{margin-top:16px;padding:16px;border:1px solid #c7d2fe;border-radius:9px;background:#f8faff}.tracking-request-actions h3{margin:0 0 12px}.tracking-action-buttons{display:flex;flex-wrap:wrap;gap:8px}.tracking-response{display:grid;gap:10px;margin-top:16px;padding:16px;border:1px solid #bfdbfe;border-radius:9px;background:#f8fbff}.tracking-response h3{margin:0 0 4px}.tracking-response textarea{width:100%;resize:vertical;padding:12px;border:1px solid #cbd5e1;border-radius:7px;font:inherit;line-height:1.5}.tracking-response-footer{display:flex;justify-content:space-between;align-items:center;color:#475569;font-size:13px}@media(max-width:760px){.tracking-request-grid{grid-template-columns:1fr}.tracking-request-summary{flex-direction:column}.tracking-response-footer{align-items:flex-start;gap:10px;flex-direction:column}}
.workflow-progress{display:flex;gap:6px;overflow:auto;margin-bottom:16px;padding-bottom:14px;border-bottom:1px solid #e2e8f0}.progress-step{display:flex;align-items:center;gap:6px;min-width:145px;padding:8px 10px;border:1px solid #cbd5e1;border-radius:7px;background:#f8fafc;color:#64748b;font-size:12px;font-weight:700}.progress-step b{display:grid;place-items:center;width:20px;height:20px;border-radius:50%;background:#cbd5e1;color:#fff}.progress-step.done{color:#166534;border-color:#86efac;background:#f0fdf4}.progress-step.done b{background:#16a34a}.progress-step.active{color:#1d4ed8;border-color:#93c5fd;background:#eff6ff}.progress-step.active b{background:#2563eb}.triage-panel{display:flex;justify-content:space-between;gap:18px;align-items:center;margin-bottom:16px;padding:14px;border:1px solid #bfdbfe;border-radius:8px;background:#f8fbff}.triage-panel h3{margin:3px 0}.triage-panel p{font-size:13px}.triage-select{display:grid;gap:5px;min-width:210px;color:#475569;font-size:12px;font-weight:700}.triage-select select{padding:9px;border:1px solid #cbd5e1;border-radius:6px;font:inherit}.related-records{border-top:1px solid #e2e8f0;padding-top:16px}.action-selection{margin-top:16px;padding:14px;border:1px solid #c7d2fe;border-radius:8px;background:#f8faff}.action-selection h3{margin:3px 0 12px}.action-options{display:flex;flex-wrap:wrap;gap:8px}.action-options .btn{margin:0}.selected-action{box-shadow:0 0 0 2px #93c5fd}.action-feedback{margin-top:10px;color:#1d4ed8!important;font-size:13px}
`;

function WorkflowProgress({ active }: { active: string }) {
  const steps = ['Email Discovery', 'Email Triage', 'Email Summary', 'Related Records', 'Action Selection', 'Invoice Creation / Order View'];
  const activeIndex = steps.indexOf(active);
  return <div className="workflow-progress" aria-label="Email workflow progress">{steps.map((step, index) => <div className={`progress-step ${index < activeIndex ? 'done' : index === activeIndex ? 'active' : ''}`} key={step}><b>{index + 1}</b><span>{step}</span></div>)}</div>;
}

type CheckListProps = {
  title: string;
  items: string[];
  sel: string[];
  setSel: (items: string[]) => void;
  onRemove?: (item: string) => void;
};

function CheckList({ title, items, sel, setSel, onRemove }: CheckListProps) {
  return (
    <>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h3>{title}</h3>
        <button className="link" onClick={() => setSel(sel.length === items.length ? [] : items)}>
          {sel.length === items.length ? 'None' : 'All'}
        </button>
      </div>
      {items.map((i) => (
        <label key={i} className="chk">
          <input type="checkbox" checked={sel.includes(i)} onChange={() => setSel(toggle(sel, i))} />
          <span>{i}</span>
          {onRemove && !FEEDS.includes(i) && (
            <button className="x" title="Remove feed" onClick={(e) => { e.preventDefault(); onRemove(i); }}>×</button>
          )}
        </label>
      ))}
    </>
  );
}

export default function EmailDiscoveryPortal({ workItem }: { workItem: EmailDiscoveryWorkItem }) {
  const [searchText, setSearchText] = useState('');
  const [query, setQuery] = useState('');
  const [adv, setAdv] = useState<AdvFilters>(EMPTY_ADV);
  const [draft, setDraft] = useState<AdvFilters>(EMPTY_ADV);
  const [feeds, setFeeds] = useState<string[]>(FEEDS);
  const [selMailboxes, setSelMailboxes] = useState<string[]>(MAILBOXES);
  const [selSources, setSelSources] = useState<string[]>(FEEDS);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [modal, setModal] = useState<'adv' | 'feed' | null>(null);
  const [newFeed, setNewFeed] = useState('');
  const [action, setAction] = useState<ActionType | null>(null);
  const [saved, setSaved] = useState(false);
  const [triageCategory, setTriageCategory] = useState('');
  const [workflowAction, setWorkflowAction] = useState<WorkflowAction | null>(null);
  const [recordView, setRecordView] = useState<'invoice' | 'invoice-edit' | 'consignment' | null>(null);
  const emailsForWork = useMemo<MailEmail[]>(() => {
    const appointmentWork = workItem.work_item_id === 'role01-work-1';
    return [{
      id: 1,
      code: workItem.customer_request_id,
      scenario: 'Current Work Item',
      subject: appointmentWork ? 'Customer appointment inquiry' : workItem.work_item,
      from: appointmentWork ? 'ram@local.dev' : 'customer@local.dev',
      mailbox: 'HP Mailbox',
      source: 'Exchange',
      sensitivity: 'Medium',
      date: '2026-10-07',
      attachment: '',
      content: appointmentWork
        ? 'Ram contacted Swati to discuss the customer appointment and confirm the requested time of 11:30 AM on 8 November.'
        : `Demo email context for ${workItem.label}: ${workItem.work_item}. Request ${workItem.customer_request_id}.`,
    }, ...SCENARIO_EMAILS];
  }, [workItem]);

  const emails = useMemo(
    () =>
      emailsForWork.filter(
        (m) =>
          selMailboxes.includes(m.mailbox) &&
          selSources.includes(m.source) &&
          (has(m.subject, query) || has(m.content, query) || has(m.from, query) || has(m.code, query) || has(m.scenario, query)) &&
          has(m.subject, adv.subject) &&
          has(m.from, adv.sender) &&
          has(m.attachment || '', adv.attachment) &&
          (!adv.sensitivity || m.sensitivity === adv.sensitivity) &&
          (!adv.hasAttachment || !!m.attachment) &&
          (!adv.from || m.date >= adv.from) &&
          (!adv.to || m.date <= adv.to)
      ),
    [emailsForWork, selMailboxes, selSources, query, adv]
  );
  const selected = emails.find((m) => m.id === selectedId);
  const mapping = selected ? DEMO_ORDER_LOOKUP[selected.id] ?? { orderNumber: selected.code === 'EM007' ? 'SO-77150' : 'SO-77021', customerName: selected.from.split('@')[1] ?? 'Demo Customer', deliveryReference: 'DEL-DEMO-001', invoiceNumber: 'INV-2026-0909', orderStatus: 'Under Review' } : null;
  const customerContext = selected ? DEMO_CUSTOMER_CONTEXT[selected.id] ?? { customerType: 'Demo Customer', customerId: `CUS-${selected.code}`, totalOrders: 8, openOrders: 1, openDeliveries: 1, openInvoices: 0, customerStatus: 'Active' } : null;
  const recommendedAction = selected ? ACTION_BY_SCENARIO[selected.scenario] ?? 'Change Delivery Date' : null;
  const currentWorkflowProcess = action ? ACTION_LABEL[action] : 'Select Order Mapping';
  const advActive = JSON.stringify(adv) !== JSON.stringify(EMPTY_ADV);

  const selectEmail = (id: number) => {
    const email = emailsForWork.find((item) => item.id === id);
    setSelectedId(id);
    setTriageCategory(email?.scenario ?? 'General Customer Inquiry');
    setWorkflowAction(null);
    setAction(null);
    setRecordView(null);
    setSaved(false);
  };

  const runWorkflowAction = (nextAction: WorkflowAction) => {
    setWorkflowAction(nextAction);
    if (nextAction === 'Create Invoice') {
      window.history.pushState({}, '', '/invoices/create');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
    if (nextAction === 'View Order') {
      window.history.pushState({}, '', '/?view=order-view');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  const search = () => {
    setQuery(searchText.trim());
    setSelectedId(null);
  };
  const reset = () => {
    setSearchText(''); setQuery(''); setAdv(EMPTY_ADV); setDraft(EMPTY_ADV);
    setSelMailboxes(MAILBOXES); setSelSources(feeds); setSelectedId(null); setAction(null); setWorkflowAction(null); setSaved(false);
  };
  const feedName = newFeed.trim();
  const feedDup = feeds.some((f) => f.toLowerCase() === feedName.toLowerCase());
  const saveFeed = () => {
    if (!feedName || feedDup) return;
    setFeeds([...feeds, feedName]);
    setSelSources([...selSources, feedName]);
    setNewFeed(''); setModal(null);
  };
  const removeFeed = (f: string) => {
    setFeeds(feeds.filter((x) => x !== f));
    setSelSources(selSources.filter((x) => x !== f));
  };
  const setD = (k: keyof AdvFilters) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const value = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
    setDraft({ ...draft, [k]: value });
  };

  return (
    <div className="edp">
      <style>{CSS}</style>

      <header className="hdr">
        <h2>Email Discovery Portal</h2>
        <div className="row">
          <input className="inp" placeholder="Search subject, content, sender..." value={searchText}
            onChange={(e) => setSearchText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && search()} />
          <button className="btn pri" onClick={search}>Search</button>
          <button className="btn" onClick={reset}>Reset</button>
          <button className="btn" onClick={() => { setDraft(adv); setModal('adv'); }}>
            Advanced{advActive && <span className="dot" />}
          </button>
        </div>
      </header>

      <div className="main">
        <aside className="card">
          <div className="grp"><CheckList title="📬 Mailboxes" items={MAILBOXES} sel={selMailboxes} setSel={setSelMailboxes} /></div>
          <hr style={{ border: 0, borderTop: '1px solid #e2e8f0', margin: '16px 0' }} />
          <div className="grp"><CheckList title="🔗 Sources" items={feeds} sel={selSources} setSel={setSelSources} onRemove={removeFeed} /></div>
          <button className="btn pri" style={{ width: '100%', marginTop: 16 }} onClick={() => setModal('feed')}>+ Add Feed</button>
        </aside>

        <main>
          <div className="stats">
            <div className="stat" style={{ background: '#2563eb' }}><p>Total Emails</p><b>{emails.length}</b></div>
            <div className="stat" style={{ background: '#ef4444' }}><p>High Sensitivity</p><b>{emails.filter((e) => e.sensitivity === 'High').length}</b></div>
            <div className="stat" style={{ background: '#10b981' }}><p>Active Sources</p><b>{selSources.length}</b></div>
          </div>
          <div className="card">
            <h3>📋 Search Results</h3>
            {emails.length ? (
              <table>
                <thead><tr><th>ID</th><th>Scenario</th><th>Subject</th><th>Mailbox</th><th>Date</th><th>Sensitivity</th></tr></thead>
                <tbody>
                  {emails.map((m) => (
                      <tr key={m.id} className={m.id === selectedId ? 'sel' : ''} onClick={() => selectEmail(m.id)}>
                      <td>{m.code}</td><td>{m.scenario}</td><td>{m.subject}</td><td>{m.mailbox}</td><td>{m.date}</td>
                      <td><span className="badge" style={{ background: BADGE[m.sensitivity] }}>{m.sensitivity}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="muted">No emails match your filters. <button className="link" onClick={reset}>Clear all filters</button></p>
            )}
          </div>
        </main>

        <section className="card">
          <h3>📩 Email Preview</h3>
          {selected ? (
            <div className="meta">
              <h2 style={{ margin: '0 0 10px' }}>{selected.subject}</h2>
              <p><b>ID:</b> {selected.code}</p>
              <p><b>Scenario:</b> {selected.scenario}</p>
              <p><b>From:</b> {selected.from}</p>
              <p><b>Mailbox:</b> {selected.mailbox}</p>
              <p><b>Source:</b> {selected.source}</p>
              <p><b>Date:</b> {selected.date}</p>
              <p><b>Sensitivity:</b> <span className="badge" style={{ background: BADGE[selected.sensitivity] }}>{selected.sensitivity}</span></p>
              <hr /><p>{selected.content}</p><hr />
              {selected.attachment && <p>📎 {selected.attachment}</p>}
              <div className="record-view-actions"><button className="btn pri" type="button" onClick={() => setRecordView('invoice')}>View Invoice</button><button className="btn" type="button" onClick={() => setRecordView('consignment')}>View FedEx Consignment</button></div>
            </div>
          ) : (
            <p className="muted">Select an email from search results.</p>
          )}
        </section>
      </div>

      {selected && mapping && selected.scenario === 'Tracking Request' && <TrackingRequestFlow email={selected} mapping={mapping} tracking={TRACKING_BY_EMAIL[selected.id]} />}
      {selected && mapping && selected.scenario !== 'Tracking Request' && (
        <section className="edp-workflow card">
          <WorkflowProgress active={workflowAction ? (workflowAction === 'Create Invoice' ? 'Invoice Creation' : workflowAction === 'View Order' ? 'Order View' : 'Action Selection') : 'Email Triage'} />
          <div className="triage-panel"><div><span className="lbl">Email Triage</span><h3>Classify the selected email before processing</h3><p>Review the detected type, then continue with the extracted summary and matched records.</p></div><label className="triage-select">Email type<select value={triageCategory} onChange={(event) => setTriageCategory(event.target.value)}><option>Address Change</option><option>Delivery Date Change</option><option>SPOC Change</option><option>Cancel Order</option><option>Invoice Request</option><option>New Order Creation</option><option>Status Request</option><option>Delivery Issue</option><option>General Customer Inquiry</option></select></label></div>
          <div className="workflow-banner"><div><span className="lbl">Email Summary</span><h2>{selected.subject}</h2><p>{selected.content}</p></div><span className="recommendation">Recommended: {recommendedAction && ACTION_LABEL[recommendedAction]}</span></div>
          <div className="workflow-columns summary-columns">
            <div><h3>Email Summary</h3><dl className="mapping-grid"><div><dt>Sender</dt><dd>{selected.from}</dd></div><div><dt>Subject</dt><dd>{selected.subject}</dd></div><div><dt>Order Number</dt><dd>{mapping.orderNumber}</dd></div><div><dt>PO Number</dt><dd>{mapping.orderNumber.startsWith('PO-') ? mapping.orderNumber : 'Not identified'}</dd></div><div><dt>Invoice Number</dt><dd>{mapping.invoiceNumber}</dd></div><div><dt>Delivery Reference</dt><dd>{mapping.deliveryReference}</dd></div><div><dt>Requested Action</dt><dd>{selected.scenario}</dd></div><div><dt>Priority</dt><dd>{selected.sensitivity}</dd></div></dl></div>
            <div><h3>Order Mapping</h3><dl className="mapping-grid"><div><dt>Order Number</dt><dd>{mapping.orderNumber}</dd></div><div><dt>Customer Name</dt><dd>{mapping.customerName}</dd></div><div><dt>Delivery Reference</dt><dd>{mapping.deliveryReference}</dd></div><div><dt>Invoice Number</dt><dd>{mapping.invoiceNumber}</dd></div><div><dt>Status</dt><dd>{mapping.orderStatus}</dd></div></dl></div>
          </div>
          <div className="workflow-context customer-context"><h3>Customer Context</h3><dl className="mapping-grid"><div><dt>Customer Name</dt><dd>{mapping.customerName}</dd></div><div><dt>Customer Type</dt><dd>{customerContext?.customerType}</dd></div><div><dt>Customer ID</dt><dd>{customerContext?.customerId}</dd></div><div><dt>Total Orders</dt><dd>{customerContext?.totalOrders}</dd></div><div><dt>Open Orders</dt><dd>{customerContext?.openOrders}</dd></div><div><dt>Open Deliveries</dt><dd>{customerContext?.openDeliveries}</dd></div><div><dt>Open Invoices</dt><dd>{customerContext?.openInvoices}</dd></div><div><dt>Customer Status</dt><dd>{customerContext?.customerStatus}</dd></div></dl></div>
          <div className="workflow-context related-records"><h3>Related Records</h3><dl className="mapping-grid"><div><dt>Orders</dt><dd>{mapping.orderNumber}</dd></div><div><dt>Deliveries</dt><dd>{mapping.deliveryReference}</dd></div><div><dt>Invoices</dt><dd>{mapping.invoiceNumber}</dd></div><div><dt>Purchase Orders</dt><dd>{mapping.orderNumber.startsWith('PO-') ? mapping.orderNumber : 'No PO matched'}</dd></div><div><dt>Customer Records</dt><dd>{customerContext?.customerId}</dd></div><div><dt>Match Status</dt><dd>Automatically matched</dd></div></dl></div>
          <div className="workflow-track">
            {['Email Received', 'Email Viewed', 'Email Details Retrieved', 'Query Orders using Email Details', 'Select Existing Order', 'Workflow Complete'].map((step, index) => <button key={step} type="button" className={`workflow-step ${saved ? (index < 5 ? 'done' : 'active') : index < 3 ? 'done' : index === 3 ? 'active' : ''}`} onClick={() => index === 3 && setSaved(false)}><b>{index + 1}</b><span>{step}</span></button>)}
          </div>
          <div className="workflow-context"><h3>Workflow Context</h3><dl className="mapping-grid"><div><dt>Previous Process</dt><dd>Email Details Retrieved</dd><small>Status: Completed</small></div><div><dt>Current Process</dt><dd>{currentWorkflowProcess}</dd><small>Status: {saved ? 'Completed' : 'In Progress'}</small></div><div><dt>Next Process</dt><dd>{saved ? 'Workflow Complete' : (recommendedAction ? ACTION_LABEL[recommendedAction] : 'Recommend Action')}</dd><small>Status: {saved ? 'In Progress' : 'Pending'}</small></div><div><dt>Workflow Status</dt><dd>{saved ? 'Advanced to next process' : 'In Progress'}</dd></div></dl></div>
          <div className="ownership-history"><h3>Workflow Ownership History</h3><div className="ownership-timeline"><article className="ownership-entry completed"><span className="ownership-marker" /><div><strong>Previous Owner: Mailbox Intake</strong><small>Assigned Date: 2026-10-12 · Status: Completed</small><p>Email received and details extracted for order lookup.</p></div></article><article className={`ownership-entry ${saved ? 'completed' : 'current'}`}><span className="ownership-marker" /><div><strong>Current Owner: Order Management</strong><small>Assigned Date: 2026-10-12 · Status: {saved ? 'Completed' : 'In Progress'}</small><p>{saved ? 'Action form saved and workflow advanced.' : 'Reviewing the customer request and preparing the recommended action.'}</p></div></article><article className={`ownership-entry ${saved ? 'current' : 'next'}`}><span className="ownership-marker" /><div><strong>Next Owner: Fulfillment</strong><small>Assigned Date: 2026-10-12 · Status: {saved ? 'In Progress' : 'Pending'}</small><p>{saved ? 'Ready to continue the next workflow process.' : 'Will receive the request after the current action is completed.'}</p></div></article></div></div>
          <div className="action-selection"><div><span className="lbl">Action Selection</span><h3>Choose the next business action</h3></div><div className="action-options">{WORKFLOW_ACTIONS.map((item) => <button key={item} type="button" className={`btn ${workflowAction === item ? 'pri selected-action' : ''}`} onClick={() => runWorkflowAction(item)}>{item}</button>)}</div>{workflowAction && !['Create Invoice', 'View Order'].includes(workflowAction) && <p className="action-feedback">{workflowAction} selected for {mapping.orderNumber}. The related record context is preserved.</p>}</div>
          <div className="action-bar recommendation-details"><div><h3>Recommended Action</h3><dl className="recommendation-grid"><div><dt>Recommended Action</dt><dd>{recommendedAction && ACTION_LABEL[recommendedAction]}</dd></div><div><dt>Reason</dt><dd>{ACTION_REASON[selected.scenario] ?? 'The selected email requires customer order follow-up.'}</dd></div><div><dt>Priority</dt><dd>{selected.sensitivity}</dd></div></dl></div><button className="btn pri" type="button" onClick={() => { setAction(recommendedAction); setSaved(false); }}>{recommendedAction && FORM_BUTTON_LABEL[recommendedAction]}</button></div>
          {action && <div className="ov action-modal" onClick={() => setAction(null)}><div className="modal action-modal-card" onClick={(event) => event.stopPropagation()}><div className="row" style={{ justifyContent: 'space-between' }}><h3>{recommendedAction && ACTION_LABEL[recommendedAction]}</h3><button className="x" type="button" aria-label="Close form" onClick={() => setAction(null)}>×</button></div><ActionForm action={action} mapping={mapping} saved={saved} onSave={() => setSaved(true)} onCancel={() => setAction(null)} /></div></div>}
          <div className="history-strip"><strong>Workflow history</strong><span>Previous Owner: Mailbox Intake</span><span>Current Owner: Order Management</span><span>Next Owner: Fulfillment</span><span>2026-10-12 10:30 · {saved ? 'Completed' : 'In Progress'}</span></div>
        </section>
      )}

      {selected && mapping && recordView && <div className="ov" onClick={() => setRecordView(null)}><div className="record-modal" onClick={(event) => event.stopPropagation()}><button className="record-close" type="button" onClick={() => setRecordView(null)}>×</button>{recordView === 'invoice' && <><button className="record-edit-button btn pri" type="button" onClick={() => setRecordView('invoice-edit')}>Edit Invoice</button><MockInvoiceRecord email={selected} mapping={mapping} /></>}{recordView === 'invoice-edit' && <MockInvoiceEdit email={selected} mapping={mapping} onCancel={() => setRecordView('invoice')} onSave={() => setRecordView('invoice')} />}{recordView === 'consignment' && <MockConsignmentRecord email={selected} mapping={mapping} tracking={TRACKING_BY_EMAIL[selected.id]} />}</div></div>}

      {modal === 'adv' && (
        <div className="ov" onClick={() => setModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Advanced Search</h3>
            <input className="inp" placeholder="Subject" value={draft.subject} onChange={setD('subject')} />
            <input className="inp" placeholder="Sender email" value={draft.sender} onChange={setD('sender')} />
            <input className="inp" placeholder="Attachment name" value={draft.attachment} onChange={setD('attachment')} />
            <select className="inp" value={draft.sensitivity} onChange={setD('sensitivity')}>
              <option value="">All sensitivities</option><option>High</option><option>Medium</option><option>Low</option>
            </select>
            <div className="row">
              <div style={{ flex: 1 }}><span className="lbl">From</span><input className="inp" type="date" value={draft.from} max={draft.to || undefined} onChange={setD('from')} /></div>
              <div style={{ flex: 1 }}><span className="lbl">To</span><input className="inp" type="date" value={draft.to} min={draft.from || undefined} onChange={setD('to')} /></div>
            </div>
            <label className="chk"><input type="checkbox" checked={draft.hasAttachment} onChange={setD('hasAttachment')} /> Has attachment</label>
            <div className="row" style={{ justifyContent: 'space-between', marginTop: 8 }}>
              <button className="btn" onClick={() => setDraft(EMPTY_ADV)}>Clear</button>
              <div className="row">
                <button className="btn" onClick={() => setModal(null)}>Cancel</button>
                <button className="btn pri" onClick={() => { setAdv(draft); setSelectedId(null); setModal(null); }}>Apply Filters</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {modal === 'feed' && (
        <div className="ov" onClick={() => setModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Add Feed</h3>
            <input className="inp" autoFocus placeholder="Feed name" value={newFeed}
              onChange={(e) => setNewFeed(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && saveFeed()} />
            {feedDup && feedName && <span className="err">Feed already exists.</span>}
            <div className="row" style={{ justifyContent: 'flex-end' }}>
              <button className="btn" onClick={() => { setNewFeed(''); setModal(null); }}>Cancel</button>
              <button className="btn pri" disabled={!feedName || feedDup} onClick={saveFeed}>Save Feed</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MockInvoiceEdit({ email, mapping, onCancel, onSave }: { email: MailEmail; mapping: OrderMapping; onCancel: () => void; onSave: () => void }) {
  const [invoiceNumber, setInvoiceNumber] = useState(mapping.invoiceNumber);
  const [poReference, setPoReference] = useState(mapping.orderNumber);
  const [customerName, setCustomerName] = useState(mapping.customerName);
  const [shipTo, setShipTo] = useState(mapping.deliveryReference);
  return <article className="invoice-edit-panel"><header><div><span className="lbl">Invoice Management</span><h2>Edit Invoice</h2></div><span className="status-pill">Draft</span></header><div className="invoice-edit-grid"><label>Invoice Number<input value={invoiceNumber} onChange={(event) => setInvoiceNumber(event.target.value)} /></label><label>Invoice Date<input type="date" defaultValue="2026-10-14" /></label><label>PO Reference<input value={poReference} onChange={(event) => setPoReference(event.target.value)} /></label><label>Customer Email<input value={email.from} readOnly /></label><label>Customer Name<input value={customerName} onChange={(event) => setCustomerName(event.target.value)} /></label><label>Ship To / Delivery Reference<input value={shipTo} onChange={(event) => setShipTo(event.target.value)} /></label></div><div className="invoice-edit-lines"><b>Line Items</b><div><span>Medical device components</span><input type="number" defaultValue="10" min="1" /><input type="number" defaultValue="125.00" min="0" step="0.01" /><strong>$1,250.00</strong></div></div><div className="invoice-edit-actions"><button className="btn" type="button" onClick={onCancel}>Cancel</button><button className="btn pri" type="button" onClick={onSave}>Save Invoice</button></div></article>;
}

function MockInvoiceRecord({ email, mapping }: { email: MailEmail; mapping: OrderMapping }) {
  return <article className="mock-invoice-record"><header><strong>TAX INVOICE</strong><span>Original for Recipient</span></header><div className="mock-invoice-grid invoice-top-grid"><div><b>SELLER DETAILS</b><strong>HP India Sales Pvt Ltd</strong><span>1200 Market Street, Philadelphia, PA 19107</span><span>GSTIN: 27AAACH1234F1Z5</span><span>Contact: support@hp.example.com</span></div><div><b>INVOICE DETAILS</b><span><strong>Invoice No.</strong> {mapping.invoiceNumber}</span><span><strong>Invoice Date</strong> 14 Oct 2026</span><span><strong>Due Date</strong> 13 Nov 2026</span><span><strong>PO Reference</strong> {mapping.orderNumber}</span><span><strong>Place of Supply</strong> United States</span></div></div><div className="mock-invoice-grid invoice-parties"><div><b>BILL TO</b><strong>{mapping.customerName}</strong><span>{email.from}</span><span>Customer account and billing address</span><span><strong>GSTIN:</strong> Unregistered</span></div><div><b>SHIP TO</b><strong>{mapping.customerName}</strong><span>{mapping.deliveryReference}</span><span>Delivery address on order</span></div></div><table className="mock-invoice-lines"><thead><tr><th>#</th><th>Description</th><th>HSN/SAC</th><th>Qty</th><th>Unit</th><th>Rate</th><th>GST %</th><th>Amount</th></tr></thead><tbody><tr><td>1</td><td>Medical device components</td><td>901890</td><td>10</td><td>EA</td><td>$125.00</td><td>8.25%</td><td>$1,250.00</td></tr></tbody></table><div className="mock-invoice-summary"><div className="mock-invoice-summary-left"><div className="mock-invoice-box"><b>AMOUNT IN WORDS</b><strong>US Dollars One Thousand Three Hundred Fifty Three Only</strong></div><div className="mock-invoice-box"><b>PAYMENT / BANK DETAILS</b><span>Bank Name &nbsp; —</span><span>Account Name &nbsp; HP India Sales Pvt Ltd</span><span>Account No. &nbsp; —</span><span>IFSC / SWIFT &nbsp; —</span><span>Payment Terms &nbsp; Payment due within 30 days of invoice date.</span></div></div><table className="mock-invoice-totals"><tbody><tr><th>Subtotal</th><td>$1,250.00</td></tr><tr><th>Discount</th><td>$0.00</td></tr><tr><th>Taxable Value</th><td>$1,250.00</td></tr><tr><th>CGST</th><td>$103.13</td></tr><tr><th>SGST</th><td>$0.00</td></tr><tr><th>IGST</th><td>$0.00</td></tr><tr><th>Round Off</th><td>$0.00</td></tr><tr className="invoice-grand-total"><th>Grand Total</th><td>$1,353.13</td></tr></tbody></table></div><div className="mock-invoice-bottom"><div><b>TERMS &amp; NOTES</b><ol><li>Goods once sold will not be taken back or exchanged.</li><li>Interest will be charged if payment is not received by the due date.</li><li>All disputes are subject to the jurisdiction of the seller's registered office.</li></ol></div><div className="invoice-signatory"><b>FOR HP INDIA SALES PVT LTD</b><span>Authorized Signatory</span></div></div><footer>This is a computer-generated invoice format. Replace bracketed fields before use.</footer></article>;
}

function MockConsignmentRecord({ email, mapping, tracking }: { email: MailEmail; mapping: OrderMapping; tracking?: TrackingDetails }) {
  const details = tracking ?? { carrier: 'FedEx', trackingNumber: '773400000111', shipmentDate: '2026-10-10', currentLocation: 'Memphis, TN Hub', deliveryEta: '2026-10-16', shipmentStatus: 'In Transit', lastUpdated: '2026-10-14 09:42', orderStatus: 'In Transit', expectedDispatchDate: '2026-10-10' };
  return <article className="mock-consignment-record"><div className="mock-consignment-brand"><div><strong>Fed<span>Ex</span></strong><small>COURIER CONSIGNMENT TEMPLATE</small></div><div><b>INTERNATIONAL / DOMESTIC</b><small>Shipment preparation worksheet · complete before booking / handover</small></div></div><section><h4>1. SHIPMENT INFORMATION</h4><div className="mock-consignment-fields"><span><b>Shipment Type</b>{details.carrier} International</span><span><b>FedEx Service / Product</b>International Priority</span><span><b>Ship Date</b>{details.shipmentDate}</span><span><b>Tracking / AWB No.</b>{details.trackingNumber}</span></div></section><section><h4>2. SHIPPER AND RECIPIENT DETAILS</h4><div className="mock-consignment-columns"><div><h5>SHIPPER / FROM</h5><span>HP Medical Logistics</span><span>1200 Market Street, Philadelphia, PA</span><span>support@fedex.example.com</span></div><div><h5>RECIPIENT / TO</h5><span>{mapping.customerName}</span><span>{mapping.deliveryReference}</span><span>{email.from}</span></div></div></section><section><h4>3. PACKAGE / CONSIGNMENT DETAILS</h4><div className="mock-consignment-fields"><span><b>Pieces</b>10</span><span><b>Actual Weight</b>84 kg</span><span><b>Chargeable Weight</b>90 kg</span><span><b>Shipment Purpose</b>Commercial</span></div></section><section><h4>4. CONTENT DESCRIPTION AND CUSTOMS INFORMATION</h4><div className="mock-consignment-fields"><span><b>Description</b>Medical device components</span><span><b>Country of Origin</b>United States</span><span><b>Currency</b>USD</span><span><b>Total Customs Value</b>$1,250.00</span></div></section><section><h4>5. INTERNATIONAL COMMERCIAL / CLEARANCE DETAILS</h4><div className="mock-consignment-fields"><span><b>Booking Reference</b>{mapping.orderNumber}</span><span><b>Incoterm</b>DAP</span><span><b>Reason for Export</b>Commercial shipment</span></div></section><section><h4>6. DOMESTIC DETAILS (USE AS APPLICABLE)</h4><div className="mock-consignment-fields"><span><b>Invoice / Document Ref.</b>{mapping.invoiceNumber}</span><span><b>Contents Category</b>Commercial Goods</span></div></section><section><h4>7. SPECIAL HANDLING / COMPLIANCE</h4><div className="mock-consignment-fields"><span>☐ Fragile &nbsp; ☐ Temperature Sensitive &nbsp; ☐ High Value</span><span>Dangerous / Restricted Goods: ☐ No ☐ Yes</span></div></section><section><h4>8. SHIPPER DECLARATION / AUTHORIZATION</h4><p className="mock-consignment-declaration">I confirm that the shipment information provided above is complete and accurate to the best of my knowledge.</p><div className="mock-consignment-signature"><span>Authorized Name / Designation</span><span>Signature</span><span>Date / Company Stamp</span></div></section></article>;
}

function TrackingRequestFlow({ email, mapping, tracking }: { email: MailEmail; mapping: OrderMapping; tracking: TrackingDetails }) {
  const [response, setResponse] = useState(`Dear Customer,\n\nYour shipment has been identified.\n\nTracking Number: ${tracking.trackingNumber ?? 'Not available'}\nCarrier: ${tracking.carrier}\nCurrent Status: ${tracking.shipmentStatus || tracking.orderStatus}\nExpected Delivery: ${tracking.deliveryEta || 'To be confirmed'}\n\nYou can use the tracking number to monitor shipment progress.\n\nRegards,\nSupport Team`);
  const [status, setStatus] = useState<'New' | 'In Progress' | 'Tracking Found' | 'Customer Notified' | 'Closed'>('New');
  const [sent, setSent] = useState(false);
  const available = !!tracking.trackingNumber;
  const copyTracking = async () => { if (tracking.trackingNumber) await navigator.clipboard?.writeText(tracking.trackingNumber); setStatus('Tracking Found'); };
  const send = () => { setSent(true); setStatus('Customer Notified'); };
  return <section className="tracking-request-workflow">
    <div className="tracking-request-progress"><span className="done">1. Email Worklist</span><span className="done">2. Open Email</span><span className="done">3. Email Summary</span><span className="active">4. Shipment Resolution</span><span>5. Customer Response</span></div>
    <div className="tracking-request-summary"><div><span className="lbl">Email Summary</span><h2>{email.subject}</h2><p>{email.content}</p></div><span className="tracking-status">{status}</span></div>
    <div className="tracking-request-grid"><article className="tracking-request-card"><h3>Email Summary</h3><dl><div><dt>Customer Name</dt><dd>{mapping.customerName}</dd></div><div><dt>Customer Email</dt><dd>{email.from}</dd></div><div><dt>Order Number</dt><dd>{mapping.orderNumber}</dd></div><div><dt>Invoice Number</dt><dd>{mapping.invoiceNumber}</dd></div><div><dt>Request Type</dt><dd>Tracking Request</dd></div><div><dt>AI Summary</dt><dd>Customer is requesting shipment tracking details for the referenced order.</dd></div></dl></article><article className="tracking-request-card"><h3>{available ? 'Consignment Details' : 'Order Status Details'}</h3>{available ? <dl><div><dt>Carrier Name</dt><dd>{tracking.carrier}</dd></div><div><dt>Tracking Number</dt><dd className="tracking-number">{tracking.trackingNumber}</dd></div><div><dt>Shipment Date</dt><dd>{tracking.shipmentDate}</dd></div><div><dt>Current Location</dt><dd>{tracking.currentLocation}</dd></div><div><dt>Delivery ETA</dt><dd>{tracking.deliveryEta}</dd></div><div><dt>Shipment Status</dt><dd>{tracking.shipmentStatus}</dd></div><div><dt>Last Updated</dt><dd>{tracking.lastUpdated}</dd></div></dl> : <><p className="tracking-unavailable">No shipment tracking details are currently available.</p><dl><div><dt>Order Number</dt><dd>{mapping.orderNumber}</dd></div><div><dt>Current Order Status</dt><dd>{tracking.orderStatus}</dd></div><div><dt>Expected Dispatch Date</dt><dd>{tracking.expectedDispatchDate}</dd></div></dl></>}</article></div>
    <div className="tracking-request-actions"><h3>Available Actions</h3><div className="tracking-action-buttons">{available ? <><button className="btn pri" onClick={() => setStatus('In Progress')}>View Tracking Details</button><button className="btn" onClick={copyTracking}>Copy Tracking Number</button><button className="btn" onClick={() => { setStatus('In Progress'); document.getElementById('tracking-response')?.scrollIntoView({ behavior: 'smooth' }); }}>Send Tracking Details</button><button className="btn" onClick={() => setStatus('In Progress')}>View Related Order</button><button className="btn" onClick={() => setStatus('In Progress')}>Refresh Tracking Status</button></> : <><button className="btn pri" onClick={() => setStatus('In Progress')}>View Order Status</button><button className="btn" onClick={send}>Notify Customer</button><button className="btn" onClick={() => setStatus('In Progress')}>Create Follow-up Task</button></>}</div></div>
    <div id="tracking-response" className="tracking-response"><div><h3>Generate Customer Response</h3><p>Review and edit the response before sending.</p></div><textarea value={response} onChange={(event) => setResponse(event.target.value)} rows={10} /><div className="tracking-response-footer"><span>{sent ? 'Email sent to customer.' : `Request status: ${status}`}</span><button className="btn pri" onClick={send}>{sent ? 'Sent' : 'Send Email'}</button></div></div>
  </section>;
}

function ActionForm({ action, mapping, saved, onSave, onCancel }: { action: ActionType; mapping: OrderMapping; saved: boolean; onSave: () => void; onCancel: () => void }) {
  const [values, setValues] = useState<Record<string, string>>({ orderNumber: mapping.orderNumber, customerName: mapping.customerName, shipName: mapping.customerName, shipTo: 'Plot 14, Industrial Area Phase 2, Pune 411019', city: 'Pune', state: 'Maharashtra', postalCode: '411019', phone: '+91 98765 43210', billTo: 'ACME Retail India, Pune', contact: 'priya.nair@acmeretail.com · +91 98765 43210', existingDate: '21 October 2026', newDate: '28 October 2026', name: 'Anita Desai', email: 'anita.desai@northwind.com', department: 'Customer Operations', reason: 'Project requirements changed', remarks: 'Please confirm cancellation charges.', invoiceNumber: mapping.invoiceNumber, seller: 'HP India Sales Pvt Ltd · GSTIN 27AAACH1234F1Z5', customerDetails: `${mapping.customerName} · ${mapping.orderNumber}`, bill: 'ACME Retail India, Pune', ship: 'Plot 14, Industrial Area Phase 2, Pune 411019', product: 'Demo product', quantity: '10', unitPrice: '₹ 10,508.47', tax: '18%', terms: 'Net 30', total: '₹ 124,000' });
  const [confirming, setConfirming] = useState(false);
  const update = (key: string) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setValues({ ...values, [key]: event.target.value });
  const fields: Record<ActionType, [string, string][]> = {
    'Change Address': [['Order Number', 'orderNumber'], ['Customer Name', 'customerName'], ['Ship To Name', 'shipName'], ['Ship To Address', 'shipTo'], ['City', 'city'], ['State', 'state'], ['Postal Code', 'postalCode'], ['Phone Number', 'phone']],
    'Change Delivery Date': [['Order Number', 'orderNumber'], ['Current Delivery Date', 'existingDate'], ['New Delivery Date', 'newDate'], ['Change Reason', 'reason'], ['Remarks', 'remarks']],
    'Change Delivery SPOC': [['Contact Name', 'name'], ['Email', 'email'], ['Phone Number', 'phone'], ['Department', 'department']],
    'Cancel Order': [['Order Number', 'orderNumber'], ['Customer Name', 'customerName'], ['Cancellation Reason', 'reason'], ['Additional Remarks', 'remarks']],
    'Create Invoice': [['Invoice Number', 'invoiceNumber'], ['Seller Details', 'seller'], ['Customer Details', 'customerDetails'], ['Bill To Address', 'bill'], ['Ship To Address', 'ship'], ['Product Details', 'product'], ['Quantity', 'quantity'], ['Unit Price', 'unitPrice'], ['Tax', 'tax'], ['Payment Terms', 'terms'], ['Total Amount', 'total']],
  };
  return <div className="action-form"><div className="panel-heading"><div><span className="lbl">Workflow ID: WF-{mapping.orderNumber}</span><h3>{action} Form</h3></div><span className="status-pill">{saved ? 'Saved' : 'Draft'}</span></div><div className="form-grid">{fields[action].map(([label, key]) => <label key={`${action}-${key}`}>{label}{key === 'remarks' || key === 'shipTo' || key === 'billTo' || key === 'contact' || key === 'seller' || key === 'bill' || key === 'ship' || key === 'product' ? <textarea rows={2} value={values[key]} onChange={update(key)} /> : <input value={values[key]} onChange={update(key)} />}</label>)}</div>{action === 'Cancel Order' && confirming && <div className="confirmation-box" role="alert"><strong>Confirm order cancellation?</strong><p>This will submit the cancellation request for {values.orderNumber} on behalf of {values.customerName}.</p><button className="btn" type="button" onClick={() => setConfirming(false)}>Back</button><button className="btn pri" type="button" onClick={onSave}>Confirm Cancellation</button></div>}{!confirming && <div className="form-actions"><button className="btn" type="button" onClick={onCancel}>Cancel</button><button className="btn pri" type="button" onClick={() => action === 'Cancel Order' ? setConfirming(true) : onSave()}>{action === 'Cancel Order' ? 'Review Cancellation' : action === 'Create Invoice' ? 'Save Sales Invoice' : 'Save and Complete Workflow'}</button></div>}</div>;
}
