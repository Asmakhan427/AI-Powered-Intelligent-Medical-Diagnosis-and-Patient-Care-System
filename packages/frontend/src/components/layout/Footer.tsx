import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '../../lib/cn';
import { PhoneIcon } from '../common/icons';

export interface FooterLink {
  label: string;
  href: string;
}

export interface SocialLink {
  label: string;
  href: string;
  icon: ReactNode;
}

export interface FooterProps {
  links?: FooterLink[];
  socialLinks?: SocialLink[];
  emergencyNumber?: string;
  className?: string;
}

const DEFAULT_LINKS: FooterLink[] = [
  { label: 'About', href: '/about' },
  { label: 'Privacy Policy', href: '/privacy' },
  { label: 'Terms of Service', href: '/terms' },
];

function isInternalLink(href: string): boolean {
  return href.startsWith('/');
}

export function Footer({
  links = DEFAULT_LINKS,
  socialLinks = [],
  emergencyNumber,
  className,
}: FooterProps) {
  const year = new Date().getFullYear();

  return (
    <footer
      className={cn(
        'border-t border-gray-200 bg-white px-4 py-6 dark:border-gray-800 dark:bg-gray-900 sm:px-6',
        'print:hidden',
        className
      )}
    >
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 text-sm text-gray-500 dark:text-gray-400 md:flex-row md:justify-between">
        <p className="order-3 md:order-1">© {year} MedAssist AI. All rights reserved.</p>

        <nav
          aria-label="Footer"
          className="order-1 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 md:order-2"
        >
          {links.map((link) =>
            isInternalLink(link.href) ? (
              <Link
                key={link.label}
                to={link.href}
                className="hover:text-gray-900 dark:hover:text-gray-100"
              >
                {link.label}
              </Link>
            ) : (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noreferrer"
                className="hover:text-gray-900 dark:hover:text-gray-100"
              >
                {link.label}
              </a>
            )
          )}
        </nav>

        <div className="order-2 flex items-center gap-4 md:order-3">
          {emergencyNumber && (
            <a
              href={`tel:${emergencyNumber}`}
              className="flex items-center gap-1.5 font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
            >
              <PhoneIcon className="h-4 w-4" />
              Emergency: {emergencyNumber}
            </a>
          )}
          {socialLinks.length > 0 && (
            <div className="flex items-center gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={social.label}
                  className="text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-200"
                >
                  {social.icon}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </footer>
  );
}

export default Footer;
