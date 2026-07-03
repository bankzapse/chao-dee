export type RoomStatus = "vacant" | "occupied" | "reserved" | "maintenance";
export type ContractStatus = "active" | "ended" | "terminated";
export type MemberRole = "owner" | "admin" | "staff";

export type Organization = {
  id: string;
  name: string;
  created_at: string;
};

export type Profile = {
  id: string;
  org_id: string;
  full_name: string;
  role: MemberRole;
  created_at: string;
};

export type Building = {
  id: string;
  org_id: string;
  name: string;
  address: string;
  note: string;
  created_at: string;
};

export type Room = {
  id: string;
  building_id: string;
  room_number: string;
  floor: number;
  size_sqm: number;
  base_rent: number;
  water_rate: number;
  electricity_rate: number;
  status: RoomStatus;
  note: string;
  created_at: string;
};

export type Tenant = {
  id: string;
  org_id: string;
  full_name: string;
  phone: string;
  email: string;
  id_card: string;
  line_user_id: string;
  line_link_code: string;
  note: string;
  created_at: string;
};

export type Contract = {
  id: string;
  org_id: string;
  room_id: string;
  tenant_id: string;
  start_date: string;
  end_date: string | null;
  rent_amount: number;
  deposit_amount: number;
  status: ContractStatus;
  note: string;
  created_at: string;
};

export type InvoiceStatus = "unpaid" | "partial" | "paid" | "void";
export type PaymentMethod = "cash" | "transfer" | "promptpay" | "other";

export type MeterReading = {
  id: string;
  org_id: string;
  room_id: string;
  period: string;
  water_value: number;
  electric_value: number;
  reading_date: string;
  photo_path: string;
  note: string;
  created_at: string;
};

export type Invoice = {
  id: string;
  org_id: string;
  contract_id: string | null;
  room_id: string;
  tenant_id: string | null;
  period: string;
  issue_date: string;
  due_date: string;
  water_units: number;
  water_amount: number;
  electric_units: number;
  electric_amount: number;
  rent_amount: number;
  other_amount: number;
  discount: number;
  total_amount: number;
  paid_amount: number;
  status: InvoiceStatus;
  note: string;
  created_at: string;
};

export type InvoiceItem = {
  id: string;
  invoice_id: string;
  description: string;
  amount: number;
  created_at: string;
};

export type Payment = {
  id: string;
  org_id: string;
  invoice_id: string;
  amount: number;
  method: PaymentMethod;
  paid_at: string;
  slip_path: string;
  note: string;
  created_at: string;
};

export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "cancelled"
  | "expired";
export type BillingCycle = "monthly" | "yearly";

export type Subscription = {
  id: string;
  org_id: string;
  package_slug: string;
  cycle: BillingCycle;
  status: SubscriptionStatus;
  price: number;
  started_at: string;
  expires_at: string | null;
  note: string;
  created_at: string;
  updated_at: string;
};

export type MaintenanceStatus = "open" | "in_progress" | "done" | "cancelled";
export type ParcelStatus = "pending" | "picked_up";
export type VehicleType = "car" | "motorcycle" | "other";

export type MaintenanceRequest = {
  id: string;
  org_id: string;
  room_id: string | null;
  tenant_id: string | null;
  title: string;
  description: string;
  status: MaintenanceStatus;
  source: string;
  created_at: string;
  updated_at: string;
};

export type Parcel = {
  id: string;
  org_id: string;
  room_id: string | null;
  tenant_id: string | null;
  recipient: string;
  carrier: string;
  tracking_no: string;
  status: ParcelStatus;
  received_at: string;
  picked_up_at: string | null;
  note: string;
  created_at: string;
};

export type Vehicle = {
  id: string;
  org_id: string;
  tenant_id: string | null;
  room_id: string | null;
  plate: string;
  vehicle_type: VehicleType;
  brand: string;
  color: string;
  sticker_no: string;
  note: string;
  created_at: string;
};

export type BuildingExpense = {
  id: string;
  org_id: string;
  building_id: string;
  category: string;
  amount: number;
  expense_date: string;
  note: string;
  created_at: string;
};
