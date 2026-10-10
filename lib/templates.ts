// قوالب منيو أولية لكل نشاط — أسعار وسعرات تقديرية للبدء، يعدّلها صاحب المنشأة
import type { Allergen, ItemTag, MenuCategory, VenueType } from "./types";

export const VENUE_TYPES: { id: VenueType; label: string; en: string }[] = [
  { id: "cafe", label: "مقهى", en: "Café" },
  { id: "restaurant", label: "مطعم شعبي وعربي", en: "Restaurant" },
  { id: "burger", label: "برجر ووجبات سريعة", en: "Burgers" },
  { id: "bakery", label: "مخبز وحلويات", en: "Bakery" },
  { id: "juice", label: "عصائر وصحي", en: "Juice bar" },
  { id: "seafood", label: "مأكولات بحرية", en: "Seafood" },
];

export const TAGS: Record<ItemTag, { label: string; en: string }> = {
  new: { label: "جديد", en: "New" },
  popular: { label: "الأكثر طلباً", en: "Popular" },
  spicy: { label: "حار", en: "Spicy" },
  veg: { label: "نباتي", en: "Vegetarian" },
  chef: { label: "اختيار الشيف", en: "Chef's pick" },
};

// مسببات الحساسية الواردة في دليل هيئة الغذاء والدواء
export const ALLERGENS: Record<Allergen, { label: string; en: string; abbr: string }> = {
  gluten: { label: "غلوتين", en: "Gluten", abbr: "غ" },
  milk: { label: "حليب", en: "Milk", abbr: "ح" },
  eggs: { label: "بيض", en: "Eggs", abbr: "ب" },
  nuts: { label: "مكسرات", en: "Nuts", abbr: "م" },
  sesame: { label: "سمسم", en: "Sesame", abbr: "س" },
  soy: { label: "صويا", en: "Soy", abbr: "ص" },
  fish: { label: "أسماك", en: "Fish", abbr: "ك" },
};

type T = [string, string, string, string, number, number, ItemTag[], Allergen[]]; // ar, en, desc, descEn, price, kcal, tags, allergens
const cat = (id: string, name: string, nameEn: string, items: T[]): MenuCategory => ({
  id,
  name,
  nameEn,
  items: items.map(([n, ne, d, de, price, calories, tags, allergens], i) => ({
    id: `${id}-${i + 1}`, name: n, nameEn: ne, desc: d, descEn: de, price, calories, tags, allergens, available: true,
  })),
});

