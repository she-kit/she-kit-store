# She-Kit Store - GitHub + Netlify Setup

## שלב 1: הוריד את הקבצים
כל הקבצים שלך כאן מוכנים.

## שלב 2: צור GitHub Repository
1. היכנס ל [github.com](https://github.com)
2. לחץ **New Repository**
3. שם: `she-kit-store`
4. לחץ **Create repository**

## שלב 3: העלה את הקבצים ל-GitHub

**אם יש לך Git ב-Mac:**

```bash
cd /path/to/she-kit-github
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/she-kit-store.git
git push -u origin main
```

**החלף את `YOUR_USERNAME` בשם המשתמש שלך.**

---

## שלב 4: חבר ל-Netlify

1. היכנס ל [netlify.com](https://netlify.com) עם החשבון שלך
2. לחץ **New site from Git**
3. בחר **GitHub**
4. בחר `she-kit-store` repository
5. לחץ **Deploy**

## שלב 5: הוסף תמונות

בתיקיית `kits/` הוסף את התמונות שלך בעותר זה:

```
kits/
  BUNDESLIGA (Germany) - 5 Teams/
    Bayer 04 Leverkusen/
      Bayer 04 Leverkusen Home/
        Bayer 04 Leverkusen Home.jpg
```

## שלב 6: עדכן את האתר

```bash
git add .
git commit -m "Add kit images"
git push
```

**Netlify יעדכן בעצמו באופן אוטומטי!**

---

## צריך עזרה?

כל פעם שתוסיף או תשנה תמונות:
1. שים את הקבצים בתיקיית `kits/`
2. `git add .`
3. `git commit -m "Update images"`
4. `git push`
5. חכה 2 דקות ואתר שלך יעדכן!
