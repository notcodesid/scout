import { useParams, Link } from "react-router-dom";
import { ArrowLeft, ExternalLink, MapPin, Users, Calendar, Building, Briefcase, Globe, Award, Layers } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useStartupDetail } from "@/hooks/use-startup-detail";

const StartupDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, error } = useStartupDetail(id);
  
  const startup = data?.data;
  const relatedStartups = data?.related || [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8 md:py-12">
          <Skeleton className="h-6 w-32 mb-8" />
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-8">
              <div className="glass-card p-6 md:p-8">
                <Skeleton className="h-10 w-3/4 mb-4" />
                <Skeleton className="h-6 w-full mb-6" />
                <div className="flex gap-2 mb-8">
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-6 w-16" />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-24 rounded-lg" />
                  ))}
                </div>
              </div>
              <div className="glass-card p-6 md:p-8">
                <Skeleton className="h-6 w-48 mb-4" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
            <div className="space-y-6">
              <div className="glass-card p-6">
                <Skeleton className="h-6 w-24 mb-4" />
                <Skeleton className="h-16 w-full" />
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !startup) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-20 text-center">
          <h1 className="font-display text-3xl font-bold">Startup Not Found</h1>
          <p className="mt-4 text-muted-foreground">The startup you're looking for doesn't exist.</p>
          <Link to="/">
            <Button variant="default" className="mt-8 rounded-full">
              <ArrowLeft className="h-4 w-4" />
              Back to Directory
            </Button>
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8 md:py-12">
        {/* Back Button */}
        <Link
          to="/"
          className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Directory
        </Link>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Header */}
            <div className="glass-card p-6 md:p-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  {/* Logo */}
                  {startup.logoUrl && (
                    <img
                      src={startup.logoUrl}
                      alt={`${startup.name} logo`}
                      className="h-16 w-16 rounded-xl bg-white/10 object-contain p-2"
                    />
                  )}
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h1 className="font-display text-3xl font-bold md:text-4xl">{startup.name}</h1>
                      {startup.batch && (
                        <Badge variant="accent" className="text-sm">
                          {startup.batch}
                        </Badge>
                      )}
                      {startup.isHiring && (
                        <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                          Hiring
                        </Badge>
                      )}
                      {startup.isTopCompany && (
                        <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                          <Award className="h-3 w-3 mr-1" />
                          Top Company
                        </Badge>
                      )}
                    </div>
                    <p className="mt-2 text-lg text-muted-foreground">{startup.description}</p>
                  </div>
                </div>
                <a href={startup.website} target="_blank" rel="noopener noreferrer">
                  <Button variant="default" size="lg" className="rounded-full">
                    Visit Website
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </a>
              </div>

              {/* Tags */}
              <div className="mt-6 flex flex-wrap gap-2">
                {startup.tags.map((tag) => (
                  <Badge key={tag} variant="tag" className="text-sm">
                    {tag}
                  </Badge>
                ))}
              </div>

              {/* Quick Stats */}
              <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
                <div className="rounded-lg bg-secondary/50 p-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span className="text-xs">Founded</span>
                  </div>
                  <p className="mt-1 font-display text-xl font-semibold">{startup.founded}</p>
                </div>
                <div className="rounded-lg bg-secondary/50 p-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span className="text-xs">Team Size</span>
                  </div>
                  <p className="mt-1 font-display text-xl font-semibold">{startup.teamSize || "N/A"}</p>
                </div>
                <div className="rounded-lg bg-secondary/50 p-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span className="text-xs">Location</span>
                  </div>
                  <p className="mt-1 font-display text-lg font-semibold truncate" title={startup.location}>
                    {startup.location.split(",")[0]}
                  </p>
                </div>
                <div className="rounded-lg bg-secondary/50 p-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Building className="h-4 w-4" />
                    <span className="text-xs">Industry</span>
                  </div>
                  <p className="mt-1 font-display text-lg font-semibold truncate" title={startup.industry}>
                    {startup.industry}
                  </p>
                </div>
              </div>
            </div>

            {/* About */}
            <div className="glass-card p-6 md:p-8">
              <h2 className="font-display text-xl font-semibold mb-4">About {startup.name}</h2>
              <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {startup.longDescription || startup.description}
              </p>
            </div>

            {/* Company Details */}
            <div className="glass-card p-6 md:p-8">
              <h2 className="font-display text-xl font-semibold mb-4">Company Details</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {startup.subindustry && (
                  <div className="flex items-start gap-3">
                    <Layers className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Sub-Industry</p>
                      <p className="font-medium">{startup.subindustry}</p>
                    </div>
                  </div>
                )}
                {startup.stage && (
                  <div className="flex items-start gap-3">
                    <Building className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Stage</p>
                      <p className="font-medium">{startup.stage}</p>
                    </div>
                  </div>
                )}
                {startup.status && (
                  <div className="flex items-start gap-3">
                    <Award className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <p className="font-medium">{startup.status}</p>
                    </div>
                  </div>
                )}
                {startup.industries && startup.industries.length > 0 && (
                  <div className="flex items-start gap-3 sm:col-span-2">
                    <Briefcase className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Industries</p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {startup.industries.map((ind) => (
                          <Badge key={ind} variant="secondary">{ind}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                {startup.regions && startup.regions.length > 0 && (
                  <div className="flex items-start gap-3 sm:col-span-2">
                    <Globe className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Regions</p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {startup.regions.map((region) => (
                          <Badge key={region} variant="outline">{region}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Hiring Status */}
            {startup.isHiring && (
              <div className="glass-card p-6 md:p-8 border-emerald-500/20">
                <div className="flex items-center gap-3 mb-4">
                  <Briefcase className="h-5 w-5 text-emerald-400" />
                  <h2 className="font-display text-xl font-semibold">Currently Hiring</h2>
                </div>
                <p className="text-muted-foreground mb-4">
                  {startup.name} is actively looking for talented people to join their team.
                </p>
                <a href={startup.website} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10">
                    View Open Positions
                    <ExternalLink className="h-4 w-4 ml-2" />
                  </Button>
                </a>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Links */}
            <div className="glass-card p-6">
              <h2 className="font-display text-lg font-semibold mb-4">Links</h2>
              <div className="space-y-2">
                <a
                  href={startup.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-lg bg-secondary/50 p-3 transition-colors hover:bg-secondary"
                >
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Website</span>
                </a>
                {startup.ycUrl && (
                  <button
                    onClick={() => window.open(startup.ycUrl, '_blank', 'noopener,noreferrer')}
                    className="flex w-full items-center gap-3 rounded-lg bg-secondary/50 p-3 transition-colors hover:bg-secondary text-left"
                  >
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">YC Profile</span>
                  </button>
                )}
              </div>
            </div>

            {/* Related Startups */}
            {relatedStartups.length > 0 && (
              <div className="glass-card p-6">
                <h2 className="font-display text-lg font-semibold mb-4">Similar Companies</h2>
                <div className="space-y-3">
                  {relatedStartups.map((related) => (
                    <Link
                      key={related.id}
                      to={`/startup/${related.id}`}
                      className="block rounded-lg bg-secondary/50 p-3 transition-colors hover:bg-secondary"
                    >
                      <div className="flex items-center gap-3">
                        {related.logoUrl && (
                          <img
                            src={related.logoUrl}
                            alt={related.name}
                            className="h-8 w-8 rounded-md bg-white/10 object-contain p-1"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{related.name}</p>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {related.description}
                          </p>
                        </div>
                        {related.batch && (
                          <Badge variant="accent" className="text-xs shrink-0">
                            {related.batch}
                          </Badge>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default StartupDetail;