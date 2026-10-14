CREATE TABLE IF NOT EXISTS InvoiceMaster (
  InvoiceNumber TEXT PRIMARY KEY, InvoiceDate DATE NOT NULL, OrderNumber TEXT NOT NULL UNIQUE,
  CustomerName TEXT NOT NULL, BillToCompany TEXT NOT NULL, BillToAddress TEXT NOT NULL,
  ShipToCompany TEXT NOT NULL, ShipToAddress TEXT NOT NULL, CustomerEmail TEXT NOT NULL,
  CustomerPhone TEXT NOT NULL, ContractNumber TEXT NOT NULL, Currency TEXT NOT NULL DEFAULT 'USD',
  TotalAmount REAL NOT NULL DEFAULT 0, TaxAmount REAL NOT NULL DEFAULT 0,
  InvoiceStatus TEXT NOT NULL DEFAULT 'Open', FedExTrackingNumber TEXT,
  ConsignmentAvailable INTEGER NOT NULL DEFAULT 0, CreatedDate DATETIME NOT NULL
);
CREATE TABLE IF NOT EXISTS InvoiceLineItems (
  LineId INTEGER PRIMARY KEY AUTOINCREMENT, InvoiceNumber TEXT NOT NULL REFERENCES InvoiceMaster(InvoiceNumber),
  ProductCode TEXT NOT NULL, ProductName TEXT NOT NULL, Quantity INTEGER NOT NULL,
  UnitPrice REAL NOT NULL, LineAmount REAL NOT NULL, HSNCode TEXT NOT NULL,
  CountryOfOrigin TEXT NOT NULL DEFAULT 'United States'
);
CREATE TABLE IF NOT EXISTS ProductCatalog (
  ProductCode TEXT PRIMARY KEY, ProductName TEXT NOT NULL, ProductCategory TEXT NOT NULL,
  Description TEXT NOT NULL, HSNCode TEXT NOT NULL, UnitPrice REAL NOT NULL,
  UOM TEXT NOT NULL DEFAULT 'EA', ActiveFlag INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS ConsignmentDetails (
  TrackingNumber TEXT PRIMARY KEY, AWBNumber TEXT NOT NULL UNIQUE, ShipmentType TEXT NOT NULL,
  FedExService TEXT NOT NULL, ShipDate DATE NOT NULL, PickupDate DATE NOT NULL,
  BookingReference TEXT NOT NULL, ShipperName TEXT NOT NULL, ShipperAddress TEXT NOT NULL,
  ShipperPhone TEXT NOT NULL, ShipperEmail TEXT NOT NULL, RecipientName TEXT NOT NULL,
  RecipientAddress TEXT NOT NULL, RecipientPhone TEXT NOT NULL, RecipientEmail TEXT NOT NULL,
  TotalPieces INTEGER NOT NULL, TotalActualWeight REAL NOT NULL, TotalChargeableWeight REAL NOT NULL,
  ShipmentPurpose TEXT NOT NULL, Currency TEXT NOT NULL, TotalCustomsValue REAL NOT NULL,
  OrderStatus TEXT NOT NULL, WorkflowStatus TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS CustomerEmails (
  EmailId INTEGER PRIMARY KEY AUTOINCREMENT, SenderEmail TEXT NOT NULL, Subject TEXT NOT NULL,
  EmailBody TEXT NOT NULL, InvoiceNumber TEXT NOT NULL, OrderNumber TEXT NOT NULL,
  TrackingNumber TEXT, ReceivedDate DATETIME NOT NULL, ActivityStatus TEXT NOT NULL
);
