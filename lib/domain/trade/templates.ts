import type { HotSalesEvent, HotSalesFieldDef, HotSalesProduct } from "@/lib/domain/trade/types";

/** GP2 piglet spot-selling — cloneable template data only (no schema enums). */
export type PigletTemplateConfig = {
  event: Omit<
    Partial<HotSalesEvent>,
    "id" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy"
  >;
  products: Array<Omit<HotSalesProduct, "id" | "eventId">>;
  fieldDefs: Array<Omit<HotSalesFieldDef, "id" | "eventId">>;
};

export function buildGp2PigletTemplate(): PigletTemplateConfig {
  const batches = [
    { batch: "July", batchVi: "T7" },
    { batch: "August", batchVi: "T8" },
    { batch: "September", batchVi: "T9" },
  ];
  const weights = ["8kg", "10kg", "15kg"];

  const products: PigletTemplateConfig["products"] = [];
  let sortOrder = 0;
  for (const { batch } of batches) {
    for (const weight of weights) {
      products.push({
        productName: `${batch} — ${weight}`,
        productCode: `${batch.slice(0, 3).toUpperCase()}-${weight.replace("kg", "")}`,
        source: "GP2",
        batch,
        category: "Piglet",
        weight,
        unit: "piglet",
        tentativeQuantity: 1400,
        finalConfirmedQuantity: null,
        allocatedQuantity: 0,
        fulfilledQuantity: 0,
        supportAmountPerUnit: 100_000,
        pickupLocation: "GP2",
        sortOrder: sortOrder++,
        attrs: {},
      });
    }
  }

  return {
    event: {
      eventCode: "GP2-PIGLET-TEMPLATE",
      eventName: "GP2 Piglet Hot Sales — July to September 2026",
      eventType: "spot_selling",
      descriptionEn:
        "Spot-selling program for GP2 piglet orders. Sales Team only. Standalone VND100,000 per piglet support.",
      descriptionVi:
        "Chương trình bán spot heo con từ GP2. Chỉ Đội ngũ Sales. Hỗ trợ 100.000 VNĐ/con độc lập.",
      opensAt: new Date(),
      closesAt: new Date(),
      timezone: "Asia/Ho_Chi_Minh",
      status: "draft",
      sourceLocation: "GP2",
      allocationMethod: "priority_fcfs",
      standaloneProgram: true,
      combinationAllowed: false,
      transferAllowed: true,
      depositRequired: true,
      depositRefundable: false,
      supportType: "fixed_per_unit",
      supportAmountPerUnit: 100_000,
      supportUnitLabel: "per piglet",
      isTemplate: true,
      clonedFromId: null,
    },
    products,
    fieldDefs: [
      {
        entityType: "order",
        fieldKey: "priority_status",
        fieldType: "select",
        required: false,
        defaultValue: null,
        labelEn: "Priority status",
        labelVi: "Trạng thái ưu tiên",
        helpTextEn: "Priority customer or normal customer",
        helpTextVi: "Khách hàng ưu tiên hoặc khách hàng thường",
        dropdownOptions: ["priority", "normal"],
        visibleToRoles: ["admin", "sales"],
        editableByRoles: ["admin", "sales"],
        displayOrder: 1,
        active: true,
      },
      {
        entityType: "order",
        fieldKey: "deposit_status",
        fieldType: "select",
        required: false,
        defaultValue: "pending",
        labelEn: "Deposit status",
        labelVi: "Trạng thái đặt cọc",
        helpTextEn: "Status tracking only — not finance settlement",
        helpTextVi: "Chỉ theo dõi trạng thái — không phải thanh toán",
        dropdownOptions: ["pending", "paid", "waived", "not_required"],
        visibleToRoles: ["admin", "sales"],
        editableByRoles: ["admin", "sales"],
        displayOrder: 2,
        active: true,
      },
      {
        entityType: "order",
        fieldKey: "pickup_schedule",
        fieldType: "text",
        required: false,
        defaultValue: null,
        labelEn: "Pickup schedule",
        labelVi: "Lịch nhận hàng",
        helpTextEn: "GP2 pickup timing",
        helpTextVi: "Thời gian nhận tại GP2",
        dropdownOptions: null,
        visibleToRoles: ["admin", "sales"],
        editableByRoles: ["admin", "sales"],
        displayOrder: 3,
        active: true,
      },
    ],
  };
}
