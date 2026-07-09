# Product Requirement: Reusable **Hot Sales Event** Website / ERP Service

## 1. Project Name

## **Reusable Hot Sales Event Portal**

A web-based service connected or branchable from the ERP system, allowing the company to create, manage, and repeat **Hot Sales / Spot-Selling events** with configurable rules, product categories, customer priority, quantity allocation, deposits, transfers, pickup, and reporting.

The system must be **generic**, not hardcoded for only one piglet event, so it can be reused for future sales campaigns, limited-time offers, urgent stock clearance, special allocation programs, or customer-priority selling events.

---

# 2. Main Objective

The website should allow Admin users to create a **Hot Sales event** within the ERP without coding each time.

The system should support events such as:

> “Sales Team only. Order before deadline. Limited quantity. First-come-first-serve plus customer priority. Product categories by month, weight, batch, source farm, or other business-defined criteria. Standalone support amount. Deposit non-refundable. Order transferable. Final quantity subject to confirmed supply.”

The key purpose is to make this process:

* Faster.
* More controlled.
* Reusable.
* Transparent.
* Audit-friendly.
* Self-service for Client Admin.
* Flexible enough for different future sales events.

---

# 3. Core Concept

The system should be built around an **Event Template Engine**.

Each Hot Sales event can have its own:

| Configurable Item | Example                                                    |
| ----------------- | ---------------------------------------------------------- |
| Event name        | GP2 Piglet Hot Sales July 2026                             |
| Event type        | Spot-selling / Hot sales / Clearance / Priority allocation |
| Start time        | 09 July 2026, 3:00 PM                                      |
| Closing time      | 09 July 2026, 8:30 PM                                      |
| Product source    | GP2                                                        |
| Product category  | Piglet, 8kg, 10kg, 15kg                                    |
| Batch             | July, August, September                                    |
| Quantity          | 1,400 piglets/week, subject to final confirmation          |
| Benefit           | VND100,000 per piglet                                      |
| Allocation rule   | Customer priority + first-come-first-serve                 |
| Deposit rule      | Deposit required, non-refundable                           |
| Transfer rule     | Order transferable with approval                           |
| Program rule      | Standalone, not linked to other programs                   |
| Pickup rule       | Pickup from GP2 based on confirmed schedule                |
| Custom columns    | Admin-defined fields                                       |

The same system should be reusable for other products, not only piglets.

---

# 4. User Roles

## 4.1 Super Admin

Usually IT, ERP owner, or system owner.

Permissions:

* Manage all companies, branches, users, and system settings.
* Create global event templates.
* Configure master data.
* Manage permission rules.
* View all events and logs.
* Approve system-level overrides.

---

## 4.2 Client Admin / Event Admin

The business user who manages Hot Sales events.

Permissions:

* Create new Hot Sales event.
* Edit event configuration.
* Add product categories.
* Add additional custom columns.
* Upload or update supply quantity.
* Upload customer priority list.
* Open and close event.
* Review orders.
* Confirm or adjust allocation.
* Approve order transfer.
* Export reports.
* View audit log.

This role must be **fully self-service**.

---

## 4.3 Sales User

The Sales Team member who submits customer orders.

Permissions:

* View active Hot Sales events.
* Submit customer orders.
* Select category, quantity, batch, and pickup preference.
* Upload supporting documents if required.
* View own submitted orders.
* See order status.
* Request transfer, cancellation, or change if allowed.
* Receive confirmation result.

---

## 4.4 Sales Manager / Approver

Permissions:

* View orders from assigned Sales Team.
* Approve priority exceptions.
* Approve large quantity orders.
* Approve customer replacement or order transfer.
* Confirm final allocation if required.
* View team reports.

---

## 4.5 Operations / Supply Team

Example: GP2 or farm operation team.

Permissions:

* Update available quantity.
* Confirm final stock.
* Assign pickup schedule.
* Mark pickup status.
* Update supply shortage.
* Confirm actual fulfilled quantity.

---

## 4.6 Finance User

Permissions:

* View deposit status.
* Confirm payment or deposit.
* Mark deposit as paid.
* Mark refund status, if refund is allowed for future event types.
* Confirm non-refundable deposit status.
* Export finance report.
* Verify final support amount.

---

## 4.7 Viewer / Auditor

Permissions:

* Read-only access.
* View event setup.
* View orders.
* View allocation.
* View changes and audit trail.
* Export if permission granted.

---

# 5. Main Modules Required

## 5.1 Event Dashboard

The dashboard should show all Hot Sales events.

### Required Dashboard Information

