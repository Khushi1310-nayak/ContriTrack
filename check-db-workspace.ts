import { getJobRolesAction } from "./src/app/actions/career-actions";
import { getJobApplicationsAction } from "./src/app/actions/application-actions";

async function main() {
  console.log("=== RUNNING SERVER ACTIONS ===");
  try {
    const roles = await getJobRolesAction();
    console.log("getJobRolesAction returned:", roles.length, "roles");
    roles.forEach(r => {
      console.log(`- ${r.title} (${r.slug})`);
    });

    const apps = await getJobApplicationsAction();
    console.log("getJobApplicationsAction returned:", apps.length, "applications");
    apps.forEach(a => {
      console.log(`- ${a.fullName} (${a.roleTitle})`);
    });
  } catch (err) {
    console.error("Error executing server actions:", err);
  }
}

main();
