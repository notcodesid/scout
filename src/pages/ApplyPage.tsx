import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ColdEmailForm from "@/components/ColdEmailForm";

const ApplyPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8 md:py-12">
        {/* Hero */}
        <section className="mb-12 text-center">
          <h1 className="font-display text-3xl font-bold tracking-tight md:text-5xl">
            Paste your portfolio URL.
            <span className="text-gradient"> Get YC-fit outreach.</span>
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Scout fetches your public portfolio, extracts your profile, ranks live YC roles and relevant startups, then writes plain-text cold emails you can copy and send.
          </p>
        </section>

        {/* Form */}
        <ColdEmailForm />
      </main>

      <Footer />
    </div>
  );
};

export default ApplyPage;