| Field                    | Description                                                                              |
| ------------------------ | ---------------------------------------------------------------------------------------- |
| Event name               | Name of the Hot Sales event                                                              |
| Event status             | Draft, Scheduled, Open, Closed, Allocating, Confirmed, Fulfillment, Completed, Cancelled |
| Start time               | When ordering opens                                                                      |
| Closing time             | When ordering closes                                                                     |
| Time remaining           | Countdown timer                                                                          |
| Product source           | Example: GP2                                                                             |
| Total available quantity | Based on supply confirmation                                                             |
| Total ordered quantity   | Total demand submitted                                                                   |
| Total confirmed quantity | Final allocated quantity                                                                 |
| Total fulfilled quantity | Actually picked up or delivered                                                          |
| Program support amount   | Example: VND100,000 per piglet                                                           |
| Created by               | Event creator                                                                            |
| Last updated             | Latest update timestamp                                                                  |

### Event Status Flow

```text
Draft
→ Scheduled
→ Open
→ Closed
→ Allocating
→ Confirmed
→ Fulfillment
→ Completed
```

Alternative flow:

```text
Draft
→ Cancelled
```

---

# 6. Event Setup Requirement

Client Admin should be able to create an event through a setup wizard.

## 6.1 Basic Event Information

Required fields:

| Field                 |                      Type | Required |
| --------------------- | ------------------------: | -------: |
| Event name            |                      Text |      Yes |
| Event code            | Auto-generated / editable |      Yes |
| Event description     |                 Long text | Optional |
| Event type            |                  Dropdown |      Yes |
| Sales channel         |   Dropdown / multi-select | Optional |
| Eligible team         |   Dropdown / multi-select |      Yes |
| Event owner           |             User selector |      Yes |
| Start date and time   |                 Date-time |      Yes |
| Closing date and time |                 Date-time |      Yes |
| Timezone              |                  Dropdown |      Yes |
| Event status          |          System generated |      Yes |

Example event type values:

* Hot Sales.
* Spot-Selling.
* Flash Sales.
* Clearance Sales.
* Priority Allocation.
* Limited Supply Sales.
* Special Support Program.

---

## 6.2 Ordering Window

The system must support a very short ordering window.

Example:

> Event opens at 3:00 PM and closes at 8:30 PM on the same day.

Required functions:

* Admin can define event opening time.
* Admin can define event closing time.
* System shows countdown timer.
* System automatically blocks order submission after closing time.
* System records server timestamp for every order.
* Late orders are not eligible unless Admin override is enabled.
* If Admin override is used, system must require reason and record audit log.

---

# 7. Product and Category Setup

The event should support multiple product categories.

For the current example, product categories are:

| Batch     | Weight Category |
| --------- | --------------- |
| July      | 8kg, 10kg, 15kg |
| August    | 8kg, 10kg, 15kg |
| September | 8kg, 10kg, 15kg |

But the system should be generic and allow Admin to define any category.

## 7.1 Required Product Fields

| Field                   |            Type | Required |
| ----------------------- | --------------: | -------: |
| Product name            |            Text |      Yes |
| Product code            |            Text | Optional |
| Product source          | Text / dropdown |      Yes |
| Batch / period          | Text / dropdown | Optional |
| Category                | Text / dropdown |      Yes |
| Sub-category            | Text / dropdown | Optional |
| Unit                    |        Dropdown |      Yes |
| Expected weight         |   Number / text | Optional |
| Available quantity      |          Number |      Yes |
| Minimum order quantity  |          Number | Optional |
| Maximum order quantity  |          Number | Optional |
| Unit price              |        Currency | Optional |
| Support amount per unit |        Currency | Optional |
| Pickup location         | Text / dropdown | Optional |
| Remarks                 |       Long text | Optional |

Possible unit values:

* Piglet.
* Head.
* Kg.
* Bag.
* Box.
* Ton.
* Liter.
* Piece.
* Carton.
* Custom.

---

# 8. Quantity and Supply Control

## 8.1 Supply Quantity Rule

The system must allow Admin or Operations to input tentative and final quantity.

Required quantity fields:

| Field                    | Description                              |
| ------------------------ | ---------------------------------------- |
| Tentative quantity       | Planning quantity, not guaranteed        |
| Final confirmed quantity | Quantity confirmed by supply team        |
| Reserved quantity        | Quantity reserved by registered orders   |
| Allocated quantity       | Quantity confirmed to customers          |
| Fulfilled quantity       | Quantity actually picked up or delivered |
| Balance quantity         | Remaining available quantity             |

## 8.2 Important Business Rule

The system must support this rule:

> Final available quantity may be lower than the tentative quantity, but cannot exceed the quantity confirmed by the supply team.

