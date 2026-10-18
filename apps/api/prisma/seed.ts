import {
  AppointmentStatus,
  ExerciseLevel,
  MachineCategory,
  MembershipStatus,
  PrismaClient,
  Role,
  SponsorTier,
  TrialStatus,
} from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();
const demoPassword = 'password123';

function dateFromNow(dayOffset: number, hour = 12): Date {
  const date = new Date();
  date.setUTCHours(hour, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + dayOffset);
  return date;
}

function dateMonthsFromNow(monthOffset: number, day = 12): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + monthOffset, day, 12));
}

function shiftMonths(date: Date, monthOffset: number): Date {
  return new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth() + monthOffset,
    date.getUTCDate(),
    date.getUTCHours(),
  ));
}

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

type DemoUser = {
  email: string;
  name: string;
  role: Role;
};

async function upsertUser(
  user: DemoUser,
  passwordHash: string,
  now: Date,
) {
  return prisma.user.upsert({
    where: { email: user.email },
    update: {
      passwordHash,
      role: user.role,
      status: 'ACTIVE',
      locale: 'mk',
      emailVerifiedAt: now,
      profile: {
        upsert: {
          update: { name: user.name },
          create: { name: user.name },
        },
      },
    },
    create: {
      email: user.email,
      passwordHash,
      role: user.role,
      status: 'ACTIVE',
      locale: 'mk',
      emailVerifiedAt: now,
      profile: { create: { name: user.name } },
    },
    include: { profile: true },
  });
}

const trainerContent = [
  {
    bio: 'Тренер за сила што ти помага да напредуваш постепено, со добра техника и одржлив план. / Strength coach helping you progress steadily with sound technique and a sustainable plan.',
    specialties: [
      'Силов тренинг / Strength training',
      'Техника и прогресија / Technique and progression',
    ],
    photoUrl: null,
  },
  {
    bio: 'Им помага на почетниците да ја совладаат техниката и да изградат рутина што можат да ја одржат. / Helps beginners build confident technique and a routine they can maintain.',
    specialties: [
      'Функционален тренинг / Functional training',
      'Подвижност / Mobility',
      'Програми за почетници / Beginner programmes',
    ],
    photoUrl: null,
  },
  {
    bio: 'Планира тренинзи за подобра кондиција и сила, со постепено враќање во активна форма. / Plans training for better conditioning and strength, with a gradual return to activity.',
    specialties: [
      'Кондициски тренинг / Conditioning',
      'Силов тренинг / Strength training',
      'Индивидуално планирање / Individual planning',
    ],
    photoUrl: null,
  },
];

type ExerciseContent = {
  nameMk: string;
  nameEn: string;
  level: ExerciseLevel;
  sets: number;
  reps: number;
  stepsMk: string[];
  stepsEn: string[];
  mistakesMk: string[];
  mistakesEn: string[];
  safetyMk: string[];
  safetyEn: string[];
};

type MachineContent = {
  slug: string;
  youtubeVideoId: string;
  nameMk: string;
  nameEn: string;
  category: MachineCategory;
  descriptionMk: string;
  descriptionEn: string;
  difficulty: number;
  muscles: [string, string];
  exercises: [ExerciseContent, ExerciseContent];
};

function exercise(
  nameMk: string,
  nameEn: string,
  stepsMk: string[],
  stepsEn: string[],
  mistakesMk: string[],
  mistakesEn: string[],
  safetyMk: string[],
  safetyEn: string[],
  level: ExerciseLevel = ExerciseLevel.BEGINNER,
): ExerciseContent {
  return {
    nameMk,
    nameEn,
    level,
    sets: 3,
    reps: 10,
    stepsMk,
    stepsEn,
    mistakesMk,
    mistakesEn,
    safetyMk,
    safetyEn,
  };
}

