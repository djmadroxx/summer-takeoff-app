export const ROLE_LABELS = {
    user: 'Vendég',
    staff: 'Promoter',
    admin: 'Adminisztrátor',
    pultos: 'Pultos',
} as const;

export type Role = keyof typeof ROLE_LABELS;

export const ROLES = Object.keys(
  ROLE_LABELS,
) as Role[];

export const ROLE_VALUES = Object.keys(
  ROLE_LABELS,
) as [Role, ...Role[]];

export function isValidRole(
  role: string,
): role is Role {
  return role in ROLE_LABELS;
}

export function getRoleLabel(
  role: string,
): string {
  return (
    ROLE_LABELS[
      role as Role
    ] ?? role
  );
}