// ==========================================
// WHITE LABEL CONFIGURATION
// ==========================================
// When setting up for a new restaurant client:
// 1. Copy this project in v0
// 2. Update ALL values in this file with the new restaurant's details
// 3. Replace logo image in /public folder
// 4. Update menu items, prices, and images
// 5. Configure delivery zones and fees
// ==========================================

const RESTAURANT_CONFIG = {
  // BRANDING
  name: "Gourmet Catering Co.",
  tagline: "Professional Catering for Every Occasion",
  logo: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=200&h=80&q=80", // Restaurant/food service logo
  primaryColor: "#16a34a", // Main brand color
  accentColor: "#10b981", // Secondary brand color

  // CONTACT & BUSINESS INFO
  phone: "787.792.2625",
  email: "orders@gourmetcatering.com",
  website: "www.gourmetcatering.com",
  address: "123 Main Street, City, ST 12345",

  // ITEM TYPES
  // Define the types of items that can be created in the menu
  // These will appear in the admin panel when creating new items
  itemTypes: ["Tray", "Bundle", "Individual", "Hot Entree", "Appetizer", "Dessert", "Side Dish", "Beverage"],

  // FOOTER SETTINGS
  footer: {
    links: [
      { label: "About Us", url: "/about" },
      { label: "Contact", url: "/contact" },
      { label: "Terms of Service", url: "/terms" },
      { label: "Privacy Policy", url: "/privacy" },
    ],
    socialMedia: [
      { platform: "Facebook", url: "https://facebook.com/yourcatering" },
      { platform: "Instagram", url: "https://instagram.com/yourcatering" },
      { platform: "Twitter", url: "https://twitter.com/yourcatering" },
    ],
    showAdminLink: true, // Show admin portal link in footer
  },

  // SHIPDAY INTEGRATION (Delivery Management)
  // Get your API key from: https://shipday.com/developers
  shipday: {
    enabled: true, // Set to false to disable Shipday integration
    // Note: Add SHIPDAY_API_KEY to your environment variables
    restaurantName: "Gourmet Catering Co.",
    restaurantAddress: "123 Main Street, City, ST 12345",
    restaurantPhone: "(555) 123-4567",
  },

  // NOTIFICATION SETTINGS
  notifications: {
    // Email addresses to receive order notifications (can be multiple)
    orderEmails: ["orders@gourmetcatering.com", "kitchen@gourmetcatering.com"],
    // Phone numbers to receive SMS notifications (format: +1234567890)
    orderPhones: ["+15551234567"],
  },

  // ORDER SETTINGS
  minOrderValue: 200, // Minimum order amount in dollars
  taxRate: 0.08, // Sales tax rate (8% = 0.08)

  // LEAD TIME & SCHEDULING SETTINGS
  scheduling: {
    minLeadTimeHours: 24, // Minimum hours before event (24 = 1 day notice required)
    maxAdvanceBookingDays: 90, // Maximum days in advance to book (0 = no limit)

    // Days of week available for service (0 = Sunday, 6 = Saturday)
    availableDays: [0, 1, 2, 3, 4, 5, 6], // All days available by default
    // Example: [1, 2, 3, 4, 5] = Monday-Friday only

    // Blackout dates (dates unavailable for catering)
    blackoutDates: [
      // Format: "YYYY-MM-DD"
      // "2025-12-25", // Christmas
      // "2025-01-01", // New Year's Day
    ],

    // Operating hours for pickup/delivery
    // If event time is outside these hours, show warning
    operatingHours: {
      start: "07:00", // 7:00 AM
      end: "21:00", // 9:00 PM
    },

    // Cutoff time for next-day orders (in 24hr format)
    // Orders placed after this time require an extra day
    sameDayCutoffTime: "12:00", // Noon cutoff
  },

  // DELIVERY ZONES
  deliveryZones: [
    { zip: "10001", name: "Downtown Business District", fee: 0 },
    { zip: "10002", name: "East Side Corporate Park", fee: 15 },
    { zip: "10003", name: "West End Tech Hub", fee: 25 },
  ],

  // TIP OPTIONS (percentages)
  tipOptions: [15, 18, 20, 25],

  // SERVICE PACKAGES
  // Tiered setup and presentation services with base inclusions and add-on options
  servicePackages: [
    {
      id: "basic-setup",
      name: "Basic Delivery & Setup",
      description: "Delivery and setup on your facility only",
      detailedDescription:
        "Our team will deliver your catering order and arrange it at your location. Perfect for simple events where you have your own tables and serving equipment.",
      image: "https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&w=800&q=80",
      basePrice: 45,
      icon: "🚚",
      baseInclusions: ["Professional delivery", "Basic food arrangement", "Setup on your existing tables"],
      availableAddOns: ["table-with-cover", "serving-utensils", "extra-disposables"], // Basic tier: No chafing dishes allowed
      addOnOptions: [
        {
          id: "table-with-cover",
          name: "Table with Cover",
          description: "6ft folding table with coordinated tablecloth",
          pricePerUnit: 25,
          maxQuantity: 10,
        },
        {
          id: "serving-utensils",
          name: "Premium Serving Utensils Set",
          description: "Stainless steel serving utensils and platters",
          pricePerUnit: 15,
          maxQuantity: 5,
        },
        {
          id: "extra-disposables",
          name: "Extra Disposables Set (per 10 guests)",
          description: "Additional plates, cups, napkins for 10 people",
          pricePerUnit: 8,
          maxQuantity: 20,
        },
      ],
    },
    {
      id: "premium-setup",
      name: "Premium Setup Package",
      description: "Complete setup with 1 table, 3 chafing dishes, and disposables",
      detailedDescription:
        "Includes delivery, one 6ft table with premium linen, three wire chafing dishes with fuel, plus plates, cups & napkins for your guest count.",
      image: "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=800&q=80",
      basePrice: 125,
      icon: "✨",
      baseInclusions: [
        "Professional delivery & setup",
        "1 table (6ft) with premium linen",
        "3 wire chafing dishes with sterno fuel",
        "Plates, cups & napkins (based on guest count)",
        "Coordinated serving utensils",
      ],
      availableAddOns: ["additional-table", "wire-chafing-dish", "extra-disposables"],
      addOnOptions: [
        {
          id: "additional-table",
          name: "Additional Table with Linen",
          description: "6ft table with matching premium linen",
          pricePerUnit: 35,
          maxQuantity: 10,
        },
        {
          id: "wire-chafing-dish",
          name: "Additional Wire Chafing Dish",
          description: "Standard wire chafing dish with sterno fuel",
          pricePerUnit: 18,
          maxQuantity: 15,
        },
        {
          id: "extra-disposables",
          name: "Extra Disposables Set (per 10 guests)",
          description: "Additional plates, cups, napkins for 10 people",
          pricePerUnit: 12,
          maxQuantity: 20,
        },
      ],
    },
    {
      id: "premium-plus",
      name: "Premium Plus Package",
      description: "Deluxe setup with 2 tables, 5 chafing dishes, and complete service",
      detailedDescription:
        "The ultimate catering experience includes delivery, two premium tables with luxury linens, five wire chafing dishes with fuel, complete disposables for your guests, and professional presentation.",
      image: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=800&q=80",
      basePrice: 225,
      icon: "👨‍🍳",
      baseInclusions: [
        "Premium delivery & complete setup",
        "2 tables (6ft) with luxury linens",
        "5 wire chafing dishes with extended fuel",
        "Premium plates, cups & napkins (based on guest count)",
        "Complete serving utensil set",
        "Decorative presentation elements",
      ],
      availableAddOns: [
        "additional-table",
        "wire-chafing-dish",
        "premium-decorative-chafing",
        "extra-disposables",
        "centerpiece",
      ],
      addOnOptions: [
        {
          id: "additional-table",
          name: "Additional Table with Luxury Linen",
          description: "6ft table with matching luxury linen",
          pricePerUnit: 40,
          maxQuantity: 10,
        },
        {
          id: "wire-chafing-dish",
          name: "Additional Wire Chafing Dish",
          description: "Standard wire chafing dish with extended fuel",
          pricePerUnit: 20,
          maxQuantity: 15,
        },
        {
          id: "premium-decorative-chafing",
          name: "Premium Decorative Chafing Dish",
          description: "Elegant decorative chafing dish with ornate design and extended fuel",
          pricePerUnit: 45,
          maxQuantity: 10,
        },
        {
          id: "extra-disposables",
          name: "Extra Premium Disposables (per 10 guests)",
          description: "Additional premium plates, cups, napkins for 10 people",
          pricePerUnit: 15,
          maxQuantity: 20,
        },
        {
          id: "centerpiece",
          name: "Table Centerpiece",
          description: "Elegant floral or decorative centerpiece",
          pricePerUnit: 35,
          maxQuantity: 10,
        },
      ],
    },
  ],

  // DIETARY FILTERS
  dietaryFilters: ["Vegetarian", "Vegan", "Gluten Free", "Dairy Free", "Nut Free"],
}

