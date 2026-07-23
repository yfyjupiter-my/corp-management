/**
 * Database types for the Supabase schema (supabase/migrations).
 *
 * Hand-authored for the scaffold. Once the schema is applied you can regenerate
 * this file with:
 *   supabase gen types typescript --local > lib/types/database.ts
 * and keep the generated version as the source of truth.
 */
import type { CountryCode } from "@/lib/constants/countries";
import type {
  UserRole,
  CircuitType,
  DeviceType,
  CameraType,
  CameraStatus,
  VpnStatus,
  MaintenanceTarget,
} from "@/lib/constants/enums";
import type { Locale } from "@/lib/i18n/config";

/** Columns maintained by the DB / audit triggers — never sent by clients. */
type AutoCols = "created_by" | "created_at" | "updated_at";

/**
 * Insert/Update payload for an inventory Row: everything writable is optional
 * (Postgres defaults + NOT NULL enforce requirements at runtime; Zod enforces
 * them before the write). `last_verified_at` stays writable for the Verify action.
 */
type Writable<Row> = Partial<Omit<Row, AutoCols>>;

type Timestamps = {
  created_by: string | null;
  created_at: string;
  updated_at: string;
  last_verified_at: string | null;
};

type InventoryTable<Row> = {
  Row: Row;
  Insert: Writable<Row>;
  Update: Writable<Row>;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          user_id: string;
          full_name: string | null;
          role: UserRole;
          country_code: CountryCode | null;
          locale: Locale | null; // null = follow the app default (en)
          created_at: string;
        };
        Insert: {
          user_id: string;
          full_name?: string | null;
          role: UserRole;
          country_code?: CountryCode | null;
          locale?: Locale | null;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      country_settings: {
        Row: {
          country_code: CountryCode;
          min_retention_days: number;
          review_cycle_months: number;
        };
        Insert: {
          country_code: CountryCode;
          min_retention_days?: number;
          review_cycle_months?: number;
        };
        Update: Partial<Database["public"]["Tables"]["country_settings"]["Insert"]>;
        Relationships: [];
      };
      sites: InventoryTable<
        {
          id: string;
          country_code: CountryCode;
          name: string;
          address: string | null;
          timezone: string;
          currency: string;
          contact_name: string | null;
          contact_phone: string | null;
          contact_email: string | null;
          notes: string | null;
          archived_at: string | null;
        } & Timestamps
      >;
      isp_circuits: InventoryTable<
        {
          id: string;
          site_id: string;
          provider: string;
          circuit_id: string | null;
          bandwidth: string | null;
          type: CircuitType;
          static_ips: string[] | null;
          contract_start: string | null;
          contract_end: string | null;
          monthly_cost: number | null;
          support_phone: string | null;
          notes: string | null;
        } & Timestamps
      >;
      network_devices: InventoryTable<
        {
          id: string;
          site_id: string;
          device_type: DeviceType;
          brand: string | null;
          model: string | null;
          hostname: string | null;
          mgmt_ip: string | null;
          firmware: string | null;
          serial: string | null;
          install_date: string | null;
          warranty_end: string | null;
          credential_ref: string | null;
          attributes: Record<string, unknown>;
          notes: string | null;
        } & Timestamps
      >;
      ip_schemes: InventoryTable<
        {
          id: string;
          site_id: string;
          subnet: string;
          gateway: string | null;
          dns: string | null;
          dhcp_range: string | null;
          notes: string | null;
        } & Timestamps
      >;
      vlans: InventoryTable<
        {
          id: string;
          site_id: string;
          vlan_id: number;
          name: string | null;
          subnet: string | null;
          purpose: string | null;
        } & Timestamps
      >;
      vpn_links: InventoryTable<
        {
          id: string;
          site_id: string;
          peer: string | null;
          peer_site_id: string | null;
          tunnel_type: string | null;
          status: VpnStatus;
          notes: string | null;
        } & Timestamps
      >;
      cctv_recorders: InventoryTable<
        {
          id: string;
          site_id: string;
          brand: string | null;
          model: string | null;
          channels: number | null;
          storage_tb: number | null;
          retention_days: number | null;
          firmware: string | null;
          mgmt_ip: string | null;
          location: string | null;
          notes: string | null;
        } & Timestamps
      >;
      cctv_cameras: InventoryTable<
        {
          id: string;
          recorder_id: string;
          label: string;
          location_desc: string | null;
          camera_type: CameraType;
          resolution: string | null;
          outdoor: boolean;
          status: CameraStatus;
          attributes: Record<string, unknown>;
          notes: string | null;
        } & Timestamps
      >;
      maintenance_logs: {
        Row: {
          id: string;
          target_table: MaintenanceTarget;
          target_id: string;
          date: string;
          action: string;
          performed_by: string | null;
          next_due: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: Partial<
          Omit<Database["public"]["Tables"]["maintenance_logs"]["Row"], "created_by" | "created_at">
        >;
        Update: Partial<
          Omit<Database["public"]["Tables"]["maintenance_logs"]["Row"], "created_by" | "created_at">
        >;
        Relationships: [];
      };
      audit_log: {
        Row: {
          id: string;
          actor: string | null;
          action: "insert" | "update" | "delete";
          table_name: string;
          record_id: string | null;
          diff: Record<string, unknown> | null;
          created_at: string;
        };
        // Written only by SECURITY DEFINER triggers; no client insert/update path.
        Insert: {
          id?: string;
          actor?: string | null;
          action: "insert" | "update" | "delete";
          table_name: string;
          record_id?: string | null;
          diff?: Record<string, unknown> | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["audit_log"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      search_registry: {
        Args: { q: string };
        Returns: {
          type: string;
          id: string;
          label: string;
          country_code: CountryCode;
        }[];
      };
      current_role_is_hq: { Args: Record<string, never>; Returns: boolean };
      current_country: { Args: Record<string, never>; Returns: CountryCode | null };
      /** Column-scoped locale writer — profiles has no self-update policy (0005). */
      set_my_locale: { Args: { p_locale: string }; Returns: void };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