export const TEMPLATES: Record<VenueType, MenuCategory[]> = {
  cafe: [
    cat("espresso", "قهوة مختصة", "Specialty coffee", [
      ["إسبريسو", "Espresso", "جرعة مركزة من محصول اليوم", "A concentrated shot of today's roast", 12, 5, [], []],
      ["لاتيه", "Latte", "إسبريسو مع حليب مبخر وطبقة رغوة ناعمة", "Espresso with steamed milk and silky foam", 18, 190, ["popular"], ["milk"]],
      ["فلات وايت", "Flat white", "جرعتان من الإسبريسو مع حليب قليل", "Double espresso with a thin layer of milk", 17, 120, [], ["milk"]],
      ["سبانش لاتيه", "Spanish latte", "حليب مكثف محلى مع إسبريسو", "Sweetened condensed milk and espresso", 21, 290, ["popular"], ["milk"]],
    ]),
    cat("filter", "قهوة مقطّرة وسعودية", "Brewed & Saudi coffee", [
      ["V60", "V60", "تقطير يدوي يُبرز النكهات الفاكهية", "Hand pour-over highlighting fruity notes", 19, 5, [], []],
      ["قهوة سعودية (دلّة صغيرة)", "Saudi coffee (small dallah)", "بالهيل والزعفران، تُقدّم مع التمر", "With cardamom and saffron, served with dates", 25, 15, ["chef"], []],
      ["كولد برو", "Cold brew", "منقوعة 18 ساعة وتُقدّم باردة", "Steeped 18 hours, served over ice", 20, 10, ["new"], []],
    ]),
    cat("sweets", "حلا", "Desserts", [
      ["تشيز كيك سان سباستيان", "San Sebastián cheesecake", "قوام كريمي وسطح محروق", "Creamy center with a burnt top", 26, 420, ["popular"], ["milk", "eggs", "gluten"]],
      ["كوكيز بالشوكولاتة", "Chocolate chip cookie", "تُخبز يومياً", "Baked fresh daily", 9, 230, [], ["gluten", "eggs", "milk"]],
      ["كيكة التمر", "Date cake", "بصوص التوفي", "With toffee sauce", 22, 380, [], ["gluten", "eggs", "milk"]],
    ]),
  ],
  restaurant: [
    cat("mains", "الأطباق الرئيسية", "Main dishes", [
      ["مندي لحم", "Lamb mandi", "لحم حاشي مطهو ببطء على أرز بالبهارات", "Slow-cooked lamb on spiced rice", 65, 1250, ["popular"], []],
      ["كبسة دجاج", "Chicken kabsa", "نصف دجاج مع أرز الكبسة والدقوس", "Half chicken with kabsa rice and daqous", 38, 980, [], []],
      ["مظبي دجاج", "Madhbi chicken", "مشوي على الحجر", "Grilled on hot stone", 36, 720, ["chef"], []],
      ["جريش", "Jareesh", "قمح مجروش مطبوخ باللبن", "Crushed wheat cooked with yogurt", 22, 450, ["veg"], ["gluten", "milk"]],
    ]),
    cat("grills", "المشويات", "Grills", [
      ["مشكل مشاوي", "Mixed grill", "كباب وشيش طاووق وريش", "Kebab, shish tawook and lamb chops", 75, 1100, ["popular"], []],
      ["شيش طاووق", "Shish tawook", "مع الثومية والخبز", "With garlic sauce and bread", 32, 650, [], ["eggs", "gluten"]],
    ]),
    cat("sides", "المقبلات", "Starters", [
      ["حمص", "Hummus", "بزيت الزيتون", "With olive oil", 14, 320, ["veg"], ["sesame"]],
      ["سلطة حارة", "Spicy salad", "طماطم وفلفل وبقدونس", "Tomato, chili and parsley", 12, 90, ["veg", "spicy"], []],
      ["سمبوسة (4 حبات)", "Sambousa (4 pcs)", "باللحم أو الجبن", "Meat or cheese", 16, 380, [], ["gluten", "milk"]],
    ]),
  ],
  burger: [
    cat("burgers", "البرجر", "Burgers", [
      ["الكلاسيك", "The Classic", "لحم أنقس 150 جم مع الجبن والصوص الخاص", "150g Angus beef, cheese and house sauce", 32, 780, ["popular"], ["gluten", "milk", "eggs", "sesame"]],
      ["سماش دبل", "Double smash", "قطعتان مضغوطتان مع بصل مكرمل", "Two smashed patties with caramelized onion", 38, 980, ["popular"], ["gluten", "milk", "sesame"]],
      ["دجاج حار", "Spicy chicken", "صدر دجاج مقرمش مع صوص حار", "Crispy chicken breast with hot sauce", 29, 720, ["spicy", "new"], ["gluten", "eggs", "sesame"]],
    ]),
    cat("sides-b", "الإضافات", "Sides", [
      ["بطاطس", "Fries", "مقرمشة بالملح البحري", "Crispy with sea salt", 12, 380, ["veg"], []],
      ["بطاطس بالجبن", "Cheese fries", "مع صوص الشيدر", "With cheddar sauce", 17, 520, [], ["milk"]],
      ["حلقات البصل", "Onion rings", "6 قطع", "6 pieces", 13, 410, ["veg"], ["gluten"]],
    ]),
    cat("drinks-b", "المشروبات", "Drinks", [
      ["مشروب غازي", "Soft drink", "330 مل", "330 ml", 7, 140, [], []],
      ["ميلك شيك", "Milkshake", "فانيلا أو شوكولاتة", "Vanilla or chocolate", 18, 560, [], ["milk"]],
    ]),
  ],
  bakery: [
    cat("bread", "المخبوزات", "Bakery", [
      ["كرواسون زبدة", "Butter croissant", "يُخبز كل صباح", "Baked every morning", 9, 270, ["popular"], ["gluten", "milk", "eggs"]],
      ["فطيرة زعتر", "Zaatar manakeesh", "بزيت الزيتون", "With olive oil", 8, 310, ["veg"], ["gluten", "sesame"]],
      ["خبز التميس", "Tamees bread", "مع الجبن والعسل", "With cheese and honey", 10, 420, [], ["gluten", "milk"]],
    ]),
    cat("cakes", "الكيك", "Cakes", [
      ["كيكة الزعفران", "Saffron cake", "بالحليب والهيل", "With milk and cardamom", 24, 410, ["chef"], ["gluten", "milk", "eggs"]],
      ["براونيز", "Brownie", "شوكولاتة داكنة", "Dark chocolate", 14, 360, [], ["gluten", "eggs", "milk", "nuts"]],
      ["كنافة بالقشطة", "Kunafa with cream", "تُقدّم ساخنة", "Served warm", 26, 520, ["popular"], ["gluten", "milk", "nuts"]],
    ]),
    cat("drinks-k", "المشروبات", "Drinks", [
      ["شاي كرك", "Karak tea", "بالحليب والهيل", "With milk and cardamom", 7, 160, [], ["milk"]],
      ["قهوة أمريكية", "Americano", "إسبريسو مع ماء ساخن", "Espresso with hot water", 12, 10, [], []],
    ]),
  ],
  juice: [
    cat("fresh", "عصائر طازجة", "Fresh juices", [
      ["برتقال", "Orange", "معصور عند الطلب", "Squeezed to order", 14, 160, ["popular"], []],
      ["مانجو", "Mango", "مانجو طبيعي بدون سكر مضاف", "Pure mango, no added sugar", 17, 210, [], []],
      ["ليمون بالنعناع", "Lemon mint", "منعش ومثلج", "Iced and refreshing", 13, 120, ["veg"], []],
    ]),
    cat("smoothies", "سموذي", "Smoothies", [
      ["سموذي التوت", "Berry smoothie", "توت مشكل مع زبادي", "Mixed berries with yogurt", 22, 280, ["new"], ["milk"]],
      ["أفوكادو بالعسل", "Avocado & honey", "مع الحليب والمكسرات", "With milk and nuts", 24, 420, ["popular"], ["milk", "nuts"]],
    ]),
    cat("bowls", "أطباق صحية", "Healthy bowls", [
      ["أساي بول", "Açaí bowl", "مع الجرانولا والفواكه", "With granola and fruit", 32, 450, [], ["gluten", "nuts"]],
      ["سلطة الكينوا", "Quinoa salad", "خضار مشوية وصوص الليمون", "Roasted veg with lemon dressing", 29, 390, ["veg"], []],
    ]),
  ],
  seafood: [
    cat("fish", "الأسماك", "Fish", [
      ["سمك هامور مشوي", "Grilled hammour", "مع الأرز الصيادية", "With sayadieh rice", 78, 820, ["popular"], ["fish"]],
      ["سمك ناجل مقلي", "Fried najil", "بالتتبيلة الحجازية", "With Hijazi spices", 65, 760, [], ["fish", "gluten"]],
    ]),
    cat("shrimp", "الروبيان", "Shrimp", [
      ["روبيان جامبو مشوي", "Grilled jumbo shrimp", "بالثوم والليمون", "With garlic and lemon", 72, 540, ["chef"], []],
      ["روبيان مقرمش", "Crispy shrimp", "مع صوص حار", "With hot sauce", 54, 610, ["spicy"], ["gluten", "eggs"]],
    ]),
    cat("sides-s", "المقبلات", "Starters", [
      ["شوربة السي فود", "Seafood soup", "كريمية", "Creamy", 24, 330, [], ["fish", "milk"]],
      ["فتوش", "Fattoush", "بدبس الرمان", "With pomegranate molasses", 15, 180, ["veg"], ["gluten"]],
    ]),
  ],
};

export const SFDA_CALORIE_NOTE = "يحتاج البالغون إلى 2000 سعر حراري في المتوسط يومياً، وقد تختلف الاحتياجات";
export const SFDA_CALORIE_NOTE_EN = "Adults need an average of 2,000 calories a day; individual needs may vary";