const machines: MachineContent[] = [
  {
    slug: 'barbell-squat',
    youtubeVideoId: 'dW3zj79xfrc',
    nameMk: 'Чучњ со шипка',
    nameEn: 'Barbell squat',
    category: MachineCategory.LEGS,
    descriptionMk: 'Основно сложено движење за сила на нозете и колковите.',
    descriptionEn: 'A foundational compound lift for leg and hip strength.',
    difficulty: 2,
    muscles: ['quadriceps', 'glutes'],
    exercises: [
      exercise('Чучњ со шипка', 'Barbell squat',
        ['Намести ја шипката на горниот дел од грбот и застани со стапалата во ширина на рамениците.', 'Вдиши, турни ги колковите назад и спушти се додека колковите не се под нивото на колената.', 'Турни низ цело стапало и исправи се без да ги заклучиш колената.'],
        ['Set the bar across your upper back and stand with feet shoulder-width apart.', 'Brace, sit your hips back and lower until your hips are just below knee level.', 'Drive through the whole foot and stand without snapping your knees straight.'],
        ['Колената паѓаат навнатре.', 'Петиците се одвојуваат од подот.'],
        ['Knees collapse inward.', 'Heels lift from the floor.'],
        ['Постави ги сигурносните држачи пред работната серија.', 'Прекини ако чувствуваш остра болка.'],
        ['Set the safety bars before working sets.', 'Stop if you feel sharp pain.'],
        ExerciseLevel.INTERMEDIATE),
      exercise('Гоблет чучњ', 'Goblet squat',
        ['Држи тег близу до градите и постави ги стапалата малку пошироко од колковите.', 'Спушти се контролирано со исправен труп и колена во насока на прстите.', 'Притисни низ цело стапало и врати се во стоечка положба.'],
        ['Hold a dumbbell close to your chest and stand slightly wider than hip-width.', 'Lower under control, keeping your torso tall and knees aligned with your toes.', 'Press through the whole foot to return to standing.'],
        ['Тегот се оддалечува од градите.', 'Движењето станува брзо и неконтролирано.'],
        ['The weight drifts away from the chest.', 'The descent becomes rushed or uncontrolled.'],
        ['Избери тежина што ти дозволува целосен опсег без губење рамнотежа.', 'Остави простор околу себе.'],
        ['Choose a load that allows a full range without losing balance.', 'Keep clear space around you.']),
    ],
  },
  {
    slug: 'leg-press',
    youtubeVideoId: 'EotSw18oR9w',
    nameMk: 'Преса за нозе',
    nameEn: 'Leg press',
    category: MachineCategory.LEGS,
    descriptionMk: 'Стабилна станица за контролирано туркање со нозете.',
    descriptionEn: 'A stable station for controlled lower-body pressing.',
    difficulty: 1,
    muscles: ['quadriceps', 'glutes'],
    exercises: [
      exercise('Преса за нозе', 'Leg press',
        ['Намести го седиштето така што колената се свиткани без да се притискаат кон градите.', 'Постави ги стапалата во ширина на рамениците и ослободи ги рачките.', 'Спушти ја платформата до удобна длабочина, па турни без целосно заклучување на колената.'],
        ['Adjust the seat so your knees bend comfortably without pressing into your chest.', 'Place feet shoulder-width apart and release the safety handles.', 'Lower to a comfortable depth, then press without locking your knees.'],
        ['Долниот дел од грбот се одвојува од потпирачот.', 'Колената се заклучуваат на врвот.'],
        ['The lower back lifts from the pad.', 'The knees lock out at the top.'],
        ['Провери ги безбедносните запирачи пред да почнеш.', 'Не спуштај под опсегот што можеш да го контролираш.'],
        ['Check the safety stops before starting.', 'Do not lower farther than you can control.']),
      exercise('Едноножна преса', 'Single-leg press',
        ['Постави едно стапало во средина на платформата и држи го колкот рамно на седиштето.', 'Ослободи ја платформата и спушти ја со контрола.', 'Турни преку стапалото и заврши со благо свиткано колено.'],
        ['Place one foot near the center of the platform and keep your hips level on the seat.', 'Release the platform and lower it under control.', 'Press through the foot and finish with a soft knee.'],
        ['Карлицата се врти настрана.', 'Се користи преголема тежина за едната нога.'],
        ['The pelvis rotates to one side.', 'The load is too heavy for one leg.'],
        ['Почни значително полесно отколку со двоножната варијанта.', 'Држи ги рачките до крајот на серијата.'],
        ['Start much lighter than with the two-leg variation.', 'Hold the handles throughout the set.']),
    ],
  },
  {
    slug: 'bench-press',
    youtubeVideoId: 'hWbUlkb5Ms4',
    nameMk: 'Бенч-прес',
    nameEn: 'Bench press',
    category: MachineCategory.CHEST,
    descriptionMk: 'Хоризонтално потиснување за гради, раменици и трицепс.',
    descriptionEn: 'A horizontal press for the chest, shoulders and triceps.',
    difficulty: 2,
    muscles: ['pectorals', 'triceps'],
    exercises: [
      exercise('Бенч-прес со шипка', 'Barbell bench press',
        ['Постави ги очите под шипката, стапалата цврсто на подот и лопатките собрани.', 'Отклучи ја шипката и спушти ја кон средината на градите со лактите под агол.', 'Турни ја нагоре во права линија и задржи ги зглобовите над лактите.'],
        ['Position your eyes under the bar, feet planted and shoulder blades set.', 'Unrack and lower the bar toward mid-chest with elbows angled comfortably.', 'Press up in a steady path, keeping wrists stacked over elbows.'],
        ['Зглобовите се свиткуваат наназад.', 'Колковите се креваат од клупата.'],
        ['Wrists bend far backward.', 'Hips lift off the bench.'],
        ['Користи безбедносни држачи или побарај помошник.', 'Не тестирај максимална тежина сам.'],
        ['Use safety arms or ask for a spotter.', 'Do not attempt a max lift alone.'],
        ExerciseLevel.INTERMEDIATE),
      exercise('Потисок со тегови', 'Dumbbell chest press',
        ['Седни со теговите на бутовите, легни и постави ги теговите до градите.', 'Притисни ги над градите со дланките свртени напред или една кон друга.', 'Спушти ги до удобна длабочина со лактите под контрола.'],
        ['Sit with dumbbells on your thighs, lie back and bring them beside your chest.', 'Press over your chest with palms forward or facing each other.', 'Lower to a comfortable depth while controlling your elbows.'],
        ['Теговите се судираат над главата.', 'Рамената се креваат кон ушите.'],
        ['The dumbbells collide above the chest.', 'Shoulders shrug toward the ears.'],
        ['Користи помош при поставување тешки тегови.', 'Одржувај стабилна положба на рамената.'],
        ['Get help positioning heavy dumbbells.', 'Keep your shoulders stable.']),
    ],
  },
  {
    slug: 'pec-deck',
    youtubeVideoId: 'a9vQ_hwIksU',
    nameMk: 'Пек-дек',
    nameEn: 'Pec deck',
    category: MachineCategory.CHEST,
    descriptionMk: 'Контролирано собирање на рацете за активирање на градите.',
    descriptionEn: 'A controlled arm adduction movement for the chest.',
    difficulty: 1,
    muscles: ['pectorals', 'shoulders'],
    exercises: [
      exercise('Собирање на пек-дек', 'Pec deck fly',
        ['Намести ги рачките така што лактите се малку под нивото на рамениците.', 'Држи ги градите исправени и приближи ги рацете пред телото.', 'Врати се бавно додека не почувствуваш удобно истегнување.'],
        ['Set the handles so your elbows sit slightly below shoulder height.', 'Keep your chest tall and bring your arms together in front.', 'Return slowly until you feel a comfortable stretch.'],
        ['Рамената се истегнуваат нанапред.', 'Рацете се удираат во центарот.'],
        ['Shoulders roll forward.', 'The handles crash together.'],
        ['Намали го опсегот ако има непријатност во рамото.', 'Држи ги грбот и главата потпрени.'],
        ['Shorten the range if your shoulder feels uncomfortable.', 'Keep your back and head supported.']),
      exercise('Еднорачна пек-дек преса', 'Single-arm pec deck',
        ['Постави едно седиште и рачка така што рамото останува удобно.', 'Привлечи ја рачката кон средината без да го вртиш трупот.', 'Врати ја полека и повтори пред да ја смениш страната.'],
        ['Set the seat and handle so your shoulder stays comfortable.', 'Bring the handle toward your midline without rotating your torso.', 'Return slowly and finish the set before switching sides.'],
        ['Трупот се врти за да се заврши повторувањето.', 'Раката се исправа целосно со напор.'],
        ['The torso twists to finish the repetition.', 'The arm is forced fully straight.'],
        ['Користи мала тежина и држи го трупот стабилен.', 'Прекини при остра болка.'],
        ['Use a light load and keep your torso still.', 'Stop if you feel sharp pain.']),
    ],
  },
  {
    slug: 'lat-pulldown',
    youtubeVideoId: 'bNmvKpJSWKM',
    nameMk: 'Лат-повлекување',
    nameEn: 'Lat pulldown',
    category: MachineCategory.BACK,
    descriptionMk: 'Повлекување одозгора за грбот и контролата на лопатките.',
    descriptionEn: 'An overhead pull for the back and shoulder-blade control.',
    difficulty: 1,
    muscles: ['latissimus dorsi', 'biceps'],
    exercises: [
      exercise('Лат-повлекување пред тело', 'Front lat pulldown',
        ['Намести ги бутовите под перницата и фати ја шипката малку пошироко од рамениците.', 'Спушти ги лопатките, па повлечи ја шипката кон горниот дел на градите.', 'Испружи ги рацете контролирано без да ги кренеш рамената.'],
        ['Secure your thighs under the pad and grip the bar just wider than shoulder-width.', 'Set your shoulder blades, then pull the bar toward your upper chest.', 'Extend your arms under control without shrugging.'],
        ['Шипката се повлекува зад вратот.', 'Телото се ниша наназад.'],
        ['The bar is pulled behind the neck.', 'The torso swings backward.'],
        ['Почни со тежина што не те крева од седиштето.', 'Држи ја главата во неутрална положба.'],
        ['Choose a load that keeps you seated.', 'Keep your head in a neutral position.']),
      exercise('Прави раце на сајла', 'Straight-arm cable pulldown',
        ['Застани пред високата сајла со меки колена и исправен труп.', 'Со благо свиткани лакти повлечи ја шипката кон бутовите.', 'Врати ја до висина на рамената без да го изгубиш затегнувањето.'],
        ['Stand facing a high cable with soft knees and a tall torso.', 'With elbows slightly bent, pull the bar toward your thighs.', 'Return to shoulder height without losing control.'],
        ['Лактите се виткаат премногу.', 'Долниот дел од грбот се пренавалува.'],
        ['The elbows bend excessively.', 'The lower back arches.'],
        ['Користи лесен товар и движи ги само рамената.', 'Остави простор од кабелот.'],
        ['Use a light load and move through the shoulders.', 'Keep clear of the cable path.']),
    ],
  },
  {
    slug: 'seated-row',
    youtubeVideoId: 'qD1WZ5pSuvk',
    nameMk: 'Седечко веслање',
    nameEn: 'Seated row',
    category: MachineCategory.BACK,
    descriptionMk: 'Хоризонтално повлекување за средниот грб и држењето.',
    descriptionEn: 'A horizontal pull for the mid-back and posture.',
    difficulty: 1,
    muscles: ['middle back', 'biceps'],
    exercises: [
      exercise('Седечко веслање со сајла', 'Seated cable row',
        ['Седни со исправен труп, благо свиткани колена и стапала на потпирачите.', 'Повлечи ја рачката кон долните ребра и приближи ги лопатките.', 'Испружи ги рацете бавно без да го заоблиш грбот.'],
        ['Sit tall with soft knees and feet braced on the supports.', 'Pull the handle toward your lower ribs and draw your shoulder blades together.', 'Extend your arms slowly without rounding your back.'],
        ['Трупот се ниша при секое повторување.', 'Рамената се креваат кон ушите.'],
        ['The torso rocks on every repetition.', 'Shoulders shrug toward the ears.'],
        ['Држи го трупот стабилен и намали ја тежината ако е потребно.', 'Не ја пуштај рачката нагло.'],
        ['Keep your torso still and reduce the load if needed.', 'Do not release the handle suddenly.']),
      exercise('Еднорачно веслање со сајла', 'Single-arm cable row',
        ['Застани исправено покрај сајлата и фати ја рачката со едната рака.', 'Повлечи го лактот назад кон колкот без да го вртиш трупот.', 'Испружи ја раката контролирано и повтори на другата страна.'],
        ['Stand tall beside the cable and hold the handle with one hand.', 'Pull your elbow toward your hip without rotating your torso.', 'Extend with control and repeat on the other side.'],
        ['Колкот се врти кон сајлата.', 'Раката ја презема работата од грбот.'],
        ['The hip rotates toward the cable.', 'The arm takes over the movement.'],
        ['Почни лесно и држи ги ребрата над карлицата.', 'Провери ја стабилноста на рачката.'],
        ['Start light and keep your ribs stacked over your hips.', 'Check that the handle is secure.']),
    ],
  },
  {
    slug: 'shoulder-press',
    youtubeVideoId: '6v4nrRVySj0',
    nameMk: 'Потисок за раменици',
    nameEn: 'Shoulder press',
    category: MachineCategory.SHOULDERS,
    descriptionMk: 'Вертикално потиснување со стабилна поддршка за грбот.',
    descriptionEn: 'An overhead press with stable back support.',
    difficulty: 1,
    muscles: ['shoulders', 'triceps'],
    exercises: [
      exercise('Машински потисок за раменици', 'Machine shoulder press',
        ['Намести ги рачките на висина на рамениците и потпри го грбот.', 'Притисни нагоре без да ги кренеш рамената кон ушите.', 'Спушти ги рачките бавно до почетната положба.'],
        ['Set the handles near shoulder height and support your back.', 'Press upward without shrugging toward your ears.', 'Lower the handles slowly to the start.'],
        ['Грбот се одвојува од потпирачот.', 'Лактите се спуштаат предлабоко.'],
        ['The back lifts from the pad.', 'Elbows drop too far below the body.'],
        ['Избери опсег без болка и држи ги стапалата на подот.', 'Не удирај ги граничниците.'],
        ['Choose a pain-free range and keep your feet planted.', 'Do not slam the stops.']),
      exercise('Потисок со тегови над глава', 'Dumbbell overhead press',
        ['Застани или седни стабилно со теговите до рамениците.', 'Затегни го стомакот и притисни ги теговите над глава.', 'Спушти ги бавно до висина на рамениците.'],
        ['Stand or sit securely with dumbbells beside your shoulders.', 'Brace your midsection and press the weights overhead.', 'Lower slowly to shoulder height.'],
        ['Ребрата се отвораат и грбот се пренавалува.', 'Теговите се движат предалеку нанапред.'],
        ['The ribs flare and the back arches.', 'The weights drift too far forward.'],
        ['Користи седечка варијанта ако рамнотежата е предизвик.', 'Прекини ако рамото е болно.'],
        ['Use the seated variation if balance is a challenge.', 'Stop if your shoulder hurts.']),
    ],
  },
  {
    slug: 'lateral-raise',
    youtubeVideoId: 'Kl3LEzQ5Zqs',
    nameMk: 'Странично подигање',
    nameEn: 'Lateral raise',
    category: MachineCategory.SHOULDERS,
    descriptionMk: 'Лесно контролирано подигање за страничниот дел на рамото.',
    descriptionEn: 'A light, controlled raise for the side deltoids.',
    difficulty: 1,
    muscles: ['shoulders', 'trapezius'],
    exercises: [
      exercise('Странично подигање со тегови', 'Dumbbell lateral raise',
        ['Застани исправено со лесни тегови покрај бутовите и благо свиткани лакти.', 'Подигни ги рацете до висина на рамениците без замав.', 'Спушти ги теговите полека до телото.'],
        ['Stand tall with light dumbbells at your sides and elbows softly bent.', 'Raise your arms to shoulder height without swinging.', 'Lower the weights slowly to your sides.'],
        ['Теговите се креваат повисоко од рамениците.', 'Трупот се ниша за да помогне.'],
        ['The weights rise above shoulder height.', 'The torso swings to create momentum.'],
        ['Почни со многу лесни тегови.', 'Држи ги зглобовите исправени.'],
        ['Start with very light weights.', 'Keep your wrists neutral.']),
      exercise('Странично подигање на сајла', 'Cable lateral raise',
        ['Застани покрај ниска сајла и фати ја рачката со надворешната рака.', 'Со мек лакт подигни ја раката странично до висина на рамото.', 'Врати ја полека преку телото со постојано затегнување.'],
        ['Stand beside a low cable and hold the handle with your outside hand.', 'With a soft elbow, raise your arm out to shoulder height.', 'Return slowly across your body while maintaining tension.'],
        ['Раменото се крева кон увото.', 'Тежината го влече телото настрана.'],
        ['The shoulder shrugs toward the ear.', 'The load pulls the body sideways.'],
        ['Намали ја тежината ако не можеш да стоиш стабилно.', 'Одржувај простор околу сајлата.'],
        ['Reduce the load if you cannot stand steadily.', 'Keep clear space around the cable.']),
    ],
  },
  {
    slug: 'bicep-curl',
    youtubeVideoId: 'MKWBV29S6c0',
    nameMk: 'Свиткување за бицепс',
    nameEn: 'Biceps curl',
    category: MachineCategory.ARMS,
    descriptionMk: 'Контролирано свиткување на лактот за предниот дел на раката.',
    descriptionEn: 'A controlled elbow curl for the front of the upper arm.',
    difficulty: 1,
    muscles: ['biceps', 'forearms'],
    exercises: [
      exercise('Свиткување со тегови', 'Dumbbell curl',
        ['Застани со теговите покрај телото и лактите блиску до ребрата.', 'Свиткај ги лактите и подигни ги теговите без да го движиш трупот.', 'Спушти ги рацете до речиси целосно испружување.'],
        ['Stand with dumbbells at your sides and elbows close to your ribs.', 'Curl the weights without moving your torso.', 'Lower your arms until almost fully extended.'],
        ['Телото се ниша наназад.', 'Зглобовите се свиткуваат.'],
        ['The body rocks backward.', 'The wrists bend.'],
        ['Избери тежина што можеш да ја спуштиш контролирано.', 'Не ги заклучувај лактите со сила.'],
        ['Choose a load you can lower under control.', 'Do not forcefully lock your elbows.']),
      exercise('Скот-клупа', 'Preacher curl',
        ['Постави ги надлактиците на потпирачот и фати ја шипката или теговите.', 'Свиткај ги лактите до удобна контракција без да ги поместиш рацете.', 'Спушти ја тежината бавно и запре пред лактите да се преоптегнат.'],
        ['Place your upper arms on the pad and grip the bar or dumbbells.', 'Curl to a comfortable contraction without lifting your arms from the pad.', 'Lower slowly and stop before your elbows are forced into full extension.'],
        ['Тежината се испушта во долната положба.', 'Рамената се креваат од потпирачот.'],
        ['The weight drops at the bottom.', 'Shoulders lift from the pad.'],
        ['Користи полесен товар поради фиксираниот агол.', 'Побарај помош при враќање на тешка шипка.'],
        ['Use a lighter load because the angle is fixed.', 'Ask for help returning a heavy bar.']),
    ],
  },
  {
    slug: 'tricep-pushdown',
    youtubeVideoId: 'u36jNfqh8_U',
    nameMk: 'Трицепс-потисок',
    nameEn: 'Triceps pushdown',
    category: MachineCategory.ARMS,
    descriptionMk: 'Потисок на сајла со стабилни надлактици за трицепс.',
    descriptionEn: 'A cable press with steady upper arms for the triceps.',
    difficulty: 1,
    muscles: ['triceps', 'shoulders'],
    exercises: [
      exercise('Потисок со јаже', 'Rope pushdown',
        ['Застани пред високата сајла и фати ги краевите на јажето.', 'Држи ги лактите покрај телото и исправи ги подлактиците надолу.', 'Раздвои ги краевите на дното и врати се бавно.'],
        ['Stand at a high cable and hold both ends of the rope.', 'Keep elbows by your sides and extend your forearms downward.', 'Separate the rope at the bottom, then return slowly.'],
        ['Лактите се движат нанапред-назад.', 'Рамената ја преземаат работата.'],
        ['The elbows drift forward and back.', 'The shoulders take over the movement.'],
        ['Постави ја тежината така што можеш да стоиш исправено.', 'Не ја пуштај сајлата нагло.'],
        ['Choose a load that lets you stand tall.', 'Do not release the cable suddenly.']),
      exercise('Трицепс-екстензија над глава', 'Overhead triceps extension',
        ['Фати јаже на ниска сајла, сврти се со грб кон машината и крени ги рацете.', 'Испружи ги лактите над глава без да ги шириш настрана.', 'Свиткај ги лактите зад глава со контрола и повтори.'],
        ['Attach a rope to a low cable, face away and raise your hands overhead.', 'Extend your elbows without letting them flare widely.', 'Bend your elbows under control behind your head and repeat.'],
        ['Долниот дел од грбот се пренавалува.', 'Лактите се отвораат премногу.'],
        ['The lower back arches.', 'The elbows flare excessively.'],
        ['Затегни го трупот и намали го опсегот ако рамото е чувствително.', 'Провери дали јажето е добро прикачено.'],
        ['Brace your midsection and shorten the range if your shoulder is sensitive.', 'Check that the rope is securely attached.']),
    ],
  },
  {
    slug: 'plank-station',
    youtubeVideoId: 'F-C0CzNK22s',
    nameMk: 'Станица за планк',
    nameEn: 'Core station',
    category: MachineCategory.CORE,
    descriptionMk: 'Стабилна подлога за вежби за трупот и контрола на телото.',
    descriptionEn: 'A stable platform for trunk training and body control.',
    difficulty: 1,
    muscles: ['abdominals', 'obliques'],
    exercises: [
      exercise('Планк на подлактици', 'Forearm plank',
        ['Постави ги лактите под рамениците и испружи ги нозете зад себе.', 'Затегни го стомакот и држи линија од глава до петици.', 'Диши мирно и прекини кога колковите ќе почнат да паѓаат.'],
        ['Place your elbows under your shoulders and extend your legs behind you.', 'Brace your core and keep a straight line from head to heels.', 'Breathe steadily and stop when your hips begin to sag.'],
        ['Колковите пропаѓаат или се креваат високо.', 'Здивот се задржува.'],
        ['The hips sag or rise too high.', 'Breathing is held.'],
        ['Почни со кратки задржувања и одмори меѓу нив.', 'Користи колена на подот ако ти треба полесна варијанта.'],
        ['Start with short holds and rest between them.', 'Use a knee-supported version if you need an easier option.']),
      exercise('Страничен планк', 'Side plank',
        ['Легни на страна со лактот под рамото и стапалата едно врз друго.', 'Подигни ги колковите и држи ги рамениците, колковите и глуждовите во линија.', 'Спушти се мирно и повтори на другата страна.'],
        ['Lie on your side with your elbow under your shoulder and feet stacked.', 'Lift your hips and align shoulders, hips and ankles.', 'Lower smoothly and repeat on the other side.'],
        ['Трупот се врти кон подот.', 'Рамото се турка кон увото.'],
        ['The torso rotates toward the floor.', 'The shoulder shrugs toward the ear.'],
        ['Спушти го долното колено за полесна варијанта.', 'Прекини ако имаш болка во рамото.'],
        ['Lower your bottom knee for an easier variation.', 'Stop if your shoulder hurts.']),
    ],
  },
  {
    slug: 'treadmill',
    youtubeVideoId: 'y_CoBECEdNA',
    nameMk: 'Трака за трчање',
    nameEn: 'Treadmill',
    category: MachineCategory.CARDIO,
    descriptionMk: 'Кардио станица со прилагодливо темпо и наклон.',
    descriptionEn: 'A cardio station with adjustable pace and incline.',
    difficulty: 1,
    muscles: ['cardiovascular system', 'calves'],
    exercises: [
      exercise('Одење со наклон', 'Incline walk',
        ['Застани на страничните платформи и прицврсти ја безбедносната штипка.', 'Започни бавно, па зголеми го наклонот и темпото постепено.', 'Гледај напред и заврши со намалување на брзината.'],
        ['Stand on the side rails and attach the safety clip.', 'Start slowly, then increase incline and pace gradually.', 'Look ahead and finish by reducing the speed.'],
        ['Се држиш за рачките цело време.', 'Наклонот или брзината се зголемуваат нагло.'],
        ['The handrails are held throughout.', 'Incline or speed is increased abruptly.'],
        ['Користи ги рачките само за влегување и излегување.', 'Знај каде е копчето за итно запирање.'],
        ['Use the rails only to step on and off.', 'Know where the emergency stop is.']),
      exercise('Интервали на трака', 'Treadmill intervals',
        ['Загреј се со лесно одење неколку минути.', 'Наизменично трчај краток интервал и закрепнувај со одење.', 'Намали ја брзината и олади се пред да слезеш.'],
        ['Warm up with several minutes of easy walking.', 'Alternate a short running interval with a walking recovery.', 'Reduce speed and cool down before stepping off.'],
        ['Се започнува со максимално темпо.', 'Се слегува додека лентата се движи.'],
        ['The session starts at maximum speed.', 'The belt is exited while still moving.'],
        ['Избери темпо според кондицијата и користи безбедносна штипка.', 'Слез на страничните платформи кога ќе запре лентата.'],
        ['Choose a pace suited to your fitness and use the safety clip.', 'Step onto the side rails after the belt stops.']),
    ],
  },
  {
    slug: 'elliptical-trainer',
    youtubeVideoId: 'EesEvYohy5o',
    nameMk: 'Елиптична тренажерка',
    nameEn: 'Elliptical trainer',
    category: MachineCategory.CARDIO,
    descriptionMk: 'Кардио тренажерка со низок удар за непрекинато движење на целото тело.',
    descriptionEn: 'A low-impact cardio machine for continuous full-body movement.',
    difficulty: 1,
    muscles: ['cardiovascular system', 'quadriceps'],
    exercises: [
      exercise('Рамномерно елиптично движење', 'Steady elliptical session',
        ['Застани на педалите и фати ги неподвижните рачки пред да започнеш.', 'Избери лесен отпор и движи ги рацете и нозете во мазен ритам.', 'Зголеми го отпорот постепено, па намали го за да се оладиш.'],
        ['Step onto the pedals and hold the stationary handles before starting.', 'Choose a light resistance and move your arms and legs in a smooth rhythm.', 'Increase resistance gradually, then ease off to cool down.'],
        ['Се потпираш врз рачките.', 'Отпорот се зголемува пребрзо.'],
        ['Leaning heavily on the handles.', 'Increasing resistance too quickly.'],
        ['Зачекори на педалите додека машината е запрена.', 'Запри ако почувствуваш вртоглавица или остра болка.'],
        ['Step onto the pedals while the machine is stopped.', 'Stop if you feel dizzy or experience sharp pain.']),
      exercise('Интервали на елиптична тренажерка', 'Elliptical intervals',
        ['Започни со лесно темпо неколку минути.', 'Менувај кратки побрзи интервали со подолги периоди на лесно движење.', 'Заврши со неколку минути лесно темпо и почекај педалите да запрат.'],
        ['Start with an easy pace for several minutes.', 'Alternate short faster intervals with longer periods of easy movement.', 'Finish with a few easy minutes and wait for the pedals to stop.'],
        ['Се забрзува пред загревање.', 'Телото се ниша за да се придвижат рачките.'],
        ['Speeding up before warming up.', 'Rocking the torso to move the handles.'],
        ['Избери интервали што можеш да ги одржиш со контролирано дишење.', 'Држи ги стапалата целосно на педалите.'],
        ['Choose intervals that allow controlled breathing.', 'Keep both feet fully on the pedals.']),
    ],
  },
  {
    slug: 'cable-crossover',
    youtubeVideoId: 'I-Ue34qLxc4',
    nameMk: 'Кросовер со сајли',
    nameEn: 'Cable crossover',
    category: MachineCategory.CHEST,
    descriptionMk: 'Прилагодлива сајла за контролирано спојување на рацете пред телото.',
    descriptionEn: 'An adjustable cable station for controlled arm adduction in front of the body.',
    difficulty: 2,
    muscles: ['pectorals', 'shoulders'],
    exercises: [
      exercise('Кросовер за гради', 'Cable chest fly',
        ['Постави ги сајлите над нивото на рамениците и застани стабилно во средина.', 'Со благо свиткани лакти, спој ги рацете пред градите.', 'Врати ги рацете наназад само до удобен опсег и повтори.'],
        ['Set the cables above shoulder height and stand steadily in the middle.', 'With a soft bend in your elbows, bring your hands together in front of your chest.', 'Return your arms only to a comfortable range and repeat.'],
        ['Лактите се заклучуваат.', 'Тежината ја влече раката предлабоко наназад.'],
        ['Locking the elbows.', 'Letting the load pull the arms too far back.'],
        ['Почни со мала тежина и провери ги приклучоците на сајлите.', 'Движи се контролирано без болка во рамото.'],
        ['Start with a light load and check the cable attachments.', 'Move under control and avoid shoulder pain.']),
      exercise('Низок кросовер за гради', 'Low cable fly',
        ['Постави ги рачките на ниска позиција и застани со едната нога малку напред.', 'Подигни ги рацете во лак до висина на градите без да го нишаш трупот.', 'Врати се бавно до почетната положба.'],
        ['Set the handles low and stand with one foot slightly forward.', 'Raise your arms in an arc to chest height without swinging your torso.', 'Return slowly to the starting position.'],
        ['Се користи замав од колковите.', 'Рацете се креваат над нивото на рамениците.'],
        ['Using momentum from the hips.', 'Raising the hands above shoulder level.'],
        ['Затегни го трупот и избери тежина што можеш да ја контролираш.', 'Држи ги зглобовите неутрални.'],
        ['Brace your trunk and choose a load you can control.', 'Keep your wrists neutral.']),
    ],
  },
];

