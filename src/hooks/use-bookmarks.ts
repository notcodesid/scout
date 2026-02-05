import { useState, useEffect, useCallback } from "react";
import { useToast } from "./use-toast";

const STORAGE_KEY = "internatyc.saved_startups";

const readBookmarks = () => {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string") : [];
  } catch {
    return [];
  }
};

const writeBookmarks = (ids: string[]) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
};

export const useBookmarks = () => {
  const { toast } = useToast();
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchBookmarks = useCallback(() => {
    setBookmarkedIds(readBookmarks());
  }, []);

  useEffect(() => {
    fetchBookmarks();
  }, [fetchBookmarks]);

  const toggleBookmark = async (startupId: string) => {
    setLoading(true);
    const previousBookmarks = bookmarkedIds;
    const isBookmarked = bookmarkedIds.includes(startupId);
    const newBookmarks = isBookmarked
      ? bookmarkedIds.filter((id) => id !== startupId)
      : [...bookmarkedIds, startupId];

    // Optimistic update
    setBookmarkedIds(newBookmarks);

    try {
      writeBookmarks(newBookmarks);

      toast({
        title: isBookmarked ? "Removed from favorites" : "Added to favorites",
        description: isBookmarked
          ? "Startup removed from your saved list"
          : "Startup saved to your favorites",
      });
    } catch (error) {
      // Revert on error
      setBookmarkedIds(previousBookmarks);
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
