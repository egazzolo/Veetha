import * as Location from 'expo-location';

// Common breakfast foods by country/region
export const LOCAL_FOODS = {
  // LATIN AMERICA
  'PE': { // Peru
    name: 'Peru',
    breakfast: [
      { name: 'Pan con mantequilla', calories: 250, protein: 6, carbs: 35, fat: 10, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/pan_con_mantequilla.jpg" },
      { name: 'Pan con palta', calories: 320, protein: 8, carbs: 38, fat: 16, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/pan_con_palta.jpg" },
      { name: 'Tamales', calories: 280, protein: 10, carbs: 40, fat: 9, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/tamales.jpg" },
      { name: 'Pan con chicharrón', calories: 610, protein: 32, carbs: 42, fat: 38, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/pan_con_chicharron.jpg" },      
      { name: 'Café con leche', calories: 80, protein: 4, carbs: 10, fat: 3, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/cafe_con_leche.jpg" },
      { name: 'Jugo de naranja', calories: 110, protein: 2, carbs: 26, fat: 0, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/jugo_de_naranja.jpg" },
      { name: 'Quinua con leche', calories: 120, protein: 4, carbs: 21, fat: 2, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/quinua_con_leche.jpg" },
      { name: 'Mazamorra morada', calories: 110, protein: 1, carbs: 27, fat: 0, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/mazamorra_morada.jpg" },
    ],
    lunch: [
      { name: 'Arroz con pollo', emoji: '🍗', calories: 450, protein: 30, carbs: 55, fat: 12, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/arroz_con_pollo.jpg" },
      { name: 'Lomo saltado', emoji: '🥩', calories: 520, protein: 35, carbs: 45, fat: 22, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/lomo_saltado.jpg" },
      { name: 'Ceviche', emoji: '🐟', calories: 280, protein: 32, carbs: 15, fat: 8, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/ceviche.jpg" },
      { name: 'Ají de gallina', emoji: '🌶️', calories: 480, protein: 28, carbs: 40, fat: 20, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/aji_de_gallina.jpg" },
      { name: 'Chupe de camarones', emoji: '🦐', calories: 85, protein: 7, carbs: 8, fat: 3, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/chupe_de_camarones.jpg" },
      { name: 'Seco de res', emoji: '🥩', calories: 130, protein: 12, carbs: 6, fat: 7, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/seco_de_res.jpg" },
      { name: 'Pachamanca', emoji: '🍖', calories: 150, protein: 14, carbs: 10, fat: 6, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/pachamanca.jpg" },
      { name: 'Pollo a la brasa', calories: 190, protein: 27, carbs: 0, fat: 9, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/pollo_a_la_brasa.jpg" },
      { name: 'Tallarines verdes', calories: 160, protein: 6, carbs: 22, fat: 5, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/tallarines_verdes.jpg" },
    ],
    dinner: [
      { name: 'Causa rellena', calories: 350, protein: 15, carbs: 45, fat: 12, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/causa_rellena.jpg" },
      { name: 'Papa a la huancaína', calories: 320, protein: 12, carbs: 35, fat: 16, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/papa_a_la_huancahina.jpg" },
      { name: 'Sopa de pollo', calories: 220, protein: 18, carbs: 25, fat: 6, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/sopa_de_pollo.jpg" },
      { name: 'Picarones', emoji: '🍩', calories: 290, protein: 3, carbs: 40, fat: 13, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/picarones.jpg" },
      { name: 'Arroz con leche', emoji: '🍚', calories: 130, protein: 3, carbs: 22, fat: 3, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/arroz_con_leche.jpg" },
      { name: 'Suspiro limeño', calories: 300, protein: 4, carbs: 45, fat: 12, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/suspiro_limeno.jpg" },
      { name: 'Anticuchos', calories: 210, protein: 20, carbs: 2, fat: 14, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/anticuchos.jpg" },
    ]
  },
  
  'MX': { // Mexico
    name: 'Mexico',
    breakfast: [
      { name: 'Huevos con tortillas', calories: 320, protein: 18, carbs: 28, fat: 16, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/huevos_con_tortillas.jpg" },
      { name: 'Chilaquiles', calories: 450, protein: 20, carbs: 40, fat: 22, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/chilaquiles.jpg" },
      { name: 'Tamales', calories: 280, protein: 10, carbs: 40, fat: 9, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/tamales.jpg" },
      { name: 'Conchas', calories: 310, protein: 6, carbs: 45, fat: 12, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/conchas.jpg" },
      { name: 'Café de olla', calories: 90, protein: 1, carbs: 18, fat: 1, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/cafe_de_olla.jpg" },
      { name: 'Huevos rancheros', calories: 158, protein: 10, carbs: 10, fat: 9, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/huevos_con_tortillas.jpg" },
      { name: 'Molletes', calories: 210, protein: 9, carbs: 26, fat: 8, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/molletes.jpg" },
    ],
    lunch: [
      { name: 'Tacos de carne asada', calories: 380, protein: 22, carbs: 35, fat: 18, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/tacos_de_carne_asada.jpg" },
      { name: 'Quesadillas', calories: 420, protein: 20, carbs: 40, fat: 20, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/quesadillas.jpg" },
      { name: 'Enchiladas', calories: 460, protein: 24, carbs: 45, fat: 22, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/enchiladas.jpg" },
      { name: 'Pozole', calories: 320, protein: 25, carbs: 35, fat: 10, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/pozole.jpg" },
      { name: 'Tostadas', calories: 170, protein: 6, carbs: 20, fat: 8, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/tostadas.jpg" },
      { name: 'Sopes', calories: 195, protein: 7, carbs: 22, fat: 9, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/sopes.jpg" },
      { name: 'Gorditas', calories: 210, protein: 8, carbs: 25, fat: 9, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/gorditas.jpg" },
      { name: 'Tortas', calories: 230, protein: 12, carbs: 28, fat: 8, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/tortas.jpg" },
    ],
    dinner: [
      { name: 'Chiles rellenos', calories: 150, protein: 7, carbs: 12, fat: 9, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/chiles_rellenos.jpg" },
      { name: 'Mole', calories: 180, protein: 10, carbs: 14, fat: 10, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/mole.jpg" },
      { name: 'Birria', calories: 220, protein: 18, carbs: 5, fat: 14, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/birria.jpg" },
      { name: 'Menudo', calories: 70, protein: 8, carbs: 4, fat: 3, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/menudo.jpg" },
      { name: 'Elotes', calories: 135, protein: 4, carbs: 20, fat: 5, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/elotes.jpg" },
      { name: 'Churros', calories: 390, protein: 5, carbs: 45, fat: 22, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/churros.jpg" },
    ]
  },
  
  'VE': { // Venezuela
    name: 'Venezuela',
    breakfast: [
      { name: 'Arepas', calories: 280, protein: 8, carbs: 42, fat: 10, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/arepas.jpg" },
      { name: 'Arepas con queso', calories: 380, protein: 16, carbs: 42, fat: 18, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/arepas.jpg" },
      { name: 'Cachapa', calories: 320, protein: 10, carbs: 50, fat: 10, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/cachapa.jpg" },
      { name: 'Pan de jamón', calories: 350, protein: 14, carbs: 40, fat: 16, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/pan_de_jamon.jpg" },
      { name: 'Café con leche', calories: 80, protein: 4, carbs: 10, fat: 3, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/cafe_con_leche.jpg" },
    ],
    lunch: [
      { name: 'Pabellón criollo', calories: 550, protein: 30, carbs: 60, fat: 20, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/pabellon_criollo.jpg" },
      { name: 'Hallacas', calories: 480, protein: 22, carbs: 50, fat: 22, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/hallacas.jpg" },
    ]
  },
  
  // USA
  'US': {
    name: 'United States',
    breakfast: [
      { name: 'Eggs and bacon', calories: 380, protein: 22, carbs: 2, fat: 32, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/eggs_and_bacon.jpg" },
      { name: 'Pancakes', calories: 420, protein: 10, carbs: 65, fat: 14, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/pancakes.jpg" },
      { name: 'Cereal with milk', calories: 280, protein: 8, carbs: 50, fat: 6, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/cereal_with_milk.jpg" },
      { name: 'Bagel with cream cheese', calories: 350, protein: 12, carbs: 48, fat: 14, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/bagel_with_cream_cheese.jpg" },
      { name: 'Coffee', calories: 5, protein: 0, carbs: 0, fat: 0, image_url: "" },
      { name: 'Waffles', calories: 291, protein: 8, carbs: 33, fat: 14, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/waffles.jpg" },
      { name: 'French toast', calories: 229, protein: 8, carbs: 26, fat: 10, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/french_toast.jpg" },
      { name: 'Oatmeal', calories: 68, protein: 2, carbs: 12, fat: 1, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/oatmeal.jpg" },
    ],
    lunch: [
      { name: 'Burger', calories: 540, protein: 28, carbs: 45, fat: 28, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/burger.jpg" },
      { name: 'Pizza slice', calories: 285, protein: 12, carbs: 36, fat: 10, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/pizza_slice.jpg" },
      { name: 'Sandwich', calories: 380, protein: 20, carbs: 42, fat: 16, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/sandwich.jpg" },
      { name: 'Salad', calories: 220, protein: 8, carbs: 18, fat: 14, image_url: "" },
      { name: 'Grilled cheese', calories: 320, protein: 13, carbs: 28, fat: 18, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/grilled_cheese.jpg" },
      { name: 'Mac and cheese', calories: 164, protein: 7, carbs: 18, fat: 7, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/mac_and_cheese.jpg" },
      { name: 'Hot dogs', calories: 290, protein: 10, carbs: 24, fat: 17, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/hot_dog.jpg" },
      { name: 'BLT sandwich', calories: 232, protein: 10, carbs: 22, fat: 12, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/blt_sandwich.jpg" },
      { name: 'Clam chowder', calories: 90, protein: 4, carbs: 10, fat: 4, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/clam_chowder.jpg" },
    ],
    dinner: [
      { name: 'Fried chicken', calories: 246, protein: 19, carbs: 10, fat: 15, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/fried_chicken.jpg" },
      { name: 'Mashed potatoes', calories: 100, protein: 2, carbs: 15, fat: 4, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/mashed_potatoes.jpg" },
      { name: 'BBQ ribs', calories: 250, protein: 20, carbs: 8, fat: 16, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/bbq_ribs.jpg" },
      { name: 'Apple pie', calories: 237, protein: 2, carbs: 34, fat: 11, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/apple_pie.jpg" },
    ]
  },

  // Belgium
  'BE': {
    name: 'Belgium',
    breakfast: [
      { name: 'Waffles', calories: 350, protein: 8, carbs: 52, fat: 13, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/belgian_waffles.jpg" },
      { name: 'Bread with butter', calories: 220, protein: 6, carbs: 30, fat: 9, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/baguette_with_butter.jpg" },
      { name: 'Croissant', calories: 310, protein: 6, carbs: 32, fat: 18, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/croissant.jpg" },
      { name: 'Coffee', calories: 5, protein: 0, carbs: 0, fat: 0, image_url: "" },
      { name: 'Pain au chocolat', calories: 340, protein: 7, carbs: 38, fat: 18, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/pain_au_chocolat.jpg" },
    ],
    lunch: [
      { name: 'Moules-frites', calories: 520, protein: 28, carbs: 45, fat: 22, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/moules_frites.jpg" },
      { name: 'Vol-au-vent', calories: 480, protein: 24, carbs: 35, fat: 26, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/vol_au_vent.jpg" },
      { name: 'Frites', calories: 365, protein: 4, carbs: 48, fat: 18, image_url: "" },
      { name: 'Stomp', calories: 280, protein: 6, carbs: 42, fat: 10, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/stomp.jpg" },
      { name: 'Croque monsieur', calories: 380, protein: 18, carbs: 30, fat: 22, image_url: "" },
    ],
    dinner: [
      { name: 'Carbonnade flamande', calories: 480, protein: 32, carbs: 20, fat: 28, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/carbonnade_flamande.jpg" },
      { name: 'Waterzooi', calories: 380, protein: 28, carbs: 18, fat: 18, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/waterzooi.jpg" },
      { name: 'Gentse waterzooi', calories: 350, protein: 30, carbs: 15, fat: 16, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/waterzooi.jpg" },
      { name: 'Belgian chocolate', calories: 170, protein: 2, carbs: 18, fat: 10, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/belgian_chocolate.jpg" },
      { name: 'Speculoos', calories: 150, protein: 2, carbs: 22, fat: 6, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/speculoos.jpg" },
    ]
  },

  'IT': { // Italy
    name: 'Italy',
    breakfast: [
      { name: 'Espresso', calories: 5, protein: 0, carbs: 1, fat: 0, image_url: "" },
      { name: 'Cappuccino', calories: 80, protein: 4, carbs: 8, fat: 4, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/cappuccino.jpg" },
      { name: 'Cornetto', calories: 280, protein: 6, carbs: 38, fat: 12, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/cornetto.jpg" },
      { name: 'Brioche', calories: 310, protein: 7, carbs: 40, fat: 14, image_url: "" },
      { name: 'Fette biscottate', calories: 180, protein: 5, carbs: 32, fat: 4, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/fette_biscottate.jpg" },
    ],
    lunch: [
      { name: 'Pasta carbonara', calories: 520, protein: 22, carbs: 58, fat: 24, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/pasta_carbonara.jpg" },
      { name: 'Cacio e pepe', calories: 480, protein: 18, carbs: 55, fat: 22, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/cacio_e_pepe.jpg" },
      { name: 'Pizza margherita', calories: 480, protein: 18, carbs: 58, fat: 18, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/pizza_margherita.jpg" },
      { name: 'Risotto', calories: 380, protein: 10, carbs: 58, fat: 12, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/risotto.jpg" },
      { name: 'Arancini', calories: 280, protein: 10, carbs: 38, fat: 10, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/arancini.jpg" },
      { name: 'Supplì', calories: 260, protein: 9, carbs: 35, fat: 9, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/supli.jpg" },
      { name: 'Bistecca alla Fiorentina', calories: 420, protein: 45, carbs: 0, fat: 26, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/bistecca_fiorentina.jpg" },
    ],
    dinner: [
      { name: 'Ribollita', calories: 280, protein: 12, carbs: 38, fat: 8, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/ribollita.jpg" },
      { name: 'Saltimbocca', calories: 320, protein: 28, carbs: 4, fat: 20, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/saltimbocca.jpg" },
      { name: 'Tiramisu', calories: 380, protein: 8, carbs: 38, fat: 22, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/tiramisu.jpg" },
      { name: 'Panna cotta', calories: 280, protein: 4, carbs: 28, fat: 18, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/panna_cotta.jpg" },
      { name: 'Gelato', calories: 200, protein: 4, carbs: 30, fat: 8, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/gelato.jpg" },
    ]
  },

  'BR': { // Brazil
    name: 'Brazil',
    breakfast: [
      { name: 'Pão de queijo', calories: 280, protein: 8, carbs: 35, fat: 12, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/pao_de_queijo.jpg" },
      { name: 'Tapioca', calories: 180, protein: 4, carbs: 38, fat: 2, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/tapioca.jpg" },
      { name: 'Café com leite', calories: 80, protein: 4, carbs: 10, fat: 3, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/cafe_con_leche.jpg" },
      { name: 'Açaí bowl', calories: 320, protein: 6, carbs: 52, fat: 10, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/acai_bowl.jpg" },
      { name: 'Pão francês', calories: 150, protein: 5, carbs: 28, fat: 2, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/pao_frances.jpg" },
    ],
    lunch: [
      { name: 'Feijoada', calories: 580, protein: 32, carbs: 52, fat: 24, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/feijoada.jpg" },
      { name: 'Arroz e feijão', calories: 380, protein: 14, carbs: 68, fat: 6, image_url: "" },
      { name: 'Frango grelhado', calories: 220, protein: 36, carbs: 0, fat: 8, image_url: "" },
      { name: 'Moqueca', calories: 420, protein: 28, carbs: 18, fat: 26, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/moqueca.jpg" },
      { name: 'Coxinha', calories: 320, protein: 14, carbs: 32, fat: 16, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/coxinha.jpg" },
      { name: 'Pastel', calories: 290, protein: 10, carbs: 30, fat: 15, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/pastel.jpg" },
    ],
    dinner: [
      { name: 'Churrasco', calories: 420, protein: 40, carbs: 0, fat: 28, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/churrasco.jpg" },
      { name: 'Picanha', calories: 380, protein: 36, carbs: 0, fat: 26, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/asado.jpg" },
      { name: 'Brigadeiro', calories: 80, protein: 1, carbs: 12, fat: 3, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/brigadeiro.jpg" },
      { name: 'Pudim', calories: 280, protein: 6, carbs: 38, fat: 12, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/pudim.jpg" },
      { name: 'Quindim', calories: 220, protein: 4, carbs: 30, fat: 10, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/quindim.jpg" },
    ]
  },

  'AR': { // Argentina
    name: 'Argentina',
    breakfast: [
      { name: 'Medialunas', calories: 280, protein: 6, carbs: 38, fat: 12, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/medialunas.jpg" },
      { name: 'Tostadas con dulce de leche', calories: 280, protein: 6, carbs: 42, fat: 8, image_url: "" },
      { name: 'Mate', calories: 5, protein: 0, carbs: 1, fat: 0, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/mate.jpg" },
      { name: 'Café con leche', calories: 80, protein: 4, carbs: 10, fat: 3, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/cafe_con_leche.jpg" },
      { name: 'Facturas', calories: 310, protein: 7, carbs: 40, fat: 14, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/facturas.jpg" },
    ],
    lunch: [
      { name: 'Empanadas', calories: 320, protein: 14, carbs: 30, fat: 16, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/empanadas.jpg" },
      { name: 'Milanesa', calories: 420, protein: 30, carbs: 22, fat: 22, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/milanesa.jpg" },
      { name: 'Locro', calories: 480, protein: 24, carbs: 48, fat: 18, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/locro.jpg" },
      { name: 'Pizza argentina', calories: 500, protein: 20, carbs: 55, fat: 22, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/pizza_slice.jpg" },
      { name: 'Choripán', calories: 480, protein: 22, carbs: 38, fat: 26, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/chorispan.jpg" },
    ],
    dinner: [
      { name: 'Asado', calories: 450, protein: 42, carbs: 0, fat: 30, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/asado.jpg" },
      { name: 'Chimichurri steak', calories: 420, protein: 38, carbs: 2, fat: 28, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/asado.jpg" },
      { name: 'Alfajores', calories: 220, protein: 4, carbs: 30, fat: 10, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/alfajores.jpg" },
      { name: 'Dulce de leche crepes', calories: 320, protein: 8, carbs: 42, fat: 14, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/dulce_de_leche_crepes.jpg" },
      { name: 'Flan', calories: 180, protein: 6, carbs: 24, fat: 7, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/flan.jpg" },
    ]
  },

  'CA': { // Canada
    name: 'Canada',
    breakfast: [
      { name: 'Pancakes with maple syrup', calories: 480, protein: 10, carbs: 72, fat: 16, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/pancakes.jpg" },
      { name: 'Bagel with cream cheese', calories: 350, protein: 12, carbs: 48, fat: 14, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/bagel_with_cream_cheese.jpg" },
      { name: 'Oatmeal', calories: 150, protein: 5, carbs: 27, fat: 3, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/oatmeal.jpg" },
      { name: 'Coffee', calories: 5, protein: 0, carbs: 0, fat: 0, image_url: "" },
      { name: 'Tim Hortons muffin', calories: 380, protein: 6, carbs: 52, fat: 16, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/tim_hortons_muffin.jpg" },
    ],
    lunch: [
      { name: 'Poutine', calories: 740, protein: 22, carbs: 88, fat: 36, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/poutine.jpg" },
      { name: 'BLT sandwich', calories: 320, protein: 14, carbs: 30, fat: 16, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/blt_sandwich.jpg" },
      { name: 'Tourtière', calories: 480, protein: 22, carbs: 35, fat: 28, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/tourtiere.jpg" },
      { name: 'Caesar salad', calories: 280, protein: 10, carbs: 14, fat: 22, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/caesar_salad.jpg" },
      { name: 'Fish and chips', calories: 520, protein: 24, carbs: 52, fat: 24, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/fish_and_chips.jpg" },
    ],
    dinner: [
      { name: 'Butter tarts', calories: 280, protein: 3, carbs: 38, fat: 14, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/butter_tarts.jpg" },
      { name: 'Nanaimo bars', calories: 320, protein: 4, carbs: 36, fat: 18, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/nanaimo_bars.jpg" },
      { name: 'Beaver tails', calories: 380, protein: 6, carbs: 58, fat: 14, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/beaver_tails.jpg" },
      { name: 'Montreal smoked meat', calories: 380, protein: 28, carbs: 28, fat: 18, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/montreal_smoked_meat.jpg" },
      { name: 'Maple salmon', calories: 320, protein: 32, carbs: 8, fat: 18, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/maple_salmon.jpg" },
    ]
  },

  'FR': { // France
    name: 'France',
    breakfast: [
      { name: 'Croissant', calories: 310, protein: 6, carbs: 32, fat: 18, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/croissant.jpg" },
      { name: 'Baguette with butter', calories: 280, protein: 8, carbs: 38, fat: 12, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/baguette_with_butter.jpg" },
      { name: 'Pain au chocolat', calories: 340, protein: 7, carbs: 38, fat: 18, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/pain_au_chocolat.jpg" },
      { name: 'Café au lait', calories: 60, protein: 3, carbs: 6, fat: 3, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/cafe_con_leche.jpg" },
      { name: 'Tartine with jam', calories: 220, protein: 5, carbs: 38, fat: 5, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/tartine_with_jam.jpg" },
    ],
    lunch: [
      { name: 'Steak tartare', calories: 320, protein: 28, carbs: 4, fat: 20, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/steak_tartare.jpg" },
      { name: 'Bouillabaisse', calories: 280, protein: 24, carbs: 12, fat: 14, image_url: "" },
      { name: 'Duck confit', calories: 480, protein: 32, carbs: 2, fat: 38, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/duck_confit.jpg" },
      { name: 'Croque monsieur', calories: 380, protein: 18, carbs: 30, fat: 22, image_url: "" },
      { name: 'Quiche Lorraine', calories: 420, protein: 16, carbs: 28, fat: 28, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/quiche_lorraine.jpg" },
      { name: 'Salade niçoise', calories: 320, protein: 22, carbs: 14, fat: 20, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/salade_nicoise.jpg" },
    ],
    dinner: [
      { name: 'Boeuf bourguignon', calories: 480, protein: 35, carbs: 18, fat: 28, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/boeuf_bourguignon.jpg" },
      { name: 'Ratatouille', calories: 180, protein: 4, carbs: 22, fat: 8, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/ratatouille.jpg" },
      { name: 'Crème brûlée', calories: 320, protein: 6, carbs: 30, fat: 20, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/creme_brulee.jpg" },
      { name: 'Tarte tatin', calories: 380, protein: 4, carbs: 52, fat: 18, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/tarte_tatin.jpg" },
      { name: 'Mousse au chocolat', calories: 280, protein: 6, carbs: 24, fat: 18, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/mousse_au_chocolat.jpg" },
    ]
  },

  'ES': { // Spain
    name: 'Spain',
    breakfast: [
      { name: 'Tostada con tomate', calories: 180, protein: 5, carbs: 28, fat: 6, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/tostada_con_tomate.jpg" },
      { name: 'Churros con chocolate', calories: 420, protein: 8, carbs: 52, fat: 20, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/churros.jpg" },
      { name: 'Café con leche', calories: 80, protein: 4, carbs: 10, fat: 3, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/cafe_con_leche.jpg" },
      { name: 'Croissant', calories: 310, protein: 6, carbs: 32, fat: 18, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/croissant.jpg" },
      { name: 'Magdalenas', calories: 220, protein: 4, carbs: 28, fat: 11, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/magdalenas.jpg" },
    ],
    lunch: [
      { name: 'Paella', calories: 520, protein: 28, carbs: 62, fat: 16, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/paella.jpg" },
      { name: 'Tortilla española', calories: 280, protein: 14, carbs: 18, fat: 16, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/tortilla_espanola.jpg" },
      { name: 'Patatas bravas', calories: 280, protein: 4, carbs: 38, fat: 12, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/patatas_bravas.jpg" },
      { name: 'Gambas al ajillo', calories: 220, protein: 20, carbs: 2, fat: 14, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/gambas_al_ajillo.jpg" },
      { name: 'Cocido madrileño', calories: 520, protein: 30, carbs: 45, fat: 22, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/cocido_madrileno.jpg" },
      { name: 'Jamón ibérico', calories: 180, protein: 22, carbs: 0, fat: 10, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/jamon_iberico.jpg" },
    ],
    dinner: [
      { name: 'Gazpacho', calories: 80, protein: 2, carbs: 12, fat: 3, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/gazpacho.jpg" },
      { name: 'Croquetas', calories: 280, protein: 10, carbs: 28, fat: 14, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/croquetas.jpg" },
      { name: 'Pisto', calories: 160, protein: 4, carbs: 18, fat: 8, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/pisto.jpg" },
      { name: 'Crema catalana', calories: 280, protein: 6, carbs: 32, fat: 14, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/crema_catalana.jpg" },
      { name: 'Churros', calories: 390, protein: 5, carbs: 45, fat: 22, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/churros.jpg" },
    ]
  },

  // Add more countries as needed...

};

// Fallback for countries not in database
export const DEFAULT_FOODS = {
  breakfast: [
    { name: 'Eggs', emoji: '🥚', calories: 155, protein: 13, carbs: 1, fat: 11 },
    { name: 'Bread', emoji: '🍞', calories: 265, protein: 9, carbs: 49, fat: 3 },
    { name: 'Milk', emoji: '🥛', calories: 150, protein: 8, carbs: 12, fat: 8 },
    { name: 'Coffee', emoji: '☕', calories: 5, protein: 0, carbs: 0, fat: 0 },
    { name: 'Banana', emoji: '🍌', calories: 105, protein: 1, carbs: 27, fat: 0 },
  ],
  lunch: [
    { name: 'Rice', emoji: '🍚', calories: 206, protein: 4, carbs: 45, fat: 0 },
    { name: 'Chicken breast', emoji: '🍗', calories: 165, protein: 31, carbs: 0, fat: 4 },
    { name: 'Salad', emoji: '🥗', calories: 150, protein: 5, carbs: 12, fat: 10 },
  ],
  dinner: [
    { name: 'Pasta', emoji: '🍝', calories: 220, protein: 8, carbs: 43, fat: 1 },
    { name: 'Fish', emoji: '🐟', calories: 206, protein: 22, carbs: 0, fat: 12 },
    { name: 'Vegetables', emoji: '🥦', calories: 55, protein: 4, carbs: 11, fat: 0 },
  ]
};

// Get user's country code from location
export async function getUserCountry() {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    
    if (status !== 'granted') {
      console.log('❌ Location permission denied');
      return null;
    }

    const location = await Location.getCurrentPositionAsync({});
    const [geocode] = await Location.reverseGeocodeAsync({
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    });

    console.log('📍 User location:', geocode.country, geocode.isoCountryCode);
    return geocode.isoCountryCode; // Returns 'PE', 'MX', 'US', etc.
    
  } catch (error) {
    console.error('Error getting location:', error);
    return null;
  }
}

// Get suggestions for current meal time
export function getSuggestionsForMealTime(countryCode) {
  const hour = new Date().getHours();
  
  let mealType;
  if (hour >= 5 && hour < 11) mealType = 'breakfast';
  else if (hour >= 11 && hour < 16) mealType = 'lunch';
  else mealType = 'dinner';

  const countryFoods = LOCAL_FOODS[countryCode];
  
  if (countryFoods && countryFoods[mealType]) {
    return {
      mealType,
      suggestions: countryFoods[mealType],
      country: countryFoods.name
    };
  }

  // Fallback to default
  return {
    mealType,
    suggestions: DEFAULT_FOODS[mealType],
    country: 'Your Area'
  };
}