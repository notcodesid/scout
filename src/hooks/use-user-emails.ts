import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";
import { useToast } from "./use-toast";

export type EmailStatus = "not_sent" | "sent" | "responded" | "no_response";

export interface UserEmail {
  id: string;
  startup_id: string;
  startup_name: string;
  subject: string;
  body: string;
  status: string | null;
  response_status: EmailStatus;
  created_at: string;
  sent_at: string | null;
}

export const useUserEmails = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: emails = [], isLoading } = useQuery({
    queryKey: ["user-emails", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("generated_emails")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as UserEmail[];
    },
    enabled: !!user,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({
      emailId,
      status,
    }: {
      emailId: string;
      status: EmailStatus;
    }) => {
      const { error } = await supabase
        .from("generated_emails")
        .update({
          response_status: status,
          sent_at: status !== "not_sent" ? new Date().toISOString() : null,
        })
        .eq("id", emailId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-emails"] });
      toast({
        title: "Status updated",
        description: "Email status has been updated",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update email status",
        variant: "destructive",
      });
    },
  });

  const stats = {
    total: emails.length,
    sent: emails.filter((e) => e.response_status === "sent").length,
    responded: emails.filter((e) => e.response_status === "responded").length,
    noResponse: emails.filter((e) => e.response_status === "no_response").length,
    notSent: emails.filter((e) => e.response_status === "not_sent").length,
  };

  return {
    emails,
    isLoading,
    updateStatus: updateStatusMutation.mutate,
    stats,
  };
};