const gymRules = [
  ['Почитувај го просторот', 'Respect the space', 'Остави простор околу справите и внимавај на луѓето што тренираат во близина.', 'Leave room around equipment and stay aware of people training nearby.', 'people'],
  ['Врати ја опремата', 'Return equipment', 'Врати ги теговите и додатоците на означеното место по секоја серија.', 'Return weights and attachments to their marked storage place after each set.', 'equipment'],
  ['Исчисти по користење', 'Wipe down after use', 'Избриши ги клупата, рачките и подлогата по употреба. Средствата за чистење се достапни низ салата.', 'Wipe benches, handles and mats after use. Cleaning supplies are available throughout the gym.', 'clean'],
  ['Тренирај со контрола', 'Train with control', 'Избери тежина што можеш да ја движиш со стабилна техника. Побарај помош ако не си сигурен.', 'Choose a load you can move with steady technique. Ask for help if you are unsure.', 'control'],
  ['Користи пешкир', 'Use a towel', 'Постави чист пешкир на клупите и површините што ги користиш.', 'Place a clean towel on benches and other surfaces you use.', 'towel'],
  ['Сподели ја опремата', 'Share equipment', 'Во зафатени периоди, дозволи им на другите да се вклучат меѓу твоите серии.', 'During busy periods, let others work in between your sets.', 'share'],
  ['Чувај ги патеките слободни', 'Keep walkways clear', 'Чувај ги торбите, шишињата и теговите подалеку од патеките и излезите.', 'Keep bags, bottles and weights clear of walkways and exits.', 'walkway'],
  ['Биди внимателен со звукот', 'Be considerate with sound', 'Користи слушалки со умерена јачина и води сметка за другите во заедничкиот простор.', 'Use headphones at a considerate volume and be mindful of others in the shared space.', 'sound'],
  ['Провери ја опремата', 'Check equipment', 'Не користи лабава или оштетена опрема. Пријави го проблемот кај тимот.', 'Do not use loose or damaged equipment. Report the problem to the team.', 'check'],
  ['Поддржувај без притисок', 'Encourage without pressure', 'Биди љубезен и понуди совет за тренинг само кога некој ќе го побара.', 'Be welcoming and offer training advice only when someone asks.', 'respect'],
] as const;

