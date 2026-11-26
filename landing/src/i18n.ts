import { computed, ref, watchEffect } from 'vue'

/**
 * The site is Arabic first: Arabic is the default, laid out right to left,
 * and English is the complete secondary language. The choice is remembered
 * per browser, and `?lang=en` / `?lang=ar` links open a specific language.
 * index.html applies the same choice before first paint, so there is no
 * flash of the wrong direction.
 */
export type Lang = 'ar' | 'en'
const STORAGE_KEY = 'azm-site-language'

function initialLang(): Lang {
  try {
    const q = new URLSearchParams(location.search).get('lang')
    if (q === 'ar' || q === 'en') return q
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'ar' || saved === 'en') return saved
  } catch {
    /* storage blocked: use the default */
  }
  return 'ar'
}

export const lang = ref<Lang>(initialLang())

export function setLang(next: Lang): void {
  lang.value = next
  try {
    localStorage.setItem(STORAGE_KEY, next)
  } catch {
    /* the choice simply isn't remembered */
  }
}

/** Locale for dates and numbers: Arabic with Western digits, as in the app. */
export const locale = computed(() => (lang.value === 'ar' ? 'ar-u-nu-latn' : 'en-GB'))

const en = {
  meta: {
    title: 'Azm (عَزم) — Steady focus. Meaningful progress.',
    description:
      'Azm is a calm focus timer, task manager and study planner for your desktop. Works offline on Fedora, Ubuntu and Windows; your data stays on your computer.'
  },
  skip: 'Skip to content',
  nav: {
    sections: 'Sections',
    home: 'Azm home',
    features: 'Features',
    how: 'How it works',
    privacy: 'Privacy',
    faq: 'FAQ',
    download: 'Download',
    toLight: 'Switch to light theme',
    toDark: 'Switch to dark theme',
    light: 'Light theme',
    dark: 'Dark theme',
    language: 'Language',
    otherLanguage: 'العربية',
    otherLanguageLabel: 'اقرأ الصفحة بالعربية'
  },
  hero: {
    title: 'Steady focus.\nMeaningful progress.',
    second: '«بِعزمٍ، خطوةً بعد خطوة»',
    secondLang: 'ar',
    body: 'Azm helps you plan what to study, focus on one task at a time, and see how your time is really spent. Designed Arabic first, available in English.',
    download: 'Download Azm',
    explore: 'Explore features',
    platforms: 'Fedora, Ubuntu and Windows',
    offline: 'Works offline, no account',
    languages: 'Arabic and English',
    alt: 'The Azm Focus screen: a large circular countdown, the session cycle below it, and a dock linking the current task and its progress to the Pause, Reset and Skip buttons.',
    caption: 'The Focus screen. A real screenshot of Azm with sample study data.'
  },
  features: {
    title: 'What Azm does',
    intro: 'Everything you need to plan study time and stick to it, in one calm desktop app.',
    items: [
      {
        title: 'A focus timer that keeps its word',
        body: 'Focus sessions, short and long breaks, sounds and notifications. The timer stays exact when the window is minimised, and a small always-on-top timer keeps it in view.'
      },
      {
        title: 'Tasks you can scan',
        body: 'Group tasks by date, subject or priority, add one by typing a title, and see progress as the focus you actually spent against your estimate.'
      },
      {
        title: 'Daily and weekly planning',
        body: 'Place study blocks on a timeline, drag unscheduled work onto the week, and see when a day is planned beyond your daily goal.'
      },
      {
        title: 'Statistics that explain',
        body: 'Focus per day against your goal, Pomodoros, time per subject, your most productive days and hours, your streak and how focused you felt.'
      },
      {
        title: 'Arabic first, English too',
        body: 'A full right-to-left Arabic interface, written as Arabic rather than translated, and a complete English one. Switch any time in Settings.'
      },
      {
        title: 'Offline, and yours',
        body: 'No account and no connection needed. Everything stays in one database file on your computer that you can back up or export as JSON.'
      }
    ]
  },
  how: {
    title: 'How it works',
    step: 'Step {n}:',
    steps: [
      {
        title: 'Plan',
        body: 'Add what you need to study, estimate how long it takes, and give it a day. Reserve study blocks if you like a fixed schedule.'
      },
      {
        title: 'Focus',
        body: 'Start a Pomodoro straight from the next task. The time is recorded against that task, and a break follows when the session ends.'
      },
      {
        title: 'Review',
        body: 'Compare what you planned with what you did, see which subjects get your time, and keep your streak going.'
      }
    ]
  },
  preview: {
    title: 'See it in use',
    intro: 'Every screen below is a real screenshot of Azm, filled with sample data.',
    tabs: 'Screens',
    screens: {
      planner: {
        label: 'Day',
        caption: 'Study blocks on a timeline, beside the focus you actually recorded.',
        alt: 'Day planner: planned study blocks and recorded focus sessions side by side, with a summary and the day’s tasks.'
      },
      week: {
        label: 'Week',
        caption: 'Unscheduled work above, seven days below. Each day shows its load against your daily goal.',
        alt: 'Week planner: unscheduled tasks above seven day columns, each with a load bar against the daily goal; today is highlighted.'
      },
      tasks: {
        label: 'Tasks',
        caption: 'Grouped by what needs attention first, with priority, dates and progress in aligned columns.',
        alt: 'Task list grouped into Overdue, Today and Next 7 days, with subject filters, an inline add field, and columns for priority, dates and progress.'
      },
      stats: {
        label: 'Statistics',
        caption: 'Headline figures, focus time per day against your goal, and the patterns behind it.',
        alt: 'Statistics: figures for focus time, Pomodoros, tasks completed, daily goal and streak, above a bar chart of focus per day with the goal line.'
      }
    }
  },
  privacy: {
    title: 'Your study data stays yours',
    intro: 'Azm is a desktop app that works entirely offline. What you plan and how you study is nobody else’s business.',
    points: [
      'No account, sign-in or subscription.',
      'No analytics, tracking or advertising in the app.',
      'No internet connection needed. The only thing Azm ever asks the internet is whether a newer version is on GitHub, and you can turn that off in Settings. No personal data is sent.',
      'Your tasks, plans and focus history stay in a single file on your computer, which you can back up or export at any time.'
    ],
    site: 'About this website: it sets no cookies and has no analytics. To show the current version and download links, your browser asks GitHub’s public API for the latest Azm release.'
  },
  download: {
    title: 'Download Azm',
    version: 'Version {version}',
    released: ', released {date}',
    served: 'Files are served from GitHub Releases.',
    fallback: 'Packages are published on GitHub Releases.',
    format: 'Format',
    arch: 'Architecture',
    versionLabel: 'Version',
    checking: 'Checking…',
    notYet: 'Not available yet',
    installFrom: 'Install from a terminal:',
    checkingRelease: 'Checking the latest release…',
    button: 'Download',
    buttonLabel: 'Download Azm {version} for {os} ({format})',
    seeReleases: 'See releases on GitHub',
    unconfigured: 'Downloads will appear here once Azm’s GitHub repository is set up.',
    none: 'No stable release has been published yet.',
    errorSuffix: 'You can still find every release on GitHub.',
    notIncluded: 'Not included in version {version}.',
    errors: {
      'rate-limited': 'GitHub is limiting requests right now.',
      http: 'GitHub answered with status {status}.',
      network: 'The latest release could not be checked.'
    },
    mb: '{n} MB',
    platforms: {
      rpm: { os: 'Fedora Linux', format: 'RPM package', arch: 'x86_64', requirement: 'Tested on Fedora 41. Needs glibc 2.34 or newer (Fedora 35+).' },
      deb: { os: 'Ubuntu Linux', format: 'DEB package', arch: 'x64 (amd64)', requirement: 'Tested on Ubuntu 22.04 LTS. Needs glibc 2.34 or newer.' },
      exe: { os: 'Windows', format: 'EXE installer', arch: 'x64', requirement: 'Windows 10 or 11, 64-bit. Installs for your user only, no administrator rights needed.' }
    }
  },
  faq: {
    title: 'Questions',
    items: [
      {
        q: 'Do I need an account or an internet connection?',
        a: 'No. Azm runs entirely on your computer and works the same with or without a connection. When you are online it checks GitHub for new versions, which you can turn off in Settings.'
      },
      {
        q: 'What does the name mean?',
        a: 'Azm (عَزم) is Arabic for resolve: the steady determination to keep going. The app used to be called FocusFlow; only the name and look changed, and your data carries over.'
      },
      {
        q: 'Is Azm in Arabic or English?',
        a: 'Both. Azm is designed Arabic first, with a full right-to-left layout, and English is a complete second language. Switch any time in Settings → Language; your data is not affected. Copies installed before version 0.4 stay in English until you switch.'
      },
      {
        q: 'Where is my data stored?',
        a: 'In one database file in your user folder: ~/.config/Azm/focusflow.sqlite on Linux, and %APPDATA%\\Azm\\focusflow.sqlite on Windows. If you used Azm when it was called FocusFlow, it keeps using your existing FocusFlow folder, so nothing is lost. Uninstalling the app does not delete it.'
      },
      {
        q: 'How do I move my data to another computer?',
        a: 'In Settings, under Your data, back up the database or export everything as JSON, then restore or import it on the other computer. Azm saves a copy of the existing data before replacing it.'
      },
      {
        q: 'Windows warns that the installer is from an unknown publisher. Why?',
        a: 'The installer is not code-signed yet, so Windows SmartScreen cannot identify the publisher. If you downloaded it from Azm’s GitHub release, choose “More info”, then “Run anyway”.'
      },
      {
        q: 'How do I update to a new version?',
        a: 'Azm tells you when a new version is out. On Windows it can download and install the update for you when you choose “Install and restart”. On Fedora and Ubuntu it links to the new package, which you install over the old one with dnf or apt. Your tasks, history and settings are always kept.'
      },
      {
        q: 'Does it run on macOS or other Linux distributions?',
        a: 'Packages are provided for Fedora (RPM), Ubuntu (DEB) and Windows. There is no macOS version at the moment. Other Debian- or Fedora-based distributions may work but have not been tested.'
      }
    ]
  },
  footer: {
    source: 'Source code on GitHub',
    license: 'License not chosen yet',
    top: 'Back to top'
  }
}

