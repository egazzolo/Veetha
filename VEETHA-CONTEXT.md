# VEETHA - Complete Project Context & Memory

**Last Updated:** February 25, 2026
**Status:** Near production-ready, fixing final bugs
**Platform:** React Native (Expo SDK 54)

---

## APP OVERVIEW

**Name:** Veetha
**Purpose:** Nutrition tracking app with barcode scanning, AI photo recognition, manual entry, and comprehensive analytics
**Target Users:** Health-conscious individuals tracking macros and calories

**Core Features:**
1. Barcode scanning (OpenFoodFacts API - unlimited)
2. AI photo recognition (Google Cloud Vision - 950/month)
3. Manual food entry
4. Daily calorie/macro tracking
5. Exercise logging with calorie burn
6. Water intake tracking
7. Weekly/monthly stats with charts
8. Streak tracking (days logged)
9. Multi-language support (EN, ES, FR, TL)
10. Dark mode
11. Interactive tutorials
12. Dietary restriction warnings
13. Guest mode (anonymous auth + recovery codes)

---

## TECH STACK

### **Frontend:**
- React Native 0.81.5
- Expo SDK 54
- React Navigation 7 (Native Stack - single root)
- React Native Gesture Handler 2.28.0
- Expo Camera 17.0.9
- Victory Charts (stats visualization)

### **Backend:**
- Supabase (Auth + PostgreSQL)
- AsyncStorage (local caching)
- expo-secure-store (auth token persistence)

### **APIs:**
- OpenFoodFacts (barcode scanning - unlimited)
- Google Cloud Vision (AI photo recognition - 950/month)
- USDA FoodData Central (nutrition lookup - unlimited)

### **Key Libraries:**
- `@react-native-async-storage/async-storage` - Caching + tutorial flags
- `react-native-svg` - Charts & circular progress
- `expo-image-picker` - Photo uploads
- `expo-crypto` - Recovery code generation (SHA256 + UUID)
- `react-native-safe-area-context` - Safe areas
- `@react-native-community/datetimepicker` - Date selection (with locale prop)

### **Removed Libraries:**
- `expo-dev-client` - Removed for embedded JS bundle builds (was showing dev launcher instead of app)

---

## PROJECT STRUCTURE
```
veetha/
├── index.js                    # Entry point
├── calo.js                     # Root navigator + auth routing
├── app.config.js               # Expo config
├── package.json                # Dependencies
│
├── screens/
│   ├── onboarding/
│   │   ├── LandingScreen.js       # Guest sign-in + recovery codes
│   │   ├── LoginScreen.js
│   │   ├── SignUpScreen.js
│   │   ├── OnboardingStep1.js     # Gender + DOB (with locale-aware DateTimePicker)
│   │   ├── OnboardingStep1b.js    # Why tracking works (motivation)
│   │   ├── OnboardingStep2.js     # Height + Weight
│   │   ├── OnboardingStep3.js     # Goal (lose/maintain/gain)
│   │   ├── OnboardingStep4.js     # Activity level
│   │   ├── OnboardingStep5.js     # Dietary restrictions
│   │   ├── OnboardingStep6.js     # Medical disclaimer
│   │   ├── OnboardingStep7.js     # Referral source
│   │   └── OnboardingComplete.js  # Email verification + save profile + tutorial_loading flag
│   │
│   ├── HomeScreen.js              # Main dashboard (calories, macros, meals, tutorial freeze overlay)
│   ├── ScannerScreen.js           # Barcode + AI photo scanning
│   ├── ResultScreen.js            # Food result with swipe gestures
│   ├── ManualEntryScreen.js       # Manual food entry form
│   ├── EditMealScreen.js          # Edit logged meals
│   ├── StatsScreen.js             # Weekly/monthly charts + reports
│   ├── ProfileScreen.js           # User profile + settings
│   ├── EditProfileScreen.js       # Edit user details
│   ├── GoalsPreferencesScreen.js  # Calorie/macro goals
│   ├── DietaryRestrictionsScreen.js
│   ├── DisplaySettingsScreen.js   # Layout preferences (bars vs cards)
│   ├── WeeklyReportScreen.js      # Weekly nutrition summary
│   ├── ExportReportScreen.js      # Export data to Excel/PDF
│   └── ExerciseFlow/
│       ├── ExerciseCategoryScreen.js
│       ├── ExerciseActivityScreen.js
│       ├── ExerciseIntensityScreen.js
│       └── ExerciseLogModal.js
│
├── components/
│   ├── BottomNav.js               # Bottom navigation bar
│   ├── BarsLayout.js              # Progress bars layout
│   ├── CardsLayout.js             # Cards layout (default)
│   ├── MealsList.js               # Meals list component
│   ├── AppTutorial.js             # Tutorial system
│   ├── TutorialArrow.js           # Animated arrow pointer
│   ├── GreetingBanner.js          # Welcome greeting
│   ├── CalorieWarningBanner.js    # Overeating warning
│   ├── AllergenWarningModal.js    # Dietary restriction alerts
│   ├── ExerciseButton.js          # Exercise logging button
│   ├── MonthlyCalendar.js         # Calendar heatmap
│   ├── LanguageSwitcher.js        # Language picker component
│   └── AnimatedThemeWrapper.js    # Theme transition animations
│
└── utils/
    ├── supabase.js                # Supabase client (SecureStoreAdapter)
    ├── UserContext.js             # User state + caching
    ├── OnboardingContext.js       # Onboarding data
    ├── ThemeContext.js            # Dark/light mode
    ├── LanguageContext.js         # i18n (EN, ES, FR, TL) — returns { language, setLanguage, t, loading }
    ├── TutorialContext.js         # Tutorial progress
    ├── GreetingContext.js         # Welcome messages
    ├── LayoutContext.js           # Layout preference
    ├── useSwipeNavigation.js      # Swipe gesture navigation
    ├── analytics.js               # Event logging
    ├── foodDatabase.js            # USDA + local food search
    ├── visionApi.js               # AI photo recognition (Google Cloud Vision)
    └── translations/
        ├── en.js                  # English (default)
        ├── es.js                  # Spanish
        ├── fr.js                  # French
        └── tl.js                  # Tagalog
```

