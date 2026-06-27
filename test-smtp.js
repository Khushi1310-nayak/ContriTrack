const nodemailer = require("nodemailer");
require("dotenv").config({ path: ".env.local" });

async function testSMTP() {
  console.log("Testing SMTP connection with credentials:");
  console.log("User:", process.env.SMTP_USER);
  console.log("Pass length:", process.env.SMTP_PASS ? process.env.SMTP_PASS.length : 0);

  let transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "465"),
    secure: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  try {
    await transporter.verify();
    console.log("✅ SMTP Connection Successful! The credentials are valid.");
  } catch (error) {
    console.error("❌ SMTP Connection Failed:", error.message);
  }
}

testSMTP();
