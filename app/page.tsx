"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown, ArrowRight, ArrowUpRight, BadgeCheck, CalendarDays, Check,
  ChevronDown, Clock3, Flower2, Heart, MapPin, Menu, Search, SlidersHorizontal,
  Sparkles, Star, X,
} from "lucide-react";
import { isFirebaseConfigured } from "./lib/firebase";
import {
  submitAppointment, submitSalonApplication, watchActiveCollection,
  watchAvailableSlots, type FirestoreRecord,
} from "./lib/firestore";

type SalonRecord = FirestoreRecord & { name: string; district?: string; city?: string; coverImageUrl?: string; averageRating?: number; reviewCount?: number; isFeatured?: boolean; isVerified?: boolean };
type ServiceRecord = FirestoreRecord & { name: string; slug?: string };
type StylistRecord = FirestoreRecord & { salonId: string; name: string; photoUrl?: string };
type SalonServiceRecord = FirestoreRecord & { salonId: string; serviceId: string; priceFrom?: number };
type SlotRecord = FirestoreRecord & { salonId: string; stylistId: string; serviceId: string; startsAt: { toDate: () => Date }; endsAt: { toDate: () => Date } };
type SalonView = SalonRecord & { area: string; tags: string[]; slots: SlotRecord[]; artist?: string; price?: string };

const inspirations = [
  { title: "Nude & doğal", detail: "Zamansız dokunuşlar", slug: "manikur", image: "photo-1610992015732-2449b76344bc" },
  { title: "Renkli bir gün", detail: "Ruh haline göre renkler", slug: "kalici-oje", image: "photo-1632345031435-8727f6897d53" },
  { title: "Minik sanat eserleri", detail: "Sana özel nail art", slug: "nail-art", image: "photo-1604654894610-df63bc536371" },
  { title: "Jel ile yepyeni", detail: "Güçlü ve zarif görünüm", slug: "jel-tirnak", image: "photo-1604908176997-125f25cc6f3d" },
];

function todayInputValue() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
}

function Logo() {
  return <a href="#top" className="logo-mark" aria-label="Tırnakçı ana sayfa"><span className="logo-symbol"><Flower2 size={21} strokeWidth={1.8} /></span><span>tırnakçı<span className="logo-dot">.</span></span></a>;
}

