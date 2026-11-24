# Proje durum ve gereksinim denetimi — 15 Kasım 2026

## Sonuç

Yerelde M1–M7'nin önemli işlevleri ve M8'in mock akışı mevcut. Bu, projenin teslim edilmiş veya final kapsamının tamamlanmış olduğu anlamına gelmiyor. İki temel açık var: M3'ün zorunlu haftalık takvim görünümü arayüzde bulunmuyor; güncel geliştirmelerin önemli bölümü commit edilmediği için GitHub main ve CI bu uygulamayı temsil etmiyor. M8'in gerçek AI sağlayıcısı da henüz yok.

Bu çalışma bir incelemedir; uygulama davranışını değiştirmez, PR birleştirmez ve Jira durumlarını güncellemez.

## E2E ne demek?

E2E, “end-to-end”, yani uçtan uca testtir. Gerçek tarayıcıda kullanıcı gibi giriş yapar, butonlara basar; frontend, API ve veritabanının birlikte doğru sonuç üretmesini kontrol eder.

Bizim örnek: uzman giriş yapar → görev atar → çıkış yapar → çocuk giriş yapıp görevi tamamlar → görevi yeniden yapılmadıya çeker → tekrar tamamlar → uzman giriş yaptığında tamamlandı durumunu görür. Bir fonksiyonun tek başına doğru çalışması bu zincirin çalıştığını kanıtlamaz; E2E bu bağlantıyı sınar.

Bizde Playwright kullanılıyor. Testler 5174/3100 portlarında ayrı uygulama ve geçici SQLite veritabanı açıyor; normal geliştirme verilerini kullanmıyor. Bir testin geçmesi yalnızca yazılmış senaryonun geçtiğini gösterir, bütün olası hataların bulunmadığını göstermez.

## İnceleme kaynakları ve kapsam

- Öğretmenin `Term Project Assignment.docx` belgesi.
- `Göktuğ – Sprint 2 Görevleri (M3, M4, E2E).docx` görev paylaşımı.
- Yerel README, SRS, SDD, PMP, toplantı notları, backend, frontend, testler ve GitHub Actions yapılandırması.
- Git fetch sonrası origin/main; GitHub açık PR listesi ve son beş Actions çalışması.
- Yeniden çalıştırılmış backend coverage, frontend test/build ve Playwright testleri.

Jira canlı durumu, WebOnline teslimleri, özel ders duyuruları ve başka yerde tutulan raporlar doğrulanmadı. Bunların yapılmadığı sonucunu çıkarmıyorum. Remote PMP-3, yeni ders duyurularıyla takvim ve ayrı test ekibi şartının değiştiğini söylüyor; duyurunun kendisi görülmediğinden bu değişiklik bağımsız doğrulanmış değil. Aşağıdaki aşama karşılaştırması özgün ödev metnine dayanıyor; güncel resmi duyuru varsa o esas alınmalı.

## Özellikler: şu an ne var, nasıl çalışıyor?

