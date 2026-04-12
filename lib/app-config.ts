export type AppRole = 'super_admin' | 'admin' | 'staff' | 'participant';
export const appRoles: AppRole[] = ['super_admin', 'admin', 'staff', 'participant'];
export const staffPrivilegedRoles: AppRole[] = ['super_admin', 'admin', 'staff'];
export const adminPrivilegedRoles: AppRole[] = ['super_admin', 'admin'];

export type NavItem = {
  href: string;
  label: string;
  description: string;
  roles?: AppRole[];
};

export const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', description: 'Operational overview' },
  { href: '/events', label: 'Events', description: 'Upcoming camps and signups' },
  { href: '/tasks', label: 'Tasks', description: 'Assignments and follow-ups' },
  { href: '/check-in', label: 'Check-in', description: 'Front desk flow' },
  {
    href: '/inventory',
    label: 'Inventory',
    description: 'Basic stock tracking',
    roles: staffPrivilegedRoles,
  },
  { href: '/profile', label: 'Profile', description: 'Account details' },
  {
    href: '/dev-tools',
    label: 'Dev Tools',
    description: 'Temporary internal tool menu',
  },
  {
    href: '/admin',
    label: 'Admin',
    description: 'Staff-only management',
    roles: staffPrivilegedRoles,
  },
];

export const sampleEvents = [
  {
    id: 'spring-leadership-weekend',
    title: 'Spring Leadership Weekend',
    slug: 'spring-leadership-weekend',
    location: 'Lakeview Retreat Center',
    startsAt: '2026-05-15T17:00:00Z',
    endsAt: '2026-05-17T14:00:00Z',
    status: 'published',
  },
  {
    id: 'junior-volunteer-training',
    title: 'Junior Volunteer Training',
    slug: 'junior-volunteer-training',
    location: 'North Hall',
    startsAt: '2026-06-04T09:00:00Z',
    endsAt: '2026-06-04T16:00:00Z',
    status: 'draft',
  },
] as const;

export const sampleTasks = [
  {
    title: 'Finalize counselor roster',
    status: 'in_progress',
    priority: 'high',
    owner: 'Staff team',
  },
  {
    title: 'Confirm transport manifest',
    status: 'todo',
    priority: 'medium',
    owner: 'Admin desk',
  },
  {
    title: 'Prepare arrival QR poster',
    status: 'done',
    priority: 'low',
    owner: 'Check-in crew',
  },
] as const;
