export interface CityData {
  name: string;
  districts: string[];
}

export const TURKEY_CITIES_DISTRICTS: Record<string, string[]> = {
  "Adana": ["Aladağ", "Ceyhan", "Çukurova", "Feke", "İmamoğlu", "Karaisalı", "Karataş", "Kozan", "Pozantı", "Saimbeyli", "Sarıçam", "Seyhan", "Tufanbeyli", "Yumurtalık", "Yüreğir"],
  "Adıyaman": ["Besni", "Çelikhan", "Gerger", "Gölbaşı", "Kahta", "Merkez", "Samsat", "Sincik", "Tut"],
  "Afyonkarahisar": ["Başmakçı", "Bayat", "Bolvadin", "Çay", "Çobanlar", "Dazkırı", "Dinar", "Emirdağ", "Evciler", "Hocalar", "İhsaniye", "İscehisar", "Kızılören", "Merkez", "Sandıklı", "Sinanpaşa", "Sultandağı", "Şuhut"],
  "Ağrı": ["Diyadin", "Doğubayazıt", "Eleşkirt", "Hamur", "Merkez", "Patnos", "Taşlıçay", "Tutak"],
  "Amasya": ["Göynücek", "Gümüşhacıköy", "Hamamözü", "Merkez", "Merzifon", "Suluova", "Taşova"],
  "Ankara": ["Akyurt", "Altındağ", "Ayaş", "Bala", "Beypazarı", "Çamlıdere", "Çankaya", "Çubuk", "Elmadağ", "Etimesgut", "Evren", "Gölbaşı", "Güdül", "Haymana", "Kahramankazan", "Kalecik", "Keçiören", "Kızılcahamam", "Mamak", "Nallıhan", "Polatlı", "Pursaklar", "Sincan", "Şereflikoçhisar", "Yenimahalle"],
  "Antalya": ["Akseki", "Aksu", "Alanya", "Demre", "Döşemealtı", "Elmalı", "Finike", "Gazipaşa", "Gündoğmuş", "İbradı", "Kaş", "Kemer", "Kepez", "Konyaaltı", "Korkuteli", "Kumluca", "Manavgat", "Muratpaşa", "Serik"],
  "Artvin": ["Ardanuç", "Arhavi", "Borçka", "Hopa", "Kemalpaşa", "Merkez", "Murgul", "Şavşat", "Yusufeli"],
  "Aydın": ["Bozdoğan", "Buharkent", "Çine", "Didim", "Efeler", "Germencik", "İncirliova", "Karacasu", "Karpuzlu", "Koçarlı", "Köşk", "Kuşadası", "Kuyucak", "Nazilli", "Söke", "Sultanhisar", "Yenipazar"],
  "Balıkesir": ["Altıeylül", "Ayvalık", "Balya", "Bandırma", "Bigadiç", "Burhaniye", "Dursunbey", "Edremit", "Erdek", "Gömeç", "Gönen", "Havran", "İvrindi", "Karesi", "Kepsut", "Manyas", "Marmara", "Savaştepe", "Sındırgı", "Susurluk"],
  "Bilecik": ["Bozüyük", "Gölpazarı", "İnhisar", "Merkez", "Osmaneli", "Pazaryeri", "Söğüt", "Yenipazar"],
  "Bingöl": ["Adaklı", "Genç", "Karlıova", "Kiğı", "Merkez", "Solhan", "Yayladere", "Yedisu"],
  "Bitlis": ["Adilcevaz", "Ahlat", "Güroymak", "Hizan", "Merkez", "Mutki", "Tatvan"],
  "Bolu": ["Dörtdivan", "Gerede", "Göynük", "Kıbrısçık", "Mengen", "Merkez", "Mudurnu", "Seben", "Yeniçağa"],
  "Burdur": ["Ağlasun", "Altınyayla", "Bucak", "Çavdır", "Çeltikçi", "Gölhisar", "Karamanlı", "Kemer", "Merkez", "Tefenni", "Yeşilova"],
  "Bursa": ["Büyükorhan", "Gemlik", "Gürsu", "Harmancık", "İnegöl", "İznik", "Karacabey", "Keles", "Kestel", "Mudanya", "Mustafakemalpaşa", "Nilüfer", "Orhaneli", "Orhangazi", "Osmangazi", "Yenişehir", "Yıldırım"],
  "Çanakkale": ["Ayvacık", "Bayramiç", "Biga", "Bozcaada", "Çan", "Eceabat", "Ezine", "Gelibolu", "Gökçeada", "Lapseki", "Merkez", "Yenice"],
  "Çankırı": ["Atkaracalar", "Bayramören", "Çerkeş", "Eldivan", "Ilgaz", "Kızılırmak", "Korgun", "Kurşunlu", "Merkez", "Orta", "Şabanözü", "Yapraklı"],
  "Çorum": ["Alaca", "Bayat", "Boğazkale", "Dodurga", "İskilip", "Kargı", "Laçin", "Mecitözü", "Merkez", "Oğuzlar", "Ortaköy", "Osmancık", "Sungurlu", "Uğurludağ"],
  "Denizli": ["Acıpayam", "Babadağ", "Baklan", "Bekilli", "Beyağaç", "Bozkurt", "Buldan", "Çal", "Çameli", "Çardak", "Çivril", "Güney", "Honaz", "Kale", "Merkezefendi", "Pamukkale", "Sarayköy", "Serinhisar", "Tavas"],
  "Diyarbakır": ["Bağlar", "Bismil", "Çermik", "Çınar", "Çüngüş", "Dicle", "Eğil", "Ergani", "Hani", "Hazro", "Kayapınar", "Kocaköy", "Kulp", "Lice", "Silvan", "Sur", "Yenişehir"],
  "Edirne": ["Enez", "Havsa", "İpsala", "Keşan", "Lalapaşa", "Meriç", "Merkez", "Süloğlu", "Uzunköprü"],
  "Elazığ": ["Ağın", "Alacakaya", "Arıcak", "Baskil", "Karakoçan", "Keban", "Kovancılar", "Maden", "Merkez", "Palu", "Sivrice"],
  "Erzincan": ["Çayırlı", "İliç", "Kemah", "Kemaliye", "Merkez", "Otlukbeli", "Refahiye", "Tercan", "Üzümlü"],
  "Erzurum": ["Aşkale", "Aziziye", "Çat", "Hınıs", "Horasan", "İspir", "Karaçoban", "Karayazı", "Köprüköy", "Narman", "Oltu", "Olur", "Palandöken", "Pasinler", "Pazaryolu", "Şenkaya", "Tekman", "Tortum", "Uzundere", "Yakutiye"],
  "Eskişehir": ["Alpu", "Beylikova", "Çifteler", "Günyüzü", "Han", "İnönü", "Mahmudiye", "Mihalgazi", "Mihalıççık", "Odunpazarı", "Seyitgazi", "Sivrihisar", "Tepebaşı"],
  "Gaziantep": ["Araban", "İslahiye", "Karkamış", "Nizip", "Oğuzeli", "Nurdağı", "Şahinbey", "Şehitkamil", "Yavuzeli"],
  "Giresun": ["Alucra", "Bulancak", "Çamoluk", "Çanakçı", "Dereli", "Doğankent", "Espiye", "Eynesil", "Görele", "Güce", "Keşap", "Merkez", "Piraziz", "Göreli", "Tirebolu", "Yağlıdere"],
  "Gümüşhane": ["Kelkit", "Köse", "Kürtün", "Merkez", "Şiran", "Torul"],
  "Hakkari": ["Çukurca", "Derecik", "Yüksekova", "Şemdinli", "Merkez"],
  "Hatay": ["Altınözü", "Antakya", "Arsuz", "Belen", "Defne", "Dörtyol", "Erzin", "Hassa", "İskenderun", "Kırıkhan", "Kumlu", "Payas", "Reyhanlı", "Samandağ", "Yayladağı"],
  "Isparta": ["Aksu", "Atabey", "Eğirdir", "Gelendost", "Gönen", "Keçiborlu", "Merkez", "Senirkent", "Sütçüler", "Şarkikaraağaç", "Uluborlu", "Yalvaç", "Yenişarbademli"],
  "Mersin": ["Akdeniz", "Anamur", "Aydıncık", "Bozyazı", "Çamlıyayla", "Erdemli", "Gülnar", "Mezitli", "Mut", "Silifke", "Tarsus", "Toroslar", "Yenişehir"],
  "İstanbul": ["Adalar", "Arnavutköy", "Ataşehir", "Avcılar", "Bağcılar", "Bahçelievler", "Bakırköy", "Başakşehir", "Bayrampaşa", "Beşiktaş", "Beykoz", "Beylikdüzü", "Beyoğlu", "Büyükçekmece", "Çatalca", "Çekmeköy", "Esenler", "Esenyurt", "Eyüpsultan", "Fatih", "Gaziosmanpaşa", "Güngören", "Kadıköy", "Kağıthane", "Kartal", "Küçükçekmece", "Maltepe", "Pendik", "Sancaktepe", "Sarıyer", "Silivri", "Sultanbeyli", "Sultangazi", "Şile", "Şişli", "Tuzla", "Ümraniye", "Üsküdar", "Zeytinburnu"],
  "İzmir": ["Aliağa", "Balçova", "Bayındır", "Bayraklı", "Bergama", "Beydağ", "Bornova", "Buca", "Çeşme", "Çiğli", "Dikili", "Foça", "Gaziemir", "Güzelbahçe", "Karabağlar", "Karaburun", "Karşıyaka", "Kemalpaşa", "Kınık", "Kiraz", "Konak", "Menderes", "Menemen", "Narlıdere", "Ödemiş", "Seferihisar", "Selçuk", "Tire", "Torbalı", "Urla"],
  "Kars": ["Akyaka", "Arpaçay", "Digor", "Kağızman", "Merkez", "Sarıkamış", "Selim", "Susuz"],
  "Kastamonu": ["Abana", "Ağlı", "Araç", "Azdavay", "Bozkurt", "Cide", "Çatalzeytin", "Daday", "Devrekani", "Doğanyurt", "Hanönü", "İhsangazı", "İnebolu", "Küre", "Merkez", "Pınarbaşı", "Seydiler", "Şenpazar", "Taşköprü", "Tosya"],
  "Kayseri": ["Akkışla", "Bünyan", "Develi", "Felahiye", "Hacılar", "İncesu", "Kocasinan", "Melikgazi", "Özvatan", "Pınarbaşı", "Sarıoğlan", "Sarız", "Talas", "Tomarza", "Yahyalı", "Yeşilhisar"],
  "Kırklareli": ["Babaeski", "Demirköy", "Kofçaz", "Lüleburgaz", "Merkez", "Pehlivanköy", "Pınarhisar", "Vize"],
  "Kırşehir": ["Akçakent", "Akpınar", "Boztepe", "Çiçekdağı", "Kaman", "Merkez", "Mucur"],
  "Kocaeli": ["Başiskele", "Çayırova", "Darıca", "Derince", "Dilovası", "Gebze", "Gölcük", "İzmit", "Kandıra", "Karamürsel", "Kartepe", "Körfez"],
  "Konya": ["Ahırlı", "Akören", "Akşehir", "Altınekin", "Beyşehir", "Bozkır", "Cihanbeyli", "Çeltik", "Çumra", "Derbent", "Derebucak", "Doğanhisar", "Emirgazi", "Ereğli", "Güneysınır", "Hadim", "Halkapınar", "Hüyük", "Ilgın", "Kadınhanı", "Karapınar", "Karatay", "Kulu", "Meram", "Sarayönü", "Selçuklu", "Seydişehir", "Taşkent", "Tuzlukçu", "Yalıhüyük", "Yunak"],
  "Kütahya": ["Altıntaş", "Aslanapa", "Çavdarhisar", "Domaniç", "Dumlupınar", "Emet", "Gediz", "Hisarcık", "Merkez", "Pazarlar", "Şaphane", "Simav", "Tavşanlı"],
  "Malatya": ["Akçadağ", "Arapgir", "Arguvan", "Battalgazi", "Darende", "Doğanşehir", "Doğanyol", "Hekimhan", "Kale", "Kuluncak", "Pütürge", "Yazıhan", "Yeşilyurt"],
  "Manisa": ["Ahmetli", "Akhisar", "Alaşehir", "Demirci", "Gölmarmara", "Gördes", "Kırkağaç", "Köprübaşı", "Kula", "Salihli", "Sarıgöl", "Saruhanlı", "Selendi", "Soma", "Şehzadeler", "Turgutlu", "Yunusemre"],
  "Kahramanmaraş": ["Afşin", "Andırın", "Çağlayancerit", "Dulkadiroğlu", "Ekinözü", "Elbistan", "Göksun", "Nurhak", "Onikişubat", "Pazarcık", "Türkoğlu"],
  "Mardin": ["Artuklu", "Dargeçit", "Derik", "Kızıltepe", "Mazıdağı", "Midyat", "Nusaybin", "Ömerli", "Savur", "Yeşilli"],
  "Muğla": ["Bodrum", "Dalaman", "Datça", "Fethiye", "Kavaklıdere", "Köyceğiz", "Marmaris", "Menteşe", "Milas", "Ortaca", "Seydikemer", "Ula", "Yatağan"],
  "Muş": ["Bulanık", "Hasköy", "Korkut", "Malazgirt", "Merkez", "Varto"],
  "Nevşehir": ["Acıgöl", "Avanos", "Derinkuyu", "Gülşehir", "Hacıbektaş", "Kozaklı", "Merkez", "Ürgüp"],
  "Niğde": ["Altunhisar", "Bor", "Çamardı", "Çiftlik", "Merkez", "Ulukışla"],
  "Ordu": ["Akkuş", "Altınordu", "Aybastı", "Çamaş", "Çatalpınar", "Çaybaşı", "Fatsa", "Gölköy", "Gülyalı", "Gürgentepe", "İkizce", "Kabadüz", "Kabataş", "Korgan", "Kumru", "Mesaudiye", "Ünye", "Ulubey"],
  "Rize": ["Ardeşen", "Çamlıhemşin", "Çayeli", "Derepazarı", "Fındıklı", "Güneysu", "Hemşin", "İkizdere", "İyidere", "Kalkandere", "Merkez", "Pazar"],
  "Sakarya": ["Adapazarı", "Akyazı", "Arifiye", "Erenler", "Ferizli", "Geyve", "Hendek", "Karapürçek", "Karasu", "Kaynarca", "Kocaali", "Pamukova", "Sapanca", "Serdivan", "Söğütlü", "Taraklı"],
  "Samsun": ["19 Mayıs", "Alaçam", "Asarcık", "Atakum", "Ayvacık", "Bafra", "Canik", "Çarşamba", "Havza", "İlkadım", "Kavak", "Ladik", "Salıpazarı", "Tekkeköy", "Terme", "Vezirköprü", "Yakakent"],
  "Siirt": ["Baykan", "Eruh", "Kurtalan", "Merkez", "Pervari", "Şirvan", "Tillo"],
  "Sinop": ["Boyabat", "Dikmen", "Durağan", "Erfelek", "Gerze", "Merkez", "Saraydüzü", "Türkeli"],
  "Sivas": ["Akıncılar", "Altınyayla", "Divriği", "Doğanşar", "Gemerek", "Gölova", "Gürün", "Hafik", "İmranlı", "Kangal", "Koyulhisar", "Merkez", "Suşehri", "Şarkışla", "Ulaş", "Yıldızeli", "Zara"],
  "Tekirdağ": ["Çerkezköy", "Çorlu", "Ergene", "Hayrabolu", "Kapaklı", "Malkara", "Marmaraereğlisi", "Muratlı", "Saray", "Süleymanpaşa", "Şarköy"],
  "Tokat": ["Almus", "Artova", "Başçiftlik", "Erbaa", "Merkez", "Niksar", "Pazar", "Reşadiye", "Sulusaray", "Turhal", "Yeşilyurt", "Zile"],
  "Trabzon": ["Akçaabat", "Araklı", "Arsin", "Beşikdüzü", "Çarşıbaşı", "Çaykara", "Dernekpazarı", "Düzköy", "Hayrat", "Köprübaşı", "Maçka", "Of", "Ortahisar", "Sürmene", "Şalpazarı", "Tonya", "Vakfıkebir", "Yomra"],
  "Tunceli": ["Çemişgezek", "Hozat", "Mazgirt", "Merkez", "Nazımiye", "Ovacık", "Pertek", "Pülümür"],
  "Şanlıurfa": ["Akçakale", "Birecik", "Bozova", "Ceylanpınar", "Eyyübiye", "Halfeti", "Haliliye", "Harran", "Hilvan", "Karaköprü", "Siverek", "Suruç", "Viranşehir"],
  "Uşak": ["Banaz", "Eşme", "Karahallı", "Merkez", "Sivaslı", "Ulubey"],
  "Van": ["Bahçesaray", "Başkale", "Çaldıran", "Çatak", "Edremit", "Erciş", "Gevaş", "Gürpınar", "İpekyolu", "Muradiye", "Özalp", "Saray", "Tuşba"],
  "Yozgat": ["Akdağmadeni", "Aydıncık", "Boğazlıyan", "Çandır", "Çayıralan", "Çekerek", "Kadışehri", "Merkez", "Saraykent", "Sarıkaya", "Sorgun", "Şefaatli", "Yenifakılı", "Yerköy"],
  "Zonguldak": ["Alaplı", "Çaycuma", "Devrek", "Ereğli", "Gökçebey", "Kilimli", "Kozlu", "Merkez"],
  "Aksaray": ["Ağaçören", "Eskil", "Gülağaç", "Güzelyurt", "Merkez", "Ortaköy", "Sarıyahşi", "Sultanhanı"],
  "Bayburt": ["Aydıntepe", "Demirözü", "Merkez"],
  "Karaman": ["Ayrancı", "Başyayla", "Ermenek", "Kazımkarabekir", "Merkez", "Sarıveliler"],
  "Kırıkkale": ["Bahşılı", "Balışeyh", "Çelebi", "Delice", "Karakeçili", "Keskin", "Merkez", "Sulakyurt", "Yahşihan"],
  "Batman": ["Beşiri", "Gercüş", "Hasankeyf", "Kozluk", "Merkez", "Sason"],
  "Şırnak": ["Beytüşşebap", "Cizre", "Güçlükonak", "İdil", "Merkez", "Silopi", "Uludere"],
  "Bartın": ["Amasra", "Kurucaşile", "Merkez", "Ulus"],
  "Ardahan": ["Çıldır", "Damal", "Göle", "Hanak", "Merkez", "Posof"],
  "Iğdır": ["Aralık", "Karakoyunlu", "Merkez", "Tuzluca"],
  "Yalova": ["Altınova", "Armutlu", "Çınarcık", "Çiftlikköy", "Merkez", "Termal"],
  "Karabük": ["Eflani", "Eskipazar", "Merkez", "Ovacık", "Safranbolu", "Yenice"],
  "Kilis": ["Elbeyli", "Merkez", "Musabeyli", "Polateli"],
  "Osmaniye": ["Bahçe", "Düziçi", "Hasanbeyli", "Kadirli", "Merkez", "Sumbas", "Toprakkale"],
  "Düzce": ["Akçakoca", "Cumayeri", "Çilimli", "Gölyaka", "Gümüşova", "Kaynaşlı", "Merkez", "Yığılca"]
};