export default function Home() {
  const [mode, setMode] = useState<"availability" | "salon">("availability");
  const [salonRecords, setSalonRecords] = useState<SalonRecord[]>([]);
  const [serviceRecords, setServiceRecords] = useState<ServiceRecord[]>([]);
  const [stylistRecords, setStylistRecords] = useState<StylistRecord[]>([]);
  const [salonServiceRecords, setSalonServiceRecords] = useState<SalonServiceRecord[]>([]);
  const [slotRecords, setSlotRecords] = useState<SlotRecord[]>([]);
  const [loaded, setLoaded] = useState<Record<string, boolean>>({ salons: false, services: false, stylists: false, salonServices: false, availability: false });
  const [databaseError, setDatabaseError] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [area, setArea] = useState("Ankara");
  const [selectedDate, setSelectedDate] = useState(todayInputValue);
  const [selectedTime, setSelectedTime] = useState("Farketmez");
  const [queryText, setQueryText] = useState("");
  const [activeSalon, setActiveSalon] = useState<SalonView | null>(null);
  const [selectedSlotId, setSelectedSlotId] = useState("");
  const [selectedStylistId, setSelectedStylistId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [bookingError, setBookingError] = useState("");
  const [bookingBusy, setBookingBusy] = useState(false);
  const [bookingComplete, setBookingComplete] = useState(false);
  const [ownerModal, setOwnerModal] = useState(false);
  const [ownerComplete, setOwnerComplete] = useState(false);
  const [ownerBusy, setOwnerBusy] = useState(false);
  const [ownerError, setOwnerError] = useState("");
  const [salonName, setSalonName] = useState("");
  const [contactName, setContactName] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [district, setDistrict] = useState("");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [mobileMenu, setMobileMenu] = useState(false);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setDatabaseError("Firebase yapılandırması bulunamadı. .env.local dosyasını kontrol edin.");
      return;
    }

    const fail = (error: Error) => {
      console.error("Firestore bağlantı hatası:", error);
      setDatabaseError(error.message.includes("permission")
        ? "Firestore erişimi reddedildi. firestore.rules dosyasını Firebase projenize yayınlayın."
        : "Firestore verileri yüklenemedi. Firebase Console'da Cloud Firestore'un etkin olduğunu kontrol edin.");
    };
    const unsubs = [
      watchActiveCollection("salons", (data) => { setSalonRecords(data as SalonRecord[]); setLoaded((x) => ({ ...x, salons: true })); }, fail),
      watchActiveCollection("services", (data) => { setServiceRecords(data as ServiceRecord[]); setLoaded((x) => ({ ...x, services: true })); }, fail),
      watchActiveCollection("stylists", (data) => { setStylistRecords(data as StylistRecord[]); setLoaded((x) => ({ ...x, stylists: true })); }, fail),
      watchActiveCollection("salonServices", (data) => { setSalonServiceRecords(data as SalonServiceRecord[]); setLoaded((x) => ({ ...x, salonServices: true })); }, fail),
      watchAvailableSlots((data) => { setSlotRecords(data as SlotRecord[]); setLoaded((x) => ({ ...x, availability: true })); }, fail),
    ].filter(Boolean);
    return () => unsubs.forEach((unsubscribe) => unsubscribe?.());
  }, []);

  useEffect(() => {
    if (!serviceId && serviceRecords.length) setServiceId(serviceRecords[0].id);
  }, [serviceId, serviceRecords]);

  const serviceById = useMemo(() => new Map(serviceRecords.map((service) => [service.id, service])), [serviceRecords]);
  const availabilityFor = (salonId: string, filterService = serviceId) => slotRecords
    .filter((slot) => slot.salonId === salonId && (!filterService || slot.serviceId === filterService))
    .filter((slot) => {
      const startsAt = slot.startsAt?.toDate?.();
      if (!startsAt || startsAt < new Date()) return false;
      if (selectedDate && startsAt.toLocaleDateString("en-CA") !== selectedDate) return false;
      if (selectedTime === "Farketmez") return true;
      const hour = startsAt.getHours();
      if (selectedTime === "Sabah") return hour < 12;
      if (selectedTime === "Öğleden sonra") return hour >= 12 && hour < 18;
      return hour >= 18;
    })
    .sort((a, b) => a.startsAt.toDate().getTime() - b.startsAt.toDate().getTime());

  const visibleSalons = useMemo(() => salonRecords.map((salon): SalonView => {
    const salonServices = salonServiceRecords.filter((item) => item.salonId === salon.id);
    const tags = salonServices.map((item) => serviceById.get(item.serviceId)?.name).filter((name): name is string => Boolean(name));
    const slots = availabilityFor(salon.id);
    const firstStylist = stylistRecords.find((stylist) => stylist.salonId === salon.id);
    const priceFrom = salonServices.find((item) => item.serviceId === serviceId)?.priceFrom;
    return {
      ...salon,
      area: [salon.district, salon.city].filter(Boolean).join(" · ") || "Ankara",
      tags,
      slots,
      artist: firstStylist?.name,
      price: typeof priceFrom === "number" ? `₺${priceFrom}’den` : undefined,
    };
  }).filter((salon) => {
    const searchable = `${salon.name} ${salon.area} ${salon.artist ?? ""} ${salon.tags.join(" ")}`.toLocaleLowerCase("tr");
    const matchesText = searchable.includes(queryText.toLocaleLowerCase("tr"));
    const matchesArea = !area || area.toLocaleLowerCase("tr") === "ankara" || salon.area.toLocaleLowerCase("tr").includes(area.toLocaleLowerCase("tr"));
    return matchesText && matchesArea && (mode === "salon" || salon.slots.length > 0);
  }), [salonRecords, salonServiceRecords, serviceById, slotRecords, stylistRecords, serviceId, selectedDate, selectedTime, queryText, area, mode]);

  const isLoading = !databaseError && !Object.values(loaded).every(Boolean);
  const startOwnerApplication = () => { setOwnerComplete(false); setOwnerError(""); setOwnerModal(true); };

  const openBooking = (salon: SalonView) => {
    const nextSlot = salon.slots[0];
    setActiveSalon(salon);
        setSelectedSlotId(nextSlot?.id ?? "");
    setSelectedStylistId(nextSlot?.stylistId ?? "");
    setBookingComplete(false);
    setBookingError("");
    setCustomerName("");
    setCustomerPhone("");
  };

  const handleAppointmentSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeSalon) return;
    const slot = activeSalon.slots.find((item) => item.id === selectedSlotId);
    if (!slot) { setBookingError("Bu gün için uygun saat bulunamadı. Başka bir gün seçip tekrar deneyin."); return; }
    setBookingBusy(true);
    setBookingError("");
    try {
      await submitAppointment({
        salonId: activeSalon.id,
        stylistId: selectedStylistId || slot.stylistId,
        serviceId: slot.serviceId,
        availabilityId: slot.id,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        startsAt: slot.startsAt.toDate(),
        endsAt: slot.endsAt.toDate(),
      });
      setBookingComplete(true);
    } catch (error) {
      console.error(error);
      setBookingError("Randevu talebi kaydedilemedi. Firestore Rules ayarlarını ve bağlantıyı kontrol edin.");
    } finally { setBookingBusy(false); }
  };

  const handleOwnerSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setOwnerBusy(true);
    setOwnerError("");
    try {
      await submitSalonApplication({ salonName: salonName.trim(), contactName: contactName.trim(), phone: ownerPhone.trim(), district });
      setOwnerComplete(true);
    } catch (error) {
      console.error(error);
      setOwnerError("Başvurun kaydedilemedi. Firestore Rules ayarlarını ve bağlantıyı kontrol edin.");
    } finally { setOwnerBusy(false); }
  };

  const toggleFavorite = (id: string) => setFavorites((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);

    return (
    <main id="top">
      <div className="announcement"><Sparkles size={14} /><span>Ankara'nın güzellik randevusu, şimdi çok daha kolay.</span><a href="#salonlar">Keşfet <ArrowRight size={13} /></a></div>
      <header className="site-header wrap">
        <Logo />
        <nav className={`nav-links ${mobileMenu ? "nav-open" : ""}`}>
          <a href="#salonlar" onClick={() => setMobileMenu(false)}>Salonları keşfet</a><a href="#nasil-calisir" onClick={() => setMobileMenu(false)}>Nasıl çalışır?</a><a href="#ilham" onClick={() => setMobileMenu(false)}>İlham panosu</a>
        </nav>
        <div className="header-actions"><button className="owner-btn" onClick={startOwnerApplication}>Salonunu ekle <ArrowUpRight size={14} /></button><button className="menu-btn" onClick={() => setMobileMenu(!mobileMenu)} aria-label="Menüyü aç">{mobileMenu ? <X /> : <Menu />}</button></div>
      </header>

      <section className="hero wrap">
        <div className="hero-copy"><div className="eyebrow"><span className="eyebrow-line" /> ANKARA'DA GÜZELLİK, SENİN ZAMANINDA</div>
          <h1>Bakımlı hissetmek<br />iyi <span>gelir.</span></h1>
          <p>Şehrin tırnak stüdyolarını keşfet.<br className="desktop-only" /> Sana uyan uzmanı ve saati tek bir yerden bul.</p>
          <div className="hero-proof"><div className="avatar-stack"><span>🌸</span><span>💅</span><span>✨</span></div><div><b>Ankara'daki stüdyolar tek yerde</b><small>Gününü, hizmetini ve sana uygun uzmanı seç.</small></div></div>
        </div>
        <div className="hero-visual"><div className="hero-photo" /><div className="photo-wash" /><div className="hero-caption"><span className="caption-icon"><Sparkles size={16} /></span><div><b>Küçük bir dokunuş,</b><br /><span>kendine iyi bakmanın en güzel hali.</span></div></div><div className="floating-rating"><span className="rating-icon"><CalendarDays size={15} /></span><div><b>Sana uygun bir saat</b><span>Bir kaç adımda randevunu bul</span></div></div><span className="hero-stamp">kendine<br />bir iyilik<br /><i>yap ♡</i></span></div>
      </section>

      <section className="search-section wrap" aria-label="Randevu ara">
        <div className="search-panel">
          <div className="search-heading"><div><span className="eyebrow-mini">RANDEVUNU PLANLA</span><h2>Nasıl bir randevu arıyorsun?</h2></div><div className="search-step"><span>01</span><i /> Sana uygun olanı bul</div></div>
          <div className="mode-tabs"><button className={mode === "availability" ? "active" : ""} onClick={() => setMode("availability")}><CalendarDays size={16} />Uygun saat bul</button><button className={mode === "salon" ? "active" : ""} onClick={() => setMode("salon")}><Heart size={15} />Salonumu seçtim</button></div>
          <div className="search-fields">
            <label className="field"><span className="field-icon"><Sparkles size={17} /></span><span className="field-content"><small>HİZMET</small><select value={serviceId} onChange={(e) => setServiceId(e.target.value)}><option value="">Tüm hizmetler</option>{serviceRecords.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></span><ChevronDown size={15} className="field-chevron" /></label>
            {mode === "availability" ? <>
              <label className="field"><span className="field-icon"><MapPin size={17} /></span><span className="field-content"><small>NERESİ?</small><input value={area} onChange={(e) => setArea(e.target.value)} aria-label="Konum" /></span></label>
              <label className="field date-field"><span className="field-icon"><CalendarDays size={17} /></span><span className="field-content"><small>HANGİ GÜN?</small><input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} aria-label="Randevu günü" /></span></label>
              <label className="field time-field"><span className="field-icon"><Clock3 size={17} /></span><span className="field-content"><small>SAAT ARALIĞI</small><select value={selectedTime} onChange={(e) => setSelectedTime(e.target.value)}><option>Farketmez</option><option>Sabah</option><option>Öğleden sonra</option><option>Akşam</option></select></span><ChevronDown size={15} className="field-chevron" /></label>
            </> : <label className="field salon-search"><span className="field-icon"><Search size={17} /></span><span className="field-content"><small>SALON VEYA UZMAN</small><input value={queryText} onChange={(e) => setQueryText(e.target.value)} placeholder="Salon adı veya uzman ara" aria-label="Salon veya uzman ara" /></span></label>}
            <button className="search-button" onClick={() => document.getElementById("salonlar")?.scrollIntoView({ behavior: "smooth" })}><Search size={16} /><span>Salon bul</span></button>
          </div>
          {mode === "availability" && <div className="quick-times"><span>HIZLI SEÇİM</span>{["Farketmez", "Sabah", "Öğleden sonra", "Akşam"].map((item) => <button key={item} className={selectedTime === item ? "chosen" : ""} onClick={() => setSelectedTime(item)}>{item}</button>)}</div>}
        </div>
      </section>

      <section className="results-section wrap" id="salonlar">
        <div className="section-heading"><div><span className="eyebrow-mini">FIRESTORE'DAKİ AKTİF SALONLAR</span><h2>Şehrin favori stüdyoları<span className="heading-dot">.</span></h2><p className="section-sub">Ankara'da kendine ayıracağın bir sonraki güzel an.</p></div><button className="all-link" onClick={() => { setMode("salon"); setQueryText(""); }}>Salonları keşfet <ArrowRight size={15} /></button></div>
        <div className="result-toolbar"><div className="result-count"><span className="count-dot" />{isLoading ? "Salonlar yükleniyor" : `${visibleSalons.length} aktif stüdyo`} <span className="count-divider">·</span> {area || "Ankara"}</div><button className="filter-button" onClick={() => { setArea("Ankara"); setQueryText(""); }}><SlidersHorizontal size={15} /> Filtreleri temizle</button></div>
        {databaseError && <div className="db-status error-status"><span>!</span><div><b>Firestore bağlantısı kurulamadı</b><p>{databaseError}</p></div></div>}
        <div className="salon-grid">{visibleSalons.map((salon) => {
          const nextSlot = salon.slots[0];
          const salonInitials = salon.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
          return <article className="salon-card" key={salon.id}>
            <div className="salon-image-wrap">{salon.coverImageUrl ? <img className="salon-image" src={salon.coverImageUrl} alt={`${salon.name} stüdyosu`} /> : <div className="salon-image-placeholder"><Flower2 size={44} strokeWidth={1} /><span>{salonInitials}</span></div>}<span className="salon-badge">{salon.isFeatured ? <><Sparkles size={12} /> Öne çıkan</> : salon.isVerified ? <><BadgeCheck size={12} /> Doğrulanmış</> : <><MapPin size={12} /> Ankara</>}</span><button className={`favorite-btn ${favorites.includes(salon.id) ? "favorited" : ""}`} onClick={() => toggleFavorite(salon.id)} aria-label="Favorilere ekle"><Heart size={17} fill={favorites.includes(salon.id) ? "currentColor" : "none"} /></button><div className="image-gradient" /><div className="image-availability"><span><Clock3 size={12} /> {nextSlot ? "Müsait saat" : "Müsaitlik bekleniyor"}</span><b>{nextSlot ? nextSlot.startsAt.toDate().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }) : ""}</b></div></div>
            <div className="salon-content"><div className="salon-title-row"><div><div className="salon-name-line"><h3>{salon.name}</h3>{typeof salon.averageRating === "number" && <span className="rating"><Star size={12} fill="currentColor" />{salon.averageRating.toFixed(1)}</span>}</div><p className="salon-area"><MapPin size={13} />{salon.area}</p></div>{salon.price && <span className="salon-price">{salon.price}</span>}</div><div className="salon-tags">{salon.tags.length ? salon.tags.slice(0, 3).map((tag) => <span key={tag}>{tag}</span>) : <span>Hizmetler ekleniyor</span>}</div><div className="artist-row"><span className="artist-avatar">{salonInitials}</span><div><small>Uzman</small><b>{salon.artist || "Uzman bilgisi bekleniyor"}</b></div><button className="card-cta" onClick={() => openBooking(salon)} disabled={!salon.slots.length}>Saatleri gör <ArrowRight size={14} /></button></div></div>
          </article>;
        })}</div>
        {!databaseError && !isLoading && visibleSalons.length === 0 && <div className="empty-results"><span className="empty-flower"><Flower2 size={28} /></span><b>{salonRecords.length ? "Seçtiğin kriterlere uygun boş saat yok." : "Henüz kayıtlı salon yok."}</b><p>{salonRecords.length ? "Günü, hizmeti veya bölgeyi değiştirerek tekrar deneyebilirsin." : "İlk salon olduğunda burada görünür. Salon sahibiysen başvuru bırakabilirsin."}</p>{salonRecords.length === 0 && <button onClick={startOwnerApplication}>Salonunu ekle <ArrowRight size={14} /></button>}</div>}
        <div className="load-more"><span /> <button onClick={() => { setMode("salon"); setQueryText(""); }}>Tüm aktif salonları gör <ArrowDown size={14} /></button> <span /></div>
      </section>

      <section className="inspiration-section" id="ilham"><div className="wrap"><div className="inspiration-heading"><div><span className="eyebrow-mini">BUGÜN HANGİSİ SENSİN?</span><h2>Biraz <i>ilham</i> al.</h2><p>Beğendiğin stili bul, Ankara'da bu hizmeti sunan salonları keşfet.</p></div><div className="inspiration-note"><Sparkles size={16} /><span>Her gün kendine<br />yeni bir renk seç.</span></div></div><div className="inspiration-grid">{inspirations.map((item, index) => <button className={`inspiration-card inspiration-card-${index + 1}`} key={item.title} onClick={() => { const service = serviceRecords.find((record) => record.slug === item.slug); if (service) setServiceId(service.id); setMode("availability"); document.getElementById("salonlar")?.scrollIntoView({ behavior: "smooth" }); }}><img src={`https://images.unsplash.com/${item.image}?auto=format&fit=crop&w=760&q=85`} alt={item.title} /><span className="inspiration-shade" /><span className="inspiration-index">0{index + 1} / 04</span><span className="inspiration-copy"><small>{item.detail}</small><b>{item.title}</b></span><span className="inspiration-arrow"><ArrowUpRight size={17} /></span></button>)}</div><div className="inspiration-footer"><span>Kaydır ve favorini bul</span><div><span /><span /><span /><span /></div><span>ANKARA'DA SENİN İÇİN ♡</span></div></div></section>

      <section className="how-section" id="nasil-calisir"><div className="wrap how-inner"><div className="how-intro"><span className="eyebrow-mini">KENDİNE AYIRDIĞIN ZAMAN</span><h2>Güzellik randevun,<br /><i>üç küçük adımda.</i></h2><p>İyi hissetmek için plan yapmak artık çok kolay.</p><a href="#salonlar">Hemen keşfet <ArrowRight size={15} /></a></div><div className="steps"><div className="step-card"><span className="step-number">01</span><span className="step-icon"><Search size={20} /></span><h3>Keşfet</h3><p>Sana yakın salonları ve en sevdiğin hizmetleri incele.</p></div><div className="step-card"><span className="step-number">02</span><span className="step-icon"><CalendarDays size={20} /></span><h3>Saatini seç</h3><p>Sana uyan günü, saati ve nail artist'ini belirle.</p></div><div className="step-card"><span className="step-number">03</span><span className="step-icon"><Sparkles size={20} /></span><h3>Kendine iyi bak</h3><p>Randevuna git ve kendin için güzel bir anın tadını çıkar.</p></div></div></div></section>

      <section className="quote-section wrap"><div className="quote-mark">✳</div><div className="quote-content"><span className="eyebrow-mini">TIRNAKÇI'DA</span><blockquote>Güzel hissetmek için kendine ayırdığın zaman, <em>burada başlar.</em></blockquote><p className="brand-note">Ankara'daki stüdyoları, uzmanları ve müsait saatleri tek bir yerde buluşturuyoruz.</p></div><span className="quote-decoration">✿</span></section>

      <section className="cta-section wrap"><div><span className="eyebrow-mini">GÜZELLİK İŞLETMELERİNE</span><h2>Sen de Ankara'nın<br />favorileri arasına katıl.</h2><p>Salon bilgilerini gönder, ekibimiz başvurunu incelesin.</p><button onClick={startOwnerApplication}>Salonunu başvur <ArrowRight size={15} /></button></div><div className="cta-art"><div className="cta-orbit orbit-one" /><div className="cta-orbit orbit-two" /><span>n</span><Sparkles className="cta-spark" size={23} /></div></section>

      <footer className="footer"><div className="wrap"><div className="footer-main"><div className="footer-brand"><Logo /><p>Kendine ayırdığın güzel anlar<br />Ankara'da burada başlar.</p></div><div className="footer-col"><b>Keşfet</b><a href="#salonlar">Salonlar</a><a href="#ilham">Hizmetler</a><a href="#nasil-calisir">Nasıl çalışır?</a></div><div className="footer-col"><b>Tırnakçı</b><a href="#salonlar">Salon başvurusu</a><a href="#top">İletişim</a></div><div className="footer-note"><span>ANKARA'DA TASARLANDI ♡</span><p>Güzel hissetmek<br />herkesin hakkı.</p></div></div><div className="footer-bottom"><span>© 2026 Tırnakçı. Tüm hakları saklıdır.</span><div><a href="#top">Gizlilik</a><a href="#top">Kullanım koşulları</a></div><span>Sevgiyle Ankara'dan.</span></div></div></footer>

      {activeSalon && <div className="modal-backdrop" onClick={() => setActiveSalon(null)}><div className="booking-modal" onClick={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setActiveSalon(null)} aria-label="Kapat"><X size={19} /></button>{bookingComplete ? <div className="booking-success"><span><Check size={28} /></span><span className="eyebrow-mini">RANDEVU TALEBİN KAYDEDİLDİ</span><h2>Talebin salona<br />iletildi.</h2><p>{activeSalon.name}<br />Salon randevunu onayladığında seninle iletişime geçecek.</p><button onClick={() => setActiveSalon(null)}>Tamam <ArrowRight size={15} /></button></div> : <><span className="eyebrow-mini">RANDEVU TALEBİ</span><h2>{activeSalon.name}</h2><p className="modal-location"><MapPin size={14} />{activeSalon.area}</p><div className="modal-divider" /><form onSubmit={handleAppointmentSubmit}><label className="modal-label">HİZMET<select value={serviceId} onChange={(event) => { setServiceId(event.target.value); setSelectedSlotId(""); setSelectedStylistId(""); }} required>{activeSalon.tags.length === 0 && <option value="">Hizmet seç</option>}{salonServiceRecords.filter((item) => item.salonId === activeSalon.id).map((item) => <option key={item.serviceId} value={item.serviceId}>{serviceById.get(item.serviceId)?.name ?? "Hizmet"}</option>)}</select></label><label className="modal-label">GÜNÜNÜ SEÇ<input className="owner-input" type="date" min={todayInputValue()} value={selectedDate} onChange={(event) => { setSelectedDate(event.target.value); setSelectedSlotId(""); }} required /></label><label className="modal-label">UZMAN<select value={selectedStylistId} onChange={(event) => { setSelectedStylistId(event.target.value); setSelectedSlotId(""); }}><option value="">Müsait uzmana göre</option>{stylistRecords.filter((stylist) => stylist.salonId === activeSalon.id).map((stylist) => <option key={stylist.id} value={stylist.id}>{stylist.name}</option>)}</select></label><div className="modal-label">MÜSAİT SAATLER<div className="slot-list">{availabilityFor(activeSalon.id, serviceId).filter((slot) => !selectedStylistId || slot.stylistId === selectedStylistId).map((slot) => <button type="button" key={slot.id} className={selectedSlotId === slot.id ? "selected" : ""} onClick={() => setSelectedSlotId(slot.id)}>{slot.startsAt.toDate().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}</button>)}</div></div><label className="modal-label">ADIN SOYADIN<input className="owner-input" value={customerName} onChange={(event) => setCustomerName(event.target.value)} autoComplete="name" required minLength={2} maxLength={100} placeholder="Adın ve soyadın" /></label><label className="modal-label">TELEFON NUMARASI<input className="owner-input" value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} autoComplete="tel" type="tel" required minLength={10} maxLength={20} placeholder="05XX XXX XX XX" /></label>{bookingError && <p className="form-error">{bookingError}</p>}<button className="confirm-booking" type="submit" disabled={bookingBusy || !selectedSlotId}>{bookingBusy ? "Kaydediliyor…" : "Randevu talep et"} <ArrowRight size={16} /></button><small className="modal-footnote">Randevu talebin salon tarafından onaylanır.</small></form></>}</div></div>}

      {ownerModal && <div className="modal-backdrop" onClick={() => setOwnerModal(false)}><div className="booking-modal owner-modal" onClick={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setOwnerModal(false)} aria-label="Kapat"><X size={19} /></button>{ownerComplete ? <div className="booking-success"><span><Check size={28} /></span><span className="eyebrow-mini">BAŞVURUN FIRESTORE'A KAYDEDİLDİ</span><h2>Teşekkürler.</h2><p>Ekibimiz salon bilgilerini inceleyip seninle iletişime geçecek.</p><button onClick={() => setOwnerModal(false)}>Tamam <ArrowRight size={15} /></button></div> : <><span className="eyebrow-mini">ANKARA'DAKİ GÜZELLİK UZMANLARINA</span><h2>Salonunu ekle.</h2><p className="modal-location">Başvurun Firestore'a iletilsin, ekibimiz seninle iletişime geçsin.</p><div className="modal-divider" /><form onSubmit={handleOwnerSubmit}><label className="modal-label">SALON ADI<input className="owner-input" value={salonName} onChange={(event) => setSalonName(event.target.value)} required minLength={2} maxLength={100} placeholder="Salonunun adı" /></label><label className="modal-label">İLETİŞİM KİŞİSİ<input className="owner-input" value={contactName} onChange={(event) => setContactName(event.target.value)} required minLength={2} maxLength={100} autoComplete="name" placeholder="Adın ve soyadın" /></label><label className="modal-label">TELEFON NUMARASI<input className="owner-input" value={ownerPhone} onChange={(event) => setOwnerPhone(event.target.value)} required minLength={10} maxLength={20} autoComplete="tel" type="tel" placeholder="05XX XXX XX XX" /></label><label className="modal-label">İLÇE<select value={district} onChange={(event) => setDistrict(event.target.value)} required><option value="" disabled>İlçeni seç</option><option>Çankaya</option><option>Yenimahalle</option><option>Etimesgut</option><option>Keçiören</option><option>Mamak</option><option>Diğer</option></select></label>{ownerError && <p className="form-error">{ownerError}</p>}<button className="confirm-booking" type="submit" disabled={ownerBusy}>{ownerBusy ? "Gönderiliyor…" : "Başvuru gönder"} <ArrowRight size={16} /></button><small className="modal-footnote">Başvurun incelendikten sonra salon profili açılır.</small></form></>}</div></div>}
    </main>
  );
}
