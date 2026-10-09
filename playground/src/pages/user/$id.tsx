import { useParams } from 'react-router';

export default function UserDynamicRoute() {
  const { id } = useParams();

  return (
    <div>
      <h1>UserDynamicRoute</h1>
      <p>This is UserDynamicRoute {id} Page</p>
    </div>
  );
}
