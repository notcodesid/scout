import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Mail,
  Bookmark,
  Send,
  MessageSquare,
  Clock,
  ArrowRight,
  Building,
  Loader2,
} from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import DashboardSkeleton from "@/components/DashboardSkeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { useUserEmails, EmailStatus } from "@/hooks/use-user-emails";
import { useBookmarks } from "@/hooks/use-bookmarks";

const statusColors: Record<EmailStatus, string> = {
  not_sent: "bg-muted text-muted-foreground",
  sent: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  responded: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  no_response: "bg-amber-500/20 text-amber-400 border-amber-500/30",
};

const statusLabels: Record<EmailStatus, string> = {
  not_sent: "Not Sent",
  sent: "Sent",
  responded: "Responded",
  no_response: "No Response",
};

const DashboardPage = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { emails, isLoading, updateStatus, stats } = useUserEmails();
  const { bookmarkedIds } = useBookmarks();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8 md:py-12">
          <div className="mb-8">
            <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
              Your <span className="text-gradient">Dashboard</span>
            </h1>
            <p className="mt-2 text-muted-foreground">
              Track your applications and saved startups
            </p>
          </div>
          <DashboardSkeleton />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8 md:py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
            Your <span className="text-gradient">Dashboard</span>
          </h1>
          <p className="mt-2 text-muted-foreground">
            Track your applications and saved startups
          </p>
        </div>

        {/* Stats Grid */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="glass-card p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total Emails</p>
              </div>
            </div>
          </div>

          <div className="glass-card p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                <Send className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.sent}</p>
                <p className="text-sm text-muted-foreground">Sent</p>
              </div>
            </div>
          </div>

          <div className="glass-card p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                <MessageSquare className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {stats.responded}
                </p>
                <p className="text-sm text-muted-foreground">Responded</p>
              </div>
            </div>
          </div>

          <div className="glass-card p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                <Bookmark className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {bookmarkedIds.length}
                </p>
                <p className="text-sm text-muted-foreground">Saved Startups</p>
              </div>
            </div>
          </div>
        </div>

        {/* Emails Section */}
        <section className="mb-12">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold">Your Emails</h2>
            <Link to="/apply">
              <Button variant="outline" size="sm" className="gap-2">
                Generate More
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          {emails.length === 0 ? (
            <div className="glass-card p-8 text-center">
              <Mail className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 font-display text-lg font-semibold">
                No emails yet
              </h3>
              <p className="mb-4 text-muted-foreground">
                Generate personalized cold emails to start reaching out to startups
              </p>
              <Link to="/apply">
                <Button variant="default" className="rounded-full">Generate Emails</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {emails.map((email) => (
                <div
                  key={email.id}
                  className="glass-card flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary">
                      <Building className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">
                        {email.startup_name}
                      </p>
                      <p className="truncate text-sm text-muted-foreground">
                        {email.subject}
                      </p>
                      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {new Date(email.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Select
                      value={email.response_status || "not_sent"}
                      onValueChange={(value) =>
                        updateStatus({
                          emailId: email.id,
                          status: value as EmailStatus,
                        })
                      }
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="not_sent">Not Sent</SelectItem>
                        <SelectItem value="sent">Sent</SelectItem>
                        <SelectItem value="responded">Responded</SelectItem>
                        <SelectItem value="no_response">No Response</SelectItem>
                      </SelectContent>
                    </Select>
                    <Badge
                      className={
                        statusColors[
                          (email.response_status as EmailStatus) || "not_sent"
                        ]
                      }
                    >
                      {statusLabels[(email.response_status as EmailStatus) || "not_sent"]}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Saved Startups Section */}
        {bookmarkedIds.length > 0 && (
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-xl font-semibold">
                Saved Startups
              </h2>
              <Link to="/#directory">
                <Button variant="ghost" size="sm" className="gap-2">
                  Browse All
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>

            <div className="glass-card p-6">
              <p className="text-muted-foreground">
                You have <span className="font-medium text-foreground">{bookmarkedIds.length}</span> saved startups.
                View them in the directory with the bookmark filter.
              </p>
              <Link to="/" className="mt-4 inline-block">
                <Button variant="outline" size="sm">
                  View Saved Startups
                </Button>
              </Link>
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default DashboardPage;
