import type { ReactNode } from 'react';
import { HomeIcon, SearchIcon } from '../components/common/icons';
import type { AppUser, NavItem } from '../components/layout/types';
import type { FooterLink, SocialLink } from '../components/layout/Footer';
import { EMERGENCY_NUMBER } from '../config/env';

export { EMERGENCY_NUMBER };

export const NAV_ITEMS: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    to: '/',
    icon: <HomeIcon className="h-5 w-5" />,
    end: true,
  },
  {
    id: 'components',
    label: 'Component Library',
    to: '/components',
    icon: <SearchIcon className="h-5 w-5" />,
  },
];

export const DEMO_USER: AppUser = {
  name: 'Dr. Amara Chen',
  email: 'amara.chen@medassist.ai',
  role: 'Cardiologist',
};

export const FOOTER_LINKS: FooterLink[] = [
  { label: 'About', href: '/about' },
  { label: 'Privacy Policy', href: '/privacy' },
  { label: 'Terms of Service', href: '/terms' },
];

function monogram(letter: string): ReactNode {
  return (
    <span className="flex h-5 w-5 items-center justify-center rounded-full border border-current text-[10px] font-bold">
      {letter}
    </span>
  );
}

export const SOCIAL_LINKS: SocialLink[] = [
  { label: 'Twitter / X', href: 'https://twitter.com', icon: monogram('X') },
  { label: 'LinkedIn', href: 'https://linkedin.com', icon: monogram('in') },
];
