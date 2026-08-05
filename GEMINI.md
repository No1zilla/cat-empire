# 🐱👑 Империя Котиков — Инструкции и Память Проекта

## 🔑 Git & SSH Доступ
- **SSH Ключ для Git:** `~/.ssh/id_rsa_gith`
- **Команда деплоя/пуша в GitHub (Vercel):**
  ```bash
  GIT_SSH_COMMAND="ssh -i ~/.ssh/id_rsa_gith" git push origin main
  ```
- **Репозиторий:** `git@github.com:No1zilla/cat-empire.git` (ветка `main`)

---

## 🚀 Процесс деплоя фронтенда (VK Mini App)
1. Сборка для VK: `npm run build:vk`
2. Фиксация изменений: `git add . && git commit -m "..."`
3. Пуш в репозиторий: `GIT_SSH_COMMAND="ssh -i ~/.ssh/id_rsa_gith" git push origin main`
4. **Vercel** автоматически подхватывает коммит из `main` и обновляет продакшн.

---

## 📲 VK Mini App Данные
- **APP_ID:** `54692477`
- **Ссылка в VK:** [vk.com/app54692477](https://vk.com/app54692477)
- **Правило 2.3.8 (Синхронизация):** Реализована трехсторонняя синхронизация (LocalStorage + VK Cloud Storage `VKWebAppStorageGet/Set` + PostgreSQL бэкенд на Railway).

---

## 📱 Сборка Android APK
- Сборка: `npm run build:android`
- Подготовка пакета Gradle: `GRADLE_USER_HOME=./.gradle JAVA_HOME=/opt/homebrew/opt/openjdk@21 ./gradlew assembleDebug` (в папке `android/`)
- Готовый файл APK: `/Users/ai/Desktop/CatEmpire.apk`
