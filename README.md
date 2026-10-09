# HayatNFC: ayrı hesap ve sağlık profili formu

## Akış
1. Kullanıcı Hesap / Giriş bölümünde e-posta ve parola ile ayrı Supabase Auth hesabı oluşturur.
2. E-posta doğrulaması açıksa gelen bağlantıya tıklar, sonra giriş yapar.
3. Giriş başarılı olunca ayrı Sağlık Profilim ekranına yönlendirilir.
4. Profil kaydedilince `participant_profiles` tablosunda kullanıcı kimliği (`id`) üzerinden insert/update yapılır. Sonraki girişte aynı kayıt yüklenir ve düzenlenebilir.

## Kurulum
- `index.html`, `app.js`, `style.css` dosyalarını web deposundakilerle değiştirin.
- GitHub Pages deposuna commit/push edin.
- **Mevcut Supabase SQL/RLS ayarlarını değiştirmeyin; `supabase_schema.sql` dosyasını tekrar çalıştırmayın.** Bu paket tablo şemasını değiştirmez.

## Bilinen sınırlar ve güvenlik
- Sağlık profili `participant_profiles` tablosunda `id = auth.uid()` modelini kullanır. Mevcut RLS politikalarının kullanıcıya kendi satırında SELECT/INSERT/UPDATE izni vermesi gerekir; izin yoksa ekranda hata gösterilir.
- Görevli paneli `staff_roles` içinde `responder` veya `admin` rolü olan hesaplarla sınırlıdır.
- NFC etiketini kullanıcı profiline güvenli bağlayan sunucu tarafı token çözümlemesi bu pakette etkin değildir. Etiket okutmak tek başına sağlık bilgisi göstermemelidir.
- Gerçek sağlık verileri kullanmayın; önce test verileriyle ve güvenlik incelemesiyle doğrulayın.
