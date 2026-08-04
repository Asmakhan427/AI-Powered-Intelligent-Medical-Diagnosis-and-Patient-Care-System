import { useState, type FormEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Badge,
  Button,
  Card,
  DatePicker,
  type DateRange,
  Dropdown,
  Form,
  Input,
  Loader,
  Modal,
  Pagination,
  Select,
  type SelectOption,
  Table,
  type TableColumn,
  Tabs,
  useToast,
  CheckIcon,
  SearchIcon,
} from '../components/common';
import { Layout } from '../components/layout/Layout';
import { DEMO_USER, EMERGENCY_NUMBER, FOOTER_LINKS, NAV_ITEMS, SOCIAL_LINKS } from './demoData';

/**
 * Living showcase of every component in `components/common/`, used in place
 * of a Storybook setup. Rendered inside the standard `Layout` shell so it
 * also doubles as a real-world usage example of Sidebar/Header/Footer.
 */
export default function ComponentsShowcasePage() {
  const navigate = useNavigate();

  return (
    <Layout
      navItems={NAV_ITEMS}
      user={DEMO_USER}
      onLogout={() => navigate('/login')}
      emergencyNumber={EMERGENCY_NUMBER}
      footerLinks={FOOTER_LINKS}
      socialLinks={SOCIAL_LINKS}
    >
      <Showcase />
    </Layout>
  );
}

interface Patient {
  id: string;
  name: string;
  age: number;
  condition: string;
  status: 'Stable' | 'Monitoring' | 'Critical';
}

const PATIENTS: Patient[] = [
  { id: 'p1', name: 'Amara Chen', age: 34, condition: 'Hypertension', status: 'Stable' },
  { id: 'p2', name: 'Liam O’Connor', age: 58, condition: 'Type 2 Diabetes', status: 'Monitoring' },
  { id: 'p3', name: 'Fatima Zahra', age: 27, condition: 'Migraine', status: 'Stable' },
  {
    id: 'p4',
    name: 'Kenji Watanabe',
    age: 71,
    condition: 'Cardiac Arrhythmia',
    status: 'Critical',
  },
  { id: 'p5', name: 'Sofia Rossi', age: 45, condition: 'Asthma', status: 'Stable' },
];

const PATIENT_COLUMNS: TableColumn<Patient>[] = [
  { key: 'name', header: 'Name', accessor: (p) => p.name, sortable: true },
  { key: 'age', header: 'Age', accessor: (p) => p.age, sortable: true, align: 'right' },
  { key: 'condition', header: 'Condition', accessor: (p) => p.condition },
  {
    key: 'status',
    header: 'Status',
    accessor: (p) => (
      <Badge
        variant={
          p.status === 'Critical' ? 'danger' : p.status === 'Monitoring' ? 'warning' : 'success'
        }
        dot
      >
        {p.status}
      </Badge>
    ),
    sortAccessor: (p) => p.status,
  },
];

const SPECIALIZATIONS: SelectOption<string>[] = [
  { value: 'cardiology', label: 'Cardiology' },
  { value: 'neurology', label: 'Neurology' },
  { value: 'dermatology', label: 'Dermatology' },
  { value: 'pediatrics', label: 'Pediatrics' },
  { value: 'orthopedics', label: 'Orthopedics' },
];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {title}
      </h2>
      <Card>{children}</Card>
    </section>
  );
}

