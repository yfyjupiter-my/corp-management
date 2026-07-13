import { z } from "zod";
import { CIRCUIT_TYPES, DEVICE_TYPES, VPN_STATUSES } from "@/lib/constants/enums";
import { credentialRef, ipString, optionalDate, optionalSafeText } from "./common";

export const ispCircuitSchema = z.object({
  site_id: z.string().uuid(),
  provider: z.string().trim().min(1, "Provider is required").max(120),
  circuit_id: z.string().max(120).optional().or(z.literal("").transform(() => undefined)),
  bandwidth: z.string().max(60).optional().or(z.literal("").transform(() => undefined)),
  type: z.enum(CIRCUIT_TYPES),
  static_ips: z.array(ipString).optional(),
  contract_start: optionalDate,
  contract_end: optionalDate,
  monthly_cost: z.coerce.number().nonnegative().optional(),
  support_phone: z.string().max(40).optional().or(z.literal("").transform(() => undefined)),
  notes: optionalSafeText(2000),
});
export type IspCircuitInput = z.infer<typeof ispCircuitSchema>;

export const networkDeviceSchema = z.object({
  site_id: z.string().uuid(),
  device_type: z.enum(DEVICE_TYPES),
  brand: z.string().max(80).optional().or(z.literal("").transform(() => undefined)),
  model: z.string().max(80).optional().or(z.literal("").transform(() => undefined)),
  hostname: z.string().max(120).optional().or(z.literal("").transform(() => undefined)),
  mgmt_ip: ipString.optional().or(z.literal("").transform(() => undefined)),
  firmware: z.string().max(80).optional().or(z.literal("").transform(() => undefined)),
  serial: z.string().max(120).optional().or(z.literal("").transform(() => undefined)),
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
  dns: z.string().max(200).optional().or(z.literal("").transform(() => undefined)),
  dhcp_range: z.string().max(120).optional().or(z.literal("").transform(() => undefined)),
  notes: optionalSafeText(2000),
});
export type IpSchemeInput = z.infer<typeof ipSchemeSchema>;

export const vlanSchema = z.object({
  site_id: z.string().uuid(),
  vlan_id: z.coerce.number().int().min(1).max(4094), // 802.1Q range
  name: z.string().max(80).optional().or(z.literal("").transform(() => undefined)),
  subnet: ipString.optional().or(z.literal("").transform(() => undefined)),
  purpose: z.string().max(200).optional().or(z.literal("").transform(() => undefined)),
});
export type VlanInput = z.infer<typeof vlanSchema>;

export const vpnLinkSchema = z.object({
  site_id: z.string().uuid(),
  peer: z.string().max(120).optional().or(z.literal("").transform(() => undefined)),
  peer_site_id: z.string().uuid().optional(),
  tunnel_type: z.string().max(60).optional().or(z.literal("").transform(() => undefined)),
  status: z.enum(VPN_STATUSES),
  notes: optionalSafeText(1000),
});
export type VpnLinkInput = z.infer<typeof vpnLinkSchema>;
