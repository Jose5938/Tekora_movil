import { Redirect } from 'expo-router';
import { useSession } from '@/auth/context';

export default function Index() {
  const { status } = useSession();
  return <Redirect href={status === 'authenticated' ? '/tabs' : '/login'} />;
}
