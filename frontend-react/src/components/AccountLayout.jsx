import { Outlet } from 'react-router-dom';
import AccountNavbar from './AccountNavbar';
import Footer from './Footer';

export default function AccountLayout() {
  return (
    <>
      <AccountNavbar />
      <main>
        <Outlet />
      </main>
      <Footer />
    </>
  );
}
