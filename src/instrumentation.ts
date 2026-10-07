export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startOutboxDrain } = await import("@/lib/server/outboxDrain");
    startOutboxDrain();
    const { startMeasurementsOutboxDrain } = await import(
      "@/lib/server/measurementsOutboxDrain"
    );
    startMeasurementsOutboxDrain();
    const { startObservabilityScheduler } = await import(
      "@/lib/server/observabilityScheduler"
    );
    startObservabilityScheduler();
  }
}
