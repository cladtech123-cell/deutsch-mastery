# Deutsch Mastery'ni Oracle Cloud Always Free serverga joylashtirish

Natija: sayt doimiy ishlaydigan bepul serverda turadi va istalgan qurilmadan HTTPS orqali ochiladi.
Kompyuteringiz yoniq turishi shart emas.

**Nima kerak:** Oracle Cloud hisobi (ro'yxatdan o'tishda bank kartasi tekshiriladi; bepul resurslar uchun pul
yechilmaydi), 30–60 daqiqa vaqt. Doimiy manzil uchun (ixtiyoriy) — Cloudflare hisobi va o'z domeningiz.

**Server:** Ampere A1 (ARM), 2 yadro, 12 GB RAM — Always Free limiti (2026-yildan 2 OCPU / 12 GB).
Loyihaning barcha qismlari ARM'da ishlaydi (tekshirilgan: piper-tts, onnxruntime, asyncpg, argon2 uchun ARM paketlari bor).

**Xavfsizlik:** serverda faqat SSH (22-port) ochiq bo'ladi. Sayt 80/443 portlarni ochmasdan, Cloudflare tunnel orqali
chiqadi; ilova portlari faqat `127.0.0.1` da. Parollar avtomatik va tasodifiy yaratiladi.

---

## 1-qadam. Oracle Cloud hisobini ochish

1. https://signup.cloud.oracle.com — ro'yxatdan o'ting.
2. **Home Region** ni diqqat bilan tanlang — keyin o'zgartirib bo'lmaydi. Yaqin va ARM serverlari ko'p bo'lgan hudud
   tanlang (masalan, Germany Central (Frankfurt) yoki boshqa Yevropa hududi).
3. Karta tekshiruvidan o'ting. Hisob tayyor bo'lishi bir necha daqiqa olishi mumkin.

## 2-qadam. Server (instance) yaratish

Oracle konsoli: **☰ → Compute → Instances → Create instance**.

