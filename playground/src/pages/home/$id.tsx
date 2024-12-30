import { useParams } from 'react-router-dom';

export default function Home() {
  const { id } = useParams();
  return (
    <div>
      <div>This is Home {id} Page!</div>
    </div>
  );
}