---

## DATABASE SCHEMA (Supabase PostgreSQL)

### **Tables:**

#### **1. profiles**
User profile data. Auto-created via database trigger when user signs up.
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT,
  full_name TEXT,
  display_name TEXT,
  gender TEXT,  -- 'male' or 'female'
  age INT,
  height_ft INT,  -- Imperial
  height_in INT,  -- Imperial
  height_cm INT,  -- Metric
  weight_lbs NUMERIC,  -- Imperial
  weight_kg NUMERIC,   -- Metric
  unit_preference TEXT DEFAULT 'imperial',  -- 'imperial' or 'metric'
  goal TEXT,  -- 'lose', 'maintain', 'gain'
  target_weight_lbs NUMERIC,
  target_weight_kg NUMERIC,
  activity_level TEXT,  -- 'sedentary', 'lightly_active', etc.

  -- Nutrition goals
  daily_calorie_goal NUMERIC,
  daily_protein_goal NUMERIC DEFAULT 150,
  daily_carbs_goal NUMERIC DEFAULT 200,
  daily_fat_goal NUMERIC DEFAULT 65,
  daily_water_goal_cups INT DEFAULT 8,
  water_unit_preference TEXT DEFAULT 'cups',

  -- Dietary preferences
  dietary_restrictions TEXT[],  -- ['vegetarian', 'gluten_free', etc.]
  allergies TEXT[],  -- ['peanuts', 'dairy', etc.]
  diet_type TEXT,  -- 'vegan', 'vegetarian', 'pescatarian', 'none'
  dietary_preferences TEXT[],  -- ['gluten_free', 'lactose_free', etc.]

  -- Tutorial progress
  tutorial_completed BOOL DEFAULT FALSE,
  home_tutorial_completed BOOL DEFAULT FALSE,
  scanner_tutorial_completed BOOL DEFAULT FALSE,
  profile_tutorial_completed BOOL DEFAULT FALSE,
  photo_tips_count INT DEFAULT 0,  -- How many times photo tips shown (max 5)

  -- Premium
  ispremium BOOL DEFAULT FALSE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

