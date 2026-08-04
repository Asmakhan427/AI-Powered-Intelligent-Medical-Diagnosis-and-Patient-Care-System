import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Badge,
  Button,
  Card,
  Modal,
  Skeleton,
  Tabs,
  useToast,
} from '../../components/common';
import { CalendarIcon, ClockIcon } from '../../components/common/icons';
import { getErrorMessage } from '../../lib/api';
import { cancelAppointment, getPatientAppointments } from '../../lib/endpoints/appointments';
import type { AppointmentStatus, PatientAppointment } from '../../types/patient';

const STATUS_VARIANT: Record<AppointmentStatus, 'success' | 'info' | 'danger' | 'warning'> = {
  SCHEDULED: 'info',
  COMPLETED: 'success',
  CANCELLED: 'danger',
  NO_SHOW: 'warning',
};

function todayStart(): Date {
  return new Date(new Date().toDateString());
}

function AppointmentCard({
  appointment,
  onCancel,
  onReschedule,
}: {
  appointment: PatientAppointment;
  onCancel: (appointment: PatientAppointment) => void;
  onReschedule: (appointment: PatientAppointment) => void;
}) {
  const canModify = appointment.status === 'SCHEDULED';

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-gray-900 dark:text-gray-100">
            Dr. {appointment.doctor_name}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">{appointment.specialization}</p>
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

      {appointment.reason && (
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Reason: {appointment.reason}
        </p>
      )}

      {canModify && (
        <div className="mt-4 flex gap-2 border-t border-gray-100 pt-3 dark:border-gray-800">
          <Button size="sm" variant="outline" onClick={() => onReschedule(appointment)}>
            Reschedule
          </Button>
          <Button size="sm" variant="danger" onClick={() => onCancel(appointment)}>
            Cancel
          </Button>
        </div>
      )}
    </Card>
  );
}

export default function AppointmentList() {
  const navigate = useNavigate();
  const toast = useToast();

  const [appointments, setAppointments] = useState<PatientAppointment[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<PatientAppointment | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const load = () => {
    getPatientAppointments()
      .then(setAppointments)
      .catch((err) => setError(getErrorMessage(err, 'Could not load your appointments.')));
  };

  useEffect(load, []);

  const upcoming = useMemo(
    () =>
      (appointments ?? [])
        .filter((a) => a.status === 'SCHEDULED' && new Date(a.appointment_date) >= todayStart())
        .sort((a, b) => a.appointment_date.localeCompare(b.appointment_date)),
    [appointments]
  );

  const past = useMemo(
    () =>
      (appointments ?? [])
        .filter((a) => a.status !== 'SCHEDULED' || new Date(a.appointment_date) < todayStart())
        .sort((a, b) => b.appointment_date.localeCompare(a.appointment_date)),
    [appointments]
  );

  const handleReschedule = (appointment: PatientAppointment) => {
    navigate('/appointments/book', { state: { specialization: appointment.specialization } });
  };

  const handleConfirmCancel = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await cancelAppointment(cancelTarget.slotid);
      toast.success('Appointment cancelled.');
      setCancelTarget(null);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not cancel this appointment.'));
    } finally {
      setCancelling(false);
    }
  };

  const renderList = (list: PatientAppointment[], emptyMessage: string) => {
    if (error) return <Alert type="warning" description={error} />;
    if (appointments === null) {
      return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      );
    }
    if (list.length === 0)
      return <p className="py-8 text-center text-sm text-gray-400">{emptyMessage}</p>;
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {list.map((appt) => (
          <AppointmentCard
            key={appt.slotid}
            appointment={appt}
            onCancel={setCancelTarget}
            onReschedule={handleReschedule}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Appointments</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage your upcoming and past visits.
          </p>
        </div>
        <Button onClick={() => navigate('/appointments/book')}>Book new appointment</Button>
      </header>

      <Tabs
        items={[
          {
            id: 'upcoming',
            label: 'Upcoming',
            badge:
              upcoming.length > 0 ? (
                <Badge size="sm" variant="info">
                  {upcoming.length}
                </Badge>
              ) : undefined,
            content: renderList(upcoming, "You don't have any upcoming appointments."),
          },
          { id: 'past', label: 'Past', content: renderList(past, 'No past appointments yet.') },
        ]}
      />

      <Modal
        isOpen={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        title="Cancel appointment?"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setCancelTarget(null)}>
              Keep it
            </Button>
            <Button variant="danger" loading={cancelling} onClick={handleConfirmCancel}>
              Cancel appointment
            </Button>
          </>
        }
      >
        {cancelTarget && (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            This will cancel your appointment with Dr. {cancelTarget.doctor_name} on{' '}
            {cancelTarget.appointment_date} at {cancelTarget.appointment_time}. This can&apos;t be
            undone.
          </p>
        )}
      </Modal>
    </div>
  );
}
