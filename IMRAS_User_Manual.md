# IMRAS User Manual
## Inventory Management & Reorder Automation System

**Version:** 1.0.0  
**Last Updated:** December 2024  
**Prepared For:** End Users (Admin, Manager, Staff)

---

## Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [User Roles & Permissions](#user-roles--permissions)
4. [Dashboard Overview](#dashboard-overview)
5. [Inventory Management](#inventory-management)
6. [Category Management](#category-management)
7. [Warehouse Management](#warehouse-management)
8. [Supplier Management](#supplier-management)
9. [Stock Operations](#stock-operations)
10. [Purchase Requisitions](#purchase-requisitions)
11. [Purchase Orders](#purchase-orders)
12. [Goods Receipt Notes (GRN)](#goods-receipt-notes-grn)
13. [Batch & Expiry Tracking](#batch--expiry-tracking)
14. [Reorder Automation](#reorder-automation)
15. [Reports & Analytics](#reports--analytics)
16. [Alerts & Notifications](#alerts--notifications)
17. [User Account Management](#user-account-management)
18. [Best Practices](#best-practices)
19. [FAQs](#faqs)
20. [Getting Help](#getting-help)

---

## 1. Introduction

### 1.1 What is IMRAS?

IMRAS (Inventory Management & Reorder Automation System) is a comprehensive web-based inventory management solution designed to streamline warehouse operations, automate reordering processes, and provide real-time insights into stock levels.

### 1.2 Key Features

- **Real-time Inventory Tracking**: Monitor stock levels across multiple warehouses
- **Automated Reordering**: Intelligent system automatically generates purchase requisitions
- **Multi-warehouse Support**: Manage multiple locations with hierarchical storage
- **Batch & Expiry Management**: Track batches, lot numbers, and expiration dates
- **FEFO Logic**: First-Expired-First-Out for expiry-sensitive items
- **Complete Audit Trail**: Every transaction is logged with timestamp and user
- **Role-based Access**: Three user levels with appropriate permissions
- **Comprehensive Reports**: 15+ built-in reports and analytics
- **Demand Forecasting**: Predict future stock needs based on consumption patterns
- **Supplier Management**: Track supplier performance and pricing

### 1.3 System Requirements

**For Users:**
- Modern web browser (Chrome 90+, Firefox 88+, Edge 90+, Safari 14+)
- Internet connection
- Screen resolution: 1366x768 or higher (1920x1080 recommended)
- JavaScript enabled

**For Mobile Users:**
- iOS 13+ or Android 8+
- Mobile browsers: Chrome, Safari, Firefox
- Responsive design supports tablets and smartphones

---

## 2. Getting Started

### 2.1 Accessing the System

1. Open your web browser
2. Navigate to: `https://your-company-domain.com/imras` 
3. You will see the login page

### 2.2 Logging In

#### First Time Login:

1. Enter your username (provided by administrator)
2. Enter your temporary password
3. Click **"Login"** button
4. You will be prompted to change your password
5. Enter new password (minimum 8 characters, mix of letters and numbers)
6. Confirm new password
7. Click **"Change Password"**

#### Regular Login:

1. Enter your username
2. Enter your password
3. (Optional) Check **"Remember Me"** to stay logged in
4. Click **"Login"**

**Security Tips:**
- Never share your password
- Use a strong, unique password
- Log out when finished, especially on shared computers
- Report any suspicious activity to your administrator

### 2.3 Dashboard Overview

After logging in, you'll see your role-specific dashboard:

#### Admin Dashboard:
- System overview with all metrics
- Total items, warehouses, users
- Low stock alerts
- Recent activities
- Reorder automation status
- Quick access to all modules

#### Manager Dashboard:
- Inventory overview
- Pending approvals (PRs, adjustments)
- Low stock items
- Recent purchase orders
- Reports and analytics
- Reorder monitoring

#### Staff Dashboard:
- Stock operations
- Pending GRNs
- Recent transactions
- Quick stock check
- Issue/transfer operations

### 2.4 Navigation

**Top Navigation Bar:**
- Company logo (click to return to dashboard)
- Search bar (global search across items, suppliers, PRs, POs)
- Notification bell (alerts and notifications)
- User menu (profile, settings, logout)

**Sidebar Menu:**
- Dashboard
- Inventory
- Categories
- Warehouses
- Suppliers
- Stock Operations
- Purchase Requisitions
- Purchase Orders
- GRN
- Batches
- Reorder Automation (Admin/Manager only)
- Reports
- Settings (Admin only)

**Collapsible Sidebar:**
- Click hamburger icon (☰) to collapse/expand sidebar
- Provides more screen space for data tables

---

## 3. User Roles & Permissions

### 3.1 Admin Role

**Full System Access:**
- ✅ All inventory operations
- ✅ User management
- ✅ System configuration
- ✅ Reorder automation control
- ✅ All reports and analytics
- ✅ Delete operations
- ✅ Financial data access

**Key Responsibilities:**
- System configuration and maintenance
- User account management
- Reorder rules configuration
- System monitoring and troubleshooting
- Data backup and security

### 3.2 Manager Role

**Operational Management:**
- ✅ Inventory management
- ✅ Approve/reject purchase requisitions
- ✅ Create and manage purchase orders
- ✅ Supplier management
- ✅ View reports and analytics
- ✅ Monitor reorder automation
- ✅ Approve stock adjustments
- ❌ Cannot delete users
- ❌ Cannot change system settings

**Key Responsibilities:**
- Approve purchase requisitions
- Manage suppliers and orders
- Monitor stock levels
- Review and act on alerts
- Generate reports for management

### 3.3 Staff Role

**Operational Tasks:**
- ✅ View inventory
- ✅ Stock issue/transfer operations
- ✅ Process GRNs
- ✅ Create stock count records
- ✅ View basic reports
- ❌ Cannot approve PRs
- ❌ Cannot create POs
- ❌ Cannot manage suppliers
- ❌ Cannot access financial data

**Key Responsibilities:**
- Daily stock operations
- Goods receipt processing
- Stock counting
- Maintain accurate records
- Report discrepancies

---

# 4. Dashboard Overview

## 4.1 Key Metrics Cards

**Total Items:** Total number of active items in the system  
**Low Stock Items:** Items below reorder point (click to view details)  
**Out of Stock:** Items with zero stock (requires immediate attention)  
**Total Value:** Current inventory value (Admin/Manager only)  
**Pending Approvals:** Number of PRs awaiting your action  
**Expiring Soon:** Items expiring within 30 days

## 4.2 Quick Actions

- **Add Item**: Create new inventory item
- **Stock Issue**: Issue stock for consumption
- **Create PR**: Manual purchase requisition
- **Process GRN**: Receive goods into warehouse
- **Stock Count**: Initiate physical inventory count
- **Generate Report**: Quick access to common reports

## 4.3 Recent Activity

Shows last 10 transactions:
- Stock movements
- PRs created/approved
- POs issued
- GRNs processed
- User logins/logouts
- System events

**Filter Options:**
- Date range
- Transaction type
- User
- Item
- Location

## 4.4 Charts & Graphs

### Stock Level Overview:
- Visual representation of stock levels by category
- Color-coded: 
  - Green (Adequate: Above reorder point)
  - Yellow (Low: Below reorder point but above safety stock)
  - Red (Critical: Below safety stock)
- Hover for details
- Click to drill down

### Top Moving Items:
- Items with highest consumption in last 30 days
- Shows quantity moved and value
- Helps identify fast-moving inventory
- Sort by quantity or value

### Expiring Soon:
- Items expiring within next 30 days
- Sorted by days remaining
- Color-coded by urgency
- Click to view batch details

### Reorder Status:
- Items needing reorder
- Shows days of stock remaining
- Indicates if auto-PR was generated
- Links to create manual PR

## 4.5 Customizing Your Dashboard

### Widget Management:
1. Click **"Customize Dashboard"** (top right)
2. Drag and drop widgets to rearrange
3. Toggle widgets on/off
4. Adjust widget sizes
5. Click **"Save Layout"** to confirm

### Available Widgets:
- Stock Overview
- Recent Activity
- Expiring Items
- Pending Approvals
- Reorder Alerts
- Performance Metrics
- Custom Reports

### Saving Views:
1. Customize dashboard as needed
2. Click **"Save View As"**
3. Name your view (e.g., "Daily Operations", "Weekly Review")
4. Switch between saved views from dropdown

## 4.6 Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl + K` | Global search |
| `Alt + D` | Go to dashboard |
| `F5` | Refresh dashboard |
| `?` | Show all shortcuts |
| `Esc` | Close current modal/dialog |
| `Ctrl + F` | Find on page |

## 4.7 Dashboard Tips

1. **Quick Filters**
   - Use the time period selector to view different date ranges
   - Click on any chart segment to filter other widgets
   - Save frequently used filters for one-click access

2. **Data Export**
   - Export any chart or table to:
     - Excel (.xlsx)
     - PDF
     - CSV
     - Image (.png)

3. **Drill-Down Capability**
   - Click on any data point to see detailed records
   - Right-click for additional options
   - Use breadcrumbs to navigate back

4. **Real-time Updates**
   - Dashboard auto-refreshes every 5 minutes
   - Look for the "Last Updated" timestamp
   - Click refresh to get latest data

## 4.8 Troubleshooting

**Issue: Dashboard is slow to load**
- Try reducing the date range
- Clear browser cache
- Check your internet connection
- Contact admin if issue persists

**Issue: Missing data**
- Verify your filters
- Check if you have proper permissions
- Ensure data exists for selected period

**Issue: Charts not displaying**
- Enable JavaScript in your browser
- Try a different browser
- Clear browser cache and cookies

# 5. Inventory Management

## 5.1 Viewing Items

### Accessing Inventory List
1. Navigate to **Sidebar → Inventory**
2. See all active inventory items in a sortable, filterable table

### Search & Filter Options
- **Global Search**: Search by SKU, name, or description
- **Category Filter**: Filter by item category
- **Status Filter**: Active / Inactive / All
- **Stock Level Filter**:
  - All
  - Critical (Below safety stock)
  - Low (Below reorder point)
  - Adequate (Above reorder point)
  - Overstock (Above maximum level)
- **Custom Filters**:
  - Price range
  - Last updated date
  - With/Without images
  - Tracked items only

### Table Columns
| Column | Description | Sortable |
|--------|-------------|----------|
| SKU | Unique identifier | Yes |
| Image | Thumbnail of item | No |
| Name | Item name | Yes |
| Category | Item category | Yes |
| UOM | Unit of measurement | Yes |
| Price | Current price | Yes |
| Reorder Point | Stock level that triggers reorder | Yes |
| Current Stock | Available quantity | Yes |
| Status | Active/Inactive | Yes |
| Actions | View/Edit/Delete | No |

### Bulk Actions
1. Select multiple items using checkboxes
2. Choose action from dropdown:
   - Activate/Deactivate
   - Update prices (by % or fixed amount)
   - Change category
   - Export selected
   - Print barcode labels

## 5.2 Adding New Item

### Basic Information (Tab 1)
- **Item Name***: Descriptive name (required)
- **SKU**: Auto-generated or enter manually (must be unique)
- **Category***: Select from dropdown (required)
- **Description**: Detailed description with specifications
- **Unit of Measurement***: Select from list (Pcs, Kg, Liters, etc.)
- **Status**: Active (default) / Inactive
- **Image**: Upload item image (max 2MB, JPG/PNG)

### Stock & Pricing (Tab 2)
| Field | Description |
|-------|-------------|
| Purchase Price | Cost price from supplier |
| Selling Price | Sales price (if applicable) |
| Reorder Point* | Stock level that triggers reorder |
| Safety Stock* | Minimum stock to maintain |
| Lead Time (days) | Supplier delivery time |
| Minimum Order Qty | Minimum qty to order |
| Maximum Stock | Upper limit (optional) |
| Initial Stock | Starting quantity (new items only) |

### Additional Details (Tab 3)
- **Barcode**: Enter or generate
- **Supplier**: Primary supplier(s)
- **Storage Location**: Default location per warehouse
- **Batch Tracking**: Enable/Disable
- **Expiry Tracking**: Enable/Disable
- **Hazardous Material**: Check if applicable
- **Serial Numbers**: Enable for serialized items
- **Custom Fields**: Add up to 5 custom fields

## 5.3 Editing Items

### Making Changes
1. Locate item using search/filters
2. Click **Edit** (pencil icon)
3. Modify fields as needed
4. Click **Save** to update

### Version History
- View all changes made to the item
- See who made changes and when
- Revert to previous version if needed

## 5.4 Viewing Item Details

### Item Summary
- Complete item information
- Current stock levels by warehouse
- Average monthly consumption
- Reorder status
- Linked documents

### Stock Movement
- Interactive chart showing stock levels over time
- Filter by date range
- Export movement history

### Linked Information
- Related items
- Alternative suppliers
- Associated documents
- Maintenance records

## 5.5 Deactivating Items

### When to Deactivate
- Item is discontinued
- No longer stocked
- Seasonal items out of season
- Replaced by new version

### Deactivation Process
1. Locate item
2. Click **Deactivate**
3. Select reason from dropdown
4. Add optional notes
5. Confirm deactivation

### Reactivating Items
1. Filter by "Inactive" status
2. Locate item
3. Click **Activate**
4. Confirm activation

## 5.6 Batch Operations

### Available Batch Actions
1. **Price Update**
   - Update by percentage or fixed amount
   - Apply to selected items or category
   - Schedule for future date

2. **Category Reassignment**
   - Move multiple items to new category
   - Update all related records

3. **Status Change**
   - Activate/Deactivate in bulk
   - Set as seasonal/clearance

4. **Data Export**
   - Export selected items to Excel/CSV
   - Include custom fields
   - Save export templates

## 5.7 Import/Export

### Importing Items
1. Download template
2. Fill in item details
3. Upload file
4. Map columns
5. Preview changes
6. Confirm import

### Exporting Items
1. Apply desired filters
2. Select columns to include
3. Choose format (Excel/CSV/PDF)
4. Download or email

## 5.8 Best Practices

### Naming Conventions
- Use consistent naming
- Include key attributes
- Avoid special characters
- Be descriptive but concise

### Stock Level Management
- Review reorder points quarterly
- Adjust for seasonality
- Consider supplier lead times
- Monitor stock turnover

### Data Maintenance
- Regular data cleanup
- Remove duplicate items
- Update obsolete information
- Archive old records

## 5.9 Troubleshooting

### Common Issues
**Item not appearing in search**
- Check filters
- Verify status is Active
- Check permissions
- Clear browser cache

**Cannot edit item**
- Check user permissions
- Ensure no pending transactions
- Contact admin if issue persists

**Stock levels incorrect**
- Check for pending transactions
- Verify no duplicate items
- Run stock reconciliation
- Check audit trail for discrepancies

# 6. Category Management

## 6.1 Purpose of Categories

### Why Use Categories?
- **Organization**: Group related items logically
- **Reporting**: Generate category-specific reports
- **Analysis**: Perform ABC analysis by category
- **Efficiency**: Speed up item lookup and management
- **Pricing**: Apply pricing rules by category
- **Permissions**: Control access by category

### Category Hierarchy
- **Parent Categories**: Broad groups (e.g., Electronics, Office Supplies)
- **Subcategories**: More specific groupings (e.g., Computers, Peripherals)
- **Maximum Depth**: 3 levels recommended for optimal performance

## 6.2 Viewing Categories

### Category List View
- **Access**: Sidebar → Categories
- **Layout**: Expandable tree view
- **Columns**:
  - Category Name
  - Description
  - Item Count
  - Last Updated
  - Status
  - Actions

### Sorting and Filtering
- **Sort By**: Name, Item Count, Last Updated
- **Filters**:
  - Active/Inactive
  - Parent Category
  - Last Updated Date Range
  - Has Items/No Items

### Category Details
- **Access**: Click on category name
- **Information Shown**:
  - Category Code
  - Parent Category
  - Description
  - Created By/Date
  - Last Modified By/Date
  - Associated Items Count
  - Category Image (if any)

## 6.3 Creating Categories

### Basic Category Creation
1. Click **"Add Category"** button
2. Enter **Category Name*** (required, 3-50 characters)
3. **Category Code**: Auto-generated or enter manually (must be unique)
4. **Parent Category**: Select from dropdown (optional for top-level categories)
5. **Description**: Detailed description (max 500 characters)
6. **Status**: Active (default) / Inactive
7. **Image**: Upload category image (optional, max 1MB)
8. **Custom Fields**: Add up to 3 custom fields
9. Click **"Save"**

### Bulk Category Creation
1. Click **"Import Categories"**
2. Download template
3. Fill in details
4. Upload file
5. Map columns
6. Preview
7. Confirm import

### Category Templates
- Save frequently used category structures
- Apply templates to new setups
- Share templates between locations

## 6.4 Editing Categories

### Modifying Category Details
1. Locate category in list
2. Click **"Edit"** (pencil icon)
3. Make changes to fields
4. Add/update category image if needed
5. Click **"Save"**

### Moving Categories
1. Select category to move
2. Click **"Move"**
3. Choose new parent category
4. Confirm move

### Category Merging
1. Select categories to merge
2. Click **"Merge"**
3. Select target category
4. Confirm merge

## 6.5 Category Attributes

### Default Attributes
- **Required Fields**:
  - Name
  - Status
  - Category Code
- **Optional Fields**:
  - Description
  - Image
  - Custom Fields

### Custom Attributes
1. Navigate to **Category Attributes**
2. Click **"Add Attribute"**
3. Define:
   - Attribute Name
   - Data Type (Text, Number, Date, Dropdown, Checkbox)
   - Required/Optional
   - Default Value
   - Validation Rules

### Attribute Inheritance
- Child categories inherit parent attributes
- Can override inherited attributes
- View inheritance chain in details

## 6.6 Category Reports

### Available Reports
1. **Category Summary**
   - Items per category
   - Stock value by category
   - Movement analysis

2. **Category Performance**
   - Sales by category
   - Turnover rates
   - Profit margins

3. **Category Comparison**
   - Side-by-side analysis
   - Trend comparison
   - Performance metrics

### Export Options
- Excel (.xlsx)
- PDF
- CSV
- Email directly from system

## 6.7 Best Practices

### Naming Conventions
- Use clear, descriptive names
- Be consistent with terminology
- Avoid special characters
- Keep names concise but meaningful

### Category Structure
- Limit hierarchy depth (max 3 levels recommended)
- Balance between too broad and too specific
- Consider future expansion
- Document category structure

### Maintenance
- Regular review of categories
- Merge duplicate categories
- Archive unused categories
- Update category attributes as needed

## 6.8 Troubleshooting

### Common Issues
**Cannot delete category**
- Check if category contains items
- Verify no subcategories exist
- Ensure no dependencies in reports

**Category not appearing**
- Check status is Active
- Verify parent category is visible
- Check user permissions

**Performance issues**
- Reduce category depth
- Limit number of categories per level
- Archive unused categories

### Error Messages
| Error Message | Possible Cause | Solution |
|--------------|----------------|-----------|
| "Category name already exists" | Duplicate name | Choose unique name |
| "Cannot delete category with items" | Items exist in category | Move/delete items first |
| "Invalid parent category" | Circular reference | Select valid parent |
| "Maximum depth exceeded" | Too many levels | Restructure categories |

## 6.9 Category Security

### Permission Levels
- **View**: Can see category and items
- **Edit**: Can modify category details
- **Create**: Can add new categories
- **Delete**: Can remove categories

### Access Control
- Restrict access by user/role
- Set category-specific permissions
- Audit category changes

## 6.10 Integration with Other Modules

### Purchase Orders
- Filter items by category
- Set default categories for suppliers
- Category-based approval workflows

### Inventory Management
- Category-based reorder points
- Stock alerts by category
- Category-specific reports

### Reporting
- Sales by category
- Inventory turnover by category
- Profitability analysis


# 7. Warehouse Management

## 7.1 Understanding Warehouses

### What is a Warehouse?
- Physical or logical storage location
- Can represent:
  - Actual warehouses
  - Retail stores
  - Production facilities
  - Distribution centers
  - Virtual warehouses

### Key Features
- Multiple warehouse support
- Hierarchical location structure
- Independent stock tracking
- Transfer management
- Capacity planning
- Performance metrics

## 7.2 Warehouse Structure

### Location Hierarchy
```
Warehouse (e.g., Main Warehouse)
├── Zone (e.g., Receiving, Storage, Picking)
│   ├── Aisle (e.g., A, B, C)
│   │   ├── Rack (e.g., 01, 02, 03)
│   │   │   ├── Shelf (e.g., 1, 2, 3)
│   │   │   │   └── Bin (e.g., A1-01-01-01)
```

### Location Naming Convention
- **Standard Format**: `[Zone]-[Aisle]-[Rack]-[Shelf]-[Bin]`
- **Example**: `R-A-01-02-03` = Receiving Zone, Aisle A, Rack 01, Shelf 02, Bin 03
- **Barcode Support**: Each location has a unique barcode

## 7.3 Creating Warehouses

### Basic Warehouse Setup
1. Navigate to **Warehouse → New Warehouse**
2. **Basic Information**:
   - **Warehouse Name***: (e.g., "Main Warehouse")
   - **Warehouse Code***: (e.g., "WH-001", auto-generated)
   - **Type**:
     - Physical (default)
     - Virtual (for drop-shipping, etc.)
   - **Status**: Active/Inactive
   - **Contact Information**:
     - Manager Name
     - Phone
     - Email
     - Address
3. **Operational Settings**:
   - Operating Hours
   - Time Zone
   - Default Currency
   - Temperature Zone (Ambient, Refrigerated, Frozen)
4. **Capacity Management**:
   - Total Storage Area (sq. ft.)
   - Max Weight Capacity
   - Storage Type (Bulk, Rack, Bin, etc.)
5. **Additional Settings**:
   - Enable/Disable Locations
   - Default Picking Strategy
   - Putaway Rules
   - Replenishment Settings

## 7.4 Location Management

### Adding Locations
1. Select Warehouse
2. Click **"Add Location"**
3. **Location Details**:
   - **Location Type**:
     - Zone
     - Aisle
     - Rack
     - Shelf
     - Bin
   - **Location Code***: Auto-generated or manual
   - **Parent Location**: Select parent in hierarchy
   - **Dimensions**: L × W × H
   - **Weight Capacity**
   - **Status**: Active/Inactive
   - **Barcode**: Auto-generated

### Location Attributes
- **Storage Type**:
  - Bulk Storage
  - Case Storage
  - Pallet Storage
  - Bin Storage
- **Handling Requirements**:
  - Fragile
  - Hazardous
  - Temperature Controlled
  - High Security
- **Accessibility**:
  - Reach Truck
  - Forklift
  - Manual

## 7.5 Warehouse Operations

### Stock Transfers
1. Navigate to **Stock → Transfers**
2. Select **Transfer Type**:
   - Inter-warehouse
   - Intra-warehouse
3. **Transfer Details**:
   - Reference Number (auto-generated)
   - Source Location
   - Destination Location
   - Expected Completion Date
   - Priority (Low/Medium/High)
4. **Add Items**:
   - Scan or search items
   - Enter quantities
   - Add batch/serial numbers if applicable
5. **Review & Submit**:
   - Verify details
   - Add notes
   - Attach documents
   - Submit for approval

### Putaway Management
1. **Automatic Putaway**:
   - System suggests optimal locations
   - Based on:
     - Item dimensions/weight
     - Storage requirements
     - Current capacity
     - Picking frequency
2. **Manual Putaway**:
   - Override system suggestions
   - Select specific locations
   - Document reason for override

### Picking Strategies
1. **FIFO (First In, First Out)**:
   - Oldest stock picked first
   - Default for perishables
2. **FEFO (First Expired, First Out)**:
   - Items expiring soonest picked first
   - For items with expiry dates
3. **LIFO (Last In, First Out)**:
   - Newest stock picked first
   - For non-perishable items
4. **Zone Picking**:
   - Pickers assigned to specific zones
   - Efficient for large warehouses
5. **Wave Picking**:
   - Group orders into waves
   - Optimize picking routes

## 7.6 Warehouse Reports

### Inventory Reports
- **Stock by Location**:
  - Current stock levels
  - Value by location
  - Aging analysis
- **Location Utilization**:
  - Space utilization %
  - Empty locations
  - Overstocked locations

### Performance Reports
- **Picking Performance**:
  - Picks per hour
  - Order cycle time
  - Picking accuracy
- **Putaway Performance**:
  - Time to put away
  - Putaway accuracy
  - Space utilization

### Audit Reports
- **Stock Movement**:
  - All transactions by location
  - User activity
  - System adjustments
- **Location History**:
  - Item movement history
  - Location occupancy over time
  - Audit trail

## 7.7 Best Practices

### Layout Optimization
- Group fast-moving items near shipping
- Place heavy items at waist level
- Keep popular items together
- Minimize travel distance
- Use vertical space effectively

### Safety & Compliance
- Clear aisle markings
- Proper signage
- Safety equipment locations
- Emergency exits
- First aid stations

### Maintenance
- Regular cleaning schedule
- Equipment maintenance log
- Pest control
- Temperature monitoring
- Security checks

## 7.8 Troubleshooting

### Common Issues
**Stock Discrepancies**
- Compare system vs. physical counts
- Check for pending transactions
- Review audit trail
- Investigate recent adjustments

**Location Full**
- Check capacity settings
- Verify putaway rules
- Look for pending moves
- Consider reorganization

**Picking Errors**
- Verify location accuracy
- Check item barcodes
- Review picking sequence
- Retrain staff if needed

### Error Messages
| Error | Possible Cause | Solution |
|-------|----------------|-----------|
| "Location not found" | Invalid location code | Verify and re-enter |
| "Insufficient space" | Location at capacity | Find alternative location |
| "Invalid move" | Violates putaway rules | Check item/location rules |
| "Duplicate location" | Location code exists | Use unique code |

## 7.9 Advanced Features

### Cross-Docking
1. Receive goods
2. Sort immediately
3. Ship without storage
4. Reduce handling
5. Faster order fulfillment

### Wave Management
1. Group orders
2. Optimize picking
3. Schedule waves
4. Monitor progress
5. Analyze performance

### Mobile Integration
- Barcode scanning
- Real-time updates
- Offline capability
- Photo documentation
- Digital signatures

## 7.10 Warehouse Setup Checklist

### Initial Setup
- [ ] Define warehouse layout
- [ ] Create location hierarchy
- [ ] Set up storage zones
- [ ] Configure picking strategies
- [ ] Define putaway rules
- [ ] Set user permissions
- [ ] Test processes
- [ ] Train staff
- [ ] Go live with pilot items
- [ ] Full implementation


# 8. Supplier Management

## 8.1 Supplier Master Data

### Supplier Information
- **Basic Details**:
  - Supplier Name (Legal Business Name)
  - Trading Name (if different)
  - Supplier Code (Auto-generated, e.g., "SUP-001")
  - Tax ID/VAT Number
  - Company Registration Number
  - DUNS Number (if applicable)
  - Supplier Since (Date)
  - Status (Active/Inactive/On Hold)
  - Supplier Rating (1-5 stars)
  - Preferred Status (Yes/No)

### Contact Information
- **Primary Contact**:
  - Name
  - Job Title
  - Direct Phone
  - Mobile
  - Email
  - Preferred Contact Method
- **Billing Contact**:
  - (Same fields as Primary)
- **Technical Contact**:
  - (Same fields as Primary)

### Addresses
- **Registered Office**:
  - Street Address
  - City
  - State/Province
  - Postal Code
  - Country
  - Phone
  - Fax
- **Shipping Address**:
  - (Same fields as Registered Office)
  - Default Shipping Method
  - Shipping Account #
  - Special Instructions

## 8.2 Supplier Onboarding

### Registration Process
1. **Initial Assessment**:
   - Complete Supplier Information Form
   - Provide Business Registration Documents
   - Submit Tax Certificates
   - Provide Bank Details
   - Sign Supplier Agreement
   - Complete Compliance Questionnaires

2. **Evaluation Criteria**:
   - Financial Stability
   - Quality Certifications (ISO, etc.)
   - Production Capacity
   - Lead Time Capability
   - Quality Control Processes
   - Environmental Compliance
   - Labor Practices

3. **Approval Workflow**:
   - Department Review
   - Compliance Check
   - Risk Assessment
   - Final Approval
   - System Setup
   - Welcome Package

## 8.3 Supplier Performance

### Performance Metrics
1. **Quality**:
   - Defect Rate (%)
   - Return Rate (%)
   - Quality Certifications
   - Audit Results

2. **Delivery**:
   - On-Time Delivery %
   - Lead Time Accuracy
   - Order Fill Rate
   - Shipping Accuracy

3. **Cost**:
   - Price Competitiveness
   - Cost Reduction Initiatives
   - Payment Terms
   - Total Cost of Ownership

4. **Service**:
   - Responsiveness
   - Technical Support
   - Problem Resolution
   - Communication

### Performance Reviews
- **Quarterly Business Reviews (QBRs)**
- Scorecard Distribution
- Improvement Plans
- Action Items
- Follow-up Schedule

## 8.4 Supplier Communication

### Communication Channels
- **Portal Access**:
  - Supplier Self-Service Portal
  - Order Status
  - Invoice Submission
  - Document Exchange
  - Performance Dashboards

### Automated Notifications
- **Order Confirmations**
- **Shipment Notices**
- **Payment Reminders**
- **Contract Expirations**
- **Performance Alerts**

### Escalation Process
1. **Level 1**: Account Manager
2. **Level 2**: Department Head
3. **Level 3**: Senior Management
4. **Level 4**: Executive Escalation

## 8.5 Contract Management

### Contract Types
1. **Master Supply Agreement**
2. **Service Level Agreement (SLA)**
3. **Non-Disclosure Agreement (NDA)**
4. **Quality Agreement**
5. **Price Agreement**

### Key Contract Terms
- **Pricing Structure**
- **Payment Terms**
- **Delivery Requirements**
- **Quality Standards**
- **Liability Clauses**
- **Termination Conditions**
- **Renewal Terms**

### Document Management
- **Version Control**
- **Electronic Signatures**
- **Renewal Alerts**
- **Compliance Tracking**
- **Audit Trail**

## 8.6 Risk Management

### Risk Assessment
- **Financial Risk**
- **Operational Risk**
- **Compliance Risk**
- **Geopolitical Risk**
- **Single Source Risk**

### Mitigation Strategies
- **Dual Sourcing**
- **Safety Stock**
- **Contractual Protections**
- **Insurance Coverage**
- **Business Continuity Planning**

## 8.7 Supplier Development

### Improvement Programs
- **Quality Improvement**
- **Cost Reduction**
- **Process Optimization**
- **Technology Upgrades**
- **Sustainability Initiatives**

### Training & Support
- **Supplier Training**
- **Knowledge Sharing**
- **Best Practices**
- **Technical Assistance**
- **Mentorship Programs**

## 8.8 Supplier Portal

### Features
- **Self-Service Profile Management**
- **Document Exchange**
- **RFQ Management**
- **Order Tracking**
- **Invoice Submission**
- **Performance Dashboards**
- **Dispute Resolution**
- **Knowledge Base**

## 8.9 Supplier Offboarding

### Process
1. **Notification**
2. **Final Orders**
3. **Returns/Disposition**
4. **Final Settlement**
5. **Knowledge Transfer**
6. **System Deactivation**
7. **Lessons Learned**

### Exit Checklist
- [ ] All orders completed/transferred
- [ ] Returns processed
- [ ] Final payment settled
- [ ] Access revoked
- [ ] Data archived
- [ ] Transition complete

## 8.10 Best Practices

### Relationship Management
- Regular Communication
- Transparent Feedback
- Joint Business Planning
- Continuous Improvement
- Recognition Programs

### Performance Optimization
- Regular Scorecards
- Benchmarking
- Cost Analysis
- Process Mapping
- Value Engineering

### Risk Management
- Regular Assessments
- Contingency Planning
- Diversification
- Compliance Monitoring
- Early Warning Systems


# 9. Stock Operations

## 9.1 Stock Receipts

### Goods Receipt Process
1. **Access GRN Module**
   - Navigate to **Stock → Goods Receipt**
   - Click **"New Receipt"**

2. **Reference Information**
   - Select Purchase Order (auto-fills items)
   - Or create Direct Receipt
   - Enter Supplier Delivery Note #
   - Select Receiving Warehouse
   - Assign Receipt Date/Time

3. **Item Receiving**
   - Scan barcodes or search items
   - Enter quantities received
   - Record any discrepancies
   - Add batch/lot numbers if applicable
   - Capture expiry dates

4. **Quality Check**
   - Inspect for damage
   - Verify specifications
   - Record quality issues
   - Attach inspection documents

5. **Completion**
   - Review summary
   - Add notes/comments
   - Submit for approval if required
   - Print GRN copy

### Direct Receipts
- Used for:
  - Returns from customers
  - Inventory adjustments
  - Production returns
  - Donations
- Requires:
  - Reason code
  - Approval for high-value items
  - Supporting documentation

## 9.2 Stock Issues

### Standard Issue Process
1. **Create Issue Note**
   - Navigate to **Stock → Issue**
   - Select Issuing Location
   - Choose Department/Project
   - Select Requisition (if applicable)

2. **Add Items**
   - Search/scan items
   - Enter quantities
   - Select batches (FEFO applied)
   - Add serial numbers if required

3. **Approval**
   - Automatic for standard items
   - Manager approval for:
     - High-value items
     - Non-standard requests
     - Over-limit quantities

4. **Picking & Issuance**
   - Print pick list
   - Pick items
   - Update quantities if needed
   - Confirm issue
   - Get recipient signature

### Special Issue Types
- **Production Issues**
  - Bill of Materials (BOM) based
  - Backflushing support
  - Work order linking

- **Maintenance Issues**
  - Equipment association
  - Maintenance request tracking
  - Returnable items tracking

- **Customer Returns**
  - RMA number reference
  - Quality inspection
  - Restock or quarantine

## 9.3 Stock Transfers

### Internal Transfers
1. **Create Transfer**
   - Navigate to **Stock → Transfers**
   - Select Source Location
   - Choose Destination
   - Set Priority

2. **Add Items**
   - Search/scan items
   - Enter quantities
   - Select batches
   - Add handling instructions

3. **Processing**
   - Print transfer slip
   - Pick items
   - Update status
   - Receive at destination
   - Verify quantities

### Inter-warehouse Transfers
- Additional requirements:
  - Transportation details
  - Expected delivery date
  - Shipping reference
  - Carrier information
  - Proof of delivery

### Transfer Status Tracking
- Draft
- Picking
- In Transit
- Partially Received
- Completed
- Cancelled

## 9.4 Stock Adjustments

### Adjustment Reasons
- Cycle count variance
- Damage
- Theft
- Spoilage
- Obsolete stock
- Unit of measure changes
- System corrections

### Adjustment Process
1. **Create Adjustment**
   - Navigate to **Stock → Adjustments**
   - Select Adjustment Type
   - Choose Location
   - Enter Reference

2. **Add Items**
   - Search/scan items
   - Enter current count
   - System shows variance
   - Add reason code
   - Attach photos if needed

3. **Approval**
   - Automatic for small adjustments
   - Manager approval for:
     - High-value items
     - Large quantities
     - Frequent adjustments

4. **Posting**
   - Review impact
   - Add comments
   - Post adjustment
   - Print adjustment report

## 9.5 Stock Counts

### Cycle Counting
1. **Schedule Count**
   - Select counting method:
     - Location-based
     - Item category
     - ABC classification
   - Assign counters
   - Print count sheets

2. **Counting**
   - Freeze transactions (optional)
   - Count items
   - Record quantities
   - Note discrepancies

3. **Variance Analysis**
   - System compares counts to expected
   - Highlight differences
   - Investigate causes
   - Make adjustments

4. **Approval**
   - Review variances
   - Add explanations
   - Approve counts
   - Post adjustments

### Full Physical Inventory
- Annual/biannual process
- Warehouse shutdown required
- Multiple counting teams
- Independent verification
- Final reconciliation

## 9.6 Batch & Serial Tracking

### Batch Management
- **Batch Creation**
  - Auto-generated or manual
  - Link to production/purchase
  - Expiry date tracking
  - Quality status

- **Batch Attributes**
  - Manufacturing date
  - Expiry date
  - Quality status
  - Certificates
  - Custom fields

### Serial Number Tracking
- **Serialization Methods**:
  - Individual entry
  - Range import
  - Pattern-based
  - External system sync

- **Serial Status**:
  - In Stock
  - Issued
  - Returned
  - Under Warranty
  - Retired

## 9.7 Quality Control

### Hold Management
1. **Place on Hold**
   - Select items/batches
   - Specify reason
   - Set review date
   - Notify quality team

2. **Quality Inspection**
   - Create inspection plan
   - Perform tests
   - Record results
   - Attach certificates

3. **Disposition**
   - Release to stock
   - Return to supplier
   - Rework
   - Scrap

### Quarantine Process
- Automatic quarantine for:
  - Failed inspections
  - Suspect quality
  - Recalled items
  - Customer returns

## 9.8 Reports & Analytics

### Operational Reports
- **Daily Movement**
- **Stock Aging**
- **Transaction History**
- **Adjustment Register**
- **Count Sheets**
- **Expiry Report**

### Performance Metrics
- **Inventory Accuracy**
- **Cycle Count Variance**
- **Stock Turnover**
- **Days of Inventory**
- **Stockout Incidents**
- **Adjustment Trends**

## 9.9 Best Practices

### Transaction Accuracy
- Scan barcodes when possible
- Double-check quantities
- Verify locations
- Document discrepancies
- Review before posting

### Efficiency Tips
- Group similar transactions
- Use mobile devices on floor
- Pre-print labels
- Schedule counts during low activity
- Train staff regularly

### Compliance
- Follow SOPs
- Maintain audit trail
- Secure access
- Regular backups
- Document approvals

## 9.10 Troubleshooting

### Common Issues
**Stock Discrepancies**
- Check pending transactions
- Verify batch/serial numbers
- Review adjustment history
- Look for unposted documents

**Missing Items**
- Check quarantine/hold
- Verify locations
- Look for recent issues
- Review movement history

**System Errors**
- Check network connection
- Verify user permissions
- Clear browser cache
- Contact IT support


# 10. Purchase Requisitions

## 10.1 Creating a Purchase Requisition (PR)

### Initiation
1. **Access PR Module**
   - Navigate to **Procurement → Purchase Requisitions**
   - Click **"New Requisition"**

2. **Header Information**
   - Requisition # (auto-generated)
   - Date
   - Required By Date
   - Priority (Low/Medium/High/Urgent)
   - Department/Project
   - Cost Center
   - Delivery Location
   - Special Instructions

3. **Item Details**
   - Search/Add Items:
     - Item Code/Description
     - Quantity
     - Unit of Measure
     - Estimated Unit Price
     - Total Estimated Cost
     - Accounting Code
     - Need By Date
     - Justification

4. **Supplier Information**
   - Preferred Supplier
   - Alternative Suppliers
   - Quotation Reference
   - Lead Time

5. **Attachments**
   - Quotations
   - Specifications
   - Approval Documents
   - Other Supporting Files

## 10.2 Approval Workflow

### Approval Levels
1. **Department Approval**
   - Budget Check
   - Need Validation
   - Specification Compliance

2. **Financial Approval**
   - Budget Availability
   - Cost Center Validation
   - Financial Compliance

3. **Management Approval**
   - High-Value Approvals
   - Policy Exceptions
   - Strategic Purchases

### Approval Process
- **Automatic Routing** based on:
  - Amount
  - Item Category
  - Department
  - Budget Availability

- **Approval Actions**:
  - Approve
  - Reject (with reason)
  - Request Clarification
  - Delegate
  - Escalate

### Notifications
- Email Alerts
- In-App Notifications
- Escalation Notices
- Status Updates

## 10.3 PR Status Tracking

### Status Types
- **Draft**: Incomplete/Not Submitted
- **Pending Approval**: Awaiting Authorization
- **Approved**: Ready for PO Creation
- **Rejected**: Requires Resubmission
- **Converted to PO**: PR Fulfilled
- **Cancelled**: No Longer Required

### Tracking Actions
- View Status History
- Check Approver Comments
- Monitor Aging
- Track Changes
- View Audit Trail

## 10.4 PR Amendments

### Before Approval
- Edit any field
- Add/Remove Items
- Update Quantities
- Change Dates

### After Approval
- Create Change Request
- Specify Reason
- Get Re-approval
- Version Control

## 10.5 Budget Checking

### Pre-Submission Check
- Available Budget
- Committed Funds
- Pending Approvals
- Fiscal Year Limits

### Budget Holds
- Insufficient Funds
- Budget Freeze
- Fiscal Period Close
- Audit Restrictions

## 10.6 Reporting

### Standard Reports
- **PR Status Report**
- **PR Aging Report**
- **Approval Backlog**
- **Spend by Department**
- **Vendor Analysis**

### Custom Reports
- Date Range Filters
- Department/Cost Center
- Item Categories
- Approval Status
- Budget Impact

## 10.7 Best Practices

### Creating Effective PRs
- Complete All Required Fields
- Accurate Descriptions
- Realistic Delivery Dates
- Proper Budget Codes
- Attach Supporting Docs
- Clear Justification

### Approval Efficiency
- Route to Correct Approvers
- Provide Context
- Respond Promptly
- Use Delegation When Needed
- Monitor for Stuck Approvals

## 10.8 Common Issues

### Rejection Reasons
- Incomplete Information
- Budget Unavailable
- Missing Approvals
- Policy Violations
- Better Pricing Available

### Resolution Steps
- Review Rejection Comments
- Make Necessary Corrections
- Provide Additional Info
- Escalate If Needed
- Resubmit PR

## 10.9 Integration with Other Modules

### Inventory System
- Auto-PR Generation
- Stock Level Triggers
- Reorder Point Alerts
- Suggested Quantities

### Procurement Module
- Direct PR to PO Conversion
- Vendor Comparison
- Historical Pricing
- Contract Compliance

### Financial System
- Budget Commitment
- Cost Allocation
- General Ledger Posting
- Accrual Accounting

## 10.10 Mobile Access

### PR Creation
- Mobile Form Entry
- Barcode Scanning
- Photo Attachments
- Digital Signatures

### Approval Process
- Push Notifications
- Mobile Approval/Rejection
- Offline Capability
- Real-time Sync

### Features
- Dashboard View
- Status Updates
- Document Access
- Approval History


# 11. Purchase Orders

## 11.1 Creating a Purchase Order (PO)

### PO Creation Methods
1. **From Approved PR**
   - Navigate to **Procurement → Purchase Orders**
   - Click **"Create from PR"**
   - Select approved PR(s)
   - Review and convert to PO

2. **Direct PO Creation**
   - Click **"New PO"**
   - Select supplier
   - Add items manually
   - Enter pricing and terms

### PO Header Information
- **PO Number** (auto-generated)
- **Order Date**
- **Expected Delivery Date**
- **Payment Terms** (Net 30, etc.)
- **Shipping Method**
- **Delivery Address**
- **Reference Numbers**
  - PR Number
  - Project Code
  - Contract ID
  - Customer Order # (if applicable)

### Line Items
- Item Code/Description
- Quantity
- Unit of Measure
- Unit Price
- Tax Rate
- Line Total
- Requested Delivery Date
- GL Account
- Cost Center
- Project/Department

### Terms & Conditions
- Payment Terms
- Delivery Terms (FOB, CIF, etc.)
- Quality Requirements
- Penalty Clauses
- Special Instructions
- Incoterms

## 11.2 PO Approval Process

### Approval Routing
- **Auto-Approval**: For low-value, routine orders
- **Manager Approval**: Based on amount thresholds
- **Department Head**: For high-value purchases
- **Finance Approval**: For budget exceptions
- **Executive Approval**: For strategic purchases

### Approval Actions
- **Approve**: Proceed with PO
- **Reject**: Return with comments
- **Request Changes**: Send back to requester
- **Delegate**: Assign to another approver
- **Escalate**: Move to higher authority

### Approval Notifications
- Email alerts
- In-app notifications
- Mobile push notifications
- Escalation notices

## 11.3 PO Management

### PO Status Tracking
- **Draft**: In preparation
- **Pending Approval**: Awaiting authorization
- **Approved**: Ready for sending
- **Sent to Supplier**: Emailed/mailed to vendor
- **Acknowledged**: Vendor confirmation received
- **Partially Received**: Partial delivery
- **Fully Received**: Order complete
- **Invoiced**: Matched with invoice
- **Closed**: All activities complete
- **Cancelled**: Order terminated

### PO Changes
- **Before Sending**:
  - Full edit capability
  - Version control
  - Audit trail

- **After Sending**:
  - Create PO Amendment
  - Track changes
  - Maintain revision history
  - Require re-approval if needed

## 11.4 PO Communication

### Sending to Suppliers
- **Methods**:
  - Email (PDF/EDI)
  - Supplier Portal
  - Fax (if required)
  - Printed/Mailed

### PO Confirmations
- Automatic acknowledgment requests
- Delivery date confirmations
- Backorder notifications
- Shipping updates

### Supplier Portal
- PO access
- Delivery scheduling
- ASN (Advanced Shipping Notice)
- Invoice submission
- Performance feedback

## 11.5 Receiving Against PO

### Three-Way Matching
1. **PO**: Original order details
2. **GRN**: Goods receipt note
3. **Invoice**: Supplier billing

### Receipt Process
1. Access **Inventory → Receiving**
2. Select PO
3. Enter received quantities
4. Record discrepancies
5. Add inspection notes
6. Complete receipt

### Quality Inspection
- Random sampling
- Quality check documentation
- Non-conformance reporting
- Quarantine handling

## 11.6 PO Reporting

### Standard Reports
- **PO Status Report**
- **PO Value Analysis**
- **Vendor Performance**
- **PO Cycle Time**
- **Spend by Category**
- **Budget vs. Actual**

### Custom Reports
- Date range analysis
- Departmental spending
- Item category trends
- Supplier comparison
- Delivery performance

## 11.7 Best Practices

### PO Creation
- Use approved suppliers
- Include complete specifications
- Set realistic delivery dates
- Add clear delivery instructions
- Reference all related documents

### PO Management
- Monitor approval queues
- Track acknowledgments
- Follow up on delays
- Document all changes
- Maintain audit trail

### Cost Control
- Negotiate better terms
- Consolidate orders
- Monitor price variances
- Track early payment discounts
- Analyze spending patterns

## 11.8 Common Issues

### Delivery Problems
- Late deliveries
- Short shipments
- Wrong items
- Damaged goods
- Quality issues

### Resolution Process
1. Document the issue
2. Notify supplier
3. Request correction
4. Update PO if needed
5. Adjust payments
6. Update vendor rating

## 11.9 Integration

### Financial System
- Budget checks
- Commitment accounting
- Invoice matching
- Payment processing
- General ledger posting

### Inventory System
- Auto-update stock levels
- Reorder point calculations
- Stock reservation
- Cost updates

### AP Automation
- Electronic invoicing
- Three-way matching
- Payment scheduling
- Early payment discounts

## 11.10 Mobile Access

### PO Creation
- Mobile-optimized forms
- Barcode scanning
- Photo attachments
- Digital signatures

### Approval Workflow
- Push notifications
- Mobile approvals
- Offline capability
- Real-time sync

### Features
- PO status tracking
- Document access
- Approval history
- Supplier communication


# 12. Goods Receipt Notes (GRN)

## 12.1 GRN Overview

### Purpose of GRN
- Document goods receipt
- Verify against PO
- Update inventory records
- Trigger payments
- Maintain audit trail

### GRN Workflow
1. **Receipt Initiation**
2. **Physical Inspection**
3. **Quantity Verification**
4. **Quality Check**
5. **Documentation**
6. **System Update**
7. **Approval**
8. **Filing**

## 12.2 Creating a GRN

### From Purchase Order
1. Navigate to **Inventory → GRN → New**
2. Select PO from list
3. System auto-fills item details
4. Enter received quantities
5. Add inspection notes
6. Save/Submit

### Direct GRN (No PO)
1. Select **Direct GRN**
2. Enter supplier details
3. Add items manually
4. Attach supporting docs
5. Get approval

### Required Information
- **Supplier Details**
- **PO Reference**
- **Delivery Note #**
- **Receipt Date/Time**
- **Received By**
- **Storage Location**
- **Vehicle Details** (if applicable)
- **Seal Numbers** (for containers)

## 12.3 Receipt Process

### Quantity Verification
- Count all items
- Check unit of measure
- Verify packaging
- Note discrepancies
- Document over/short

### Quality Inspection
- Visual inspection
- Random sampling
- Check for damage
- Verify specifications
- Document findings

### Acceptance Criteria
- Within quantity tolerance
- Meets quality standards
- Matches documentation
- Proper labeling
- Correct packaging

## 12.4 GRN Statuses

### Status Flow
1. **Draft** - In progress
2. **Pending Approval** - Awaiting QA
3. **Partially Received** - More expected
4. **Completed** - Fully received
5. **On Hold** - Quarantine
6. **Rejected** - Return to supplier
7. **Posted** - Inventory updated

### Status Actions
- **Save as Draft**
- **Submit for Approval**
- **Put on Hold**
- **Complete**
- **Cancel**
- **Print**

## 12.5 Discrepancy Handling

### Types of Discrepancies
- **Short Shipment**
- **Over Delivery**
- **Damaged Goods**
- **Wrong Items**
- **Quality Issues**
- **Document Mismatch**

### Resolution Process
1. Document issue
2. Take photos
3. Notify supplier
4. Update GRN status
5. Create return if needed
6. Update PO if necessary
7. Adjust payments

## 12.6 Quality Control

### Inspection Levels
1. **No Inspection** - Trusted suppliers
2. **Random Sampling** - Standard items
3. **100% Inspection** - Critical items

### Quality Documentation
- Inspection checklist
- Test results
- Certificates of Analysis
- Compliance documents
- Photos of issues

### Quarantine Process
1. Move to quarantine area
2. Label clearly
3. Update system status
4. Notify QA team
5. Document all actions

## 12.7 GRN Approval

### Approval Workflow
- **Automatic**: For standard receipts
- **Manual**: For exceptions
- **Multi-level**: For high-value items

### Approval Authority
| Amount | Approver |
|--------|-----------|
| < $1,000 | Supervisor |
| $1,001 - $5,000 | Manager |
| > $5,000 | Department Head |
| Quality Hold | QA Manager |

## 12.8 GRN Reports

### Standard Reports
- **GRN Register**
- **Pending GRNs**
- **GRN Aging**
- **Discrepancy Report**
- **Vendor Performance**
- **Quality Rejections**

### Custom Reports
- Date range analysis
- Department-wise receipts
- Item-wise receipts
- Supplier performance
- Quality metrics

## 12.9 Best Practices

### Receiving Best Practices
- Schedule deliveries
- Prepare receiving area
- Verify before signing
- Document everything
- Update system promptly

### Documentation
- Complete all fields
- Get required signatures
- File properly
- Keep digital copies
- Follow retention policy

### Quality Assurance
- Train receiving staff
- Use checklists
- Document inspections
- Track supplier quality
- Continuous improvement

## 12.10 Integration

### Inventory System
- Real-time updates
- Stock level adjustments
- Location tracking
- Batch/Serial updates

### Financial System
- Accruals
- GRN-based payments
- Cost updates
- Budget tracking

### Supplier Portal
- ASN matching
- Self-billing
- Dispute resolution
- Performance feedback

## 12.11 Mobile GRN

### Features
- Barcode scanning
- Photo documentation
- Digital signatures
- Offline capability
- Real-time sync

### Benefits
- Faster processing
- Reduced errors
- Better documentation
- Immediate updates
- Improved efficiency

## 12.12 Troubleshooting

### Common Issues
**GRN Not Matching PO**
- Verify PO version
- Check for amendments
- Confirm delivery note
- Contact supplier

**System Errors**
- Check network
- Verify permissions
- Clear cache
- Contact IT

**Quality Holds**
- Follow procedure
- Document everything
- Notify stakeholders
- Track resolution


# 13. Batch & Expiry Tracking

## 13.1 Batch Management

### Batch Creation
- **Automatic Generation**
  - System-generated batch numbers
  - Configurable formats
  - Prefix/Suffix options
  - Sequence numbers

- **Manual Entry**
  - Supplier batch numbers
  - Custom batch IDs
  - Import from spreadsheet

### Batch Attributes
- **Core Attributes**:
  - Batch Number (required)
  - Manufacturing Date
  - Expiry Date
  - Production Date
  - Received Date
  - Status (Active/On Hold/Quarantined/Expired)

- **Extended Attributes**:
  - Supplier Batch #
  - COA (Certificate of Analysis)
  - Shelf Life (days)
  - Storage Conditions
  - Manufacturing Plant
  - Country of Origin

### Batch Status Management
- **Active**: Available for use
- **On Hold**: Pending QA release
- **Quarantined**: Under investigation
- **Expired**: Past shelf life
- **Consumed**: Fully used
- **Returned**: Sent back to supplier

## 13.2 Expiry Management

### Expiry Date Tracking
- **Mandatory Fields**:
  - Expiry Date
  - Manufacturing Date
  - Best Before Date (if different)
  - Retest Date (for pharmaceuticals)

### FIFO/FEFO Implementation
- **FIFO (First In, First Out)**
  - Based on receipt date
  - Simple implementation
  - Common for non-perishables

- **FEFO (First Expired, First Out)**
  - Based on expiry date
  - Reduces waste
  - Used for perishables/pharma

### Shelf Life Management
- **Shelf Life Warnings**:
  - 30-day warning
  - 15-day warning
  - 7-day warning
  - Expiry alert

- **Actions**:
  - Move to quarantine
  - Initiate markdowns
  - Create disposition orders
  - Generate destruction orders

## 13.3 Batch Transactions

### Receiving Batches
1. **GRN Creation**
   - Select items with batch tracking
   - Enter/scan batch numbers
   - Input batch details
   - Attach certificates

2. **Quality Release**
   - Hold for inspection
   - Release to active
   - Quarantine if needed
   - Update batch status

### Batch Movements
- **Stock Issues**:
  - Automatic batch selection (FEFO/FIFO)
  - Manual override option
  - Batch mixing rules

- **Transfers**:
  - Batch tracking between locations
  - Quarantine movements
  - Quality status updates

### Batch Adjustments
- **Quantity Adjustments**:
  - Stock takes
  - Write-offs
  - Quality failures
  - Conversion/repackaging

- **Attribute Updates**:
  - Extend expiry
  - Change status
  - Update storage conditions
  - Add test results

## 13.4 Quality Control

### Hold & Release
1. **Initial Hold**:
   - All new batches on hold
   - Awaiting QA release
   - Blocked from issues

2. **Quality Release**:
   - Review documentation
   - Perform tests
   - Update status
   - Release for use

### Quarantine Management
- **Reasons for Quarantine**:
  - Quality concerns
  - Customer returns
  - Temperature excursions
  - Investigation required

- **Quarantine Process**:
  1. Move to quarantine location
  2. Update batch status
  3. Notify QA team
  4. Document findings
  5. Final disposition

## 13.5 Reporting & Alerts

### Batch Traceability
- **Upstream Traceability**:
  - Supplier details
  - Purchase orders
  - Inbound shipments

- **Downstream Traceability**:
  - Sales orders
  - Customer information
  - Production batches

### Expiry Reports
- **Upcoming Expiries**:
  - By date range
  - By item/category
  - By location

- **Expired Stock**:
  - Current expired items
  - Historical expiries
  - Cost of expired goods

### Batch Analytics
- **Aging Analysis**:
  - Days on hand
  - Shelf life remaining
  - Turnover rates

- **Quality Metrics**:
  - Quarantine rates
  - Rejection rates
  - Supplier performance

## 13.6 Best Practices

### Batch Management
- **Numbering**:
  - Consistent format
  - No special characters
  - Avoid confusing characters (1/l, 0/O)

- **Documentation**:
  - Scan all certificates
  - Link to digital files
  - Maintain revision history

### Expiry Management
- **Receiving**:
  - Check dates on receipt
  - Reject short-dated items
  - Negotiate shelf life with suppliers

- **Storage**:
  - Segregate by expiry
  - Clear labeling
  - Regular inspections

## 13.7 Integration

### Production Module
- Batch creation from production
- Raw material batch tracing
- Finished goods tracking
- Yield calculations

### Quality Management
- Quality test results
- Non-conformance tracking
- Corrective actions
- Audit trails

### Mobile Solutions
- Barcode scanning
- Mobile data collection
- Real-time updates
- Photo documentation

## 13.8 Compliance

### Regulatory Requirements
- FDA 21 CFR Part 11
- EU GDP/GMP
- ISO standards
- Industry-specific regulations

### Audit Trail
- Batch history
- Status changes
- Attribute modifications
- User stamps
- Timestamps

## 13.9 Troubleshooting

### Common Issues
**Batch Not Found**
- Check batch number format
- Verify leading zeros
- Check for duplicates
- Review merge history

**Expiry Date Warnings**
- Verify system date
- Check time zone settings
- Review shelf life rules
- Confirm receipt dates

### Error Resolution
1. Document the issue
2. Check system logs
3. Review recent changes
4. Contact support if needed
5. Update procedures

## 13.10 Advanced Features

### Serial-Batch Combination
- Track individual items within batches
- High-value asset tracking
- Warranty management
- Recall precision

### Multi-level Batch Tracking
- Raw material to finished goods
- Batch genealogy
- Impact analysis
- Recall simulation

### Automated Disposition
- Auto-quarantine rules
- Expiry workflows
- Quality hold triggers
- Automated notifications


## 14. Reorder Automation

### 14.1 Overview

#### What is Reorder Automation?
Automated system that monitors stock levels and generates purchase requisitions automatically when items fall below reorder point.

#### Benefits:
- ⏰ Saves time (no manual monitoring)
- 📊 Data-driven decisions
- 🚫 Prevents stockouts
- 💰 Optimizes inventory costs
- 🤖 Works 24/7 automatically
- 📈 Considers demand patterns
- 🎯 Calculates optimal order quantities

#### How It Works:
1. Scheduler runs every hour
2. Checks all item stock levels
3. Compares against reorder point
4. If stock ≤ reorder point:
   → Calculates order quantity
   → Selects optimal supplier
   → Generates PR automatically
   → Creates alert
5. Manager reviews and approves PR
6. PR converted to PO
7. Goods received via GRN
8. Stock replenished

### 14.2 Understanding Reorder Rules

#### What are Reorder Rules?
Configuration that controls how reorder automation works for each item.

#### Rule Components:
1. **Reorder Formula**:
   - **Dynamic**: Calculates based on demand and lead time
     - Formula: `ReorderQty = (AvgDailyDemand × LeadTime) + SafetyStock - CurrentStock`
   - **Fixed**: Always orders fixed minimum quantity
   - **EOQ (Economic Order Quantity)**: Optimizes ordering costs
     - Formula: `EOQ = √((2 × AnnualDemand × OrderingCost) / HoldingCost)`
   - **Seasonal**: Applies multiplier for seasonal demand

2. **Auto-Generate PR**:
   - ✓ Enabled: System creates PR automatically
   - ✗ Disabled: Only generates alert, no PR

3. **Approval Required**:
   - ✓ Yes: PR needs manager approval
   - ✗ No: PR auto-approved (for critical items)

4. **Priority Level**:
   - Critical: Highest priority, auto-approved
   - High: High priority, fast approval needed
   - Medium: Normal priority
   - Low: Can wait

5. **Lead Time Buffer**:
   - Extra days added to supplier lead time
   - Accounts for delays, holidays, etc.
   - Example: Supplier leadtime = 7 days, Buffer = 2 days → Total = 9 days

6. **Order Constraints**:
   - Minimum Order Qty: Minimum amount to order
   - Maximum Order Qty: Maximum amount to order
   - Order Multiple: Must order in multiples (e.g., boxes of 10)

7. **Seasonal Multiplier**:
   - Adjusts order quantity for seasonal demand
   - Example: 1.5× during peak season, 0.7× during low season

### 14.3 Creating Reorder Rules (Admin/Manager)

1. Navigate to: Reorder Automation → Reorder Rules
2. Click "Add Reorder Rule"
3. **Basic Settings**:
   - **Item***: Select item
   - **Warehouse**: Select warehouse (or leave blank for all warehouses)
   - **Reorder Formula***: Select: Dynamic / Fixed / EOQ / Seasonal

4. **Automation Settings**:
   - **Auto-Generate PR**: ✓ (recommended)
   - **Approval Required**: ✓ (uncheck for critical items)
   - **Priority Level**: Select: Critical / High / Medium / Low

5. **Lead Time**:
   - **Lead Time Buffer (days)**: Enter extra days (0-14)

6. **Order Quantities**:
   - **Minimum Order Quantity**: Enter minimum
   - **Maximum Order Quantity**: Enter maximum (optional)
   - **Order Multiple**: Enter (e.g., 10 if must order in boxes of 10)

7. **Custom Overrides (Optional)**:
   - **Custom Reorder Point**: Override item's reorder point
   - **Custom Safety Stock**: Override item's safety stock

8. **For EOQ Formula**:
   - **Annual Demand**: Estimated yearly consumption
   - **Ordering Cost**: Cost per order (admin costs, shipping)
   - **Holding Cost**: Cost to store per unit per year

9. **For Seasonal Formula**:
   - **Seasonal Multiplier**: Factor to adjust (0.1 to 10.0)

10. **Status**:
    - **Active**: ✓ (rule is active)

11. Click "Save Rule"

#### Best Practices:
- Start with Dynamic formula for most items
- Use Fixed for items with unpredictable demand
- Use EOQ for high-value, fast-moving items
- Set Critical priority + Auto-approve for essential items
- Add lead time buffer for unreliable suppliers
- Review and adjust rules monthly based on performance

### 14.4 Monitoring Reorder Automation

#### Navigate to: Reorder Automation → Monitoring Dashboard

#### Dashboard Sections:
1. **Scheduler Status**:
   - Status: Running / Stopped
   - Last Run: Timestamp
   - Next Run: Scheduled time
   - Success Rate: % of successful runs

   **Controls (Admin Only)**:
   - Start Scheduler: Begin automatic checks
   - Stop Scheduler: Pause automation
   - Run Now: Trigger immediate check
   - Configure: Change schedule frequency

2. **Key Metrics**:
   - Total Runs (7 days): Number of scheduler executions
   - PRs Generated (7 days): Auto-PRs created
   - Critical Items: Items below safety stock
   - Average Execution Time: How long checks take

3. **Execution History Chart**:
   - Line graph showing:
     - Items processed per run
     - PRs generated per run
   - Last 10 executions

4. **Critical Stock Alerts**:
   - Table of items below safety stock:
     - Item name, SKU
     - Current stock (red badge)
     - Reorder point
     - Days until stockout
     - Severity (Critical/Warning)
     - Action buttons

5. **Recent Auto-Generated PRs**:
   - Table of recent auto-PRs:
     - PR number
     - Item
     - Quantity
     - Suggested supplier
     - Priority
     - Status (Pending/Approved)
     - Created date

6. **Execution Logs**:
   - Detailed logs of each run:
     - Started time
     - Status (Success/Failed)
     - Items processed
     - Items eligible for reorder
     - PRs generated
     - Execution time
     - Triggered by (Scheduler/Manual)

7. **Reorder Queue**:
   - Items pending PR generation:
     - Item details
     - Current stock
     - Suggested quantity
     - Priority score (0-100)
     - Status (Pending/Processing/Completed)

### 14.5 Demand Forecasting

#### How Forecasting Works:
System analyzes historical consumption to predict future demand.

#### Metrics Calculated:
1. **Average Daily Consumption**:
   - Sum of issues in last 30/60/90 days ÷ Days
   - Used to calculate lead time demand
   - Example: 300 units issued in 30 days → 10 units/day

2. **Demand Variability**:
   - Standard deviation of daily consumption
   - Measures demand consistency
   - High variability → Need more safety stock

3. **Lead Time Demand**:
   - Expected consumption during supplier lead time
   - Formula: `Avg Daily Consumption × Lead Time`
   - Example: 10 units/day × 7 days = 70 units needed

4. **Safety Stock Calculation**:
   - Buffer for demand variability
   - Formula: `Z-score × StdDev × √LeadTime`
   - Z = 1.65 for 95% service level

5. **Reorder Point**:
   - When to trigger reorder
   - Formula: `Lead Time Demand + Safety Stock`
   - Dynamic, adjusts based on actual consumption

#### Viewing Forecasts:
1. Navigate to item details
2. Click "Demand Forecast" tab
3. See:
   - Consumption trend chart
   - Average daily consumption
   - Forecast for next 30/60/90 days
   - Recommended reorder point
   - Recommended safety stock

#### Using Forecasts:
- Review monthly
- Adjust reorder points based on trends
- Identify seasonal patterns
- Plan for demand spikes

### 14.6 Stockout Prediction

#### Predictive Analytics:
System predicts when items will run out of stock.

#### How It Works:
- Current stock level
- Average daily consumption
- Calculation: `Days Until Stockout = Current Stock ÷ Avg Daily Consumption`
- Considers pending PRs/POs

#### Stockout Report:
1. Navigate to: Reorder Automation → Stockout Predictions
2. Shows:
   - Items at risk
   - Current stock
   - Daily consumption rate
   - Days until stockout
   - Estimated stockout date
   - Severity:
     - Critical: < 3 days
     - High: 3-7 days
     - Medium: 7-14 days

3. **Actions**:
   - Items with pending PRs/POs: Monitor delivery
   - Items without orders: Create emergency PR
   - Items with wrong forecast: Review reorder rules

### 14.7 Troubleshooting Reorder Automation

#### Issue: No PRs Being Generated
**Check**:
- Scheduler Status: Is it running?
- Items below reorder point: Are there any?
- Reorder rules: Are they active?
- Item status: Are items Active?
- Logs: Any errors?

#### Issue: Wrong Quantities Being Ordered
**Check**:
- Reorder formula: Is it appropriate?
- Lead time: Is it correct?
- Demand data: Enough historical data?
- Rule settings: Min/max quantities set correctly?

#### Issue: Duplicate PRs Created
**Check**:
- Pending PR check: System should prevent this
- Multiple rules: Only one rule per item/warehouse
- Logs: Review for errors

#### Issue: Critical Items Not Auto-Approved
**Check**:
- Reorder rule: Approval Required = No?
- Priority level: Set to Critical?
- User permissions: Rules configured correctly?

#### Get Help:
- Check execution logs for errors
- Review troubleshooting guide (docs/06-TROUBLESHOOTING.md)
- Contact system administrator

# 15. Reports & Analytics

## 15.1 Report Categories

### Inventory Reports
- **Stock Status**
  - Current stock levels
  - Stock value by location
  - Stock aging
  - Slow-moving items
  - Obsolete inventory

### Transaction Reports
- **Movement Analysis**
  - Receipts register
  - Issues register
  - Adjustments log
  - Transfer history
  - Stock reconciliation

### Financial Reports
- **Valuation Reports**
  - Inventory valuation (FIFO, LIFO, Average)
  - Cost of goods sold
  - Gross margin analysis
  - Depreciation schedule

### Performance Reports
- **KPI Dashboards**
  - Inventory turnover
  - Stockout rate
  - Order fill rate
  - Carrying costs
  - Order cycle time

## 15.2 Standard Reports

### Stock Status Report
- **Parameters**:
  - Date range
  - Location(s)
  - Item/Category
  - Stock level filters
- **Columns**:
  - Item details
  - Opening balance
  - Receipts/Issues
  - Current stock
  - Value
  - Reorder status

### Movement Analysis Report
- **Filters**:
  - Transaction type
  - Date range
  - Item/Category
  - Reference number
- **Analysis**:
  - Quantity movement
  - Value movement
  - Trend analysis
  - Comparison periods

## 15.3 Custom Reports

### Report Builder
1. **Data Source Selection**
   - Tables/Modules
   - Fields
   - Relationships

2. **Layout Design**
   - Column selection
   - Sorting
   - Grouping
   - Subtotals

3. **Filtering**
   - Basic filters
   - Advanced conditions
   - Parameter prompts

4. **Formatting**
   - Conditional formatting
   - Logos/headers
   - Page setup
   - Export options

### Saved Reports
- Personal favorites
- Shared reports
- Scheduled reports
- Report subscriptions

## 15.4 Analytics & Dashboards

### Interactive Dashboards
- **Inventory Overview**
  - Stock value trend
  - Top items by value
  - Critical stock alerts
  - Expiry watchlist

### Drill-Down Capability
- Click to filter
- Drill to detail
- Related reports
- Export options

### Visualizations
- **Chart Types**:
  - Bar/column charts
  - Line/area charts
  - Pie/donut charts
  - Heat maps
  - Gauges/KPIs

## 15.5 Scheduled Reports

### Automation Setup
- Report selection
- Frequency (Daily/Weekly/Monthly)
- Recipients
- Format (PDF/Excel/CSV)
- Delivery method (Email/Portal)

### Distribution Lists
- Role-based
- Department-based
- Custom groups
- External recipients

## 15.6 Export Options

### Formats
- PDF (print-ready)
- Excel (formatted)
- CSV (raw data)
- XML/JSON (integration)
- Email (direct sending)

### Integration
- Business Intelligence tools
- ERP systems
- Data warehouses
- Custom applications

## 15.7 Report Security

### Access Control
- Role-based access
- Row-level security
- Column-level security
- Report-level security

### Audit Trail
- Report access log
- Export history
- Print history
- User activity

## 15.8 Advanced Analytics

### Predictive Analytics
- Demand forecasting
- Stockout prediction
 - Excess inventory analysis
- Seasonal trends

### What-If Analysis
- Scenario planning
- Impact analysis
- Cost optimization
- Service level simulation

## 15.9 Mobile Reporting

### Mobile-Optimized Reports
- Responsive design
- Touch-friendly controls
- Offline access
- Favorites sync

### Mobile App Features
- Push notifications
- Interactive charts
- Annotation tools
- Discussion threads

## 15.10 Best Practices

### Report Design
- Keep it simple
- Focus on key metrics
- Use consistent formatting
- Include filters/parameters
- Add clear titles/descriptions

### Performance Optimization
- Schedule heavy reports
- Use appropriate filters
- Limit data volume
- Optimize queries
- Cache frequently used data

### Data Quality
- Source validation
- Data cleansing
- Exception reporting
- Regular audits


## 16. Alerts & Notifications

### 16.1 Types of Alerts

#### Reorder Alerts:
- Item below reorder point
- Critical: Below safety stock
- Warning: Below reorder point
- Info: Reorder scheduled

#### Expiry Alerts:
- Items expiring in 30 days
- Items expiring in 7 days
- Items expired today
- Items past expiry

#### Operation Alerts:
- PR pending approval
- PO overdue (past expected delivery)
- GRN pending completion
- Stock count variance high

#### System Alerts:
- Reorder scheduler failure
- Data sync issues
- Backup status

### 16.2 Viewing Alerts

#### Notification Bell:
- Top navigation bar
- Badge shows unread count
- Click to see list

#### Alert Panel:
- Shows last 10 alerts
- Color-coded by severity:
  - 🔴 Critical (red)
  - 🟠 Warning (orange)
  - 🔵 Info (blue)
- Click alert to view details
- Click "View All" for full list

#### Alerts Page:
- Navigate to Alerts (sidebar)
- Filters:
  - Severity: All / Critical / Warning / Info
  - Type: All / Reorder / Expiry / Operation / System
  - Status: Unread / Read / All
  - Date Range
- Bulk Actions:
  - Mark selected as read
  - Dismiss selected
  - Export to CSV

### 16.3 Alert Actions

#### Taking Action:
1. Click alert to open
2. Alert Details Show:
   - Title
   - Description
   - Affected item/entity
   - Severity
   - Created date
   - Related data
3. Available Actions:
   - View Item: Go to item details
   - Create PR: If reorder alert
   - View PR: If PR linked
   - Mark as Read
   - Dismiss
4. Click action button

#### Auto-Dismiss:
- Reorder alerts: Dismissed when PR created
- Expiry alerts: Dismissed when item issued/disposed
- Approval alerts: Dismissed when approved/rejected

### 16.4 Alert Escalation

#### How Escalation Works:
- Unread alerts after 24 hours → Escalated
- Severity increased:
  - Info → Warning
  - Warning → Critical
- Manager/Admin notified
- Marked with "Escalated" badge

#### Escalation Notifications:
- Email sent (if configured)
- Dashboard notification
- Escalation logged in alert history

#### Prevent Escalation:
- Act on alerts promptly
- Mark as read if action taken externally
- Configure escalation threshold in settings

### 16.5 Email Notifications (If Configured)

#### Email Alerts Sent For:
- Critical stock levels
- PR pending your approval
- PO overdue
- Item expired
- Reorder scheduler failures
- Escalated alerts

#### Email Contains:
- Alert summary
- Link to system (direct to relevant page)
- Quick action buttons
- Recommended next steps

#### Configure Email Preferences:
1. Navigate to User Profile → Notifications
2. Enable/Disable:
   - Email notifications
   - Alert types to receive
   - Frequency: Immediate / Daily Digest
3. Email Address:
   - Verify email
   - Add alternate emails
4. Click "Save Preferences"

### 16.6 Alert History

#### View Alert History:
- Navigate to Alerts → History
- Shows all alerts (including dismissed)
- Filters:
  - Date range
  - Type
  - Severity
  - Status
- Search:
  - By item name
  - By reference number
- Export:
  - Download as CSV
  - Use for audit/compliance

#### Alert Analytics:
- Navigate to Reports → Alert Analytics
- Shows:
  - Total alerts by type
  - Response time (how long to act)
  - Escalation rate
  - Top items generating alerts
- Use to:
  - Identify problem areas
  - Optimize reorder points
  - Improve response processes

## 17. User Account Management

### 17.1 My Profile

#### Access Profile:
- Click user menu (top right)
- Select "Profile"

#### Profile Information:
- Username (cannot change)
- Full Name
- Email Address
- Phone Number
- Department
- Role (displayed, cannot self-change)
- Profile Photo (upload)
- Last Login Date
- Account Created Date

#### Edit Profile:
1. Click "Edit Profile"
2. Update editable fields
3. Click "Save Changes"

### 17.2 Changing Password

#### Process:
1. Navigate to User Menu → Change Password
2. Enter Current Password
3. Enter New Password
   - Minimum 8 characters
   - Mix of uppercase, lowercase
   - At least one number
   - Special character recommended
4. Enter Confirm New Password
5. Click "Change Password"

#### Password Rules:
- ✓ Minimum 8 characters
- ✓ Cannot be same as username
- ✓ Cannot be last 3 passwords
- ✓ Must change every 90 days (configurable)
- ✓ Cannot contain common words

#### Forgot Password:
1. Login page → Click "Forgot Password"
2. Enter username or email
3. System sends reset link to email
4. Click link (valid 1 hour)
5. Enter new password
6. Confirm password
7. Click "Reset Password"

### 17.3 Notification Preferences

#### Configure Notifications:
1. Navigate to Profile → Notification Settings
2. Alert Notifications:
   - ☑ Reorder alerts
   - ☑ Expiry alerts
   - ☑ Approval requests (Manager/Admin)
   - ☑ System alerts
3. Delivery Method:
   - ☑ In-app notifications
   - ☑ Email notifications
   - ☐ SMS notifications (if available)
4. Email Frequency:
   - ○ Immediate (as they occur)
   - ○ Daily digest (once per day)
   - ○ Weekly summary
5. Quiet Hours:
   - Enable: ☑
   - From: 10:00 PM
   - To: 8:00 AM
   - (No notifications during these hours)
6. Click "Save Preferences"

### 17.4 Activity Log

#### View Your Activity:
- Navigate to Profile → Activity Log
- Shows your actions:
  - Login/Logout times
  - Items created/edited
  - Stock operations performed
  - PRs created
  - Approvals given
  - Reports generated
- Filter By:
  - Date range
  - Action type
  - Module
- Export:
  - Download as CSV
  - Use for personal records

#### Purpose:
- Track your own actions
- Verify what you did when
- Useful for time tracking
- Required for audits

### 17.5 Two-Factor Authentication (If Enabled)

#### Enable 2FA:
1. Navigate to Profile → Security
2. Click "Enable Two-Factor Authentication"
3. Setup:
   - Choose method: Authenticator App / SMS
   - For Authenticator App:
     - Scan QR code with Google Authenticator / Authy
     - Enter 6-digit code to verify
   - For SMS:
     - Enter phone number
     - Receive and enter verification code
4. Backup Codes:
   - System generates 10 backup codes
   - Save these safely (print or secure note)
   - Use if can't access 2FA device
5. Click "Confirm Setup"

#### Login with 2FA:
1. Enter username and password
2. Enter 6-digit code from authenticator
3. Check "Trust this device" (optional, 30 days)
4. Click "Verify"

#### Disable 2FA:
1. Profile → Security
2. Click "Disable 2FA"
3. Enter current password
4. Enter current 2FA code
5. Confirm disable

## 18. Best Practices

### 18.1 Inventory Management Best Practices

#### Regular Cycle Counts:
- ✓ Count 20% of items weekly (all items in 5 weeks)
- ✓ Prioritize high-value items (A items)
- ✓ Count during low activity periods
- ✓ Use two-person teams for accuracy
- ✓ Document all variances
- ✓ Investigate variances > 5%

#### Maintain Data Accuracy:
- ✓ Enter transactions immediately (don't delay)
- ✓ Double-check quantities before saving
- ✓ Use barcode scanners when available
- ✓ Document reasons for adjustments
- ✓ Verify supplier deliveries thoroughly
- ✓ Keep item master data updated

#### Stock Organization:
- ✓ Use logical location hierarchy
- ✓ Store fast-movers in accessible locations
- ✓ Group similar items together
- ✓ Label all locations clearly
- ✓ Implement FEFO for expiry items
- ✓ Keep high-value items secure

#### Reorder Point Management:
- ✓ Review reorder points monthly
- ✓ Adjust based on actual consumption
- ✓ Account for seasonal variations
- ✓ Include safety stock for critical items
- ✓ Consider supplier reliability
- ✓ Update when lead times change

### 18.2 Procurement Best Practices

#### Purchase Requisitions:
- ✓ Provide clear, detailed descriptions
- ✓ Include purpose/justification
- ✓ Check stock before creating PR
- ✓ Attach quotes when available
- ✓ Set realistic required dates
- ✓ Consolidate items to reduce orders

#### Purchase Orders:
- ✓ Verify supplier information
- ✓ Double-check quantities and prices
- ✓ Include clear delivery instructions
- ✓ Specify quality requirements
- ✓ Set realistic delivery dates
- ✓ Keep supplier informed of changes

#### Goods Receipt:
- ✓ Inspect goods upon arrival
- ✓ Count quantities carefully
- ✓ Check quality and specifications
- ✓ Photograph any damages
- ✓ Process GRN same day
- ✓ Report issues immediately

#### Supplier Management:
- ✓ Maintain multiple suppliers per item
- ✓ Track supplier performance
- ✓ Review supplier ratings quarterly
- ✓ Negotiate better terms regularly
- ✓ Build good relationships
- ✓ Communicate clearly and promptly

### 18.3 Batch & Expiry Best Practices

#### Batch Recording:
- ✓ Enter batch details during GRN
- ✓ Use supplier's batch numbers
- ✓ Verify expiry dates carefully
- ✓ Store batch certificates/COAs
- ✓ Link batches to GRN for traceability

#### FEFO Implementation:
- ✓ Trust the system's FEFO suggestions
- ✓ Override only when necessary
- ✓ Document reasons for overrides
- ✓ Train staff on FEFO importance
- ✓ Audit FEFO compliance monthly

#### Expiry Management:
- ✓ Act on expiry alerts promptly
- ✓ Plan usage 30+ days before expiry
- ✓ Discount near-expiry items for quick sale
- ✓ Rotate stock physically (FEFO)
- ✓ Dispose expired items immediately
- ✓ Document disposal properly

### 18.4 Reorder Automation Best Practices

#### Setting Up Rules:
- ✓ Start with dynamic formula
- ✓ Set realistic lead time buffers
- ✓ Use critical priority for essential items
- ✓ Enable auto-approval carefully
- ✓ Set appropriate min/max quantities
- ✓ Test rules before full activation

#### Monitoring Automation:
- ✓ Check dashboard daily
- ✓ Review auto-PRs within 24 hours
- ✓ Investigate failed executions
- ✓ Monitor success rate (target: >95%)
- ✓ Act on critical alerts immediately

#### Optimization:
- ✓ Review rules monthly
- ✓ Adjust based on performance
- ✓ Analyze demand patterns
- ✓ Update seasonal multipliers
- ✓ Refine reorder points
- ✓ Improve forecast accuracy

### 18.5 Security Best Practices

#### Password Security:
- ✓ Use strong, unique passwords
- ✓ Change password every 90 days
- ✓ Never share passwords
- ✓ Enable 2FA if available
- ✓ Log out when finished
- ✓ Don't save passwords in browser

#### Data Protection:
- ✓ Lock screen when away from desk
- ✓ Don't access on public WiFi
- ✓ Clear browser cache regularly
- ✓ Report suspicious activity
- ✓ Don't share account access
- ✓ Verify before clicking links

#### Access Control:
- ✓ Use minimum required permissions
- ✓ Don't log in as others
- ✓ Report lost/stolen devices
- ✓ Review your activity log
- ✓ Request only needed access

### 18.6 Reporting Best Practices

#### Regular Reports:
- ✓ Generate stock summary daily
- ✓ Review expiry report weekly
- ✓ Check slow-movers monthly
- ✓ Analyze ABC quarterly
- ✓ Supplier performance quarterly
- ✓ Financial impact monthly

#### Report Usage:
- ✓ Export to Excel for analysis
- ✓ Share with stakeholders
- ✓ Archive historical reports
- ✓ Act on insights promptly
- ✓ Track KPIs over time
- ✓ Present findings to management

#### Data Quality:
- ✓ Verify report data accuracy
- ✓ Understand report limitations
- ✓ Cross-reference with other data
- ✓ Document assumptions
- ✓ Update report parameters as needed

## 19. FAQs

### General Questions

**Q: Can I use IMRAS on my mobile phone?**
A: Yes, IMRAS is responsive and works on mobile browsers (Chrome, Safari, Firefox). For best experience, use tablet or desktop.

**Q: How often should I back up data?**
A: Your admin performs automatic daily backups. You don't need to do anything. Export important reports for your records.

**Q: Can I customize dashboards?**
A: Currently dashboards are pre-configured by role. Custom dashboards planned for future release.

**Q: How long is data retained?**
A: Transaction data is retained indefinitely for audit purposes. Login logs retained for 1 year.

**Q: Can I export all data?**
A: Admins can export complete datasets. Users can export reports they have access to.

### Inventory Questions

**Q: Why can't I delete an item?**
A: Items with transaction history or current stock cannot be deleted (audit requirement). You can deactivate them instead.

**Q: How do I handle items with multiple units (boxes and pieces)?**
A: Create two items (e.g., "Item X - Box" and "Item X - Piece") or use conversion in UOM (not currently supported - planned feature).

**Q: Can I transfer partial quantities?**
A: Yes, enter the quantity you want to transfer. System validates against available stock.

**Q: Why is my stock count showing variance?**
A: Common causes: (1) Transactions during count, (2) Counting error, (3) Unreported issues, (4) Theft/damage. Investigate and document.

**Q: How do I correct a wrong entry?**
A: Use stock adjustment with reason "Data Entry Error". Document the correction in notes. Large corrections require manager approval.

### Batch & Expiry Questions

**Q: Can I change batch expiry date after creation?**
A: Only Admin can modify batch dates (with audit trail). Contact admin if supplier provided wrong date.

**Q: What if I issued from wrong batch?**
A: Create reversal adjustment for incorrect batch, then issue correctly. Document in notes.

**Q: Can I merge batches?**
A: No, batches cannot be merged for traceability. Keep them separate.

**Q: How do I handle items near expiry?**
A: (1) Plan usage urgently, (2) Discount for quick sale, (3) Return to supplier if possible, (4) Dispose if expired.

### Procurement Questions

**Q: Can I create PO without PR?**
A: Currently not supported. All POs must be created from approved PRs. Manual PO creation planned for future release.

**Q: What if supplier delivers more than ordered?**
A: During GRN, enter actual received quantity. System will flag over-receipt. Manager can accept or reject excess.

**Q: Can I cancel PO after receiving some items?**
A: Yes, you can cancel remaining quantities. Already received items are not affected.

**Q: How do I handle price changes from supplier?**
A: Create new PR with updated price, or adjust PO price (requires manager approval if significant change).

### Reorder Automation Questions

**Q: Why wasn't PR generated for my low stock item?**
A: Check: (1) Is reorder rule active? (2) Is scheduler running? (3) Is item status Active? (4) Are there pending PRs/POs already?

**Q: Can I override auto-generated quantities?**
A: Yes, when reviewing auto-PR, you can modify quantity before approving.

**Q: How often does system check stock levels?**
A: Default: Every hour. Can be configured by admin (e.g., every 2 hours, every 30 minutes).

**Q: Can I disable automation for specific items?**
A: Yes, set reorder rule to inactive OR uncheck "Auto-Generate PR" in rule settings.

**Q: What if demand suddenly spikes?**
A: System adapts based on recent consumption. You can also manually create PR for urgent needs.

### Technical Questions

**Q: My page is loading slowly. What should I do?**
A: (1) Clear browser cache, (2) Close unused tabs, (3) Check internet connection, (4) Try different browser, (5) Contact admin if persists.

**Q: I'm getting "Session expired" error.**
A: Your login session timed out (2 hours inactivity). Simply log in again.

**Q: Can I use IMRAS offline?**
A: No, IMRAS requires internet connection. Planned: Offline mode for mobile app (future release).

**Q: Why can't I see certain menu items?**
A: Menu items are based on your role permissions. Contact admin if you need access to additional features.

**Q: How do I report a bug?**
A: Contact your system administrator with: (1) What you were doing, (2) What happened, (3) Screenshot if possible, (4) Browser and version.

## 20. Getting Help

### Support Contacts

**System Administrator:**
- Name: [Your IT Admin Name]
- Email: admin@yourcompany.com
- Phone: [Phone Number]
- Available: Monday-Friday, 9 AM - 6 PM

**Technical Support:**
- Email: support@yourcompany.com
- Response Time: Within 24 hours
- For urgent issues: Call admin directly

### Additional Resources

**Documentation:**
- User Manual (this document)
- Video Tutorials: [Link to video library]
- Quick Reference Guides: [Link]

**Training:**
- New User Training: Monthly (register with admin)
- Advanced Features Training: Quarterly
- One-on-one sessions: By request

**Feedback:**
- Feature Requests: feedback@yourcompany.com
- Bug Reports: support@yourcompany.com
- General Feedback: Through in-app feedback form

## Appendix A: Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl + K | Global search |
| Ctrl + S | Save current form |
| Ctrl + N | New item (context-dependent) |
| Esc | Close modal/dialog |
| Alt + D | Go to dashboard |
| Alt + I | Go to inventory |
| Alt + N | View notifications |

## Appendix B: Glossary

- **ABC Analysis**: Inventory categorization method - A items (high value), B items (medium), C items (low value)
- **Batch**: Group of items with same manufacturing/expiry dates
- **FEFO**: First-Expired-First-Out - Issue items expiring soonest first
- **FIFO**: First-In-First-Out - Issue oldest items first
- **GRN**: Goods Receipt Note - Document confirming goods received
- **Lead Time**: Time from ordering to receipt of goods
- **Lot**: Manufacturing batch identifier
- **PO**: Purchase Order - Order sent to supplier
- **PR**: Purchase Requisition - Internal request to purchase
- **Reorder Point**: Stock level that triggers reorder
- **Safety Stock**: Buffer stock for unexpected demand
- **SKU**: Stock Keeping Unit - Unique item identifier
- **UOM**: Unit of Measurement (Pcs, Kg, Liters, etc.)