#### **2. food_database**
Master food catalog. All nutrition stored per 100g/100ml.
```sql
CREATE TABLE food_database (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  name_normalized TEXT,  -- Lowercase for searching
  barcode TEXT UNIQUE,  -- EAN-13, UPC-A, etc.

  -- Nutrition (per 100g or 100ml)
  calories NUMERIC NOT NULL,
  protein NUMERIC DEFAULT 0,
  carbs NUMERIC DEFAULT 0,
  fat NUMERIC DEFAULT 0,
  fiber NUMERIC DEFAULT 0,
  sugar NUMERIC DEFAULT 0,
  sodium NUMERIC DEFAULT 0,

  -- Metadata
  serving_unit TEXT DEFAULT 'g',  -- 'g', 'ml', 'L'
  image_url TEXT,
  source TEXT,  -- 'openfoodfacts', 'usda', 'manual_entry', 'photo_recognition'
  detected_by_ai BOOL DEFAULT FALSE,
  ai_confidence INT,  -- 0-100
  usda_fdc_id TEXT,  -- USDA FoodData Central ID

  -- Usage tracking
  times_used INT DEFAULT 0,
  added_by_user_id UUID REFERENCES auth.users(id),
  verified_by_users INT DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_food_barcode ON food_database(barcode);
CREATE INDEX idx_food_name_normalized ON food_database(name_normalized);
```

---

#### **3. meals**
User's logged meals. References food_database via foreign key.
```sql
CREATE TABLE meals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  product_id UUID REFERENCES food_database(id) NOT NULL,

  -- Serving info
  serving_grams NUMERIC NOT NULL,
  serving_unit TEXT DEFAULT 'g',

  -- Optional metadata
  barcode TEXT,
  meal_type TEXT,  -- 'breakfast', 'lunch', 'dinner', 'snack' (nullable)
  image_url TEXT,

  -- Timestamps
  logged_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_meals_user_date ON meals(user_id, logged_at);
CREATE INDEX idx_meals_product ON meals(product_id);

-- NO calories, protein, carbs, fat columns in meals table!
-- Calculated from food_database via JOIN:
-- SELECT meals.*, food_database.calories, food_database.protein
-- FROM meals JOIN food_database ON meals.product_id = food_database.id
```

---

#### **4. api_tracking**
Logs all external API calls (Google Vision, OpenFoodFacts, USDA).
```sql
CREATE TABLE api_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),  -- Nullable for anonymous
  service TEXT NOT NULL,  -- 'google_vision', 'openfoodfacts', 'usda'
  type TEXT NOT NULL,  -- 'food_recognition', 'barcode_scan', 'nutrition_lookup'
  success BOOL NOT NULL,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_api_user_date ON api_tracking(user_id, created_at);
CREATE INDEX idx_api_service ON api_tracking(service, created_at);
```

**CRITICAL:** Only use `api_tracking` table. Delete `api_calls` and `api_calls_monthly` if they exist (causes duplicate counting).

---

#### **5. water_logs**
Daily water intake tracking.
```sql
CREATE TABLE water_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  date DATE NOT NULL,
  cups INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

CREATE INDEX idx_water_user_date ON water_logs(user_id, date);
```

---

#### **6. exercises**
Exercise logging with calorie burn tracking.
```sql
CREATE TABLE exercises (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  category TEXT NOT NULL,
  activity TEXT NOT NULL,
  intensity TEXT,
  duration_minutes INT NOT NULL,
  calories_burned NUMERIC NOT NULL,
  logged_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_exercises_user_date ON exercises(user_id, logged_at);
```

---

#### **7. recovery_codes**
Recovery codes for anonymous/guest users, generated via expo-crypto.
```sql
CREATE TABLE recovery_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  code_hash TEXT NOT NULL,  -- SHA256 hash of the recovery code
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## KEY ARCHITECTURAL DECISIONS

### **1. Data Normalization Strategy**

**WHY:** Avoid storing duplicate nutrition data.

**IMPLEMENTATION:**
- `food_database` = Master catalog (nutrition per 100g)
- `meals` = User logs (just product_id + serving_grams)
- Calculation: `(food.calories * meal.serving_grams) / 100`

**EXAMPLE:**
```javascript
const { data: meals } = await supabase
  .from('meals')
  .select(`
    *,
    product:food_database (
      name, calories, protein, carbs, fat
    )
  `)
  .eq('user_id', user.id);

