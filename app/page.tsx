import Navigation from "@/components/Navigation";
import Hero from "@/components/Hero";
import About from "@/components/About";
import TechStack from "@/components/TechStack";
import Experience from "@/components/Experience";
import Awards from "@/components/Awards";
import Projects from "@/components/Projects";
import Contact from "@/components/Contact";

export default function Home() {
  return (
    <div className=" min-h-screen">
      <Navigation />
      <main>
        <Hero />
        <About />
        <TechStack />
        <Experience />
        <Awards />
        <Projects />
        <Contact />
      </main>
    </div>
  );
}
