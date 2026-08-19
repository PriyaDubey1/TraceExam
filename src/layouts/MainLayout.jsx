import { useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import Sidebar from '../components/Sidebar';
import './MainLayout.css';

function MainLayout({ children }) {
  const contentRef = useRef(null);
  const location = useLocation();

  useGSAP(() => {
    gsap.fromTo(
      contentRef.current,
      { opacity: 0, y: 10 },
      { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out' }
    );
  }, { dependencies: [location.pathname], scope: contentRef });

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content" ref={contentRef}>{children}</main>
    </div>
  );
}

export default MainLayout;