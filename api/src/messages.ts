export const MESSAGES = {
  // AI
  NO_AI_ACCESS: "Nie masz dostępu do AI.",

  // Users
  USER_NOT_FOUND: "User is not existing",

  // Shopping - products
  PRODUCT_ALREADY_EXISTS: "The product is already existing",
  PRODUCT_NOT_FOUND: "The product does not exist",
  PRODUCT_MATCH_FAILED:
    "Nie udało się dopasować produktu. Spróbuj jeszcze raz.",
  PRODUCT_ALREADY_ON_LIST: "Ten produkt jest już na liście zakupów!",
  PRODUCT_NOT_ON_LIST: "Nie ma tego produktu na liście zakupów!",
  PRODUCT_NOT_IN_DB: "Taki produkt nie istnieje",
  PRODUCT_NAME_READ_FAILED:
    "Nie udało się odczytać nazwy produktu. Spróbuj jeszcze raz.",
  PRODUCT_RESPONSE_UNRECOGNIZED:
    "Nie udało się rozpoznać odpowiedzi. Spróbuj jeszcze raz.",
  PRODUCT_NOT_VALID:
    "To nie jest produkt, który można kupić w sklepie. Podaj samą nazwę produktu.",

  // Shopping - list
  SHOPPING_LIST_CLEARED: "Lista zakupów została wyczyszczona!",
  SHOPPING_LIST_EMPTY: "Lista zakupów jest pusta!",
  SHOPPING_LIST_HEADER: "Lista zakupów:",
  PRODUCT_NOT_FOUND_ASK_NEW:
    "Nie znalazłam tego produktu. Jeśli chcesz dodać nowy produkt do bazy, podaj jego nazwę.",
  NEW_PRODUCT_NOT_ADDED: "Nowy produkt nie został dodany do listy.",
  CANCELLED: "Ok, anulowano.",
  DECLINED: "Ok, nie dodałam tego produktu.",

  // Feeder - hardware
  ESP32_ERROR: "Nie udało się połączyć z karmikiem. Spróbuj ponownie.",
  NO_MOTOR_CONFIGS: "Brak skonfigurowanych porcji w bazie danych!",
  NO_DEFAULT_MOTOR_CONFIG: "Brak domyślnej konfiguracji porcji w bazie danych!",
  NO_LIGHT_CONFIGS: "Brak skonfigurowanych trybów świateł w bazie danych!",
  LIGHT_OFF: "Wyłączono światło",
  LIGHT_ON_INDEFINITE: "Włączono światło bez limitu czasowego",
  MOTOR_STOPPED: "Zatrzymano silnik karmika",
  FEEDER_RESET: "Karmik zostanie zrestartowany",

  // Feeder - router
  NO_SNAPSHOT: "No snapshot provided",
  FORBIDDEN: "Forbidden",
  DISCORD_PUSH_FAILED: (e: unknown) => `Discord push failed: ${e}`,
  FEEDER_MOTION_ALERT: (streamUrl: string) =>
    `🐱 Wykryto ruch przy karmiku!\n📹 Podgląd na żywo: ${streamUrl}`,
  FEEDER_EVENT_UNKNOWN: (type: string) => `ℹ️ Karmnik: ${type}`,

  // Feeder - events (ESP32 → Discord)
  FEEDER_STARTED: "✅ Karmnik uruchomiony!",
  FEEDER_RESTARTED: "🔁 Karmnik zrestartował się po awarii (watchdog)!",
  FEEDER_CAMERA_ERROR: "❌ Błąd inicjalizacji kamery!",
  FEEDER_CAPTURE_FAILED: "⚠️ Nie udało się zrobić zdjęcia!",
  FEEDER_API_ERROR: "⚠️ Karmnik nie może połączyć się z API!",
  FEEDER_WIFI_RECONNECTED: "🔄 Karmnik ponownie połączony z WiFi!",
  FEEDER_RESET_EVENT: "🔄 Karmnik zresetowany zdalnie!",

  // Dynamic
  PRODUCT_ADDED: (name: string) => `Dodano '${name}' do listy zakupów!`,
  PRODUCT_ADDED_FALLBACK: "Dodano produkt do listy zakupów.",
  PRODUCT_DELETED: (name: string) =>
    `Produkt '${name}' został usunięty z listy zakupów!`,
  PRODUCT_DELETED_FALLBACK: "Produkt został usunięty z listy zakupów!",
  NEW_PRODUCT_ADDED: (name: string) =>
    `Dodałem '${name}' do bazy i do listy zakupów!`,
  FED_CAT: (label: string, ms: number) =>
    `Demon zaspokojony! Porcja: ${label} (${ms}ms)`,
  FED_CAT_DEFAULT: (label: string, ms: number) =>
    `Demon nakarmiony! Porcja: ${label} (${ms}ms)`,
  LIGHT_ON: (sec: number) => `Włączono światło na ${sec}s`,
  CONFIRM_PRODUCT_MATCH: (msg: string) =>
    `Nie jestem pewna, czy '${msg}' to wskazany produkt. Czy chcesz dodać ten produkt do listy zakupów? (tak/nie)`,
} as const;
