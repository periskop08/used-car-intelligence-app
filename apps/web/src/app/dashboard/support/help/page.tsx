"use client";

import React from "react";

export default function HelpPage() {
  const faqs = [
    {
      q: "Nasıl ilan eklerim?",
      a: "Hesap menünüzden 'İlan Ekle' butonuna basarak aracınızın marka, model, yıl, kilometre ve hasar durumunu doldurup ilanınızı yayına alabilirsiniz."
    },
    {
      q: "Abonelik paketleri arasındaki farklar nelerdir?",
      a: "Free pakette 1 adet ilan yayınlanabilir. Standart pakette 10, Premium pakette ise 50 ilana kadar aktif yayın hakkınız bulunmaktadır. Ayrıca ilan yayında kalma süreleri farklılık gösterir."
    },
    {
      q: "Kayıtlı arama nedir ve nasıl kullanılır?",
      a: "İlanları ararken filtrelediğiniz kriterleri 'Aramayı Kaydet' diyerek favorilerinize ekleyebilirsiniz. Bu aramalara uygun yeni bir ilan eklendiğinde size e-posta/push bildirimi gönderilir."
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Yardım Merkezi</h1>
        <p className="text-slate-400 text-xs">Sıkça sorulan soruları okuyun ve platform kullanımına dair bilgi edinin.</p>
      </div>

      <div className="glass border border-white/5 rounded-3xl bg-[#090d1a]/45 backdrop-blur-md p-6 space-y-6">
        <h3 className="text-sm font-bold text-slate-200">Sıkça Sorulan Sorular</h3>
        <div className="space-y-4">
          {faqs.map((faq, idx) => (
            <div key={idx} className="p-4 bg-white/5 border border-white/5 rounded-2xl space-y-2">
              <h4 className="text-xs font-bold text-slate-300">❓ {faq.q}</h4>
              <p className="text-[11px] text-slate-550 leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