const totalCalories = meals.reduce((sum, meal) => {
  return sum + ((meal.product.calories * meal.serving_grams) / 100);
}, 0);
```

---

### **2. Navigation Architecture**

**RULE:** Single Native Stack Navigator (NO tabs, NO nested navigators)

**STRUCTURE:**
```
AppNavigator (Native Stack)
├── Landing
├── Login
├── SignUp
├── OnboardingStep1-7
├── OnboardingComplete
├── Home
├── Scanner
├── Result
├── ManualEntry
├── Stats
├── Profile
└── ... (all screens in one flat stack)
```

**NAVIGATION RULES:**
- Never nest navigators
- Never use tabs (use BottomNav component instead)
- All screens in one Stack.Navigator
- Use `navigation.navigate()` for forward
- Use `navigation.goBack()` for back
- Use `navigation.reset()` for auth state changes

---

### **3. Context Provider Layering**

**ORDER MATTERS!** Providers wrap AppNavigator in THIS exact order:
```javascript
<SafeAreaProvider>
  <LanguageProvider>
    <TutorialProvider>
      <GreetingProvider>
        <ThemeProvider>
          <LayoutProvider>
            <UserProvider>
              <OnboardingProvider>
                <AppNavigator />
              </OnboardingProvider>
            </UserProvider>
          </LayoutProvider>
        </ThemeProvider>
      </GreetingProvider>
    </TutorialProvider>
  </LanguageProvider>
</SafeAreaProvider>
```

---

### **4. Caching Strategy (UserContext)**

**PROBLEM:** Supabase queries are slow (~500ms)

**SOLUTION:** Two-phase loading
1. Load cached data from AsyncStorage (instant)
2. Fetch fresh data from Supabase (background)

```javascript
useEffect(() => {
  loadCachedData();  // Phase 1: instant
  loadUserData();    // Phase 2: background
}, []);
```

---

### **5. Tutorial Freeze System**

**FLOW:** OnboardingComplete → Home (frozen) → Tutorial starts → Home (unfrozen)

**LIFECYCLE:**
1. OnboardingComplete sets `AsyncStorage.setItem('tutorial_loading', 'true')` before `navigation.reset` to Home
2. HomeScreen mounts with `checkingTutorial = true` (starts frozen)
3. Mount useEffect reads `tutorial_loading` flag — keeps frozen if `'true'`
4. When `refsReady` fires: `AsyncStorage.removeItem('tutorial_loading')` → `startTutorial('Home')` → `setCheckingTutorial(false)`
5. Failsafe 6s timeout unfreezes if something goes wrong

**FLAGS:**
- `tutorial_loading` (AsyncStorage) — Set before navigation, read on mount, removed when tutorial starts
- `checkingTutorial` (React state) — Controls freeze overlay + scroll blocking

**FREEZE OVERLAY (last child of SafeAreaView):**
```javascript
{checkingTutorial && (
  <View style={{
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center', alignItems: 'center',
    zIndex: 9999, elevation: 9999,
  }} pointerEvents="auto">
    <Text>{t('tutorial.preparing')}</Text>
  </View>
)}
```

**CRITICAL RULES:**
- `startTutorial()` MUST be called BEFORE `setCheckingTutorial(false)` (race condition fix)
- Overlay MUST be last child of SafeAreaView to sit on top of BottomNav
- `scrollEnabled={!checkingTutorial}` blocks ScrollView interaction
- `pointerEvents="auto"` on overlay blocks all touch-through

**DATABASE FLAGS:**
- `home_tutorial_completed` → Shows scanner arrow
- `scanner_tutorial_completed` → Shows profile arrow
- `profile_tutorial_completed` → Sets master `tutorial_completed` flag

**KNOWN ISSUE:** Lines 926, 942, 997, 1009 in HomeScreen.js call `setCheckingTutorial(false)` without removing `tutorial_loading` from AsyncStorage, risking stale flag persistence (6s freeze on next launch).

---

### **6. Guest Mode (Anonymous Auth)**

**FLOW:**
1. User taps "Continue as Guest" on LandingScreen
2. `signInAnonymously()` creates anonymous Supabase user
3. Recovery codes generated via `Crypto.randomUUID()` + SHA256 hash
4. Codes stored in `recovery_codes` table
5. User shown recovery code to save
6. Navigation: `navigation.replace('OnboardingStep1')` (NOT Home)
7. Full onboarding flow, then Home

**CRITICAL:** LandingScreen routes to OnboardingStep1 after signInAnonymously. Previously routed to Home, skipping onboarding entirely.

---

### **7. API Rate Limiting**

| Service | Free Tier | App Limit | Check |
|---------|-----------|-----------|-------|
| Google Cloud Vision | 1,000/mo | 950/mo | Monthly |
| OpenFoodFacts | Unlimited | None | None |
| USDA | Unlimited | None | None |

**CRITICAL:** Only use `api_tracking` table. Delete `api_calls` and `api_calls_monthly` to prevent triple-counting.

---

## CORE USER FLOWS

### **1. Signup → Onboarding → First Use**
```
1. User opens app → LandingScreen
2. Option A: "SIGN UP" → SignUpScreen → email/password → verify email
   Option B: "Continue as Guest" → signInAnonymously → recovery codes shown
