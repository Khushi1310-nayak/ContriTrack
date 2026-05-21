"use server";

import nodemailer from "nodemailer";

export async function sendWorkspaceInviteEmail(
  toEmail: string,
  workspaceName: string,
  inviteCode: string,
  inviterName: string
) {
  try {
    const host = process.env.SMTP_HOST || "smtp.gmail.com";
    const port = parseInt(process.env.SMTP_PORT || "465");
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!user || !pass) {
      console.warn("SMTP credentials not configured in .env. Falling back to console log for testing.");
      return {
        success: false,
        error: "SMTP_USER or SMTP_PASS is missing in .env. Please fill in these environment variables to enable real email deliveries."
      };
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // True for 465, false for 587
      auth: {
        user,
        pass,
      },
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const mailOptions = {
      from: `"TeamTrace Recruitment" <${user}>`,
      to: toEmail,
      subject: `Join ${inviterName} in the "${workspaceName}" Workspace on TeamTrace`,
      html: `
        <div style="background-color: #09090b; padding: 40px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; text-align: center; color: #ffffff;">
          <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #141523; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 24px; padding: 40px; box-shadow: 0 20px 40px rgba(0,0,0,0.5);">
            <tr>
              <td align="center" style="padding-bottom: 20px;">
                <span style="font-size: 24px; font-family: 'Cinzel', Georgia, serif; color: #F2C1A3; font-weight: 300; letter-spacing: 2px;">TEAMTRACE</span>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding-bottom: 20px; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
                <h1 style="color: #ffffff; font-size: 20px; font-weight: 300; margin: 0; font-family: 'Playfair Display', Georgia, serif;">Collaborative Workspace Invitation</h1>
              </td>
            </tr>
            <tr>
              <td style="padding-top: 30px; padding-bottom: 30px; text-align: left;">
                <p style="font-size: 14px; line-height: 1.6; color: #857C91; margin: 0 0 16px 0;">
                  Greetings,
                </p>
                <p style="font-size: 14px; line-height: 1.6; color: #d1d5db; margin: 0 0 16px 0;">
                  <strong>${inviterName}</strong> has invited you to join their elite collaborative workspace <strong>"${workspaceName}"</strong> on TeamTrace—the ultimate full-stack workforce intelligence system.
                </p>
                <p style="font-size: 14px; line-height: 1.6; color: #d1d5db; margin: 0 0 24px 0;">
                  Use the exclusive, dynamically rotating invite code below to gain access to the workspace:
                </p>
                
                <div style="background-color: #0b0c16; border: 1px solid rgba(242, 193, 163, 0.2); border-radius: 16px; padding: 20px; text-align: center; margin-bottom: 24px;">
                  <span style="font-size: 10px; font-family: monospace; text-transform: uppercase; color: #857C91; display: block; margin-bottom: 8px; letter-spacing: 1px;">Access Invite Code</span>
                  <span style="font-size: 24px; font-family: monospace; font-weight: bold; color: #F2C1A3; letter-spacing: 4px;">${inviteCode}</span>
                  <span style="font-size: 9px; font-family: monospace; color: #CD9FA0; display: block; margin-top: 8px;">* Code rotates dynamically for enterprise security</span>
                </div>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding-bottom: 30px;">
                <a href="${appUrl}/dashboard" style="background-color: #F2C1A3; color: #12131e; padding: 12px 30px; border-radius: 30px; font-size: 13px; font-weight: bold; text-decoration: none; display: inline-block; transition: background-color 0.3s ease;">
                  Enter TeamTrace Dashboard
                </a>
              </td>
            </tr>
            <tr>
              <td style="border-top: 1px solid rgba(255, 255, 255, 0.05); padding-top: 20px; text-align: center;">
                <span style="font-size: 10px; color: #857C91; font-family: monospace;">This is an automated operational email from TeamTrace.</span>
              </td>
            </tr>
          </table>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email successfully dispatched to Gmail recipient:", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    const err = error as Error;
    console.error("Failed to send workspace invitation email:", err);
    return { success: false, error: err.message || "Failed to dispatch email." };
  }
}