// ==========================================
// MENU CONFIGURATION
// ==========================================
// Update this array with the restaurant's menu items
// Each item should include:
// - id: Unique identifier (e.g., "S1", "B2", "P3")
// - category: Menu category (all items with same category are grouped)
// - type: "Tray", "Bundle", or "Individual"
// - name: Display name
// - description: Item description
// - image: URL to item photo (use Unsplash or upload to /public)
// - serves: Who/how many it serves (e.g., "10-12 people")
// - price: Price in dollars
// - tags: Array of dietary tags (e.g., ["Vegetarian", "Gluten Free"])
// - options: (For Bundles only) Array of customization options
// ==========================================

const CATERING_MENU = [
  // --- CLASSIC SANDWICHES ---
  {
    id: "S1",
    category: "CLASSIC SANDWICHES",
    type: "Tray",
    name: "SANDWICH PLATTER - SMALL (serves 8 to 10)",
    description: "10 Sandwiches, Cut in Half. Assortment of our most popular deli classics.",
    image: "https://images.unsplash.com/photo-1554433607-66b5efe9d304?auto=format&fit=crop&w=800&q=80",
    serves: "8-10 people",
    price: 120.0,
    tags: [],
    taxable: true, // Added taxable flag (default true for all items)
    options: [
      {
        name: "Bread Selection",
        instruction: "Choose your bread types",
        required: true,
        min: 1,
        max: 2,
        choices: ["White Bread", "Wheat Bread", "Ciabatta", "Sourdough"],
      },
    ],
  },
  {
    id: "S2",
    category: "CLASSIC SANDWICHES",
    type: "Tray",
    name: "SANDWICH PLATTER - MEDIUM (serves 12 to 15)",
    description: "15 Sandwiches, Cut in Half. Includes Turkey, Roast Beef, and Veggie options.",
    image: "https://images.unsplash.com/photo-1626074353765-517a681e40be?auto=format&fit=crop&w=800&q=80",
    serves: "12-15 people",
    price: 180.0,
    tags: [],
    taxable: true,
    options: [
      {
        name: "Bread Selection",
        instruction: "Choose your bread types",
        required: true,
        min: 1,
        max: 2,
        choices: ["White Bread", "Wheat Bread", "Ciabatta", "Sourdough", "Rye"],
      },
      {
        name: "Protein Mix",
        instruction: "Select protein preferences",
        required: false,
        min: 0,
        max: 3,
        choices: ["Turkey", "Roast Beef", "Ham", "Chicken Salad", "Tuna Salad", "Vegetarian"],
      },
    ],
  },
  {
    id: "S3",
    category: "CLASSIC SANDWICHES",
    type: "Bundle",
    name: "SANDWICH BUFFET PACKAGE - SMALL (serves 10)",
    description: "10 Sandwiches Cut In Half, 1 Side Salad and 1 Cookie & Brownie Tray.",
    image: "https://images.unsplash.com/photo-1597696956693-de546a28c806?auto=format&fit=crop&w=800&q=80",
    serves: "10 people",
    price: 260.0,
    tags: [],
    taxable: true,
    options: [
      {
        name: "Select Salad",
        instruction: "Choose 1",
        min: 1,
        max: 1,
        choices: ["Garden Salad", "Caesar Salad", "Greek Salad"],
      },
    ],
  },
  {
    id: "S4",
    category: "CLASSIC SANDWICHES",
    type: "Bundle",
    name: "SANDWICH BUFFET PACKAGE - LARGE (serves 20)",
    description: "21 Sandwiches Cut In Half, 2 Side Salads and 1 Cookie & Brownie Tray.",
    image: "https://images.unsplash.com/photo-1564844536311-de546a28c806?auto=format&fit=crop&w=800&q=80",
    serves: "20 people",
    price: 550.0,
    tags: [],
    taxable: true,
    options: [
      {
        name: "Select Salad",
        instruction: "Choose 2",
        min: 2,
        max: 2,
        choices: ["Garden Salad", "Caesar Salad", "Greek Salad", "Potato Salad"],
      },
    ],
  },

  // --- PETITE SANDWICHES ---
  {
    id: "P1",
    category: "PETITE SANDWICHES",
    type: "Tray",
    name: "ENGLISH TEA SANDWICHES - SMALL (25 Pcs)",
    description: "On Traditional White Bread and Whole Wheat. Cucumber, Salmon, and Egg Salad.",
    image: "https://images.unsplash.com/photo-1565958011703-44f9829ba187?auto=format&fit=crop&w=800&q=80",
    serves: "10-12 people",
    price: 62.0,
    tags: ["Vegetarian Option"],
    taxable: true,
    options: [
      {
        name: "Filling Selection",
        instruction: "Choose your fillings",
        required: true,
        min: 2,
        max: 3,
        choices: ["Cucumber & Cream Cheese", "Smoked Salmon", "Egg Salad", "Chicken Salad"],
      },
    ],
  },
  {
    id: "P2",
    category: "PETITE SANDWICHES",
    type: "Tray",
    name: "ENGLISH TEA SANDWICHES - MEDIUM (38 Pcs)",
    description: "On Traditional White Bread and Whole Wheat. Perfect for afternoon meetings.",
    image: "https://images.unsplash.com/photo-1603064755733-801b9f925911?auto=format&fit=crop&w=800&q=80",
    serves: "15-18 people",
    price: 94.0,
    tags: ["Vegetarian Option"],
    taxable: true,
    options: [
      {
        name: "Filling Selection",
        instruction: "Choose your fillings",
        required: true,
        min: 2,
        max: 4,
        choices: ["Cucumber & Cream Cheese", "Smoked Salmon", "Egg Salad", "Chicken Salad", "Ham & Swiss"],
      },
    ],
  },

  // --- BREAKFAST ---
  {
    id: "B1",
    category: "BREAKFAST",
    type: "Tray",
    name: "CONTINENTAL BREAKFAST",
    description: "Assorted bagels, muffins, and danishes served with cream cheese and butter.",
    image: "https://images.unsplash.com/photo-1525351484163-7529414395d8?auto=format&fit=crop&w=800&q=80",
    serves: "10-12 people",
    price: 145.0,
    tags: ["Vegetarian"],
    taxable: true,
    options: [
      {
        name: "Pastry Selection",
        instruction: "Choose your favorites",
        required: true,
        min: 2,
        max: 3,
        choices: [
          "Plain Bagels",
          "Everything Bagels",
          "Blueberry Muffins",
          "Chocolate Chip Muffins",
          "Danishes",
          "Croissants",
        ],
      },
    ],
  },
]

