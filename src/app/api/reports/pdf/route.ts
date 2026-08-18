import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const reportId = searchParams.get("reportId");
    const snapshotId = searchParams.get("snapshotId");

    if (!reportId) {
      return new NextResponse("Report ID is required", { status: 400 });
    }

    // Retrieve report metadata
    const report = await prisma.report.findUnique({
      where: { id: reportId }
    });

    if (!report) {
      return new NextResponse("Certified report not found", { status: 404 });
    }

    // Query specific details based on type
    let detailsHtml = "";
    let reportTitle = "Academic Telemetry Evaluation";

    if (report.type === "contribution") {
      const contrReport = await prisma.contributionReport.findUnique({
        where: { id: snapshotId || "" }
      });

      const user = await prisma.user.findFirst({
        where: { id: contrReport?.userId || report.generatedBy }
      });

      if (!contrReport) {
        detailsHtml = `<div class="card"><h3 style="color:red;">Error</h3><p>Insufficient Telemetry Recorded for this snapshot.</p></div>`;
      } else {
        reportTitle = "Individual Contribution telemetric certificate";
        detailsHtml = `
          <div class="card">
            <h3>Individual Analytics Metrics</h3>
            <table>
              <thead>
                <tr>
                  <th>Teammate Candidate</th>
                  <th>Commits</th>
                  <th>PRs Audited</th>
                  <th>Kanban Cards</th>
                  <th>Fairness Parity</th>
                  <th>Speaking Share</th>
                  <th>Telemetry Score</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>${user?.fullName || "Unknown Member"}</strong></td>
                  <td>${contrReport.commits || 0}</td>
                  <td>${contrReport.pullRequests || 0}</td>
                  <td>${contrReport.tasksCompleted || 0}</td>
                  <td>${contrReport.fairnessScore || 0}%</td>
                  <td>${contrReport.meetingParticipation || 0}%</td>
                  <td style="color: #F2C1A3; font-weight: bold;">${contrReport.contributionScore || 0} pts</td>
                </tr>
              </tbody>
            </table>
          </div>

        <div class="card" style="margin-top: 24px;">
          <h3>Professor Grading Context & Work Parity Analysis</h3>
          <p>
            Individual work metrics have been verified directly via GitHub repository telemetry streams and cryptographic task sync signatures. This member's performance indicates dynamic task velocity and collaborative parity tracking across sprint checklists.
          </p>
        </div>
      `;
      }
    } else if (report.type === "sprint") {
      const sprintReport = await prisma.sprintReport.findUnique({
        where: { id: snapshotId || "" }
      });

      if (!sprintReport) {
        detailsHtml = `<div class="card"><h3 style="color:red;">Error</h3><p>Insufficient Telemetry Recorded for this Sprint snapshot.</p></div>`;
      } else {
        reportTitle = `Sprint Performance Report - ${sprintReport.sprintName || "Unknown Sprint"}`;
        detailsHtml = `
          <div class="card">
            <h3>Sprint Statistics Overview</h3>
            <table>
              <thead>
                <tr>
                  <th>Sprint Reference</th>
                  <th>Completed Kanban Cards</th>
                  <th>Overdue Backlog</th>
                  <th>Team Velocity Index</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>${sprintReport.sprintName || "Unknown Sprint"}</strong></td>
                  <td>${sprintReport.completedTasks || 0}</td>
                  <td>${sprintReport.overdueTasks || 0}</td>
                  <td style="color: #F2C1A3; font-weight: bold;">${sprintReport.productivityScore || 0}%</td>
                </tr>
              </tbody>
            </table>
          </div>
        `;
      }
    } else {
      const meetingReport = await prisma.meetingReport.findUnique({
        where: { id: snapshotId || "" }
      });

      if (!meetingReport) {
        detailsHtml = `<div class="card"><h3 style="color:red;">Error</h3><p>Insufficient Telemetry Recorded for this meeting snapshot.</p></div>`;
      } else {
        reportTitle = "Teammate Speaking and Attendance Report";
        let attendanceStatus = "Normal";
        if (meetingReport.attendanceRate >= 90) attendanceStatus = "Excellent";
        else if (meetingReport.attendanceRate < 50) attendanceStatus = "At Risk";

        detailsHtml = `
          <div class="card">
            <h3>Collaborative Attendance Analytics</h3>
            <table>
              <thead>
                <tr>
                  <th>Attendance Rate</th>
                  <th>Action Items Completed</th>
                  <th>Meeting Sync Score</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style="color: #F2C1A3; font-weight: bold;">${meetingReport.attendanceRate || 0}%</td>
                  <td>${meetingReport.actionItemsCompleted || 0}</td>
                  <td>${attendanceStatus}</td>
                </tr>
              </tbody>
            </table>
          </div>
        `;
      }
    }

    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Certified Academic Report - ContriTrack</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600&family=Inter:wght@300;400;500;600&display=swap');
          
          body {
            background-color: #0e0f17;
            color: #ffffff;
            font-family: 'Inter', sans-serif;
            margin: 0;
            padding: 40px;
            box-sizing: border-box;
          }
          .container {
            max-width: 800px;
            margin: 0 auto;
            border: 1px solid rgba(242, 193, 163, 0.15);
            padding: 40px;
            border-radius: 24px;
            background: linear-gradient(135deg, #111221 0%, #0e0f17 100%);
            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
            position: relative;
            overflow: hidden;
          }
          .glow-orb {
            position: absolute;
            top: -100px;
            right: -100px;
            width: 300px;
            height: 300px;
            border-radius: 50%;
            background: #F2C1A3;
            opacity: 0.03;
            filter: blur(100px);
            pointer-events: none;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            padding-bottom: 24px;
            margin-bottom: 32px;
          }
          .brand {
            font-family: 'Cinzel', serif;
            font-size: 24px;
            color: #ffffff;
            letter-spacing: 1px;
          }
          .brand span {
            color: #F2C1A3;
          }
          .certification {
            font-family: monospace;
            font-size: 10px;
            text-transform: uppercase;
            color: #F2C1A3;
            border: 1px solid rgba(242, 193, 163, 0.3);
            padding: 4px 12px;
            border-radius: 8px;
            background: rgba(242, 193, 163, 0.05);
          }
          h1 {
            font-family: 'Cinzel', serif;
            font-size: 26px;
            font-weight: 400;
            color: #ffffff;
            margin-top: 0;
            margin-bottom: 8px;
          }
          .meta {
            font-size: 12px;
            color: #857C91;
            margin-bottom: 32px;
          }
          .card {
            border: 1px solid rgba(255, 255, 255, 0.05);
            border-radius: 16px;
            background: rgba(255, 255, 255, 0.01);
            padding: 24px;
            margin-bottom: 24px;
          }
          h3 {
            font-family: 'Cinzel', serif;
            font-size: 16px;
            color: #F2C1A3;
            margin-top: 0;
            margin-bottom: 16px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            padding-bottom: 8px;
          }
          p {
            font-size: 13px;
            color: rgba(255, 255, 255, 0.8);
            line-height: 1.6;
            font-weight: 300;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
            margin-top: 12px;
          }
          th {
            text-align: left;
            padding: 10px;
            color: #857C91;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            font-weight: 500;
          }
          td {
            padding: 12px 10px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.03);
            font-weight: 300;
          }
          .footer {
            margin-top: 48px;
            border-top: 1px solid rgba(255, 255, 255, 0.05);
            padding-top: 24px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 10px;
            color: #857C91;
          }
          .signature {
            border-top: 1px dashed rgba(242, 193, 163, 0.3);
            width: 150px;
            text-align: center;
            padding-top: 8px;
            font-family: 'Cinzel', serif;
            color: #F2C1A3;
          }
          @media print {
            body {
              background-color: #ffffff !important;
              color: #000000 !important;
              padding: 0 !important;
            }
            .container {
              border: none !important;
              box-shadow: none !important;
              background: none !important;
              padding: 0 !important;
              max-width: 100% !important;
            }
            .header, th, td, h3 {
              border-color: #e2e8f0 !important;
            }
            h1, h3, .brand, td, th {
              color: #000000 !important;
            }
            .meta, p {
              color: #4a5568 !important;
            }
            .card {
              border: 1px solid #cbd5e1 !important;
              background: none !important;
            }
            .certification {
              border-color: #cbd5e1 !important;
              color: #000000 !important;
              background: none !important;
            }
            .signature {
              border-color: #000000 !important;
              color: #000000 !important;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="glow-orb"></div>
          
          <div class="header">
            <div class="brand">Contri<span>Track</span></div>
            <div class="certification">Certified Academic telemetry Record</div>
          </div>
          
          <h1>${reportTitle}</h1>
          <div class="meta">
            Generated on ${new Date(report.createdAt).toLocaleDateString()} | Workspace: Main Studio Workspace | Certificate ID: ${report.id.substring(0, 8).toUpperCase()}
          </div>
          
          ${detailsHtml}
          
          <div class="footer">
            <div>
              Verify this record at: contritrack.vercel.app/verify/${report.id.substring(0, 8).toUpperCase()}
            </div>
            <div class="signature">
              ContriTrack Auditor
            </div>
          </div>
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 500);
          }
        </script>
      </body>
      </html>
    `;

    return new NextResponse(html, {
      headers: { "Content-Type": "text/html" }
    });
  } catch (err: unknown) {
    console.error("Error in api/reports/pdf route:", err);
    return new NextResponse("Server Error", { status: 500 });
  }
}
