"use server";

import { prisma } from "@/lib/db";
import { z } from "zod";
import crypto from "crypto";
import nodemailer from "nodemailer";
import fs from "fs/promises";
import path from "path";

// Strict Zod Validation Schema for candidate application payload
const ApplicationFormSchema = z.object({
  roleId: z.string().min(1, "Role configuration is required."),
  roleTitle: z.string().min(1, "Role title is required."),
  fullName: z.string().min(2, "Full name must be at least 2 characters."),
  email: z.string().email("Invalid email address format."),
  phone: z.string().min(5, "Valid phone number is required."),
  country: z.string().min(2, "Country is required."),
  university: z.string().min(2, "University is required."),
  degree: z.string().min(2, "Degree specification is required."),
  gradYear: z.string().min(4, "Four-digit graduation year is required."),
  experienceLevel: z.enum(["student", "fresher", "experienced"]),
  github: z.string().url("Invalid GitHub URL format.").optional().or(z.literal("")),
  linkedin: z.string().url("Invalid LinkedIn URL format.").optional().or(z.literal("")),
  portfolio: z.string().url("Invalid Portfolio URL format.").optional().or(z.literal("")),
  resumeUrl: z.string().url("Valid resume file URL is required."),
  whyJoin: z.string().min(20, "Please elaborate on why you want to join ContriTrack (min 20 characters)."),
  bestProject: z.string().min(20, "Please describe the best project you constructed (min 20 characters)."),
  techStrengths: z.string().min(10, "Please list your core tech strengths."),
  collabExp: z.string().min(20, "Please describe your collaborative teamwork experiences."),
  availability: z.string().min(5, "Please clarify your availability timeline."),
  honeypot: z.string().max(0, "Spam threshold exceeded.").optional() // Anti-spam honeypot
});

export type ApplicationInput = z.infer<typeof ApplicationFormSchema>;

export interface RawJobApplication {
  id: string;
  roleId: string;
  roleTitle: string;
  fullName: string;
  email: string;
  phone: string;
  country: string;
  university: string;
  degree: string;
  gradYear: string;
  experienceLevel: string;
  github: string | null;
  linkedin: string | null;
  portfolio: string | null;
  resumeUrl: string;
  whyJoin: string;
  bestProject: string;
  techStrengths: string;
  collabExp: string;
  availability: string;
  status: string;
  notes: string | null;
  interviewLink: string | null;
  interviewDate: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// Ensure recruiting tables are fully initialized in PostgreSQL without locking
async function ensureJobApplicationTableExists() {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "JobApplication" (
        "id" TEXT PRIMARY KEY,
        "roleId" TEXT NOT NULL,
        "roleTitle" TEXT NOT NULL,
        "fullName" TEXT NOT NULL,
        "email" TEXT NOT NULL,
        "phone" TEXT NOT NULL,
        "country" TEXT NOT NULL,
        "university" TEXT NOT NULL,
        "degree" TEXT NOT NULL,
        "gradYear" TEXT NOT NULL,
        "experienceLevel" TEXT NOT NULL,
        "github" TEXT,
        "linkedin" TEXT,
        "portfolio" TEXT,
        "resumeUrl" TEXT NOT NULL,
        "whyJoin" TEXT NOT NULL,
        "bestProject" TEXT NOT NULL,
        "techStrengths" TEXT NOT NULL,
        "collabExp" TEXT NOT NULL,
        "availability" TEXT NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'pending',
        "notes" TEXT,
        "interviewLink" TEXT,
        "interviewDate" TIMESTAMP WITH TIME ZONE,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);
  } catch (error) {
    console.error("Error creating JobApplication PostgreSQL table:", error);
  }
}

