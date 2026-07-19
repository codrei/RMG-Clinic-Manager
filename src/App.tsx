import { useEffect, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { Loader2 } from 'lucide-react';
import { auth } from './lib/firebase';
import { Login } from './components/Login';
import { Shell } from './components/Shell';
import { Patients } from './pages/Patients';
import { Today } from './pages/Today';

/**
 * The whole app is private: nothing renders without the clinic's
 * Firebase login (same account as the booking dashboard).
 */
function App() {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setChecking(false);
    });
  }, []);

  if (checking) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) return <Login />;

  return (
    <Routes>
      <Route element={<Shell />}>
        <Route path="/" element={<Patients />} />
        <Route path="/today" element={<Today />} />
        <Route path="*" element={<Patients />} />
      </Route>
    </Routes>
  );
}

export default App;
