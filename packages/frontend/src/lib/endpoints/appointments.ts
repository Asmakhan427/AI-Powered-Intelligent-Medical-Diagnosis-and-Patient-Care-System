import { api } from '../api';
import type { AppointmentStatus, PatientAppointment } from '../../types/patient';

export async function getAvailableSlots(
  doctorId: number,
  date: string
): Promise<{ availableSlots: string[]; bookedSlots: string[] }> {
  const { data } = await api.get<{ availableSlots: string[]; bookedSlots: string[] }>(
    '/appointments/available-slots',
    {
      params: { doctorId, date },
    }
  );
  return data;
}

export interface BookAppointmentPayload {
  doctorId: number;
  date: string;
  time: string;
  reason?: string;
}

export async function bookAppointment(
  payload: BookAppointmentPayload
): Promise<{ appointmentId: number }> {
  const { data } = await api.post<{ appointmentId: number }>('/appointments/book', payload);
  return data;
}

export async function cancelAppointment(id: number, reason?: string): Promise<void> {
  await api.put(`/appointments/${id}/cancel`, reason ? { reason } : undefined);
}

export async function getPatientAppointments(): Promise<PatientAppointment[]> {
  const { data } = await api.get<{ appointments: PatientAppointment[] }>('/appointments/patient');
  return data.appointments;
}

/** Doctor-only: PUT /appointments/:id/status (see appointment.controller.ts's updateStatus). */
export async function updateAppointmentStatus(
  id: number,
  status: AppointmentStatus
): Promise<void> {
  await api.put(`/appointments/${id}/status`, { status });
}
