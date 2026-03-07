import { Outlet } from 'react-router-dom';
import SimpleNavbar from './SimpleNavbar';
import Footer from './Footer';
import AiWidget from './AiWidget';

export default function SimpleLayout() {
  return (
    <>
      <SimpleNavbar />
      <main className="content-pages-main">
        <Outlet />
      </main>
      <Footer />
      <AiWidget />
    </>
  );
}
