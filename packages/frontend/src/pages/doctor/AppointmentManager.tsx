import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  Input,
  Modal,
  Skeleton,
  Tabs,
  useToast,
} from '../../components/common';
import { CalendarIcon, ClockIcon, PhoneIcon } from '../../components/common/icons';
import { getErrorMessage } from '../../lib/api';
import { cancelAppointment, updateAppointmentStatus } from '../../lib/endpoints/appointments';
import * as doctorApi from '../../lib/endpoints/doctor';
import type { AppointmentStatus } from '../../types/patient';
import type { DoctorAppointment } from '../../types/doctor';

const STATUS_VARIANT: Record<AppointmentStatus, 'success' | 'info' | 'danger' | 'warning'> = {
  SCHEDULED: 'info',
  COMPLETED: 'success',
  CANCELLED: 'danger',
  NO_SHOW: 'warning',
};

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function AppointmentCard({
  appointment,
  onOpen,
}: {
  appointment: DoctorAppointment;
  onOpen: (a: DoctorAppointment) => void;
}) {
  return (
    <button type="button" onClick={() => onOpen(appointment)} className="block w-full text-left">
      <Card hoverEffect>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-semibold text-gray-900 dark:text-gray-100">
              {appointment.patient_name}
            </p>
            {appointment.phone && (
              <p className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                <PhoneIcon className="h-3.5 w-3.5" />
                {appointment.phone}
              </p>
            )}
          </div>
          <Badge variant={STATUS_VARIANT[appointment.status]} size="sm">
            {appointment.status}
          </Badge>
        </div>
        <div className="mt-3 flex items-center gap-4 text-sm text-gray-600 dark:text-gray-300">
          <span className="flex items-center gap-1.5">
            <CalendarIcon className="h-4 w-4" />
            {appointment.appointment_date}
          </span>
          <span className="flex items-center gap-1.5">
            <ClockIcon className="h-4 w-4" />
            {appointment.appointment_time}
          </span>
        </div>
      </Card>
    </button>
  );
}

export default function AppointmentManager() {
  const toast = useToast();
  const [appointments, setAppointments] = useState<DoctorAppointment[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<DoctorAppointment | null>(null);
  const [notes, setNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [rescheduleConfirm, setRescheduleConfirm] = useState(false);

  const load = () => {
    doctorApi
      .getAppointments()
      .then(setAppointments)
      .catch((err) => setError(getErrorMessage(err, 'Could not load appointments.')));
  };

  useEffect(load, []);

  const today = useMemo(
    () => (appointments ?? []).filter((a) => a.appointment_date === todayStr()),
    [appointments]
  );
  const upcoming = useMemo(
    () =>
      (appointments ?? []).filter(
        (a) => a.status === 'SCHEDULED' && a.appointment_date > todayStr()
      ),
    [appointments]
  );
  const past = useMemo(
    () =>
      (appointments ?? []).filter(
        (a) => a.status !== 'SCHEDULED' || a.appointment_date < todayStr()
      ),
    [appointments]
  );

  const openDetails = (appointment: DoctorAppointment) => {
    setSelected(appointment);
    setNotes('');
    setRescheduleConfirm(false);
  };

  const runAction = async (action: () => Promise<void>, successMessage: string) => {
    setActionLoading(true);
    try {
      await action();
      toast.success(successMessage);
      setSelected(null);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not update this appointment.'));
    } finally {
      setActionLoading(false);
    }
  };

  const renderList = (list: DoctorAppointment[], emptyMessage: string) => {
    if (error) return <Alert type="warning" description={error} />;
    if (appointments === null) {
      return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      );
    }
    if (list.length === 0)
      return <p className="py-8 text-center text-sm text-gray-400">{emptyMessage}</p>;
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {list.map((appt) => (
          <AppointmentCard key={appt.slotid} appointment={appt} onOpen={openDetails} />
        ))}
      </div>
    );
  };

  const canModify = selected?.status === 'SCHEDULED';

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Appointments</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Manage your schedule and patient visits.
        </p>
      </header>

      <Tabs
        items={[
          {
            id: 'today',
            label: 'Today',
            badge:
              today.length > 0 ? (
                <Badge size="sm" variant="info">
                  {today.length}
                </Badge>
              ) : undefined,
            content: renderList(today, 'No appointments today.'),
          },
          {
            id: 'upcoming',
            label: 'Upcoming',
            content: renderList(upcoming, 'No upcoming appointments.'),
          },
          { id: 'past', label: 'Past', content: renderList(past, 'No past appointments yet.') },
        ]}
      />

      <Modal
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        title="Appointment details"
        size="md"
      >
        {selected && (
          <div className="space-y-4">
            <div>
              <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {selected.patient_name}
              </p>
              {selected.phone && (
                <p className="text-sm text-gray-500 dark:text-gray-400">{selected.phone}</p>
              )}
            </div>

            <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-300">
              <span className="flex items-center gap-1.5">
                <CalendarIcon className="h-4 w-4" />
                {selected.appointment_date}
              </span>
              <span className="flex items-center gap-1.5">
                <ClockIcon className="h-4 w-4" />
                {selected.appointment_time}
              </span>
              <Badge variant={STATUS_VARIANT[selected.status]} size="sm">
                {selected.status}
              </Badge>
            </div>

            {selected.reason && (
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-400">
                  Patient&apos;s reason for visit
                </p>
                <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">{selected.reason}</p>
              </div>
            )}

            <Input
              type="textarea"
              label="Appointment notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Private notes for this visit…"
              helperText="Not saved yet — appointment notes need a backend field (see PatientHistory's per-patient notes for the persisted equivalent)."
            />

            {canModify && (
              <div className="space-y-2 border-t border-gray-100 pt-4 dark:border-gray-800">
                {rescheduleConfirm && (
                  <Alert
                    type="warning"
                    description="There's no reschedule flow yet — this cancels the slot so the patient can rebook a new time. Continue?"
                  />
                )}
                <div className="flex flex-wrap justify-end gap-2">
                  {rescheduleConfirm ? (
                    <>
                      <Button variant="outline" onClick={() => setRescheduleConfirm(false)}>
                        Never mind
                      </Button>
                      <Button
                        variant="danger"
                        loading={actionLoading}
                        onClick={() =>
                          runAction(
                            () => cancelAppointment(selected.slotid),
                            'Appointment cancelled — the patient can rebook.'
                          )
                        }
                      >
                        Confirm cancellation
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button variant="outline" onClick={() => setRescheduleConfirm(true)}>
                        Reschedule
                      </Button>
                      <Button
                        variant="danger"
                        loading={actionLoading}
                        onClick={() =>
                          runAction(
                            () => cancelAppointment(selected.slotid),
                            'Appointment cancelled.'
                          )
                        }
                      >
                        Cancel
                      </Button>
                      <Button
                        loading={actionLoading}
                        onClick={() =>
                          runAction(
                            () => updateAppointmentStatus(selected.slotid, 'COMPLETED'),
                            'Marked as completed.'
                          )
                        }
                      >
                        Mark as completed
                      </Button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
