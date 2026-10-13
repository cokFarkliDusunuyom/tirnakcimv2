# Tırnakçı

Ankara'daki tırnak stüdyolarını keşfetmek ve gerçek müsaitliklerden randevu talep etmek için Next.js, Tailwind CSS ve Firebase/Cloud Firestore uygulaması.

## Başlatma

```bash
npm install
npm run dev
```

Firebase web yapılandırması `.env.local` dosyasındadır. Bu dosya git'e eklenmemelidir. Diğer ortamlar için `.env.example` dosyasını kopyalayıp Firebase değerlerini girin.

## Firestore koleksiyonları

Firestore boş koleksiyonları saklamaz; her koleksiyon ilk gerçek doküman eklendiğinde görünür. Uygulama aktif salon, hizmet, uzman, salon hizmeti ve müsaitlik kayıtlarını canlı dinler. Sahte salon, puan, fiyat, müsait saat ve randevu kaydı kullanılmaz.

| Koleksiyon | Amaç | Önemli alanlar |
| --- | --- | --- |
| `services` | Genel hizmet kataloğu | `name`, `slug`, `isActive` |
| `salons` | Onaylı/aktif işletmeler | `name`, `city`, `district`, `coverImageUrl`, `isActive`, `ownerUid` |
| `stylists` | Salon çalışanları | `salonId`, `name`, `isActive`, `photoUrl` |
| `salonServices` | Salona özel hizmet ve fiyat | `salonId`, `serviceId`, `priceFrom`, `isActive` |
| `availability` | Çalışanların boş saatleri | `salonId`, `stylistId`, `serviceId`, `startsAt`, `endsAt`, `status` |
| `appointments` | Müşteri randevu talepleri | `salonId`, `stylistId`, `serviceId`, `availabilityId`, müşteri iletişimi, saat, `status` |
| `salonApplications` | Salon katılım başvuruları | salon ve iletişim bilgileri, `status`, `createdAt` |
| `users` | İleride müşteri/işletme hesap profilleri | `role`, `salonId`, `createdAt` |

Saat alanları Firestore `Timestamp` olmalı. `availability.status` için `available`; salon/hizmet/uzman ve salon hizmeti belgeleri için `isActive: true` kullanın. Randevu ve başvurular `pending` durumuyla kaydedilir.

## Rules

`firestore.rules` uygulamanın ihtiyacı olan erişimleri sınırlar: aktif katalog verileri okunabilir, yeni salon başvurusu ve randevu talebi eklenebilir; kişisel veriler ve kayıtlar istemciden okunamaz veya değiştirilemez. Bu kurallar `tirnakcim-cc029` projesine yayınlandı. Yeniden yayınlamak için:

```bash
npx firebase-tools deploy --only firestore:rules --project tirnakcim-cc029
```

Firebase Console'da Cloud Firestore `nam5` bölgesinde etkin. Salon, çalışan ve müsaitlik koleksiyonları gerçek işletme verileri geldikçe oluşacak; boş koleksiyonlar için yapay kayıt eklenmez.
