import { Redirect } from 'expo-router';

export default function Index() {
  // Redirige automáticamente a la carpeta tabs apenas se abre la app
  return <Redirect href="/login" />; 
}