/**
 * @deprecated Use imports from '@/lib/crm' instead.
 * This file is now a proxy to the modular CRM library.
 */

export * from './crm';

// Bridges for original imports that might be needed elsewhere
export { serverGeocodeAddress as geocodeAddress } from './geocodeAction';
export { getTechnicianColor } from './techniciansConfig';
export { serverTriggerNotification, serverTriggerMeasurementsReport, serverTriggerServiceReport } from './notificationAction';
