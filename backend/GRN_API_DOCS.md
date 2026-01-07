# IMRAS GRN (Goods Receipt Note) API Documentation

## Base URL
```
http://localhost:5000/api/grn
```

## Endpoints

### 1. Get Pending Purchase Orders
**GET** `/api/grn/pending-pos`

**Access:** All authenticated users

**Description:** Get list of Purchase Orders that are ready for goods receipt (status: 'Issued' or 'In-Transit')

**Success Response (200):**
```json
{
  "success": true,
  "message": "Pending POs retrieved successfully",
  "data": [
    {
      "po_id": 1,
      "po_number": "PO2025001",
      "po_date": "2025-01-20",
      "expected_delivery_date": "2025-01-27",
      "supplier": {
        "supplier_id": 1,
        "supplier_name": "Supplier ABC"
      },
      "items": [
        {
          "po_item_id": 1,
          "item_id": 1,
          "item_name": "Basmati Rice 5kg",
          "sku": "RICE-001",
          "ordered_qty": 200,
          "received_qty": 0,
          "pending_qty": 200,
          "unit_price": 450.00
        }
      ]
    }
  ]
}
```

**cURL Example:**
```bash
curl -X GET http://localhost:5000/api/grn/pending-pos \
  -H "Authorization: Bearer <token>"
```

---

### 2. Create GRN
**POST** `/api/grn`

**Access:** Staff and Admin only

**Request Body:**
```json
{
  "po_id": 1,
  "warehouse_id": 1,
  "grn_date": "2025-01-25",
  "remarks": "Received in good condition",
  "items": [
    {
      "item_id": 1,
      "received_qty": 200,
      "accepted_qty": 195,
      "rejected_qty": 5,
      "rejection_reason": "Damaged packaging",
      "batch_number": "BATCH2025001",
      "lot_number": "LOT001",
      "manufacturing_date": "2024-12-01",
      "expiry_date": "2026-12-01"
    },
    {
      "item_id": 2,
      "received_qty": 100,
      "accepted_qty": 100,
      "rejected_qty": 0,
      "batch_number": "BATCH2025002",
      "expiry_date": "2027-01-01"
    }
  ]
}
```

**Validation Rules:**
- `po_id`: Required, integer, PO must exist with status 'Issued' or 'In-Transit'
- `warehouse_id`: Required, integer, warehouse must exist and be active
- `grn_date`: Optional, valid date, cannot be future date
- `items`: Required, array with minimum 1 item
- `items.*.item_id`: Required, must belong to the PO
- `items.*.received_qty`: Required, >= 1, cannot exceed pending quantity
- `items.*.accepted_qty`: Required, >= 0
- `items.*.rejected_qty`: Required, >= 0
- `received_qty` must equal `accepted_qty + rejected_qty`
- If `rejected_qty > 0`, `rejection_reason` is required
- `expiry_date`: Optional, must be future date if provided

**Success Response (201):**
```json
{
  "success": true,
  "message": "GRN created successfully",
  "data": {
    "grn_id": 1,
    "grn_number": "GRN2025000001",
    "grn_date": "2025-01-25",
    "status": "Completed",
    "purchaseOrder": {
      "po_number": "PO2025001",
      "supplier": {
        "supplier_name": "Supplier ABC"
      }
    },
    "warehouse": {
      "warehouse_name": "Main Warehouse"
    },
    "grnItems": [
      {
        "grn_item_id": 1,
        "item_id": 1,
        "received_qty": 200,
        "accepted_qty": 195,
        "rejected_qty": 5,
        "item": {
          "item_name": "Basmati Rice 5kg",
          "sku": "RICE-001"
        },
        "batches": [
          {
            "batch_id": 1,
            "batch_number": "BATCH2025001",
            "expiry_date": "2026-12-01",
            "quantity": 195
          }
        ]
      }
    ]
  }
}
```

**Error Response (400):**
```json
{
  "success": false,
  "message": "Item 1: Received quantity (200) exceeds pending quantity (150)"
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:5000/api/grn \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "po_id": 1,
    "warehouse_id": 1,
    "grn_date": "2025-01-25",
    "items": [
      {
        "item_id": 1,
        "received_qty": 200,
        "accepted_qty": 195,
        "rejected_qty": 5,
        "rejection_reason": "Damaged packaging",
        "batch_number": "BATCH2025001",
        "expiry_date": "2026-12-01"
      }
    ]
  }'
```

---

