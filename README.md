# Kulaklık Karşılaştırma Stüdyosu

Netlify'a yayınlanabilen, kulaklık modellerini yan yana karşılaştıran tek sayfalık bir uygulama.

## Özellikler

- Combo box ile gömülü model seçimi
- Fiyat girişi
- Her kulaklık için birden fazla renk varyantı
- Her renk için resim yükleme
- Paylaşılan kayıtları Netlify Blobs üzerinde JSON olarak saklama
- İki kulaklığı karşılaştırma panelinde yan yana görme

## Veri yapısı

- Gömülü ürün bilgileri: `data/catalog.js`
- Paylaşılan kullanıcı kayıtları: Netlify Blobs içindeki `headphone-comparisons/entries`
- API: `netlify/functions/headphones.js`

## Yerel çalışma

Bu proje sade statik dosyalar kullanır. Yerelde bir sunucu ile açabilirsin.

Örnek:

```bash
npx serve .
```

## Netlify yayınlama

- `index.html` ve diğer dosyaları kök dizine koy.
- Netlify Functions klasörü: `netlify/functions`
- Blobs depolaması sayesinde eklenen kulaklıklar deploy sonrası da ortak görünür.

## Yeni model ekleme

Yeni bir kulaklık modelini önce bana yaz; ben `data/catalog.js` içine gömülecek özellikleri ekleyeyim.
Sonra bu ekrandaki combo box'ta otomatik görünür.
