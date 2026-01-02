import { useParams, Link } from "react-router-dom";
import { ArrowLeft, ExternalLink, Linkedin, Twitter, MapPin, Users, Calendar, DollarSign, Building, TrendingUp } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { startups, getRelatedStartups, StartupFull } from "@/data/startups";

const StartupDetail = () => {
  const { id } = useParams<{ id: string }>();
  const startup = startups.find((s) => s.id === id);

  if (!startup) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-20 text-center">
          <h1 className="font-display text-3xl font-bold">Startup Not Found</h1>
          <p className="mt-4 text-muted-foreground">The startup you're looking for doesn't exist.</p>
          <Link to="/">
            <Button variant="hero" className="mt-8">
              <ArrowLeft className="h-4 w-4" />
              Back to Directory
            </Button>
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  const relatedStartups = getRelatedStartups(startup, startups);

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
                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="font-display text-3xl font-bold md:text-4xl">{startup.name}</h1>
                    {startup.batch && (
                      <Badge variant="accent" className="text-sm">
                        {startup.batch}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-2 text-lg text-muted-foreground">{startup.description}</p>
                </div>
                <a href={startup.website} target="_blank" rel="noopener noreferrer">
                  <Button variant="hero" size="lg">
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
                  <p className="mt-1 font-display text-xl font-semibold">{startup.employees || `${startup.teamSize}`}</p>
                </div>
                <div className="rounded-lg bg-secondary/50 p-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span className="text-xs">Location</span>
                  </div>
                  <p className="mt-1 font-display text-xl font-semibold">{startup.location}</p>
                </div>
                <div className="rounded-lg bg-secondary/50 p-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Building className="h-4 w-4" />
                    <span className="text-xs">Industry</span>
                  </div>
                  <p className="mt-1 font-display text-xl font-semibold">{startup.industry || "Tech"}</p>
                </div>
              </div>
            </div>

            {/* About */}
            <div className="glass-card p-6 md:p-8">
              <h2 className="font-display text-xl font-semibold mb-4">About {startup.name}</h2>
              <p className="text-muted-foreground leading-relaxed">
                {startup.longDescription || startup.description}
              </p>
            </div>

            {/* Funding Rounds */}
            {startup.fundingRounds && startup.fundingRounds.length > 0 && (
              <div className="glass-card p-6 md:p-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-display text-xl font-semibold">Funding History</h2>
                  {startup.totalFunding && (
                    <div className="flex items-center gap-2 text-primary">
                      <TrendingUp className="h-5 w-5" />
                      <span className="font-display text-xl font-bold">{startup.totalFunding}</span>
                      <span className="text-sm text-muted-foreground">Total</span>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  {startup.fundingRounds.map((round, index) => (
                    <div
                      key={index}
                      className="relative flex items-start gap-4 rounded-lg bg-secondary/30 p-4"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <DollarSign className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-display font-semibold">{round.stage}</span>
                          <span className="text-primary font-bold">{round.amount}</span>
                          <span className="text-sm text-muted-foreground">• {round.date}</span>
                        </div>
                        {round.investors && round.investors.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {round.investors.map((investor) => (
                              <Badge key={investor} variant="outline" className="text-xs">
                                {investor}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Founders */}
            <div className="glass-card p-6">
              <h2 className="font-display text-lg font-semibold mb-4">Founders</h2>
              <div className="space-y-3">
                {startup.founders.map((founder) => (
                  <a
                    key={founder.name}
                    href={founder.linkedin || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 rounded-lg bg-secondary/50 p-3 transition-colors hover:bg-secondary"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-display font-bold">
                      {founder.name.split(" ").map((n) => n[0]).join("")}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{founder.name}</p>
                      <p className="text-xs text-muted-foreground">Co-Founder</p>
                    </div>
                    <Linkedin className="h-4 w-4 text-muted-foreground" />
                  </a>
                ))}
              </div>
            </div>

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
                {startup.linkedin && (
                  <a
                    href={startup.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 rounded-lg bg-secondary/50 p-3 transition-colors hover:bg-secondary"
                  >
                    <Linkedin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">LinkedIn</span>
                  </a>
                )}
                {startup.twitter && (
                  <a
                    href={startup.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 rounded-lg bg-secondary/50 p-3 transition-colors hover:bg-secondary"
                  >
                    <Twitter className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Twitter</span>
                  </a>
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
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{related.name}</p>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {related.description}
                          </p>
                        </div>
                        {related.batch && (
                          <Badge variant="accent" className="text-xs shrink-0 ml-2">
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
