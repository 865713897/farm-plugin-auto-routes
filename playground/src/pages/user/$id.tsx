import { useParams } from 'react-router-dom';

export default function UserId() {
  const { id } = useParams();
  return (
    <div>
      <div>This is UserId Page! id is {id}</div>
    </div>
  );
}