3. → OnboardingStep1 (Gender + DOB, with locale-aware DateTimePicker)
   - Requests camera permission
4. OnboardingStep1b (Motivation facts)
5. OnboardingStep2 (Height + Weight)
6. OnboardingStep3 (Goal + Target weight)
7. OnboardingStep4 (Activity level)
8. OnboardingStep5 (Dietary restrictions - optional)
9. OnboardingStep6 (Medical disclaimer - must agree)
10. OnboardingStep7 (Referral source - optional)
11. OnboardingComplete:
    - Calculates daily_calorie_goal
    - Saves profile to database
    - Sets AsyncStorage tutorial_loading = 'true'
    - navigation.reset to Home
12. HomeScreen loads FROZEN:
    - checkingTutorial = true
    - Overlay blocks interaction ("Preparing tutorial...")
    - Reads tutorial_loading flag from AsyncStorage
13. When refs ready:
    - Removes tutorial_loading flag
    - Starts Home tutorial
    - Unfreezes screen
14. Tutorial guides through: Calories → Macros → Meals → Scanner
15. Scanner tutorial → Stats exploration → Profile tutorial
16. After Profile tutorial → ALL tutorials complete
```

---

### **2. Logging Food (3 Methods)**

#### **Method A: Barcode Scan**
```
1. Home → Tap scanner icon
2. ScannerScreen loads in barcode mode
3. Point camera at barcode → OpenFoodFacts API
4. If found → ResultScreen
5. Adjust serving size (default 100g)
6. Swipe right OR tap "Log Meal"
7. Check/insert into food_database → Insert into meals
8. Navigate to Home, meal appears in list
```

#### **Method B: AI Photo**
```
1. Home → Tap scanner → Toggle to photo mode
2. Photo tips show (first 5 times)
3. Check monthly limit (900/mo)
4. Capture food photo → Google Cloud Vision API
5. If confidence < 60% → "Low confidence, retake?"
6. If >= 60% → Search nutrition (USDA/local)
7. ResultScreen with photo, macro badges
8. Swipe right → Save / Swipe left → Delete
```

#### **Method C: Manual Entry**
```
1. Home → "+ Add Meal" → ManualEntryScreen
2. Enter meal name + serving size
3. Option A: "Find Nutrition Info" (USDA search)
4. Option B: Enter calories/macros manually
5. Insert into food_database → Insert into meals
```

---

### **3. Viewing Stats**
```
1. Home → Stats icon → StatsScreen (3 tabs)
2. Week: Bar chart (Mon-Sun), avg macros
3. Month: Calendar heatmap (MonthlyCalendar component), streak
4. Exercise: Logged exercises, total burn
5. Reports: Weekly Report, Export to Excel
```

---

## ONBOARDING VISUAL DESIGN

### **Color Scheme:**
- Background: `#EAE0C8` (warm cream)
- Input/card borders (unselected): `#6B5B45` (dark brown, high contrast)
- Selected borders: `#4CAF50` (green)
- Selected backgrounds: `#e8f5e9` (light green)
- Continue button: `#4CAF50`
- Back button border: `#6B5B45`

### **DateTimePicker (OnboardingStep1):**
```javascript
const LOCALE_MAP = { en: 'en-US', es: 'es-ES', fr: 'fr-FR', tl: 'fil-PH' };

// Date display text:
dateOfBirth.toLocaleDateString(LOCALE_MAP[language] || 'en-US')

// Native picker:
<DateTimePicker
  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
  locale={LOCALE_MAP[language] || 'en-US'}
/>
```

**NOTE:** On Android, DateTimePicker always uses device locale (OS limitation). `locale` prop only works on iOS.

---

## AUTHENTICATION FLOW

**States:**
1. **No session** → Landing screen
2. **Session + no daily_calorie_goal** → OnboardingStep1
3. **Session + has daily_calorie_goal** → Home

