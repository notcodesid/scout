import Header from "@/components/Header";
import Hero from "@/components/Hero";
import FeatureShowcase from "@/components/FeatureShowcase";
import Footer from "@/components/Footer";
import FeatureEmailPreview from "@/components/FeatureEmailPreview";
import JobsPreviewSection from "@/components/JobsPreviewSection";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main>
        <Hero />
        <FeatureEmailPreview />
        <FeatureShowcase />
        <JobsPreviewSection />
      </main>

      <Footer />
    </div>
  );
};

export default Index;
