export interface ScheduleForm {
  title: string;
  date: string;
  time: string;
  /** Optional end time (HH:MM). Empty keeps the one-hour calendar block. */
  endTime: string;
  technicianId: string;
  assistantTechnicianIds: string[];
  assistantTechnicianNames: string[];
  urgent: boolean;
  notes: string;
  addressStreet1: string;
  addressStreet2: string;
  addressCity: string;
  addressState: string;
  addressPostcode: string;
  addressCountry: string;
  addressLat: number | null;
  addressLng: number | null;
}
