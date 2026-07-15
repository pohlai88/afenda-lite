// Third-party imports
import { createStore } from "zustand/vanilla";
// Type imports
import type {
	Contact,
	ContactNavItem,
	ContactView,
	CreateContactInput,
	Label,
} from "../../contracts/applications/contact-types";
// Utils imports
import { parsePhoneNumber } from "../../lib/contact-utils";

type ContactStatusFilter = "all" | Contact["status"];

export interface ContactState {
	contacts: Contact[];
	activeNav: ContactNavItem;
	activeLabel: Label | null;
	statusFilter: ContactStatusFilter;
	view: ContactView;
	selectedContactPhone: number | null;
	isCreatingContact: boolean;
	isEditingContact: boolean;

	setActiveNav: (nav: ContactNavItem) => void;
	setActiveLabel: (label: Label | null) => void;
	setStatusFilter: (filter: ContactStatusFilter) => void;
	setView: (view: ContactView) => void;
	selectContact: (phone: number) => void;
	clearSelectedContact: () => void;
	openCreateContact: () => void;
	closeCreateContact: () => void;
	openEditContact: (phone: number) => void;
	closeEditContact: () => void;
	addContact: (input: CreateContactInput) => number | null;
	updateContact: (phone: number, input: CreateContactInput) => number | null;
	toggleFavourite: (phone: number) => void;
	toggleSpam: (phone: number) => void;
	toggleBlocked: (phone: number) => void;
	deleteContact: (phone: number) => void;
}

export const createContactStore = (initialState: Partial<ContactState> = {}) =>
	createStore<ContactState>()((set, get) => ({
		contacts: initialState.contacts ?? [],
		activeNav: "all",
		activeLabel: null,
		statusFilter: "all",
		view: "list",
		selectedContactPhone: null,
		isCreatingContact: false,
		isEditingContact: false,

		...initialState,

		setActiveNav: (nav) =>
			set({ activeNav: nav, activeLabel: null, statusFilter: "all" }),

		setActiveLabel: (label) =>
			set({
				activeLabel: label,
				statusFilter: "all",
				selectedContactPhone: null,
				isCreatingContact: false,
				isEditingContact: false,
			}),

		setStatusFilter: (filter) => set({ statusFilter: filter }),

		setView: (view) => set({ view }),

		selectContact: (phone) =>
			set({
				selectedContactPhone: phone,
				isCreatingContact: false,
				isEditingContact: false,
			}),

		clearSelectedContact: () =>
			set({
				selectedContactPhone: null,
				isCreatingContact: false,
				isEditingContact: false,
			}),

		openCreateContact: () =>
			set({
				isCreatingContact: true,
				selectedContactPhone: null,
				isEditingContact: false,
			}),

		closeCreateContact: () => set({ isCreatingContact: false }),

		openEditContact: (phone) =>
			set({
				selectedContactPhone: phone,
				isCreatingContact: false,
				isEditingContact: true,
			}),

		closeEditContact: () => set({ isEditingContact: false }),

		addContact: (input) => {
			const trimmedFirstName = input.firstName.trim();
			const trimmedLastName = input.lastName.trim();

			if (!trimmedFirstName || !trimmedLastName) return null;

			const phone = parsePhoneNumber(input.phone);

			if (phone === null) return null;

			const { contacts } = get();

			if (contacts.some((contact) => contact.phone === phone)) return null;

			const newContact: Contact = {
				firstName: trimmedFirstName,
				lastName: trimmedLastName,
				email: input.email.trim() || undefined,
				phone,
				city: input.city.trim() || undefined,
				notes: input.notes.trim() || undefined,
				image: input.image,
				addedDate: new Date(),
				labels: input.labels,
				status: "active",
				isFavourite: false,
				isRecent: true,
				isBlocked: false,
				isSpam: false,
			};

			set({
				contacts: [...contacts, newContact],
				isCreatingContact: false,
				selectedContactPhone: phone,
			});

			return phone;
		},

		updateContact: (originalPhone, input) => {
			const trimmedFirstName = input.firstName.trim();
			const trimmedLastName = input.lastName.trim();

			if (!trimmedFirstName || !trimmedLastName) return null;

			const newPhone = parsePhoneNumber(input.phone);

			if (newPhone === null) return null;

			const { contacts } = get();
			const contactIndex = contacts.findIndex(
				(contact) => contact.phone === originalPhone,
			);

			if (contactIndex === -1) return null;

			if (
				newPhone !== originalPhone &&
				contacts.some((contact) => contact.phone === newPhone)
			)
				return null;

			const existingContact = contacts[contactIndex];
			if (!existingContact) return null;

			const updatedContact: Contact = {
				...existingContact,
				firstName: trimmedFirstName,
				lastName: trimmedLastName,
				email: input.email.trim() || undefined,
				phone: newPhone,
				city: input.city.trim() || undefined,
				notes: input.notes.trim() || undefined,
				labels: input.labels,
				image: input.image,
			};

			const newContacts = [...contacts];

			newContacts[contactIndex] = updatedContact;

			set({
				contacts: newContacts,
				isEditingContact: false,
				selectedContactPhone: newPhone,
			});

			return newPhone;
		},

		toggleFavourite: (phone) =>
			set((state) => ({
				contacts: state.contacts.map((contact) =>
					contact.phone === phone && !contact.isBlocked && !contact.isSpam
						? { ...contact, isFavourite: !contact.isFavourite }
						: contact,
				),
			})),

		toggleSpam: (phone) =>
			set((state) => ({
				contacts: state.contacts.map((contact) => {
					if (contact.phone !== phone) return contact;

					const isSpam = !contact.isSpam;

					return {
						...contact,
						isSpam,
						isFavourite: isSpam ? false : contact.isFavourite,
					};
				}),
			})),

		toggleBlocked: (phone) =>
			set((state) => ({
				contacts: state.contacts.map((contact) => {
					if (contact.phone !== phone) return contact;

					const isBlocked = !contact.isBlocked;

					return {
						...contact,
						isBlocked,
						isFavourite: isBlocked ? false : contact.isFavourite,
						isSpam: isBlocked ? false : contact.isSpam,
					};
				}),
			})),

		deleteContact: (phone) =>
			set((state) => ({
				contacts: state.contacts.filter((contact) => contact.phone !== phone),
				selectedContactPhone:
					state.selectedContactPhone === phone
						? null
						: state.selectedContactPhone,
			})),
	}));