Example:

| Item                       |           Quantity |
| -------------------------- | -----------------: |
| Tentative supply           | 1,400 piglets/week |
| GP2 final confirmed supply | 1,250 piglets/week |
| Maximum allocation allowed | 1,250 piglets/week |

The system should prevent confirmed allocation above final confirmed supply unless Super Admin override is allowed.

---

# 9. Customer Priority Setup

The system must support **Customer Priority Order**.

Client Admin should be able to upload or maintain a priority customer list.

## 9.1 Customer Priority Fields

| Field              | Type          |
| ------------------ | ------------- |
| Customer name      | Text          |
| Customer code      | Text          |
| Priority rank      | Number        |
| Priority group     | Dropdown      |
| Salesperson        | User selector |
| Region             | Dropdown      |
| Maximum allocation | Number        |
| Remarks            | Text          |

Example priority groups:

| Priority Group | Meaning               |
| -------------- | --------------------- |
| P1             | Strategic customer    |
| P2             | Important customer    |
| P3             | Regular customer      |
| P4             | Non-priority customer |

---

# 10. Allocation Logic

The system must support the following allocation rule:

## **Customer Priority Order + First-Come-First-Serve**

### Allocation Logic

1. Only eligible orders are considered.
2. Order must be submitted before event closing time.
3. Order must be officially registered.
4. Order must pass validation.
5. Customer priority is checked.
6. Higher priority customers are allocated first.
7. Within the same priority level, earlier registered orders are allocated first.
8. Allocation cannot exceed final confirmed supply.
9. If supply is insufficient, system can support partial allocation.
10. Admin can manually adjust allocation if permission is granted.
11. All manual adjustments must require reason and be logged.

### Example Allocation

| Order | Customer   | Priority | Order Time | Requested Qty | Allocation Result |
| ----- | ---------- | -------: | ---------- | ------------: | ----------------: |
| O001  | Customer A |       P1 | 15:05      |           300 |               300 |
| O002  | Customer B |       P1 | 15:20      |           500 |               500 |
| O003  | Customer C |       P2 | 15:10      |           700 |               450 |
| O004  | Customer D |       P3 | 15:00      |           200 |                 0 |

If total supply is 1,250:

* P1 orders are allocated first.
* Then P2 orders.
* Within each priority group, earlier order time comes first.
* Lower priority orders may receive partial or zero allocation if supply is exhausted.

---

# 11. Order Registration

Sales User must be able to submit order through a web form.

## 11.1 Required Order Form Fields

| Field                 |                   Type |                 Required |
| --------------------- | ---------------------: | -----------------------: |
| Event name            |            Auto-filled |                      Yes |
| Salesperson           |            Auto-filled |                      Yes |
| Customer name         | Text / customer lookup |                      Yes |
| Customer code         | Text / customer lookup | Optional but recommended |
| Customer priority     | Auto-filled / selected |                 Optional |
| Product category      |               Dropdown |                      Yes |
| Batch / period        |               Dropdown |                      Yes |
| Weight category       |               Dropdown |                      Yes |
| Requested quantity    |                 Number |                      Yes |
| Pickup location       | Auto-filled / dropdown |                 Optional |
| Preferred pickup date |                   Date |                 Optional |
| Deposit required      |               Yes / No |                 Optional |
| Deposit amount        |               Currency |                 Optional |
| Deposit status        |               Dropdown |                 Optional |
| Attachment            |            File upload |                 Optional |
| Remarks               |              Long text |                 Optional |

## 11.2 System-Generated Order Fields

| Field              | Description                         |
| ------------------ | ----------------------------------- |
| Order ID           | Auto-generated                      |
| Event ID           | Linked to event                     |
| Order timestamp    | Server timestamp                    |
| Order status       | System-generated                    |
| Eligibility status | Eligible / not eligible             |
| Allocation status  | Pending / partial / full / rejected |
| Confirmed quantity | Final approved quantity             |
| Support amount     | Confirmed quantity × support amount |
| Created by         | Sales user                          |
| Last updated by    | User                                |
| Last updated time  | Timestamp                           |

---

# 12. Order Status Flow

The system should support this order lifecycle:

```text
Draft
→ Submitted
→ Registered
→ Pending Allocation
→ Partially Allocated / Fully Allocated / Rejected
→ Confirmed
→ Deposit Confirmed
→ Ready for Pickup
→ Picked Up
→ Completed
```

Alternative flows:

```text
Submitted
→ Cancelled
```

```text
Confirmed
→ Transfer Requested
→ Transfer Approved
→ Confirmed under New Customer
```

```text
Ready for Pickup
→ No-Show
→ Reallocated / Cancelled
```