| Maydon | Qiymat |
|---|---|
| Name | `deutsch-mastery` |
| Image | **Canonical Ubuntu 24.04** (Change image → Ubuntu) |
| Shape | Change shape → **Ampere** → `VM.Standard.A1.Flex`, **2 OCPU, 12 GB** |
| Networking | standart VCN, **Assign a public IPv4 address** — yoqilgan |
| SSH keys | **Generate a key pair for me** → **Save private key** (faylni yo'qotmang!) |
| Boot volume | standart (≈47–50 GB) yetadi |

**Create** ni bosing. Holat **Running** bo'lgach, **Public IP address** ni yozib oling.

> "Out of capacity" xatosi chiqsa: boshqa **Availability Domain** ni tanlang yoki bir necha soatdan keyin qayta
> urinib ko'ring — bepul ARM serverlar ba'zi hududlarda tez tugaydi.

## 3-qadam. Serverga ulanish

Windows (PowerShell):

```powershell
ssh -i C:\Users\SIZ\Downloads\ssh-key-XXXX.key ubuntu@SERVER_IP
```

Birinchi ulanishda `yes` deb javob bering. "Permissions too open" xatosi chiqsa (Windows):

```powershell
icacls C:\Users\SIZ\Downloads\ssh-key-XXXX.key /inheritance:r /grant:r "$($env:USERNAME):R"
```

## 4-qadam. O'rnatish (bitta buyruq)

Serverda:

```bash
sudo apt-get update && sudo apt-get install -y git
git clone https://github.com/cladtech123-cell/deutsch-mastery.git
bash deutsch-mastery/deploy/oracle/setup.sh
```

Skript nima qiladi:
1. Docker'ni rasmiy repozitoriydan o'rnatadi.
2. `.env` ni yaratadi: tasodifiy DB paroli va JWT kaliti, `ENV=production` (cookie faqat HTTPS orqali),
   `FRONTEND_BIND=127.0.0.1`, demo akkaunt yo'q.
3. Ilovani quradi va ishga tushiradi (birinchi marta 5–15 daqiqa: nemischa ovoz modeli ham yuklanadi).
4. Oxirida ochiq manzilni chiqaradi:

```
Tayyor! Sayt manzili: https://xxxx-xxxx-xxxx.trycloudflare.com
```

Shu havolani telefon yoki istalgan kompyuterda oching va ro'yxatdan o'ting.

> Bu **vaqtinchalik manzil**: tunnel konteyneri qayta ishga tushsa (server qayta yoqilsa ham) o'zgaradi.
> Yangi manzilni ko'rish: `cd ~/deutsch-mastery && docker compose logs tunnel | grep trycloudflare`.
> Doimiy manzil uchun 6-qadamga qarang.

## 5-qadam. Yangilash

GitHub'ga yangi kod yuklagandan keyin serverda:

```bash
bash ~/deutsch-mastery/deploy/oracle/setup.sh
```

Kod yangilanadi va qayta quriladi; `.env` va baza o'zgarmaydi.

## 6-qadam (ixtiyoriy). Doimiy manzil — o'z domeningiz bilan

1. https://dash.cloudflare.com — bepul hisob oching va domeningizni Cloudflare'ga ulang (NS yozuvlarini almashtirish).
2. **Zero Trust → Networks → Tunnels → Create a tunnel → Cloudflared** → nom bering → **token** ni nusxalang.
3. **Public Hostname** qo'shing: masalan `deutsch.sizningdomen.uz`, Service: `HTTP`, URL: `frontend:80`.
4. Serverda token bilan ishga tushiring (token buyruqlar tarixida qolmasligi uchun `.env` ga yozish ma'qul):

```bash
cd ~/deutsch-mastery
nano .env        # CLOUDFLARE_TUNNEL_TOKEN=... qatoriga tokenni qo'ying, saqlang (Ctrl+O, Enter, Ctrl+X)
TUNNEL=named bash deploy/oracle/setup.sh
docker compose stop tunnel   # vaqtinchalik tunnel endi kerak emas
```

Sayt `https://deutsch.sizningdomen.uz` da ochiladi va manzil o'zgarmaydi.

### 6b. Serverda nginx bor bo'lsa — subdomen (masalan `deutsch.lavo.uz`)

Server boshqa saytga (masalan `lavo.uz`) xizmat qilayotgan bo'lsa, Cloudflare kerak emas: mavjud nginx'ga
**bitta yangi fayl** qo'shiladi, boshqa saytlarning sozlamalariga tegilmaydi. HTTPS — bepul Let's Encrypt.

1. Domen DNS panelida **A yozuv**: nomi `deutsch`, qiymati — server IP. Cloudflare DNS bo'lsa, "DNS only" (kulrang bulut).
   Tekshirish: `nslookup deutsch.lavo.uz` server IP'ni ko'rsatishi kerak.
2. Ilovani tunnelsiz ishga tushiring (port band bo'lsa, avval `.env` da `FRONTEND_HOST_PORT`, `BACKEND_HOST_PORT`,
   `POSTGRES_HOST_PORT` ni bo'sh portlarga o'zgartiring):

```bash
cd ~/deutsch-mastery && git pull
TUNNEL=none bash deploy/oracle/setup.sh
docker compose stop tunnel
```

3. Subdomen va sertifikat:

```bash
sudo DOMAIN=deutsch.lavo.uz EMAIL=siz@example.com bash deploy/oracle/nginx-subdomain.sh
```

Skript `nginx -t` o'tmasa o'zgarishni qaytaradi; domen boshqa faylda band bo'lsa to'xtaydi. Sertifikat certbot
tomonidan avtomatik yangilanadi.

## 7-qadam. Zaxira nusxa (backup)

Bir martalik:

```bash
bash ~/deutsch-mastery/deploy/oracle/backup.sh
```

Har kuni avtomatik (03:30 da, oxirgi 14 nusxa saqlanadi):

```bash
mkdir -p ~/backups
(crontab -l 2>/dev/null; echo '30 3 * * * bash $HOME/deutsch-mastery/deploy/oracle/backup.sh >> $HOME/backups/backup.log 2>&1') | crontab -
```

Nusxalar `~/backups` da. Kompyuteringizga ko'chirib olish (PowerShell):

```powershell
scp -i C:\...\ssh-key-XXXX.key "ubuntu@SERVER_IP:~/backups/*.sql.gz" .
```

Tiklash (joriy ma'lumot almashtiriladi!):

```bash
cd ~/deutsch-mastery
set -a; . ./.env; set +a
gunzip -c ~/backups/FAYL.sql.gz | docker compose exec -T db psql -q -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"
```

## Muammolar

| Belgisi | Yechim |
|---|---|
| `permission denied ... docker.sock` | Serverdan chiqib qayta ulaning (docker guruhi yangi sessiyada kuchga kiradi) yoki `sudo docker ...` |
| Sayt ochilmaydi | `cd ~/deutsch-mastery && docker compose ps` — hammasi `Up`/`healthy` bo'lishi kerak; `docker compose logs backend --tail 50` |
| Tunnel manzili chiqmadi | `docker compose logs tunnel` — internet/DNS muammosi bo'lishi mumkin; `docker compose restart tunnel` |
| Disk to'ldi | `docker system df`; eski image'lar: `docker image prune` (konteyner va bazaga tegmaydi) |
| Server qayta yoqildi | Konteynerlar o'zi qayta ishga tushadi (`restart: unless-stopped`); vaqtinchalik tunnel manzili o'zgaradi |

Foydali buyruqlar (`~/deutsch-mastery` ichida): `docker compose ps`, `docker compose logs -f backend`,
`docker compose restart`, `docker compose --profile tunnel up -d`.

> **Litsenziya eslatmasi:** server ovozi uchun ishlatiladigan `piper-tts` GPL-3.0 litsenziyali. Uni serverda
> ishlatish cheklanmaydi; Docker image'ni boshqalarga tarqatsangiz GPL shartlari amal qiladi.
