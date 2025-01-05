import { Outlet } from 'react-router-dom';

export default function Layout() {
  return (
    <div>
      <p>This is Global Layout</p>
      <Outlet />
    </div>
  );
}