function Showcase() {
  const toast = useToast();

  const [modalOpen, setModalOpen] = useState(false);
  const [tablePage, setTablePage] = useState(1);
  const [specialization, setSpecialization] = useState<string | null>(null);
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [appointmentDate, setAppointmentDate] = useState<Date | null>(null);
  const [stayRange, setStayRange] = useState<DateRange>({ start: null, end: null });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [reminders, setReminders] = useState(true);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    const data = new FormData(e.currentTarget);
    const email = String(data.get('email') || '');
    const errors: Record<string, string> = {};
    if (!email.includes('@')) errors.email = 'Enter a valid email address.';
    setFormErrors(errors);
    if (Object.keys(errors).length === 0) toast.success('Profile saved.');
  };

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Component Library</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Reusable components in `src/components/common/`.
        </p>
      </header>

      <Section title="Button">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="danger">Danger</Button>
          <Button variant="success">Success</Button>
          <Button variant="outline">Outline</Button>
          <Button size="sm">Small</Button>
          <Button size="lg">Large</Button>
          <Button loading>Saving…</Button>
          <Button leftIcon={<CheckIcon className="h-4 w-4" />}>With icon</Button>
          <Button disabled>Disabled</Button>
        </div>
      </Section>

      <Section title="Card">
        <div className="grid gap-4 sm:grid-cols-3">
          <Card variant="default" padding="sm">
            Default
          </Card>
          <Card variant="elevated" padding="sm" hoverEffect>
            Elevated + hover
          </Card>
          <Card variant="glass" padding="sm">
            Glass
          </Card>
        </div>
        <Card className="mt-4">
          <Card.Header>
            <h3 className="font-semibold">Patient summary</h3>
            <Badge variant="info">New</Badge>
          </Card.Header>
          <Card.Body>Header / Body / Footer slots via compound API.</Card.Body>
          <Card.Footer>
            <Button size="sm" variant="outline">
              Cancel
            </Button>
            <Button size="sm">Confirm</Button>
          </Card.Footer>
        </Card>
      </Section>

      <Section title="Input">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Full name" placeholder="Jane Doe" required />
          <Input
            label="Email"
            type="email"
            leftIcon={<SearchIcon className="h-4 w-4" />}
            helperText="We'll never share it."
          />
          <Input label="Password" type="password" error="Must be at least 8 characters" />
          <Input label="Notes" type="textarea" placeholder="Additional context…" />
        </div>
      </Section>

      <Section title="Modal">
        <Button onClick={() => setModalOpen(true)}>Open modal</Button>
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Confirm appointment"
          size="md"
          footer={
            <>
              <Button variant="outline" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setModalOpen(false);
                  toast.success('Appointment confirmed.');
                }}
              >
                Confirm
              </Button>
            </>
          }
        >
          <p className="text-sm text-gray-600">Book Dr. Rossi for Tuesday 10:00 AM?</p>
        </Modal>
      </Section>

      <Section title="Toast">
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => toast.success('Saved successfully.')}>
            Success
          </Button>
          <Button size="sm" variant="danger" onClick={() => toast.error('Something went wrong.')}>
            Error
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => toast.warning('Session expiring soon.')}
          >
            Warning
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => toast.info('New feature available.', { position: 'bottom-left' })}
          >
            Info (bottom-left)
          </Button>
        </div>
      </Section>

      <Section title="Loader">
        <div className="flex flex-wrap items-center gap-8">
          <Loader variant="spinner" text="Loading" />
          <Loader variant="dots" size="lg" />
          <Loader variant="bar" />
        </div>
      </Section>

      <Section title="Badge">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="primary">Primary</Badge>
          <Badge variant="success" dot>
            Active
          </Badge>
          <Badge variant="warning">Warning</Badge>
          <Badge variant="danger" size="sm">
            Small
          </Badge>
          <Badge variant="info" count={7} />
          <Badge variant="danger" count={128} max={99} />
        </div>
      </Section>

      <Section title="Alert">
        <div className="space-y-3">
          <Alert
            type="success"
            title="Saved"
            description="Your changes have been saved."
            dismissible
          />
          <Alert
            type="error"
            title="Analysis failed"
            description="The AI model timed out. Try again."
          />
          <Alert type="warning" description="This patient has a pending lab result." />
          <Alert type="info" description="New guidelines are available in the education center." />
        </div>
      </Section>

      <Section title="Tabs">
        <Tabs
          items={[
            {
              id: 'overview',
              label: 'Overview',
              content: <p className="text-sm text-gray-600">Overview content.</p>,
            },
            {
              id: 'history',
              label: 'History',
              badge: (
                <Badge size="sm" variant="info">
                  3
                </Badge>
              ),
              content: <p className="text-sm text-gray-600">Medical history content.</p>,
            },
            { id: 'labs', label: 'Labs', disabled: true, content: <p>Labs content.</p> },
          ]}
        />
      </Section>

      <Section title="Dropdown">
        <Dropdown
          trigger={<Button variant="outline">Actions</Button>}
          items={[
            {
              type: 'item',
              id: 'view',
              label: 'View profile',
              onClick: () => toast.info('Opening profile…'),
            },
            { type: 'item', id: 'edit', label: 'Edit details' },
            { type: 'divider', id: 'd1' },
            {
              type: 'checkbox',
              id: 'reminders',
              label: 'Email reminders',
              checked: reminders,
              onChange: setReminders,
            },
          ]}
        />
      </Section>

      <Section title="Table">
        <Table
          columns={PATIENT_COLUMNS}
          data={PATIENTS}
          rowKey={(p) => p.id}
          searchable
          selectable
          pageSize={3}
        />
      </Section>

      <Section title="Pagination">
        <Pagination currentPage={tablePage} totalPages={12} onPageChange={setTablePage} />
      </Section>

      <Section title="Form">
        <Form onSubmit={handleSubmit} errors={formErrors} className="max-w-sm">
          <Input name="email" label="Email" type="email" required />
          <Button type="submit">Save profile</Button>
        </Form>
      </Section>

      <Section title="Select">
        <div className="grid gap-4 sm:grid-cols-2">
          <Select<string>
            label="Specialization"
            placeholder="Choose a specialist"
            options={SPECIALIZATIONS}
            value={specialization}
            onChange={setSpecialization}
            searchable
          />
          <Select<string>
            multiple
            label="Symptoms"
            placeholder="Select symptoms"
            options={[
              {
                label: 'General',
                options: [
                  { value: 'fever', label: 'Fever' },
                  { value: 'cough', label: 'Cough' },
                ],
              },
              {
                label: 'Neurological',
                options: [
                  { value: 'headache', label: 'Headache' },
                  { value: 'dizziness', label: 'Dizziness' },
                ],
              },
            ]}
            value={symptoms}
            onChange={setSymptoms}
          />
        </div>
      </Section>

      <Section title="DatePicker">
        <div className="grid gap-4 sm:grid-cols-2">
          <DatePicker
            label="Appointment"
            value={appointmentDate}
            onChange={setAppointmentDate}
            showTime
            minDate={new Date()}
          />
          <DatePicker label="Hospital stay" range value={stayRange} onChange={setStayRange} />
        </div>
      </Section>
    </div>
  );
}
