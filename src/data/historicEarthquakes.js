// Tarihi büyük depremler verisi
export const historicEarthquakes = [
  // Türkiye'deki büyük depremler
  {
    id: 'istanbul_1999',
    name: 'Marmara Depremi (İzmit)',
    date: '17 Ağustos 1999',
    magnitude: 7.6,
    location: 'İzmit, Kocaeli',
    coordinates: [40.702, 29.985],
    deaths: 17118,
    injured: 43953,
    homeless: 600000,
    damage: '$6.5 milyar',
    description: 'Kuzey Anadolu Fayı üzerinde meydana gelen bu deprem, Türkiye\'nin en büyük doğal afetlerinden biri oldu.',
    epicenter: 'İzmit Körfezi',
    depth: '17 km',
    duration: '45 saniye',
    affected_cities: ['İzmit', 'Adapazarı', 'Yalova', 'İstanbul', 'Bursa'],
    country: 'Türkiye',
    category: 'turkey'
  },
  {
    id: 'van_2011',
    name: 'Van Depremi',
    date: '23 Ekim 2011',
    magnitude: 7.1,
    location: 'Van',
    coordinates: [38.628, 43.486],
    deaths: 644,
    injured: 4152,
    homeless: 60000,
    damage: '$1.2 milyar',
    description: 'Doğu Anadolu\'da meydana gelen güçlü deprem, binlerce binanın yıkılmasına neden oldu.',
    epicenter: 'Erciş-Van',
    depth: '16 km',
    duration: '25 saniye',
    affected_cities: ['Van', 'Erciş', 'Muradiye', 'Çaldıran'],
    country: 'Türkiye',
    category: 'turkey'
  },
  {
    id: 'erzincan_1939',
    name: 'Erzincan Depremi',
    date: '27 Aralık 1939',
    magnitude: 7.9,
    location: 'Erzincan',
    coordinates: [39.771, 39.507],
    deaths: 32700,
    injured: 100000,
    homeless: 116720,
    damage: 'Şehir tamamen yıkıldı',
    description: 'Kuzey Anadolu Fayı\'nda meydana gelen bu deprem, Erzincan şehrini tamamen yıktı.',
    epicenter: 'Erzincan Ovası',
    depth: '20 km',
    duration: '50 saniye',
    affected_cities: ['Erzincan', 'Erzurum', 'Sivas', 'Tokat'],
    country: 'Türkiye',
    category: 'turkey'
  },
  {
    id: 'kahramanmaras_2023',
    name: 'Kahramanmaraş Depremleri',
    date: '6 Şubat 2023',
    magnitude: 7.8,
    location: 'Kahramanmaraş',
    coordinates: [37.166, 37.042],
    deaths: 50783,
    injured: 107204,
    homeless: 1500000,
    damage: '$84.1 milyar',
    description: 'İki büyük depremle başlayan afet zinciri, 11 ili etkiledi ve asrın felaketi olarak adlandırıldı.',
    epicenter: 'Pazarcık-Kahramanmaraş',
    depth: '18 km',
    duration: '110 saniye',
    affected_cities: ['Kahramanmaraş', 'Hatay', 'Gaziantep', 'Adıyaman', 'Malatya', 'Şanlıurfa', 'Diyarbakır', 'Kilis', 'Osmaniye', 'Elazığ', 'Adana'],
    country: 'Türkiye',
    category: 'turkey'
  },

  // Dünya genelindeki büyük depremler
  {
    id: 'chile_1960',
    name: 'Great Chilean Earthquake',
    date: '22 Mayıs 1960',
    magnitude: 9.5,
    location: 'Valdivia, Şili',
    coordinates: [-39.5, -74.5],
    deaths: 1655,
    injured: 3000,
    homeless: 2000000,
    damage: '$550 milyon (1960)',
    description: 'Kayıtlı tarihin en büyük depremi. 15 dakika sürdü ve büyük tsunami\'ye neden oldu.',
    epicenter: 'Valdivia',
    depth: '33 km',
    duration: '15 dakika',
    affected_cities: ['Valdivia', 'Puerto Montt', 'Concepción'],
    country: 'Şili',
    category: 'world'
  },
  {
    id: 'alaska_1964',
    name: 'Great Alaska Earthquake',
    date: '28 Mart 1964',
    magnitude: 9.2,
    location: 'Prince William Sound, Alaska',
    coordinates: [61.02, -147.65],
    deaths: 131,
    injured: 300,
    homeless: 4000,
    damage: '$311 milyon (1964)',
    description: 'ABD tarihinin en güçlü depremi. 4.5 dakika sürdü ve dev tsunami oluştu.',
    epicenter: 'Prince William Sound',
    depth: '25 km',
    duration: '4.5 dakika',
    affected_cities: ['Anchorage', 'Valdez', 'Seward', 'Whittier'],
    country: 'ABD (Alaska)',
    category: 'world'
  },
  {
    id: 'sumatra_2004',
    name: 'Sumatra-Andaman Depremi ve Tsunamisi',
    date: '26 Aralık 2004',
    magnitude: 9.1,
    location: 'Sumatra, Endonezya',
    coordinates: [3.295, 95.982],
    deaths: 230000,
    injured: 125000,
    homeless: 1700000,
    damage: '$15 milyar',
    description: 'Hint Okyanusu\'nda büyük tsunami\'ye neden olan deprem, 14 ülkeyi etkiledi.',
    epicenter: 'Sumatra Batı Kıyısı',
    depth: '30 km',
    duration: '8-10 dakika',
    affected_cities: ['Banda Aceh', 'Phuket', 'Sri Lanka', 'Maldivler'],
    country: 'Endonezya',
    category: 'world'
  },
  {
    id: 'japan_2011',
    name: 'Tōhoku Depremi ve Tsunamisi',
    date: '11 Mart 2011',
    magnitude: 9.1,
    location: 'Tōhoku, Japonya',
    coordinates: [38.297, 142.373],
    deaths: 19759,
    injured: 6242,
    homeless: 470000,
    damage: '$235 milyar',
    description: 'Fukushima nükleer kazasına neden olan deprem ve tsunami. Japonya\'nın en büyük doğal afeti.',
    epicenter: 'Pasifik Okyanusu, Honshu Doğusu',
    depth: '32 km',
    duration: '6 dakika',
    affected_cities: ['Sendai', 'Fukushima', 'Tokyo', 'Minami-Sanriku'],
    country: 'Japonya',
    category: 'world'
  },
  {
    id: 'lisbon_1755',
    name: 'Lizbon Büyük Depremi',
    date: '1 Kasım 1755',
    magnitude: 8.5,
    location: 'Lizbon, Portekiz',
    coordinates: [36.0, -11.0],
    deaths: 100000,
    injured: 50000,
    homeless: 300000,
    damage: 'Şehrin %85\'i yıkıldı',
    description: 'Avrupa tarihinin en yıkıcı depremlerinden biri. Aydınlanma düşüncesini etkiledi.',
    epicenter: 'Atlantik Okyanusu',
    depth: '20 km',
    duration: '3.5-6 dakika',
    affected_cities: ['Lizbon', 'Fes', 'Meknes', 'Cádiz'],
    country: 'Portekiz',
    category: 'world'
  },
  {
    id: 'haiti_2010',
    name: 'Haiti Depremi',
    date: '12 Ocak 2010',
    magnitude: 7.0,
    location: 'Port-au-Prince, Haiti',
    coordinates: [18.457, -72.533],
    deaths: 316000,
    injured: 300000,
    homeless: 1500000,
    damage: '$8-14 milyar',
    description: 'Haiti\'nin başkentini harap eden deprem, ülkenin %60\'ını etkiledi.',
    epicenter: 'Port-au-Prince yakınları',
    depth: '13 km',
    duration: '35 saniye',
    affected_cities: ['Port-au-Prince', 'Jacmel', 'Léogâne'],
    country: 'Haiti',
    category: 'world'
  },
  {
    id: 'sichuan_2008',
    name: 'Sichuan Depremi (Wenchuan)',
    date: '12 Mayıs 2008',
    magnitude: 7.9,
    location: 'Wenchuan, Sichuan, Çin',
    coordinates: [31.002, 103.322],
    deaths: 87587,
    injured: 374643,
    homeless: 4800000,
    damage: '$86 milyar',
    description: 'Çin\'in en yıkıcı depremlerinden biri. Binlerce okul yıkıldı.',
    epicenter: 'Wenchuan County',
    depth: '19 km',
    duration: '120 saniye',
    affected_cities: ['Wenchuan', 'Beichuan', 'Dujiangyan', 'Chengdu'],
    country: 'Çin',
    category: 'world'
  },
  {
    id: 'tangshan_1976',
    name: 'Tangshan Depremi',
    date: '28 Temmuz 1976',
    magnitude: 7.6,
    location: 'Tangshan, Çin',
    coordinates: [39.610, 118.087],
    deaths: 242769,
    injured: 164851,
    homeless: 700000,
    damage: 'Şehrin %85\'i yıkıldı',
    description: 'Modern tarihin en ölümcül depremlerinden biri. Tangshan şehri tamamen yıkıldı.',
    epicenter: 'Tangshan',
    depth: '22 km',
    duration: '23 saniye',
    affected_cities: ['Tangshan', 'Tianjin', 'Pekin'],
    country: 'Çin',
    category: 'world'
  }
];

// Kategorilere göre filtreleme fonksiyonları
export const getEarthquakesByCategory = (category) => {
  return historicEarthquakes.filter(eq => eq.category === category);
};

export const getTurkishEarthquakes = () => getEarthquakesByCategory('turkey');
export const getWorldEarthquakes = () => getEarthquakesByCategory('world');

// Büyüklüğe göre sıralama
export const getEarthquakesByMagnitude = (minMagnitude = 0) => {
  return historicEarthquakes
    .filter(eq => eq.magnitude >= minMagnitude)
    .sort((a, b) => b.magnitude - a.magnitude);
};

// Ölü sayısına göre sıralama
export const getEarthquakesByDeaths = () => {
  return historicEarthquakes
    .sort((a, b) => b.deaths - a.deaths);
};