**Auth Check (calo.js):**
```javascript
const { data: { session } } = await supabase.auth.getSession();

if (!session) {
  setInitialRoute('Landing');
} else {
  const { data: profile } = await supabase
    .from('profiles')
    .select('daily_calorie_goal')
    .eq('id', session.user.id)
    .single();

  if (profile?.daily_calorie_goal) {
    setInitialRoute('Home');
  } else {
    setInitialRoute('OnboardingStep1');
  }
}
```

**Auth Persistence:** `expo-secure-store` via SecureStoreAdapter in `utils/supabase.js`.

---

## THEME SYSTEM

**Modes:** Light (default) + Dark

```javascript
{
  background: '#fff',      // or '#121212'
  cardBackground: '#fff',  // or '#1E1E1E'
  text: '#000',           // or '#fff'
  textSecondary: '#666',  // or '#999'
  textTertiary: '#999',   // or '#666'
  primary: '#4CAF50',
  border: '#e0e0e0',      // or '#2C2C2C'
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#ff3b30',
}
```

```javascript
const { theme, isDark, toggleTheme } = useTheme();
```

---

## INTERNATIONALIZATION

**Languages:** English (default), Spanish, French, Tagalog

**LanguageContext returns:**
```javascript
const { language, setLanguage, t, loading } = useLanguage();
// language = 'en' | 'es' | 'fr' | 'tl'
```

**Translation Keys:**
- `common.*` - Shared words (save, cancel, delete, etc.)
- `home.*` - HomeScreen
- `scanner.*` - ScannerScreen
- `results.*` - ResultScreen
- `stats.*` - StatsScreen (includes `stats.weekdays` array for calendar)
- `profile.*` - ProfileScreen
- `onboarding.*` - All onboarding steps
- `tutorial.*` - Tutorial messages (including `tutorial.preparing`)

**Date Localization:**
```javascript
const LOCALE_MAP = { en: 'en-US', es: 'es-ES', fr: 'fr-FR', tl: 'fil-PH' };
date.toLocaleDateString(LOCALE_MAP[language] || 'en-US');
```

**KNOWN ISSUE:** HomeScreen `getDateLabel()` hardcodes `'en-US'` locale. MonthlyCalendar uses `undefined` (device locale). Neither uses app language for date formatting — only OnboardingStep1 currently does it correctly via LOCALE_MAP.

---

## BUILD & DEPLOYMENT

### **Building Offline APK (Windows):**
```
1. npx expo prebuild --clean  (from /app)
2. cd android
3. .\gradlew installRelease   (bundles JS automatically)
```

**CRITICAL NOTES:**
- `expo-dev-client` has been REMOVED — it intercepts and shows dev launcher instead of the app
- Debug builds (`installDebug`) do NOT embed JS bundle by default in RN 0.81
- `bundleInDebug` is NOT a valid ReactExtension property in RN 0.81
- Release builds always bundle JS — use `installRelease` for testing
- Release builds strip `console.log` — no log access without adb logcat on debug
- Windows file locks: run `.\gradlew --stop` then `.\gradlew clean` if "Unable to delete file" errors

### **Before Launch:**
1. Remove all console.log() statements
2. Test on both iOS and Android
3. Verify Supabase RLS policies
4. Set up Supabase database backups
5. Configure Expo App Store metadata
6. Add app privacy policy
7. Test email verification flow end-to-end
8. Verify Google Cloud Vision API key is production key
9. Set up crash reporting (Sentry)
10. Test on real devices
11. Verify all translations are complete

---

## TESTING CHECKLIST

### **Critical Flows:**
- [ ] Signup → Email verification → Onboarding → Home
- [ ] Guest signup → Recovery codes → Onboarding → Home
- [ ] Tutorial freeze overlay appears after onboarding
- [ ] Tutorial starts and unfreezes screen correctly
- [ ] Barcode scan → Result → Log meal → Appears on Home
- [ ] Photo scan → Result → Log meal → Appears on Home
- [ ] Manual entry → Log meal → Appears on Home
- [ ] Edit meal → Changes reflected
- [ ] Delete meal → Removed from list
- [ ] Exercise log → Calories adjust on Home
- [ ] Water intake → Updates daily progress
- [ ] Stats charts → Show correct data
- [ ] Dark mode → All screens styled correctly
- [ ] Language change → All text translates
- [ ] DOB picker → Shows locale-appropriate date format
- [ ] Onboarding border colors → #6B5B45 on #EAE0C8 background
- [ ] Tutorial → Completes all 4 screens
- [ ] Logout → Returns to Landing
- [ ] Login → Goes to Home (if onboarding complete)

