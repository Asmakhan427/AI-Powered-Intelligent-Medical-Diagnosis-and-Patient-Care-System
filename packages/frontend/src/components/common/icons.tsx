// Minimal hand-rolled icon set used internally by the common components
// (close buttons, chevrons, status glyphs). Kept local so the component
// library has zero icon-package dependency; consumers can still pass their
// own icons via the `icon` / `leftIcon` / `rightIcon` props everywhere.
import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

const base = (props: IconProps): IconProps => ({
  xmlns: 'http://www.w3.org/2000/svg',
  viewBox: '0 0 20 20',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  width: '1em',
  height: '1em',
  'aria-hidden': true,
  ...props,
});

export const XIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M5 5l10 10M15 5L5 15" />
  </svg>
);

export const CheckIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M4 10.5l4 4 8-9" />
  </svg>
);

export const ChevronDownIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M5 7.5l5 5 5-5" />
  </svg>
);

export const ChevronUpIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M5 12.5l5-5 5 5" />
  </svg>
);

export const ChevronLeftIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M12.5 5l-5 5 5 5" />
  </svg>
);

export const ChevronRightIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M7.5 5l5 5-5 5" />
  </svg>
);

export const ChevronsLeftIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M13 5l-5 5 5 5M8 5l-5 5 5 5" />
  </svg>
);

export const ChevronsRightIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M7 5l5 5-5 5M12 5l5 5-5 5" />
  </svg>
);

export const SearchIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <circle cx="8.5" cy="8.5" r="5.5" />
    <path d="M16 16l-3.5-3.5" />
  </svg>
);

export const InfoIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <circle cx="10" cy="10" r="7.25" />
    <path d="M10 9v5M10 6.25h.01" />
  </svg>
);

export const CheckCircleIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <circle cx="10" cy="10" r="7.25" />
    <path d="M6.75 10.25l2.25 2.25 4.25-4.5" />
  </svg>
);

export const AlertTriangleIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M10 3.5l8 14H2l8-14z" />
    <path d="M10 8.5v3.25M10 14.25h.01" />
  </svg>
);

export const XCircleIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <circle cx="10" cy="10" r="7.25" />
    <path d="M7.5 7.5l5 5M12.5 7.5l-5 5" />
  </svg>
);

export const CalendarIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <rect x="3" y="4.5" width="14" height="12" rx="1.5" />
    <path d="M3 8.5h14M7 2.5v4M13 2.5v4" />
  </svg>
);

export const ClockIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <circle cx="10" cy="10" r="7.25" />
    <path d="M10 6v4l3 2" />
  </svg>
);

export const BellIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M5 8a5 5 0 0110 0c0 4 1.5 5.5 1.5 5.5h-13S5 12 5 8z" />
    <path d="M8.25 16.5a1.75 1.75 0 003.5 0" />
  </svg>
);

export const MenuIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M3 6h14M3 10h14M3 14h14" />
  </svg>
);

export const UserIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <circle cx="10" cy="6.75" r="3.25" />
    <path d="M3.5 17c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
  </svg>
);

export const LogOutIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M8 17H4.5A1.5 1.5 0 013 15.5v-11A1.5 1.5 0 014.5 3H8" />
    <path d="M13 14l4-4-4-4M17 10H7.5" />
  </svg>
);

export const PhoneIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M4 4.5c0-.6.4-1 1-1h2.2c.5 0 .9.3 1 .8l.7 2.9c.1.4 0 .9-.4 1.2l-1.3 1.1a11 11 0 005 5l1.1-1.3c.3-.3.8-.5 1.2-.4l2.9.7c.5.1.8.5.8 1V16c0 .6-.4 1-1 1h-1C8.5 17 3 11.5 3 5.5v-1z" />
  </svg>
);

export const SunIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <circle cx="10" cy="10" r="3.25" />
    <path d="M10 2.5v2M10 15.5v2M17.5 10h-2M4.5 10h-2M15.3 4.7l-1.4 1.4M6.1 13.9l-1.4 1.4M15.3 15.3l-1.4-1.4M6.1 6.1L4.7 4.7" />
  </svg>
);

export const MoonIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M16.5 12.3A7 7 0 017.7 3.5a7 7 0 108.8 8.8z" />
  </svg>
);

export const HomeIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M3.5 9.5L10 4l6.5 5.5" />
    <path d="M5 8.5V16a1 1 0 001 1h8a1 1 0 001-1V8.5" />
  </svg>
);

export const MicIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <rect x="7.25" y="2.5" width="5.5" height="9.5" rx="2.75" />
    <path d="M4.5 9.5a5.5 5.5 0 0011 0M10 15v2.5M7.5 17.5h5" />
  </svg>
);

export const SendIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M17 3L3 9.5l6 2.5M17 3l-4.5 14-3.5-5M17 3L9 12" />
  </svg>
);

export const DownloadIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M10 3v10M6 9.5L10 13.5 14 9.5" />
    <path d="M4 15.5h12" />
  </svg>
);

export const PrinterIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <rect x="4.5" y="7" width="11" height="7" rx="1" />
    <path d="M6 7V3.5h8V7M6.5 10.5h7M14.5 9.5h.01" />
    <path d="M6 14v2.5h8V14" />
  </svg>
);

export const StarIcon = (props: IconProps) => (
  <svg {...base(props)} fill={props.fill ?? 'none'}>
    <path
      d="M10 2.5l2.35 4.76 5.25.76-3.8 3.7.9 5.23L10 14.5l-4.7 2.45.9-5.23-3.8-3.7 5.25-.76z"
      strokeLinejoin="round"
    />
  </svg>
);

export const FilterIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M3 4.5h14M6 10h8M8.5 15.5h3" />
  </svg>
);