---

# 13. Deposit Requirement

The system must support deposit management.

For the current Hot Sales case:

> Order is transferable, but deposit paid is non-refundable.

## 13.1 Deposit Fields

| Field                     | Type                                                    |
| ------------------------- | ------------------------------------------------------- |
| Deposit required          | Yes / No                                                |
| Deposit amount            | Currency                                                |
| Deposit paid date         | Date-time                                               |
| Deposit payment reference | Text                                                    |
| Deposit status            | Pending / Paid / Waived / Failed                        |
| Deposit refund status     | Non-refundable / Refundable / Refunded / Not applicable |
| Finance confirmation      | User and timestamp                                      |
| Attachment                | Payment proof                                           |

## 13.2 Deposit Business Rule

For this event type:

* Deposit paid is non-refundable.
* If order is cancelled, deposit is not refunded.
* If customer does not pick up, deposit is not refunded.
* If order is transferred, deposit remains attached to the order unless Finance/Admin updates it.
* Refund exception requires management approval and audit reason.

---

# 14. Order Transfer Requirement

The system must allow confirmed orders to be transferred.

## 14.1 Transfer Function

Sales User or Admin can request order transfer.

Required transfer fields:

| Field               |                          Type | Required |
| ------------------- | ----------------------------: | -------: |
| Original order ID   |                   Auto-filled |      Yes |
| Original customer   |                   Auto-filled |      Yes |
| New customer name   |        Text / customer lookup |      Yes |
| New customer code   |        Text / customer lookup | Optional |
| Transfer quantity   |                        Number |      Yes |
| Reason for transfer |                     Long text |      Yes |
| Deposit handling    |                      Dropdown |      Yes |
| Approval status     | Pending / Approved / Rejected |      Yes |
| Approved by         |                          User |   System |
| Approved time       |                     Timestamp |   System |

## 14.2 Transfer Business Rule

* Order can be transferred only if event setting allows transfer.
* Transfer requires approval.
* Transfer must be recorded in audit log.
* Deposit paid is non-refundable.
* Transferred order keeps original registration timestamp unless Admin chooses otherwise.
* Original and new customer history must be visible.

---

# 15. Program Support / Benefit Calculation

The system must support flexible benefit configuration.

For the current case:

> VND100,000 per piglet.

## 15.1 Support Configuration

| Field                      | Example                               |
| -------------------------- | ------------------------------------- |
| Support type               | Fixed amount per unit                 |
| Support amount             | VND100,000                            |
| Support unit               | Per piglet                            |
| Applied to                 | Confirmed and completed quantity only |
| Combination rule           | Standalone, cannot combine            |
| Affect routine policy?     | No                                    |
| Affect rebate / incentive? | No                                    |
| Trade-off allowed?         | No                                    |

## 15.2 Calculation Rule

```text
Final Support Amount = Completed Quantity × Support Amount per Unit
```

Example:

| Confirmed Quantity | Completed Quantity | Support / Unit | Final Support |
| -----------------: | -----------------: | -------------: | ------------: |
|                300 |                300 |     VND100,000 | VND30,000,000 |
|                300 |                250 |     VND100,000 | VND25,000,000 |
|                300 |                  0 |     VND100,000 |          VND0 |

Support should be calculated only after order is completed, picked up, or fulfilled.

---

# 16. Standalone Program Rule

The system must allow Admin to configure whether an event is standalone or combinable.

For this event, the rule is:

> This Hot Sales program is standalone and will not be affected by other routine policies, trade-offs, rebates, incentives, promotions, or existing programs.

## Required Settings

| Setting                             | Value                         |
| ----------------------------------- | ----------------------------- |
| Can combine with other program?     | No                            |
| Can affect routine policy?          | No                            |
| Can offset rebate?                  | No                            |
| Can use as trade-off?               | No                            |
| Can create future policy precedent? | No                            |
| Exception allowed?                  | Only with management approval |

---

# 17. Pickup / Fulfillment Requirement

The system must support pickup arrangement.

## 17.1 Pickup Fields

| Field                     | Type                                              |
| ------------------------- | ------------------------------------------------- |
| Pickup location           | Text / dropdown                                   |
| Pickup batch              | July / August / September, or custom              |
| Pickup date               | Date                                              |
| Pickup time slot          | Text / dropdown                                   |
| Pickup quantity           | Number                                            |
| Transport arrangement     | Customer / company / third party                  |
| Pickup status             | Pending / Ready / Picked up / No-show / Cancelled |
| Actual fulfilled quantity | Number                                            |
| Fulfillment confirmed by  | User                                              |
| Fulfillment timestamp     | Date-time                                         |
| Remarks                   | Long text                                         |

