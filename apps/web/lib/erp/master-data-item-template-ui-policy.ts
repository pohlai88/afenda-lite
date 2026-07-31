import type { ItemTemplateAttributeDataType } from "@afenda/master-data";

/** Data types the current simple template editor can configure end to end. */
export const ITEM_TEMPLATE_ATTRIBUTE_FORM_DATA_TYPES = [
	"text",
	"single_option",
] as const satisfies readonly ItemTemplateAttributeDataType[];