### 3. Get All GRNs
**GET** `/api/grn`

**Access:** All authenticated users

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 20)
- `status` (filter: 'Draft', 'Completed')
- `warehouse_id` (filter by warehouse)
- `po_id` (filter by PO)
- `start_date` (filter by grn_date range)
- `end_date` (filter by grn_date range)

**Success Response (200):**
```json
{
  "success": true,
  "message": "GRNs retrieved successfully",
  "data": {
    "grns": [
      {
        "grn_id": 1,
        "grn_number": "GRN2025000001",
        "grn_date": "2025-01-25",
        "status": "Completed",
        "po_number": "PO2025001",
        "supplier_name": "Supplier ABC",
        "warehouse_name": "Main Warehouse",
        "received_by": "John Doe",
        "item_count": 2,
        "total_accepted_qty": 295,
        "total_rejected_qty": 5,
        "remarks": "Received in good condition",
        "createdAt": "2025-01-25T10:00:00.000Z",
        "updatedAt": "2025-01-25T10:00:00.000Z"
      }
    ],
    "pagination": {
      "total": 10,
      "page": 1,
      "limit": 20,
      "totalPages": 1
    }
  }
}
```

**cURL Example:**
```bash
curl -X GET "http://localhost:5000/api/grn?page=1&limit=10&status=Completed&warehouse_id=1" \
  -H "Authorization: Bearer <token>"
```

---

### 4. Get GRN by ID
**GET** `/api/grn/:id`

**Access:** All authenticated users

**Success Response (200):**
```json
{
  "success": true,
  "message": "GRN retrieved successfully",
  "data": {
    "grn_id": 1,
    "grn_number": "GRN2025000001",
    "grn_date": "2025-01-25",
    "status": "Completed",
    "remarks": "Received in good condition",
    "purchaseOrder": {
      "po_id": 1,
      "po_number": "PO2025001",
      "po_date": "2025-01-20",
      "expected_delivery_date": "2025-01-27",
      "supplier": {
        "supplier_id": 1,
        "supplier_name": "Supplier ABC"
      }
    },
    "warehouse": {
      "warehouse_id": 1,
      "warehouse_name": "Main Warehouse",
      "address": "123 Main St",
      "city": "New York"
    },
    "receiver": {
      "user_id": 1,
      "full_name": "John Doe",
      "username": "john_doe",
      "email": "john@example.com"
    },
    "grnItems": [
      {
        "grn_item_id": 1,
        "item_id": 1,
        "received_qty": 200,
        "accepted_qty": 195,
        "rejected_qty": 5,
        "rejection_reason": "Damaged packaging",
        "item": {
          "item_id": 1,
          "item_name": "Basmati Rice 5kg",
          "sku": "RICE-001",
          "unit_of_measure": "Kg"
        },
        "batches": [
          {
            "batch_id": 1,
            "batch_number": "BATCH2025001",
            "lot_number": "LOT001",
            "manufacturing_date": "2024-12-01",
            "expiry_date": "2026-12-01",
            "quantity": 195,
            "available_qty": 195,
            "status": "Active"
          }
        ]
      }
    ],
    "createdAt": "2025-01-25T10:00:00.000Z",
    "updatedAt": "2025-01-25T10:00:00.000Z"
  }
}
```

**Error Response (404):**
```json
{
  "success": false,
  "message": "GRN not found"
}
```

**cURL Example:**
```bash
curl -X GET http://localhost:5000/api/grn/1 \
  -H "Authorization: Bearer <token>"
```

---

### 5. Update GRN
**PUT** `/api/grn/:id`

**Access:** Staff and Admin only

**Description:** Update GRN details (only if status is 'Draft')

**Request Body:**
```json
{
  "grn_date": "2025-01-26",
  "remarks": "Updated remarks"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "GRN updated successfully",
  "data": { ... }
}
```

**Error Response (400):**
```json
{
  "success": false,
  "message": "Cannot update completed GRN"
}
```

**cURL Example:**
```bash
curl -X PUT http://localhost:5000/api/grn/1 \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "remarks": "Updated remarks"
  }'
```

---

### 6. Complete GRN
**PUT** `/api/grn/:id/complete`

**Access:** Staff and Admin only

**Description:** Mark GRN as completed (finalizes stock receipt and updates PO status)