const CATEGORY_ORDER = [
  { name: "CLASSIC SANDWICHES", displayOrder: 1 },
  { name: "PETITE SANDWICHES", displayOrder: 2 },
  { name: "BREAKFAST", displayOrder: 3 },
]

const CATEGORIES = [...new Set(CATERING_MENU.map((i) => i.category))].sort((a, b) => {
  const orderA = CATEGORY_ORDER.find((c) => c.name === a)?.displayOrder ?? 999
  const orderB = CATEGORY_ORDER.find((c) => c.name === b)?.displayOrder ?? 999
  return orderA - orderB
})

export const restaurantConfig = {
  branding: {
    name: RESTAURANT_CONFIG.name,
    tagline: RESTAURANT_CONFIG.tagline,
    logo: RESTAURANT_CONFIG.logo,
    primaryColor: RESTAURANT_CONFIG.primaryColor,
    accentColor: RESTAURANT_CONFIG.accentColor,
  },
  contact: {
    phone: RESTAURANT_CONFIG.phone,
    email: RESTAURANT_CONFIG.email,
    website: RESTAURANT_CONFIG.website,
    address: RESTAURANT_CONFIG.address,
  },
  footer: RESTAURANT_CONFIG.footer,
  notifications: RESTAURANT_CONFIG.notifications,
  shipday: RESTAURANT_CONFIG.shipday,
  businessRules: {
    minimumOrderValue: RESTAURANT_CONFIG.minOrderValue,
    taxRate: RESTAURANT_CONFIG.taxRate,
    scheduling: RESTAURANT_CONFIG.scheduling,
  },
  deliveryZones: RESTAURANT_CONFIG.deliveryZones,
  tipOptions: RESTAURANT_CONFIG.tipOptions,
  servicePackages: RESTAURANT_CONFIG.servicePackages,
  dietaryFilters: RESTAURANT_CONFIG.dietaryFilters,
  itemTypes: RESTAURANT_CONFIG.itemTypes,
  menu: CATERING_MENU,
  categories: CATEGORIES,
  categoryOrder: CATEGORY_ORDER,
}

export const mockServicePackages = RESTAURANT_CONFIG.servicePackages.map((pkg) => ({
  id: pkg.id,
  restaurant_id: "preview",
  name: pkg.name,
  description: pkg.description,
  image_url: pkg.image,
  base_price: pkg.basePrice,
  is_active: true,
  is_available: true,
  display_order: 0,
  package_inclusions: pkg.baseInclusions.map((desc, idx) => ({
    id: `inc-${pkg.id}-${idx}`,
    package_id: pkg.id,
    description: desc,
    display_order: idx,
  })),
  package_addons: pkg.addOnOptions.map((addon, idx) => ({
    id: addon.id,
    package_id: pkg.id,
    name: addon.name,
    description: addon.description,
    price: addon.pricePerUnit,
    display_order: idx,
  })),
}))
