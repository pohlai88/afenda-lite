import {
	RECEIVING_PERMISSION_DISCREPANCY_RECORD,
	RECEIVING_PERMISSION_DISCREPANCY_RESOLVE,
	RECEIVING_PERMISSION_RECEIPT_CANCEL,
	RECEIVING_PERMISSION_RECEIPT_CREATE,
	RECEIVING_PERMISSION_RECEIPT_POST,
	RECEIVING_PERMISSION_RECEIPT_READ,
	RECEIVING_PERMISSION_RECEIPT_REVERSE,
	RECEIVING_PERMISSION_RECEIPT_UPDATE,
} from "../../kernel/execution/permissions";
import { defineReceivingOperationRegistry } from "../../kernel/operations/define-registry";

const OWNER = "receipts" as const;

export const RECEIVING_RECEIPT_COMMANDS = defineReceivingOperationRegistry({
	createDraftGoodsReceipt: {
		id: "receiving.receipt.create",
		kind: "command",
		owner: OWNER,
		permission: RECEIVING_PERMISSION_RECEIPT_CREATE,
		publicName: "createDraftGoodsReceipt",
	},
	addGoodsReceiptLine: {
		id: "receiving.receipt.line.add",
		kind: "command",
		owner: OWNER,
		permission: RECEIVING_PERMISSION_RECEIPT_UPDATE,
		publicName: "addGoodsReceiptLine",
	},
	postGoodsReceipt: {
		id: "receiving.receipt.post",
		kind: "command",
		owner: OWNER,
		permission: RECEIVING_PERMISSION_RECEIPT_POST,
		publicName: "postGoodsReceipt",
	},
	cancelGoodsReceipt: {
		id: "receiving.receipt.cancel",
		kind: "command",
		owner: OWNER,
		permission: RECEIVING_PERMISSION_RECEIPT_CANCEL,
		publicName: "cancelGoodsReceipt",
	},
	reverseGoodsReceipt: {
		id: "receiving.receipt.reverse",
		kind: "command",
		owner: OWNER,
		permission: RECEIVING_PERMISSION_RECEIPT_REVERSE,
		publicName: "reverseGoodsReceipt",
	},
	recordReceivingDiscrepancy: {
		id: "receiving.discrepancy.record",
		kind: "command",
		owner: OWNER,
		permission: RECEIVING_PERMISSION_DISCREPANCY_RECORD,
		publicName: "recordReceivingDiscrepancy",
	},
	resolveReceivingDiscrepancy: {
		id: "receiving.discrepancy.resolve",
		kind: "command",
		owner: OWNER,
		permission: RECEIVING_PERMISSION_DISCREPANCY_RESOLVE,
		publicName: "resolveReceivingDiscrepancy",
	},
});

export const RECEIVING_RECEIPT_QUERIES = defineReceivingOperationRegistry({
	getGoodsReceiptById: {
		id: "receiving.receipt.get",
		kind: "query",
		owner: OWNER,
		permission: RECEIVING_PERMISSION_RECEIPT_READ,
		publicName: "getGoodsReceiptById",
	},
	listGoodsReceipts: {
		id: "receiving.receipt.list",
		kind: "query",
		owner: OWNER,
		permission: RECEIVING_PERMISSION_RECEIPT_READ,
		publicName: "listGoodsReceipts",
	},
	listReceivingInventoryExceptions: {
		id: "receiving.inventory.exceptions",
		kind: "query",
		owner: OWNER,
		permission: RECEIVING_PERMISSION_RECEIPT_READ,
		publicName: "listReceivingInventoryExceptions",
	},
});
