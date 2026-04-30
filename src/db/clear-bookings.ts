import { db } from "@/db/client";
import { bookings } from "@/db/schema";

async function main() {
  await db.delete(bookings);
  console.log("Successfully deleted all bookings to clean up the calendar.");
  process.exit(0);
}

main().catch((error) => {
  console.error("Failed to delete bookings:", error);
  process.exit(1);
});
