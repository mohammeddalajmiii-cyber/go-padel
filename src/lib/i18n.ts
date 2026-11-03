// Text for the public site in Arabic and English.

export type Lang = "ar" | "en";
export const LANGS: Lang[] = ["ar", "en"];
export const isLang = (v: unknown): v is Lang => v === "ar" || v === "en";

const en = {
  dir: "ltr",
  brand: "Go Padel",
  switchLang: "عربي",
  nav: { book: "Book the court", home: "Home" },
  place: "Avenue Mall, Rehab City",

  home: {
    title: "One court. Open until 1 AM.",
    lead: "Book the padel court at Avenue Mall in under a minute. Pick a time, pay a small deposit with InstaPay, and play.",
    cta: "Book the court",
    nextFree: "Free today",
    noneToday: "Today is fully booked. Tomorrow is open.",
    closedNow: "Booking opens again at",
    pricesTitle: "Prices",
    min30: "30 minutes",
    min60: "60 minutes",
    deposit: "Deposit to confirm",
    egp: "EGP",
    hours: "Open every day from {open} to {close}",
    howTitle: "How booking works",
    steps: [
      { t: "Choose a time", d: "Pick a day, 30 or 60 minutes, and a free start time." },
      { t: "Pay the deposit", d: "Send the deposit with InstaPay and upload the screenshot within {hold} minutes." },
      { t: "Get confirmed", d: "The front desk checks your payment and confirms. You'll see it on your booking page and on WhatsApp." },
      { t: "Play", d: "Pay the rest at the counter in cash or by InstaPay." },
    ],
    rulesTitle: "Good to know",
    rules: [
      "Bookings can't be cancelled.",
      "Deposits are non-refundable.",
      "Your slot is held for {hold} minutes while you pay the deposit.",
    ],
    findTitle: "Find us",
    findText: "Avenue Mall, Rehab City, New Cairo",
    map: "Open in Google Maps",
  },

  book: {
    title: "Book the court",
    day: "Day",
    today: "Today",
    tomorrow: "Tomorrow",
    length: "How long?",
    time: "Start time",
    loading: "Loading times…",
    noTimes: "No free times on this day. Try another day or a 30-minute slot.",
    taken: "Booked",
    selected: "{start} – {end}",
    details: "Your details",
    name: "Full name",
    phone: "Mobile number",
    phoneHint: "Egyptian mobile, e.g. 010 1234 5678",
    agree: "I understand bookings can't be cancelled and the deposit is non-refundable.",
    continue: "Continue to payment",
    holding: "Holding your slot…",
    pickTime: "Choose a start time first",
    errors: {
      name: "Enter your name.",
      phone: "Enter a valid Egyptian mobile number.",
      agree: "Tick the box to accept the booking rules.",
      taken: "Someone just booked this time. Choose another one.",
      generic: "The booking didn't go through. Check your connection and try again.",
    },
  },

  status: {
    summary: "Your booking",
    total: "Total",
    depositNow: "Deposit to pay now",
    remaining: "Pay at the counter",
    payTitle: "Pay the deposit",
    payStep1: "Send {amount} EGP with InstaPay",
    payStep2: "Take a screenshot of the successful transfer",
    payStep3: "Upload it here and confirm",
    openInstapay: "Pay with InstaPay",
    instapayAddress: "InstaPay address",
    copy: "Copy",
    copied: "Copied",
    upload: "Upload screenshot",
    change: "Change screenshot",
    confirm: "Confirm booking",
    uploading: "Sending…",
    timer: "Complete payment within {time} or the slot will be released.",
    reviewingTitle: "Payment received",
    reviewingText: "The front desk is checking your payment. This page updates on its own once your booking is confirmed.",
    confirmedTitle: "Booking confirmed",
    confirmedText: "See you on the court. Pay the remaining {amount} EGP at the counter.",
    paidTitle: "All paid",
    paidText: "Your booking is fully paid. Enjoy the game.",
    rejectedTitle: "Payment not accepted",
    rejectedText: "The front desk couldn't confirm your deposit, so the slot was released.",
    reason: "Reason",
    expiredTitle: "Time ran out",
    expiredText: "The deposit wasn't sent within {hold} minutes, so the slot was released.",
    cancelledTitle: "Booking cancelled",
    cancelledText: "The front desk cancelled this booking. Contact the venue if you have questions.",
    bookAgain: "Book another time",
    keepLink: "Keep this page: it's your booking link.",
    notFound: "We couldn't find this booking. Check the link you were sent.",
    errors: {
      file: "Choose a screenshot image first.",
      tooBig: "That image is too large. Upload a smaller screenshot.",
      expired: "Time ran out before the screenshot was sent.",
      generic: "The upload didn't go through. Try again.",
    },
  },

  wa: {
    confirmed:
      "Hi {name}, your Go Padel booking is confirmed ✅\n{date}, {start} – {end}\nRemaining at the counter: {remaining} EGP\nSee you on the court!",
  },
};

type Dict = typeof en;

