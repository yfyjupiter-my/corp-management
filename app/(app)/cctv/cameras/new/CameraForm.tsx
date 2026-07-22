"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { cameraSchema, type CameraInput } from "@/lib/validation/cctv";
import { CAMERA_TYPES, CAMERA_STATUSES } from "@/lib/constants/enums";
import { Button } from "@/components/ui/Button";
import { PageHead } from "@/components/ui/PageHead";
import { Panel } from "@/components/ui/Panel";
import { cn } from "@/lib/utils/cn";

interface Recorder {
  id: string;
  label: string;
}

/**
 * Existing row for edit mode — the RLS-scoped Supabase select shape (nullable
 * columns) plus the id and last-read `updated_at` used for the BUS-6 guard.
 */
export interface CameraEditValues {
  id: string;
  updated_at: string;
  recorder_id: string;
  label: string;
  location_desc: string | null;
  camera_type: (typeof CAMERA_TYPES)[number];
  resolution: string | null;
  outdoor: boolean;
  status: (typeof CAMERA_STATUSES)[number];
  notes: string | null;
}

/**
 * Client form (React Hook Form + Zod) for creating OR editing a CCTV camera,
 * scoped to a recorder. Create → `POST /api/cameras`; edit →
 * `PATCH /api/cameras/[id]` carrying the last-read `updated_at` for BUS-6
 * optimistic concurrency. The Zod schema shared with the server also runs the
 * secrets guard.
 */
export function CameraForm({
  recorders,
  camera,
  eyebrow,
  title,
  subtitle,
  panelClassName,
}: {
  recorders: Recorder[];
  camera?: CameraEditValues;
  /** Page heading is rendered here so Cancel/Save can sit on the title line. */
  eyebrow?: string;
  title: string;
  subtitle?: string;
  panelClassName?: string;
}) {
  const router = useRouter();
  const isEdit = Boolean(camera);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CameraInput>({
    resolver: zodResolver(cameraSchema),
    defaultValues: camera
      ? {
          recorder_id: camera.recorder_id,
          label: camera.label,
          location_desc: camera.location_desc ?? undefined,
          camera_type: camera.camera_type ?? "dome",
          resolution: camera.resolution ?? undefined,
          outdoor: camera.outdoor,
          status: camera.status ?? "active",
          notes: camera.notes ?? undefined,
        }
      : { camera_type: "dome", status: "active", outdoor: false },
  });

  async function onSubmit(values: CameraInput) {
    setServerError(null);
    const res = await fetch(isEdit ? `/api/cameras/${camera!.id}` : "/api/cameras", {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        isEdit ? { ...values, expected_updated_at: camera!.updated_at } : values,
      ),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setServerError(body.error ?? "Could not save camera.");
      return;
    }
    router.push("/cctv");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* The heading lives inside the form so Cancel/Save sit on the title line
          and the submit button still submits without a `form=` reference. */}
      <PageHead
        eyebrow={eyebrow}
        title={title}
        subtitle={subtitle}
        actions={
          <>
            {serverError && <span className="text-[12px] text-danger">{serverError}</span>}
            <Button type="button" variant="ghost" sm onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="submit" sm disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : isEdit ? "Save changes" : "Save"}
            </Button>
          </>
        }
      />

      <Panel className={panelClassName}>
        {/* pb-[1px] + each field's own pb-[17px] = the same 18px as the other sides. */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-0 px-[18px] pt-[18px] pb-[1px]">
          <Field label="Recorder" required error={errors.recorder_id?.message} span2>
            <select className="fld" {...register("recorder_id")}>
              <option value="">Select a recorder…</option>
              {recorders.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Type" required error={errors.camera_type?.message}>
            <select className="fld" {...register("camera_type")}>
              {CAMERA_TYPES.map((t) => (
                <option key={t} value={t} className="capitalize">
                  {t}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Label" required error={errors.label?.message}>
            <input className="fld font-mono" {...register("label")} placeholder="CAM-01" />
          </Field>
          <Field label="Location" error={errors.location_desc?.message} span2>
            <input className="fld" {...register("location_desc")} placeholder="Main entrance" />
          </Field>

          <Field label="Resolution" error={errors.resolution?.message}>
            <input className="fld" {...register("resolution")} placeholder="4MP" />
          </Field>
          <Field label="Status" required error={errors.status?.message}>
            <select className="fld" {...register("status")}>
              {CAMERA_STATUSES.map((s) => (
                <option key={s} value={s} className="capitalize">
                  {s}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Placement">
            <label className="flex items-center gap-2 text-[13px] text-fg py-2">
              <input type="checkbox" {...register("outdoor")} />
              Outdoor
            </label>
          </Field>

          <Field label="Notes" error={errors.notes?.message} span2>
            <textarea className="fld min-h-[64px]" {...register("notes")} />
          </Field>
        </div>
      </Panel>

      <style>{`
        .fld { font-size:13px; color:var(--fg); background:var(--surface);
          border:1px solid var(--border-strong); border-radius:var(--radius-sm);
          padding:9px 11px; width:100%; transition:border .15s, box-shadow .15s; }
        .fld:focus { outline:none; border-color:var(--accent); box-shadow:var(--ring); }
      `}</style>
    </form>
  );
}

/**
 * One labelled control. The help/error line is absolutely positioned inside a
 * fixed `pb` strip so a field that has one is exactly as tall as a field that
 * doesn't — grid rows then stay equal height and the vertical rhythm between
 * every row is the same 17px.
 */
function Field({
  label,
  required,
  error,
  help,
  span2,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  help?: string;
  span2?: boolean;
  children: React.ReactNode;
}) {
  const message = error ?? help;
  return (
    <label className={"relative flex flex-col gap-1.5 pb-[17px]" + (span2 ? " md:col-span-2" : "")}>
      <span className="text-[12px] font-semibold text-fg-muted font-head">
        {label} {required && <span className="text-danger">*</span>}
      </span>
      {children}
      {message && (
        <span
          title={message}
          className={cn(
            "absolute left-0 bottom-0 text-[11px] leading-[15px] truncate max-w-full",
            error ? "text-danger" : "text-fg-subtle",
          )}
        >
          {message}
        </span>
      )}
    </label>
  );
}