export const TURKEY_CITIES = Object.keys(TURKEY_CITIES_DISTRICTS);

export interface CanonicalCity {
  id: string; // e.g. "TR-41"
  name: string; // e.g. "Kocaeli"
  plateCode: number; // e.g. 41
}

export const CANONICAL_TURKEY_CITIES: CanonicalCity[] = [
  { id: "TR-01", name: "Adana", plateCode: 1 },
  { id: "TR-02", name: "Adıyaman", plateCode: 2 },
  { id: "TR-03", name: "Afyonkarahisar", plateCode: 3 },
  { id: "TR-04", name: "Ağrı", plateCode: 4 },
  { id: "TR-05", name: "Amasya", plateCode: 5 },
  { id: "TR-06", name: "Ankara", plateCode: 6 },
  { id: "TR-07", name: "Antalya", plateCode: 7 },
  { id: "TR-08", name: "Artvin", plateCode: 8 },
  { id: "TR-09", name: "Aydın", plateCode: 9 },
  { id: "TR-10", name: "Balıkesir", plateCode: 10 },
  { id: "TR-11", name: "Bilecik", plateCode: 11 },
  { id: "TR-12", name: "Bingöl", plateCode: 12 },
  { id: "TR-13", name: "Bitlis", plateCode: 13 },
  { id: "TR-14", name: "Bolu", plateCode: 14 },
  { id: "TR-15", name: "Burdur", plateCode: 15 },
  { id: "TR-16", name: "Bursa", plateCode: 16 },
  { id: "TR-17", name: "Çanakkale", plateCode: 17 },
  { id: "TR-18", name: "Çankırı", plateCode: 18 },
  { id: "TR-19", name: "Çorum", plateCode: 19 },
  { id: "TR-20", name: "Denizli", plateCode: 20 },
  { id: "TR-21", name: "Diyarbakır", plateCode: 21 },
  { id: "TR-22", name: "Edirne", plateCode: 22 },
  { id: "TR-23", name: "Elazığ", plateCode: 23 },
  { id: "TR-24", name: "Erzincan", plateCode: 24 },
  { id: "TR-25", name: "Erzurum", plateCode: 25 },
  { id: "TR-26", name: "Eskişehir", plateCode: 26 },
  { id: "TR-27", name: "Gaziantep", plateCode: 27 },
  { id: "TR-28", name: "Giresun", plateCode: 28 },
  { id: "TR-29", name: "Gümüşhane", plateCode: 29 },
  { id: "TR-30", name: "Hakkari", plateCode: 30 },
  { id: "TR-31", name: "Hatay", plateCode: 31 },
  { id: "TR-32", name: "Isparta", plateCode: 32 },
  { id: "TR-33", name: "Mersin", plateCode: 33 },
  { id: "TR-34", name: "İstanbul", plateCode: 34 },
  { id: "TR-35", name: "İzmir", plateCode: 35 },
  { id: "TR-36", name: "Kars", plateCode: 36 },
  { id: "TR-37", name: "Kastamonu", plateCode: 37 },
  { id: "TR-38", name: "Kayseri", plateCode: 38 },
  { id: "TR-39", name: "Kırklareli", plateCode: 39 },
  { id: "TR-40", name: "Kırşehir", plateCode: 40 },
  { id: "TR-41", name: "Kocaeli", plateCode: 41 },
  { id: "TR-42", name: "Konya", plateCode: 42 },
  { id: "TR-43", name: "Kütahya", plateCode: 43 },
  { id: "TR-44", name: "Malatya", plateCode: 44 },
  { id: "TR-45", name: "Manisa", plateCode: 45 },
  { id: "TR-46", name: "Kahramanmaraş", plateCode: 46 },
  { id: "TR-47", name: "Mardin", plateCode: 47 },
  { id: "TR-48", name: "Muğla", plateCode: 48 },
  { id: "TR-49", name: "Muş", plateCode: 49 },
  { id: "TR-50", name: "Nevşehir", plateCode: 50 },
  { id: "TR-51", name: "Niğde", plateCode: 51 },
  { id: "TR-52", name: "Ordu", plateCode: 52 },
  { id: "TR-53", name: "Rize", plateCode: 53 },
  { id: "TR-54", name: "Sakarya", plateCode: 54 },
  { id: "TR-55", name: "Samsun", plateCode: 55 },
  { id: "TR-56", name: "Siirt", plateCode: 56 },
  { id: "TR-57", name: "Sinop", plateCode: 57 },
  { id: "TR-58", name: "Sivas", plateCode: 58 },
  { id: "TR-59", name: "Tekirdağ", plateCode: 59 },
  { id: "TR-60", name: "Tokat", plateCode: 60 },
  { id: "TR-61", name: "Trabzon", plateCode: 61 },
  { id: "TR-62", name: "Tunceli", plateCode: 62 },
  { id: "TR-63", name: "Şanlıurfa", plateCode: 63 },
  { id: "TR-64", name: "Uşak", plateCode: 64 },
  { id: "TR-65", name: "Van", plateCode: 65 },
  { id: "TR-66", name: "Yozgat", plateCode: 66 },
  { id: "TR-67", name: "Zonguldak", plateCode: 67 },
  { id: "TR-68", name: "Aksaray", plateCode: 68 },
  { id: "TR-69", name: "Bayburt", plateCode: 69 },
  { id: "TR-70", name: "Karaman", plateCode: 70 },
  { id: "TR-71", name: "Kırıkkale", plateCode: 71 },
  { id: "TR-72", name: "Batman", plateCode: 72 },
  { id: "TR-73", name: "Şırnak", plateCode: 73 },
  { id: "TR-74", name: "Bartın", plateCode: 74 },
  { id: "TR-75", name: "Ardahan", plateCode: 75 },
  { id: "TR-76", name: "Iğdır", plateCode: 76 },
  { id: "TR-77", name: "Yalova", plateCode: 77 },
  { id: "TR-78", name: "Karabük", plateCode: 78 },
  { id: "TR-79", name: "Kilis", plateCode: 79 },
  { id: "TR-80", name: "Osmaniye", plateCode: 80 },
  { id: "TR-81", name: "Düzce", plateCode: 81 },
];

