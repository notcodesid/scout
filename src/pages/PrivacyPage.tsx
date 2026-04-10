import Header from "@/components/Header";
import Footer from "@/components/Footer";

const PrivacyPage = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto px-6 py-16">
        <div className="max-w-3xl mx-auto">
          <h1 className="font-display text-4xl font-bold mb-8">Privacy Policy</h1>
          
          <div className="prose prose-gray max-w-none space-y-6">
            <p className="text-muted-foreground">
              Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">1. Information We Collect</h2>
              <p className="text-muted-foreground">
                We collect information you provide directly to us, such as when you create an account, submit an application, or contact us for support. This may include your name, email address, resume, and professional information.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">2. How We Use Your Information</h2>
              <p className="text-muted-foreground">
                We use the information we collect to provide, maintain, and improve our services, to communicate with you, and to help you evaluate potential job opportunities.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">3. Information Sharing</h2>
              <p className="text-muted-foreground">
                We do not sell your personal information to third parties. If sharing flows are introduced later, this policy will be updated before those flows go live.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">4. Data Security</h2>
              <p className="text-muted-foreground">
                We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">5. Cookies and Tracking</h2>
              <p className="text-muted-foreground">
                We use cookies and similar tracking technologies to track activity on our service and hold certain information to improve your experience.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">6. Your Rights</h2>
              <p className="text-muted-foreground">
                You have the right to access, update, or delete your personal information at any time. You may also opt out of receiving promotional communications from us.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">7. Contact Us</h2>
              <p className="text-muted-foreground">
                If you have any questions about this Privacy Policy, please contact us at privacy@scout.site.
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PrivacyPage;