## 17.2 Fulfillment Rule

Only fulfilled quantity should be eligible for final support calculation.

Example:

| Confirmed Qty | Picked Up Qty | Eligible Support Qty |
| ------------: | ------------: | -------------------: |
|           500 |           500 |                  500 |
|           500 |           450 |                  450 |
|           500 |             0 |                    0 |

---

# 18. Self-Service Custom Column Requirement

This is one of the most important requirements.

Client Admin must be able to add, edit, hide, reorder, and require extra columns without developer support.

## 18.1 Custom Field Types

The system should support these custom field types:

| Field Type    | Example                          |
| ------------- | -------------------------------- |
| Text          | Farm note, customer remark       |
| Number        | Truck capacity, cage count       |
| Currency      | Deposit amount, support amount   |
| Date          | Pickup date, payment date        |
| Date-time     | Registration deadline            |
| Dropdown      | Priority group, payment status   |
| Multi-select  | Eligible regions                 |
| Yes / No      | Deposit paid?                    |
| File upload   | Payment proof                    |
| User selector | Salesperson, approver            |
| Formula       | Support amount = quantity × rate |
| Long text     | Special instruction              |

## 18.2 Custom Field Settings

For each custom field, Admin should be able to configure:

| Setting              | Description                      |
| -------------------- | -------------------------------- |
| Field name           | Name shown to users              |
| Field type           | Text, number, dropdown, etc.     |
| Required or optional | Whether user must fill it        |
| Default value        | Pre-filled value                 |
| Help text            | Explanation to user              |
| Display order        | Column position                  |
| Visible to roles     | Sales, Admin, Finance, Operation |
| Editable by roles    | Who can edit                     |
| Used in report       | Yes / No                         |
| Used in allocation   | Yes / No                         |
| Active / inactive    | Hide without deleting            |

---

# 19. Import and Export Requirement

The system must support Excel import/export.

## 19.1 Import Functions

Admin should be able to import:

* Customer list.
* Customer priority list.
* Product categories.
* Supply quantity.
* Order list.
* Deposit confirmation.
* Pickup confirmation.

## 19.2 Export Reports

Admin should be able to export:

* Event summary.
* Order list.
* Allocation result.
* Customer priority list.
* Deposit status.
* Pickup status.
* Final support amount.
* Audit log.
* Exception report.

Export format:

* Excel.
* CSV.
* PDF summary, optional.

---

# 20. Notification Requirement

The system should send notifications for important events.

## 20.1 Notification Events

| Trigger                      | Recipient               |
| ---------------------------- | ----------------------- |
| Event opened                 | Sales Team              |
| Event closing soon           | Sales Team              |
| Event closed                 | Admin, Sales Team       |
| Order submitted              | Salesperson, Admin      |
| Order allocated              | Salesperson             |
| Order rejected               | Salesperson             |
| Deposit confirmed            | Salesperson, Finance    |
| Transfer requested           | Approver                |
| Transfer approved / rejected | Salesperson             |
| Pickup scheduled             | Salesperson, Operations |
| Pickup completed             | Salesperson, Finance    |
| Event completed              | Admin, Management       |

Notification channels:

* In-system notification.
* Email.
* ERP notification.
* Optional: Zalo, WhatsApp, Microsoft Teams, or Telegram if integrated later.

---

# 21. Audit Log Requirement

Every important action must be logged.

## 21.1 Audit Log Must Capture

| Field            | Description                                  |
| ---------------- | -------------------------------------------- |
| Action           | Created, edited, deleted, approved, rejected |
| User             | Who performed the action                     |
| Role             | User role                                    |
| Timestamp        | Server time                                  |
| Old value        | Previous data                                |
| New value        | Updated data                                 |
| Reason           | Required for override                        |
| IP / device      | Optional                                     |
| Related order ID | If applicable                                |
| Related event ID | If applicable                                |

Actions that must always be logged:

* Event creation.
* Event opening.
* Event closing.
* Deadline change.
* Quantity change.
* Manual allocation adjustment.
* Order transfer.
* Deposit update.
* Cancellation.
* Support amount change.
* Admin override.
* Permission change.

---

# 22. Permission and Access Control

The system must have role-based access control.

## 22.1 Permission Matrix

