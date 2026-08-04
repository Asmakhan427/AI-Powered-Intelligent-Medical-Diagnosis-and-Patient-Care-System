import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Alert,
  Badge,
  Button,
  DatePicker,
  Modal,
  Select,
  Table,
  Tabs,
  type DateRange,
  type SelectOption,
  type TableColumn,
} from '../../components/common';
import { DownloadIcon } from '../../components/common/icons';
import { getErrorMessage } from '../../lib/api';
import { getHistory } from '../../lib/endpoints/patient';
import { downloadTextFile, reportToText } from '../../lib/reportExport';
import type {
  AppointmentStatus,
  MedicalHistoryEntry,
  PatientAppointment,
  PatientHistoryResponse,
  PatientReport,
  ReportStatus,
} from '../../types/patient';

const REPORT_STATUS_OPTIONS: SelectOption<ReportStatus>[] = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'REVIEWED', label: 'Reviewed' },
];

const APPOINTMENT_STATUS_OPTIONS: SelectOption<AppointmentStatus>[] = [
  { value: 'SCHEDULED', label: 'Scheduled' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'NO_SHOW', label: 'No-show' },
];

function inRange(dateStr: string, range: DateRange): boolean {
  if (!range.start && !range.end) return true;
  const d = new Date(dateStr);
  if (range.start && d < range.start) return false;
  if (range.end && d > range.end) return false;
  return true;
}

function DateRangeFilter({
  value,
  onChange,
}: {
  value: DateRange;
  onChange: (range: DateRange) => void;
}) {
  return (
    <DatePicker
      range
      value={value}
      onChange={onChange}
      placeholder="Filter by date range"
      className="max-w-xs"
    />
  );
}

