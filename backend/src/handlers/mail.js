const nodemailer = require('nodemailer');
const { Resend } = require('resend');

let transporter = null;

if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS.replace(/\s+/g, ''),
    },
  });
}

exports.send = async ({ to, subject, html, text }) => {
  const from = process.env.EMAIL_FROM || `TecMotiv ERP <${process.env.EMAIL_USER}>`;

  if (transporter) {
    const info = await transporter.sendMail({
      from,
      to,
      subject,
      text,
      html,
    });
    return info;
  }

  if (process.env.RESEND_API) {
    const resend = new Resend(process.env.RESEND_API);
    const { data } = await resend.emails.send({
      from,
      to,
      subject,
      html,
    });
    return data;
  }

  console.warn('No email provider configured. Logging email:', { to, subject });
  return { status: 'simulated', to, subject };
};

exports.verify = async () => {
  if (transporter) {
    return await transporter.verify();
  }
  return false;
};
