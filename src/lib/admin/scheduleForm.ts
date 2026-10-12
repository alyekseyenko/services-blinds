export interface ScheduleForm {
  title: string;
  date: string;
  time: string;
  technicianId: string;
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
