// src/App.tsx
import "./index.css"; // Ensure global styles are imported
import { PatientForm } from "./components/patient-form/PatientForm"; // Will be created next
import { Toaster } from "@/components/ui/sonner";
// If you set up theming

function App() {
    return (
        <div className="container mx-auto p-4 bg-background text-foreground min-h-screen">
            {" "}
            {/* Add basic layout */}
            <h1 className="text-3xl font-bold mb-6 text-center">
                New Patient Registration
            </h1>
            <PatientForm />
            <Toaster />
        </div>
    );
}

export default App;