| Function          | Super Admin | Client Admin | Sales | Sales Manager |   Operation |      Finance |   Viewer |
| ----------------- | ----------: | -----------: | ----: | ------------: | ----------: | -----------: | -------: |
| Create event      |         Yes |          Yes |    No |            No |          No |           No |       No |
| Edit event        |         Yes |          Yes |    No |       Limited |          No |           No |       No |
| Submit order      |         Yes |          Yes |   Yes |           Yes |          No |           No |       No |
| View all orders   |         Yes |          Yes |    No |     Team only | Supply only | Finance only |      Yes |
| Allocate quantity |         Yes |          Yes |    No |  Approve only |          No |           No |       No |
| Confirm supply    |         Yes |      Limited |    No |            No |         Yes |           No |       No |
| Confirm deposit   |         Yes |      Limited |    No |            No |          No |          Yes |       No |
| Approve transfer  |         Yes |          Yes |    No |           Yes |          No |           No |       No |
| Export report     |         Yes |          Yes |    No |       Limited |     Limited |          Yes | Optional |
| View audit log    |         Yes |          Yes |    No |      Optional |          No |     Optional |      Yes |

---

# 23. ERP Integration Requirement

The Hot Sales website should be designed as an ERP branch service.

## 23.1 Integration Points

The system should be able to connect with ERP for:

| ERP Data                    | Direction                                  |
| --------------------------- | ------------------------------------------ |
| User accounts               | ERP → Hot Sales                            |
| Sales team structure        | ERP → Hot Sales                            |
| Customer master data        | ERP → Hot Sales                            |
| Customer priority           | ERP → Hot Sales or maintained in Hot Sales |
| Product master data         | ERP → Hot Sales                            |
| Inventory / supply quantity | ERP / Operation → Hot Sales                |
| Sales order creation        | Hot Sales → ERP                            |
| Deposit / payment status    | ERP / Finance → Hot Sales                  |
| Invoice / billing           | ERP → Hot Sales                            |
| Fulfillment status          | ERP / Operation → Hot Sales                |
| Final support amount        | Hot Sales → ERP / Finance                  |

## 23.2 API Requirement

The system should expose or prepare APIs for:

```text
GET /events
POST /events
GET /events/{eventId}
PUT /events/{eventId}

POST /events/{eventId}/open
POST /events/{eventId}/close

GET /events/{eventId}/products
POST /events/{eventId}/products

GET /events/{eventId}/orders
POST /events/{eventId}/orders
PUT /orders/{orderId}

POST /events/{eventId}/allocate
GET /events/{eventId}/allocation-result

POST /orders/{orderId}/transfer
POST /orders/{orderId}/cancel

POST /orders/{orderId}/deposit
POST /orders/{orderId}/pickup

GET /events/{eventId}/reports
GET /events/{eventId}/audit-log
```

---

# 24. Data Model Requirement

## 24.1 Event Table

| Field               | Type      |
| ------------------- | --------- |
| event_id            | UUID      |
| event_code          | Text      |
| event_name          | Text      |
| event_type          | Text      |
| description         | Text      |
| start_time          | Date-time |
| closing_time        | Date-time |
| timezone            | Text      |
| status              | Text      |
| source_location     | Text      |
| allocation_method   | Text      |
| standalone_program  | Boolean   |
| combination_allowed | Boolean   |
| transfer_allowed    | Boolean   |
| deposit_required    | Boolean   |
| deposit_refundable  | Boolean   |
| created_by          | User ID   |
| created_at          | Date-time |
| updated_by          | User ID   |
| updated_at          | Date-time |

---

## 24.2 Product Category Table

| Field                    | Type     |
| ------------------------ | -------- |
| product_category_id      | UUID     |
| event_id                 | UUID     |
| product_name             | Text     |
| product_code             | Text     |
| source                   | Text     |
| batch                    | Text     |
| category                 | Text     |
| weight                   | Text     |
| unit                     | Text     |
| tentative_quantity       | Number   |
| final_confirmed_quantity | Number   |
| allocated_quantity       | Number   |
| fulfilled_quantity       | Number   |
| support_amount_per_unit  | Currency |
| pickup_location          | Text     |
| status                   | Text     |

---

## 24.3 Order Table

| Field               | Type        |
| ------------------- | ----------- |
| order_id            | UUID        |
| event_id            | UUID        |
| order_number        | Text        |
| salesperson_id      | User ID     |
| customer_id         | Customer ID |
| customer_name       | Text        |
| customer_code       | Text        |
| priority_rank       | Number      |
| priority_group      | Text        |
| product_category_id | UUID        |
| requested_quantity  | Number      |
| confirmed_quantity  | Number      |
| fulfilled_quantity  | Number      |
| support_amount      | Currency    |
| order_timestamp     | Date-time   |
| status              | Text        |
| eligibility_status  | Text        |
| deposit_status      | Text        |
| transfer_status     | Text        |
| pickup_status       | Text        |
| remarks             | Text        |

---

