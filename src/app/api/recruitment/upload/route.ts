import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

// Rate limiting & spam protection parameters
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "application/msword" // .doc
];

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: "No file was uploaded." }, { status: 400 });
    }

    // 1. Validate File Size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: "File size exceeds 5MB limit. Please upload a smaller copy." },
        { status: 400 }
      );
    }

    // 2. Validate Mime Types
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: "Unsupported file type. Only PDF and DOCX files are allowed." },
        { status: 400 }
      );
    }

    const fileBytes = await file.arrayBuffer();
    const buffer = Buffer.from(fileBytes);

    // Sanitize filename to avoid directory traversal
    const fileExt = path.extname(file.name) || (file.type === "application/pdf" ? ".pdf" : ".docx");
    const sanitizedBase = path.basename(file.name, fileExt).replace(/[^a-zA-Z0-9_-]/g, "_");
    const uniqueFileName = `${Date.now()}_${sanitizedBase}${fileExt}`;

    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    // Helper to ensure Supabase resumes bucket exists
    const ensureSupabaseBucket = async (url: string, key: string) => {
      try {
        const cleanUrl = url.replace(/\/$/, "");
        const checkRes = await fetch(`${cleanUrl}/storage/v1/bucket/resumes`, {
          headers: { "Authorization": `Bearer ${key}` }
        });
        if (checkRes.ok) return;

        const createRes = await fetch(`${cleanUrl}/storage/v1/bucket`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${key}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            id: "resumes",
            name: "resumes",
            public: true
          })
        });
        if (createRes.ok) {
          console.log("Successfully auto-created missing Supabase resumes bucket.");
        } else {
          console.warn("Failed to auto-create resumes bucket:", await createRes.text());
        }
      } catch (err) {
        console.error("Error checking/creating resumes bucket:", err);
      }
    };

    // 3. SECURE ADAPTER SWITCH: SUPABASE VS LOCAL RESOLUTION FALLBACK
    if (supabaseUrl && supabaseServiceRole) {
      console.log("Ensuring bucket existence and piping file upload safely to Supabase Storage resumes bucket...");
      await ensureSupabaseBucket(supabaseUrl, supabaseServiceRole);
      
      const cleanUrl = supabaseUrl.replace(/\/$/, "");
      const uploadUrl = `${cleanUrl}/storage/v1/object/resumes/${uniqueFileName}`;

      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${supabaseServiceRole}`,
          "Content-Type": file.type,
          "x-upsert": "true"
        },
        body: buffer
      });

      if (response.ok) {
        const publicUrl = `${cleanUrl}/storage/v1/object/public/resumes/${uniqueFileName}`;
        return NextResponse.json({
          success: true,
          fileName: file.name,
          resumeUrl: publicUrl,
          storageProvider: "Supabase"
        });
      } else {
        const errorText = await response.text();
        console.error("Supabase Storage rejected upload. Falling back to local store:", errorText);
      }
    }

    // 4. SERVERLESS VS LOCAL FALLBACK
    const isServerless = process.env.VERCEL === "1" || process.env.NODE_ENV === "production";

    if (isServerless) {
      console.log("Serverless environment detected (Vercel). Converting payload to secure base64 Data URL to bypass read-only write limits.");
      const base64Data = buffer.toString("base64");
      const publicUrl = `data:${file.type || "application/pdf"};base64,${base64Data}`;

      return NextResponse.json({
        success: true,
        fileName: file.name,
        resumeUrl: publicUrl,
        storageProvider: "Base64DataUrl"
      });
    }

    // LOCAL RESOLUTION FALLBACK: Writes files to public/uploads/resumes for immediate workspace utility
    console.log("Executing local storage fallback write for candidate resume...");
    const publicUploadsDir = path.join(process.cwd(), "public", "uploads", "resumes");
    
    // Ensure parent directories exist
    await fs.mkdir(publicUploadsDir, { recursive: true });

    const localFilePath = path.join(publicUploadsDir, uniqueFileName);
    await fs.writeFile(localFilePath, buffer);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const publicUrl = `${appUrl}/uploads/resumes/${uniqueFileName}`;

    return NextResponse.json({
      success: true,
      fileName: file.name,
      resumeUrl: publicUrl,
      storageProvider: "LocalWorkspace"
    });

  } catch (error) {
    const err = error as Error;
    console.error("Recruitment resume secure upload gateway error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to process uploaded file." },
      { status: 500 }
    );
  }
}
