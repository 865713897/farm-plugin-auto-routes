import { Outlet } from 'react-router-dom';

export default function Layout() {
  return (
    <div>
      <p>This is Page Layout</p>
      <Outlet />
    </div>
  );
}
