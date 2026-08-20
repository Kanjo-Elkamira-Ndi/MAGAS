// Row types matching context/database-schema.md 1:1.
// All money fields are integer XAF (no minor unit).

export type UserRole = "customer" | "retailer" | "agent" | "admin";

export type UserStatus = "active" | "suspended" | "banned" | "pending";

export type OrderStatus =
  | "placed"
  | "confirmed"
  | "assigned"
  | "out_for_delivery"
  | "delivered"
  | "cancelled"
  | "failed";

export type PaymentMethod = "cod" | "momo" | "orange";

export type PaymentStatus = "pending" | "success" | "failed";

// Which aggregator actually processed a momo/orange attempt — null for
// cod (no aggregator involved) or a not-yet-attempted online payment.
export type PaymentProvider = "notchpay" | "fapshi";

export type RetailerStatus = "pending" | "approved" | "suspended";

export type AgentStatus = "active" | "inactive";

export type VerificationPurpose =
  | "email_verify"
  | "phone_verify"
  | "password_reset"
  | "agent_invite";

export type AssignmentStatus = "assigned" | "delivered" | "failed";

export interface UserRow {
  id: string;
  role: UserRole;
  email: string | null;
  phone: string | null;
  password_hash: string;
  status: UserStatus;
  created_at: Date;
  updated_at: Date;
}

export interface CustomerRow {
  user_id: string;
  full_name: string;
  default_address_id: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface AddressRow {
  id: string;
  customer_id: string;
  label: string | null;
  line1: string;
  city: string;
  notes: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: Date;
}

export interface RetailerRow {
  id: string;
  user_id: string;
  business_name: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  status: RetailerStatus;
  approved_by: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface ProductRow {
  id: string;
  retailer_id: string;
  brand: string;
  cylinder_size: string;
  price: number;
  availability: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface OrderRow {
  id: string;
  customer_id: string;
  retailer_id: string;
  status: OrderStatus;
  payment_method: PaymentMethod;
  delivery_address: string;
  delivery_latitude: number | null;
  delivery_longitude: number | null;
  total_amount: number;
  created_at: Date;
  updated_at: Date;
}

export interface OrderItemRow {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  price_at_order: number;
}

export interface PaymentRow {
  id: string;
  order_id: string;
  method: PaymentMethod;
  status: PaymentStatus;
  provider: PaymentProvider | null;
  provider_ref: string | null;
  provider_transaction_id: string | null;
  // The decline reason the provider actually sent back, when status is
  // 'failed' — surfaced to the customer and useful for debugging a real
  // decline vs. a code bug.
  failure_reason: string | null;
  amount: number;
  created_at: Date;
  updated_at: Date;
}

export interface DeliveryAgentRow {
  id: string;
  user_id: string | null;
  name: string;
  phone: string;
  status: AgentStatus;
  latitude: number | null;
  longitude: number | null;
  location_updated_at: Date | null;
  created_at: Date;
}

export interface OrderAssignmentRow {
  id: string;
  order_id: string;
  agent_id: string;
  assigned_at: Date;
  status: AssignmentStatus;
}

export interface SessionRow {
  id: string;
  session_token: string;
  user_id: string;
  expires: Date;
}

export interface VerificationTokenRow {
  id: string;
  user_id: string | null;
  token: string;
  purpose: VerificationPurpose;
  expires_at: Date;
  used_at: Date | null;
  created_at: Date;
}
