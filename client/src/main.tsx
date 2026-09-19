import { createRoot } from "react-dom/client";
import { installErrorReporting } from "@/lib/errorReporting";
import App from "./App";
import "./index.css";

// Ushlanmagan xatolarni serverga yuborish
installErrorReporting();

createRoot(document.getElementById("root")!).render(<App />);
