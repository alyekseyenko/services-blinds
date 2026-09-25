export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startOutboxDrain } = await import("@/lib/server/outboxDrain");
    startOutboxDrain();
  }
}