async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to seed demo data when NODE_ENV=production.');
  }

  const now = new Date();
  const passwordHash = await argon2.hash(demoPassword);
  const admin = await upsertUser(
    { email: 'admin@ironpulse.test', name: 'Ана Стојановска', role: Role.ADMIN },
    passwordHash,
    now,
  );

  const trainerNames = [
    { email: 'trainer@ironpulse.test', name: 'Александар Николов' },
    { email: 'trainer2@ironpulse.test', name: 'Марија Петкова' },
    { email: 'trainer3@ironpulse.test', name: 'Давид Трајков' },
  ];
  const trainers: Awaited<ReturnType<typeof upsertUser>>[] = [];
  for (const [index, data] of trainerNames.entries()) {
    const user = await upsertUser({ ...data, role: Role.TRAINER }, passwordHash, now);
    const content = trainerContent[index];
    await prisma.trainerProfile.upsert({
      where: { userId: user.id },
      update: content,
      create: { userId: user.id, ...content },
    });
    trainers.push(user);
  }

  const memberNames = [
    'Бојан Илиев', 'Елена Димова', 'Стефан Стојанов', 'Ивана Георгиева',
    'Филип Наумов', 'Сара Андоновска', 'Марко Ристев', 'Јована Митревска',
    'Петар Костов', 'Мила Трајкова', 'Никола Ангелов', 'Теа Јованова',
  ];
  const members: Awaited<ReturnType<typeof upsertUser>>[] = [];
  for (const [index, name] of memberNames.entries()) {
    const member = await upsertUser({
      email: index === 0 ? 'member@ironpulse.test' : `member${index + 1}@ironpulse.test`,
      name,
      role: Role.MEMBER,
    }, passwordHash, now);
    await prisma.user.update({
      where: { id: member.id },
      data: { createdAt: dateMonthsFromNow(-Math.floor(index / 2), 6 + (index % 2) * 12) },
    });
    await prisma.profile.update({
      where: { userId: member.id },
      data: {
        phone: `+389 70 000 ${String(index + 101).slice(-3)}`,
        birthDate: dateMonthsFromNow(-(240 + index * 12), 15),
        gender: index % 2 === 0 ? 'MALE' : 'FEMALE',
        heightCm: 164 + (index % 8) * 4,
        weightKg: 58 + index * 2.3,
      },
    });
    members.push(member);
  }

  const sponsorUsers: Awaited<ReturnType<typeof upsertUser>>[] = [];
  // TODO: Replace these sample partner names and example.com URLs before publishing.
  const sponsorData = [
    { email: 'sponsor@ironpulse.test', name: 'Весна Илиевска', companyName: 'Vardar Active', tier: SponsorTier.GOLD, websiteUrl: 'https://example.com/vardar-active' },
    { email: 'sponsor2@ironpulse.test', name: 'Горан Милев', companyName: 'Balkan Nutrition', tier: SponsorTier.SILVER, websiteUrl: 'https://example.com/balkan-nutrition' },
    { email: 'sponsor3@ironpulse.test', name: 'Калина Стојановска', companyName: 'Urban Recovery', tier: SponsorTier.BRONZE, websiteUrl: 'https://example.com/urban-recovery' },
  ];
  const sponsors: Awaited<ReturnType<typeof prisma.sponsor.upsert>>[] = [];
  for (const data of sponsorData) {
    const user = await upsertUser({
      email: data.email,
      name: data.name,
      role: Role.SPONSOR,
    }, passwordHash, now);
    const sponsor = await prisma.sponsor.upsert({
      where: { userId: user.id },
      update: {
        companyName: data.companyName,
        websiteUrl: data.websiteUrl,
        logoUrl: null,
        tier: data.tier,
        isActive: true,
      },
      create: {
        userId: user.id,
        companyName: data.companyName,
        websiteUrl: data.websiteUrl,
        logoUrl: null,
        tier: data.tier,
        isActive: true,
      },
    });
    sponsorUsers.push(user);
    sponsors.push(sponsor);
  }

  const planDefinitions = [
    { id: '1 month', name: '1 month', durationMonths: 1, priceMkd: 2000 },
    { id: '3 months', name: '3 months', durationMonths: 3, priceMkd: 5500 },
    { id: '6 months', name: '6 months', durationMonths: 6, priceMkd: 10000 },
    { id: '12 months', name: '12 months', durationMonths: 12, priceMkd: 16000 },
  ];
  const plans = new Map<string, (typeof planDefinitions)[number]>();
  for (const plan of planDefinitions) {
    await prisma.membershipPlan.upsert({
      where: { id: plan.id },
      update: { name: plan.name, durationMonths: plan.durationMonths, priceMkd: plan.priceMkd, isActive: true },
      create: { ...plan, isActive: true },
    });
    plans.set(plan.id, plan);
  }

  const seededExercises: Awaited<ReturnType<typeof prisma.exercise.upsert>>[] = [];
  const machineIds = new Map<string, string>();
  for (const machine of machines) {
    const record = await prisma.machine.upsert({
      where: { slug: machine.slug },
      update: {
        nameMk: machine.nameMk,
        nameEn: machine.nameEn,
        category: machine.category,
        descriptionMk: machine.descriptionMk,
        descriptionEn: machine.descriptionEn,
        difficulty: machine.difficulty,
        animationKey: machine.slug,
        imageUrl: `/machines/${machine.slug}.svg`,
        isPublic: true,
      },
      create: {
        slug: machine.slug,
        nameMk: machine.nameMk,
        nameEn: machine.nameEn,
        category: machine.category,
        descriptionMk: machine.descriptionMk,
        descriptionEn: machine.descriptionEn,
        difficulty: machine.difficulty,
        animationKey: machine.slug,
        imageUrl: `/machines/${machine.slug}.svg`,
        isPublic: true,
      },
    });
    machineIds.set(machine.slug, record.id);
    for (const [index, muscleGroup] of machine.muscles.entries()) {
      await prisma.machineMuscle.upsert({
        where: { machineId_muscleGroup: { machineId: record.id, muscleGroup } },
        update: { primary: index === 0 },
        create: { machineId: record.id, muscleGroup, primary: index === 0 },
      });
    }
    for (const content of machine.exercises) {
      const exerciseRecord = await prisma.exercise.upsert({
        where: { machineId_nameEn: { machineId: record.id, nameEn: content.nameEn } },
        update: {
          nameMk: content.nameMk,
          stepsMk: content.stepsMk,
          stepsEn: content.stepsEn,
          commonMistakesMk: content.mistakesMk,
          commonMistakesEn: content.mistakesEn,
          safetyTipsMk: content.safetyMk,
          safetyTipsEn: content.safetyEn,
          recommendedSets: content.sets,
          recommendedReps: content.reps,
          level: content.level,
          youtubeVideoId: machine.youtubeVideoId,
        },
        create: {
          machineId: record.id,
          nameMk: content.nameMk,
          nameEn: content.nameEn,
          stepsMk: content.stepsMk,
          stepsEn: content.stepsEn,
          commonMistakesMk: content.mistakesMk,
          commonMistakesEn: content.mistakesEn,
          safetyTipsMk: content.safetyMk,
          safetyTipsEn: content.safetyEn,
          recommendedSets: content.sets,
          recommendedReps: content.reps,
          level: content.level,
          youtubeVideoId: machine.youtubeVideoId,
        },
      });
      seededExercises.push(exerciseRecord);
    }
  }

  for (const [index, rule] of gymRules.entries()) {
    const [titleMk, titleEn, bodyMk, bodyEn, icon] = rule;
    await prisma.gymRule.upsert({
      where: { orderIndex: index + 1 },
      update: { titleMk, titleEn, bodyMk, bodyEn, icon },
      create: { orderIndex: index + 1, titleMk, titleEn, bodyMk, bodyEn, icon },
    });
  }

  // TODO: replace demo contact details with approved gym information; the web UI labels these DEV ONLY.
  const settings = [
    ['opening_hours', 'DEMO · Понеделник–петок 06:00–23:00; сабота–недела 08:00–20:00 / Monday–Friday 06:00–23:00; Saturday–Sunday 08:00–20:00'],
    ['address', 'DEMO · Скопје, Северна Македонија / Skopje, North Macedonia'],
    ['phone', 'DEMO · +389 70 000 000'],
    ['email', 'DEMO · hello@ironpulse.test'],
  ] as const;
  for (const [key, value] of settings) {
    await prisma.gymSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }

  const membershipPlan = async (id: string) => {
    const plan = plans.get(id);
    if (!plan) throw new Error(`Missing seeded membership plan "${id}".`);
    return plan;
  };
  const upsertMembership = async (data: {
    id: string;
    memberId: string;
    planId: string;
    startsAt: Date;
    endsAt: Date | null;
    status: MembershipStatus;
    createdAt: Date;
  }) => prisma.membership.upsert({
    where: { id: data.id },
    update: {
      userId: data.memberId,
      planId: data.planId,
      startsAt: data.startsAt,
      endsAt: data.endsAt,
      status: data.status,
      createdAt: data.createdAt,
    },
    create: {
      id: data.id,
      userId: data.memberId,
      planId: data.planId,
      startsAt: data.startsAt,
      endsAt: data.endsAt,
      status: data.status,
      createdAt: data.createdAt,
    },
  });
  const upsertPayment = async (
    id: string,
    membershipId: string,
    amountMkd: number,
    status: 'PENDING' | 'CONFIRMED',
    createdAt: Date,
  ) => prisma.paymentRecord.upsert({
    where: { id },
    update: {
      membershipId,
      amountMkd,
      provider: 'mock',
      status,
      confirmedByAdminId: status === 'CONFIRMED' ? admin.id : null,
      confirmedAt: status === 'CONFIRMED' ? createdAt : null,
      createdAt,
    },
    create: {
      id,
      membershipId,
      amountMkd,
      provider: 'mock',
      status,
      confirmedByAdminId: status === 'CONFIRMED' ? admin.id : null,
      confirmedAt: status === 'CONFIRMED' ? createdAt : null,
      createdAt,
    },
  });

  const lockedMember = members[1];
  if (!lockedMember) throw new Error('Missing seeded locked-state member.');
  await prisma.membership.deleteMany({
    where: {
      userId: lockedMember.id,
      id: { in: ['demo-history-2', 'demo-active-2'] },
    },
  });

  for (const [index, member] of members.entries()) {
    if (index >= 10 || index === 1) continue;
    const historyDate = dateMonthsFromNow(-(index % 6 + 1), 8 + index % 10);
    const historicalPlan = planDefinitions[index % planDefinitions.length];
    const historyEnd = dateFromNow(-35 - index * 2);
    const history = await upsertMembership({
      id: `demo-history-${index + 1}`,
      memberId: member.id,
      planId: historicalPlan.id,
      startsAt: shiftMonths(historyEnd, -historicalPlan.durationMonths),
      endsAt: historyEnd,
      status: index >= 10 ? MembershipStatus.CANCELLED : MembershipStatus.EXPIRED,
      createdAt: historyDate,
    });
    await upsertPayment(
      `demo-history-payment-${index + 1}`,
      history.id,
      historicalPlan.priceMkd,
      'CONFIRMED',
      historyDate,
    );
  }

  const activePlanIds = ['1 month', '3 months', '6 months', '12 months', '3 months', '6 months'];
  const activeExpiryDays = [5, 0, 21, 67, 124, 160];
  for (let index = 0; index < 6; index += 1) {
    if (index === 1) continue;
    const plan = await membershipPlan(activePlanIds[index]);
    const endsAt = dateFromNow(activeExpiryDays[index]);
    const startsAt = shiftMonths(endsAt, -plan.durationMonths);
    const createdAt = shiftMonths(startsAt, 0);
    const membership = await upsertMembership({
      id: `demo-active-${index + 1}`,
      memberId: members[index].id,
      planId: plan.id,
      startsAt,
      endsAt,
      status: MembershipStatus.ACTIVE,
      createdAt,
    });
    await upsertPayment(`demo-active-payment-${index + 1}`, membership.id, plan.priceMkd, 'CONFIRMED', createdAt);
  }

  for (let index = 0; index < 2; index += 1) {
    const memberIndex = index + 6;
    const plan = await membershipPlan(index === 0 ? '3 months' : '6 months');
    const membership = await upsertMembership({
      id: `demo-pending-${index + 1}`,
      memberId: members[memberIndex].id,
      planId: plan.id,
      startsAt: dateFromNow(0),
      endsAt: null,
      status: MembershipStatus.PENDING,
      createdAt: dateFromNow(-1 - index),
    });
    await upsertPayment(
      `demo-pending-payment-${index + 1}`,
      membership.id,
      plan.priceMkd,
      'PENDING',
      dateFromNow(-1 - index),
    );
  }

  for (let index = 0; index < 2; index += 1) {
    const memberIndex = index + 8;
    const plan = await membershipPlan(index === 0 ? '1 month' : '3 months');
    const endsAt = dateFromNow(index === 0 ? -5 : -32);
    const startsAt = shiftMonths(endsAt, -plan.durationMonths);
    const membership = await upsertMembership({
      id: `demo-expired-${index + 1}`,
      memberId: members[memberIndex].id,
      planId: plan.id,
      startsAt,
      endsAt,
      status: MembershipStatus.EXPIRED,
      createdAt: startsAt,
    });
    await upsertPayment(
      `demo-expired-payment-${index + 1}`,
      membership.id,
      plan.priceMkd,
      'CONFIRMED',
      startsAt,
    );
  }

  // Keep the seeded revenue history separate from current ACTIVE subscriptions.
  for (let month = 1; month <= 6; month += 1) {
    const paymentCount = month + 1;
    const paidAt = dateMonthsFromNow(-month, 10);
    for (let item = 0; item < paymentCount; item += 1) {
      const memberIndex = [0, 2, 3, 4, 5, 6, 7, 8, 9][(month * 2 + item) % 9];
      const plan = planDefinitions[(month + item) % planDefinitions.length];
      const membershipId = `demo-revenue-membership-${month}-${item}`;
      const end = shiftMonths(paidAt, plan.durationMonths);
      const membership = await upsertMembership({
        id: membershipId,
        memberId: members[memberIndex].id,
        planId: plan.id,
        startsAt: paidAt,
        endsAt: end,
        status: MembershipStatus.EXPIRED,
        createdAt: paidAt,
      });
      await upsertPayment(
        `demo-revenue-payment-${month}-${item}`,
        membership.id,
        plan.priceMkd,
        'CONFIRMED',
        paidAt,
      );
    }
  }

  const trainerClients = members.map((member, index) => ({
    trainerId: trainers[index % trainers.length].id,
    memberId: member.id,
  }));
  for (const relation of trainerClients) {
    await prisma.trainerClient.upsert({
      where: { trainerId_memberId: relation },
      update: { status: 'ACTIVE' },
      create: { ...relation, status: 'ACTIVE' },
    });
  }

  for (const [trainerIndex, trainer] of trainers.entries()) {
    for (const weekday of [1, 2, 3, 4, 5]) {
      await prisma.trainerAvailability.upsert({
        where: {
          trainerId_weekday_startsAt: { trainerId: trainer.id, weekday, startsAt: 540 },
        },
        update: { endsAt: 1020 },
        create: { trainerId: trainer.id, weekday, startsAt: 540, endsAt: 1020 },
      });
    }
    const clients = members.filter((_, index) => index % trainers.length === trainerIndex);
    const appointments: Array<{
      id: string;
      memberIndex: number;
      dayOffset: number;
      hour: number;
      status: AppointmentStatus;
      notes: string;
    }> = [
      { id: `demo-appointment-${trainerIndex}-past`, memberIndex: 0, dayOffset: -7, hour: 10, status: AppointmentStatus.COMPLETED, notes: 'Reviewed squat technique and agreed a gradual load increase.' },
      { id: `demo-appointment-${trainerIndex}-today`, memberIndex: 1, dayOffset: 0, hour: Math.min(21, new Date().getUTCHours() + 1), status: trainerIndex === 0 ? AppointmentStatus.REQUESTED : AppointmentStatus.CONFIRMED, notes: 'Check-in: technique, recovery and next training block.' },
      { id: `demo-appointment-${trainerIndex}-confirmed`, memberIndex: 2, dayOffset: 2, hour: 11, status: AppointmentStatus.CONFIRMED, notes: 'Strength progression session.' },
      { id: `demo-appointment-${trainerIndex}-requested`, memberIndex: 3, dayOffset: 4, hour: 16, status: AppointmentStatus.REQUESTED, notes: 'Member requested an introductory coaching session.' },
    ];
    for (const appointment of appointments) {
      const client = clients[appointment.memberIndex];
      if (!client) throw new Error(`Missing demo client for trainer ${trainerIndex + 1}.`);
      const startsAt = dateFromNow(appointment.dayOffset, appointment.hour);
      const data = {
        trainerId: trainer.id,
        memberId: client.id,
        startsAt,
        endsAt: new Date(startsAt.getTime() + 60 * 60 * 1000),
        status: appointment.status,
        notes: appointment.notes,
      };
      await prisma.appointment.upsert({
        where: { id: appointment.id },
        update: data,
        create: { id: appointment.id, ...data },
      });
    }
  }

  const cancelledAppointments = [
    { id: 'demo-appointment-cancelled-1', trainerId: trainers[1].id, memberId: members[4].id },
    { id: 'demo-appointment-cancelled-2', trainerId: trainers[2].id, memberId: members[8].id },
  ];
  for (const [index, appointment] of cancelledAppointments.entries()) {
    const startsAt = dateFromNow(index + 5, 13);
    await prisma.appointment.upsert({
      where: { id: appointment.id },
      update: { ...appointment, startsAt, endsAt: new Date(startsAt.getTime() + 60 * 60 * 1000), status: AppointmentStatus.CANCELLED, notes: 'Cancelled by the member; rescheduling can be requested.' },
      create: { ...appointment, startsAt, endsAt: new Date(startsAt.getTime() + 60 * 60 * 1000), status: AppointmentStatus.CANCELLED, notes: 'Cancelled by the member; rescheduling can be requested.' },
    });
  }

  const nutritionProfiles = [
    { memberIndex: 0, goal: 'maintain', dietType: 'omnivore', source: 'FALLBACK' as const, status: 'DRAFT' as const, trainerIndex: null, allergies: [] as string[] },
    { memberIndex: 2, goal: 'lose', dietType: 'vegetarian', source: 'AI' as const, status: 'APPROVED' as const, trainerIndex: 0, allergies: ['peanuts'] },
    { memberIndex: 4, goal: 'gain', dietType: 'halal', source: 'TRAINER' as const, status: 'APPROVED' as const, trainerIndex: 1, allergies: [] as string[] },
    { memberIndex: 6, goal: 'maintain', dietType: 'vegetarian', source: 'FALLBACK' as const, status: 'DRAFT' as const, trainerIndex: null, allergies: [] as string[] },
  ];
  const mealNames = [
    ['Овес со јогурт и бобинки', 'Oats with yogurt and berries', ['овес', 'јогурт', 'бобинки'], ['oats', 'yogurt', 'berries']],
    ['Пилешко со ориз и салата', 'Chicken, rice and salad', ['пилешко', 'ориз', 'мешана салата'], ['chicken', 'rice', 'mixed salad']],
    ['Леќа со печен зеленчук', 'Lentils with roasted vegetables', ['леќа', 'тиквичка', 'морков'], ['lentils', 'zucchini', 'carrot']],
    ['Омлет со спанаќ и леб', 'Spinach omelet with bread', ['јајца', 'спанаќ', 'интегрален леб'], ['eggs', 'spinach', 'whole-grain bread']],
    ['Лосос со компир и брокула', 'Salmon with potato and broccoli', ['лосос', 'компир', 'брокула'], ['salmon', 'potato', 'broccoli']],
    ['Грав со домат и пиперка', 'Beans with tomato and pepper', ['грав', 'домат', 'пиперка'], ['beans', 'tomato', 'pepper']],
    ['Мисиркино со булгур', 'Turkey with bulgur', ['мисиркино', 'булгур', 'краставица'], ['turkey', 'bulgur', 'cucumber']],
  ];
  for (const profile of nutritionProfiles) {
    const member = members[profile.memberIndex];
    if (!member) continue;
    const age = 24 + profile.memberIndex * 3;
    const weightKg = 58 + profile.memberIndex * 2.3;
    const heightCm = 164 + (profile.memberIndex % 8) * 4;
    const bmr = Math.round(10 * weightKg + 6.25 * heightCm - 5 * age + (profile.memberIndex % 2 === 0 ? 5 : -161));
    const tdee = Math.round(bmr * 1.55);
    const targetCalories = tdee + (profile.goal === 'gain' ? 250 : profile.goal === 'lose' ? -300 : 0);
    const macros = {
      calories: targetCalories,
      proteinG: Math.round(weightKg * (profile.goal === 'gain' ? 2 : 1.7)),
      carbsG: Math.round(targetCalories * 0.45 / 4),
      fatG: Math.round(targetCalories * 0.28 / 9),
    };
    const answers = {
      age,
      sex: profile.memberIndex % 2 === 0 ? 'MALE' : 'FEMALE',
      heightCm,
      weightKg,
      goal: profile.goal,
      activityLevel: 'moderate',
      mealsPerDay: 3,
      dietType: profile.dietType,
      allergies: profile.allergies,
      dislikedFoods: [],
      trainingDaysPerWeek: 4,
    };
    await prisma.nutritionQuestionnaire.upsert({
      where: { id: `demo-nutrition-questionnaire-${profile.memberIndex}` },
      update: { memberId: member.id, answers, computedBmr: bmr, computedTdee: tdee, targetCalories, macros },
      create: {
        id: `demo-nutrition-questionnaire-${profile.memberIndex}`,
        memberId: member.id,
        answers,
        computedBmr: bmr,
        computedTdee: tdee,
        targetCalories,
        macros,
      },
    });
    const dayContent = Array.from({ length: 7 }, (_, dayIndex) => {
      const selected = [dayIndex, (dayIndex + 2) % mealNames.length, (dayIndex + 4) % mealNames.length];
      return {
        day: dayIndex + 1,
        meals: selected.map((mealIndex, mealIndexInDay) => {
          const meal = mealNames[mealIndex];
          if (!meal) throw new Error('Missing demo meal content.');
          const calories = [420, 650, 560][mealIndexInDay] ?? 500;
          return {
            name: meal[1],
            nameMk: meal[0],
            ingredients: meal[3],
            ingredientsMk: meal[2],
            instructions: ['Prepare the ingredients, cook thoroughly where needed, and serve with water.'],
            instructionsMk: ['Подготви ги состојките, добро зготви ги намирниците по потреба и послужи со вода.'],
            calories,
            proteinG: mealIndexInDay === 1 ? 42 : 24,
            carbsG: mealIndexInDay === 0 ? 52 : 65,
            fatG: mealIndexInDay === 2 ? 18 : 12,
          };
        }),
      };
    });
    await prisma.nutritionPlan.upsert({
      where: { id: `demo-nutrition-plan-${profile.memberIndex}` },
      update: {
        memberId: member.id,
        questionnaireId: `demo-nutrition-questionnaire-${profile.memberIndex}`,
        planJson: { days: dayContent },
        source: profile.source,
        status: profile.status,
        approvedByTrainerId: profile.trainerIndex === null ? null : trainers[profile.trainerIndex]?.id,
      },
      create: {
        id: `demo-nutrition-plan-${profile.memberIndex}`,
        memberId: member.id,
        questionnaireId: `demo-nutrition-questionnaire-${profile.memberIndex}`,
        planJson: { days: dayContent },
        source: profile.source,
        status: profile.status,
        approvedByTrainerId: profile.trainerIndex === null ? null : trainers[profile.trainerIndex]?.id,
      },
    });
  }

  for (const [memberIndex, member] of members.slice(0, 8).entries()) {
    for (let week = 0; week < 10; week += 1) {
      for (let session = 0; session < 2; session += 1) {
        const performedAt = dateFromNow(-(week * 7 + session * 3), 8 + session * 5);
        const exerciseOffset = (memberIndex + week + session) % seededExercises.length;
        for (let movement = 0; movement < 3; movement += 1) {
          const exerciseRecord = seededExercises[(exerciseOffset + movement) % seededExercises.length];
          if (!exerciseRecord) throw new Error('Missing demo exercise for workout log.');
          const logId = `demo-workout-${memberIndex}-${week}-${session}-${movement}`;
          const baseWeight = 20 + (memberIndex % 5) * 5 + movement * 7;
          const sets = [1, 2, 3].map((setNumber) => ({
            id: `${logId}-set-${setNumber}`,
            setNumber,
            reps: 8 + (setNumber % 3),
            weightKg: baseWeight + (9 - week) * 2 + setNumber - 1,
          }));
          await prisma.workoutLog.upsert({
            where: { id: logId },
            update: {
              memberId: member.id,
              exerciseId: exerciseRecord.id,
              performedAt,
              sets: { deleteMany: {}, create: sets },
            },
            create: {
              id: logId,
              memberId: member.id,
              exerciseId: exerciseRecord.id,
              performedAt,
              sets: { create: sets },
            },
          });
        }
      }
    }
  }

  const todayHour = Math.max(8, Math.min(20, new Date().getUTCHours() + 1));
  const primaryAppointment = dateFromNow(2, 10);
  await prisma.appointment.upsert({
    where: { id: 'demo-primary-upcoming-appointment' },
    update: {
      trainerId: trainers[0].id,
      memberId: members[0].id,
      startsAt: primaryAppointment,
      endsAt: new Date(primaryAppointment.getTime() + 60 * 60 * 1000),
      status: AppointmentStatus.CONFIRMED,
      notes: 'Review the current strength block and set the next progression target.',
    },
    create: {
      id: 'demo-primary-upcoming-appointment',
      trainerId: trainers[0].id,
      memberId: members[0].id,
      startsAt: primaryAppointment,
      endsAt: new Date(primaryAppointment.getTime() + 60 * 60 * 1000),
      status: AppointmentStatus.CONFIRMED,
      notes: 'Review the current strength block and set the next progression target.',
    },
  });
  const todayAppointment = dateFromNow(0, todayHour);
  await prisma.appointment.upsert({
    where: { id: 'demo-primary-today-appointment' },
    update: {
      trainerId: trainers[0].id,
      memberId: members[1].id,
      startsAt: todayAppointment,
      endsAt: new Date(todayAppointment.getTime() + 60 * 60 * 1000),
      status: AppointmentStatus.REQUESTED,
      notes: 'Requested coaching session; waiting for trainer confirmation.',
    },
    create: {
      id: 'demo-primary-today-appointment',
      trainerId: trainers[0].id,
      memberId: members[1].id,
      startsAt: todayAppointment,
      endsAt: new Date(todayAppointment.getTime() + 60 * 60 * 1000),
      status: AppointmentStatus.REQUESTED,
      notes: 'Requested coaching session; waiting for trainer confirmation.',
    },
  });

  for (const [index, sponsor] of sponsors.entries()) {
    const offerList = [
      { id: `demo-offer-${index}-active`, title: 'Членска понуда / Member offer', description: 'Попуст за опрема и додатоци за тренинг. / Savings on training gear and accessories.', discountCode: `PULSE${index + 1}0`, validUntil: dateFromNow(45) },
      { id: `demo-offer-${index}-expired`, title: 'Сезонски пакет / Seasonal bundle', description: 'Завршена демо-понуда за локалната кампања. / Expired demo offer from a local campaign.', discountCode: `OLDPULSE${index + 1}`, validUntil: dateFromNow(-5) },
    ];
    for (const offer of offerList) {
      await prisma.sponsorOffer.upsert({
        where: { id: offer.id },
        update: { sponsorId: sponsor.id, title: offer.title, description: offer.description, discountCode: offer.discountCode, validUntil: offer.validUntil },
        create: { ...offer, sponsorId: sponsor.id },
      });
    }

    let impressionsTotal = 0;
    let clicksTotal = 0;
    for (let offset = 29; offset >= 0; offset -= 1) {
      const dayDate = dateFromNow(-offset, 0);
      const day = dateKey(dayDate);
      const impressions = 9 + ((index * 7 + offset * 3) % 23);
      const clicks = 1 + ((index * 3 + offset) % 7);
      impressionsTotal += impressions;
      clicksTotal += clicks;
      await prisma.sponsorStatDaily.upsert({
        where: { sponsorId_day: { sponsorId: sponsor.id, day } },
        update: { impressions, clicks, createdAt: dayDate },
        create: {
          id: `demo-sponsor-stat-${index}-${day}`,
          sponsorId: sponsor.id,
          day,
          impressions,
          clicks,
          createdAt: dayDate,
        },
      });
    }
    await prisma.sponsorStat.upsert({
      where: { sponsorId: sponsor.id },
      update: { impressions: impressionsTotal, clicks: clicksTotal },
      create: { sponsorId: sponsor.id, impressions: impressionsTotal, clicks: clicksTotal },
    });
  }

  const trialNames = [
    ['Тамара Велкова', 'tamara.velkova@example.test', TrialStatus.NEW],
    ['Матеј Јанев', 'matej.janev@example.test', TrialStatus.NEW],
    ['Ана Мицевска', 'ana.micevska@example.test', TrialStatus.NEW],
    ['Дамјан Цветков', 'damjan.cvetkov@example.test', TrialStatus.NEW],
    ['Софија Петреска', 'sofija.petreska@example.test', TrialStatus.CONTACTED],
    ['Мартин Јованов', 'martin.jovanov@example.test', TrialStatus.CONTACTED],
    ['Катарина Саздова', 'katarina.sazdova@example.test', TrialStatus.CONTACTED],
    ['Лука Николов', 'luka.nikolov@example.test', TrialStatus.CONTACTED],
    ['Ева Ристовска', 'eva.ristovska@example.test', TrialStatus.CONVERTED],
    ['Теодор Попов', 'teodor.popov@example.test', TrialStatus.CONVERTED],
    ['Мила Костова', 'mila.kostova@example.test', TrialStatus.CONVERTED],
    ['Виктор Андонов', 'viktor.andonov@example.test', TrialStatus.CONVERTED],
  ] as const;
  for (const [index, [name, email, status]] of trialNames.entries()) {
    const preferredDate = dateFromNow(index % 3 === 0 ? 4 + index : -2 - index);
    const createdAt = dateFromNow(-index);
    await prisma.trialRequest.upsert({
      where: { id: `demo-trial-${index + 1}` },
      update: {
        name,
        email,
        phone: `+389 70 100 ${String(index + 1).padStart(3, '0')}`,
        preferredDate,
        status,
        createdAt,
      },
      create: {
        id: `demo-trial-${index + 1}`,
        name,
        email,
        phone: `+389 70 100 ${String(index + 1).padStart(3, '0')}`,
        preferredDate,
        status,
        createdAt,
      },
    });
  }

  const auditActions = [
    ['admin.user.search', 'User', 'Searched member directory'],
    ['admin.membership.confirm', 'PaymentRecord', 'Confirmed mock membership payment'],
    ['admin.membership.plan.update', 'MembershipPlan', 'Reviewed membership pricing'],
    ['admin.machine.update', 'Machine', 'Updated machine safety guidance'],
    ['admin.exercise.create', 'Exercise', 'Added an exercise guide'],
    ['content.rule.update', 'GymRule', 'Reviewed gym rules'],
    ['content.setting.upsert', 'GymSetting', 'Updated opening hours'],
    ['admin.sponsor.create', 'Sponsor', 'Added a sponsor profile'],
    ['admin.sponsor.status', 'Sponsor', 'Reviewed sponsor visibility'],
    ['auth.password.reset', 'User', 'Completed a password reset'],
    ['admin.trial-request.status', 'TrialRequest', 'Contacted a trial guest'],
    ['admin.user.status', 'User', 'Reviewed an account status'],
    ['admin.membership.cancel', 'Membership', 'Cancelled a duplicate request'],
    ['admin.audit.view', 'AuditLog', 'Opened the audit timeline'],
    ['admin.trainer.invite', 'User', 'Invited a trainer'],
    ['admin.exercise.update', 'Exercise', 'Improved exercise instructions'],
    ['admin.content.rule.create', 'GymRule', 'Added a member guideline'],
    ['admin.payment.reject', 'PaymentRecord', 'Reviewed a mock payment'],
    ['admin.user.export', 'User', 'Prepared a privacy export'],
    ['admin.trial-request.status', 'TrialRequest', 'Converted a trial request'],
    ['admin.membership.plan.update', 'MembershipPlan', 'Updated a plan description'],
    ['admin.sponsor.offer.update', 'SponsorOffer', 'Refreshed a sponsor offer'],
    ['admin.trainer.profile.update', 'TrainerProfile', 'Updated a trainer profile'],
    ['admin.dashboard.view', 'AdminDashboard', 'Reviewed gym activity'],
  ] as const;
  for (const [index, [action, entity, summary]] of auditActions.entries()) {
    await prisma.auditLog.upsert({
      where: { id: `demo-audit-${index + 1}` },
      update: {
        actorId: admin.id,
        action,
        entity,
        entityId: `demo-entity-${index + 1}`,
        metadata: { summary, sequence: index + 1, source: 'phase3d-demo-seed' },
        createdAt: dateFromNow(-index, 9 + index % 10),
      },
      create: {
        id: `demo-audit-${index + 1}`,
        actorId: admin.id,
        action,
        entity,
        entityId: `demo-entity-${index + 1}`,
        metadata: { summary, sequence: index + 1, source: 'phase3d-demo-seed' },
        createdAt: dateFromNow(-index, 9 + index % 10),
      },
    });
  }

  if (machineIds.size !== 14 || seededExercises.length !== 28 || sponsorUsers.length !== 3) {
    throw new Error('Demo seed data is incomplete.');
  }
  const workoutCount = await prisma.workoutLog.count({
    where: { member: { email: { in: members.slice(0, 8).map(({ email }) => email) } } },
  });
  console.log(`Seed completed: 1 admin, ${trainers.length} trainers, ${members.length} members, ${sponsors.length} sponsors, ${workoutCount} demo workout exercise logs.`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