| Modül | Mevcut davranış | Değerlendirme |
|---|---|---|
| M1 — Giriş ve roller | E-posta/parola ile giriş; bcrypt parola özeti, JWT oturumu. Rol hesaptan geliyor; normal kullanıcı rol seçemiyor. Yanlış rolün sayfasına gidince kendi paneline yönlendiriliyor. API de yetki kontrol ediyor. | Temel kapsam mevcut. |
| M2 — Uzman bağlantısı | Ebeveyn kendi çocuğuna kayıtlı uzmanı e-postasıyla bağlayıp onayla kaldırabiliyor. Uzman yalnızca bağlı çocuklarını listeliyor. Bağlantı her istekte DB'den kontrol edildiğinden eski JWT ile erişim de hemen kesiliyor. | Temel kapsam mevcut. |
| M3 — Takvim | Ebeveyn/bağlı uzman başlık, başlangıç ve isteğe bağlı bitiş saatiyle etkinlik oluşturuyor. Aylık yaprak takvimde gün kutularında etkinlikler görünüyor; gün seçimi ayrıntıları filtreliyor. Çocuk kendi takvimini görebiliyor. API hafta sorgusunu da destekliyor. | **Seçilen haftaya ait haftalık görünüm UI'da eksik.** Aylık görünüm bunu tek başına karşılamıyor. |
| M4 — Görevler | Ebeveyn/uzman başlık, açıklama, gelişim alanı ve son tarihle görev atıyor. Görevler takvimin altında listeleniyor. Çocuk kendi görevini done/open yapabiliyor; undo tamamlanma zamanını temizliyor. Atayan uzman kendi görevlerinin durumunu izleyebiliyor. | Temel kapsam ve undo ek özelliği mevcut. |
| M5 — Değerlendirmeler | Uzman çocuk, ISO yıl ve hafta seçerek not yazıyor. Aynı uzman/çocuk/hafta için tek kayıt var. Yalnızca yazar kendi notunu düzenliyor; düzenlendi etiketi oluşuyor. Ebeveyn ve bağlı uzmanlar hafta seçerek okuyabiliyor; çocuk erişemiyor. | Yerelde mevcut; sonraki teslim kapsamı da öne alınmış. |
| M6 — Belgeler | Ebeveyn ve bağlı uzman PDF/PNG/JPEG yükleyip listeleyebiliyor, görüntüleyip indirebiliyor. Liste ad, tür, yükleyen ve tarih bilgisi içeriyor. Tek dosya sınırı 5 MB; MIME ve dosya imzası kontrol ediliyor. Çocuk engelleniyor. | Temel kapsam mevcut. Dosya bazlı ayrı izin sistemi yok; özgün belgede bonus. |
| M7 — İstatistikler | Seçilen haftada son tarihi gelen görevler üzerinden tamamlanan/toplam yüzdesi hesaplanıyor. Gelişim alanlarına göre de gösteriliyor. Görev yoksa oran 0. Ebeveyn ve uzman kendi izinli çocuğu için erişiyor. | İşlev mevcut; final E2E doğrulaması güçlendirilmeli. |
| M8 — AI özeti | Çocuk/hafta için görev, değerlendirme ve etkinlik kaynakları toplanıyor. Ebeveyn/uzman için ayrı prompt tanımları var. Özet, rol, hafta ve kaynak anlık görüntüleri DB'de saklanıyor. AI-generated/mock etiketi, kaynak ayrıntısı ve yararlı/hatalı geri bildirimi mevcut. | **Mock mevcut; gerçek sağlayıcı bağlantısı eksik.** |

### İstediğin ek özellikler

- **Çocuk ekleme:** ebeveyn ad/soyad giriyor; sahiplik oturumdaki ebeveynden alınıyor. Yeni çocuk listede seçilebiliyor. Bu işlem çocuk için giriş hesabı oluşturmuyor; yeni profilin çocuk rolüyle oturum açabilmesi için ayrıca hesap bağlanması gerekir. Çocuk silme ekranı/API'si yok; özgün ödevde zorunlu değil.
- **Admin:** `admin@admin.com` / `admin` demo hesabı; sistem/DB durumu, kullanıcı listesi ve roller arasında test geçişi var. Rol testi backend'de demo rolün gerçek izinlerini kullanıyor; sıradan hesaplar bu başlıkla rol değiştiremiyor. Admin paneli kapsamlı bir sunucu/CI yönetim aracı değil. Özgün zorunlu rollerin dışında kullanıcı talebiyle eklenmiş.
- **Arayüz:** görevler ve takvim birleşik; mobil düzen var. Ortak üst bölümdeki yıl/hafta kutuları kaldırılmış. Değerlendirme, istatistik ve özet filtreleri kendi bölümlerinde duruyor.

### Belgeler nerede tutuluyor?

Yeni dosyanın içeriği SQLite `documents.file_data` alanında BLOB olarak saklanıyor. Dosya adı, türü, boyutu, yükleyeni ve çocuğu da DB kaydı. Dosyalar herkese açık static URL ile sunulmuyor; görüntüleme/indirme API'si önce oturum ve çocuk erişimi kontrol ediyor. Ebeveyn ve o anda bağlı uzmanlar çocuğun belgelerini görebiliyor; çocuğun erişimi yok. Admin için de ayrı yetkili erişim mevcut.

Eski disk dosyalarını DB'ye taşıyan yardımcı kod var; DB'deki kopyayı doğruladıktan sonra eski dosyayı kaldırıyor. Dosya imzası kontrolü tam PDF çözümlemesi veya antivirüs taraması değildir.

### AI bugün tam olarak ne yapıyor?

Şu anda bir dış AI API'sine istek atılmıyor. `server/src/ai.js` yalnızca `AI_MODE=mock` destekliyor; başka modda 503 dönüyor. Örneğin “Bu hafta 4 görevin 2 tanesi tamamlandı, 1 uzman değerlendirmesi ve 2 etkinlik kaydedildi” biçiminde deterministik şablon metni üretiyor. Notların anlamını modelle yorumlamıyor; PDF okumuyor/OCR yapmıyor.

