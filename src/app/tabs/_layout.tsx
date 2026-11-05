import { Slot } from 'expo-router';

// Authentication is guarded once at the root; keep the existing custom tab bar.
export default function TabsLayout() { return <Slot />; }
