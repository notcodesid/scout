import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export type Mvp1EventType = "profile_extract" | "job_match" | "email_generate";
export type Mvp1EventStatus = "success" | "failure";

interface RecordMvp1EventParams {
  submissionId?: string | null;
  eventType: Mvp1EventType;
  status: Mvp1EventStatus;
  fallbackUsed?: boolean;
  metadata?: Record<string, unknown>;
}

export async function recordMvp1Event(
  supabase: SupabaseClient,
  params: RecordMvp1EventParams,
) {
  const { error } = await supabase.from("mvp1_flow_events").insert({
    submission_id: params.submissionId || null,
    event_type: params.eventType,
    status: params.status,
    fallback_used: params.fallbackUsed || false,
    metadata: params.metadata || {},
  });

  if (error) {
    console.error("Failed to record MVP1 event:", error);
  }
}
