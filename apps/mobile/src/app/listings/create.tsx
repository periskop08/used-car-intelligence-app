import { useEffect } from 'react';
import { useRouter } from 'expo-router';

export default function CreateListingRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/create-listing');
  }, []);

  return null;
}