**Success Response (200):**
```json
{
  "success": true,
  "message": "GRN completed successfully",
  "data": {
    "grn_id": 1,
    "grn_number": "GRN2025000001",
    "status": "Completed",
    "purchaseOrder": {
      "po_number": "PO2025001",
      "status": "Completed"
    }
  }
}
```

**Error Response (400):**
```json
{
  "success": false,
  "message": "GRN is already completed"
}
```

**cURL Example:**
```bash
curl -X PUT http://localhost:5000/api/grn/1/complete \
  -H "Authorization: Bearer <token>"
```

---

## Business Logic

### GRN Creation Process:
1. Validates PO exists and has valid status ('Issued' or 'In-Transit')
2. Validates warehouse exists and is active
3. Validates all items belong to the PO
4. Validates received quantities don't exceed ordered quantities
5. Auto-generates GRN number (format: GRN + YEAR + 5-digit sequence)
6. Creates GRN record with status 'Draft'
7. For each item:
   - Creates GRNItem record
   - Creates Batch record if batch details provided
   - Creates StockLedger entry for accepted quantity
8. Updates GRN status to 'Completed'
9. Updates PO status:
   - 'Completed' if all items fully received
   - 'In-Transit' if partially received
   - Sets actual_delivery_date when completed

### Stock Updates:
- Only accepted quantities are added to stock
- Stock balance is calculated incrementally
- Batch tracking is optional but recommended for items with expiry dates

### Error Handling:
- All operations use database transactions
- Transaction is rolled back on any error
- Appropriate error messages returned for validation failures

---

## Testing Scenarios

### Scenario 1: Create GRN with Multiple Items (Full Receipt)
```json
POST /api/grn
{
  "po_id": 1,
  "warehouse_id": 1,
  "items": [
    {
      "item_id": 1,
      "received_qty": 200,
      "accepted_qty": 200,
      "rejected_qty": 0,
      "batch_number": "BATCH001",
      "expiry_date": "2026-12-01"
    },
    {
      "item_id": 2,
      "received_qty": 100,
      "accepted_qty": 100,
      "rejected_qty": 0,
      "batch_number": "BATCH002"
    }
  ]
}
```
**Expected:** GRN created, PO status updated to 'Completed'

### Scenario 2: Create GRN with Partial Receipt
```json
POST /api/grn
{
  "po_id": 1,
  "warehouse_id": 1,
  "items": [
    {
      "item_id": 1,
      "received_qty": 100,
      "accepted_qty": 100,
      "rejected_qty": 0,
      "batch_number": "BATCH001"
    }
  ]
}
```
**Expected:** GRN created, PO status updated to 'In-Transit' (if ordered_qty was 200)

### Scenario 3: Create GRN with Rejected Items
```json
POST /api/grn
{
  "po_id": 1,
  "warehouse_id": 1,
  "items": [
    {
      "item_id": 1,
      "received_qty": 200,
      "accepted_qty": 195,
      "rejected_qty": 5,
      "rejection_reason": "Damaged packaging",
      "batch_number": "BATCH001"
    }
  ]
}
```
**Expected:** GRN created, only 195 units added to stock

### Scenario 4: Error - Receiving More Than Ordered
```json
POST /api/grn
{
  "po_id": 1,
  "warehouse_id": 1,
  "items": [
    {
      "item_id": 1,
      "received_qty": 300,
      "accepted_qty": 300,
      "rejected_qty": 0
    }
  ]
}
```
**Expected:** Error 400 - "Received quantity exceeds pending quantity"

### Scenario 5: Error - Invalid PO Status
```json
POST /api/grn
{
  "po_id": 2,  // PO with status 'Completed'
  "warehouse_id": 1,
  "items": [...]
}
```
**Expected:** Error 400 - "Cannot create GRN for PO with status: Completed"

### Scenario 6: Error - Missing Rejection Reason
```json
POST /api/grn
{
  "po_id": 1,
  "warehouse_id": 1,
  "items": [
    {
      "item_id": 1,
      "received_qty": 200,
      "accepted_qty": 195,
      "rejected_qty": 5
      // Missing rejection_reason
    }
  ]
}
```
**Expected:** Error 400 - "rejection_reason is required when rejected_qty > 0"

---

## Notes

- GRN numbers are auto-generated and unique per year
- Stock ledger entries are created automatically for accepted quantities
- Batch tracking is optional but recommended for perishable items
- PO status is automatically updated based on receipt completion
- All operations are transactional - failures rollback all changes
- Only Staff and Admin can create/update GRNs
- All authenticated users can view GRNs

