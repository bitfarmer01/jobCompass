import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Hero } from "@/components/homepage/Hero";
import { HowItWorks } from "@/components/homepage/HowItWorks";
import { Features } from "@/components/homepage/Features";
import { Testimonial } from "@/components/homepage/Testimonial";
import { BottomCTA } from "@/components/homepage/BottomCTA";
import { getCurrentUser } from "@/lib/auth";

export default async function HomePage() {
  const user = await getCurrentUser();
  const ctaHref = user ? "/dashboard" : "/login";

  return (
    <>
      <Navbar user={user} />
      <main className="flex-1 flex flex-col">
        <Hero ctaHref={ctaHref} />
        <HowItWorks />
        <Features />
        <Testimonial />
        <BottomCTA ctaHref={ctaHref} />
      </main>
      <Footer />
    </>
  );
}