## 24.4 Deposit Table

| Field             | Type      |
| ----------------- | --------- |
| deposit_id        | UUID      |
| order_id          | UUID      |
| deposit_required  | Boolean   |
| deposit_amount    | Currency  |
| deposit_status    | Text      |
| payment_reference | Text      |
| payment_date      | Date-time |
| confirmed_by      | User ID   |
| confirmed_at      | Date-time |
| refundable        | Boolean   |
| refund_status     | Text      |
| attachment_url    | Text      |

---

## 24.5 Transfer Table

| Field                | Type        |
| -------------------- | ----------- |
| transfer_id          | UUID        |
| order_id             | UUID        |
| original_customer_id | Customer ID |
| new_customer_id      | Customer ID |
| transfer_quantity    | Number      |
| reason               | Text        |
| status               | Text        |
| requested_by         | User ID     |
| requested_at         | Date-time   |
| approved_by          | User ID     |
| approved_at          | Date-time   |

---

## 24.6 Custom Field Table

| Field             | Type                                        |
| ----------------- | ------------------------------------------- |
| custom_field_id   | UUID                                        |
| event_id          | UUID                                        |
| entity_type       | Event / Product / Order / Customer / Pickup |
| field_name        | Text                                        |
| field_type        | Text                                        |
| required          | Boolean                                     |
| default_value     | Text                                        |
| dropdown_options  | JSON                                        |
| visible_to_roles  | JSON                                        |
| editable_by_roles | JSON                                        |
| display_order     | Number                                      |
| active            | Boolean                                     |

---

# 25. Reports Required

## 25.1 Event Summary Report

Shows:

* Event name.
* Event period.
* Total supply.
* Total requested quantity.
* Total confirmed quantity.
* Total fulfilled quantity.
* Remaining quantity.
* Total support amount.
* Number of customers.
* Number of orders.
* Deposit collected.
* No-show quantity.
* Cancelled quantity.

---

## 25.2 Order Detail Report

Shows:

* Order ID.
* Salesperson.
* Customer.
* Priority group.
* Product category.
* Requested quantity.
* Confirmed quantity.
* Fulfilled quantity.
* Deposit status.
* Pickup status.
* Support amount.
* Final status.

---

## 25.3 Allocation Report

Shows:

* Customer ranking.
* Registration time.
* Requested quantity.
* Confirmed quantity.
* Allocation reason.
* Partial allocation reason.
* Rejected reason.

---

## 25.4 Finance Report

Shows:

* Customer.
* Deposit amount.
* Deposit status.
* Non-refundable status.
* Final support amount.
* Payment reference.
* Finance confirmation.

---

# 26. MVP Scope

For the first version, the system should include:

## Must Have

* Login and role-based access.
* Event creation.
* Event open and close time.
* Product category setup.
* Supply quantity setup.
* Customer priority setup.
* Sales order submission.
* Server timestamp.
* Auto-close after deadline.
* First-come-first-serve allocation with customer priority.
* Manual allocation adjustment with audit reason.
* Deposit status.
* Transfer request and approval.
* Pickup status.
* Support amount calculation.
* Custom columns.
* Excel import/export.
* Event summary report.
* Audit log.

## Nice to Have

* ERP API integration.
* Notification through email or messaging app.
* Customer portal.
* Mobile-friendly sales form.
* Approval workflow builder.
* Formula-based custom fields.
* PDF announcement generator.
* Dashboard charts.
* Multi-language interface.

---

# 27. Acceptance Criteria

The build is acceptable when the following conditions are met:

## Event Setup

* Admin can create a new Hot Sales event without developer support.
* Admin can define opening time and closing time.
* Admin can configure product categories.
* Admin can configure supply quantity.
* Admin can configure support amount.
* Admin can configure standalone program rule.
* Admin can add custom columns.

## Order Submission

* Sales can submit orders only during the active ordering window.
* System blocks late orders after closing time.
* System records server timestamp.
* System validates required fields.
* Sales can view their own submitted orders.

## Allocation

* System can allocate based on customer priority first.
* Within the same priority level, system allocates based on first registration time.
* System does not allocate more than final confirmed supply.
* System supports partial allocation.
* Admin can manually adjust allocation with mandatory reason.

## Deposit

* System can record deposit paid status.
* System can mark deposit as non-refundable.
* System keeps deposit history.
* Finance can confirm deposit.

## Transfer

* Order can be transferred if event setting allows it.
* Transfer requires approval.
* Transfer history is visible.
* Deposit remains non-refundable.

## Fulfillment

* Operation can update pickup status.
* System records fulfilled quantity.
* Final support is calculated based on completed quantity.

