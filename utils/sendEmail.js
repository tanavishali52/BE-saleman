const nodemailer = require("nodemailer");

const sendEmail = async (to, subject, text) => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error("Email service not configured. Set SMTP_USER and SMTP_PASS in .env");
  }
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: process.env.SMTP_USER,
    to,
    subject,
    text,
  });
};

module.exports = sendEmail;

