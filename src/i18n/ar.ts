export const ar = {
  // Common
  appName: "الفلاح delivery",
  loading: "جاري التحميل...",
  
  // Navigation
  nav: {
    ads: "الإعلانات",
    addPost: "إضافة إعلان",
    whatsapp: "واتساب",
    analytics: "التحليلات",
    signIn: "تسجيل الدخول",
    signOut: "تسجيل الخروج",
    admin: "مدير",
    user: "مستخدم",
  },

  // Posts
  posts: {
    title: "الإعلانات",
    subtitle: "تصفح أحدث الإعلانات وشاركها مع أصدقائك",
    noPosts: "لا توجد إعلانات حتى الآن",
    share: "مشاركة",
    copied: "تم النسخ",
    apply: "للتقديم اضغط هنا",
    delete: "حذف",
    deleteTitle: "حذف الإعلان",
    deleteDescription: "هل أنت متأكد من حذف هذا الإعلان؟ لا يمكن التراجع عن هذا الإجراء.",
    cancel: "إلغاء",
    confirmDelete: "حذف",
    backToPosts: "العودة للإعلانات",
    postNotFound: "الإعلان غير موجود",
    shareCopied: "تم نسخ رابط الإعلان!",
    shareOpened: "تم فتح المشاركة",
    shareFailed: "فشل في النسخ",
  },

  // Add Post
  addPost: {
    title: "إنشاء إعلان جديد",
    image: "الصورة",
    clickToUpload: "اضغط لرفع صورة",
    imageFormats: "JPG, PNG, GIF, WebP حتى 10MB",
    description: "الوصف",
    descriptionPlaceholder: "اكتب وصفاً جذاباً لإعلانك...",
    cancel: "إلغاء",
    create: "إنشاء الإعلان",
    uploading: "جاري الرفع...",
    success: "تم إنشاء الإعلان بنجاح!",
    error: "فشل في إنشاء الإعلان",
    selectImage: "يرجى اختيار صورة",
    enterDescription: "يرجى إدخال الوصف",
    imageOnly: "يرجى اختيار ملف صورة",
    imageTooLarge: "يجب أن تكون الصورة أقل من 10MB",
    accessDenied: "غير مسموح. للمديرين فقط.",
  },

  // Auth
  auth: {
    signInTitle: "تسجيل الدخول أو إنشاء حساب جديد",
    login: "تسجيل الدخول",
    signup: "إنشاء حساب",
    email: "البريد الإلكتروني",
    emailPlaceholder: "example@email.com",
    password: "كلمة المرور",
    passwordPlaceholder: "••••••••",
    fullName: "الاسم الكامل",
    namePlaceholder: "محمد أحمد",
    phone: "رقم الهاتف",
    phonePlaceholder: "+201234567890",
    signingIn: "جاري تسجيل الدخول...",
    creatingAccount: "جاري إنشاء الحساب...",
    loginSuccess: "تم تسجيل الدخول بنجاح!",
    signupSuccess: "تم إنشاء الحساب بنجاح! يمكنك الآن تسجيل الدخول.",
    invalidCredentials: "بريد إلكتروني أو كلمة مرور غير صحيحة",
    emailExists: "هذا البريد مسجل بالفعل. يرجى تسجيل الدخول.",
    unexpectedError: "حدث خطأ غير متوقع",
    invalidEmail: "بريد إلكتروني غير صالح",
    passwordMin: "كلمة المرور يجب أن تكون 6 أحرف على الأقل",
    nameMin: "الاسم يجب أن يكون حرفين على الأقل",
    phoneMin: "رقم الهاتف يجب أن يكون 10 أرقام على الأقل",
  },

  // WhatsApp
  whatsapp: {
    title: "رسائل واتساب",
    subtitle: "إدارة جهات الاتصال وإرسال رسائل واتساب",
    contacts: "جهات الاتصال",
    selectedCount: "تم تحديد {count} جهة اتصال",
    selectAll: "تحديد الكل",
    deselectAll: "إلغاء التحديد",
    noContacts: "لا توجد جهات اتصال",
    addContact: "إضافة جهة اتصال",
    name: "الاسم",
    phoneNumber: "رقم الهاتف",
    message: "الرسالة",
    messagePlaceholder: "اكتب رسالتك هنا...",
    send: "إرسال عبر واتساب",
    sending: "جاري الإرسال...",
    selectContacts: "يرجى تحديد جهة اتصال واحدة على الأقل",
    enterMessage: "يرجى إدخال رسالة",
    sendingTo: "جاري الإرسال إلى {count} جهة اتصال...",
    actions: "الإجراءات",
  },

  // Analytics
  analytics: {
    title: "التحليلات",
    subtitle: "إحصائيات الرسائل والتفاعل",
  },

  // Contact Groups
  groups: {
    title: "المجموعات",
    createGroup: "إنشاء مجموعة",
  },
};

export type Translations = typeof ar;
