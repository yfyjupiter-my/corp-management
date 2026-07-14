import { z } from "zod";
import { CIRCUIT_TYPES, DEVICE_TYPES, VPN_STATUSES } from "@/lib/constants/enums";
import {
  credentialRef,
  ipString,
  optionalDate,
  optionalSafeText,
  optionalString,
} from "./common";

export const ispCircuitSchema = z.object({
  site_id: z.string().uuid(),
  provider: z.string().trim().min(1, "Provider is required").max(120),
  circuit_id: optionalString(120),
  bandwidth: optionalString(60),
  type: z.enum(CIRCUIT_TYPES),
  static_ips: z.array(ipString).optional(),
  contract_start: optionalDate,
  contract_end: optionalDate,
  monthly_cost: z.coerce.number().nonnegative().optional(),
  support_phone: optionalString(40),
  notes: optionalSafeText(2000),
});
export type IspCircuitInput = z.infer<typeof ispCircuitSchema>;

export const networkDeviceSchema = z.object({
  site_id: z.string().uuid(),
  device_type: z.enum(DEVICE_TYPES),
  brand: optionalString(80),
  model: optionalString(80),
  hostname: optionalString(120),
  mgmt_ip: ipString.optional().or(z.literal("").transform(() => undefined)),
  firmware: optionalString(80),
  serial: optionalString(120),
  install_date: optionalDate,
  warranty_end: optionalDate,
  credential_ref: credentialRef,
  notes: optionalSafeText(2000),
});
export type NetworkDeviceInput = z.infer<typeof networkDeviceSchema>;

export const ipSchemeSchema = z.object({
  site_id: z.string().uuid(),
  subnet: ipString, // required — the scheme's network/CIDR
  gateway: ipString.optional().or(z.literal("").transform(() => undefined)),
  dns: optionalString(200),
  dhcp_range: optionalString(120),
  notes: optionalSafeText(2000),
});
export type IpSchemeInput = z.infer<typeof ipSchemeSchema>;

export const vlanSchema = z.object({
  site_id: z.string().uuid(),
  vlan_id: z.coerce.number().int().min(1).max(4094), // 802.1Q range
  name: optionalString(80),
  subnet: ipString.optional().or(z.literal("").transform(() => undefined)),
  purpose: optionalString(200),
});
export type VlanInput = z.infer<typeof vlanSchema>;

export const vpnLinkSchema = z.object({
  site_id: z.string().uuid(),
  peer: optionalString(120),
  peer_site_id: z.string().uuid().optional(),
  tunnel_type: optionalString(60),
  status: z.enum(VPN_STATUSES),
  notes: optionalSafeText(1000),
});
export type VpnLinkInput = z.infer<typeof vpnLinkSchema>;
