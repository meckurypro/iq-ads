import Nav from '../components/Nav';
import Hero from '../components/Hero';
import Feed from '../components/Feed';
import ContactSection from '../components/ContactSection';
import Footer from '../components/Footer';

export default function Home() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Feed />
        <ContactSection />
      </main>
      <Footer />
    </>
  );
}
