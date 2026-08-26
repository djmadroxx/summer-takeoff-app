export const ROLE_LABELS = {
    user: 'Vendég',
    staff: 'Promoter',
    admin: 'Adminisztrátor',
    pultos: 'Pultos',
};
export const ROLES = Object.keys(ROLE_LABELS);
export const ROLE_VALUES = Object.keys(ROLE_LABELS);
export function isValidRole(role) {
    return role in ROLE_LABELS;
}
export function getRoleLabel(role) {
    return (ROLE_LABELS[role] ?? role);
}