// Mail Dispatcher Helper
async function sendATSNotificationEmail(to: string, subject: string, htmlContent: string) {
  try {
    const host = process.env.SMTP_HOST || "smtp.gmail.com";
    const port = parseInt(process.env.SMTP_PORT || "465");
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!user || !pass) {
      console.warn("SMTP credentials not configured. Email logged to console.");
      return { success: false, error: "SMTP credentials missing in env." };
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass }
    });

    const mailOptions = {
      from: `"ContriTrack Recruitment" <${user}>`,
      to,
      subject,
      html: htmlContent
    };

    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error("Failed to dispatch ATS transactional notification email:", error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Persist candidate applications to Postgres and trigger notifications
 */
export async function createJobApplicationAction(rawInput: ApplicationInput) {
  try {
    await ensureJobApplicationTableExists();

    // 1. Validate Form Fields & Honeypot Protection
    const result = ApplicationFormSchema.safeParse(rawInput);
    if (!result.success) {
      const errorMsg = result.error.issues.map(e => `${e.path.join(".")}: ${e.message}`).join(", ");
      return { success: false, error: `Validation Failure: ${errorMsg}` };
    }

    const data = result.data;
    const applicationId = crypto.randomUUID();

    // 2. Persist safely in PostgreSQL via parameterized raw query
    await prisma.$executeRawUnsafe(`
      INSERT INTO "JobApplication" (
        "id", "roleId", "roleTitle", "fullName", "email", "phone", "country", "university", "degree", 
        "gradYear", "experienceLevel", "github", "linkedin", "portfolio", "resumeUrl", 
        "whyJoin", "bestProject", "techStrengths", "collabExp", "availability", "status", "createdAt", "updatedAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, 'pending', NOW(), NOW())
    `,
      applicationId,
      data.roleId,
      data.roleTitle,
      data.fullName,
      data.email,
      data.phone,
      data.country,
      data.university,
      data.degree,
      data.gradYear,
      data.experienceLevel,
      data.github || null,
      data.linkedin || null,
      data.portfolio || null,
      data.resumeUrl,
      data.whyJoin,
      data.bestProject,
      data.techStrengths,
      data.collabExp,
      data.availability
    );

    // 3. Email Alert to Candidate
    const candidateHtml = `
      <div style="background-color: #07080b; padding: 40px; font-family: sans-serif; color: #ffffff;">
        <table align="center" style="max-width: 600px; background-color: #0e1017; border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 20px; padding: 30px; box-shadow: 0 10px 30px rgba(0,0,0,0.8);">
          <tr>
            <td align="center">
              <span style="font-size: 20px; font-family: serif; color: #F2C1A3; letter-spacing: 2px;">CONTRITRACK RECRUITMENT</span>
            </td>
          </tr>
          <tr>
            <td style="padding-top: 20px;">
              <h2 style="font-size: 18px; font-weight: 300; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 12px; color: #ffffff;">Application Confirmed</h2>
              <p style="color: #857C91; font-size: 13px; line-height: 1.6;">
                Dear <strong>${data.fullName}</strong>,
              </p>
              <p style="color: #d1d5db; font-size: 13px; line-height: 1.6;">
                We have successfully registered your candidacy for the <strong>${data.roleTitle}</strong> position track. Your profile metadata is locked into our operational recruitment database.
              </p>
              <p style="color: #d1d5db; font-size: 13px; line-height: 1.6;">
                Our technical board will review your background and portfolio. If shortlisted, you will receive automated invite links to schedule interview sprints.
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 20px 0;">
              <div style="background-color: #07080b; border-radius: 12px; padding: 15px; border: 1px solid rgba(242, 193, 163, 0.1);">
                <span style="font-size: 10px; font-family: monospace; color: #CD9FA0; display: block; margin-bottom: 4px;">Recruitment Identifier</span>
                <span style="font-size: 12px; font-family: monospace; color: #ffffff; font-weight: bold;">${applicationId}</span>
              </div>
            </td>
          </tr>
          <tr>
            <td style="border-top: 1px solid rgba(255,255,255,0.05); padding-top: 15px; text-align: center;">
              <span style="font-size: 9px; color: #857C91;">© ${new Date().getFullYear()} ContriTrack. Premium Developer Ecosystem.</span>
            </td>
          </tr>
        </table>
      </div>
    `;
    await sendATSNotificationEmail(data.email, `Application Confirmed: ${data.roleTitle} at ContriTrack`, candidateHtml);

    // 4. Email Alert to Admin (Deep Link Coordinator)
    const adminEmail = "khushinayak127@gmail.com";
    const adminHtml = `
      <div style="background-color: #07080b; padding: 40px; font-family: sans-serif; color: #ffffff;">
        <table align="center" style="max-width: 600px; background-color: #0e1017; border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 20px; padding: 30px;">
          <tr>
            <td>
              <span style="font-size: 10px; font-family: monospace; color: #CD9FA0; text-transform: uppercase;">System Trigger Alert</span>
              <h2 style="font-size: 20px; font-serif: Georgia, serif; color: #ffffff; margin-top: 5px;">New Applicant Reconciled</h2>
              
              <div style="background-color: #07080b; border-radius: 12px; padding: 15px; border: 1px solid rgba(255,255,255,0.03); margin-top: 20px;">
                <h3 style="font-size: 13px; color: #F2C1A3; margin: 0 0 10px 0;">Candidate Info</h3>
                <p style="font-size: 12px; color: #d1d5db; margin: 4px 0;"><strong>Name:</strong> ${data.fullName}</p>
                <p style="font-size: 12px; color: #d1d5db; margin: 4px 0;"><strong>Role:</strong> ${data.roleTitle}</p>
                <p style="font-size: 12px; color: #d1d5db; margin: 4px 0;"><strong>Track:</strong> ${data.experienceLevel.toUpperCase()}</p>
                <p style="font-size: 12px; color: #d1d5db; margin: 4px 0;"><strong>Email:</strong> ${data.email}</p>
                <p style="font-size: 12px; color: #d1d5db; margin: 4px 0;"><strong>Phone:</strong> ${data.phone} (${data.country})</p>
                <p style="font-size: 12px; color: #d1d5db; margin: 4px 0;"><strong>University:</strong> ${data.university} (${data.degree}, ${data.gradYear})</p>
              </div>

              <div style="background-color: #07080b; border-radius: 12px; padding: 15px; border: 1px solid rgba(255,255,255,0.03); margin-top: 15px;">
                <h3 style="font-size: 13px; color: #F2C1A3; margin: 0 0 10px 0;">Professional Profiles</h3>
                <p style="font-size: 12px; color: #d1d5db; margin: 4px 0;"><strong>Resume File:</strong> <a href="${data.resumeUrl}" style="color: #CD9FA0;" target="_blank">Download Resume PDF</a></p>
                ${data.github ? `<p style="font-size: 12px; color: #d1d5db; margin: 4px 0;"><strong>GitHub:</strong> <a href="${data.github}" style="color: #CD9FA0;" target="_blank">${data.github}</a></p>` : ""}
                ${data.linkedin ? `<p style="font-size: 12px; color: #d1d5db; margin: 4px 0;"><strong>LinkedIn:</strong> <a href="${data.linkedin}" style="color: #CD9FA0;" target="_blank">${data.linkedin}</a></p>` : ""}
                ${data.portfolio ? `<p style="font-size: 12px; color: #d1d5db; margin: 4px 0;"><strong>Portfolio:</strong> <a href="${data.portfolio}" style="color: #CD9FA0;" target="_blank">${data.portfolio}</a></p>` : ""}
              </div>

              <div style="background-color: #07080b; border-radius: 12px; padding: 15px; border: 1px solid rgba(255,255,255,0.03); margin-top: 15px;">
                <h3 style="font-size: 13px; color: #F2C1A3; margin: 0 0 10px 0;">Technical Strengths</h3>
                <p style="font-size: 12px; color: #d1d5db; line-height: 1.5; margin: 0;">${data.techStrengths}</p>
              </div>

              <div style="margin-top: 25px; text-align: center;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/admin/careers" style="background-color: #CD9FA0; color: #12131e; padding: 10px 25px; border-radius: 20px; text-decoration: none; font-size: 12px; font-weight: bold; display: inline-block;">
                  Manage Applicant in ATS Panel
                </a>
              </div>
            </td>
          </tr>
        </table>
      </div>
    `;
    await sendATSNotificationEmail(adminEmail, `[ATS Alert] New application for ${data.roleTitle} by ${data.fullName}`, adminHtml);

    return { success: true, id: applicationId };
  } catch (error) {
    console.error("Failed to persist job application:", error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Retrieve all applications for admin view
 */
export async function getJobApplicationsAction() {
  try {
    await ensureJobApplicationTableExists();

    const apps = await prisma.$queryRawUnsafe<RawJobApplication[]>(`
      SELECT * FROM "JobApplication"
      ORDER BY "createdAt" DESC
    `);

    return apps.map(a => ({
      id: a.id,
      roleId: a.roleId,
      roleTitle: a.roleTitle,
      fullName: a.fullName,
      email: a.email,
      phone: a.phone,
      country: a.country,
      university: a.university,
      degree: a.degree,
      gradYear: a.gradYear,
      experienceLevel: a.experienceLevel,
      github: a.github || "",
      linkedin: a.linkedin || "",
      portfolio: a.portfolio || "",
      resumeUrl: a.resumeUrl,
      whyJoin: a.whyJoin,
      bestProject: a.bestProject,
      techStrengths: a.techStrengths,
      collabExp: a.collabExp,
      availability: a.availability,
      status: a.status,
      notes: a.notes || "",
      interviewLink: a.interviewLink || "",
      interviewDate: a.interviewDate ? new Date(a.interviewDate).toISOString() : null,
      createdAt: new Date(a.createdAt).toISOString(),
      updatedAt: new Date(a.updatedAt).toISOString()
    }));
  } catch (error) {
    console.error("Failed to query applicant list:", error);
    return [];
  }
}

/**
 * Update candidate status, logs data, and dispatch shortlisted / interview setup emails
 */
export async function updateApplicationStatusAction(
  id: string,
  status: string,
  notes: string,
  interviewDate: string | null = null,
  interviewLink: string | null = null
) {
  try {
    await ensureJobApplicationTableExists();

    const parsedDate = interviewDate ? new Date(interviewDate) : null;

    // 1. Update DB entry
    await prisma.$executeRawUnsafe(`
      UPDATE "JobApplication"
      SET "status" = $1, "notes" = $2, "interviewDate" = $3, "interviewLink" = $4, "updatedAt" = NOW()
      WHERE "id" = $5
    `, status, notes, parsedDate, interviewLink, id);

    // 2. Fetch updated candidate details for email triggers
    const candidates = await prisma.$queryRawUnsafe<RawJobApplication[]>(`
      SELECT * FROM "JobApplication"
      WHERE "id" = $1
      LIMIT 1
    `, id);

    if (candidates.length === 0) {
      return { success: false, error: "Candidate reference not found." };
    }

    const c = candidates[0];

    // 3. Dispatch automated status alerts
    if (status === "shortlisted") {
      const shortlistHtml = `
        <div style="background-color: #07080b; padding: 40px; font-family: sans-serif; color: #ffffff;">
          <table align="center" style="max-width: 600px; background-color: #0e1017; border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 20px; padding: 30px;">
            <tr>
              <td align="center">
                <span style="font-size: 10px; font-family: monospace; color: #F2C1A3; text-transform: uppercase;">ContriTrack Recruitment</span>
                <h2 style="font-size: 20px; font-serif: serif; color: #ffffff; margin-top: 5px;">Congratulations! You are Shortlisted</h2>
              </td>
            </tr>
            <tr>
              <td style="padding-top: 20px; color: #d1d5db; font-size: 13.5px; line-height: 1.6;">
                <p>Dear <strong>${c.fullName}</strong>,</p>
                <p>We are delighted to inform you that your application for <strong>${c.roleTitle}</strong> has been **shortlisted** by our review board!</p>
                <p>Your technical responses and portfolio highlight exceptional alignment with our core engineering mission.</p>
                <p><strong>Next Step:</strong> Our coordinators will review calendar availability pipelines to set up your technical evaluation sprints. Look out for another email containing interview slots shortly.</p>
              </td>
            </tr>
            <tr>
              <td style="border-top: 1px solid rgba(255,255,255,0.05); padding-top: 15px; text-align: center; margin-top: 20px;">
                <span style="font-size: 9px; color: #857C91;">© ${new Date().getFullYear()} ContriTrack. Premium Developer Ecosystem.</span>
              </td>
            </tr>
          </table>
        </div>
      `;
      await sendATSNotificationEmail(c.email, `Application Shortlisted: ${c.roleTitle} at ContriTrack`, shortlistHtml);
    } 
    
    else if (status === "interview" && interviewLink && parsedDate) {
      const formattedDate = parsedDate.toLocaleDateString("en-US", {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit', timeZoneName: 'short'
      });

      const interviewHtml = `
        <div style="background-color: #07080b; padding: 40px; font-family: sans-serif; color: #ffffff;">
          <table align="center" style="max-width: 600px; background-color: #0e1017; border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 20px; padding: 30px;">
            <tr>
              <td align="center">
                <span style="font-size: 10px; font-family: monospace; color: #F2C1A3; text-transform: uppercase;">Interview Scheduled</span>
                <h2 style="font-size: 20px; font-serif: serif; color: #ffffff; margin-top: 5px;">Your Technical Sprint is set!</h2>
              </td>
            </tr>
            <tr>
              <td style="padding-top: 20px; color: #d1d5db; font-size: 13.5px; line-height: 1.6;">
                <p>Dear <strong>${c.fullName}</strong>,</p>
                <p>We have scheduled your technical evaluation interview for the <strong>${c.roleTitle}</strong> track.</p>
                
                <div style="background-color: #07080b; border-radius: 12px; padding: 15px; border: 1px solid rgba(242, 193, 163, 0.1); margin: 20px 0;">
                  <p style="margin: 4px 0; font-size: 13px;"><strong>Date & Time:</strong> ${formattedDate}</p>
                  <p style="margin: 4px 0; font-size: 13px;"><strong>Meeting Link:</strong> <a href="${interviewLink}" style="color: #F2C1A3; word-break: break-all;" target="_blank">${interviewLink}</a></p>
                </div>
                
                <p><strong>Instructions:</strong> Please prepare a quiet environment, verify your audio and video components, and click the meeting link at the scheduled time. Be ready to discuss your portfolio, code challenges, and collaborative workspace experiences.</p>
              </td>
            </tr>
            <tr>
              <td style="border-top: 1px solid rgba(255,255,255,0.05); padding-top: 15px; text-align: center;">
                <span style="font-size: 9px; color: #857C91;">© ${new Date().getFullYear()} ContriTrack. Premium Developer Ecosystem.</span>
              </td>
            </tr>
          </table>
        </div>
      `;
      await sendATSNotificationEmail(c.email, `Technical Interview Invitation: ${c.roleTitle} at ContriTrack`, interviewHtml);
    } 
    
    else if (status === "rejected") {
      const rejectHtml = `
        <div style="background-color: #07080b; padding: 40px; font-family: sans-serif; color: #ffffff;">
          <table align="center" style="max-width: 600px; background-color: #0e1017; border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 20px; padding: 30px;">
            <tr>
              <td style="color: #857C91; font-size: 13.5px; line-height: 1.6;">
                <p>Dear <strong>${c.fullName}</strong>,</p>
                <p>Thank you for taking the time to share your background and apply for the <strong>${c.roleTitle}</strong> track at ContriTrack.</p>
                <p>Our review board has audited all candidates carefully. While your technical credentials and projects are impressive, we have decided to proceed with other candidates whose profiles more closely align with the immediate scope of this specific role.</p>
                <p>We will retain your resume securely in our talent database and reach out if matching tracks open in the future. We wish you the absolute best in your academic and professional endeavors.</p>
              </td>
            </tr>
            <tr>
              <td style="border-top: 1px solid rgba(255,255,255,0.05); padding-top: 15px; text-align: center; margin-top: 20px;">
                <span style="font-size: 9px; color: #857C91;">Sincerely, the ContriTrack Recruitment Team</span>
              </td>
            </tr>
          </table>
        </div>
      `;
      await sendATSNotificationEmail(c.email, `Update on your Application: ${c.roleTitle} at ContriTrack`, rejectHtml);
    }

    return { success: true };
  } catch (error) {
    console.error("Failed to update candidate status:", error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Permanently delete a candidate, clear linked application drafts, and unlink resume storage assets
 */
export async function deleteJobApplicationAction(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await ensureJobApplicationTableExists();

    // 1. Fetch application details to locate storage assets
    const candidates = await prisma.$queryRawUnsafe<RawJobApplication[]>(`
      SELECT * FROM "JobApplication"
      WHERE "id" = $1
      LIMIT 1
    `, id);

    if (candidates.length === 0) {
      return { success: false, error: "Candidate not found." };
    }

    const c = candidates[0];

    // 2. Perform safe cascades on the relational DB (Draft records)
    await prisma.$executeRawUnsafe(`
      DELETE FROM "ApplicationDraft"
      WHERE "email" = $1 AND "roleId" = $2
    `, c.email, c.roleId);

    // 3. Delete the primary candidate application record
    await prisma.$executeRawUnsafe(`
      DELETE FROM "JobApplication"
      WHERE "id" = $1
    `, id);

    // 4. Clean up stored resume file assets
    const resumeUrl = c.resumeUrl;
    if (resumeUrl) {
      if (resumeUrl.includes("/uploads/resumes/")) {
        try {
          const fileName = resumeUrl.substring(resumeUrl.lastIndexOf("/") + 1);
          const localPath = path.join(process.cwd(), "public", "uploads", "resumes", fileName);
          await fs.unlink(localPath);
          console.log("Safely unlinked local candidate resume asset:", localPath);
        } catch (err) {
          console.error("Failed to unlink local candidate resume asset:", err);
        }
      } else if (resumeUrl.includes("/storage/v1/object/public/resumes/")) {
        const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        if (supabaseUrl && supabaseServiceRole) {
          const cleanUrl = supabaseUrl.replace(/\/$/, "");
          const fileName = resumeUrl.substring(resumeUrl.lastIndexOf("/") + 1);
          const deleteUrl = `${cleanUrl}/storage/v1/object/resumes/${fileName}`;
          try {
            const response = await fetch(deleteUrl, {
              method: "DELETE",
              headers: {
                "Authorization": `Bearer ${supabaseServiceRole}`
              }
            });
            if (response.ok) {
              console.log("Safely deleted Supabase bucket resume asset:", deleteUrl);
            } else {
              console.error("Supabase Storage rejected asset deletion:", await response.text());
            }
          } catch (err) {
            console.error("Failed to delete Supabase storage resume file:", err);
          }
        }
      }
    }

    return { success: true };
  } catch (error) {
    console.error("Failed to execute candidate deletion workflow:", error);
    return { success: false, error: (error as Error).message };
  }
}
