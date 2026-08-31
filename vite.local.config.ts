import vinext from "vinext";
import { defineConfig } from "vite";

// Lekka konfiguracja tylko do uruchamiania aplikacji na komputerze.
// Nie uruchamia lokalnych usług Cloudflare ani integracji serwerowych,
// ponieważ do przeglądania i testowania interfejsu nie są potrzebne.
export default defineConfig({
  server: {
    host: "127.0.0.1",
    port: 5173,
  },
  plugins: [vinext()],
});
