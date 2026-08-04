import { useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Card, Input, SkeletonText, Tabs } from '../../components/common';
import { CalendarIcon, SearchIcon, UserIcon } from '../../components/common/icons';
import { getErrorMessage } from '../../lib/api';
import * as doctorApi from '../../lib/endpoints/doctor';
import {
  addPatientNote,
  derivePatientRoster,
  getPatientDetail,
} from '../../lib/endpoints/doctorPatients';
import type {
  DoctorAppointment,
  DoctorPatientSummary,
  DoctorPendingReport,
  DoctorReviewedReport,
} from '../../types/doctor';
import type { MedicalHistoryEntry, PatientProfile } from '../../types/patient';

export default function PatientHistory() {
  const [pending, setPending] = useState<DoctorPendingReport[] | null>(null);
  const [reviewed, setReviewed] = useState<DoctorReviewedReport[] | null>(null);
  const [appointments, setAppointments] = useState<DoctorAppointment[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<DoctorPatientSummary | null>(null);

  useEffect(() => {
    Promise.all([
      doctorApi.getPendingReports(),
      doctorApi.getReviewedReports(),
      doctorApi.getAppointments(),
    ])
      .then(([p, r, a]) => {
        setPending(p);
        setReviewed(r);
        setAppointments(a);
      })
      .catch((err) => setLoadError(getErrorMessage(err, 'Could not load your patients.')));
  }, []);

  const roster = useMemo(
    () =>
      pending && reviewed && appointments
        ? derivePatientRoster(pending, reviewed, appointments)
        : null,
    [pending, reviewed, appointments]
  );

  const filteredRoster = useMemo(() => {
    if (!roster) return [];
    const q = search.trim().toLowerCase();
    if (!q) return roster;
    return roster.filter(
      (p) => p.name.toLowerCase().includes(q) || String(p.patientid).includes(q)
    );
  }, [roster, search]);

  const patientReports = useMemo(() => {
    if (!selected) return [];
    const fromPending = (pending ?? []).filter((r) => r.patientid === selected.patientid);
    const fromReviewed = (reviewed ?? []).filter((r) => r.patientid === selected.patientid);
    return [...fromPending, ...fromReviewed];
  }, [selected, pending, reviewed]);

  const patientAppointments = useMemo(
    () => (appointments ?? []).filter((a) => a.patientid === selected?.patientid),
    [selected, appointments]
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Patient History</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Patients you&apos;ve treated or have an upcoming visit with.
        </p>
      </header>

      {loadError && <Alert type="warning" description={loadError} />}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card padding="none" className="lg:col-span-1">
          <div className="border-b border-gray-100 p-3 dark:border-gray-800">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or patient ID…"
              leftIcon={<SearchIcon className="h-4 w-4" />}
            />
          </div>
          {roster === null ? (
            <div className="space-y-3 p-4">
              <SkeletonText lines={5} />
            </div>
          ) : filteredRoster.length === 0 ? (
            <p className="p-5 text-sm text-gray-400">No patients match your search.</p>
          ) : (
            <ul className="max-h-[32rem] divide-y divide-gray-100 overflow-y-auto dark:divide-gray-800">
              {filteredRoster.map((p) => (
                <li key={p.patientid}>
                  <button
                    type="button"
                    onClick={() => setSelected(p)}
                    className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50 ${selected?.patientid === p.patientid ? 'bg-primary-50 dark:bg-primary-500/10' : ''}`}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                      <UserIcon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                        {p.name}
                      </p>
                      <p className="text-xs text-gray-400">ID #{p.patientid}</p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="lg:col-span-2">
          {!selected ? (
            <Card className="flex min-h-[24rem] items-center justify-center text-center">
              <p className="text-sm text-gray-400">Select a patient to view their history.</p>
            </Card>
          ) : (
            <PatientDetail
              key={selected.patientid}
              patient={selected}
              reports={patientReports}
              appointments={patientAppointments}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function PatientDetail({
  patient,
  reports,
  appointments,
}: {
  patient: DoctorPatientSummary;
  reports: (DoctorPendingReport | DoctorReviewedReport)[];
  appointments: DoctorAppointment[];
}) {
  return (
    <Card padding="none">
      <div className="flex items-center gap-3 border-b border-gray-100 p-5 dark:border-gray-800">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400">
          <UserIcon className="h-6 w-6" />
        </span>
        <div>
          <p className="font-semibold text-gray-900 dark:text-gray-100">{patient.name}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            ID #{patient.patientid}
            {patient.phone ? ` · ${patient.phone}` : ''}
          </p>
        </div>
      </div>

      <div className="p-5">
        <Tabs
          items={[
            {
              id: 'profile',
              label: 'Profile',
              content: <ProfileTab patientId={patient.patientid} />,
            },
            {
              id: 'history',
              label: 'Medical History',
              content: <MedicalHistoryTab patientId={patient.patientid} />,
            },
            { id: 'reports', label: 'AI Reports', content: <ReportsTab reports={reports} /> },
            {
              id: 'appointments',
              label: 'Appointments',
              content: <AppointmentsTab appointments={appointments} />,
            },
            {
              id: 'notes',
              label: 'Add Notes',
              content: <AddNotesTab patientId={patient.patientid} />,
            },
          ]}
        />
      </div>
    </Card>
  );
}

// Profile + Medical History need a backend endpoint that doesn't exist yet
// (see lib/endpoints/doctorPatients.ts's getPatientDetail doc comment) —
// both tabs attempt the real call and degrade to an explanatory message.

function ProfileTab({ patientId }: { patientId: number }) {
  const [data, setData] = useState<{ profile: PatientProfile } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getPatientDetail(patientId)
      .then(setData)
      .catch((err) =>
        setError(getErrorMessage(err, 'Patient profile access is not available yet.'))
      )
      .finally(() => setLoading(false));
  }, [patientId]);

  if (loading) return <SkeletonText lines={4} />;
  if (error || !data)
    return <Alert type="info" description={error ?? 'No profile data available.'} />;

  return (
    <dl className="grid grid-cols-2 gap-4 text-sm">
      <div>
        <dt className="text-xs uppercase text-gray-400">Email</dt>
        <dd className="text-gray-900 dark:text-gray-100">{data.profile.email}</dd>
      </div>
      <div>
        <dt className="text-xs uppercase text-gray-400">Phone</dt>
        <dd className="text-gray-900 dark:text-gray-100">{data.profile.phone ?? '—'}</dd>
      </div>
      <div>
        <dt className="text-xs uppercase text-gray-400">Date of birth</dt>
        <dd className="text-gray-900 dark:text-gray-100">{data.profile.date_of_birth ?? '—'}</dd>
      </div>
      <div>
        <dt className="text-xs uppercase text-gray-400">Blood group</dt>
        <dd className="text-gray-900 dark:text-gray-100">{data.profile.blood_group ?? '—'}</dd>
      </div>
    </dl>
  );
}

function MedicalHistoryTab({ patientId }: { patientId: number }) {
  const [entries, setEntries] = useState<MedicalHistoryEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setEntries(null);
    setError(null);
    getPatientDetail(patientId)
      .then((data) => setEntries(data.history))
      .catch((err) =>
        setError(getErrorMessage(err, 'Medical history access is not available yet.'))
      );
  }, [patientId]);

  if (error) return <Alert type="info" description={error} />;
  if (entries === null) return <SkeletonText lines={4} />;
  if (entries.length === 0)
    return <p className="text-sm text-gray-400">No medical history entries.</p>;

  return (
    <ul className="space-y-3">
      {entries.map((e) => (
        <li key={e.historyid} className="text-sm">
          <p className="text-gray-700 dark:text-gray-300">{e.history_text}</p>
          <p className="text-xs text-gray-400">{e.recorded_date}</p>
        </li>
      ))}
    </ul>
  );
}

function ReportsTab({ reports }: { reports: (DoctorPendingReport | DoctorReviewedReport)[] }) {
  if (reports.length === 0)
    return <p className="text-sm text-gray-400">No AI reports with you yet.</p>;
  return (
    <ul className="space-y-3">
      {reports.map((r) => (
        <li key={r.reportid} className="flex items-center justify-between gap-3 text-sm">
          <div className="min-w-0">
            <p className="truncate font-medium text-gray-900 dark:text-gray-100">
              {r.ai_diagnosis}
            </p>
            <p className="truncate text-gray-500 dark:text-gray-400">{r.symptoms}</p>
          </div>
          <Badge variant={r.status === 'REVIEWED' ? 'success' : 'warning'} size="sm">
            {r.status}
          </Badge>
        </li>
      ))}
    </ul>
  );
}

function AppointmentsTab({ appointments }: { appointments: DoctorAppointment[] }) {
  if (appointments.length === 0)
    return <p className="text-sm text-gray-400">No appointments with you yet.</p>;
  return (
    <ul className="space-y-3">
      {appointments.map((a) => (
        <li
          key={a.slotid}
          className="flex items-center gap-4 text-sm text-gray-700 dark:text-gray-300"
        >
          <span className="flex items-center gap-1.5">
            <CalendarIcon className="h-4 w-4" />
            {a.appointment_date} at {a.appointment_time}
          </span>
          <Badge
            variant={
              a.status === 'COMPLETED' ? 'success' : a.status === 'CANCELLED' ? 'danger' : 'info'
            }
            size="sm"
          >
            {a.status}
          </Badge>
        </li>
      ))}
    </ul>
  );
}

function AddNotesTab({ patientId }: { patientId: number }) {
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleSubmit = async () => {
    if (!note.trim()) return;
    setSubmitting(true);
    setResult(null);
    try {
      await addPatientNote(patientId, note.trim());
      setResult({ type: 'success', message: 'Note saved.' });
      setNote('');
    } catch (err) {
      setResult({
        type: 'error',
        message: getErrorMessage(
          err,
          'Patient notes are not available yet — this needs a backend endpoint.'
        ),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-3">
      {result && <Alert type={result.type} description={result.message} />}
      <Input
        type="textarea"
        rows={4}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Add a general note about this patient…"
      />
      <Button size="sm" loading={submitting} onClick={handleSubmit} disabled={!note.trim()}>
        Save note
      </Button>
    </div>
  );
}
