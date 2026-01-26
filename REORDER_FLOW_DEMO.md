# IMRAS Reorder Flow - Practical Demonstration Example

## Overview
This document provides a complete practical example of the IMRAS reorder flow for presentation purposes.

## Scenario: Low Stock Alert to Purchase Order

### Initial Situation
**Item:** Paracetamol 500mg Tablets  
**SKU:** MED-001  
**Current Stock:** 50 units  
**Reorder Point:** 100 units  
**Safety Stock:** 30 units  
**Max Stock:** 500 units  
**Status:** ⚠️ Below Reorder Point

---

## Step-by-Step Flow

### 1️⃣ **Automatic Stock Monitoring**
The system continuously monitors stock levels through the Stock Ledger.

```javascript
// Automated check runs every hour
Current Stock (50) <= Reorder Point (100) ✓
→ Trigger: Create Reorder Alert
```

**Result:**
- Alert #1234 created
- Type: "Reorder"
- Severity: "Medium" (stock > safety stock)
- Assigned to: Manager
- Recommended Order Qty: 450 units (to reach max stock)

---

### 2️⃣ **Alert Notification**
Manager receives notification about low stock item.

**Alert Details:**
```
Alert ID: 1234
Item: Paracetamol 500mg Tablets (MED-001)
Current Stock: 50 units
Reorder Point: 100 units
Recommended Order: 450 units
Days Pending: 0
```

---

### 3️⃣ **Create Purchase Requisition (PR)**
Manager creates a PR from the alert.

**PR Creation:**
```json
{
  "pr_number": "PR202600001",
  "pr_date": "2026-01-26",
  "status": "Pending",
  "requested_by": "John Manager",
  "items": [
    {
      "item_id": 1,
      "item_name": "Paracetamol 500mg Tablets",
      "requested_qty": 450,
      "justification": "Stock below reorder point. Current: 50, Reorder Point: 100"
    }
  ],
  "estimated_value": "$2,250.00"
}
```

**System Actions:**
- ✓ PR created with unique number
- ✓ Alert marked as read
- ✓ Email notification sent to requester
- ✓ PR status: "Pending" (awaiting approval)

---

### 4️⃣ **PR Approval**
Senior Manager/Admin reviews and approves the PR.

**Approval Process:**
```json
{
  "pr_id": 1,
  "pr_number": "PR202600001",
  "approved_by": "Sarah Admin",
  "approved_date": "2026-01-26",
  "approval_remarks": "Approved - Stock critically low",
  "status": "Approved"
}
```

**System Actions:**
- ✓ PR status changed to "Approved"
- ✓ Approval timestamp recorded
- ✓ Email notification sent to requester
- ✓ PR ready for PO conversion

---

### 5️⃣ **Convert PR to Purchase Order (PO)**

**CRITICAL STEP - PR to PO Conversion**

This is where the potential issue occurs. Let's verify the logic:

**Prerequisites Check:**
```javascript
✓ PR exists and is approved
✓ Supplier is active
✓ No existing PO for this PR
✓ Items have pricing information
✓ Expected delivery date is valid
```

**PO Creation:**
```json
{
  "po_number": "PO202600001",
  "po_date": "2026-01-26",
  "pr_id": 1,
  "supplier_id": 5,
  "supplier_name": "MediSupply Ltd.",
  "status": "Issued",
  "expected_delivery_date": "2026-02-02",
  "items": [
    {
      "item_id": 1,
      "item_name": "Paracetamol 500mg Tablets",
      "ordered_qty": 450,
      "unit_price": "$5.00",
      "total_price": "$2,250.00"
    }
  ],
  "total_amount": "$2,250.00"
}
```

**System Actions:**
- ✓ PO created with unique number
- ✓ PO linked to PR (pr_id stored)
- ✓ Items copied from PR to PO
- ✓ Pricing fetched from Supplier-Item table
- ✓ Total amount calculated
- ✓ Email notification sent to supplier

---

### 6️⃣ **PO Status Tracking**
The PO is now in the system and can be tracked.

**PO Status:**
```
PO Number: PO202600001
Status: Issued
Completion: 0%
Days Since Created: 0
Days Until Expected Delivery: 7

Items Status:
- Paracetamol 500mg Tablets
  Ordered: 450 | Received: 0 | Pending: 450
```

---

## Common Issues in PR to PO Conversion

### Issue 1: Missing Supplier
**Problem:** No active supplier available  
**Solution:** Ensure at least one supplier is active in the system

### Issue 2: Missing Pricing
**Problem:** No pricing information for item-supplier combination  
**Solution:** System falls back to item's base unit_price

### Issue 3: Invalid Delivery Date
**Problem:** Expected delivery date is in the past  
**Solution:** Validation ensures date is today or future

### Issue 4: PR Already Has PO
**Problem:** Attempting to create duplicate PO for same PR  
**Solution:** System checks for existing PO before creation

### Issue 5: PR Not Approved
**Problem:** Attempting to create PO from pending/rejected PR  
**Solution:** System validates PR status is "Approved"

---

## Database Relationships