const ar: Dict = {
  dir: "rtl",
  brand: "Go Padel",
  switchLang: "English",
  nav: { book: "احجز الملعب", home: "الرئيسية" },
  place: "أفينيو مول، مدينة الرحاب",

  home: {
    title: "ملعب واحد. مفتوح لحد ١ الصبح.",
    lead: "احجز ملعب البادل في أفينيو مول في أقل من دقيقة. اختار الوقت، ادفع عربون صغير بإنستاباي، والعب.",
    cta: "احجز الملعب",
    nextFree: "متاح النهاردة",
    noneToday: "النهاردة محجوز بالكامل. بكرة متاح.",
    closedNow: "الحجز يفتح تاني الساعة",
    pricesTitle: "الأسعار",
    min30: "٣٠ دقيقة",
    min60: "٦٠ دقيقة",
    deposit: "العربون للتأكيد",
    egp: "ج.م",
    hours: "مفتوح كل يوم من {open} إلى {close}",
    howTitle: "إزاي تحجز",
    steps: [
      { t: "اختار الوقت", d: "اختار اليوم، ٣٠ أو ٦٠ دقيقة، ووقت بداية متاح." },
      { t: "ادفع العربون", d: "ابعت العربون بإنستاباي وارفع صورة التحويل خلال {hold} دقيقة." },
      { t: "استنى التأكيد", d: "الاستقبال بيراجع الدفع ويأكد حجزك. هتلاقي التأكيد في صفحة الحجز وعلى واتساب." },
      { t: "العب", d: "ادفع الباقي في الكاونتر كاش أو بإنستاباي." },
    ],
    rulesTitle: "معلومات مهمة",
    rules: [
      "الحجز مينفعش يتلغي.",
      "العربون مش بيترد.",
      "الوقت بيتحجزلك {hold} دقيقة لحد ما تدفع العربون.",
    ],
    findTitle: "مكاننا",
    findText: "أفينيو مول، مدينة الرحاب، القاهرة الجديدة",
    map: "افتح على خرائط جوجل",
  },

  book: {
    title: "احجز الملعب",
    day: "اليوم",
    today: "النهاردة",
    tomorrow: "بكرة",
    length: "المدة",
    time: "وقت البداية",
    loading: "بنحمّل المواعيد…",
    noTimes: "مفيش مواعيد متاحة في اليوم ده. جرب يوم تاني أو ٣٠ دقيقة.",
    taken: "محجوز",
    selected: "{start} – {end}",
    details: "بياناتك",
    name: "الاسم بالكامل",
    phone: "رقم الموبايل",
    phoneHint: "رقم موبايل مصري، مثلاً ٠١٠١٢٣٤٥٦٧٨",
    agree: "فاهم إن الحجز مينفعش يتلغي وإن العربون مش بيترد.",
    continue: "كمّل للدفع",
    holding: "بنحجزلك الوقت…",
    pickTime: "اختار وقت البداية الأول",
    errors: {
      name: "اكتب اسمك.",
      phone: "اكتب رقم موبايل مصري صحيح.",
      agree: "علّم على المربع عشان توافق على قواعد الحجز.",
      taken: "حد لسه حاجز الوقت ده. اختار وقت تاني.",
      generic: "الحجز متمش. اتأكد من النت وجرب تاني.",
    },
  },

  status: {
    summary: "حجزك",
    total: "الإجمالي",
    depositNow: "العربون المطلوب دلوقتي",
    remaining: "الباقي في الكاونتر",
    payTitle: "ادفع العربون",
    payStep1: "ابعت {amount} ج.م بإنستاباي",
    payStep2: "خد سكرين شوت للتحويل الناجح",
    payStep3: "ارفعها هنا وأكد الحجز",
    openInstapay: "ادفع بإنستاباي",
    instapayAddress: "عنوان إنستاباي",
    copy: "نسخ",
    copied: "اتنسخ",
    upload: "ارفع صورة التحويل",
    change: "غيّر الصورة",
    confirm: "أكد الحجز",
    uploading: "بنبعت…",
    timer: "كمّل الدفع خلال {time} وإلا الوقت هيتلغي.",
    reviewingTitle: "استلمنا الدفع",
    reviewingText: "الاستقبال بيراجع التحويل. الصفحة دي هتتحدث لوحدها أول ما الحجز يتأكد.",
    confirmedTitle: "الحجز اتأكد",
    confirmedText: "نشوفك في الملعب. ادفع الباقي {amount} ج.م في الكاونتر.",
    paidTitle: "المبلغ اتدفع بالكامل",
    paidText: "حجزك مدفوع بالكامل. استمتع بالماتش.",
    rejectedTitle: "الدفع متقبلش",
    rejectedText: "الاستقبال مقدرش يأكد العربون، فالوقت اتلغى.",
    reason: "السبب",
    expiredTitle: "الوقت خلص",
    expiredText: "العربون متبعتش خلال {hold} دقيقة، فالوقت اتلغى.",
    cancelledTitle: "الحجز اتلغى",
    cancelledText: "الاستقبال لغى الحجز ده. كلّم المكان لو عندك أي سؤال.",
    bookAgain: "احجز وقت تاني",
    keepLink: "احتفظ بالصفحة دي: ده لينك حجزك.",
    notFound: "ملقيناش الحجز ده. اتأكد من اللينك.",
    errors: {
      file: "اختار صورة التحويل الأول.",
      tooBig: "الصورة كبيرة. ارفع صورة أصغر.",
      expired: "الوقت خلص قبل ما الصورة تتبعت.",
      generic: "الرفع متمش. جرب تاني.",
    },
  },

  wa: {
    confirmed:
      "أهلاً {name}، حجزك في Go Padel اتأكد ✅\n{date}، {start} – {end}\nالباقي في الكاونتر: {remaining} ج.م\nنشوفك في الملعب!",
  },
};

export const dictionaries: Record<Lang, Dict> = { en, ar };
export const t = (lang: Lang) => dictionaries[lang];

/** Replaces {name} placeholders. */
export function fill(text: string, values: Record<string, string | number>): string {
  return text.replace(/\{(\w+)\}/g, (_, k) => (k in values ? String(values[k]) : `{${k}}`));
}

/** Numbers in the right digits for the language. */
export function num(n: number, lang: Lang): string {
  return new Intl.NumberFormat(lang === "ar" ? "ar-EG" : "en-US").format(n);
}
