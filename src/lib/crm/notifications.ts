import "server-only";

export async function triggerNotification(event: string, data: any) {
  try {
    const { serverTriggerNotification } = await import("../notificationAction");
    return await serverTriggerNotification(event, data);
  } catch (error: any) {
    console.error('Error in triggerNotification bridge:', error);
    return { success: false, error: error.message };
  }
}

export async function syncTechnicianViaN8n(technicianData: any) {
  return triggerNotification('technician_login', { technician: technicianData });
}