export type Messages = typeof en

const ar: Messages = {
  meta: {
    title: 'عَزم — بِعزمٍ، خطوةً بعد خطوة',
    description:
      'عَزم مؤقّت تركيز هادئ ومدير مهام ومخطِّط دراسة لحاسوبك. يعمل دون إنترنت على Fedora وUbuntu وWindows، وتبقى بياناتك على جهازك.'
  },
  skip: 'انتقل إلى المحتوى',
  nav: {
    sections: 'الأقسام',
    home: 'الصفحة الرئيسية لعَزم',
    features: 'المزايا',
    how: 'طريقة العمل',
    privacy: 'الخصوصية',
    faq: 'أسئلة شائعة',
    download: 'تنزيل',
    toLight: 'التبديل إلى السمة الفاتحة',
    toDark: 'التبديل إلى السمة الداكنة',
    light: 'سمة فاتحة',
    dark: 'سمة داكنة',
    language: 'اللغة',
    otherLanguage: 'English',
    otherLanguageLabel: 'Read this page in English'
  },
  hero: {
    title: 'بِعزمٍ،\nخطوةً بعد خطوة.',
    second: 'Steady focus. Meaningful progress.',
    secondLang: 'en',
    body: 'يساعدك عَزم على تخطيط ما تدرسه، والتركيز على مهمة واحدة في كل مرة، ومعرفة أين يذهب وقتك فعلًا. صُمِّم بالعربية أولًا، ويتوفّر بالإنجليزية أيضًا.',
    download: 'نزّل عَزم',
    explore: 'استكشف المزايا',
    platforms: 'Fedora وUbuntu وWindows',
    offline: 'يعمل دون إنترنت ودون حساب',
    languages: 'بالعربية والإنجليزية',
    alt: 'شاشة التركيز في عَزم: عدّاد دائري كبير، وتحته مسار دورة الجلسات، وشريط يربط المهمة الحالية وتقدّمها بأزرار الإيقاف المؤقت وإعادة البدء والتخطي.',
    caption: 'شاشة التركيز. لقطة حقيقية من عَزم ببيانات دراسة تجريبية.'
  },
  features: {
    title: 'ماذا يقدّم عَزم',
    intro: 'كل ما تحتاجه لتخطيط وقت دراستك والالتزام به، في تطبيق مكتبي هادئ واحد.',
    items: [
      {
        title: 'مؤقّت تركيز يفي بوعده',
        body: 'جلسات تركيز واستراحات قصيرة وطويلة، مع أصوات وإشعارات. يبقى المؤقّت دقيقًا حتى حين تُصغَّر النافذة، ويبقيه مؤقّت صغير ظاهرًا فوق النوافذ.'
      },
      {
        title: 'مهام تُقرأ بنظرة',
        body: 'جمّع المهام حسب التاريخ أو المادة أو الأولوية، وأضف مهمة بكتابة عنوانها فقط، وتابع تقدّمها بوقت التركيز الفعلي مقارنةً بتقديرك.'
      },
      {
        title: 'تخطيط يومي وأسبوعي',
        body: 'ضع فترات الدراسة على خط زمني، واسحب المهام غير المجدولة إلى أيام الأسبوع، واعرف متى تخطّط ليوم أكثر من هدفك اليومي.'
      },
      {
        title: 'إحصاءات تشرح',
        body: 'التركيز اليومي مقارنةً بهدفك، وجلسات بومودورو، والوقت لكل مادة، وأكثر أيامك وساعاتك إنتاجًا، ومواظبتك، ومدى تركيزك.'
      },
      {
        title: 'بالعربية أولًا، وبالإنجليزية أيضًا',
        body: 'واجهة عربية كاملة من اليمين إلى اليسار، مكتوبة بالعربية لا مترجمة عنها، وواجهة إنجليزية كاملة. بدّل بينهما متى شئت من الإعدادات.'
      },
      {
        title: 'دون إنترنت، وبياناتك لك',
        body: 'لا حساب ولا اتصال مطلوب. يبقى كل شيء في ملف قاعدة بيانات واحد على حاسوبك، يمكنك نسخه احتياطيًا أو تصديره بصيغة JSON.'
      }
    ]
  },
  how: {
    title: 'كيف يعمل',
    step: 'الخطوة {n}:',
    steps: [
      {
        title: 'خطّط',
        body: 'أضف ما تحتاج إلى دراسته، وقدّر الوقت الذي يستغرقه، وحدّد له يومًا. واحجز فترات دراسة إن كنت تفضّل جدولًا ثابتًا.'
      },
      {
        title: 'ركّز',
        body: 'ابدأ جلسة بومودورو من المهمة التالية مباشرةً. يُسجَّل الوقت لتلك المهمة، وتليه استراحة عند انتهاء الجلسة.'
      },
      {
        title: 'راجِع',
        body: 'قارن ما خطّطت له بما أنجزته، واعرف المواد التي تأخذ وقتك، وحافظ على مواظبتك.'
      }
    ]
  },
  preview: {
    title: 'شاهده أثناء العمل',
    intro: 'كل شاشة أدناه لقطة حقيقية من عَزم، مملوءة ببيانات تجريبية.',
    tabs: 'الشاشات',
    screens: {
      planner: {
        label: 'اليوم',
        caption: 'فترات الدراسة على خط زمني، إلى جانب التركيز الذي سجّلته فعلًا.',
        alt: 'مخطِّط اليوم: فترات الدراسة المخطّطة وجلسات التركيز المسجّلة جنبًا إلى جنب، مع ملخّص ومهام اليوم.'
      },
      week: {
        label: 'الأسبوع',
        caption: 'المهام غير المجدولة في الأعلى، والأيام السبعة تحتها. يُظهر كل يوم حِمله مقارنةً بهدفك اليومي.',
        alt: 'مخطِّط الأسبوع: مهام غير مجدولة فوق سبعة أعمدة للأيام، لكل يوم شريط حِمل مقارنةً بالهدف اليومي، مع إبراز اليوم الحالي.'
      },
      tasks: {
        label: 'المهام',
        caption: 'مجمّعة حسب ما يحتاج الانتباه أولًا، مع الأولوية والتواريخ والتقدّم في أعمدة متناسقة.',
        alt: 'قائمة مهام مجمّعة في: متأخرة، واليوم، والأيام السبعة القادمة، مع مرشّحات المواد وحقل إضافة سريع وأعمدة للأولوية والتواريخ والتقدّم.'
      },
      stats: {
        label: 'الإحصاءات',
        caption: 'أرقام رئيسية، والتركيز اليومي مقارنةً بهدفك، والأنماط التي تقف وراءه.',
        alt: 'الإحصاءات: أرقام لوقت التركيز وجلسات بومودورو والمهام المنجزة والهدف اليومي والمواظبة، فوق مخطط أعمدة للتركيز اليومي مع خط الهدف.'
      }
    }
  },
  privacy: {
    title: 'بيانات دراستك تبقى لك',
    intro: 'عَزم تطبيق مكتبي يعمل دون إنترنت بالكامل. ما تخطّط له وكيف تدرس شأنك وحدك.',
    points: [
      'لا حساب ولا تسجيل دخول ولا اشتراك.',
      'لا تحليلات ولا تتبّع ولا إعلانات في التطبيق.',
      'لا حاجة إلى اتصال بالإنترنت. الشيء الوحيد الذي يسأل عنه عَزم عبر الإنترنت هو وجود إصدار أحدث على GitHub، ويمكنك إيقاف ذلك من الإعدادات. لا تُرسَل أي بيانات شخصية.',
      'تبقى مهامك وخططك وسجلّ تركيزك في ملف واحد على حاسوبك، يمكنك نسخه احتياطيًا أو تصديره في أي وقت.'
    ],
    site: 'عن هذا الموقع: لا يضع ملفات تعريف ارتباط ولا يستخدم تحليلات. لعرض الإصدار الحالي وروابط التنزيل، يسأل متصفّحك واجهة GitHub العامة عن أحدث إصدار من عَزم.'
  },
  download: {
    title: 'نزّل عَزم',
    version: 'الإصدار {version}',
    released: '، صدر في {date}',
    served: 'تُقدَّم الملفات من إصدارات GitHub.',
    fallback: 'تُنشر الحزم في إصدارات GitHub.',
    format: 'الصيغة',
    arch: 'المعمارية',
    versionLabel: 'الإصدار',
    checking: 'جارٍ التحقّق…',
    notYet: 'غير متاح بعد',
    installFrom: 'التثبيت من الطرفية:',
    checkingRelease: 'جارٍ التحقّق من أحدث إصدار…',
    button: 'تنزيل',
    buttonLabel: 'تنزيل عَزم {version} لنظام {os} ({format})',
    seeReleases: 'عرض الإصدارات على GitHub',
    unconfigured: 'ستظهر التنزيلات هنا بعد إعداد مستودع عَزم على GitHub.',
    none: 'لم يُنشر أي إصدار مستقر بعد.',
    errorSuffix: 'ما زال بإمكانك العثور على كل الإصدارات على GitHub.',
    notIncluded: 'غير متضمَّن في الإصدار {version}.',
    errors: {
      'rate-limited': 'يحدّ GitHub من الطلبات حاليًا.',
      http: 'أجاب GitHub بالحالة {status}.',
      network: 'تعذّر التحقّق من أحدث إصدار.'
    },
    mb: '{n} ميغابايت',
    platforms: {
      rpm: { os: 'Fedora Linux', format: 'حزمة RPM', arch: 'x86_64', requirement: 'جُرِّب على Fedora 41. يتطلّب glibc 2.34 أو أحدث (Fedora 35 فما فوق).' },
      deb: { os: 'Ubuntu Linux', format: 'حزمة DEB', arch: 'x64 (amd64)', requirement: 'جُرِّب على Ubuntu 22.04 LTS. يتطلّب glibc 2.34 أو أحدث.' },
      exe: { os: 'Windows', format: 'مثبّت EXE', arch: 'x64', requirement: 'Windows 10 أو 11 بنظام 64 بت. يُثبَّت لمستخدمك فقط، دون صلاحيات المسؤول.' }
    }
  },
  faq: {
    title: 'أسئلة',
    items: [
      {
        q: 'هل أحتاج إلى حساب أو اتصال بالإنترنت؟',
        a: 'لا. يعمل عَزم على حاسوبك بالكامل، وبالطريقة نفسها مع الاتصال أو دونه. حين تكون متصلًا يتحقّق من وجود إصدارات جديدة على GitHub، ويمكنك إيقاف ذلك من الإعدادات.'
      },
      {
        q: 'ما معنى الاسم؟',
        a: 'العَزم هو الإرادة الثابتة على المضيّ قُدمًا. كان التطبيق يُسمّى FocusFlow؛ تغيّر الاسم والمظهر فقط، وتنتقل بياناتك كما هي.'
      },
      {
        q: 'هل عَزم بالعربية أم بالإنجليزية؟',
        a: 'بالاثنتين. صُمِّم عَزم بالعربية أولًا بواجهة كاملة من اليمين إلى اليسار، والإنجليزية لغة ثانية كاملة. بدّل متى شئت من الإعدادات ← اللغة، ولن تتأثّر بياناتك. النسخ المثبّتة قبل الإصدار 0.4 تبقى بالإنجليزية حتى تبدّل.'
      },
      {
        q: 'أين تُحفظ بياناتي؟',
        a: 'في ملف قاعدة بيانات واحد داخل مجلد المستخدم: ‎~/.config/Azm/focusflow.sqlite على Linux، و‎%APPDATA%\\Azm\\focusflow.sqlite على Windows. إن كنت استخدمت عَزم حين كان اسمه FocusFlow، فسيواصل استخدام مجلد FocusFlow الحالي فلا يضيع شيء. إلغاء تثبيت التطبيق لا يحذف الملف.'
      },
      {
        q: 'كيف أنقل بياناتي إلى حاسوب آخر؟',
        a: 'من الإعدادات، في قسم «بياناتك»، انسخ قاعدة البيانات احتياطيًا أو صدّر كل شيء بصيغة JSON، ثم استعِدها أو استوردها على الحاسوب الآخر. يحفظ عَزم نسخة من البيانات الحالية قبل استبدالها.'
      },
      {
        q: 'يحذّرني Windows من أن ناشر المثبّت غير معروف. لماذا؟',
        a: 'المثبّت غير موقَّع رقميًا بعد، لذا لا يستطيع Windows SmartScreen التعرّف على الناشر. إن نزّلته من صفحة إصدارات عَزم على GitHub، فاختر «مزيد من المعلومات» ثم «التشغيل على أي حال».'
      },
      {
        q: 'كيف أحدّث إلى إصدار جديد؟',
        a: 'يخبرك عَزم بصدور إصدار جديد. على Windows يمكنه تنزيل التحديث وتثبيته حين تختار «تثبيت وإعادة تشغيل». على Fedora وUbuntu يوفّر رابط الحزمة الجديدة، فتثبّتها فوق القديمة باستخدام dnf أو apt. تبقى مهامك وسجلّك وإعداداتك دائمًا.'
      },
      {
        q: 'هل يعمل على macOS أو توزيعات Linux أخرى؟',
        a: 'تتوفّر حزم لـ Fedora (RPM) وUbuntu (DEB) وWindows. لا يوجد إصدار لـ macOS حاليًا. قد تعمل توزيعات أخرى مبنية على Debian أو Fedora، لكنها لم تُجرَّب.'
      }
    ]
  },
  footer: {
    source: 'الشيفرة المصدرية على GitHub',
    license: 'لم تُحدَّد الرخصة بعد',
    top: 'العودة إلى الأعلى'
  }
}

const catalogues: Record<Lang, Messages> = { ar, en }

/** The active catalogue. Use `fill` for {placeholders}. */
export const m = computed(() => catalogues[lang.value])

export function fill(text: string, params: Record<string, string | number>): string {
  return text.replace(/\{(\w+)\}/g, (_, k: string) => String(params[k] ?? `{${k}}`))
}

/** Keeps <html lang/dir>, the title and the description in step with the language. */
export function useDocumentLanguage(): void {
  watchEffect(() => {
    const l = lang.value
    document.documentElement.lang = l
    document.documentElement.dir = l === 'ar' ? 'rtl' : 'ltr'
    document.title = catalogues[l].meta.title
    document.querySelector('meta[name="description"]')?.setAttribute('content', catalogues[l].meta.description)
  })
}

export { catalogues }
