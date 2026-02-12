import { Link } from "react-router-dom";
import { ArrowLeft, Rocket, Mail } from "lucide-react";
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
            Land Your Dream
            <span className="text-gradient"> YC Internship</span>
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Upload your resume or fill in your details, select startups you want to reach out to,
            and we'll generate personalized cold emails for you.
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
