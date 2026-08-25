export const ROLE_LABELS = {
    user: 'Vendég',
    staff: 'Promoter',
    admin: 'Adminisztrátor',
} as const;

export function getRoleLabel(role: string) {
  return ROLE_LABELS[role as keyof typeof ROLE_LABELS] ?? role;
}