Ebeveyn ve uzman için ayrı prompt sabitleri mevcut, fakat mock bunları gerçek bir modele göndermiyor; çıktı giriş başlığı role göre farklılaşıyor. Bu yüzden “AI bütün gelişim kayıtlarını analiz ediyor” diye sunulmamalı. Kaynak anlık görüntüleri, izin denetimi, saklama ve geri bildirim ise gerçek backend işlemleri.

Özgün öğretmen belgesindeki sonraki M8 kapsamı Gemini veya GitHub Models gibi gerçek sağlayıcının tek backend modülünden bağlanmasını da istiyor. Mock, otomatik test/CI için ayrıca gerekli. Gerçek bağlantı sonradan eklendiğinde de mock test modu korunmalı; model yalnızca izin verilen kayıtlarla özet üretmeli, teşhis/tedavi/karar üretmemeli.

## Öğretmen kapsamına göre açıklar

### Teslimi etkileyen somut açıklar

1. **GitHub'daki proje güncel yerel uygulama değil.** İncelenen dal `codex/admin-operations`; çok sayıda değiştirilmiş ve untracked dosya var. origin/main `9468c38` hâlâ walking skeleton düzeyinde. Yerelde çalışan işlevler main'e teslim edilmiş sayılmaz. Değişikliklerin görevlerle eşleştirilip gözden geçirilebilir commit/PR'lara aktarılması ve birleştirilecek dallarla uyumlandırılması gerekiyor.
2. **Selin'in #9, #10, #11, #12, #13 PR'ları açık.** Login API/UI, uzman bağlantı API/UI ve PMP-3 işleri henüz main'e birleşmemiş. Güncel yerel geliştirmelerle birlikte ele alınmalı; doğrudan üzerine körlemesine merge yapılmamalı.
3. **M3 haftalık takvim arayüzü yok.** SRS FR-M3-02 de açıkça seçilen haftanın haftalık görünümünü istiyor. Aylık takvime yerel “Ay/Hafta” seçeneği eklemek, kaldırdığımız genel üst hafta kutularını geri getirmeden ihtiyacı karşılayabilir. Backend'in haftalık sorgusu zaten var.
4. **Yeni E2E/coverage CI akışı yalnızca yerelde.** GitHub'daki son beş kontrol başarılı, fakat Selin'in eski dallarına ait. Bu sonuçlar yeni görev/takvim/belge/mock kodunu doğrulamıyor. Yeni PR üzerinde güncel workflow'un çalışıp başarılı olması gerekiyor.
5. **Sürüm etiketi/teslim kanıtı:** incelemede yalnızca `v0.0` etiketi var. M1–M4 ve ilk E2E/CI hedefi tamamlandıktan sonra ekip planına göre `v0.1` teslimi oluşturulmalı. Görev paylaşımında bu etiketi Selin'in oluşturacağı yazıyor.

### Dokümantasyon ve süreç

- Yerel PMP'de PMP-3 bölümü doldurulmamış. Remote `G4-36-pmp-3` dalında dolu sürüm var, ancak “login/M2 başlamadı” gibi mevcut geliştirmelerle uyuşmayan durumlar içeriyor. Birleşme sonrası gerçek durum ve Jira kanıtlarıyla güncellenmeli.
- SRS/SDD üst bilgileri hâlâ “First version Week 6 / Final Week 10”. Özgün öğretmen belgesinde SRS/SDD finali 6. hafta. Güncel resmi duyuru ve şablonla sürüm/tarih bilgileri uzlaştırılmalı; sadece işaret kutusunu değiştirmek içerik incelemesinin yerine geçmez.
- Repodaki toplantı notlarında 5. ve 6. hafta görülüyor; 7. haftanın notunu burada bulamadım. Toplantı yapılıp başka yerde tutulduysa repoya eklenmeli.
- Jira görev durumları, görev anahtarlı ayrı PR'lar, reviewer onayları, WebOnline teslimleri ve akran değerlendirmeleri ayrıca kontrol edilmeli. İnceleme bunların tamamlandığını doğrulamıyor.

### Sonraki sürümler/final için kalanlar

