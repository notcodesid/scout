import Header from "@/components/Header";
import Footer from "@/components/Footer";

const TermsPage = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto px-6 py-16">
        <div className="max-w-3xl mx-auto">
          <h1 className="font-display text-4xl font-bold mb-8">Terms & Conditions</h1>
          
          <div className="prose prose-gray dark:prose-invert max-w-none space-y-6">
            <p className="text-muted-foreground">
              Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">1. Acceptance of Terms</h2>
              <p className="text-muted-foreground">
                By accessing and using Scout, you accept and agree to be bound by the terms and provisions of this agreement. If you do not agree to these terms, please do not use our services.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">2. Use of Service</h2>
              <p className="text-muted-foreground">
                Scout provides a platform to discover tech startups and connect with potential job opportunities. You agree to use this service only for lawful purposes and in accordance with these Terms.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">3. User Responsibilities</h2>
              <p className="text-muted-foreground">
                You are responsible for maintaining the confidentiality of your account information and for all activities that occur under your account. You agree to provide accurate and complete information when using our services.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">4. Intellectual Property</h2>
              <p className="text-muted-foreground">
                All content, features, and functionality of Scout are owned by us and are protected by international copyright, trademark, and other intellectual property laws.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">5. Limitation of Liability</h2>
              <p className="text-muted-foreground">
                Scout shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of or inability to use the service.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">6. Changes to Terms</h2>
              <p className="text-muted-foreground">
                We reserve the right to modify these terms at any time. We will notify users of any material changes by posting the new Terms on this page.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">7. Contact Us</h2>
              <p className="text-muted-foreground">
                If you have any questions about these Terms, please contact us at support@scout.site.
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default TermsPage;