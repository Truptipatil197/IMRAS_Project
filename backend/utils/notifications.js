const nodemailer = require('nodemailer');

const isEmailConfigured = process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER;

const transporter = isEmailConfigured
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT, 10) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    })
  : null;

const sendEmail = async (to, subject, html) => {
  if (!transporter) {
    console.log(`[Notification skipped] ${subject} -> ${to}`);
    return;
  }

  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'noreply@imras.local',
    to,
    subject,
    html
  });
};

const sendPRApprovalNotification = async (pr_id, requester_email) => {
  if (!requester_email) return;
  const html = `
    <h3>Purchase Requisition Approved</h3>
    <p>Your purchase requisition #${pr_id} has been approved.</p>
    <p>You can proceed to monitor the subsequent PO creation.</p>
  `;
  await sendEmail(requester_email, `PR #${pr_id} Approved`, html);
};

const sendPRRejectionNotification = async (pr_id, requester_email, reason) => {
  if (!requester_email) return;
  const html = `
    <h3>Purchase Requisition Rejected</h3>
    <p>Your purchase requisition #${pr_id} was rejected.</p>
    <p>Reason: ${reason}</p>
  `;
  await sendEmail(requester_email, `PR #${pr_id} Rejected`, html);
};

const sendPOCreatedNotification = async (po_id, supplier_email) => {
  if (!supplier_email) return;
  const html = `
    <h3>New Purchase Order</h3>
    <p>Purchase Order #${po_id} has been issued to your organization.</p>
    <p>Please review and confirm the expected delivery timeline.</p>
  `;
  await sendEmail(supplier_email, `PO #${po_id} Issued`, html);
};

const sendReorderAlertNotification = async (alert_id, manager_email) => {
  if (!manager_email) return;
  const html = `
    <h3>New Reorder Alert</h3>
    <p>Alert #${alert_id || ''} requires your attention.</p>
    <p>Please review low or critical stock items in IMRAS.</p>
  `;
  await sendEmail(manager_email, `IMRAS Reorder Alert ${alert_id || ''}`, html);
};

module.exports = {
  sendPRApprovalNotification,
  sendPRRejectionNotification,
  sendPOCreatedNotification,
  sendReorderAlertNotification
};

