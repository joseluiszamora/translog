import "./globals.css";
import Sidebar from "@/components/Sidebar";
import { BootstrapProvider } from "@/components/BootstrapProvider";

export const metadata = {
  title: "TransLog — Control Financiero",
  description:
    "Control operativo y financiero de empresa de transporte de carga",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>
        <BootstrapProvider>
          <div className="flex min-h-screen">
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
              <main className="flex-1 overflow-y-auto p-6">{children}</main>
            </div>
          </div>
        </BootstrapProvider>
      </body>
    </html>
  );
}
