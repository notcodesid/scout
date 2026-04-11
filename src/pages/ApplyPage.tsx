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
            Add your resume, portfolio, or both.
            <span className="text-gradient"> Get job-fit outreach.</span>
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Scout extracts a structured profile from your resume PDF and/or public portfolio, ranks live roles against it, then writes plain-text emails you can copy and send yourself.
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