## Reporting

* Admin can export order list.
* Admin can export allocation result.
* Admin can export support amount report.
* Admin can view audit log.

---

# 28. Example Event Configuration for Current Piglet Hot Sales

## Event Name

**GP2 Piglet Hot Sales — July to September 2026**

## Event Rule

| Item                            | Setting                                    |
| ------------------------------- | ------------------------------------------ |
| Event type                      | Hot Sales / Spot-Selling                   |
| Eligible users                  | Sales Team only                            |
| Source                          | GP2                                        |
| Ordering deadline               | 8:30 PM, 09 July 2026, Vietnam time        |
| Ordering window                 | Only a few hours                           |
| Support                         | VND100,000 per piglet                      |
| Program nature                  | Standalone                                 |
| Combination with other programs | Not allowed                                |
| Quantity                        | Tentatively 1,400 piglets/week             |
| Final quantity                  | Subject to GP2 confirmation                |
| Allocation                      | Customer priority + first-come-first-serve |
| Categories                      | July, August, September                    |
| Weight                          | 8kg, 10kg, 15kg                            |
| Transfer                        | Allowed with approval                      |
| Deposit                         | Non-refundable                             |
| Pickup                          | From GP2 based on confirmed schedule       |
| Final eligibility               | Confirmed and completed orders only        |

---

# 29. Suggested Prompt for Vibe Coding

You can copy and paste this into your vibe-coding tool:

```text
Build a reusable Hot Sales Event web application as a branch service from our ERP.

The application must allow business admins to create short-window sales events, configure product categories, define available quantity, set customer priority rules, collect sales orders, allocate limited stock, track deposits, allow approved order transfers, manage pickup/fulfillment, calculate support amount, and export reports.

The system must be generic and reusable for future events, not hardcoded for one product.

Core features:
1. Role-based login: Super Admin, Client Admin, Sales User, Sales Manager, Operation, Finance, Viewer.
2. Event setup wizard with event name, type, start time, closing time, timezone, eligible team, product source, and status.
3. Product/category setup supporting batch, period, product name, source, weight/category, unit, tentative quantity, final confirmed quantity, support amount per unit, and pickup location.
4. Short ordering window support with countdown timer and automatic closing. Orders after closing time must be blocked.
5. Sales order submission form with customer name/code, salesperson, priority group, product category, requested quantity, deposit status, pickup preference, attachment, and remarks.
6. Server timestamp for every order.
7. Customer priority setup with priority rank/group.
8. Allocation engine using customer priority first, then first-come-first-serve based on order timestamp.
9. Prevent allocation above final confirmed supply.
10. Support partial allocation.
11. Allow Admin manual allocation adjustment with mandatory reason and audit log.
12. Deposit module with deposit required, deposit amount, deposit status, payment reference, finance confirmation, and non-refundable setting.
13. Order transfer module where confirmed orders can be transferred to another customer with approval. Deposit remains non-refundable.
14. Pickup/fulfillment module with pickup location, schedule, status, fulfilled quantity, and operation confirmation.
15. Support calculation: final support amount = completed quantity × support amount per unit.
16. Standalone program setting: event benefit cannot combine with other programs, routine policy, rebate, incentive, or trade-off unless approved.
17. Client Admin must be able to add custom columns/fields without developer support. Support text, number, currency, date, dropdown, yes/no, file upload, user selector, long text, and formula fields.
18. Excel import/export for customer priority, product categories, supply quantity, orders, deposits, pickup, allocation, and reports.
19. Reports: event summary, order detail, allocation result, finance report, pickup report, support amount report, and audit log.
20. Full audit log for event changes, deadline changes, quantity changes, allocation changes, deposit updates, transfers, cancellations, and overrides.

Use a clean admin dashboard UI. The website should be mobile-friendly for Sales users and desktop-friendly for Admin, Finance, and Operation users.

Create database tables for events, product categories, orders, deposits, transfers, custom fields, pickup records, customer priority, users, roles, and audit logs.

Prepare API endpoints so this service can later integrate with ERP customer master, product master, user master, inventory, finance, and sales order modules.
```

---

# 30. Final Build Direction

The key idea is:

## Do not build a one-time piglet sales page.

Build a reusable **Hot Sales Event Engine**.

That engine should allow the company to create many future campaigns by changing:

* Event name.
* Deadline.
* Product.
* Source.
* Quantity.
* Category.
* Support amount.
* Allocation method.
* Customer priority.
* Deposit rule.
* Transfer rule.
* Pickup rule.
* Custom columns.

This will make the service reusable, scalable, and easy for Client Admin to operate without asking IT to rebuild the logic every time.