export default function MedicalHistory() {
  const [data, setData] = useState<PatientHistoryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<PatientReport | null>(null);

  useEffect(() => {
    getHistory()
      .then(setData)
      .catch((err) => setError(getErrorMessage(err, 'Could not load your medical history.')))
      .finally(() => setLoading(false));
  }, []);

  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Medical History</h1>
        <Alert type="error" description={error} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Medical History</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Records, AI reports, and appointments in one place.
        </p>
      </header>

      <Tabs
        items={[
          {
            id: 'records',
            label: 'Medical Records',
            content: <RecordsTab entries={data?.history ?? []} loading={loading} />,
          },
          {
            id: 'reports',
            label: 'AI Reports',
            content: (
              <ReportsTab
                reports={data?.reports ?? []}
                loading={loading}
                onView={setSelectedReport}
                patientName={data?.patient.name}
              />
            ),
          },
          {
            id: 'appointments',
            label: 'Appointments',
            content: <AppointmentsTab appointments={data?.appointments ?? []} loading={loading} />,
          },
        ]}
      />

      <Modal
        isOpen={!!selectedReport}
        onClose={() => setSelectedReport(null)}
        title="Report details"
        size="lg"
      >
        {selectedReport && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs uppercase text-gray-400">Date</p>
                <p className="text-gray-900 dark:text-gray-100">{selectedReport.created_date}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-gray-400">Status</p>
                <Badge
                  variant={selectedReport.status === 'REVIEWED' ? 'success' : 'warning'}
                  size="sm"
                >
                  {selectedReport.status}
                </Badge>
              </div>
            </div>
            <div>
              <p className="text-xs uppercase text-gray-400">Symptoms</p>
              <p className="text-gray-700 dark:text-gray-300">{selectedReport.symptoms}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-gray-400">AI diagnosis</p>
              <p className="text-gray-700 dark:text-gray-300">
                {selectedReport.ai_diagnosis} ({selectedReport.ai_confidence}% confidence)
              </p>
            </div>
            {selectedReport.doctor_notes && (
              <div>
                <p className="text-xs uppercase text-gray-400">Doctor notes</p>
                <p className="text-gray-700 dark:text-gray-300">{selectedReport.doctor_notes}</p>
              </div>
            )}
            {selectedReport.prescription && (
              <div>
                <p className="text-xs uppercase text-gray-400">Prescription</p>
                <p className="text-gray-700 dark:text-gray-300">{selectedReport.prescription}</p>
              </div>
            )}
            <div className="flex gap-2 border-t border-gray-100 pt-4 dark:border-gray-800">
              <Link to={`/reports/${selectedReport.reportid}`}>
                <Button size="sm" variant="outline">
                  Open full report
                </Button>
              </Link>
              <Button
                size="sm"
                leftIcon={<DownloadIcon className="h-4 w-4" />}
                onClick={() =>
                  downloadTextFile(
                    `report-${selectedReport.reportid}.txt`,
                    reportToText(selectedReport, data?.patient.name)
                  )
                }
              >
                Download
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function RecordsTab({ entries, loading }: { entries: MedicalHistoryEntry[]; loading: boolean }) {
  const [dateRange, setDateRange] = useState<DateRange>({ start: null, end: null });
  const filtered = useMemo(
    () => entries.filter((e) => inRange(e.recorded_date, dateRange)),
    [entries, dateRange]
  );

  const columns: TableColumn<MedicalHistoryEntry>[] = [
    {
      key: 'date',
      header: 'Date',
      accessor: (e) => e.recorded_date,
      sortable: true,
      width: '140px',
    },
    { key: 'entry', header: 'Entry', accessor: (e) => e.history_text },
  ];

  return (
    <div className="space-y-3">
      <DateRangeFilter value={dateRange} onChange={setDateRange} />
      <Table
        columns={columns}
        data={filtered}
        rowKey={(e) => String(e.historyid)}
        loading={loading}
        searchable
        searchPlaceholder="Search records…"
        emptyMessage="No medical history entries yet."
      />
    </div>
  );
}

function ReportsTab({
  reports,
  loading,
  onView,
  patientName,
}: {
  reports: PatientReport[];
  loading: boolean;
  onView: (report: PatientReport) => void;
  patientName?: string;
}) {
  const [dateRange, setDateRange] = useState<DateRange>({ start: null, end: null });
  const [status, setStatus] = useState<ReportStatus | null>(null);

  const filtered = useMemo(
    () =>
      reports.filter((r) => inRange(r.created_date, dateRange) && (!status || r.status === status)),
    [reports, dateRange, status]
  );

  const columns: TableColumn<PatientReport>[] = [
    {
      key: 'date',
      header: 'Date',
      accessor: (r) => r.created_date,
      sortable: true,
      width: '110px',
    },
    { key: 'diagnosis', header: 'Diagnosis', accessor: (r) => r.ai_diagnosis, sortable: true },
    {
      key: 'confidence',
      header: 'Confidence',
      accessor: (r) => `${r.ai_confidence}%`,
      sortAccessor: (r) => r.ai_confidence,
      sortable: true,
      align: 'right',
      width: '110px',
    },
    {
      key: 'status',
      header: 'Status',
      accessor: (r) => (
        <Badge variant={r.status === 'REVIEWED' ? 'success' : 'warning'} size="sm">
          {r.status}
        </Badge>
      ),
      sortAccessor: (r) => r.status,
      sortable: true,
      width: '120px',
    },
    {
      key: 'doctor',
      header: 'Doctor',
      accessor: (r) => (r.doctor_name ? `Dr. ${r.doctor_name}` : 'Unassigned'),
    },
    {
      key: 'actions',
      header: '',
      accessor: (r) => (
        <div className="flex justify-end gap-1.5">
          <Button size="sm" variant="outline" onClick={() => onView(r)}>
            View
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              downloadTextFile(`report-${r.reportid}.txt`, reportToText(r, patientName))
            }
            aria-label="Download report"
          >
            <DownloadIcon className="h-4 w-4" />
          </Button>
        </div>
      ),
      align: 'right',
      width: '160px',
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        <DateRangeFilter value={dateRange} onChange={setDateRange} />
        <Select<ReportStatus>
          options={REPORT_STATUS_OPTIONS}
          value={status}
          onChange={setStatus}
          placeholder="All statuses"
          fullWidth={false}
          className="w-44"
        />
      </div>
      <Table
        columns={columns}
        data={filtered}
        rowKey={(r) => String(r.reportid)}
        loading={loading}
        searchable
        searchPlaceholder="Search reports…"
        emptyMessage="No AI reports yet. Try the symptom checker."
      />
    </div>
  );
}

function AppointmentsTab({
  appointments,
  loading,
}: {
  appointments: PatientAppointment[];
  loading: boolean;
}) {
  const [dateRange, setDateRange] = useState<DateRange>({ start: null, end: null });
  const [status, setStatus] = useState<AppointmentStatus | null>(null);

  const filtered = useMemo(
    () =>
      appointments.filter(
        (a) => inRange(a.appointment_date, dateRange) && (!status || a.status === status)
      ),
    [appointments, dateRange, status]
  );

  const STATUS_VARIANT: Record<AppointmentStatus, 'success' | 'info' | 'danger' | 'warning'> = {
    SCHEDULED: 'info',
    COMPLETED: 'success',
    CANCELLED: 'danger',
    NO_SHOW: 'warning',
  };

  const columns: TableColumn<PatientAppointment>[] = [
    {
      key: 'date',
      header: 'Date',
      accessor: (a) => a.appointment_date,
      sortable: true,
      width: '110px',
    },
    { key: 'time', header: 'Time', accessor: (a) => a.appointment_time, width: '90px' },
    { key: 'doctor', header: 'Doctor', accessor: (a) => `Dr. ${a.doctor_name}`, sortable: true },
    { key: 'specialization', header: 'Specialization', accessor: (a) => a.specialization },
    {
      key: 'status',
      header: 'Status',
      accessor: (a) => (
        <Badge variant={STATUS_VARIANT[a.status]} size="sm">
          {a.status}
        </Badge>
      ),
      sortAccessor: (a) => a.status,
      sortable: true,
      width: '120px',
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        <DateRangeFilter value={dateRange} onChange={setDateRange} />
        <Select<AppointmentStatus>
          options={APPOINTMENT_STATUS_OPTIONS}
          value={status}
          onChange={setStatus}
          placeholder="All statuses"
          fullWidth={false}
          className="w-44"
        />
      </div>
      <Table
        columns={columns}
        data={filtered}
        rowKey={(a) => String(a.slotid)}
        loading={loading}
        searchable
        searchPlaceholder="Search appointments…"
        emptyMessage="No appointments yet."
      />
    </div>
  );
}
