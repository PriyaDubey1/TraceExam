import { useTheme } from '../context/ThemeContext';
import { useRef, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PackageSearch, Sparkles, ShieldCheck, Radio } from 'lucide-react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import './Home.css';

const features = [
  { to: '/scan', icon: PackageSearch, title: 'Custody Chain', desc: 'Track every handoff with immutable logs.' },
  { to: '/report-leak', icon: Sparkles, title: 'AI Leak Detection', desc: 'Automated scanning for leaked content.' },
  { to: '/dashboard', icon: ShieldCheck, title: 'Chain Verification', desc: 'Detect tampering across the custody trail.' },
  { to: '/monitor', icon: Radio, title: 'Live Monitoring', desc: 'Simulated scanning of public channels.' },
];

function Home() {
  const containerRef = useRef(null);
  const vantaRef = useRef(null);
  const [vantaEffect, setVantaEffect] = useState(null);
  const { dark } = useTheme();

  useEffect(() => {
    let effect = vantaEffect;

    if (effect) {
      effect.destroy();
      effect = null;
    }

    if (window.VANTA) {
      effect = window.VANTA.NET({
        el: vantaRef.current,
        THREE: window.THREE,
        color: dark ? 0xff7a3d : 0xff5d1f,
        backgroundColor: dark ? 0x141414 : 0xf7f7f5,
        points: 12,
        maxDistance: 26,
        spacing: 22,
        showDots: false,
        mouseControls: true,
        touchControls: true,
        gyroControls: false,
      });
      setVantaEffect(effect);
    }

    return () => {
      if (effect) effect.destroy();
    };
  }, [dark]);

  useGSAP(() => {
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.from('.hero-eyebrow', { opacity: 0, y: 12, duration: 0.5 })
      .from('.hero h1', { opacity: 0, y: 18, duration: 0.6 }, '-=0.3')
      .from('.hero-sub', { opacity: 0, y: 14, duration: 0.5 }, '-=0.35')
      .from('.cta-btn', { opacity: 0, y: 10, duration: 0.4 }, '-=0.25')
      .from('.feature-card', { opacity: 0, y: 24, duration: 0.5, stagger: 0.1 }, '-=0.15');
  }, { scope: containerRef });

  return (
    <div className="home-page" ref={containerRef}>
      <section className="hero" ref={vantaRef}>
        <span className="hero-eyebrow">Press → Paper → Public</span>
        <h1>Nobody leaks. Nobody hides.</h1>
        <p className="hero-sub">
          A tamper-evident custody chain and AI accountability pipeline for exam papers.
        </p>
        <Link to="/public" className="cta-btn">View Public Dashboard</Link>
      </section>

      <div className="feature-grid">
        {features.map(({ to, icon: Icon, title, desc }) => (
          <Link key={to} to={to} className="feature-card">
            <span className="feature-icon">
              <Icon size={20} strokeWidth={1.75} />
            </span>
            <h3>{title}</h3>
            <p>{desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default Home;