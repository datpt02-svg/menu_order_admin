import { db } from "@/db/client";
import {
  staffAssignmentEvents,
  staffAssignments,
  staffShifts,
  staffMembers,
} from "@/db/schema";

async function main() {
  await db.delete(staffAssignmentEvents);
  await db.delete(staffAssignments);
  await db.delete(staffShifts);
  await db.delete(staffMembers);
  console.log("Successfully deleted all staff-related data to clean up the calendar.");
  process.exit(0);
}

main().catch((error) => {
  console.error("Failed to delete staff data:", error);
  process.exit(1);
});
