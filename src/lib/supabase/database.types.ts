/**
 * Hand-authored to match supabase/migrations. To regenerate from a live project:
 *   npx supabase gen types typescript --project-id <ref> > src/lib/supabase/database.types.ts
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole =
  | "ADMIN"
  | "SALES"
  | "PRODUCTION"
  | "FINANCE"
  | "CUSTOMER";
export type OrderTypeEnum = "READY_STOCK" | "PRE_ORDER";
export type OrderStatusEnum =
  | "UNPAID"
  | "PAID"
  | "IN_PRODUCTION"
  | "READY"
  | "COMPLETED"
  | "CANCELLED";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          phone_number: string | null;
          role: UserRole;
          address: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          full_name?: string;
          phone_number?: string | null;
          role?: UserRole;
          address?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      categories: {
        Row: {
          id: string;
          name: string;
          slug: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["categories"]["Insert"]>;
        Relationships: [];
      };
      products: {
        Row: {
          id: string;
          category_id: string | null;
          name: string;
          description: string | null;
          price: number;
          image_url: string | null;
          is_preorder: boolean;
          stock: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          category_id?: string | null;
          name: string;
          description?: string | null;
          price: number;
          image_url?: string | null;
          is_preorder?: boolean;
          stock?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["products"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey";
            columns: ["category_id"];
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      orders: {
        Row: {
          id: string;
          order_number: string;
          customer_id: string;
          created_by: string;
          order_type: OrderTypeEnum;
          status: OrderStatusEnum;
          pickup_or_delivery_date: string | null;
          total_amount: number;
          payment_method: string | null;
          payment_receipt_url: string | null;
          payment_submitted_at: string | null;
          paid_at: string | null;
          admin_notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_number?: string;
          customer_id: string;
          created_by: string;
          order_type?: OrderTypeEnum;
          status?: OrderStatusEnum;
          pickup_or_delivery_date?: string | null;
          total_amount?: number;
          payment_method?: string | null;
          payment_receipt_url?: string | null;
          payment_submitted_at?: string | null;
          paid_at?: string | null;
          admin_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["orders"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey";
            columns: ["customer_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_created_by_fkey";
            columns: ["created_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      store_settings: {
        Row: {
          id: number;
          qris_image_url: string | null;
          qris_merchant_name: string | null;
          bank_name: string | null;
          bank_account_number: string | null;
          bank_account_holder: string | null;
          payment_note: string | null;
          tax_rate: number;
          daily_po_item_capacity: number;
          show_tax_on_receipt: boolean;
          show_logo_on_receipt: boolean;
          show_po_instructions: boolean;
          updated_at: string;
        };
        Insert: {
          id?: number;
          qris_image_url?: string | null;
          qris_merchant_name?: string | null;
          bank_name?: string | null;
          bank_account_number?: string | null;
          bank_account_holder?: string | null;
          payment_note?: string | null;
          tax_rate?: number;
          daily_po_item_capacity?: number;
          show_tax_on_receipt?: boolean;
          show_logo_on_receipt?: boolean;
          show_po_instructions?: boolean;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["store_settings"]["Insert"]
        >;
        Relationships: [];
      };
      capital_entries: {
        Row: {
          id: string;
          amount: number;
          entry_date: string;
          note: string | null;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          amount: number;
          entry_date?: string;
          note?: string | null;
          created_by: string;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["capital_entries"]["Insert"]
        >;
        Relationships: [
          {
            foreignKeyName: "capital_entries_created_by_fkey";
            columns: ["created_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      audit_log: {
        Row: {
          id: string;
          actor_id: string | null;
          actor_name: string | null;
          actor_role: UserRole | null;
          action: string;
          entity_type: string;
          entity_id: string | null;
          summary: string;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_id?: string | null;
          actor_name?: string | null;
          actor_role?: UserRole | null;
          action: string;
          entity_type: string;
          entity_id?: string | null;
          summary: string;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["audit_log"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "audit_log_actor_id_fkey";
            columns: ["actor_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      expenses: {
        Row: {
          id: string;
          amount: number;
          category: string;
          note: string | null;
          spent_at: string;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          amount: number;
          category?: string;
          note?: string | null;
          spent_at?: string;
          created_by: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["expenses"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "expenses_created_by_fkey";
            columns: ["created_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string;
          quantity: number;
          price_at_time: number;
          subtotal: number;
        };
        Insert: {
          id?: string;
          order_id: string;
          product_id: string;
          quantity: number;
          price_at_time: number;
          subtotal: number;
        };
        Update: Partial<Database["public"]["Tables"]["order_items"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey";
            columns: ["order_id"];
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_product_id_fkey";
            columns: ["product_id"];
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      finance_orders: {
        Row: {
          id: string;
          order_number: string;
          status: OrderStatusEnum;
          order_type: OrderTypeEnum;
          customer_id: string;
          created_at: string;
          pickup_or_delivery_date: string | null;
          recognised_at: string;
          gross_amount: number;
          net_amount: number;
          tax_amount: number;
          tax_rate: number;
        };
        Relationships: [];
      };
    };
    Functions: {
      current_user_role: {
        Args: Record<string, never>;
        Returns: UserRole;
      };
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      is_finance: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      can_view_finance: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      recalc_order_total: {
        Args: { p_order_id: string };
        Returns: number;
      };
      po_items_committed_on: {
        Args: { target: string };
        Returns: number;
      };
      po_capacity_for: {
        Args: { target: string };
        Returns: {
          capacity: number;
          committed: number;
          remaining: number;
        }[];
      };
    };
    Enums: {
      user_role: UserRole;
      order_type: OrderTypeEnum;
      order_status: OrderStatusEnum;
    };
    CompositeTypes: Record<string, never>;
  };
}

/* Convenience row aliases */
export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
export type CategoryRow = Database["public"]["Tables"]["categories"]["Row"];
export type ProductRow = Database["public"]["Tables"]["products"]["Row"];
export type OrderRow = Database["public"]["Tables"]["orders"]["Row"];
export type OrderItemRow = Database["public"]["Tables"]["order_items"]["Row"];
export type StoreSettingsRow =
  Database["public"]["Tables"]["store_settings"]["Row"];
export type CapitalEntryRow =
  Database["public"]["Tables"]["capital_entries"]["Row"];
export type ExpenseRow = Database["public"]["Tables"]["expenses"]["Row"];
export type FinanceOrderRow =
  Database["public"]["Views"]["finance_orders"]["Row"];
export type AuditLogRow = Database["public"]["Tables"]["audit_log"]["Row"];
