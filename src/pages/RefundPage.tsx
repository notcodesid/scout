import Header from "@/components/Header";
import Footer from "@/components/Footer";

const RefundPage = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto px-6 py-16">
        <div className="max-w-3xl mx-auto">
          <h1 className="font-display text-4xl font-bold mb-8">Refund & Cancellation Policy</h1>
          
          <div className="prose prose-gray dark:prose-invert max-w-none space-y-6">
            <p className="text-muted-foreground">
              Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">1. Free Service</h2>
              <p className="text-muted-foreground">
                Scout is currently a free service. We do not charge users for accessing our platform, browsing startups, or submitting applications.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">2. Future Paid Services</h2>
              <p className="text-muted-foreground">
                Should we introduce paid services or premium features in the future, this policy will be updated to reflect the applicable refund and cancellation terms.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">3. Account Cancellation</h2>
              <p className="text-muted-foreground">
                You may cancel your account at any time by contacting our support team. Upon cancellation, your data will be handled in accordance with our Privacy Policy.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">4. Application Withdrawal</h2>
              <p className="text-muted-foreground">
                You may withdraw any application you have submitted through our platform by contacting us. However, we cannot guarantee that the startup has not already reviewed your application.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">5. Contact Us</h2>
              <p className="text-muted-foreground">
                If you have any questions about our Refund & Cancellation Policy, please contact us at support@scout.site.
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default RefundPage;