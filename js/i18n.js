/* Makon — EN / UZ / RU for the landing and sign-in pages.
   Any element whose (whitespace-normalised) HTML exactly matches a key below is translated.
   Each entry: "English HTML": ["O‘zbekcha (lotin)", "Русский"]. Add new strings here. */
(function () {
  "use strict";
  const D = {
    // header, menu, announcement
    "Tools": ["Imkoniyatlar", "Инструменты"],
    "FAQ": ["Savollar", "Вопросы"],
    "Sign in": ["Kirish", "Войти"],
    "Start designing": ["Loyihalashni boshlash", "Начать дизайн"],
    "Open Studio": ["Studiyani ochish", "Открыть студию"],
    "Start": ["Boshlash", "Начать"],
    "Language": ["Til", "Язык"],
    "Free AI room renders — 5 a day.": ["Bepul AI xona dizayni — kuniga 5 ta.", "Бесплатные AI-рендеры комнаты — 5 в день."],
    "Try it →": ["Sinab ko‘ring →", "Попробовать →"],
    "Preparing the room": ["Xona tayyorlanmoqda", "Готовим комнату"],
    // chapters
    "Room": ["Xona", "Комната"], "Understand": ["Tahlil", "Анализ"], "Design": ["Dizayn", "Дизайн"],
    "Refine": ["Sayqal", "Доработка"], "Plan": ["Reja", "План"], "Build": ["Qurish", "Реализация"],
    "01 Room": ["01 Xona", "01 Комната"], "02 Understand": ["02 Tahlil", "02 Анализ"], "03 Design": ["03 Dizayn", "03 Дизайн"],
    "04 Refine": ["04 Sayqal", "04 Доработка"], "05 Plan": ["05 Reja", "05 План"], "06 Build": ["06 Qurish", "06 Реализация"],
    "Room 01 / Living": ["Xona 01 / Mehmonxona", "Комната 01 / Гостиная"],
    "One room · One project": ["Bitta xona · Bitta loyiha", "Одна комната · Один проект"],
    // story
    "Begin with the room you have": ["Bor xonangizdan boshlang", "Начните с комнаты, которая у вас есть"],
    "Your room.<br><span class=\"ital\">Rebuilt around you.</span>": ["Sizning xonangiz.<br><span class=\"ital\">Siz uchun qayta yaratiladi.</span>", "Ваша комната.<br><span class=\"ital\">Заново — под вас.</span>"],
    "Photograph one room. Makon keeps its walls, windows and light, then redesigns what sits inside — through to a measured plan, a 3D model and a build brief.": ["Bitta xonani suratga oling. Makon devorlar, derazalar va yorug‘likni saqlab qoladi, ichidagi narsalarni esa qayta loyihalaydi — o‘lchamli reja, 3D model va qurilish topshirig‘igacha.", "Сфотографируйте одну комнату. Makon сохранит стены, окна и свет, а всё, что внутри, спроектирует заново — вплоть до плана с размерами, 3D-модели и технического задания."],
    "Upload your room <span>→</span>": ["Xonangizni yuklang <span>→</span>", "Загрузить комнату <span>→</span>"],
    "See how it works <span>↓</span>": ["Qanday ishlaydi <span>↓</span>", "Как это работает <span>↓</span>"],
    "Before anything changes": ["Hech narsa o‘zgarmasdan oldin", "Прежде чем что-то менять"],
    "Read the light.<br>Keep the structure.": ["Yorug‘likni o‘qing.<br>Tuzilmani saqlang.", "Прочитать свет.<br>Сохранить конструкцию."],
    "Window plane": ["Deraza tekisligi", "Плоскость окна"], "Kept exactly": ["Aynan saqlanadi", "Сохраняется точно"],
    "Daylight from the north-west": ["Yorug‘lik shimoli-g‘arbdan", "Дневной свет с северо-запада"], "Direction preserved": ["Yo‘nalish saqlanadi", "Направление сохранено"],
    "Archway and openings": ["Arka va o‘tish joylari", "Арка и проёмы"], "Structure untouched": ["Tuzilmaga tegilmaydi", "Конструкция не меняется"],
    "What stands in the room": ["Xonadagi buyumlar", "Всё, что стоит в комнате"], "Free to change": ["O‘zgartirish mumkin", "Можно менять"],
    "The walls stay": ["Devorlar joyida qoladi", "Стены остаются"],
    "The interior<br><span class=\"ital\">moves forward.</span>": ["Interyer<br><span class=\"ital\">yangilanadi.</span>", "Интерьер<br><span class=\"ital\">движется вперёд.</span>"],
    "Drag to compare": ["Solishtirish uchun suring", "Потяните, чтобы сравнить"],
    "Original": ["Asl holi", "Было"], "Redesign": ["Yangi dizayn", "Стало"],
    "Then keep working": ["Keyin ishni davom ettiring", "И продолжайте работать"],
    "Keep the sideboard. Warmer, lighter wood. Soften the window wall.": ["Komodni qoldiring. Iliqroq, ochroq yog‘och. Deraza devorini yumshating.", "Оставьте комод. Тёплое, светлое дерево. Смягчите стену с окном."],
    "Refine your room in Studio <span>→</span>": ["Xonangizni Studiyada sayqallang <span>→</span>", "Доработать комнату в студии <span>→</span>"],
    "Linen": ["Zig‘ir", "Лён"], "Oak": ["Eman", "Дуб"], "Kept": ["Saqlangan", "Оставлено"],
    "Unlined washed linen softens the window wall without blocking the light.": ["Astarsiz yuvilgan zig‘ir deraza devorini yumshatadi, yorug‘likni to‘smaydi.", "Лёгкий стираный лён смягчает стену с окном и не закрывает свет."],
    "Warmer, lighter oak — an organic low table instead of the dark rectangle.": ["Iliqroq, ochroq eman — to‘q to‘rtburchak o‘rniga yumaloq past stol.", "Тёплый светлый дуб — низкий стол мягкой формы вместо тёмного прямоугольника."],
    "The walnut sideboard stays exactly where it is, as you asked.": ["Yong‘oq komod siz so‘ragandek aynan o‘z joyida qoladi.", "Ореховый комод остаётся на своём месте, как вы и просили."],
    "One project": ["Bitta loyiha", "Один проект"],
    "The room becomes<br>editable space.": ["Xona tahrirlanadigan<br>makonga aylanadi.", "Комната становится<br>редактируемым пространством."],
    "Draw walls, doors and windows, set one known length, and every measurement becomes real.": ["Devorlar, eshik va derazalarni chizing, bitta ma’lum uzunlikni kiriting — barcha o‘lchamlar haqiqiy bo‘ladi.", "Нарисуйте стены, двери и окна, задайте одну известную длину — и все размеры станут реальными."],
    "Editable plan": ["Tahrirlanadigan reja", "Редактируемый план"],
    "Walls, openings and objects · not yet to scale": ["Devorlar, o‘tish joylari va buyumlar · hali masshtabsiz", "Стены, проёмы и предметы · пока не в масштабе"],
    "Walls, openings and objects · true to scale": ["Devorlar, o‘tish joylari va buyumlar · aniq masshtabda", "Стены, проёмы и предметы · в точном масштабе"],
    "Set a known length to scale": ["Masshtab uchun ma’lum uzunlikni kiriting", "Задать известную длину для масштаба"],
    "Scale set · room": ["Masshtab o‘rnatildi · xona", "Масштаб задан · комната"],
    "Window width": ["Deraza kengligi", "Ширина окна"], "Apply": ["Qo‘llash", "Применить"],
    "From a photograph to a room you can make": ["Suratdan amalga oshsa bo‘ladigan xonagacha", "От фотографии — к комнате, которую можно воплотить"],
    "Start with<br>your room.": ["Xonangizdan<br>boshlang.", "Начните<br>со своей комнаты."],
    "Enter Makon <span>→</span>": ["Makonga kirish <span>→</span>", "Войти в Makon <span>→</span>"],
    "Explore the tools <span>↓</span>": ["Imkoniyatlarni ko‘ring <span>↓</span>", "Посмотреть инструменты <span>↓</span>"],
    "01 Walls": ["01 Devorlar", "01 Стены"], "02 Table": ["02 Stol", "02 Стол"], "03 Kept": ["03 Saqlangan", "03 Оставлено"],
    "Point, tap or focus to inspect materials": ["Materiallarni ko‘rish uchun bosing", "Нажмите, чтобы увидеть материалы"],
    "01 · Wall finish": ["01 · Devor qoplamasi", "01 · Отделка стен"], "Warm limewash": ["Iliq ohakli bo‘yoq", "Тёплая известковая краска"],
    "Breathable mineral paint with a soft, clouded finish. Catches the north-west light.": ["Nafas oladigan mineral bo‘yoq, yumshoq bulutsimon yuzali. Shimoli-g‘arbiy yorug‘likni chiroyli ushlaydi.", "Дышащая минеральная краска с мягкой облачной фактурой. Красиво ловит свет с северо-запада."],
    "02 · Table surface": ["02 · Stol yuzasi", "02 · Поверхность стола"], "Natural oak": ["Tabiiy eman", "Натуральный дуб"],
    "Oiled, lighter European oak in an organic low form.": ["Moylangan, ochroq Yevropa emani, yumaloq past shaklda.", "Светлый европейский дуб под маслом, низкая мягкая форма."],
    "03 · Retained": ["03 · Saqlanadi", "03 · Сохраняется"], "Existing sideboard": ["Mavjud komod", "Существующий комод"],
    "Kept as it is — the room is designed around it.": ["O‘z holicha qoladi — xona uning atrofida loyihalanadi.", "Остаётся как есть — комната проектируется вокруг него."],
    "Enter a window width in metres, e.g. 1.40": ["Deraza kengligini metrda kiriting, masalan 1.40", "Введите ширину окна в метрах, например 1.40"],
    "Plan calibrated — every wall now has a real length.": ["Reja kalibrlandi — endi har bir devorning haqiqiy uzunligi bor.", "План откалиброван — теперь у каждой стены реальная длина."],
    // after the story
    "Six tools · one project": ["Oltita vosita · bitta loyiha", "Шесть инструментов · один проект"],
    "Everything one room needs,<br><span class=\"ital\">in one place.</span>": ["Bir xonaga kerakli hamma narsa<br><span class=\"ital\">bir joyda.</span>", "Всё, что нужно одной комнате,<br><span class=\"ital\">в одном месте.</span>"],
    "Every step works on the same room. Change the plan and the 3D model follows. Add a sofa and the budget updates.": ["Har bir qadam o‘sha bitta xona ustida ishlaydi. Rejani o‘zgartirsangiz, 3D model ham o‘zgaradi. Divan qo‘shsangiz, byudjet yangilanadi.", "Каждый шаг работает с одной и той же комнатой. Измените план — 3D-модель обновится. Добавьте диван — пересчитается бюджет."],
    "01 · Design": ["01 · Dizayn", "01 · Дизайн"], "Redesign from a photo": ["Suratdan qayta dizayn", "Редизайн по фото"],
    "Choose from 10 styles, lock what must stay, set the light direction. Get an AI render, or an instant on-device mood preview.": ["10 ta uslubdan tanlang, saqlanadigan narsalarni belgilang, yorug‘lik yo‘nalishini kiriting. AI vizualizatsiya yoki qurilmangizda tezkor kayfiyat ko‘rinishini oling.", "Выберите один из 10 стилей, отметьте, что сохранить, задайте направление света. Получите AI-рендер или мгновенное превью настроения прямо на устройстве."],
    "Before / after slider": ["Oldin / keyin slayderi", "Слайдер «до / после»"], "Every version saved": ["Har bir versiya saqlanadi", "Все версии сохраняются"],
    "Refine in plain words, with undo": ["Oddiy so‘zlar bilan sayqallash, bekor qilish mumkin", "Доработка простыми словами, с отменой"],
    "02 · Plan": ["02 · Reja", "02 · План"], "A floor plan you can edit": ["Tahrirlanadigan xona rejasi", "Редактируемый план комнаты"],
    "Draw walls, drop doors and windows on them, and calibrate one known length. Area, perimeter and every wall length update live.": ["Devorlarni chizing, ularga eshik va derazalar qo‘ying, bitta ma’lum uzunlik bo‘yicha kalibrlang. Maydon, perimetr va devor uzunliklari darhol yangilanadi.", "Рисуйте стены, ставьте на них двери и окна, калибруйте по одной известной длине. Площадь, периметр и длины стен обновляются сразу."],
    "Room templates · grid &amp; angle snap": ["Xona shablonlari · to‘r va burchakka moslash", "Шаблоны комнат · привязка к сетке и углам"],
    "Pinch-zoom on phones": ["Telefonda ikki barmoq bilan kattalashtirish", "Масштаб двумя пальцами на телефоне"], "Undo / redo · PNG export": ["Bekor qilish / qaytarish · PNG eksport", "Отмена / повтор · экспорт PNG"],
    "Walk around it in 3D": ["3D da aylanib chiqing", "Прогуляйтесь по ней в 3D"],
    "The plan becomes a lit 3D room with real wall openings. Orbit, switch to top, front or side, and drag furniture on the floor.": ["Reja haqiqiy o‘tish joylari bor yoritilgan 3D xonaga aylanadi. Aylantiring, yuqoridan, oldidan yoki yonidan qarang, mebelni polda suring.", "План превращается в освещённую 3D-комнату с настоящими проёмами. Вращайте, смотрите сверху, спереди или сбоку, двигайте мебель по полу."],
    "Sun follows your light direction": ["Quyosh siz tanlagan tomondan yoritadi", "Солнце светит с выбранной стороны"], "Wall and floor finishes per style": ["Har uslubga mos devor va pol qoplamalari", "Отделка стен и пола под каждый стиль"], "Save a snapshot": ["Suratini saqlang", "Сохраняйте снимки"],
    "04 · Furnish": ["04 · Jihozlash", "04 · Мебель"], "Furniture that actually fits": ["Haqiqatan sig‘adigan mebel", "Мебель, которая действительно помещается"],
    "40+ pieces at real sizes. Makon warns when something overlaps, blocks a door or leaves less than 60 cm to walk past.": ["Haqiqiy o‘lchamdagi 40 dan ortiq buyum. Makon biror narsa ustma-ust tushsa, eshikni to‘ssa yoki o‘tish uchun 60 sm dan kam joy qolsa ogohlantiradi.", "Более 40 предметов в реальных размерах. Makon предупредит, если что-то перекрывается, мешает двери или оставляет меньше 60 см для прохода."],
    "Search, filter, resize, recolour": ["Qidirish, saralash, o‘lcham va rangni o‘zgartirish", "Поиск, фильтры, размеры и цвет"], "Shop similar in real stores": ["Haqiqiy do‘konlarda o‘xshashini toping", "Похожие товары в реальных магазинах"], "Your own prices, never invented ones": ["Faqat o‘zingiz kiritgan narxlar", "Только ваши цены, никаких выдуманных"],
    "05 · Quantities": ["05 · Hajmlar", "05 · Объёмы"], "Paint, floor and skirting": ["Bo‘yoq, pol va plintus", "Краска, пол и плинтус"],
    "From the calibrated plan Makon works out wall area minus openings, litres of paint, floor area with waste, and skirting length.": ["Kalibrlangan rejadan Makon o‘tish joylarisiz devor maydoni, bo‘yoq litrlari, zaxira bilan pol maydoni va plintus uzunligini hisoblaydi.", "По откалиброванному плану Makon считает площадь стен за вычетом проёмов, литры краски, площадь пола с запасом и длину плинтуса."],
    "Coats and coverage you control": ["Qatlamlar va sarfni o‘zingiz belgilaysiz", "Слои и расход задаёте вы"], "Metric and imperial": ["Metrik va imperial tizim", "Метрическая и имперская системы"],
    "06 · Build": ["06 · Qurish", "06 · Реализация"], "A brief a builder can use": ["Usta tushunadigan topshiriq", "ТЗ, понятное строителю"],
    "Before and after, materials, kept elements, measurements, furniture list and a budget against your limit — printable as a PDF.": ["Oldin va keyin, materiallar, saqlanadigan elementlar, o‘lchamlar, mebel ro‘yxati va limitingizga nisbatan byudjet — PDF sifatida chop etiladi.", "До и после, материалы, сохраняемые элементы, размеры, список мебели и бюджет относительно лимита — можно распечатать в PDF."],
    "Budget bar with overspend warning": ["Ortiqcha xarajatdan ogohlantiruvchi byudjet chizig‘i", "Шкала бюджета с предупреждением о перерасходе"], "Export / import the whole project": ["Butun loyihani eksport / import qilish", "Экспорт / импорт всего проекта"],
    "Desktop and phone": ["Kompyuter va telefon", "Компьютер и телефон"], "Take the photo where you stand.": ["Turgan joyingizda suratga oling.", "Снимайте прямо там, где стоите."],
    "On a phone Makon opens your camera straight from the upload button, the plan understands pinch and two-finger pan, and every tool sits one tap away in the bottom bar.": ["Telefonda Makon yuklash tugmasidan to‘g‘ridan-to‘g‘ri kamerani ochadi, reja ikki barmoq harakatlarini tushunadi, barcha vositalar esa pastki panelda bir bosishda.", "На телефоне Makon открывает камеру прямо с кнопки загрузки, план понимает жесты двумя пальцами, а все инструменты — в одно касание на нижней панели."],
    "Projects are saved automatically as you work — nothing to lose if you close the tab.": ["Loyihalar ish davomida avtomatik saqlanadi — oynani yopsangiz ham hech narsa yo‘qolmaydi.", "Проекты сохраняются автоматически — ничего не потеряется, даже если закрыть вкладку."],
    "Version 3 · saved": ["3-versiya · saqlandi", "Версия 3 · сохранено"],
    "Questions": ["Savollar", "Вопросы"], "Good to know": ["Bilib qo‘yish foydali", "Полезно знать"],
    "Does Makon change my walls or windows?": ["Makon devor yoki derazalarimni o‘zgartiradimi?", "Makon меняет мои стены или окна?"],
    "No. You choose what to keep — window plane, openings, floor, ceiling light, built-ins — and those are locked in every render and in the brief.": ["Yo‘q. Nimani saqlashni o‘zingiz tanlaysiz — deraza, o‘tish joylari, pol, shift chirog‘i, o‘rnatilgan mebel — ular har bir vizualizatsiyada va topshiriqda o‘zgarmaydi.", "Нет. Вы сами выбираете, что сохранить — окна, проёмы, пол, потолочный свет, встроенную мебель, — и это не меняется ни в одном рендере и в ТЗ."],
    "How accurate are the measurements?": ["O‘lchamlar qanchalik aniq?", "Насколько точны размеры?"],
    "Until you calibrate, lengths are estimates. Measure one wall or window with a tape, enter it once, and the whole plan scales to match. Quantities are only marked final after calibration.": ["Kalibrlashgacha uzunliklar taxminiy. Bitta devor yoki derazani ruletka bilan o‘lchab, bir marta kiriting — butun reja shunga moslashadi. Hajmlar faqat kalibrlashdan keyin yakuniy deb belgilanadi.", "До калибровки длины приблизительные. Измерьте рулеткой одну стену или окно, введите значение один раз — и весь план подстроится. Объёмы считаются окончательными только после калибровки."],
    "What is the difference between an AI render and a mood preview?": ["AI vizualizatsiya va kayfiyat ko‘rinishining farqi nimada?", "Чем AI-рендер отличается от превью настроения?"],
    "An AI render redraws the furniture and finishes in your photo. A mood preview runs instantly on your device and re-grades colour and light to the chosen style, so you can compare directions before spending a render.": ["AI vizualizatsiya suratingizdagi mebel va qoplamalarni qaytadan chizadi. Kayfiyat ko‘rinishi esa qurilmangizda bir zumda ishlaydi va rang hamda yorug‘likni tanlangan uslubga moslaydi — vizualizatsiyadan oldin yo‘nalishlarni solishtirishingiz mumkin.", "AI-рендер заново рисует мебель и отделку на вашем фото. Превью настроения мгновенно работает на устройстве и подстраивает цвет и свет под выбранный стиль — можно сравнить варианты, прежде чем тратить рендер."],
    "Where are my projects stored?": ["Loyihalarim qayerda saqlanadi?", "Где хранятся мои проекты?"],
    "In your browser, on this device. You can export any project as a file and import it on another device.": ["Brauzeringizda, shu qurilmada. Istalgan loyihani fayl sifatida eksport qilib, boshqa qurilmada import qilishingiz mumkin.", "В вашем браузере, на этом устройстве. Любой проект можно экспортировать в файл и импортировать на другом устройстве."],
    "Are furniture prices real?": ["Mebel narxlari haqiqiymi?", "Цены на мебель настоящие?"],
    "Makon never invents prices or stock. \"Shop similar\" opens live searches in real stores, and you type the price of what you pick — the budget adds it up.": ["Makon hech qachon narx yoki mavjudlikni o‘ylab topmaydi. «O‘xshashini topish» haqiqiy do‘konlarda qidiruvni ochadi, tanlaganingiz narxini o‘zingiz kiritasiz — byudjet uni qo‘shib boradi.", "Makon никогда не выдумывает цены и наличие. «Найти похожее» открывает поиск в реальных магазинах, а цену выбранного вы вводите сами — бюджет всё посчитает."],
    "From the room you have<br><span class=\"ital\">to the room you want.</span>": ["Bor xonangizdan<br><span class=\"ital\">orzuingizdagi xonagacha.</span>", "От комнаты, которая есть,<br><span class=\"ital\">к комнате мечты.</span>"],
    "Create a free account": ["Bepul hisob yaratish", "Создать бесплатный аккаунт"],
    "Try the sample room <span>→</span>": ["Namuna xonani sinab ko‘ring <span>→</span>", "Попробовать на примере <span>→</span>"],
    "Makon — “a place to live”. Design one room at a time.": ["Makon — «yashash makoni». Har safar bitta xonani loyihalang.", "Makon — «место для жизни». Проектируйте по одной комнате."],
    "Create account": ["Ro‘yxatdan o‘tish", "Зарегистрироваться"],
    // sign in / sign up
    "From the room<br>you have<br><span class=\"ital\">to the room<br>you want.</span>": ["Bor<br>xonangizdan<br><span class=\"ital\">orzuingizdagi<br>xonagacha.</span>", "От комнаты,<br>что есть,<br><span class=\"ital\">к комнате<br>мечты.</span>"],
    "<sup>01</sup>Design": ["<sup>01</sup>Dizayn", "<sup>01</sup>Дизайн"], "<sup>02</sup>Plan": ["<sup>02</sup>Reja", "<sup>02</sup>План"], "<sup>03</sup>3D": ["<sup>03</sup>3D", "<sup>03</sup>3D"],
    "<sup>04</sup>Furnish": ["<sup>04</sup>Jihozlash", "<sup>04</sup>Мебель"], "<sup>05</sup>Build brief": ["<sup>05</sup>Topshiriq", "<sup>05</sup>ТЗ"],
    "Projects are saved in this browser. Photos only leave your device when you ask for an AI render.": ["Loyihalar shu brauzerda saqlanadi. Suratlar faqat AI vizualizatsiya so‘raganingizda qurilmadan chiqadi.", "Проекты хранятся в этом браузере. Фото покидают устройство, только когда вы запрашиваете AI-рендер."],
    "← Back to the room journey": ["← Bosh sahifaga qaytish", "← Назад на главную"],
    "Return to your project": ["Loyihangizga qayting", "Вернитесь к своему проекту"],
    "Welcome<br>back.": ["Xush<br>kelibsiz.", "С<br>возвращением."],
    "Sign in to continue the same room across design, plan, 3D, furnishing and the build brief.": ["Dizayn, reja, 3D, jihozlash va topshiriq bo‘yicha xonangiz ustida ishlashni davom ettirish uchun kiring.", "Войдите, чтобы продолжить работу над комнатой: дизайн, план, 3D, мебель и ТЗ."],
    "Signed in as <b></b> — <a href=\"studio.html\">open your studio →</a>": ["Siz <b></b> sifatida kirgansiz — <a href=\"studio.html\">studiyani ochish →</a>", "Вы вошли как <b></b> — <a href=\"studio.html\">открыть студию →</a>"],
    "Already signed in as <b></b> — <a href=\"studio.html\">open your studio →</a>": ["Siz allaqachon <b></b> sifatida kirgansiz — <a href=\"studio.html\">studiyani ochish →</a>", "Вы уже вошли как <b></b> — <a href=\"studio.html\">открыть студию →</a>"],
    "Email address": ["Elektron pochta", "Электронная почта"], "Password": ["Parol", "Пароль"], "Your password": ["Parolingiz", "Ваш пароль"],
    "or": ["yoki", "или"], "Continue as guest": ["Mehmon sifatida davom etish", "Продолжить как гость"],
    "New to Makon?": ["Makonda yangimisiz?", "Впервые в Makon?"], "Create an account": ["Hisob yarating", "Создайте аккаунт"],
    "Begin with one room": ["Bitta xonadan boshlang", "Начните с одной комнаты"],
    "Make the<br>project<br>yours.": ["Loyihani<br>o‘zingizniki<br>qiling.", "Сделайте<br>проект<br>своим."],
    "Create an account for your studio. Every room you start is saved and waiting next time.": ["Studiyangiz uchun hisob yarating. Boshlagan har bir xonangiz saqlanadi va keyingi safar sizni kutadi.", "Создайте аккаунт для своей студии. Каждая начатая комната сохранится и будет ждать вас."],
    "Your name": ["Ismingiz", "Ваше имя"], "Alex Johnson": ["Aziz Karimov", "Иван Петров"], "At least 8 characters": ["Kamida 8 ta belgi", "Минимум 8 символов"],
    "Already have an account?": ["Hisobingiz bormi?", "Уже есть аккаунт?"],
    "Please enter your name.": ["Ismingizni kiriting.", "Введите имя."], "Please enter a valid email.": ["To‘g‘ri elektron pochta kiriting.", "Введите корректный email."],
    "Please enter your password.": ["Parolni kiriting.", "Введите пароль."], "Password must be at least 8 characters.": ["Parol kamida 8 ta belgidan iborat bo‘lishi kerak.", "Пароль должен быть не короче 8 символов."],
    "Please wait…": ["Kuting…", "Подождите…"],
    "An account with this email already exists. Try signing in.": ["Bu pochta bilan hisob allaqachon mavjud. Kirib ko‘ring.", "Аккаунт с этой почтой уже существует. Попробуйте войти."],
    "Email or password is incorrect.": ["Pochta yoki parol noto‘g‘ri.", "Неверная почта или пароль."],
    "This browser is blocking storage. Use guest mode or allow site data.": ["Brauzer ma’lumot saqlashni bloklayapti. Mehmon rejimidan foydalaning yoki sayt ma’lumotlariga ruxsat bering.", "Браузер блокирует хранилище. Используйте гостевой режим или разрешите данные сайта."],
    "Too short": ["Juda qisqa", "Слишком короткий"], "Fair": ["O‘rtacha", "Средний"], "Good": ["Yaxshi", "Хороший"], "Strong": ["Kuchli", "Надёжный"],
    // templates
    "Home": ["Bosh sahifa", "Главная"], "Templates": ["Shablonlar", "Шаблоны"], "Makon · Templates": ["Makon · Shablonlar", "Makon · Шаблоны"],
    "Ready-made rooms": ["Tayyor xonalar", "Готовые комнаты"],
    "Open any room and change everything — walls, furniture, style, budget. Every picture here is the actual 3D room you get, not a stock photo.": ["Istalgan xonani oching va hamma narsani o‘zgartiring — devorlar, mebel, uslub, byudjet. Bu yerdagi har bir rasm — siz oladigan haqiqiy 3D xona, stok surat emas.", "Откройте любую комнату и меняйте всё — стены, мебель, стиль, бюджет. Каждая картинка здесь — та самая 3D-комната, которую вы получите, а не стоковое фото."],
    "All": ["Hammasi", "Все"], "Living": ["Mehmonxona", "Гостиная"], "Bedroom": ["Yotoqxona", "Спальня"], "Kitchen & dining": ["Oshxona va ovqatlanish", "Кухня и столовая"], "Kitchen &amp; dining": ["Oshxona va ovqatlanish", "Кухня и столовая"],
    "Work": ["Ish", "Работа"], "Kids": ["Bolalar", "Дети"], "Bath": ["Hammom", "Ванная"],
    "pieces": ["ta buyum", "предметов"], "Open": ["Ochish", "Открыть"],
    "3D overview": ["3D umumiy ko‘rinish", "3D-обзор"], "Eye level": ["Ko‘z balandligida", "На уровне глаз"], "Evening": ["Kechqurun", "Вечер"], "Floor plan": ["Xona rejasi", "План комнаты"],
    "Style": ["Uslub", "Стиль"], "Size": ["O‘lcham", "Размер"], "Floor area": ["Pol maydoni", "Площадь пола"], "Furniture": ["Mebel", "Мебель"], "Ceiling": ["Shift", "Потолок"], "L-shaped": ["L shaklida", "Г-образная"],
    "Open in Studio": ["Studiyada ochish", "Открыть в студии"], "← Previous room": ["← Oldingi xona", "← Предыдущая комната"], "Next room →": ["Keyingi xona →", "Следующая комната →"], "Close ✕": ["Yopish ✕", "Закрыть ✕"],
    "Day and evening": ["Kunduz va kechqurun", "День и вечер"], "After dark.": ["Qorong‘i tushgach.", "Когда стемнеет."],
    "Switch any room to evening in 3D: the daylight fades and every lamp you placed starts to glow.": ["3D da istalgan xonani kechki rejimga o‘tkazing: kunduzgi yorug‘lik so‘nadi, siz qo‘ygan har bir chiroq yonadi.", "Переключите любую комнату на вечер в 3D: дневной свет гаснет, и загораются все поставленные вами лампы."],
    "Have a room in mind?": ["Xayolingizda xona bormi?", "Есть комната на примете?"], "Let's make it<br>feel like home.": ["Keling, uni<br>uyday qilamiz.", "Сделаем её<br>по-настоящему уютной."],
    "Start with your own photo": ["O‘z suratingizdan boshlang", "Начать со своего фото"], "How Makon works →": ["Makon qanday ishlaydi →", "Как работает Makon →"], "Design one room at a time.": ["Har safar bitta xonani loyihalang.", "Проектируйте по одной комнате."],
    "Templates — Makon": ["Shablonlar — Makon", "Шаблоны — Makon"],
    "Living room": ["Mehmonxona", "Гостиная"], "Kitchen": ["Oshxona", "Кухня"], "Dining room": ["Ovqatlanish xonasi", "Столовая"], "Home office": ["Uy ofisi", "Домашний кабинет"], "Kids' room": ["Bolalar xonasi", "Детская"], "Bathroom": ["Hammom", "Ванная"], "Studio flat": ["Studiya kvartira", "Квартира-студия"], "Hallway": ["Dahliz", "Прихожая"],
    "Warm living room": ["Iliq mehmonxona", "Тёплая гостиная"],
    "A sofa facing the TV wall, a low oak table on a wool rug and a reading chair turned toward the window.": ["Televizor devoriga qaragan divan, jun gilam ustidagi past eman stol va derazaga burilgan o‘qish kreslosi.", "Диван напротив стены с телевизором, низкий дубовый столик на шерстяном ковре и кресло для чтения у окна."],
    "Nordic bedroom": ["Skandinav yotoqxonasi", "Скандинавская спальня"],
    "A double bed on the quiet wall with matching bedside tables, a full-height wardrobe and a dresser by the door.": ["Tinch devor yonida juft karavot va ikkita tumbochka, shiftgacha shkaf va eshik yonida komod.", "Двуспальная кровать у тихой стены с прикроватными тумбами, шкаф до потолка и комод у двери."],
    "Japandi studio flat": ["Japandi studiya kvartira", "Квартира-студия в стиле джапанди"],
    "One room that does everything: a galley kitchen, a round table for two, a sofa corner and a bed by the window.": ["Hamma narsaga yetadigan bitta xona: qator oshxona, ikki kishilik dumaloq stol, divan burchagi va deraza yonida karavot.", "Одна комната для всего: линейная кухня, круглый стол на двоих, диванный уголок и кровать у окна."],
    "Mid-century dining room": ["Mid-century ovqatlanish xonasi", "Столовая в стиле mid-century"],
    "A teak table for six under the window light, a long sideboard with art above and a lamp in the corner.": ["Deraza yorug‘ida olti kishilik tik stol, ustida rasm osilgan uzun komod va burchakda chiroq.", "Тиковый стол на шестерых у окна, длинный комод с картиной над ним и торшер в углу."],
    "Industrial home office": ["Industrial uy ofisi", "Домашний кабинет в стиле лофт"],
    "A desk under the window, two bookcases for the archive and an armchair for calls away from the screen.": ["Deraza ostida stol, arxiv uchun ikkita kitob javoni va ekrandan uzoqda qo‘ng‘iroqlar uchun kreslo.", "Стол у окна, два стеллажа для архива и кресло для звонков вдали от экрана."],
    "Sage kids' room": ["Yashil bolalar xonasi", "Детская в оттенках шалфея"],
    "A bed tucked into the corner, a desk and bookcase on the opposite wall and a round rug left free for play.": ["Burchakka joylashgan karavot, qarama-qarshi devorda stol va javon, o‘yin uchun bo‘sh dumaloq gilam.", "Кровать в углу, стол и стеллаж у противоположной стены и свободный круглый ковёр для игр."],
    "Gallery kitchen-diner": ["Oshxona-ovqatlanish xonasi", "Кухня-столовая"],
    "A straight run of units with the sink under the window, an island with two stools and a round table for four.": ["Deraza ostida rakovinali to‘g‘ri qator shkaflar, ikki stulchali orolcha va to‘rt kishilik dumaloq stol.", "Прямой ряд шкафов с мойкой у окна, остров с двумя табуретами и круглый стол на четверых."],
    "Mediterranean bathroom": ["O‘rta yer dengizi uslubidagi hammom", "Средиземноморская ванная"],
    "A full-length bath under a high window, the toilet and a vanity on the side wall, and a clear path from the door.": ["Baland deraza ostida to‘liq vanna, yon devorda unitaz va yuvinish tumbasi, eshikdan bo‘sh yo‘l.", "Полноразмерная ванна под высоким окном, унитаз и тумба с раковиной у боковой стены и свободный проход от двери."],
    "Midnight lounge": ["Tungi mehmonxona", "Полуночная гостиная"],
    "An L-shaped room: a deep corner sofa and TV wall on one side, a round table and library wall in the other.": ["L shaklidagi xona: bir tomonda chuqur burchak divan va televizor devori, boshqasida dumaloq stol va kitob javoni.", "Г-образная комната: глубокий угловой диван и ТВ-стена с одной стороны, круглый стол и книжный стеллаж — с другой."],
    "Start from a template": ["Shablondan boshlang", "Начните с шаблона"],
    "Nine ready-made rooms — real plans, furniture and 3D. Open one and make it yours.": ["To‘qqizta tayyor xona — haqiqiy reja, mebel va 3D. Birini oching va o‘zingizniki qiling.", "Девять готовых комнат — настоящие планы, мебель и 3D. Откройте любую и сделайте её своей."],
    "See all templates <span>→</span>": ["Barcha shablonlar <span>→</span>", "Все шаблоны <span>→</span>"],
    // page titles
    "Makon — Redesign your room with AI": ["Makon — xonangizni AI bilan qayta loyihalang", "Makon — редизайн комнаты с помощью AI"],
    "Sign in — Makon": ["Kirish — Makon", "Вход — Makon"], "Create account — Makon": ["Ro‘yxatdan o‘tish — Makon", "Регистрация — Makon"]
  };

  const LANGS = ["en", "uz", "ru"], KEY = "makon_lang";
  const norm = s => String(s).replace(/\s+/g, " ").trim();
  let lang = "en";
  try { lang = localStorage.getItem(KEY) || ""; } catch (e) {}
  if (!LANGS.includes(lang)) { const n = (navigator.language || "en").slice(0, 2).toLowerCase(); lang = n === "uz" ? "uz" : n === "ru" ? "ru" : "en"; }

  function T(s) { if (lang === "en") return s; const e = D[norm(s)]; return e ? e[lang === "uz" ? 0 : 1] : s; }
  const SEL = "h1,h2,h3,p,summary,li,span,a,button,label,text,figcaption,b,option";
  let titleSrc = null;
  function apply() {
    document.documentElement.lang = lang;
    document.querySelectorAll(SEL).forEach(el => {
      if (el.closest("[data-no-i18n]")) return;
      if (el.dataset.i18nSrc === undefined) { const k = norm(el.innerHTML); if (!D[k]) return; el.dataset.i18nSrc = k; }
      const next = T(el.dataset.i18nSrc);
      if (el.innerHTML !== next) el.innerHTML = next;
    });
    document.querySelectorAll("[placeholder]").forEach(el => {
      if (el.dataset.i18nPh === undefined) { const k = norm(el.getAttribute("placeholder")); if (!D[k]) return; el.dataset.i18nPh = k; }
      el.setAttribute("placeholder", T(el.dataset.i18nPh));
    });
    if (titleSrc === null) titleSrc = norm(document.title);
    document.title = T(titleSrc);
    document.querySelectorAll("[data-lang]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.lang === lang)));
    document.dispatchEvent(new CustomEvent("makon:lang", { detail: lang }));
  }
  function setLang(l) {
    if (!LANGS.includes(l)) return;
    lang = l;
    try { localStorage.setItem(KEY, l); } catch (e) {}
    apply();
  }
  // set an element to a (translatable) English key from code
  function set(el, key) { if (!el) return; el.dataset.i18nSrc = key; el.innerHTML = T(key); }
  document.addEventListener("click", e => { const b = e.target.closest("[data-lang]"); if (b) setLang(b.dataset.lang); });

  window.MakonI18n = { T, setLang, set, apply, get lang() { return lang; } };
  apply();
})();
