export declare const ROLE_LABELS: {
    readonly user: "Vendég";
    readonly staff: "Promoter";
    readonly admin: "Adminisztrátor";
    readonly pultos: "Pultos";
};
export type Role = keyof typeof ROLE_LABELS;
export declare const ROLES: Role[];
export declare const ROLE_VALUES: [Role, ...Role[]];
export declare function isValidRole(role: string): role is Role;
export declare function getRoleLabel(role: string): string;
