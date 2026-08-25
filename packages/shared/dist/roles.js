export const ROLE_LABELS = {
    user: 'Vendég',
    staff: 'Promoter',
    admin: 'Adminisztrátor',
};
export const ROLES = Object.keys(ROLE_LABELS);
export function isValidRole(role) {
    return role in ROLE_LABELS;
}
export function getRoleLabel(role) {
    return (ROLE_LABELS[role] ?? role);
}
