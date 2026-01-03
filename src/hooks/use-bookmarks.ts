import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";
import { useToast } from "./use-toast";

export const useBookmarks = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch bookmarks from profile
  const fetchBookmarks = useCallback(async () => {
    if (!user) {
      setBookmarkedIds([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("saved_startups")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      setBookmarkedIds(data?.saved_startups || []);
    } catch (error) {
      console.error("Error fetching bookmarks:", error);
    }
  }, [user]);

  useEffect(() => {
    fetchBookmarks();
  }, [fetchBookmarks]);

  const toggleBookmark = async (startupId: string) => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to bookmark startups",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    const isBookmarked = bookmarkedIds.includes(startupId);
    const newBookmarks = isBookmarked
      ? bookmarkedIds.filter((id) => id !== startupId)
      : [...bookmarkedIds, startupId];

    // Optimistic update
    setBookmarkedIds(newBookmarks);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ saved_startups: newBookmarks })
        .eq("user_id", user.id);

      if (error) throw error;

      toast({
        title: isBookmarked ? "Removed from favorites" : "Added to favorites",
        description: isBookmarked
          ? "Startup removed from your saved list"
          : "Startup saved to your favorites",
      });
    } catch (error) {
      // Revert on error
      setBookmarkedIds(bookmarkedIds);
      console.error("Error updating bookmarks:", error);
      toast({
        title: "Error",
        description: "Failed to update bookmarks",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const isBookmarked = (startupId: string) => bookmarkedIds.includes(startupId);

  return {
    bookmarkedIds,
    toggleBookmark,
    isBookmarked,
    loading,
    refetch: fetchBookmarks,
  };
};
