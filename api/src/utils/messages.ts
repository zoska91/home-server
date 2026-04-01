export const MESSAGES = {
  // Auth
  NO_AI_ACCESS: "Nie masz dostępu do AI.",

  // ESP32
  ESP32_ERROR: "Nie udało się połączyć z karmikiem. Spróbuj ponownie.",

  // Feeder motor
  NO_MOTOR_CONFIGS: "Brak skonfigurowanych porcji w bazie danych!",
  NO_DEFAULT_MOTOR_CONFIG: "Brak domyślnej konfiguracji porcji w bazie danych!",
  FED_CAT: (name: string, ms: number) =>
    `Nakarmiono kota! Porcja: ${name} (${ms}ms)`,
  FED_CAT_DEFAULT: (name: string, ms: number) =>
    `Demon nakarmiony! Porcja: ${name} (${ms}ms)`,
  FEED_STOPPED: "Zatrzymano silnik karmika",
  FEEDER_RESET: "Karmik zostanie zrestartowany",

  // Feeder notifications
  MOTION_NOTIFICATIONS_ENABLED: "Powiadomienia o ruchu przy karmiku włączone.",
  MOTION_NOTIFICATIONS_DISABLED: "Powiadomienia o ruchu przy karmiku wyłączone.",

  // Feeder light
  NO_LIGHT_CONFIGS: "Brak skonfigurowanych trybów świateł w bazie danych!",
  LIGHT_ON: (sec: number) => `Włączono światło na ${sec}s`,
  LIGHT_ON_INDEFINITE: "Włączono światło bez limitu czasowego",
  LIGHT_OFF: "Wyłączono światło",

  // Shopping list
  LIST_EMPTY: "Lista zakupów jest pusta!",
  LIST_CLEARED: "Lista zakupów została wyczyszczona!",
  LIST_HEADER: "Lista zakupów:\n",

  // Products
  PRODUCT_ADDED: (name: string) => `Dodano '${name}' do listy zakupów!`,
  PRODUCT_ADDED_GENERIC: "Dodano produkt do listy zakupów.",
  PRODUCT_ALREADY_ON_LIST: "Ten produkt jest już na liście zakupów!",
  PRODUCT_CONFIRM: (msg: string) =>
    `Nie jestem pewna, czy '${msg}' to wskazany produkt. Czy chcesz dodać ten produkt do listy zakupów? (tak/nie)`,
  PRODUCT_NOT_FOUND_ASK_NEW:
    "Nie znalazłam tego produktu. Jeśli chcesz dodać nowy produkt do bazy, podaj jego nazwę.",
  PRODUCT_MATCH_FAILED:
    "Nie udało się dopasować produktu. Spróbuj jeszcze raz.",
  PRODUCT_NOT_EXISTS: "Taki produkt nie istnieje",
  PRODUCT_NOT_ON_LIST: "Nie ma tego produktu na liście zakupów!",
  PRODUCT_DELETED: (name: string) =>
    `Produkt '${name}' został usunięty z listy zakupów!`,
  PRODUCT_DELETED_GENERIC: "Produkt został usunięty z listy zakupów!",

  // New product flow
  NEW_PRODUCT_ADDED: (name: string) =>
    `Dodałem '${name}' do bazy i do listy zakupów!`,
  NEW_PRODUCT_NOT_ADDED: "Nowy produkt nie został dodany do listy.",
  INVALID_PRODUCT:
    "To nie jest produkt, który można kupić w sklepie. Podaj samą nazwę produktu.",
  PRODUCT_NAME_READ_ERROR:
    "Nie udało się odczytać nazwy produktu. Spróbuj jeszcze raz.",

  // General
  CANCELLED: "Ok, anulowano.",
  DECLINED: "Ok, nie dodałam tego produktu.",
  RESPONSE_PARSE_ERROR:
    "Nie udało się rozpoznać odpowiedzi. Spróbuj jeszcze raz.",
} as const;
