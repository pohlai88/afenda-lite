// Third-party Imports
import { createStore } from "zustand/vanilla";

// Type Imports
import type {
	AppRole,
	PermissionKey,
	ResourcePermissions,
	RoleDialogMode,
	RoleFormData,
} from "../../contracts/applications/role-types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const PERMISSION_RESOURCES: string[] = [
	"User Management",
	"Content Management",
	"Disputes Management",
	"Database Management",
	"Financial Management",
	"Reporting",
	"API Control",
	"Repository Management",
	"Payroll",
];

// ---------------------------------------------------------------------------
// Store types
// ---------------------------------------------------------------------------

export type RolesStoreData = {
	roles: AppRole[];
	dialogMode: RoleDialogMode | null;
	editingRoleId: string | null;
};

type RolesStoreActions = {
	addRole: (data: RoleFormData) => void;
	updateRole: (id: string, data: RoleFormData) => void;
	deleteRole: (id: string) => void;
	openAddDialog: () => void;
	openEditDialog: (id: string) => void;
	closeDialog: () => void;
	updatePermission: (
		roleId: string,
		resource: string,
		action: PermissionKey,
		value: boolean,
	) => void;
};

export type RolesStore = RolesStoreData & RolesStoreActions;

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

const buildNewRole = (data: RoleFormData): AppRole => ({
	id: crypto.randomUUID(),
	name: data.name.trim(),
	permissions: data.permissions,
});

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const createRolesStore = (initialState: Partial<RolesStoreData> = {}) =>
	createStore<RolesStore>()((set) => ({
		roles: initialState.roles ?? [],
		dialogMode: null,
		editingRoleId: null,

		...initialState,

		addRole: (data) => {
			const newRole = buildNewRole(data);

			set((state) => ({
				roles: [...state.roles, newRole],
				dialogMode: null,
				editingRoleId: null,
			}));
		},

		updateRole: (id, data) =>
			set((state) => ({
				roles: state.roles.map((role) =>
					role.id === id
						? { ...role, name: data.name.trim(), permissions: data.permissions }
						: role,
				),
				dialogMode: null,
				editingRoleId: null,
			})),

		deleteRole: (id) =>
			set((state) => ({
				roles: state.roles.filter((role) => role.id !== id),
			})),

		openAddDialog: () => set({ dialogMode: "add", editingRoleId: null }),

		openEditDialog: (id) => set({ dialogMode: "edit", editingRoleId: id }),

		closeDialog: () => set({ dialogMode: null, editingRoleId: null }),

		updatePermission: (roleId, resource, action, value) =>
			set((state) => ({
				roles: state.roles.map((role) =>
					role.id === roleId
						? {
								...role,
								permissions: role.permissions.map((perm) =>
									perm.resource === resource
										? { ...perm, [action]: value }
										: perm,
								),
							}
						: role,
				),
			})),
	}));
