import { useEffect, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { Loader2 } from 'lucide-react';
import { auth } from './lib/firebase';
import { Login } from './components/Login';
import { Shell } from './components/Shell';
import { Toaster } from './components/Toaster';
import { Patients } from './pages/Patients';
import { PatientForm } from './pages/PatientForm';
import { PatientDetail } from './pages/PatientDetail';
import { PatientPrint } from './pages/PatientPrint';
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

  if (!user) {
    return (
      <>
        <Login />
        <Toaster />
      </>
    );
  }

  return (
    <>
      <Routes>
        <Route element={<Shell />}>
          <Route path="/" element={<Patients />} />
          <Route path="/patients/new" element={<PatientForm />} />
          <Route path="/patients/:id" element={<PatientDetail />} />
          <Route path="/patients/:id/edit" element={<PatientForm />} />
          <Route path="/today" element={<Today />} />
          <Route path="*" element={<Patients />} />
        </Route>
        {/* Print view stands alone — no app chrome on paper */}
        <Route path="/patients/:id/print" element={<PatientPrint />} />
      </Routes>
      <Toaster />
    </>
  );
}

export default App;