### **Edge Cases:**
- [ ] No internet → Graceful error handling
- [ ] Barcode not found → Shows "Submit Product" option
- [ ] AI low confidence → Shows warning + retry option
- [ ] Photo limit reached → Shows monthly reset date
- [ ] Empty meals list → Shows helpful empty state
- [ ] No profile data → Loads defaults
- [ ] Stale tutorial_loading flag → 6s failsafe timeout unfreezes

---

## BUG TRACKER

### **High Priority:**
1. ~~Clarifai limit exhausted (triple counting)~~ → **RESOLVED** (switched to Google Cloud Vision)
2. Stale `tutorial_loading` flag → **IDENTIFIED** — Lines 926, 942, 997, 1009 in HomeScreen.js call `setCheckingTutorial(false)` without `AsyncStorage.removeItem('tutorial_loading')`

### **Medium Priority:**
1. HomeScreen `getDateLabel()` hardcodes `'en-US'` locale → Not using app language
2. MonthlyCalendar month header uses `undefined` locale → Uses device locale, not app language
3. "Wrong food?" search doesn't always find results
4. Image upload sometimes times out (>10s)
5. Streak calculation off by 1 day sometimes

### **Low Priority:**
1. Dark mode toggle animation glitchy
2. Translation keys missing for some edge cases
3. Stats charts don't handle >10k calories well

### **Fixed:**
1. ~~ManualEntryScreen saving to wrong table~~ → FIXED
2. ~~Tutorial freezing screen~~ → FIXED (freeze overlay + tutorial_loading lifecycle)
3. ~~Greeting showing every time~~ → FIXED (5hr cooldown)
4. ~~Onboarding skipped for guest users~~ → FIXED (LandingScreen routes to OnboardingStep1)
5. ~~DOB not localized~~ → FIXED (LOCALE_MAP + DateTimePicker locale prop)
6. ~~Onboarding border colors invisible on #EAE0C8~~ → FIXED (#ddd → #6B5B45)

---

## TIPS FOR AI ASSISTANT (CLAUDE)

**When helping with this project:**
1. Always reference this document first
2. Assume database schema is as documented (don't guess)
3. Check for existing utility functions before creating new ones
4. Respect the single-stack navigation architecture
5. Don't add new Context providers without careful consideration
6. Test suggestions against the known issues list
7. Consider mobile performance (avoid heavy computations)
8. Follow the existing code style and naming conventions
9. Remember: Nutrition in food_database is per 100g (not per serving!)
10. Always use JOIN queries for meals (never store nutrition in meals table)
11. `useLanguage()` returns `{ language, setLanguage, t, loading }` — `language` is `'en'`/`'es'`/`'fr'`/`'tl'`
12. Use LOCALE_MAP for date formatting: `{ en: 'en-US', es: 'es-ES', fr: 'fr-FR', tl: 'fil-PH' }`
13. Tutorial freeze: `startTutorial()` MUST be called BEFORE `setCheckingTutorial(false)`
14. Onboarding background is `#EAE0C8`, input borders are `#6B5B45`
15. expo-dev-client is REMOVED — use `gradlew installRelease` for offline builds

---

## NEXT STEPS (Post-Launch)

**Phase 2 Features:**
1. Meal templates (save common meals)
2. Recipe builder (multi-ingredient meals)
3. Barcode scanner for recipe ingredients
4. Social features (share meals with friends)
5. AI meal suggestions based on history
6. Integration with fitness trackers (Apple Health, Google Fit)
7. Premium tier (unlimited photo scans, advanced analytics)
8. Food diary export (PDF weekly reports)
9. Nutritionist chat support
10. Meal planning calendar

**Known Improvements:**
- Fix HomeScreen date locale (use LOCALE_MAP instead of hardcoded 'en-US')
- Fix MonthlyCalendar month header locale
- Fix stale tutorial_loading flag (add removeItem to all setCheckingTutorial(false) paths)
- Add undo/redo for deleted meals
- Batch meal logging
- Voice input for manual entry
- Meal photo gallery
- Progress photos tracker
- Body weight trending
- Macro pie charts
- Custom macro ratios
- Intermittent fasting timer
- Restaurant meal database

---

**END OF DOCUMENTATION**