- **v0.2:** gerçek AI sağlayıcısı; M5–M8'in kabul ölçütlerinin ekipçe gözden geçirilmesi. Özgün belge bu aşamada en az %40 branch coverage ve üç kritik E2E akışı istiyor. Yerel coverage ve üç akış sayısal olarak karşılanıyor; uzak CI ve sürüm teslimi henüz kanıtlanmış değil.
- **v1.0:** her M1–M8 için anlamlı E2E doğrulaması ve en az %60 branch coverage. Yedi test içinde birçok modül yer alıyor; test sayısının sekiz olması şart değil. Ancak M7 tarayıcı testi şu anda yalnızca istatistik başlığını görüyor, hesaplanan oranı doğrulamıyor. Bilinen görevler üzerinden toplam/alan oranı ve hafta değişimini doğrulayan bir akış gerekli.
- Final raporu, AI kodlama aracı kullanım beyanı, kalan PMP/retrospektif, akran değerlendirmeleri ve final sürüm/demoları mevcut teslim takvimine göre tamamlanmalı. Bu incelemede final raporu bulunmadı; bu, henüz o teslim haftasına gelinmeden gecikme olarak yorumlanmamalı.

Özgün belgede v0.1 M1–M4 + ilk E2E/CI; v0.2 bütün modüller; finalde kapsamlı test/rapor bekleniyor. Dolayısıyla gerçek AI'nın henüz olmaması v0.1 için tek başına eksik değil, finalin tamamlandığını söylemeye ise engel.

## Yeniden çalıştırılan kontroller

| Kontrol | Sonuç |
|---|---|
| Backend Jest/Supertest | 7 suite, 64/64 test geçti |
| Backend branch coverage | %85 — 255/300 |
| Backend line coverage | %92,33 — 458/496 |
| Frontend Vitest | 2 dosya, 6/6 test geçti |
| Frontend production build | Başarılı |
| Playwright Chromium | 7/7 test geçti |

Backend kapsamına başlangıç dosyaları da dahil; `index.js` ve `seed.js` satırları bu testlerde çalıştırılmıyor. Yüksek genel oran bütün modüllerin her hatalı durumu test edildiği anlamına gelmiyor. Tarayıcı kontrolü Chromium ile yapıldı; Safari/Firefox doğrulanmadı.

Tarayıcı senaryoları: yanlış giriş/rol/yenileme; uzman bağla-kaldır ve eski token'ın reddi; görev atama/tamamlama/undo; mock kaynak/geri bildirim/kayıtlı özet; aylık etkinlik ve resim yükleme-görüntüleme-indirme; admin rol testi ve 390 px taşma kontrolü; uzman değerlendirmesi yazma/ebeveyn okuma/hafta filtresi.

## Önerilen çalışma sırası

1. Haftalık takvim görünümünü aylık görünümün yanına ekle ve gerçek hafta seçimiyle E2E'de doğrula.
2. Selin'in açık PR'larıyla yerel değişiklikleri görev bazında uzlaştır; reviewer sürecinden geçir. Güncel bütün testleri PR CI'ında çalıştır.
3. PMP/SRS/SDD ve toplantı notlarını gerçek Git/Jira durumuyla güncelle; v0.1 sürümünü ekip planına göre çıkar.
4. Sonraki M8 aşamasında gerçek sağlayıcıyı ekle, mock'u CI için koru; M7 ve modül bazlı final E2E kanıtlarını güçlendir.
5. Final raporu, AI kullanım beyanı, süreç belgeleri ve son sürüm teslimlerini tamamla.

## Kanıt dosyaları ve bağlantılar

- `server/src/children.js`: merkezi çocuk/bağlantı erişim kontrolü ve çocuk ekleme.
- `server/src/tasks.js`, `events.js`, `entries.js`, `documents.js`, `stats.js`, `summaries.js`, `ai.js`: modül işlemleri.
- `client/src/pages/CalendarPanel.jsx`, `WeeklyEvaluations.jsx`, `WorkspacePanels.jsx`, `RoleHomes.jsx`: arayüz akışları.
- `e2e/tests/flows.spec.js`, `e2e/playwright.config.js`, `.github/workflows/skeleton.yml`: test/CI kanıtı.
- [Açık PR'lar](https://github.com/selinsevis/SENG383-SECTION1-G4/pulls)
- [İncelenen son başarılı eski dal kontrolü](https://github.com/selinsevis/SENG383-SECTION1-G4/actions/runs/43606501322)

Bu rapor 15 Kasım 2026'da incelenen yerel çalışma ağacı ve o anki uzak durum içindir; daha sonraki değişiklikleri kapsamaz.

## Denetim sonrası güncelleme — çocuk hesabı

Ebeveynin çocuk eklerken e-posta ve şifre belirlemesi eklendi. Önceki hesap oluşturulmuyor bulgusu artık geçerli değil: profil ve child rolündeki giriş hesabı tek transaction içinde oluşturuluyor. Yukarıdaki Git/CI ve test sayıları ilk denetim anına aittir; son doğrulama sonuçları uygulama raporundaki ek güncellemede yer alır.
