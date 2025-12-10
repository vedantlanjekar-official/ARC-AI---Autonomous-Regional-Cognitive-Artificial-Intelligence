import HeroSection from '../components/Hero/HeroSection';
import ProblemsSection from '../components/Hero/ProblemsSection';
import USPSection from '../components/Hero/USPSection';
import HowItWorksSection from '../components/Hero/HowItWorksSection';
import ContactSection from '../components/Hero/ContactSection';
import Footer from '../components/Footer';

const HeroPage = () => {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <HeroSection />
      <ProblemsSection />
      <USPSection />
      <HowItWorksSection />
      <ContactSection />
      <Footer />
    </div>
  );
};

export default HeroPage;


