/**
 * English dictionary — the source of truth for both the keys and the
 * `Dictionary` type (TASKS.md 13.2). Every other locale is annotated
 * `: Dictionary`, so a missing or misspelled key there is a `tsc` error.
 *
 * Deliberately NOT `as const`: literal value types would force every locale to
 * repeat the English strings verbatim. Widened `string` values still give exact
 * key-shape checking, which is the whole point of the guard.
 *
 * Seeded with the shared chrome only — each Phase 13 extraction task adds the
 * keys it needs (to this file first, then `zh-TW.ts` follows or the build fails).
 */
export const en = {
  /** Labels reused across every module. */
  common: {
    save: "Save",
    saveChanges: "Save changes",
    saving: "Saving…",
    cancel: "Cancel",
    edit: "Edit",
    delete: "Delete",
    deleting: "Deleting…",
    new: "New",
    viewAll: "View all",
    back: "Back",
    archive: "Archive",
    restore: "Restore",
    archived: "Archived",
    verify: "Verify — still accurate",
    verifying: "Verifying…",
    fresh: "Fresh",
    stale: "Stale",
    /** Placeholder for a missing value in a table cell. */
    empty: "—",
  },

  nav: {
    brand: "Corp Mgmt",
    tagline: "SEA IT Registry",
    groupCountries: "Countries",
    groupModules: "Modules",
    groupAdministration: "Administration",
    dashboard: "Dashboard",
    sites: "Sites",
    network: "Network",
    cctv: "CCTV",
    renewals: "Renewals",
    users: "Users & roles",
    audit: "Audit log",
  },

  /**
   * Country display names. `lib/constants/countries.ts` stays untouched — it is
   * reference data mirroring the `country_code` enum, not UI copy.
   */
  countries: {
    VN: "Vietnam",
    TH: "Thailand",
    ID: "Indonesia",
    MY: "Malaysia",
  },

  topbar: {
    searchPlaceholder: "Search sites, hostnames, IPs, circuit IDs, cameras…",
    /** Role pill / user menu. `manager` is prefixed with the country code. */
    hqAdmin: "HQ Admin",
    manager: "Manager",
    allCountries: "all countries",
    language: "Language",
  },

  /** Table headers, shared across modules. */
  columns: {
    hostname: "Hostname",
    type: "Type",
    model: "Model",
    site: "Site",
    warranty: "Warranty",
    status: "Status",
    provider: "Provider",
    circuitId: "Circuit ID",
    bandwidth: "Bandwidth",
    contractEnd: "Contract end",
    channels: "Channels",
    retention: "Retention",
    location: "Location",
    label: "Label",
    resolution: "Resolution",
    placement: "Placement",
    item: "Item",
    ends: "Ends",
    in: "In",
    contact: "Contact",
    verified: "Verified",
  },

  dashboard: {
    eyebrow: "Overview",
    title: "Registry dashboard",
    subtitleAll: "Infrastructure health across all four SEA offices.",
    subtitleCountry: (country: string) => `Infrastructure health for ${country}.`,
    kpiActiveSites: "Active sites",
    kpiCamerasOnline: "Cameras online",
    kpiCamerasFaulty: "Cameras faulty/offline",
    kpiCircuitsExpiring: "Circuits expiring ≤90d",
    pilot: "Pilot",
    lowRetention: (n: number) => `${n} low retention`,
    statSites: "Sites",
    statDevices: "Devices",
    statCameras: "Cameras",
    statFaultyCams: "Faulty cams",
    statCircuits90d: "Circuits ≤90d",
    retentionTitle: "Recorders below retention minimum",
    retentionUnavailable: "Retention data unavailable.",
    retentionAllOk: "All recorders meet their country’s retention minimum.",
    retentionBelow: (n: number) => `${n} recorder(s) below their country’s minimum`,
    circuitsTitle: "Circuits expiring within 90 days",
    renewalsUnavailable: "Renewal data unavailable.",
    nothingExpiring: "Nothing expiring soon.",
    /** Compact "in N days" chip in a table cell. */
    daysShort: (n: number) => `${n}d`,
  },

  country: {
    title: (country: string) => `${country} dashboard`,
    subtitle: (country: string) =>
      `Sites, network, CCTV, and renewals for ${country} only.`,
    kpiActiveSites: "Active sites",
    kpiNetworkDevices: "Network devices",
    kpiCamerasOnline: "Cameras online",
    staleRecords: "Stale records",
    statDevices: "Devices",
    statCircuits: "ISP circuits",
    statVpn: "VPN links",
    statCircuits90d: "Circuits ≤90d",
    statRecorders: "Recorders",
    statCamerasActive: "Cameras active",
    statFaultyOffline: "Faulty / offline",
    statBelowRetention: (days: number) => `Below ${days}d retention`,
    panelDevices: "Devices",
    panelCircuits: "ISP circuits",
    panelRecorders: "Recorders",
    panelCameras: "Cameras",
    panelDue: "Due within 90 days",
    siteCount: (n: number) => `${n} ${n === 1 ? "site" : "sites"}`,
    openModule: "Open module →",
    showing: (shown: number, total: number) => `Showing ${shown} of ${total} — `,
    deviceDataUnavailable: "Device data temporarily unavailable.",
    circuitDataUnavailable: "Circuit data temporarily unavailable.",
    recorderDataUnavailable: "Recorder data temporarily unavailable.",
    cameraDataUnavailable: "Camera data temporarily unavailable.",
    renewalDataUnavailable: "Renewal data temporarily unavailable.",
    siteDataUnavailable: "Site data temporarily unavailable.",
    nothingDue: (country: string) => `Nothing due in the next 90 days for ${country}.`,
    noSites: (country: string) => `No sites registered yet for ${country}.`,
    noDevices: (country: string) => `No network devices recorded for ${country}.`,
    noCircuits: (country: string) => `No ISP circuits recorded for ${country}.`,
    noRecorders: (country: string) => `No recorders recorded for ${country}.`,
    noCameras: (country: string) => `No cameras recorded for ${country}.`,
    outdoor: "Outdoor",
    indoor: "Indoor",
    /** Renewal row kinds. */
    kindCircuit: "ISP circuit",
    kindWarranty: "Device warranty",
    unnamedDevice: "Device",
  },

  sites: {
    title: "Sites",
    subtitle: "Offices and infrastructure locations, grouped by country.",
    newAction: "+ New",
    noneYet: "No sites registered yet.",
    addFirst: "Add the first site",
    /**
     * Row delete confirmation. Names the cascade on purpose — every child FK is
     * `on delete cascade`, so this removes far more than the site row itself,
     * and unlike Archive it cannot be undone.
     */
    deleteConfirm: (name: string) =>
      `Delete “${name}” permanently? Its ISP circuits, network devices, IP schemes, ` +
      `VLANs, VPN links, CCTV recorders and cameras are deleted with it. ` +
      `This cannot be undone — use Archive instead if you only want it hidden.`,
  },

  site: {
    overview: "Overview",
    timezone: "Timezone",
    currency: "Currency",
    contact: "Contact",
    phone: "Phone",
    email: "Email",
    lastVerified: "Last verified",
    manage: "Manage →",
    panelCircuits: "ISP circuits",
    panelDevices: "Network devices",
    panelIpSchemes: "IP schemes",
    panelVpn: "VPN links",
    panelRecorders: "CCTV recorders",
    noCircuits: "No ISP circuits for this site.",
    noDevices: "No network devices for this site.",
    noIpSchemes: "No IP schemes for this site.",
    noVpn: "No VPN links for this site.",
    noRecorders: "No CCTV recorders for this site.",
    colCircuit: "Circuit",
    colMonthly: "Monthly",
    colMgmtIp: "Mgmt IP",
    colCredential: "Credential",
    colSubnet: "Subnet",
    colGateway: "Gateway",
    colDns: "DNS",
    colPeer: "Peer",
    networkTitle: "IP schemes & VLANs",
    networkSubtitle: "Subnets, gateways, DNS, DHCP ranges, and the site’s VLAN table.",
    backToSite: "← Back to site",
    panelVlans: "VLANs",
    noIpSchemesYet: "No IP schemes for this site yet.",
    noVlansYet: "No VLANs for this site yet.",
    colDhcpRange: "DHCP range",
    colNotes: "Notes",
    colVlan: "VLAN",
    colName: "Name",
    colPurpose: "Purpose",
    colTunnel: "Tunnel",
  },

  network: {
    title: "Network",
    subtitle: "ISP circuits, routers, firewalls, switches, and access points.",
    newCircuit: "New circuit",
    newFirewall: "New Firewall",
    panelDevices: "Devices",
    panelCircuits: "ISP circuits",
    noDevices: "No network devices recorded yet.",
    noCircuits: "No ISP circuits recorded yet.",
    deleteConfirm: (name: string) =>
      `Delete device “${name}” permanently? This cannot be undone.`,
    deleteCircuitConfirm: (name: string) =>
      `Delete ISP circuit “${name}” permanently? This cannot be undone.`,
  },

  cctv: {
    title: "CCTV",
    subtitle: "Recorders, cameras, and retention.",
    newRecorder: "New recorder",
    newCamera: "New camera",
    panelRecorders: "Recorders",
    panelCameras: "Cameras",
    noRecorders: "No recorders recorded yet.",
    noCameras: "No cameras recorded yet.",
    /** Cameras cascade with the recorder (`cctv_cameras.recorder_id`). */
    deleteRecorderConfirm: (name: string) =>
      `Delete recorder “${name}” permanently? Every camera on it is deleted too. ` +
      `This cannot be undone.`,
    deleteCameraConfirm: (name: string) =>
      `Delete camera “${name}” permanently? This cannot be undone.`,
    /** Retention in days, rendered in a table cell. */
    daysShort: (n: number) => `${n}d`,
  },

  renewals: {
    title: "Renewals",
    subtitle: "ISP contracts and device warranties approaching their end date.",
    windowPill: (days: number) => `Next ${days} days`,
    allCountries: "All countries",
    unavailableTitle: "Renewal data unavailable",
    unavailable: "Renewal data is temporarily unavailable. Please try again.",
    resultCount: (n: number, days: number) => `${n} item(s) within ${days} days`,
    nothingExpiring: (days: number) => `Nothing expiring in the next ${days} days`,
    kindContract: "ISP contract",
    kindWarranty: "Device warranty",
    expired: "Expired",
    colCountry: "Country",
    unnamedDevice: "device",
  },

  audit: {
    title: "Audit log",
    subtitle: "Every create, update, and delete — immutable, most recent first.",
    unavailableTitle: "Audit log unavailable",
    unavailable: "The audit log is temporarily unavailable. Please try again.",
    noActivityTitle: "No activity",
    noActivity: "No activity recorded yet.",
    entryCount: (n: number) => `${n} entr${n === 1 ? "y" : "ies"}`,
    colWhen: "When",
    colAction: "Action",
    colTable: "Table",
    colRecord: "Record",
    colActor: "Actor",
    colChanges: "Changes",
    systemActor: "system",
    pageOf: (page: number, total: number) => `Page ${page} of ${total}`,
    newer: "← Newer",
    older: "Older →",
    /** DiffCell toggle, e.g. "Show 3 fields". */
    showFields: (n: number) => `Show ${n} field${n === 1 ? "" : "s"}`,
    hideFields: (n: number) => `Hide ${n} field${n === 1 ? "" : "s"}`,
  },

  users: {
    title: "Users & roles",
    subtitle: "Invite users and assign a role and country. Public sign-up is disabled.",
    userCount: (n: number) => `${n} user(s)`,
    none: "No users yet.",
    colName: "Name",
    colRole: "Role",
    colCountry: "Country",
    colAdded: "Added",
    roleHqAdmin: "HQ Admin",
    roleCountryManager: "Country Manager",
    allCountries: "ALL",
    invitePanel: "Invite a user",
    fieldFullName: "Full name",
    fieldEmail: "Email",
    fieldRole: "Role",
    fieldCountry: "Country",
    selectPlaceholder: "Select…",
    sending: "Sending…",
    sendInvite: "Send invite",
    inviteFailed: "Failed to send invite.",
    inviteSent: "Invite sent. The user will set their password from the email link.",
  },

  search: {
    title: "Search",
    eyebrow: "Search",
    pageTitle: "Global search",
    tooShort: "Type at least 2 characters to search.",
    unavailable: "Search is temporarily unavailable. Please try again.",
    noMatches: (query: string) => `No matches for “${query}”.`,
    typeSite: "Site",
    typeDevice: "Device",
    typeCircuit: "Circuit",
    typeCamera: "Camera",
  },

  auth: {
    logOut: "Log out",
    signingOut: "Signing out…",
    brand: "Corp Management",
    tagline: "SEA IT Infrastructure Registry",
    signInTitle: "Sign in",
    signInSubtitle: "Use the account your HQ admin created for you.",
    noPublicSignup: "No public sign-up · accounts invited by HQ admin",
    email: "Email",
    password: "Password",
    emailPlaceholder: "you@example.com",
    forgotPassword: "Forgot password?",
    signingIn: "Signing in…",
    signIn: "Sign in",
    resetTitle: "Reset your password",
    resetSubtitle:
      "Enter your account email and we’ll send you a link to set a new password.",
    sending: "Sending…",
    sendResetLink: "Send reset link",
    rememberedIt: "Remembered it?",
    backToSignIn: "Back to sign in",
    newPasswordTitle: "Choose a new password",
    newPasswordSubtitle: "Enter a new password for your account below.",
    newPassword: "New password",
    confirmPassword: "Confirm password",
    passwordsDoNotMatch: "Passwords do not match.",
    linkInvalid: "This reset link is invalid or has expired. Request a new one.",
    requestNewLink: "Request a new link",
    passwordUpdated: "Password updated. Signing you in…",
    updating: "Updating…",
    updatePassword: "Update password",
    noAccessTitle: "Account not provisioned",
    noAccessBody:
      "You’re signed in, but your account hasn’t been assigned a role or country yet. Ask your HQ admin to provision access, then sign in again.",
    signOut: "Sign out",
    notFoundTitle: "Page not found",
    notFoundBody: "That page doesn’t exist or you can’t access it.",
    backToDashboard: "Back to dashboard",
    metaTitle: "Corp Management — SEA IT Registry",
    metaDescription:
      "Network & CCTV infrastructure registry for the company’s Southeast Asia offices.",
  },

  /** Field labels, placeholders, help text and create/edit page headings (13.28). */
  forms: {
    labels: {
      site: "Site",
      type: "Type",
      brand: "Brand",
      model: "Model",
      hostname: "Hostname",
      mgmtIp: "Management IP",
      firmware: "Firmware",
      serial: "Serial",
      installDate: "Install date",
      warrantyEnd: "Warranty end",
      credentialRef: "Credential reference",
      notes: "Notes",
      country: "Country",
      siteName: "Site name",
      address: "Address",
      timezone: "Timezone",
      currency: "Currency",
      contactName: "Contact name",
      contactPhone: "Contact phone",
      contactEmail: "Contact email",
      provider: "Provider",
      circuitId: "Circuit ID",
      bandwidth: "Bandwidth",
      staticIps: "Static IPs",
      monthlyCost: "Monthly cost",
      contractStart: "Contract start",
      contractEnd: "Contract end",
      supportPhone: "Support phone",
      label: "Label",
      recorder: "Recorder",
      resolution: "Resolution",
      status: "Status",
      placement: "Placement",
      outdoor: "Outdoor",
      location: "Location",
      channels: "Channels",
      storageTb: "Storage (TB)",
      retentionDays: "Retention (days)",
      subnetCidr: "Subnet / CIDR",
      subnet: "Subnet",
      gateway: "Gateway",
      dns: "DNS",
      dhcpRange: "DHCP range",
      vlanId: "VLAN ID",
      name: "Name",
      purpose: "Purpose",
    },

    /**
     * Input placeholders. The technical examples (brands, hostnames, IPs,
     * versions) are sample *data* and read the same in both locales — they are
     * listed here anyway so all form copy lives in one place.
     */
    ph: {
      deviceBrand: "Fortinet",
      deviceModel: "FortiGate 60F",
      hostname: "kl-fw-01",
      mgmtIp: "10.10.0.1",
      firmware: "7.4.3",
      serial: "FG60F-…",
      credentialRef: "vault://it/kl-fw-01",
      siteName: "Kuala Lumpur HQ",
      address: "Level 12, Menara …",
      timezone: "Asia/Kuala_Lumpur",
      currency: "MYR",
      contactName: "Site IT lead",
      contactPhone: "+60 …",
      contactEmail: "it.kl@example.com",
      provider: "TM Unifi",
      circuitId: "TM-KL-004821",
      bandwidth: "1 Gbps",
      staticIps: "203.0.113.10, 203.0.113.11",
      monthlyCost: "899.00",
      supportPhone: "100",
      cameraLabel: "CAM-01",
      resolution: "4MP",
      recorderLocation: "Server room",
      recorderBrand: "Hikvision",
      recorderModel: "DS-7616NI",
      recorderFirmware: "4.31.005",
      channels: "16",
      storageTb: "8",
      retentionDays: "30",
      recorderMgmtIp: "10.10.0.20",
      subnet: "10.10.0.0/24",
      gateway: "10.10.0.1",
      dns: "10.10.0.1, 1.1.1.1",
      dhcpRange: "10.10.0.100–200",
      ipSchemeNotes: "VLAN 10 · office LAN",
      vlanId: "10",
      vlanName: "office",
      vlanSubnet: "10.10.10.0/24",
      vlanPurpose: "Staff workstations",
    },

    help: {
      credentialRef: "Password-manager link — never paste the secret.",
      staticIps: "Comma or space separated.",
      retentionDays: "Flagged if below the country minimum.",
      noRecordersOnSite: "No recorders on this site yet.",
    },

    select: {
      site: "Select a site…",
      recorder: "Select a recorder…",
      siteFirst: "Select a site first…",
    },

    actions: {
      addIpScheme: "Add IP scheme",
      addVlan: "Add VLAN",
    },

    /** Fallback shown when a save fails without a message from the server. */
    saveFailed: {
      site: "Could not save site.",
      device: "Could not save device.",
      circuit: "Could not save circuit.",
      camera: "Could not save camera.",
      recorder: "Could not save recorder.",
      ipScheme: "Could not save IP scheme.",
      vlan: "Could not save VLAN.",
    },

    /** Create/edit page headings — the form renders these itself. */
    pages: {
      newSiteTitle: "New site",
      newSiteSubtitle:
        "Register an office or infrastructure location. All records hang off a site.",
      editSiteTitle: (name: string) => `Edit · ${name}`,
      editSiteSubtitle: "Update site details.",
      newDeviceTitle: "New device",
      newDeviceSubtitle: "Register a router, firewall, switch, or access point.",
      editDeviceTitle: (name: string) => `Edit · ${name}`,
      editDeviceSubtitle: "Update device details.",
      newFirewallTitle: "New Firewall",
      newFirewallSubtitle:
        "Register a perimeter firewall: model, management address, firmware, and support dates.",
      newCircuitTitle: "New ISP circuit",
      newCircuitSubtitle:
        "Register a fiber, broadband, or LTE circuit and its contract details.",
      editCircuitTitle: (name: string) => `Edit · ${name}`,
      editCircuitSubtitle: "Update circuit and contract details.",
      newCameraTitle: "New camera",
      newCameraSubtitle: "Register a camera against a recorder.",
      editCameraTitle: "Edit camera",
      newRecorderTitle: "New recorder",
      newRecorderSubtitle: "Register an NVR/DVR, its capacity, and retention window.",
      editRecorderTitle: "Edit recorder",
      editRecorderSubtitle: "Update recorder details.",
      noRecordersYet: "No recorders yet.",
      addRecorderFirst: "Add a recorder first",
    },
  },

  /**
   * Zod messages. The schemas carry `v.*` keys (see `lib/i18n/validation.ts`)
   * because they are built at module scope, where there is no locale.
   */
  validation: {
    secret:
      "This looks like it may contain a secret. Store a reference to your password " +
      "manager entry instead — never paste the actual credential.",
    ip: "Enter a valid IP address or CIDR",
    date: "Use YYYY-MM-DD",
    email: "Enter a valid email",
    siteName: "Site name is required",
    provider: "Provider is required",
    label: "Label is required",
    fullName: "Name is required",
    countryRequired: "Country managers must be assigned a country",
    countryForbidden: "HQ admins are not scoped to a country",
  },

  /**
   * Enum value labels, keyed by the raw DB value. `lib/constants/enums.ts` is
   * left untouched — it mirrors the Postgres check constraints, not the UI.
   * These replace the old `capitalize` spans, which are meaningless in Chinese.
   */
  enums: {
    deviceType: {
      router: "Router",
      firewall: "Firewall",
      switch: "Switch",
      ap: "Access point",
      other: "Other",
    },
    circuitType: {
      fiber: "Fiber",
      broadband: "Broadband",
      lte: "LTE",
    },
    cameraType: {
      dome: "Dome",
      bullet: "Bullet",
      ptz: "PTZ",
      other: "Other",
    },
    cameraStatus: {
      active: "Active",
      faulty: "Faulty",
      offline: "Offline",
    },
    vpnStatus: {
      up: "Up",
      down: "Down",
      unknown: "Unknown",
    },
    /** `lower(tg_op)` from the audit trigger (0003_audit.sql). */
    auditAction: {
      insert: "Insert",
      update: "Update",
      delete: "Delete",
    },
  },

  /**
   * API route responses (13.30). These render directly in the forms, so a
   * Route Handler resolves them with `getDictionary()` before responding.
   */
  errors: {
    generic: "Something went wrong. Please try again.",
    unavailable: "Temporarily unavailable. Please try again.",
    serverError: "Something went wrong.",
    unauthorized: "Unauthorized",
    forbidden: "Forbidden",
    invalidPayload: "Invalid payload",
    nothingToUpdate: "Nothing to update",
    tooManyRequests: "Too many requests. Please slow down and try again shortly.",
    conflict:
      "This record was changed by someone else since you opened it. Reload to see " +
      "the latest version, then re-apply your changes.",
    inviteFailed: "Could not send the invite. Please try again.",
    deleteFailed: "Could not delete this record. Please try again.",
    invalidSiteId: "Invalid site id",
    invalidDeviceId: "Invalid device id",
    invalidCircuitId: "Invalid circuit id",
    invalidRecorderId: "Invalid recorder id",
    invalidCameraId: "Invalid camera id",
    siteNotFound: "Site not found.",
    deviceNotFound: "Device not found.",
    circuitNotFound: "Circuit not found.",
    recorderNotFound: "Recorder not found.",
    cameraNotFound: "Camera not found.",
    /** Safe messages keyed by Postgres SQLSTATE (`lib/api/db-error.ts`). */
    db: {
      duplicate: "A record with these details already exists.",
      missingReference: "A referenced record was not found.",
      outOfRange: "Some values are outside the allowed range.",
      missingField: "A required field is missing.",
      noPermission: "You do not have permission to perform this action.",
      generic: "Could not save your changes. Please check your input and try again.",
    },
  },
};

export type Dictionary = typeof en;
