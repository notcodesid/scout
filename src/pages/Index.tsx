import Header from "@/components/Header";
import Hero from "@/components/Hero";
import FeatureShowcase from "@/components/FeatureShowcase";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main>
        <Hero />
        <FeatureShowcase />
      </main>

      <Footer />
    </div>
  );
};

export default Index;