```
Alert (item_id) → Item
    ↓
Purchase Requisition (pr_id)
    ├─ PRItem (pr_id, item_id) → Item
    └─ pr_id stored
         ↓
Purchase Order (po_id, pr_id)
    ├─ POItem (po_id, item_id) → Item
    └─ Supplier (supplier_id)
         ↓
Goods Receipt Note (grn_id, po_id)
    └─ GRNItem (grn_id, item_id) → Item
         ↓
Stock Ledger (item_id, warehouse_id)
```

---

## Verification Checklist

Before demonstrating the flow, verify:

- [ ] Database is connected and accessible
- [ ] At least one item has stock below reorder point
- [ ] At least one active supplier exists
- [ ] Manager/Admin user account exists
- [ ] Email notifications are configured (optional)
- [ ] Stock Ledger has accurate data

---

## Running the Demonstration

### Option 1: Using the Demo Script
```bash
cd backend/scripts
node demo_reorder_flow.js
```

**Update credentials in the script:**
```javascript
email: 'your-manager@email.com',
password: 'your-password'
```

### Option 2: Using the Verification Script
```bash
cd backend/scripts
node verify_pr_to_po.js
```

This will check the system for:
- Approved PRs without POs
- PR-PO relationship integrity
- Supplier availability
- Pricing information
- Common issues

### Option 3: Manual API Testing

**Step 1: Login**
```bash
POST /api/auth/login
{
  "email": "manager@imras.com",
  "password": "manager123"
}
```

**Step 2: Check Reorder Points**
```bash
POST /api/reorder/check-reorder-points
Authorization: Bearer <token>
```

**Step 3: Get Alerts**
```bash
GET /api/reorder/alerts?is_read=false
Authorization: Bearer <token>
```

**Step 4: Create PR**
```bash
POST /api/reorder/purchase-requisitions
Authorization: Bearer <token>
{
  "pr_date": "2026-01-26",
  "remarks": "Demo PR",
  "items": [
    {
      "item_id": 1,
      "requested_qty": 450,
      "justification": "Stock below reorder point"
    }
  ],
  "alert_id": 1234
}
```

**Step 5: Approve PR**
```bash
PUT /api/reorder/purchase-requisitions/{pr_id}/approve
Authorization: Bearer <token>
{
  "approval_remarks": "Approved for demo"
}
```

**Step 6: Create PO from PR**
```bash
POST /api/reorder/purchase-requisitions/{pr_id}/create-po
Authorization: Bearer <token>
{
  "supplier_id": 5,
  "expected_delivery_date": "2026-02-02"
}
```

**Step 7: Check PO Status**
```bash
GET /api/reorder/purchase-orders/{po_id}/status
Authorization: Bearer <token>
```

---

## Expected Results

### Successful Flow
```
✓ Alert created for low stock item
✓ PR created from alert
✓ PR approved by manager
✓ PO created from approved PR
✓ PO linked to PR (pr_id stored)
✓ All items transferred correctly
✓ Pricing calculated accurately
✓ Notifications sent
```

### If PR to PO Conversion Fails

**Check:**
1. PR status is "Approved"
2. Supplier exists and is active
3. No existing PO for this PR
4. Items have pricing (supplier or base price)
5. Expected delivery date is valid
6. Database relationships are intact

---

## Presentation Tips

1. **Start with the problem:** Show item with low stock
2. **Show the alert:** Display the reorder alert in the dashboard
3. **Create PR:** Demonstrate PR creation from alert
4. **Approval workflow:** Show manager approving the PR
5. **PO conversion:** Highlight the PR to PO conversion
6. **Verify:** Show the created PO with all details
7. **Explain benefits:** Automated tracking, audit trail, notifications

---

## Key Metrics to Highlight

- **Automation:** Alerts created automatically when stock is low
- **Efficiency:** One-click PR creation from alerts
- **Accuracy:** Exact quantity recommendations based on min/max stock
- **Traceability:** Complete audit trail from alert → PR → PO
- **Notifications:** Automatic emails at each step
- **Validation:** Multiple checks prevent errors

---

## Troubleshooting

### Database Connection Error
```bash
# Check database configuration
cat backend/config/database.js

# Verify MySQL is running
mysql -u root -p
```

### No Items Below Reorder Point
```sql
-- Manually set an item's stock below reorder point
UPDATE items SET reorder_point = 100 WHERE item_id = 1;

-- Or reduce stock in ledger
INSERT INTO stock_ledgers (item_id, warehouse_id, quantity, transaction_type, reference_type)
VALUES (1, 1, -50, 'Adjustment', 'Manual');
```

### No Active Suppliers
```sql
-- Activate a supplier
UPDATE suppliers SET is_active = 1 WHERE supplier_id = 1;
```

---

## Conclusion

This demonstration shows the complete reorder flow in IMRAS, from automatic low stock detection to purchase order creation. The system ensures:

- ✅ Automated monitoring
- ✅ Timely alerts
- ✅ Structured approval workflow
- ✅ Seamless PR to PO conversion
- ✅ Complete audit trail
- ✅ Accurate inventory management