export const TURKEY_81_PROVINCES: string[] = CANONICAL_TURKEY_CITIES.map((c) => c.name);

const CANONICAL_CITY_BY_ID = new Map<string, CanonicalCity>(
  CANONICAL_TURKEY_CITIES.map((c) => [c.id.toUpperCase(), c])
);

const CANONICAL_CITY_BY_NAME = new Map<string, CanonicalCity>(
  CANONICAL_TURKEY_CITIES.map((c) => [c.name.toLocaleLowerCase("tr-TR"), c])
);

export function findCanonicalCityById(id?: string | null): CanonicalCity | undefined {
  if (!id) return undefined;
  return CANONICAL_CITY_BY_ID.get(id.trim().toUpperCase());
}

export function findCanonicalCityByName(name?: string | null): CanonicalCity | undefined {
  if (!name) return undefined;
  const key = name.trim().toLocaleLowerCase("tr-TR");
  return CANONICAL_CITY_BY_NAME.get(key);
}

export function getCanonicalCityId(nameOrId?: string | null): string | undefined {
  if (!nameOrId) return undefined;
  const trimmed = nameOrId.trim();
  const byId = findCanonicalCityById(trimmed);
  if (byId) return byId.id;
  const byName = findCanonicalCityByName(trimmed);
  if (byName) return byName.id;
  return undefined;
}

export function getDistrictsForCity(city: string): string[] {
  if (!city) return [];
  return TURKEY_CITIES_DISTRICTS[city] || [];
}

export function isValidCityAndDistrict(city?: string, district?: string): boolean {
  if (!city) return false;
  const districts = TURKEY_CITIES_DISTRICTS[city];
  if (!districts) return false;
  if (!district) return true; // optional if district is not required, but if provided, must match
  return districts.includes(district);
}

