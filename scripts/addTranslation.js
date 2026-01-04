const fs = require('fs');

const languages = {
  en: './utils/en.json',
  es: './utils/es.json',
  fr: './utils/fr.json',
  fil: './utils/fil.json',
};

const newTranslations = {
  en: { someFeature: { title: 'Title', save: 'Save' } },
  es: { someFeature: { title: 'Título', save: 'Guardar' } },
  fr: { someFeature: { title: 'Titre', save: 'Enregistrer' } },
  fil: { someFeature: { title: 'Pamagat', save: 'I-save' } },
};

// Merge into existing files
Object.keys(languages).forEach(lang => {
  const filePath = languages[lang];
  const existing = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const updated = { ...existing, ...newTranslations[lang] };
  fs.writeFileSync(filePath, JSON.stringify(updated, null, 2));
  console.log(`✅ Updated ${lang}`);
});
```

**Run:** `node scripts/addTranslation.js`

---

## Option 3: Use Spreadsheet → JSON (For 100+ Languages)

**1. Create Google Sheet:**
```
| Key              | English    | Spanish   | French      | Filipino  |
|------------------|------------|-----------|-------------|-----------|
| feature.title    | Title      | Título    | Titre       | Pamagat   |
| feature.save     | Save       | Guardar   | Enregistrer | I-save    |