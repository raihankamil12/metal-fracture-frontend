/* =====================================================================
   JB-SYS — Asset Management System | PT Jhonlin Baratama
   Sistem Pemantauan Siklus Hidup & Logistik Unit Cylinder Alat Berat
   Powered by Andalan Fluid Sistem
   ===================================================================== */
(function () {
  "use strict";

  /* ==================================================================
     1. KONSTANTA
     ================================================================== */

  var STORE_KEY = "jbsys.v3";
  var QR_PREFIX = "JB-";
  var CRITICAL_REPAIR = 3;      // >= 3x repair = unit kritis
  var REPAIR_WARN = 21;         // hari
  var REPAIR_BAD = 30;          // hari

  // Posisi pemasangan cylinder pada alat berat, mengikuti penamaan pada
  // form AFS Cylinder Condition Monitoring.
  var SLOTS = [
    "Outer Dump RH", "Outer Dump LH", "Inner Dump RH", "Inner Dump LH",
    "Jaw RH", "Jaw LH", "Cushion Hitch", "Steering RH", "Steering LH",
    "Boom RH", "Boom LH", "Arm", "Bucket",
    "Blade Lift RH", "Blade Lift LH", "Tilt", "Ripper",
    "Circle Shift", "Articulation", "Lain-lain"
  ];

  // Pemeriksaan kondisi cylinder rutin di lapangan (Cylinder Monitoring Condition)
  var TITIK_CEK = ["ROD", "HE", "CE", "General"];
  var SKOR = {
    "1": { label: "Cylinder OK",    singkat: "OK",        tone: "b-green",  warna: "var(--green)",  bg: "var(--green-bg)" },
    "2": { label: "Not Ideal",      singkat: "Not Ideal", tone: "b-cyan",   warna: "#0369A1",       bg: "var(--cyan-soft)" },
    "3": { label: "Need Attention", singkat: "Attention", tone: "b-amber",  warna: "var(--amber)",  bg: "var(--amber-bg)" },
    "4": { label: "Need Action",    singkat: "Action",    tone: "b-red",    warna: "var(--red)",    bg: "var(--red-bg)" }
  };
  var JEDA_CEK = 30;   // hari — di atas ini unit dianggap sudah waktunya dicek ulang

  // Titik pemeriksaan kondisi service (AFS Service Condition as per Inspection)
  var INSPEKSI = ["Rod / Wiper", "H/E", "Port H/E", "Flex H/E", "Port C/E", "Flex C/E", "Other"];
  var NILAI_INSPEKSI = ["Baik", "Perbaikan", "Ganti"];

  // Jenis pekerjaan perbaikan (AFS: RC = Recondition, WC = Warranty / Claim)
  var JENIS_REPAIR = [
    { v: "RC", l: "RC — Recondition (perbaikan berbayar)" },
    { v: "WC", l: "WC — Warranty Claim (klaim ke AFS)" }
  ];

  // ---- Status unit -------------------------------------------------
  var ST = {
    RFU:     { code: "RFU",    label: "STOK SIAP PAKAI",           tone: "b-green",  short: "Siap Pakai" },
    MCH:     { code: "MCH",    label: "DI ALAT BERAT",             tone: "b-blue",   short: "Operasional" },
    DMG:     { code: "DMG",    label: "RUSAK (KARANTINA)",         tone: "b-amber",  short: "Rusak" },
    DMG_PR:  { code: "DMG-PR", label: "RUSAK (SUDAH PR)",          tone: "b-amber",  short: "Sudah PR" },
    DMG_PO:  { code: "DMG-PO", label: "RUSAK (SUDAH PO)",          tone: "b-amber",  short: "Sudah PO" },
    RPR:     { code: "WIP",    label: "WORK IN PROGRESS (VENDOR)", tone: "b-orange", short: "WIP" },
    CLAIM:   { code: "CLAIM",  label: "KLAIM GARANSI KE AFS",      tone: "b-red",    short: "Klaim" },
    FIN:     { code: "FIN",    label: "SELESAI PERBAIKAN",         tone: "b-cyan",   short: "Siap Jemput" },
    OLD:     { code: "OLD",    label: "DI GUDANG (DATA LAMA)",     tone: "b-gray",   short: "Data Lama" },
    RETIRED: { code: "PSN",    label: "PENSIUN",                   tone: "b-gray",   short: "Pensiun" },
    SCRAP:   { code: "SCR",    label: "DIBUANG",                   tone: "b-gray",   short: "Dibuang" }
  };

  // ---- Jenis mutasi ------------------------------------------------
  var MT = {
    REGISTRASI:     "REGISTRASI AWAL",
    RILIS_PASANG:   "RILIS GUDANG → PASANG ALAT BERAT",
    TURUN_RUSAK:    "ALAT BERAT → GUDANG (RUSAK)",
    TERBIT_PR:      "PENERBITAN DOKUMEN PR",
    TERBIT_PO:      "PENERBITAN DOKUMEN PO",
    KIRIM_VENDOR:   "GUDANG → VENDOR PERBAIKAN",
    KIRIM_CLAIM:    "PENGAJUAN KLAIM GARANSI",
    ALAT_VENDOR:    "ALAT BERAT → VENDOR PERBAIKAN",
    SELESAI_REPAIR: "PENYELESAIAN PERBAIKAN",
    VENDOR_GUDANG:  "SELESAI PERBAIKAN → MASUK GUDANG",
    VENDOR_PASANG:  "SELESAI PERBAIKAN → PASANG ALAT BERAT",
    TRANSFER:       "TRANSFER ANTAR GUDANG",
    PENSIUN:        "PENSIUN / RETIRE",
    UPDATE_HM:      "PEMBARUAN HOUR METER",
    CEK_KONDISI:    "PENGECEKAN KONDISI CYLINDER",
    EDIT:           "PERUBAHAN DATA"
  };

  var MT_TONE = {};
  MT_TONE[MT.REGISTRASI] = "b-navy";
  MT_TONE[MT.RILIS_PASANG] = "b-blue";
  MT_TONE[MT.TURUN_RUSAK] = "b-amber";
  MT_TONE[MT.TERBIT_PR] = "b-cyan";
  MT_TONE[MT.TERBIT_PO] = "b-cyan";
  MT_TONE[MT.KIRIM_VENDOR] = "b-orange";
  MT_TONE[MT.KIRIM_CLAIM] = "b-red";
  MT_TONE[MT.UPDATE_HM] = "b-gray";
  MT_TONE[MT.CEK_KONDISI] = "b-cyan";
  MT_TONE[MT.ALAT_VENDOR] = "b-orange";
  MT_TONE[MT.SELESAI_REPAIR] = "b-green";
  MT_TONE[MT.VENDOR_GUDANG] = "b-green";
  MT_TONE[MT.VENDOR_PASANG] = "b-blue";
  MT_TONE[MT.TRANSFER] = "b-gray";
  MT_TONE[MT.PENSIUN] = "b-gray";
  MT_TONE[MT.EDIT] = "b-gray";

  var TL_ICON = {};
  TL_ICON[MT.REGISTRASI] = "box";
  TL_ICON[MT.RILIS_PASANG] = "machine";
  TL_ICON[MT.TURUN_RUSAK] = "warehouse";
  TL_ICON[MT.TERBIT_PR] = "doc";
  TL_ICON[MT.TERBIT_PO] = "doc";
  TL_ICON[MT.KIRIM_VENDOR] = "vendor";
  TL_ICON[MT.KIRIM_CLAIM] = "alert";
  TL_ICON[MT.UPDATE_HM] = "clock";
  TL_ICON[MT.CEK_KONDISI] = "clipboard";
  TL_ICON[MT.ALAT_VENDOR] = "vendor";
  TL_ICON[MT.SELESAI_REPAIR] = "checkCircle";
  TL_ICON[MT.VENDOR_GUDANG] = "warehouse";
  TL_ICON[MT.VENDOR_PASANG] = "machine";
  TL_ICON[MT.TRANSFER] = "warehouse";
  TL_ICON[MT.PENSIUN] = "archive";
  TL_ICON[MT.EDIT] = "edit";

  var ROLES = {
    ADMIN:      { label: "ADMIN",        desc: "Administrator sistem / IT / kepala bagian aset" },
    SUPERVISOR: { label: "SUPERVISOR",   desc: "Supervisor maintenance / produksi" },
    STAFF:      { label: "STAFF GUDANG", desc: "Petugas gudang / operator lapangan" }
  };

  /* ==================================================================
     2. IKON
     ================================================================== */

  var ICONS = {
    dashboard: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    product: '<path d="M12 2l9 5v10l-9 5-9-5V7z"/><path d="M3.3 7L12 12l8.7-5M12 12v10"/>',
    asset: '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="M3.3 7L12 12l8.7-5M12 22V12"/>',
    mutasi: '<path d="M7 16H3M3 16l3-3M3 16l3 3"/><path d="M17 8h4M21 8l-3-3M21 8l-3 3"/><path d="M7 8h10M17 16H7"/>',
    history: '<path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/><path d="M12 7v5l4 2"/>',
    repair: '<path d="M14.7 6.3a4 4 0 0 1-5.4 5.4L4 17v3h3l5.3-5.3a4 4 0 0 1 5.4-5.4l-2.6 2.6"/>',
    warehouse: '<path d="M3 21V9l9-6 9 6v12"/><path d="M9 21v-7h6v7"/><path d="M3 21h18"/>',
    machine: '<rect x="2" y="9" width="14" height="9" rx="1.5"/><path d="M16 12h3l3 3v3h-6z"/><circle cx="6" cy="20" r="1.8"/><circle cx="18" cy="20" r="1.8"/><path d="M5 9V6h7v3"/>',
    vendor: '<path d="M3 21h18M4 21V8l8-5 8 5v13"/><path d="M9 21v-5h6v5"/><path d="M9 11h.01M15 11h.01"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    qr: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM18 18h3v3h-3z"/>',
    camera: '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    edit: '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z"/>',
    trash: '<path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>',
    close: '<path d="M18 6L6 18M6 6l12 12"/>',
    check: '<path d="M20 6L9 17l-5-5"/>',
    checkCircle: '<circle cx="12" cy="12" r="10"/><path d="M8 12l3 3 5-6"/>',
    alert: '<path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5M12 15V3"/>',
    print: '<path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8" rx="1"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    back: '<path d="M19 12H5M11 18l-6-6 6-6"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/>',
    menu: '<path d="M3 12h18M3 6h18M3 18h18"/>',
    doc: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>',
    box: '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>',
    trashBin: '<path d="M3 6h18M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"/>',
    archive: '<rect x="2" y="4" width="20" height="5" rx="1"/><path d="M4 9v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9M10 13h4"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    money: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.6"/><path d="M6 12h.01M18 12h.01"/>',
    filter: '<path d="M22 3H2l8 9.5V19l4 2v-8.5z"/>',
    pin: '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
    refresh: '<path d="M3 2v6h6"/><path d="M21 12A9 9 0 0 0 6 5.3L3 8"/><path d="M21 22v-6h-6"/><path d="M3 12a9 9 0 0 0 15 6.7l3-2.7"/>',
    reset: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
    gauge: '<path d="M12 21a9 9 0 1 1 9-9"/><path d="M12 12l4.5-4.5"/><circle cx="12" cy="12" r="1.6"/><path d="M21 15l1 3M3 15l-1 3"/>',
    clipboard: '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M9 12h6M9 16h4"/>',
    photo: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8.5" cy="10" r="1.5"/><path d="M21 15l-5-5-6 6-3-3-4 4"/>'
  };

  function icon(name, cls) {
    return '<svg class="' + (cls || "") + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' + (ICONS[name] || "") + "</svg>";
  }

  /* ==================================================================
     3. UTILITAS
     ================================================================== */

  var BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  var HARI_MS = 86400000;

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function pad(n) { return n < 10 ? "0" + n : "" + n; }

  function fmtDate(ts) {
    var d = new Date(ts);
    return d.getDate() + " " + BULAN[d.getMonth()] + " " + d.getFullYear();
  }
  function fmtDateTime(ts) {
    var d = new Date(ts);
    return fmtDate(ts) + ", " + pad(d.getHours()) + "." + pad(d.getMinutes());
  }
  function fmtInputDate(ts) {
    var d = new Date(ts);
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }
  function fmtRp(n) {
    if (n == null || n === "" || isNaN(n)) return "—";
    return "Rp " + Number(n).toLocaleString("id-ID");
  }
  function daysBetween(a, b) {
    return Math.max(0, Math.floor((b - a) / HARI_MS));
  }
  function humanGap(ms) {
    var m = Math.floor(ms / 60000);
    if (m < 1) return "beberapa detik";
    if (m < 60) return m + " menit";
    var h = Math.floor(m / 60);
    if (h < 24) return h + " jam";
    var d = Math.floor(h / 24);
    if (d < 30) return d + " hari";
    var mo = Math.floor(d / 30);
    return mo + " bulan";
  }
  function durTone(days) {
    if (days > REPAIR_BAD) return "dur-bad";
    if (days > REPAIR_WARN) return "dur-warn";
    return "dur-ok";
  }
  function uid(p) {
    return (p || "id") + "-" + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
  }
  function byId(arr, id) {
    for (var i = 0; i < arr.length; i++) if (arr[i].id === id) return arr[i];
    return null;
  }
  function el(id) { return document.getElementById(id); }

  function toast(msg, kind) {
    var w = el("toasts");
    var t = document.createElement("div");
    t.className = "toast" + (kind ? " " + kind : "");
    var ic = kind === "err" ? "alert" : (kind === "info" ? "info" : "checkCircle");
    var col = kind === "err" ? "var(--red)" : (kind === "info" ? "var(--cyan)" : "var(--green)");
    t.innerHTML = '<span style="color:' + col + '">' + icon(ic) + "</span><span>" + esc(msg) + "</span>";
    w.appendChild(t);
    setTimeout(function () {
      t.style.transition = "opacity .25s, transform .25s";
      t.style.opacity = "0"; t.style.transform = "translateX(20px)";
      setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 260);
    }, 3200);
  }

  /* ==================================================================
     4. PENYIMPANAN DATA
     ================================================================== */

  var DB = null;
  var SESSION = null;

  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(DB)); }
    catch (e) { console.warn("Gagal menyimpan:", e); }
  }
  function load() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { console.warn("Data rusak, memuat ulang contoh."); }
    return null;
  }
  function resetData() {
    localStorage.removeItem(STORE_KEY);
    localStorage.removeItem(STORE_KEY + ".session");
    location.reload();
  }

  /* ---------------- DATA CONTOH (seed) ---------------- */
  function seed() {
    var now = Date.now();
    function ago(days, h, m) {
      var d = new Date(now - days * HARI_MS);
      d.setHours(h == null ? 9 : h, m == null ? 0 : m, 0, 0);
      return d.getTime();
    }

    var db = {
      users: [
        { id: "u1", nama: "Administrator", email: "admin@jbs.co.id", password: "jbsys123", role: "ADMIN", aktif: true },
        { id: "u2", nama: "Rudi Hartono", email: "spv@jbs.co.id", password: "jbsys123", role: "SUPERVISOR", aktif: true },
        { id: "u3", nama: "Ahmad Subarjo", email: "gudang@jbs.co.id", password: "jbsys123", role: "STAFF", aktif: true }
      ],
      gudangs: [
        { id: "g1", kode: "GDG-BTL", nama: "Gudang Utama Batulicin", area: "Workshop Pusat", keterangan: "Gudang induk komponen hidrolik, rak siap pakai", karantina: false },
        { id: "g2", kode: "GDG-KRT", nama: "Area Karantina Rusak", area: "Workshop Pusat – Blok C", keterangan: "Khusus unit rusak menunggu PR/PO dan pengiriman vendor", karantina: true },
        { id: "g3", kode: "GDG-PIT", nama: "Gudang Site Pit Kusan", area: "Pit Kusan – Pos Logistik", keterangan: "Stok penyangga untuk penggantian cepat di lapangan", karantina: false }
      ],
      alats: [
        { id: "m1", kode: "E-2401", nama: "EX-2401 Excavator PC2000-8", departemen: "Produksi – Loading", lokasi: "Pit Kusan Blok A", hmu: 26480, spesifikasi: "Bucket 12 m³, operasi 2 shift, 20 jam/hari" },
        { id: "m2", kode: "E-2402", nama: "EX-2402 Excavator PC1250-8", departemen: "Produksi – Loading", lokasi: "Pit Kusan Blok B", hmu: 19240, spesifikasi: "Bucket 6,7 m³, operasi 2 shift" },
        { id: "m3", kode: "H-7815", nama: "HD-7815 Dump Truck HD785-7", departemen: "Hauling", lokasi: "Hauling Road KM-12", hmu: 23456, spesifikasi: "Kapasitas 91 ton, siklus hauling 14 km" },
        { id: "m4", kode: "D-8509", nama: "DZ-8509 Bulldozer D85ESS-2", departemen: "Produksi – Dozing", lokasi: "Disposal Area 3", hmu: 15870, spesifikasi: "Dozing overburden, blade semi-U" },
        { id: "m5", kode: "G-0825", nama: "GD-0825 Motor Grader GD825A-2", departemen: "Road Maintenance", lokasi: "Hauling Road KM-08", hmu: 11320, spesifikasi: "Perawatan jalan angkut utama" }
      ],
      vendors: [
        { id: "v1", kode: "AFS-01", nama: "PT Andalan Fluid Sistem", telepon: "0511-6749226", email: "service@andalanfluids.com", alamat: "Jl. Trans Kalimantan KM 12, Banjarmasin, Kalimantan Selatan" },
        { id: "v2", kode: "BMT-02", nama: "PT Borneo Mandiri Teknik", telepon: "0518-771450", email: "workshop@borneomt.co.id", alamat: "Jl. Raya Batulicin KM 5, Tanah Bumbu, Kalimantan Selatan" }
      ],
      products: [
        { id: "p1", kode: "BOOM-PC20", nama: "Boom Cylinder PC2000", jenis: "", tjo: 4000, dimensi: "Ø 200 mm × stroke 1.850 mm", catatan: "Sepasang per unit (LH & RH)" },
        { id: "p2", kode: "ARM-PC20", nama: "Arm Cylinder PC2000", jenis: "", tjo: 4000, dimensi: "Ø 220 mm × stroke 2.100 mm", catatan: "" },
        { id: "p3", kode: "BKT-PC12", nama: "Bucket Cylinder PC1250", jenis: "", tjo: 3500, dimensi: "Ø 180 mm × stroke 1.450 mm", catatan: "" },
        { id: "p4", kode: "HST-HD78", nama: "Hoist Cylinder HD785", jenis: "", tjo: 3000, dimensi: "Ø 160 mm × stroke 1.200 mm", catatan: "Dipasang kiri dan kanan vessel" },
        { id: "p5", kode: "BLD-D85", nama: "Blade Lift Cylinder D85", jenis: "", tjo: 2500, dimensi: "Ø 140 mm × stroke 900 mm", catatan: "" },
        { id: "p6", kode: "STR-GD82", nama: "Steering Cylinder GD825", jenis: "", tjo: 2000, dimensi: "Ø 90 mm × stroke 420 mm", catatan: "" }
      ],
      assets: [], mutasis: [], repairs: [], ceks: [], seq: { log: 0 }
    };

    // ---- pembuat log -------------------------------------------------
    function log(ts, assetId, aksi, from, to, opt) {
      opt = opt || {};
      db.seq.log += 1;
      db.mutasis.push({
        id: uid("mt"), logId: "LOG-" + pad(db.seq.log) + pad(0),
        ts: ts, assetId: assetId, aksi: aksi,
        dariLabel: from, keLabel: to,
        slot: opt.slot || "", dokumen: opt.dok || "",
        wo: opt.wo || "", hm: opt.hm == null ? "" : opt.hm,
        catatan: opt.note || "", pic: opt.pic || "Administrator"
      });
    }

    function mk(o) {
      var a = {
        id: o.id, sn: o.sn, qr: QR_PREFIX + o.sn, productId: o.productId,
        tipe: o.tipe || "Hydraulic Cylinder", status: o.status,
        lokasiTipe: o.lokasiTipe, lokasiId: o.lokasiId, slot: o.slot || "",
        siklusPakai: o.siklusPakai || 0, siklusRepair: o.siklusRepair || 0,
        noPR: o.noPR || "", noPO: o.noPO || "",
        wo: o.wo || "", jenisRepair: o.jenisRepair || "",
        hmInstall: o.hmInstall || 0, jjo: o.jjo || 0,
        deskripsi: o.deskripsi || "", catatan: o.catatan || "",
        createdAt: o.createdAt
      };
      db.assets.push(a);
      return a;
    }

    var PR = function (n) { return "PR-025-001-" + pad(n) + "0"; };
    var PO = function (n) { return "PO-025-114-" + pad(n) + "0"; };

    /* --- 5 unit siap pakai di gudang --- */
    [["a1", "CYL-BOOM-001", "p1", 96], ["a2", "CYL-BOOM-002", "p1", 96],
     ["a3", "CYL-ARM-004", "p2", 88], ["a4", "CYL-HST-011", "p4", 74],
     ["a5", "CYL-BLD-021", "p5", 60]].forEach(function (r, i) {
      var t = ago(r[3], 8, 15 + i);
      mk({ id: r[0], sn: r[1], productId: r[2], status: "RFU", lokasiTipe: "GUDANG",
           lokasiId: i === 4 ? "g3" : "g1", siklusPakai: i < 2 ? 1 : 0, siklusRepair: 0,
           createdAt: t, deskripsi: "Unit baru pengadaan 2025" });
      log(t, r[0], MT.REGISTRASI, "Initial", i === 4 ? "Gudang Site Pit Kusan" : "Gudang Utama Batulicin");
    });
    // dua di antaranya pernah dipakai lalu kembali
    log(ago(70, 7, 30), "a1", MT.RILIS_PASANG, "Gudang Utama Batulicin", "EX-2401 Excavator PC2000-8", { slot: "Boom LH", hm: 21450 });
    log(ago(34, 16, 10), "a1", MT.TURUN_RUSAK, "EX-2401 Excavator PC2000-8", "Area Karantina Rusak", { note: "Rembes seal rod, tekanan turun" });
    log(ago(33, 9, 5), "a1", MT.KIRIM_VENDOR, "Area Karantina Rusak", "PT Andalan Fluid Sistem", { dok: PR(1) });
    log(ago(12, 15, 40), "a1", MT.SELESAI_REPAIR, "PT Andalan Fluid Sistem", "PT Andalan Fluid Sistem", { dok: PO(1), note: "Rechrome rod + ganti seal kit lengkap" });
    log(ago(11, 8, 20), "a1", MT.VENDOR_GUDANG, "PT Andalan Fluid Sistem", "Gudang Utama Batulicin");
    byId(db.assets, "a1").siklusRepair = 1;
    db.repairs.push({ id: uid("rp"), assetId: "a1", vendorId: "v1", noPR: PR(1), noPO: PO(1),
      wo: "WO-69055", jenisRepair: "RC",
      inspeksi: { "Rod / Wiper": "Ganti", "H/E": "Baik", "Port H/E": "Baik", "Flex C/E": "Perbaikan" },
      biaya: 28500000, tglMasuk: ago(33, 9, 5), tglKeluar: ago(12, 15, 40),
      deskripsi: "Rechrome rod Ø200 mm, ganti seal kit lengkap, uji tekan 350 bar", status: "SELESAI" });
    byId(db.assets, "a1").wo = "WO-69055";
    byId(db.assets, "a1").jenisRepair = "RC";

    /* --- 4 unit terpasang di alat berat --- */
    // [id, sn, produk, alat, posisi, umur(hari), siklusRepair, HM install, WO]
    [["a6", "CYL-BOOM-003", "p1", "m1", "Boom RH", 102, 2, 22600, "WO-69041"],
     ["a7", "CYL-ARM-005", "p2", "m2", "Arm", 95, 1, 16100, "WO-69018"],
     ["a8", "CYL-HST-012", "p4", "m3", "Outer Dump RH", 80, 0, 21800, ""],
     ["a9", "CYL-STR-031", "p6", "m5", "Steering RH", 66, 0, 9800, ""]].forEach(function (r) {
      var t = ago(r[5], 8, 40);
      mk({ id: r[0], sn: r[1], productId: r[2], status: "MCH", lokasiTipe: "ALAT",
           lokasiId: r[3], slot: r[4], siklusPakai: r[6] + 1, siklusRepair: r[6],
           hmInstall: r[7], wo: r[8], jenisRepair: r[8] ? "RC" : "", createdAt: t });
      log(t, r[0], MT.REGISTRASI, "Initial", "Gudang Utama Batulicin");
      log(ago(r[5] - 45, 10, 20), r[0], MT.RILIS_PASANG, "Gudang Utama Batulicin",
        byId(db.alats, r[3]).nama, { slot: r[4], hm: r[7], wo: r[8], pic: "Ahmad Subarjo" });
    });

    /* --- 1 unit rusak di karantina, belum PR --- */
    var t10 = ago(58, 9, 10);
    mk({ id: "a10", sn: "CYL-BKT-041", productId: "p3", status: "DMG", lokasiTipe: "GUDANG",
         lokasiId: "g2", siklusPakai: 1, siklusRepair: 0, createdAt: t10 });
    log(t10, "a10", MT.REGISTRASI, "Initial", "Gudang Utama Batulicin");
    log(ago(50, 7, 45), "a10", MT.RILIS_PASANG, "Gudang Utama Batulicin", "EX-2402 Excavator PC1250-8", { slot: "Bucket", hm: 17900, pic: "Ahmad Subarjo" });
    log(ago(6, 17, 25), "a10", MT.TURUN_RUSAK, "EX-2402 Excavator PC1250-8", "Area Karantina Rusak",
      { note: "Rod bengkok akibat benturan material, bocor pada gland", pic: "Ahmad Subarjo" });

    /* --- 1 unit sudah PR, menunggu PO --- */
    var t11 = ago(120, 9, 0);
    mk({ id: "a11", sn: "CYL-BLD-022", productId: "p5", status: "DMG_PR", lokasiTipe: "GUDANG",
         lokasiId: "g2", siklusPakai: 2, siklusRepair: 1, noPR: PR(4), createdAt: t11 });
    log(t11, "a11", MT.REGISTRASI, "Initial", "Gudang Utama Batulicin");
    log(ago(100, 8, 10), "a11", MT.RILIS_PASANG, "Gudang Utama Batulicin", "DZ-8509 Bulldozer D85ESS-2", { slot: "Blade Lift LH", hm: 13200 });
    log(ago(15, 16, 50), "a11", MT.TURUN_RUSAK, "DZ-8509 Bulldozer D85ESS-2", "Area Karantina Rusak",
      { note: "Blade lift lemah, internal leak", pic: "Ahmad Subarjo" });
    log(ago(4, 10, 30), "a11", MT.TERBIT_PR, "Area Karantina Rusak", "Plotting PR", { dok: PR(4), pic: "Rudi Hartono" });

    /* --- 2 unit sedang di vendor --- */
    var t12 = ago(140, 9, 20);
    mk({ id: "a12", sn: "CYL-BOOM-006", productId: "p1", status: "RPR", lokasiTipe: "VENDOR",
         lokasiId: "v1", siklusPakai: 3, siklusRepair: 2, noPR: PR(2), noPO: PO(2), createdAt: t12 });
    log(t12, "a12", MT.REGISTRASI, "Initial", "Gudang Utama Batulicin");
    log(ago(130, 8, 0), "a12", MT.RILIS_PASANG, "Gudang Utama Batulicin", "EX-2401 Excavator PC2000-8", { slot: "Boom RH", hm: 20900 });
    log(ago(58, 15, 30), "a12", MT.TURUN_RUSAK, "EX-2401 Excavator PC2000-8", "Area Karantina Rusak", { note: "Cylinder drift, seal aus" });
    log(ago(56, 9, 40), "a12", MT.TERBIT_PR, "Area Karantina Rusak", "Plotting PR", { dok: PR(2), pic: "Rudi Hartono" });
    log(ago(53, 11, 15), "a12", MT.TERBIT_PO, "Area Karantina Rusak", "Plotting PO", { dok: PO(2), pic: "Rudi Hartono" });
    log(ago(51, 8, 4), "a12", MT.KIRIM_VENDOR, "Area Karantina Rusak", "PT Andalan Fluid Sistem", { dok: PO(2) });
    db.repairs.push({ id: uid("rp"), assetId: "a12", vendorId: "v1", noPR: PR(2), noPO: PO(2),
      wo: "", jenisRepair: "RC", inspeksi: null,
      biaya: null, tglMasuk: ago(51, 8, 4), tglKeluar: null,
      deskripsi: "Rechrome rod dan penggantian seal kit", status: "BERLANGSUNG" });

    var t13 = ago(150, 10, 0);
    mk({ id: "a13", sn: "CYL-HST-013", productId: "p4", status: "RPR", lokasiTipe: "VENDOR",
         lokasiId: "v2", siklusPakai: 2, siklusRepair: 1, noPR: PR(3), noPO: PO(3), createdAt: t13 });
    log(t13, "a13", MT.REGISTRASI, "Initial", "Gudang Utama Batulicin");
    log(ago(140, 8, 30), "a13", MT.RILIS_PASANG, "Gudang Utama Batulicin", "HD-7815 Dump Truck HD785-7", { slot: "Outer Dump LH", hm: 20100 });
    log(ago(20, 14, 5), "a13", MT.ALAT_VENDOR, "HD-7815 Dump Truck HD785-7", "PT Borneo Mandiri Teknik", { dok: PO(3), note: "Dikirim langsung, dokumen sudah siap" });
    db.repairs.push({ id: uid("rp"), assetId: "a13", vendorId: "v2", noPR: PR(3), noPO: PO(3),
      wo: "", jenisRepair: "RC", inspeksi: null,
      biaya: null, tglMasuk: ago(20, 14, 5), tglKeluar: null,
      deskripsi: "Ganti seal kit dan honing tube", status: "BERLANGSUNG" });

    /* --- 1 unit selesai perbaikan, siap dijemput --- */
    var t14 = ago(160, 9, 30);
    mk({ id: "a14", sn: "CYL-ARM-007", productId: "p2", status: "FIN", lokasiTipe: "VENDOR",
         lokasiId: "v1", siklusPakai: 2, siklusRepair: 2, noPR: PR(5), noPO: PO(5), createdAt: t14 });
    log(t14, "a14", MT.REGISTRASI, "Initial", "Gudang Utama Batulicin");
    log(ago(150, 8, 0), "a14", MT.RILIS_PASANG, "Gudang Utama Batulicin", "EX-2401 Excavator PC2000-8", { slot: "Arm", hm: 19800 });
    log(ago(30, 16, 40), "a14", MT.TURUN_RUSAK, "EX-2401 Excavator PC2000-8", "Area Karantina Rusak", { note: "Bocor pada rod seal" });
    log(ago(27, 9, 25), "a14", MT.KIRIM_VENDOR, "Area Karantina Rusak", "PT Andalan Fluid Sistem", { dok: PR(5) });
    log(ago(2, 14, 10), "a14", MT.SELESAI_REPAIR, "PT Andalan Fluid Sistem", "PT Andalan Fluid Sistem",
      { dok: PO(5), note: "Ganti seal kit, uji tekan 350 bar – lulus" });
    db.repairs.push({ id: uid("rp"), assetId: "a14", vendorId: "v1", noPR: PR(5), noPO: PO(5),
      wo: "WO-69077", jenisRepair: "RC",
      inspeksi: { "Rod / Wiper": "Ganti", "H/E": "Baik", "Port C/E": "Baik", "Other": "Baik" },
      biaya: 16750000, tglMasuk: ago(27, 9, 25), tglKeluar: ago(2, 14, 10),
      deskripsi: "Ganti seal kit lengkap, uji tekan 350 bar – lulus", status: "SELESAI" });
    byId(db.assets, "a14").wo = "WO-69077";
    byId(db.assets, "a14").jenisRepair = "RC";

    /* --- 1 unit pensiun (kritis, 4x repair) --- */
    var t15 = ago(400, 9, 0);
    mk({ id: "a15", sn: "CYL-BKT-042", productId: "p3", status: "RETIRED", lokasiTipe: "NONE",
         lokasiId: "", siklusPakai: 5, siklusRepair: 4, createdAt: t15,
         catatan: "Total biaya perbaikan mendekati harga unit baru" });
    log(t15, "a15", MT.REGISTRASI, "Initial", "Gudang Utama Batulicin");
    log(ago(18, 11, 0), "a15", MT.PENSIUN, "Gudang Utama Batulicin", "Pensiun / Arsip",
      { note: "Siklus repair 4×, tube sudah oversize – tidak layak diperbaiki lagi", pic: "Rudi Hartono" });
    db.repairs.push({ id: uid("rp"), assetId: "a15", vendorId: "v2", noPR: PR(6), noPO: PO(6),
      wo: "WO-68930", jenisRepair: "RC",
      inspeksi: { "Rod / Wiper": "Ganti", "H/E": "Ganti", "Flex H/E": "Ganti" },
      biaya: 41200000, tglMasuk: ago(90, 9, 0), tglKeluar: ago(48, 15, 0),
      deskripsi: "Rechrome + oversize piston, hasil kurang optimal", status: "SELESAI" });
    byId(db.assets, "a15").wo = "WO-68930";

    /* --- 1 unit diklaim garansi ke AFS --- */
    var t17 = ago(210, 8, 30);
    mk({ id: "a17", sn: "CYL-BOOM-008", productId: "p1", status: "CLAIM", lokasiTipe: "VENDOR",
         lokasiId: "v1", siklusPakai: 1, siklusRepair: 0, jenisRepair: "WC",
         createdAt: t17, catatan: "Bocor pada 420 jam operasi, jauh di bawah TJO 4.000 jam" });
    log(t17, "a17", MT.REGISTRASI, "Initial", "Gudang Utama Batulicin");
    log(ago(64, 7, 50), "a17", MT.RILIS_PASANG, "Gudang Utama Batulicin", "EX-2402 Excavator PC1250-8",
      { slot: "Boom LH", hm: 18400, pic: "Ahmad Subarjo" });
    log(ago(9, 16, 15), "a17", MT.TURUN_RUSAK, "EX-2402 Excavator PC1250-8", "Area Karantina Rusak",
      { hm: 18820, note: "Bocor pada rod seal, baru 420 jam operasi", pic: "Ahmad Subarjo" });
    log(ago(7, 10, 5), "a17", MT.KIRIM_CLAIM, "Area Karantina Rusak", "PT Andalan Fluid Sistem",
      { dok: "WC-025-0011", note: "Klaim garansi: gagal jauh di bawah target jam operasi", pic: "Rudi Hartono" });
    db.repairs.push({ id: uid("rp"), assetId: "a17", vendorId: "v1", noPR: "", noPO: "",
      wo: "WC-025-0011", jenisRepair: "WC", inspeksi: null,
      biaya: null, tglMasuk: ago(7, 10, 5), tglKeluar: null,
      deskripsi: "Klaim garansi — kebocoran seal pada 420 jam operasi", status: "BERLANGSUNG" });

    /* --- 1 unit hasil pendataan awal (data lama) --- */
    var t16 = ago(45, 13, 20);
    mk({ id: "a16", sn: "CYL-STR-032", productId: "p6", status: "OLD", lokasiTipe: "GUDANG",
         lokasiId: "g1", siklusPakai: 0, siklusRepair: 0, createdAt: t16,
         catatan: "Hasil pendataan awal, riwayat sebelumnya belum lengkap" });
    log(t16, "a16", MT.REGISTRASI, "Initial", "Gudang Utama Batulicin", { note: "Pendataan awal stok existing" });

    /* --- riwayat pengecekan kondisi cylinder --- */
    // Memperlihatkan perkembangan kondisi dari waktu ke waktu:
    // semula seluruh titik OK, lalu rod mulai tidak ideal, hingga rembes.
    function cek(hari, jam, assetId, alatId, slot, hmu, nilai, catatan, pic) {
      db.ceks.push({
        id: uid("ck"), assetId: assetId, ts: ago(hari, jam, 30),
        alatId: alatId, alatNama: (byId(db.alats, alatId) || {}).nama || "", slot: slot,
        wo: (byId(db.assets, assetId) || {}).wo || "",
        hmu: hmu, nilai: nilai, catatan: catatan || "", foto: null,
        pic: pic || "Ahmad Subarjo"
      });
      log(ago(hari, jam, 30), assetId, MT.CEK_KONDISI,
        (byId(db.alats, alatId) || {}).nama || "-", (byId(db.alats, alatId) || {}).nama || "-",
        { slot: slot, hm: hmu, pic: pic || "Ahmad Subarjo",
          note: Object.keys(nilai).map(function (k) { return k + ":" + nilai[k]; }).join(" · ") +
            (catatan ? " — " + catatan : "") });
    }

    // CYL-BOOM-003 pada EX-2401 — kondisi menurun bertahap
    cek(21, 8, "a6", "m1", "Boom RH", 25800, { ROD: 1, HE: 1, CE: 1, General: 1 },
      "Pemeriksaan rutin, seluruh titik normal");
    cek(14, 8, "a6", "m1", "Boom RH", 26050, { ROD: 2, HE: 1, CE: 1, General: 1 },
      "Rod mulai tampak baret halus, belum ada rembesan");
    cek(7, 9, "a6", "m1", "Boom RH", 26310, { ROD: 3, HE: 1, CE: 2, General: 2 },
      "Rembes tipis pada rod sisi bawah, mulai menetes saat boom diturunkan. Perlu dijadwalkan penggantian seal.");

    // CYL-ARM-005 pada EX-2402 — normal
    cek(10, 10, "a7", "m2", "Arm", 19100, { ROD: 1, HE: 1, CE: 1, General: 1 },
      "Kondisi baik, tidak ada temuan");

    // CYL-HST-012 pada HD-7815 — sudah lewat jadwal pengecekan
    cek(41, 14, "a8", "m3", "Outer Dump RH", 22900, { ROD: 1, HE: 2, CE: 1, General: 1 },
      "Sedikit basah pada head end, dipantau pada pengecekan berikutnya");

    // CYL-STR-031 pada GD-0825 sengaja belum pernah dicek

    // Lekatkan nomor WO yang berlaku pada saat tiap kejadian terjadi:
    // WO dari perbaikan tuntas terakhir sebelum waktu kejadian tersebut.
    db.mutasis.forEach(function (m) {
      if (m.wo) return;
      var pakai = null;
      db.repairs.forEach(function (r) {
        if (r.assetId !== m.assetId || r.status !== "SELESAI" || !r.wo || !r.tglKeluar) return;
        if (r.tglKeluar <= m.ts && (!pakai || r.tglKeluar > pakai.tglKeluar)) pakai = r;
      });
      if (pakai) m.wo = pakai.wo;
    });

    db.mutasis.sort(function (x, y) { return x.ts - y.ts; });
    db.mutasis.forEach(function (m, i) { m.logId = "LOG-" + pad(Math.floor((i + 1) / 100)) + pad((i + 1) % 100); });
    db.seq.log = db.mutasis.length;
    return db;
  }

  /* ==================================================================
     5. HELPER DOMAIN
     ================================================================== */

  function prod(a) { return byId(DB.products, a.productId) || { nama: "—", kode: "—", jenis: "", dimensi: "" }; }
  function stat(a) { return ST[a.status] || ST.RFU; }

  function lokasiLabel(a) {
    if (a.lokasiTipe === "GUDANG") { var g = byId(DB.gudangs, a.lokasiId); return g ? g.nama : "—"; }
    if (a.lokasiTipe === "ALAT") { var m = byId(DB.alats, a.lokasiId); return m ? m.nama : "—"; }
    if (a.lokasiTipe === "VENDOR") { var v = byId(DB.vendors, a.lokasiId); return v ? v.nama : "—"; }
    return "—";
  }
  function lokasiIcon(a) {
    if (a.lokasiTipe === "GUDANG") return "warehouse";
    if (a.lokasiTipe === "ALAT") return "machine";
    if (a.lokasiTipe === "VENDOR") return "vendor";
    return "archive";
  }
  function assetMutasis(id) {
    return DB.mutasis.filter(function (m) { return m.assetId === id; })
      .sort(function (a, b) { return b.ts - a.ts; });
  }
  function activeRepair(assetId) {
    for (var i = 0; i < DB.repairs.length; i++)
      if (DB.repairs[i].assetId === assetId && DB.repairs[i].status === "BERLANGSUNG") return DB.repairs[i];
    return null;
  }
  // Perbaikan terakhir apa pun statusnya — dipakai untuk unit berstatus SELESAI PERBAIKAN
  // yang masih berada di vendor (menunggu dijemput), karena repair-nya sudah tidak aktif.
  function lastRepair(assetId) {
    var best = null;
    for (var i = 0; i < DB.repairs.length; i++) {
      var r = DB.repairs[i];
      if (r.assetId !== assetId) continue;
      if (!best || r.tglMasuk > best.tglMasuk) best = r;
    }
    return best;
  }
  function isAktif(a) { return a.status !== "RETIRED" && a.status !== "SCRAP"; }

  function countGudang(gid) {
    return DB.assets.filter(function (a) { return a.lokasiTipe === "GUDANG" && a.lokasiId === gid && isAktif(a); }).length;
  }
  function countAlat(mid) {
    return DB.assets.filter(function (a) { return a.lokasiTipe === "ALAT" && a.lokasiId === mid; }).length;
  }
  function countVendor(vid) {
    return DB.assets.filter(function (a) { return a.lokasiTipe === "VENDOR" && a.lokasiId === vid; }).length;
  }
  function distProduk(pid) {
    // TOTAL  seluruh unit model ini
    // RFU    siap pakai di gudang
    // MCH    terpasang di alat berat
    // DMG    rusak di gudang (belum ada PR, atau PO sudah terbit & siap kirim)
    // WPO    rusak menunggu terbitnya PO
    // CLAIM  diklaim garansi ke AFS
    // WIP    sedang dikerjakan di vendor / selesai menunggu dijemput
    var d = { TOTAL: 0, RFU: 0, MCH: 0, DMG: 0, WPO: 0, CLAIM: 0, WIP: 0, LAIN: 0 };
    DB.assets.forEach(function (a) {
      if (a.productId !== pid) return;
      d.TOTAL++;
      if (a.status === "RFU" || a.status === "OLD") d.RFU++;
      else if (a.status === "MCH") d.MCH++;
      else if (a.status === "DMG" || a.status === "DMG_PO") d.DMG++;
      else if (a.status === "DMG_PR") d.WPO++;
      else if (a.status === "CLAIM") d.CLAIM++;
      else if (a.status === "RPR" || a.status === "FIN") d.WIP++;
      else d.LAIN++;
    });
    return d;
  }
  // Kotak distribusi unit fisik per model — dipakai di menu Product
  function distHTML(d) {
    function b(l, v, c, t) {
      return '<span class="d" title="' + t + '"><i style="background:' + c + '"></i>' +
        l + " <b>" + v + "</b></span>";
    }
    return '<div class="dist">' +
      '<span class="d dist-total" title="Total seluruh unit model ini">TOTAL <b>' + d.TOTAL + "</b></span>" +
      b("RFU", d.RFU, "var(--green)", "Siap pakai di gudang") +
      b("MCH", d.MCH, "var(--blue)", "Terpasang di alat berat") +
      b("DMG", d.DMG, "var(--amber)", "Rusak di gudang") +
      b("W/PO", d.WPO, "#B45309", "Rusak menunggu terbitnya PO") +
      b("CLAIM", d.CLAIM, "var(--red)", "Diklaim garansi ke AFS") +
      b("WIP", d.WIP, "var(--orange)", "Work in progress di bengkel rekanan") +
      "</div>";
  }
  // Seluruh nomor Work Order yang pernah melekat pada satu unit,
  // dipakai agar unit tetap ketemu walau yang diingat hanya nomor WO lama.
  // Alat berat yang terlibat pada satu mutasi — dibaca dari rute perpindahan.
  // Tujuan diperiksa lebih dulu (pemasangan), baru asal (penurunan/pengiriman).
  function alatMutasi(m) {
    for (var i = 0; i < DB.alats.length; i++) {
      if (m.keLabel === DB.alats[i].nama) return DB.alats[i];
    }
    for (var j = 0; j < DB.alats.length; j++) {
      if (m.dariLabel === DB.alats[j].nama) return DB.alats[j];
    }
    return null;
  }
  function woUnit(assetId) {
    var out = [];
    DB.repairs.forEach(function (r) {
      if (r.assetId === assetId && r.wo && out.indexOf(r.wo) < 0) out.push(r.wo);
    });
    return out;
  }
  // ---- pengecekan kondisi cylinder ----
  function cekUnit(assetId) {
    return DB.ceks.filter(function (c) { return c.assetId === assetId; })
      .sort(function (a, b) { return b.ts - a.ts; });
  }
  function cekTerakhir(assetId) {
    var l = cekUnit(assetId);
    return l.length ? l[0] : null;
  }
  // Skor terburuk pada satu pengecekan menentukan warna ringkasannya
  function skorTerburuk(c) {
    if (!c || !c.nilai) return 0;
    var t = 0;
    TITIK_CEK.forEach(function (k) {
      var v = Number(c.nilai[k]) || 0;
      if (v > t) t = v;
    });
    return t;
  }
  function badgeSkor(v, teksPenuh) {
    var sk = SKOR[String(v)];
    if (!sk) return '<span style="color:var(--ink-3)">—</span>';
    return '<span class="badge ' + sk.tone + '">' + v + " · " + esc(teksPenuh ? sk.label : sk.singkat) + "</span>";
  }
  // Unit yang wajib dicek: hanya yang sedang terpasang di alat berat
  function unitWajibCek() {
    return DB.assets.filter(function (a) { return a.status === "MCH" && a.lokasiTipe === "ALAT"; })
      .sort(function (x, y) {
        var cx = cekTerakhir(x.id), cy = cekTerakhir(y.id);
        return (cx ? cx.ts : 0) - (cy ? cy.ts : 0);
      });
  }
  function nextLogId() {
    DB.seq.log += 1;
    return "LOG-" + pad(Math.floor(DB.seq.log / 100)) + pad(DB.seq.log % 100);
  }
  function pushMutasi(o) {
    DB.mutasis.push({
      id: uid("mt"), logId: nextLogId(), ts: Date.now(),
      assetId: o.assetId, aksi: o.aksi,
      dariLabel: o.dari || "—", keLabel: o.ke || "—",
      slot: o.slot || "", dokumen: o.dokumen || "",
      wo: o.wo || (byId(DB.assets, o.assetId) || {}).wo || "", hm: o.hm == null ? "" : o.hm,
      catatan: o.catatan || "", pic: SESSION ? SESSION.nama : "Sistem"
    });
  }

  /* ==================================================================
     6. MESIN STATUS — daftar tindakan per kondisi unit
     ================================================================== */

  function availableActions(a) {
    var out = [];
    var s = a.status;

    if (s === "RFU" || s === "OLD") {
      out.push({
        key: "RILIS_PASANG", label: "Rilis Gudang → Pasang Alat Berat", tone: "b-blue", ico: "machine",
        desc: "Keluarkan unit dari gudang dan pasang pada alat berat",
        fields: [
          { name: "alatId", label: "Alat Berat Tujuan", type: "select-alat", req: true },
          { name: "slot", label: "Posisi Pemasangan", type: "select-slot", req: true },
          { name: "hm", label: "Hour Meter Install (HMI)", type: "number", req: true, ph: "Contoh: 21800",
            hint: "Angka hour meter alat berat saat cylinder dipasang. Dipakai menghitung jam operasi." },
          { name: "catatan", label: "Catatan Lapangan", type: "textarea" }
        ]
      });
      out.push({
        key: "TRANSFER", label: "Transfer Antar Gudang", tone: "b-gray", ico: "warehouse",
        desc: "Pindahkan unit ke gudang / area penyimpanan lain",
        fields: [
          { name: "gudangId", label: "Gudang Tujuan", type: "select-gudang", req: true },
          { name: "catatan", label: "Catatan", type: "textarea" }
        ]
      });
      out.push(retireAction());
    }

    if (s === "MCH") {
      out.push({
        key: "TURUN_RUSAK", label: "Alat Berat → Gudang (Rusak)", tone: "b-amber", ico: "warehouse",
        desc: "Jalur B – unit rusak diturunkan dan dikarantina di gudang",
        fields: [
          { name: "gudangId", label: "Gudang / Area Karantina", type: "select-gudang", req: true, karantinaFirst: true },
          { name: "hm", label: "Hour Meter Saat Dilepas", type: "number", ph: "Contoh: 23456",
            hint: "Angka hour meter alat berat saat cylinder diturunkan." },
          { name: "catatan", label: "Deskripsi Kerusakan", type: "textarea", req: true, ph: "Contoh: rembes seal rod, tekanan turun" }
        ]
      });
      out.push({
        key: "ALAT_VENDOR", label: "Alat Berat → Vendor Perbaikan", tone: "b-orange", ico: "vendor",
        desc: "Jalur A – dokumen sudah siap, unit dikirim langsung ke bengkel",
        fields: [
          { name: "vendorId", label: "Bengkel Rekanan Tujuan", type: "select-vendor", req: true },
          { name: "dokumen", label: "Nomor Dokumen (PR / PO)", type: "text", ph: "Contoh: PO-025-114-010" },
          { name: "catatan", label: "Deskripsi Kerusakan", type: "textarea", req: true }
        ]
      });
    }

    if (s === "DMG") {
      out.push({
        key: "TERBIT_PR", label: "Penerbitan Dokumen PR", tone: "b-cyan", ico: "doc",
        desc: "Catat nomor Purchase Request untuk unit ini",
        fields: [{ name: "dokumen", label: "Nomor PR", type: "text", req: true, ph: "Contoh: PR-025-001-010" }]
      });
      out.push(kirimVendorAction());
      out.push(retireAction());
    }

    if (s === "DMG_PR") {
      out.push({
        key: "TERBIT_PO", label: "Penerbitan Dokumen PO", tone: "b-cyan", ico: "doc",
        desc: "PR sudah disetujui – catat nomor Purchase Order",
        fields: [{ name: "dokumen", label: "Nomor PO", type: "text", req: true, ph: "Contoh: PO-025-114-010" }]
      });
      out.push(kirimVendorAction());
      out.push(retireAction());
    }

    if (s === "DMG_PO") {
      out.push(kirimVendorAction());
      out.push(retireAction());
    }

    if (s === "DMG" || s === "DMG_PR" || s === "DMG_PO") {
      out.push({
        key: "KIRIM_CLAIM", label: "Ajukan Klaim Garansi ke AFS", tone: "b-red", ico: "alert",
        desc: "Unit rusak dalam masa garansi — diklaim ke rekanan, bukan perbaikan berbayar",
        fields: [
          { name: "vendorId", label: "Ditujukan ke Rekanan", type: "select-vendor", req: true },
          { name: "dokumen", label: "Nomor Dokumen Klaim / WO", type: "text", ph: "Contoh: WC-025-0011" },
          { name: "catatan", label: "Dasar Klaim", type: "textarea", req: true,
            ph: "Contoh: kebocoran seal pada 420 jam operasi, jauh di bawah TJO 4.000 jam" }
        ]
      });
    }

    if (s === "RPR" || s === "CLAIM") {
      out.push({
        key: "SELESAI_REPAIR", label: "Selesaikan Perbaikan", tone: "b-green", ico: "checkCircle",
        desc: "Unit selesai dikerjakan — isi Work Order, biaya, dan hasil pemeriksaan",
        fields: [
          { name: "wo", label: "Nomor Work Order (WO)", type: "text", req: true, ph: "Contoh: WO-69062",
            hint: "Nomor WO dari bengkel. Nomor ini menempel pada unit dan dapat dicari di menu Asset." },
          { name: "jenisRepair", label: "Jenis Pekerjaan", type: "select", options: JENIS_REPAIR },
          { name: "noPO", label: "Nomor PO", type: "text", ph: "Contoh: PO-025-114-010" },
          { name: "biaya", label: "Biaya Perbaikan (Rp)", type: "number", ph: "Kosongkan bila klaim garansi" },
          { name: "tglKeluar", label: "Tanggal Keluar Vendor", type: "date", req: true },
          { name: "inspeksi", label: "Service Condition as per Inspection", type: "inspeksi" },
          { name: "catatan", label: "Deskripsi Pekerjaan", type: "textarea", req: true, ph: "Contoh: rechrome rod, ganti seal kit, uji tekan 350 bar" }
        ]
      });
    }

    if (s === "FIN") {
      out.push({
        key: "VENDOR_GUDANG", label: "Selesai Perbaikan → Masuk Gudang", tone: "b-green", ico: "warehouse",
        desc: "Unit kembali dari vendor dan disimpan sebagai stok siap pakai",
        fields: [
          { name: "gudangId", label: "Gudang Tujuan (rak siap pakai)", type: "select-gudang", req: true },
          { name: "catatan", label: "Catatan", type: "textarea" }
        ]
      });
      out.push({
        key: "VENDOR_PASANG", label: "Selesai Perbaikan → Pasang Alat Berat", tone: "b-blue", ico: "machine",
        desc: "Unit langsung dipasang kembali karena sedang dibutuhkan",
        fields: [
          { name: "alatId", label: "Alat Berat Tujuan", type: "select-alat", req: true },
          { name: "slot", label: "Posisi Pemasangan", type: "select-slot", req: true },
          { name: "hm", label: "Hour Meter Install (HMI)", type: "number", req: true, ph: "Contoh: 24100" },
          { name: "catatan", label: "Catatan", type: "textarea" }
        ]
      });
    }

    // Pensiun selalu menjadi pilihan terakhir agar tidak tertukar dengan alur harian
    out.sort(function (x, y) {
      return (x.key === "PENSIUN" ? 1 : 0) - (y.key === "PENSIUN" ? 1 : 0);
    });
    return out;

    function kirimVendorAction() {
      return {
        key: "KIRIM_VENDOR", label: "Rilis Kirim ke Vendor Repair", tone: "b-orange", ico: "vendor",
        desc: "Kirim unit dari gudang ke bengkel rekanan untuk diperbaiki",
        fields: [
          { name: "vendorId", label: "Bengkel Rekanan Tujuan", type: "select-vendor", req: true },
          { name: "dokumen", label: "Nomor Dokumen Penugasan", type: "text", ph: "PR / PO yang menyertai" },
          { name: "catatan", label: "Deskripsi Kerusakan", type: "textarea" }
        ]
      };
    }
    function retireAction() {
      return {
        key: "PENSIUN", label: "Pensiunkan Unit (Retire)", tone: "b-gray", ico: "archive",
        desc: "Unit sudah tidak layak pakai – riwayat tetap tersimpan sebagai arsip",
        fields: [
          { name: "mode", label: "Tindakan", type: "select-mode", req: true },
          { name: "catatan", label: "Alasan", type: "textarea", req: true, ph: "Contoh: siklus repair 4×, tube sudah oversize" }
        ]
      };
    }
  }

  /* ---------------- Eksekusi tindakan ---------------- */
  function runAction(assetId, key, v) {
    var a = byId(DB.assets, assetId);
    if (!a) return { ok: false, msg: "Unit tidak ditemukan." };
    var dari = lokasiLabel(a);

    if (key === "RILIS_PASANG" || key === "VENDOR_PASANG") {
      var m = byId(DB.alats, v.alatId);
      if (!m) return { ok: false, msg: "Alat berat belum dipilih." };
      a.lokasiTipe = "ALAT"; a.lokasiId = m.id; a.slot = v.slot;
      a.status = "MCH"; a.siklusPakai += 1;
      a.hmInstall = Number(v.hm) || 0;
      a.tglInstall = Date.now();
      if (a.hmInstall && (!m.hmu || m.hmu < a.hmInstall)) m.hmu = a.hmInstall;
      pushMutasi({ assetId: a.id, aksi: key === "RILIS_PASANG" ? MT.RILIS_PASANG : MT.VENDOR_PASANG,
        dari: dari, ke: m.nama, slot: v.slot, hm: a.hmInstall, wo: a.wo, catatan: v.catatan });
      return { ok: true, msg: "Unit " + a.sn + " terpasang di " + m.nama + " (" + v.slot + ")." };
    }

    if (key === "TRANSFER") {
      var g0 = byId(DB.gudangs, v.gudangId);
      if (!g0) return { ok: false, msg: "Gudang belum dipilih." };
      a.lokasiId = g0.id; a.lokasiTipe = "GUDANG";
      pushMutasi({ assetId: a.id, aksi: MT.TRANSFER, dari: dari, ke: g0.nama, catatan: v.catatan });
      return { ok: true, msg: "Unit " + a.sn + " dipindahkan ke " + g0.nama + "." };
    }

    if (key === "TURUN_RUSAK") {
      var g1 = byId(DB.gudangs, v.gudangId);
      if (!g1) return { ok: false, msg: "Gudang belum dipilih." };
      var alatAsal = a.lokasiTipe === "ALAT" ? byId(DB.alats, a.lokasiId) : null;
      var hmLepas = Number(v.hm) || 0;
      if (hmLepas) {
        a.hmLepas = hmLepas;
        // jam operasi yang benar-benar dijalani cylinder pada pemasangan terakhir
        if (a.hmInstall) a.jjo = (a.jjo || 0) + Math.max(0, hmLepas - a.hmInstall);
        if (alatAsal && (!alatAsal.hmu || alatAsal.hmu < hmLepas)) alatAsal.hmu = hmLepas;
      }
      a.lokasiTipe = "GUDANG"; a.lokasiId = g1.id; a.slotTerakhir = a.slot; a.slot = "";
      a.status = "DMG";
      pushMutasi({ assetId: a.id, aksi: MT.TURUN_RUSAK, dari: dari, ke: g1.nama,
        hm: hmLepas, catatan: v.catatan });
      return { ok: true, msg: "Unit " + a.sn + " diturunkan ke " + g1.nama + "." };
    }

    if (key === "TERBIT_PR") {
      a.noPR = v.dokumen; a.status = "DMG_PR";
      pushMutasi({ assetId: a.id, aksi: MT.TERBIT_PR, dari: dari, ke: "Plotting PR", dokumen: v.dokumen });
      return { ok: true, msg: "Dokumen PR " + v.dokumen + " tercatat. Unit menunggu penerbitan PO." };
    }

    if (key === "TERBIT_PO") {
      a.noPO = v.dokumen; a.status = "DMG_PO";
      pushMutasi({ assetId: a.id, aksi: MT.TERBIT_PO, dari: dari, ke: "Plotting PO", dokumen: v.dokumen });
      return { ok: true, msg: "Dokumen PO " + v.dokumen + " tercatat. Unit siap dikirim ke vendor." };
    }

    if (key === "KIRIM_CLAIM") {
      var vc = byId(DB.vendors, v.vendorId);
      if (!vc) return { ok: false, msg: "Rekanan belum dipilih." };
      a.lokasiTipe = "VENDOR"; a.lokasiId = vc.id; a.slot = "";
      a.status = "CLAIM"; a.jenisRepair = "WC";
      DB.repairs.push({
        id: uid("rp"), assetId: a.id, vendorId: vc.id, noPR: a.noPR || "", noPO: a.noPO || "",
        wo: v.dokumen || "", jenisRepair: "WC", inspeksi: null,
        biaya: null, tglMasuk: Date.now(), tglKeluar: null,
        deskripsi: v.catatan || "", status: "BERLANGSUNG"
      });
      pushMutasi({ assetId: a.id, aksi: MT.KIRIM_CLAIM, dari: dari, ke: vc.nama,
        dokumen: v.dokumen, catatan: v.catatan });
      return { ok: true, msg: "Klaim garansi " + a.sn + " diajukan ke " + vc.nama + "." };
    }

    if (key === "KIRIM_VENDOR" || key === "ALAT_VENDOR") {
      var ve = byId(DB.vendors, v.vendorId);
      if (!ve) return { ok: false, msg: "Vendor belum dipilih." };
      a.lokasiTipe = "VENDOR"; a.lokasiId = ve.id; a.slot = "";
      a.status = "RPR";
      if (v.dokumen) { if (/^PO/i.test(v.dokumen)) a.noPO = v.dokumen; else a.noPR = v.dokumen; }
      DB.repairs.push({
        id: uid("rp"), assetId: a.id, vendorId: ve.id, noPR: a.noPR || "", noPO: a.noPO || "",
        wo: "", jenisRepair: "RC", inspeksi: null,
        biaya: null, tglMasuk: Date.now(), tglKeluar: null,
        deskripsi: v.catatan || "", status: "BERLANGSUNG"
      });
      pushMutasi({ assetId: a.id, aksi: key === "KIRIM_VENDOR" ? MT.KIRIM_VENDOR : MT.ALAT_VENDOR,
        dari: dari, ke: ve.nama, dokumen: v.dokumen || a.noPO || a.noPR, catatan: v.catatan });
      return { ok: true, msg: "Unit " + a.sn + " dikirim ke " + ve.nama + ". Durasi perbaikan mulai dihitung." };
    }

    if (key === "SELESAI_REPAIR") {
      var rp = activeRepair(a.id);
      if (!rp) return { ok: false, msg: "Data perbaikan aktif tidak ditemukan." };
      rp.status = "SELESAI";
      rp.noPO = v.noPO || rp.noPO;
      rp.wo = v.wo || rp.wo || "";
      rp.jenisRepair = v.jenisRepair || rp.jenisRepair || "RC";
      rp.inspeksi = v.inspeksi || rp.inspeksi || null;
      rp.biaya = v.biaya === "" || v.biaya == null ? 0 : (Number(v.biaya) || 0);
      rp.tglKeluar = v.tglKeluar ? new Date(v.tglKeluar + "T12:00:00").getTime() : Date.now();
      rp.deskripsi = v.catatan || rp.deskripsi;
      if (v.noPO) a.noPO = v.noPO;
      a.wo = rp.wo;                       // WO terakhir menempel pada unit
      a.jenisRepair = rp.jenisRepair;
      a.hmInstall = 0;                    // dipasang ulang nanti dengan HM baru
      a.status = "FIN"; a.siklusRepair += 1;
      pushMutasi({ assetId: a.id, aksi: MT.SELESAI_REPAIR, dari: dari, ke: dari,
        dokumen: rp.noPO, wo: rp.wo, catatan: rp.deskripsi });
      return { ok: true, msg: "Perbaikan " + a.sn + " ditutup. WO " + (rp.wo || "—") +
        (rp.jenisRepair === "WC" ? " (klaim garansi)." : ", biaya " + fmtRp(rp.biaya) + ".") };
    }

    if (key === "VENDOR_GUDANG") {
      var g2 = byId(DB.gudangs, v.gudangId);
      if (!g2) return { ok: false, msg: "Gudang belum dipilih." };
      a.lokasiTipe = "GUDANG"; a.lokasiId = g2.id; a.status = "RFU";
      pushMutasi({ assetId: a.id, aksi: MT.VENDOR_GUDANG, dari: dari, ke: g2.nama, catatan: v.catatan });
      return { ok: true, msg: "Unit " + a.sn + " masuk " + g2.nama + " sebagai stok siap pakai." };
    }

    if (key === "PENSIUN") {
      a.status = v.mode === "SCRAP" ? "SCRAP" : "RETIRED";
      a.lokasiTipe = "NONE"; a.lokasiId = ""; a.slot = "";
      a.catatan = v.catatan || a.catatan;
      pushMutasi({ assetId: a.id, aksi: MT.PENSIUN, dari: dari,
        ke: v.mode === "SCRAP" ? "Dibuang / Scrap" : "Pensiun / Arsip", catatan: v.catatan });
      return { ok: true, msg: "Unit " + a.sn + " telah dipensiunkan." };
    }

    return { ok: false, msg: "Tindakan tidak dikenali." };
  }

  /* ==================================================================
     7. HAK AKSES
     ================================================================== */

  var MENU = [
    { key: "dashboard", label: "Dashboard", ico: "dashboard", group: "MENU", roles: ["ADMIN", "SUPERVISOR", "STAFF"] },
    { key: "product",   label: "Product",   ico: "product",   group: "MENU", roles: ["ADMIN", "SUPERVISOR"] },
    { key: "asset",     label: "Asset",     ico: "asset",     group: "MENU", roles: ["ADMIN", "SUPERVISOR", "STAFF"] },
    { key: "mutasi-form", label: "Form Mutasi", ico: "mutasi", group: "MENU", roles: ["ADMIN", "SUPERVISOR", "STAFF"] },
    { key: "monitoring", label: "Cek Kondisi", ico: "clipboard", group: "MENU", roles: ["ADMIN", "SUPERVISOR", "STAFF"] },
    { key: "mutasi",    label: "Mutasi Asset", ico: "history", group: "MENU", roles: ["ADMIN", "SUPERVISOR", "STAFF"] },
    { key: "perbaikan", label: "Perbaikan", ico: "repair",    group: "MENU", roles: ["ADMIN", "SUPERVISOR"] },
    { key: "gudang",    label: "Gudang",    ico: "warehouse", group: "MENU", roles: ["ADMIN", "SUPERVISOR"] },
    { key: "alat",      label: "Alat Berat", ico: "machine",  group: "MENU", roles: ["ADMIN", "SUPERVISOR"] },
    { key: "hourmeter", label: "Hour Meter", ico: "gauge",    group: "MENU", roles: ["ADMIN", "SUPERVISOR", "STAFF"] },
    { key: "vendor",    label: "Vendor",    ico: "vendor",    group: "MENU", roles: ["ADMIN", "SUPERVISOR"] },
    { key: "pengguna",  label: "Pengguna",  ico: "users",     group: "ADMIN", roles: ["ADMIN"] }
  ];

  function can(key) {
    if (!SESSION) return false;
    for (var i = 0; i < MENU.length; i++)
      if (MENU[i].key === key) return MENU[i].roles.indexOf(SESSION.role) >= 0;
    return false;
  }
  function isAdmin() { return SESSION && SESSION.role === "ADMIN"; }
  function canEditMaster() { return SESSION && (SESSION.role === "ADMIN" || SESSION.role === "SUPERVISOR"); }

  /* ==================================================================
     8. QR CODE
     ================================================================== */

  function drawQR(canvas, text, opts) {
    opts = opts || {};
    var qr = qrcode(0, opts.ec || "M");
    qr.addData(text);
    qr.make();
    var n = qr.getModuleCount();
    var quiet = opts.quiet == null ? 4 : opts.quiet;
    var scale = opts.scale || 8;
    var size = (n + quiet * 2) * scale;
    var capH = opts.caption ? Math.round(scale * 7) : 0;

    canvas.width = size;
    canvas.height = size + capH;
    var ctx = canvas.getContext("2d");
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = opts.color || "#211B51";
    for (var r = 0; r < n; r++) {
      for (var c = 0; c < n; c++) {
        if (qr.isDark(r, c)) {
          ctx.fillRect((c + quiet) * scale, (r + quiet) * scale, scale, scale);
        }
      }
    }
    if (opts.caption) {
      ctx.fillStyle = "#211B51";
      ctx.font = "bold " + Math.round(scale * 2.6) + "px 'Segoe UI', Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(opts.caption, canvas.width / 2, size + capH / 2 - scale * 0.8);
    }
    return canvas;
  }

  function downloadQR(a) {
    var cv = document.createElement("canvas");
    drawQR(cv, a.qr, { scale: 12, caption: a.sn, ec: "M" });
    var nama = "QR-" + a.sn + ".png";
    var sukses = "QR " + a.sn + " tersimpan. Cetak pada label tahan panas.";

    // Saat dibuka sebagai berkas lokal, unduhan memakai tautan biasa.
    // Saat dibuka dari tautan online, tautan biasa diblokir demi keamanan,
    // sehingga penyimpanan harus melalui window.claude.
    function unduhLokal() {
      var link = document.createElement("a");
      link.href = cv.toDataURL("image/png");
      link.download = nama;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast(sukses, "info");
    }

    if (!(window.claude && typeof window.claude.use === "function")) { unduhLokal(); return; }

    window.claude.use("downloads").then(function (dl) {
      if (!dl) { unduhLokal(); return; }
      cv.toBlob(function (blob) {
        if (!blob) { unduhLokal(); return; }
        dl.save({ filename: nama, data: blob }).then(function () {
          toast(sukses, "info");
        })["catch"](function (e) {
          if (e && e.code === "declined") return;          // pengguna membatalkan
          toast("Unduhan tidak tersedia di sini. Tekan-lama gambar QR untuk menyimpan.", "err");
        });
      }, "image/png");
    })["catch"](unduhLokal);
  }

  function printQR(a) {
    var cv = document.createElement("canvas");
    drawQR(cv, a.qr, { scale: 10, ec: "M" });
    var p = prod(a);
    var w = window.open("", "_blank", "width=520,height=640");
    if (!w) { toast("Popup diblokir browser. Izinkan popup untuk mencetak.", "err"); return; }
    w.document.write(
      '<!doctype html><html><head><title>Label ' + esc(a.sn) + '</title><style>' +
      'body{font-family:"Segoe UI",Arial,sans-serif;margin:0;padding:22px;text-align:center}' +
      '.lbl{border:2px solid #211B51;border-radius:10px;padding:16px;display:inline-block;min-width:250px}' +
      '.lbl img{width:190px;height:190px;display:block;margin:0 auto 8px}' +
      '.sn{font-size:15px;font-weight:800;letter-spacing:1.5px;color:#211B51}' +
      '.md{font-size:11px;color:#444;margin-top:3px}' +
      '.ft{font-size:8.5px;color:#888;margin-top:7px;letter-spacing:.5px}' +
      '@media print{body{padding:0}}</style></head><body>' +
      '<div class="lbl"><img src="' + cv.toDataURL("image/png") + '">' +
      '<div class="sn">' + esc(a.sn) + '</div>' +
      '<div class="md">' + esc(p.nama) + "</div>" +
      '<div class="ft">JB-SYS · PT JHONLIN BARATAMA</div></div>' +
      "<script>setTimeout(function(){window.print()},260)<\/script></body></html>"
    );
    w.document.close();
  }

  /* ==================================================================
     9. PEMINDAI KAMERA
     ================================================================== */

  var scanner = { stream: null, raf: null, running: false };

  function stopScanner() {
    scanner.running = false;
    if (scanner.raf) { cancelAnimationFrame(scanner.raf); scanner.raf = null; }
    if (scanner.stream) {
      scanner.stream.getTracks().forEach(function (t) { t.stop(); });
      scanner.stream = null;
    }
  }

  function beep() {
    try {
      var C = window.AudioContext || window.webkitAudioContext;
      if (!C) return;
      var ac = new C(); var o = ac.createOscillator(); var g = ac.createGain();
      o.connect(g); g.connect(ac.destination);
      o.frequency.value = 880; o.type = "sine";
      g.gain.setValueAtTime(.001, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(.28, ac.currentTime + .01);
      g.gain.exponentialRampToValueAtTime(.001, ac.currentTime + .16);
      o.start(); o.stop(ac.currentTime + .18);
      setTimeout(function () { ac.close(); }, 400);
    } catch (e) { /* diam */ }
  }

  function startScanner(video, onFound, onError) {
    var decode = (typeof jsQR === "function") ? jsQR : (window.jsQR && window.jsQR.default);
    if (typeof decode !== "function") {
      onError("Modul pemindai QR gagal dimuat. Gunakan entri manual."); return;
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      onError(location.protocol === "file:"
        ? "Kamera memerlukan HTTPS atau localhost. Jalankan lewat berkas 'Jalankan JB-SYS.bat'."
        : "Browser tidak mendukung akses kamera. Gunakan entri manual."); return;
    }
    navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false
    }).then(function (stream) {
      scanner.stream = stream;
      scanner.running = true;
      video.srcObject = stream;
      video.setAttribute("playsinline", "true");
      video.play();

      var cv = document.createElement("canvas");
      var ctx = cv.getContext("2d", { willReadFrequently: true });

      function tick() {
        if (!scanner.running) return;
        if (video.readyState === video.HAVE_ENOUGH_DATA && decode) {
          cv.width = video.videoWidth; cv.height = video.videoHeight;
          if (cv.width && cv.height) {
            ctx.drawImage(video, 0, 0, cv.width, cv.height);
            var img = ctx.getImageData(0, 0, cv.width, cv.height);
            var res = null;
            try { res = decode(img.data, img.width, img.height, { inversionAttempts: "dontInvert" }); }
            catch (e) { res = null; }
            if (res && res.data) { beep(); stopScanner(); onFound(res.data.trim()); return; }
          }
        }
        scanner.raf = requestAnimationFrame(tick);
      }
      scanner.raf = requestAnimationFrame(tick);
    }).catch(function (err) {
      var msg = "Kamera tidak dapat diakses.";
      if (err && (err.name === "NotAllowedError" || err.name === "PermissionDeniedError"))
        msg = "Izin kamera ditolak. Berikan izin pada browser lalu coba lagi.";
      else if (err && err.name === "NotFoundError") msg = "Kamera tidak ditemukan pada perangkat ini.";
      else if (location.protocol === "file:") msg = "Kamera memerlukan HTTPS atau localhost. Jalankan lewat berkas 'Jalankan JB-SYS.bat'.";
      onError(msg);
    });
  }

  function findAssetByCode(code) {
    if (!code) return null;
    var c = String(code).trim().toUpperCase();
    var bare = c.indexOf(QR_PREFIX) === 0 ? c.slice(QR_PREFIX.length) : c;
    for (var i = 0; i < DB.assets.length; i++) {
      var a = DB.assets[i];
      if (a.qr.toUpperCase() === c || a.sn.toUpperCase() === c || a.sn.toUpperCase() === bare) return a;
    }
    return null;
  }

  /* ==================================================================
     9b. EKSPOR EXCEL
     ================================================================== */

  function capTanggal() {
    var d = new Date();
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }

  // Penyimpanan berkas: berkas lokal memakai tautan unduh biasa, sedangkan
  // pada tautan online penyimpanan harus lewat window.claude.
  function simpanBerkas(nama, bytes, mime, csvCadangan) {
    function unduhLokal() {
      var url = URL.createObjectURL(new Blob([bytes], { type: mime }));
      var a = document.createElement("a");
      a.href = url; a.download = nama;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
      toast(nama + " diunduh.", "info");
    }
    function gagal() {
      toast("Ekspor tidak diizinkan di tampilan ini. Gunakan berkas lokal JB-SYS.", "err");
    }
    if (!(window.claude && typeof window.claude.use === "function")) { unduhLokal(); return; }

    window.claude.use("downloads").then(function (dl) {
      if (!dl) { unduhLokal(); return; }
      dl.save({ filename: nama, data: bytes }).then(function () {
        toast(nama + " tersimpan.", "info");
      })["catch"](function (e) {
        var kode = e && e.code;
        if (kode === "declined") return;
        if (csvCadangan && (kode === "rejected_extension" || kode === "extension_not_enabled")) {
          dl.save({ filename: nama.replace(/\.xlsx$/i, ".csv"), data: csvCadangan }).then(function () {
            toast("Format .xlsx belum diizinkan di tautan online — diekspor sebagai CSV.", "info");
          })["catch"](function (e2) { if (!e2 || e2.code !== "declined") gagal(); });
          return;
        }
        gagal();
      });
    })["catch"](unduhLokal);
  }

  function eksporExcel(judul, sheets) {
    try {
      var nama = "JB-SYS " + judul + " " + capTanggal() + ".xlsx";
      var bytes = XLSXJB.buat(sheets);
      var csv = XLSXJB.csv(sheets[0]);
      simpanBerkas(nama, bytes,
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        new TextEncoder().encode(csv));
    } catch (e) {
      console.error(e);
      toast("Gagal menyusun berkas Excel.", "err");
    }
  }

  function tombolEkspor(id) {
    return '<button class="btn btn-ghost" id="' + (id || "xls") + '">' + icon("download") + "Export Excel</button>";
  }

  /* ---------------- penyusun lembar ---------------- */
  var K = {   // pintasan definisi kolom
    t: function (h, w) { return { h: h, w: w || 16, f: "s" }; },
    n: function (h, w) { return { h: h, w: w || 11, f: "n" }; },
    p: function (h, w) { return { h: h, w: w || 11, f: "pm" }; },
    rp: function (h, w) { return { h: h, w: w || 16, f: "rp" }; },
    dt: function (h, w) { return { h: h, w: w || 17, f: "dt" }; },
    tg: function (h, w) { return { h: h, w: w || 13, f: "tgl" }; }
  };

  function shRingkasan() {
    var A = DB.assets;
    var g = A.filter(function (a) { return a.lokasiTipe === "GUDANG" && isAktif(a); }).length;
    var m = A.filter(function (a) { return a.lokasiTipe === "ALAT"; }).length;
    var v = A.filter(function (a) { return a.lokasiTipe === "VENDOR"; }).length;
    var ps = A.filter(function (a) { return a.status === "RETIRED"; }).length;
    var db2 = A.filter(function (a) { return a.status === "SCRAP"; }).length;
    var aktif = g + m + v || 1;
    var kritis = A.filter(function (a) { return a.siklusRepair >= CRITICAL_REPAIR && isAktif(a); }).length;
    var selesai = DB.repairs.filter(function (r) { return r.status === "SELESAI"; });
    var biaya = selesai.reduce(function (x, r) { return x + (r.biaya || 0); }, 0);
    var durasi = selesai.length ? Math.round(selesai.reduce(function (x, r) {
      return x + daysBetween(r.tglMasuk, r.tglKeluar || Date.now()); }, 0) / selesai.length) : 0;

    return {
      nama: "Ringkasan",
      kolom: [K.t("Indikator", 34), K.t("Nilai", 20), K.t("Keterangan", 46)],
      baris: [
        ["Tanggal ekspor", fmtDateTime(Date.now()), "Diekspor oleh " + (SESSION ? SESSION.nama : "-")],
        ["Di gudang", g, "Unit siap pakai maupun rusak yang berada di gudang"],
        ["Di alat berat", m, "Unit sedang terpasang dan beroperasi"],
        ["Di repair / vendor", v, "Termasuk unit klaim garansi"],
        ["Pensiun", ps, "Ditarik dari peredaran, riwayat tetap tersimpan"],
        ["Dibuang", db2, "Scrap"],
        ["Total populasi", A.length, "Seluruh unit cylinder terdaftar"],
        ["Porsi gudang", Math.round(g / aktif * 100) + "%", "Dari unit aktif"],
        ["Porsi operasional", Math.round(m / aktif * 100) + "%", "Dari unit aktif"],
        ["Porsi perbaikan", Math.round(v / aktif * 100) + "%", "Dari unit aktif"],
        ["Unit kritis", kritis, "Sudah diperbaiki " + CRITICAL_REPAIR + "x atau lebih"],
        ["Total biaya perbaikan", biaya, "Seluruh perbaikan yang sudah tuntas"],
        ["Rata-rata durasi perbaikan", durasi + " hari", "Dari " + selesai.length + " perbaikan tuntas"]
      ]
    };
  }

  function shProduct(list) {
    return {
      nama: "Product",
      kolom: [K.t("Kode Komoditas", 16), K.t("Nama Model / Spesifikasi", 30), K.t("Dimensi & Stroke", 28),
        K.n("TJO (jam)", 11), K.n("Total", 9), K.n("RFU", 9), K.n("MCH", 9),
        K.n("DMG", 9), K.n("W/PO", 9), K.n("Claim", 9), K.n("WIP", 9), K.t("Catatan", 30)],
      baris: (list || DB.products).map(function (p) {
        var d = distProduk(p.id);
        return [p.kode, p.nama, p.dimensi, p.tjo ? Number(p.tjo) : "",
          d.TOTAL, d.RFU, d.MCH, d.DMG, d.WPO, d.CLAIM, d.WIP, p.catatan];
      })
    };
  }

  function shAsset(list) {
    return {
      nama: "Asset",
      kolom: [K.t("Serial Number", 18), K.t("QR Code", 20), K.t("Kode Model", 14), K.t("Nama Model", 26),
        K.t("Tipe", 18), K.t("Status", 24), K.t("Jenis Lokasi", 13), K.t("Lokasi", 28), K.t("Posisi Pasang", 16),
        K.t("WO Terakhir", 14), K.t("Jenis WO", 10), K.t("No. PR", 16), K.t("No. PO", 16),
        K.n("Siklus Pakai", 12), K.n("Siklus Repair", 13),
        K.n("HMI", 11), K.n("JJO", 11), K.n("TJO", 11), K.n("THM", 11), K.p("KJO", 11),
        K.rp("Total Biaya Repair", 18), K.tg("Terdaftar", 13), K.t("Deskripsi", 30), K.t("Catatan", 30)],
      baris: (list || DB.assets).map(function (a) {
        var p = prod(a);
        var alat = a.lokasiTipe === "ALAT" ? byId(DB.alats, a.lokasiId) : null;
        var j = hitungJam(a, alat);
        var biaya = DB.repairs.reduce(function (x, r) {
          return r.assetId === a.id ? x + (r.biaya || 0) : x; }, 0);
        return [a.sn, a.qr, p.kode, p.nama, a.tipe, stat(a).label,
          a.lokasiTipe === "ALAT" ? "Alat Berat" : (a.lokasiTipe === "GUDANG" ? "Gudang" :
            (a.lokasiTipe === "VENDOR" ? "Vendor" : "-")),
          lokasiLabel(a), a.slot,
          a.wo, a.jenisRepair, a.noPR, a.noPO,
          a.siklusPakai, a.siklusRepair,
          j.hmi || "", j.jjo || "", j.tjo || "", j.thm || "", j.tjo ? j.kjo : "",
          biaya || "", a.createdAt, a.deskripsi, a.catatan];
      })
    };
  }

  function shMutasi(list) {
    return {
      nama: "Mutasi Asset",
      kolom: [K.dt("Waktu / Tanggal", 18), K.t("LOG ID", 12), K.t("Serial Number", 18), K.t("Nama Model", 26),
        K.t("Jenis Tindakan", 34), K.t("Dari", 26), K.t("Ke", 26),
        K.t("No. Alat Berat", 15), K.t("Posisi", 16), K.t("WO", 14), K.t("Dokumen Resmi", 18),
        K.n("Hour Meter", 12), K.t("Catatan Lapangan", 38), K.t("Operator (PIC)", 20)],
      baris: (list || DB.mutasis.slice().sort(function (a, b) { return b.ts - a.ts; })).map(function (m) {
        var a = byId(DB.assets, m.assetId);
        var al = alatMutasi(m);
        return [m.ts, m.logId, a ? a.sn : "", a ? prod(a).nama : "", m.aksi,
          m.dariLabel, m.keLabel, al ? al.kode : "", m.slot, m.wo, m.dokumen,
          m.hm ? Number(m.hm) : "", m.catatan, m.pic];
      })
    };
  }

  function shPerbaikan(list, nama) {
    return {
      nama: nama || "Perbaikan",
      kolom: [K.t("Serial Number", 18), K.t("Nama Model", 26), K.t("WO", 14), K.t("Jenis", 10),
        K.t("Bengkel Rekanan", 28), K.t("No. PR", 16), K.t("No. PO", 16), K.rp("Biaya Repair", 16),
        K.dt("Tanggal Masuk", 17), K.dt("Tanggal Keluar", 17), K.n("Durasi (hari)", 12), K.t("Status", 14),
        K.t("Deskripsi Pekerjaan", 40),
        K.t("Rod / Wiper", 12), K.t("H/E", 10), K.t("Port H/E", 11), K.t("Flex H/E", 11),
        K.t("Port C/E", 11), K.t("Flex C/E", 11), K.t("Other", 10)],
      baris: (list || DB.repairs.slice().sort(function (a, b) { return b.tglMasuk - a.tglMasuk; })).map(function (r) {
        var a = byId(DB.assets, r.assetId), v = byId(DB.vendors, r.vendorId);
        var ins = r.inspeksi || {};
        return [a ? a.sn : "", a ? prod(a).nama : "", r.wo,
          r.jenisRepair === "WC" ? "WC — Claim" : "RC — Recondition",
          v ? v.nama : "", r.noPR, r.noPO, r.biaya || "",
          r.tglMasuk, r.tglKeluar || "",
          daysBetween(r.tglMasuk, r.tglKeluar || Date.now()),
          r.status === "SELESAI" ? "Selesai" : "Berlangsung", r.deskripsi,
          ins["Rod / Wiper"], ins["H/E"], ins["Port H/E"], ins["Flex H/E"],
          ins["Port C/E"], ins["Flex C/E"], ins["Other"]];
      })
    };
  }

  function shGudang() {
    return {
      nama: "Gudang",
      kolom: [K.t("Kode Lokasi", 14), K.t("Nama Gudang / Pos", 30), K.t("Area Spesifik", 28),
        K.t("Area Karantina", 14), K.n("Total Cylinder", 14), K.t("Keterangan", 40)],
      baris: DB.gudangs.map(function (g) {
        return [g.kode, g.nama, g.area, g.karantina ? "Ya" : "Tidak", countGudang(g.id), g.keterangan];
      })
    };
  }

  function shAlat() {
    return {
      nama: "Alat Berat",
      kolom: [K.t("Kode Unit", 14), K.t("Nama Unit Alat Berat", 34), K.t("Departemen Kerja", 24),
        K.t("Lokasi Operasi", 26), K.n("Hour Meter (HMU)", 15), K.n("Cylinder Terpasang", 16),
        K.n("Lewat Target Jam", 15), K.t("Spesifikasi", 40)],
      baris: DB.alats.map(function (m) {
        var lewat = 0;
        DB.assets.forEach(function (a) {
          if (a.lokasiTipe !== "ALAT" || a.lokasiId !== m.id) return;
          var j = hitungJam(a, m);
          if (j.tjo && j.kjo > 0) lewat++;
        });
        return [m.kode, m.nama, m.departemen, m.lokasi, m.hmu ? Number(m.hmu) : "",
          countAlat(m.id), lewat, m.spesifikasi];
      })
    };
  }

  function shTerpasang(alatTertentu) {
    var daftar = DB.assets.filter(function (a) {
      return a.lokasiTipe === "ALAT" && (!alatTertentu || a.lokasiId === alatTertentu.id);
    });
    return {
      nama: "Cylinder Terpasang",
      kolom: [K.t("Kode Unit", 14), K.t("Nama Unit Alat Berat", 32), K.t("Posisi", 16),
        K.t("Serial Number", 18), K.t("Nama Model", 26), K.t("WO Terakhir", 14),
        K.n("HMU", 11), K.n("HMI", 11), K.n("JJO", 11), K.n("TJO", 11), K.n("THM", 11), K.p("KJO", 11),
        K.n("Terpakai (%)", 12), K.t("Status", 22)],
      baris: daftar.map(function (a) {
        var m = byId(DB.alats, a.lokasiId);
        var j = hitungJam(a, m);
        return [m ? m.kode : "", m ? m.nama : "", a.slot, a.sn, prod(a).nama, a.wo,
          m && m.hmu ? Number(m.hmu) : "", j.hmi || "", j.jjo || "", j.tjo || "",
          j.thm || "", j.tjo ? j.kjo : "", j.tjo ? j.pakai : "", stat(a).label];
      })
    };
  }

  function shVendor() {
    return {
      nama: "Vendor",
      kolom: [K.t("Kode Vendor", 14), K.t("Nama Instansi / Perusahaan", 34), K.t("No. Telepon", 18),
        K.t("Alamat Email", 28), K.n("Unit Dipegang", 14), K.t("Alamat Workshop", 46)],
      baris: DB.vendors.map(function (v) {
        return [v.kode, v.nama, v.telepon, v.email, countVendor(v.id), v.alamat];
      })
    };
  }

  function shPengguna() {
    return {
      nama: "Pengguna",
      kolom: [K.t("Nama Personel", 26), K.t("Email Kredensial", 30), K.t("Hak Akses", 18), K.t("Status Akun", 13)],
      baris: DB.users.map(function (u) {
        return [u.nama, u.email, ROLES[u.role].label, u.aktif ? "Aktif" : "Nonaktif"];
      })
    };
  }

  function eksporSemua() {
    eksporExcel("Data Lengkap", [
      shRingkasan(), shProduct(), shAsset(), shTerpasang(), shAlat(), shHourMeter(),
      shCek(), shMutasi(), shPerbaikan(), shGudang(), shVendor(), shPengguna()
    ]);
  }

  /* ==================================================================
     10. MODAL
     ================================================================== */

  var modalStack = [];

  function openModal(opts) {
    var back = document.createElement("div");
    back.className = "modal-back";
    var extra = opts.wide ? " wide" : (opts.narrow ? " narrow" : "");
    back.innerHTML =
      '<div class="modal' + extra + '">' +
        '<div class="modal-head"><div><h3>' + esc(opts.title) + "</h3>" +
          (opts.sub ? "<p>" + esc(opts.sub) + "</p>" : "") + "</div>" +
          '<button class="modal-close" data-x>' + icon("close") + "</button></div>" +
        '<div class="modal-body">' + opts.body + "</div>" +
        (opts.foot === null ? "" : '<div class="modal-foot">' + (opts.foot ||
          ('<button class="btn btn-ghost" data-x>Batal</button>' +
           '<button class="btn btn-primary" data-ok>' + esc(opts.okLabel || "Simpan") + "</button>")) + "</div>") +
      "</div>";
    document.body.appendChild(back);
    modalStack.push(back);

    function close() {
      var i = modalStack.indexOf(back);
      if (i >= 0) modalStack.splice(i, 1);
      if (back.parentNode) back.parentNode.removeChild(back);
      if (opts.onClose) opts.onClose();
    }
    back.addEventListener("click", function (e) {
      if (e.target === back) { close(); return; }
      if (e.target.closest("[data-x]")) { close(); return; }
      if (e.target.closest("[data-ok]")) {
        if (!opts.onOk || opts.onOk(back, close) !== false) { /* ditutup oleh handler */ }
      }
    });
    if (opts.onMount) opts.onMount(back, close);
    var f = back.querySelector("input,select,textarea");
    if (f && !opts.noFocus) setTimeout(function () { f.focus(); }, 60);
    return { root: back, close: close };
  }

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && modalStack.length) {
      var top = modalStack[modalStack.length - 1];
      var x = top.querySelector("[data-x]");
      if (x) x.click();
    }
  });

  /* ---------------- Field builder ---------------- */
  function fieldHTML(f, val) {
    var v = val == null ? "" : val;
    var req = f.req ? ' <span class="req">*</span>' : "";
    var h = '<div class="field"><label>' + esc(f.label) + req + "</label>";

    if (f.type === "textarea") {
      h += '<textarea class="input" name="' + f.name + '" placeholder="' + esc(f.ph || "") + '">' + esc(v) + "</textarea>";
    } else if (f.type === "select-gudang") {
      var gs = DB.gudangs.slice();
      if (f.karantinaFirst) gs.sort(function (a, b) { return (b.karantina ? 1 : 0) - (a.karantina ? 1 : 0); });
      h += '<select class="input" name="' + f.name + '"><option value="">— Pilih gudang —</option>' +
        gs.map(function (g) {
          return '<option value="' + g.id + '"' + (v === g.id ? " selected" : "") + ">" +
            esc(g.nama) + (g.karantina ? " (Karantina)" : "") + "</option>";
        }).join("") + "</select>";
    } else if (f.type === "select-alat") {
      h += '<select class="input" name="' + f.name + '"><option value="">— Pilih alat berat —</option>' +
        DB.alats.map(function (m) {
          return '<option value="' + m.id + '"' + (v === m.id ? " selected" : "") + ">" +
            esc(m.nama) + " · " + esc(m.kode) + "</option>";
        }).join("") + "</select>";
    } else if (f.type === "select-vendor") {
      h += '<select class="input" name="' + f.name + '"><option value="">— Pilih vendor —</option>' +
        DB.vendors.map(function (x) {
          return '<option value="' + x.id + '"' + (v === x.id ? " selected" : "") + ">" + esc(x.nama) + "</option>";
        }).join("") + "</select>";
    } else if (f.type === "select-slot") {
      h += '<select class="input" name="' + f.name + '"><option value="">— Pilih slot —</option>' +
        SLOTS.map(function (s) {
          return '<option value="' + esc(s) + '"' + (v === s ? " selected" : "") + ">" + esc(s) + "</option>";
        }).join("") + "</select>";
    } else if (f.type === "select-mode") {
      h += '<select class="input" name="' + f.name + '">' +
        '<option value="RETIRED">Pensiun – disimpan sebagai arsip</option>' +
        '<option value="SCRAP">Dibuang / Scrap</option></select>';
    } else if (f.type === "select") {
      h += '<select class="input" name="' + f.name + '">' +
        (f.options || []).map(function (o) {
          var ov = typeof o === "string" ? o : o.v, ol = typeof o === "string" ? o : o.l;
          return '<option value="' + esc(ov) + '"' + (v === ov ? " selected" : "") + ">" + esc(ol) + "</option>";
        }).join("") + "</select>";
    } else if (f.type === "inspeksi") {
      h += '<div class="insp-grid">' + INSPEKSI.map(function (titik, i) {
        return '<label class="insp-item"><span>' + esc(titik) + "</span>" +
          '<select name="insp_' + i + '"><option value="">—</option>' +
          NILAI_INSPEKSI.map(function (nv) {
            return '<option value="' + esc(nv) + '">' + esc(nv) + "</option>";
          }).join("") + "</select></label>";
      }).join("") + "</div>";
    } else if (f.type === "date") {
      h += '<input class="input" type="date" name="' + f.name + '" value="' + esc(v || fmtInputDate(Date.now())) + '">';
    } else if (f.type === "number") {
      h += '<input class="input" type="number" min="0" step="1000" name="' + f.name + '" value="' + esc(v) +
        '" placeholder="' + esc(f.ph || "") + '">';
    } else {
      h += '<input class="input" type="' + (f.type === "password" ? "password" : "text") + '" name="' + f.name +
        '" value="' + esc(v) + '" placeholder="' + esc(f.ph || "") + '">';
    }
    if (f.hint) h += '<div class="hint">' + esc(f.hint) + "</div>";
    return h + "</div>";
  }

  function readForm(root, fields) {
    var v = {}, miss = null;
    fields.forEach(function (f) {
      if (f.type === "inspeksi") {
        var obj = {}, ada = false;
        INSPEKSI.forEach(function (titik, i) {
          var el2 = root.querySelector('[name="insp_' + i + '"]');
          if (el2 && el2.value) { obj[titik] = el2.value; ada = true; }
        });
        v[f.name] = ada ? obj : null;
        return;
      }
      var n = root.querySelector('[name="' + f.name + '"]');
      var val = n ? String(n.value).trim() : "";
      v[f.name] = val;
      if (f.req && !val && !miss) miss = f.label;
    });
    return { values: v, missing: miss };
  }

  /* ==================================================================
     11. ROUTER
     ================================================================== */

  var route = { page: "dashboard", param: null };

  function go(page, param) {
    var h = "#/" + page + (param ? "/" + param : "");
    // hash yang sama tidak memicu hashchange — muat ulang halaman secara manual
    // agar menu yang sedang aktif tetap dapat diklik untuk kembali ke kondisi awal
    if (location.hash === h) { onHash(); return; }
    location.hash = h;
  }
  function parseHash() {
    var h = location.hash.replace(/^#\/?/, "");
    var parts = h.split("/").filter(Boolean);
    return { page: parts[0] || "dashboard", param: parts[1] || null };
  }
  function onHash() {
    stopScanner();
    route = parseHash();
    if (!SESSION) { renderLogin(); return; }
    if (!can(route.page)) route = { page: "dashboard", param: null };
    document.body.classList.remove("nav-open");
    render();
    window.scrollTo(0, 0);
  }

  /* ==================================================================
     12. LOGIN
     ================================================================== */

  function renderLogin(errMsg) {
    el("app-shell").classList.add("hidden");
    var s = el("login-screen");
    s.classList.remove("hidden");
    s.innerHTML =
      '<div class="login-wrap">' +
        '<div class="login-logo"><img src="' + window.JB_LOGO_MARK + '" alt="Jhonlin Baratama"></div>' +
        '<h1 class="login-title">JB-SYS</h1>' +
        '<p class="login-sub">Asset Management System</p>' +
        '<p class="login-org">PT Jhonlin Baratama</p>' +
        '<div class="login-card">' +
          "<h2>Masuk ke Sistem</h2>" +
          (errMsg ? '<div class="login-error">' + esc(errMsg) + "</div>" : "") +
          '<div class="field"><label>Email</label>' +
            '<input class="input" id="li-email" type="email" placeholder="admin@jbs.co.id" autocomplete="username"></div>' +
          '<div class="field"><label>Password</label>' +
            '<input class="input" id="li-pass" type="password" placeholder="••••••••" autocomplete="current-password"></div>' +
          '<button class="btn btn-primary btn-block" id="li-go" style="margin-top:6px">Masuk</button>' +
          '<div class="demo-box"><b class="dh">Akun Demo — klik untuk mengisi</b>' +
            DB.users.map(function (u) {
              return '<div class="demo-row" data-em="' + esc(u.email) + '" data-pw="' + esc(u.password) + '">' +
                "<span>" + esc(ROLES[u.role].label) + "</span><code>" + esc(u.email) + "</code></div>";
            }).join("") +
            '<div style="font-size:11px;color:var(--ink-3);margin-top:7px">Password semua akun: ' +
              '<code class="pw">jbsys123</code></div>' +
          "</div>" +
        "</div>" +
        '<p class="login-foot">© 2026 Powered By Andalan Fluid Sistem.</p>' +
      "</div>";

    function attempt() {
      var em = el("li-email").value.trim().toLowerCase();
      var pw = el("li-pass").value;
      var found = null;
      DB.users.forEach(function (u) { if (u.email.toLowerCase() === em && u.password === pw) found = u; });
      if (!found) { renderLogin("Email atau password salah. Silakan periksa kembali."); return; }
      if (!found.aktif) { renderLogin("Akun ini sudah tidak aktif. Hubungi administrator."); return; }
      SESSION = found;
      try { localStorage.setItem(STORE_KEY + ".session", found.id); } catch (e) { }
      s.classList.add("hidden");
      el("app-shell").classList.remove("hidden");
      go("dashboard");
      onHash();
      toast("Selamat datang, " + found.nama + ".");
    }

    el("li-go").addEventListener("click", attempt);
    ["li-email", "li-pass"].forEach(function (id) {
      el(id).addEventListener("keydown", function (e) { if (e.key === "Enter") attempt(); });
    });
    s.querySelectorAll(".demo-row").forEach(function (r) {
      r.addEventListener("click", function () {
        el("li-email").value = r.getAttribute("data-em");
        el("li-pass").value = r.getAttribute("data-pw");
        el("li-pass").focus();
      });
    });
  }

  function logout() {
    SESSION = null;
    try { localStorage.removeItem(STORE_KEY + ".session"); } catch (e) { }
    stopScanner();
    renderLogin();
  }

  /* ==================================================================
     13. SHELL
     ================================================================== */

  function renderShell() {
    var groups = {};
    MENU.forEach(function (m) {
      if (m.roles.indexOf(SESSION.role) < 0) return;
      (groups[m.group] = groups[m.group] || []).push(m);
    });

    var nav = "";
    Object.keys(groups).forEach(function (g) {
      nav += '<div class="side-label">' + esc(g) + "</div>";
      nav += groups[g].map(function (m) {
        return '<button class="nav-item' + (route.page === m.key ? " active" : "") + '" data-nav="' + m.key + '">' +
          icon(m.ico) + "<span>" + esc(m.label) + "</span></button>";
      }).join("");
    });

    el("sidebar").innerHTML =
      '<div class="side-brand"><img src="' + window.JB_LOGO_MARK + '" alt="JB">' +
        '<div><div class="bn">JB-SYS</div><div class="bs">Asset Management</div></div></div>' +
      '<div class="side-scroll">' + nav + "</div>" +
      '<div class="side-user"><div class="avatar">' + esc(SESSION.nama.charAt(0)) + "</div>" +
        '<div style="min-width:0"><div class="nm">' + esc(SESSION.nama) + "</div>" +
        '<div class="rl">' + esc(ROLES[SESSION.role].label) + "</div></div></div>";

    el("topbar").innerHTML =
      '<button class="burger" id="tb-burger">' + icon("menu") + "</button>" +
      '<span class="tb-name">JB-SYS</span><span class="tb-sub">Asset Management</span>' +
      '<div class="topbar-right">' +
        '<div class="tb-user"><div class="nm">' + esc(SESSION.nama) + "</div>" +
          '<div class="rl">' + esc(ROLES[SESSION.role].label) + "</div></div>" +
        '<div class="avatar">' + esc(SESSION.nama.charAt(0)) + "</div>" +
        (isAdmin() ? '<button class="logout-btn" id="tb-reset" title="Kembalikan data ke contoh awal">' +
          icon("refresh") + "<span>Reset Demo</span></button>" : "") +
        '<button class="logout-btn" id="tb-out">' + icon("logout") + "<span>Keluar</span></button>" +
      "</div>";

    el("sidebar").querySelectorAll("[data-nav]").forEach(function (b) {
      b.addEventListener("click", function () { go(b.getAttribute("data-nav")); });
    });
    el("tb-burger").addEventListener("click", function () { document.body.classList.toggle("nav-open"); });
    el("tb-out").addEventListener("click", logout);
    if (el("tb-reset")) el("tb-reset").addEventListener("click", function () {
      confirmDel("Kembalikan seluruh data ke contoh awal? Semua perubahan Anda akan hilang.", resetData);
    });
    el("scrim").onclick = function () { document.body.classList.remove("nav-open"); };
  }

  function pageHead(ico, title, sub, actions) {
    return '<div class="page-head"><div class="ph-ico">' + icon(ico) + "</div>" +
      "<div><h1>" + esc(title) + "</h1><p>" + esc(sub) + "</p></div>" +
      (actions ? '<div class="ph-actions">' + actions + "</div>" : "") + "</div>";
  }
  function emptyState(msg, ico) {
    return '<div class="empty">' + icon(ico || "box") + "<p>" + esc(msg) + "</p></div>";
  }

  /* ==================================================================
     14. RENDER
     ================================================================== */

  function render() {
    renderShell();
    var p = el("page");
    if (route.page === "asset" && route.param) { PAGES.asset_detail(p, route.param); return; }
    if (route.page === "alat" && route.param) { PAGES.alat_detail(p, route.param); return; }
    var fn = PAGES[route.page] || PAGES.dashboard;
    fn(p);
  }

  var PAGES = {};

  /* ---------------- DASHBOARD ---------------- */
  PAGES.dashboard = function (root) {
    var A = DB.assets;
    var nGudang = A.filter(function (a) { return a.lokasiTipe === "GUDANG" && isAktif(a); }).length;
    var nAlat = A.filter(function (a) { return a.lokasiTipe === "ALAT"; }).length;
    var nRepair = A.filter(function (a) { return a.lokasiTipe === "VENDOR"; }).length;
    var nPensiun = A.filter(function (a) { return a.status === "RETIRED"; }).length;
    var nBuang = A.filter(function (a) { return a.status === "SCRAP"; }).length;
    var total = A.length;
    var aktif = nGudang + nAlat + nRepair || 1;

    var pG = Math.round(nGudang / aktif * 100);
    var pM = Math.round(nAlat / aktif * 100);
    var pR = 100 - pG - pM;
    var kritis = A.filter(function (a) { return a.siklusRepair >= CRITICAL_REPAIR && isAktif(a); }).length;

    var cards = [
      { v: nGudang, l: "Di Gudang", ico: "warehouse", c: "var(--green)", bg: "var(--green-bg)" },
      { v: nAlat, l: "Di Alat Berat", ico: "machine", c: "var(--blue)", bg: "var(--blue-bg)" },
      { v: nRepair, l: "Di Repair", ico: "repair", c: "var(--orange)", bg: "var(--orange-bg)" },
      { v: nPensiun, l: "Pensiun", ico: "archive", c: "var(--gray)", bg: "var(--gray-bg)" },
      { v: nBuang, l: "Dibuang", ico: "trashBin", c: "var(--red)", bg: "var(--red-bg)" },
      { v: total, l: "Total Populasi", ico: "box", c: "var(--navy)", bg: "#EEEDF6" }
    ].map(function (c) {
      return '<div class="stat"><div class="si" style="background:' + c.bg + ";color:" + c.c + '">' +
        icon(c.ico) + '</div><div class="sv">' + c.v + '</div><div class="sl">' + esc(c.l) + "</div></div>";
    }).join("");

    var recent = DB.mutasis.slice().sort(function (a, b) { return b.ts - a.ts; }).slice(0, 6);
    var recentHTML = recent.length ? recent.map(function (m) {
      var a = byId(DB.assets, m.assetId);
      if (!a) return "";
      return '<div class="act-row"><div class="ar-main">' +
        '<div class="ar-t"><span class="mono">' + esc(a.sn) + "</span>" +
          '<span style="color:var(--ink-3);font-weight:500">' + esc(prod(a).nama) + "</span></div>" +
        '<div class="ar-s">PIC: ' + esc(m.pic) + " · " + fmtDateTime(m.ts) + "</div></div>" +
        '<span class="badge ' + (MT_TONE[m.aksi] || "b-gray") + '"><span class="dot"></span>' + esc(m.aksi) + "</span></div>";
    }).join("") : emptyState("Belum ada aktivitas mutasi.", "mutasi");

    var atVendor = A.filter(function (a) { return a.lokasiTipe === "VENDOR"; });
    var vendorHTML = atVendor.length ? atVendor.map(function (a) {
      var rp = lastRepair(a.id);
      var masuk = rp ? rp.tglMasuk : a.createdAt;
      // unit yang perbaikannya sudah ditutup: hitung lama pengerjaan (masuk → keluar),
      // unit yang masih dikerjakan: hitung berjalan sampai hari ini
      var akhir = (rp && rp.status === "SELESAI" && rp.tglKeluar) ? rp.tglKeluar : Date.now();
      var d = daysBetween(masuk, akhir);
      var v = byId(DB.vendors, a.lokasiId);
      return '<div class="vend-row"><div style="flex:1;min-width:0">' +
        '<div class="ar-t"><span class="mono">' + esc(a.sn) + '</span>' +
          '<span style="color:var(--ink-3);font-weight:500">— ' + esc(prod(a).nama) + "</span></div>" +
        '<div class="ar-s">Sejak: ' + fmtDateTime(masuk) + " · Rekanan: <b style=\"color:var(--navy)\">" + esc(v ? v.nama : "—") + "</b></div></div>" +
        '<div style="text-align:right;flex:none"><span class="badge ' + (a.status === "FIN" ? "b-cyan" : "b-orange") + '">' +
          (a.status === "FIN" ? "SIAP JEMPUT" : "DI VENDOR") + "</span>" +
        '<div class="' + (a.status === "FIN" ? "dur-ok" : durTone(d)) + '" style="font-size:12px;margin-top:5px">' +
          d + " hari" + (a.status === "FIN" ? " (selesai)" : "") + "</div></div></div>";
    }).join("") : emptyState("Tidak ada unit di bengkel rekanan.", "vendor");

    root.innerHTML =
      pageHead("dashboard", "Dashboard Overview", "Sistem Pemantauan Siklus Hidup & Logistik Unit Cylinder Alat Berat",
        tombolEkspor("xls") + '<button class="btn btn-primary" id="xlsall">' + icon("download") + "Export Semua Data</button>") +
      '<div class="stat-grid">' + cards + "</div>" +
      '<div class="card"><div class="card-head plain"><h3>Analisis Alokasi & Efisiensi</h3>' +
        "<p>Distribusi persentase persebaran fisik unit cylinder di seluruh area operasional</p></div>" +
        '<div class="card-body" style="padding-top:0">' +
        '<div class="alloc-bar">' +
          '<span style="width:' + pG + '%;background:var(--green)"></span>' +
          '<span style="width:' + pM + '%;background:var(--blue)"></span>' +
          '<span style="width:' + Math.max(0, pR) + '%;background:var(--amber)"></span></div>' +
        '<div class="alloc-legend">' +
          '<span class="lg"><i style="background:var(--green)"></i>Gudang (' + pG + '%)</span>' +
          '<span class="lg"><i style="background:var(--blue)"></i>Operasional (' + pM + '%)</span>' +
          '<span class="lg"><i style="background:var(--amber)"></i>Perbaikan (' + Math.max(0, pR) + '%)</span>' +
          '<span class="alloc-warn" style="color:' + (kritis ? "var(--red)" : "var(--ink-3)") + '">' +
            icon("alert", "") + " " + kritis + " unit kritis (≥3× rusak)</span>" +
        "</div></div></div>" +
      '<div class="dash-2col">' +
        '<div class="card"><div class="card-head"><h3>Riwayat Mutasi Terakhir</h3>' +
          "<p>Aktivitas perpindahan fisik unit cylinder terbaru</p></div>" + recentHTML + "</div>" +
        '<div class="card"><div class="card-head"><h3>Daftar Perbaikan Aktif di Vendor</h3>' +
          "<p>Unit yang sedang berada di workshop luar</p></div>" + vendorHTML + "</div>" +
      "</div>";

    root.querySelectorAll(".alloc-warn svg").forEach(function (s) { s.style.width = "13px"; s.style.height = "13px"; });
    el("xls").addEventListener("click", function () {
      eksporExcel("Dashboard", [shRingkasan(), shProduct(), shAlat(), shTerpasang()]);
    });
    el("xlsall").addEventListener("click", eksporSemua);
  };

  /* ---------------- PRODUCT ---------------- */
  PAGES.product = function (root) {
    var q = "";
    function draw() {
      var list = DB.products.filter(function (p) {
        if (!q) return true;
        var s = (p.kode + " " + p.nama + " " + (p.dimensi || "")).toLowerCase();
        return s.indexOf(q.toLowerCase()) >= 0;
      });
      var rows = list.length ? list.map(function (p) {
        var d = distProduk(p.id);
        return "<tr><td><span class=\"t-link mono\">" + esc(p.kode) + "</span></td>" +
          '<td><div class="t-strong">' + esc(p.nama) + "</div>" +
            (p.catatan ? '<div class="t-sub">' + esc(p.catatan) + "</div>" : "") + "</td>" +
          "<td>" + distHTML(d) + "</td>" +
          "<td>" + esc(p.dimensi || "—") + "</td>" +
          "<td>" + (p.tjo ? "<b>" + Number(p.tjo).toLocaleString("id-ID") + "</b> jam" : "—") + "</td>" +
          '<td style="text-align:right;white-space:nowrap">' +
            '<button class="icon-btn" data-edit="' + p.id + '">' + icon("edit") + "</button> " +
            '<button class="icon-btn danger" data-del="' + p.id + '">' + icon("trash") + "</button></td></tr>";
      }).join("") : '<tr><td colspan="6">' + emptyState("Belum ada model produk terdaftar.", "product") + "</td></tr>";

      root.innerHTML =
        pageHead("product", "Model Spesifikasi Produk", "Katalog master parameter teknis dan tipe cylinder induk",
          tombolEkspor("xls") + '<button class="btn btn-primary" id="add">' + icon("plus") + "Tambah Model Baru</button>") +
        '<div class="card"><div class="card-body" style="padding-bottom:14px">' +
          '<div class="search-input" style="max-width:380px">' + icon("search") +
          '<input class="input" id="q" placeholder="Cari kode induk atau nama spek produk..." value="' + esc(q) + '"></div></div>' +
          '<div class="table-wrap"><table><thead><tr>' +
          "<th>Kode Komoditas</th><th>Nama Model / Spesifikasi</th>" +
          "<th>Distribusi Unit Fisik</th><th>Dimensi & Stroke</th>" +
          '<th title="Target Jam Operasi">TJO</th><th></th>' +
          "</tr></thead><tbody>" + rows + "</tbody></table></div></div>";

      el("q").addEventListener("input", function (e) {
        q = e.target.value;
        var pos = e.target.selectionStart;
        draw();
        var n = el("q"); n.focus(); n.setSelectionRange(pos, pos);
      });
      el("xls").addEventListener("click", function () { eksporExcel("Product", [shProduct(list)]); });
      el("add").addEventListener("click", function () { formProduct(null, draw); });
      root.querySelectorAll("[data-edit]").forEach(function (b) {
        b.addEventListener("click", function () { formProduct(byId(DB.products, b.getAttribute("data-edit")), draw); });
      });
      root.querySelectorAll("[data-del]").forEach(function (b) {
        b.addEventListener("click", function () {
          var p = byId(DB.products, b.getAttribute("data-del"));
          var used = DB.assets.filter(function (a) { return a.productId === p.id; }).length;
          if (used) { toast("Model " + p.kode + " dipakai " + used + " unit fisik dan tidak dapat dihapus.", "err"); return; }
          confirmDel("Hapus model " + p.nama + "?", function () {
            DB.products = DB.products.filter(function (x) { return x.id !== p.id; });
            save(); draw(); toast("Model produk dihapus.");
          });
        });
      });
    }
    draw();
  };

  function formProduct(p, done) {
    var fields = [
      { name: "nama", label: "Nama Model / Seri", type: "text", req: true, ph: "Contoh: Boom Cylinder PC2000" },
      { name: "kode", label: "Kode Induk", type: "text", req: true, ph: "Contoh: BOOM-PC20" },
      { name: "dimensi", label: "Deskripsi Detail Ukuran / Stroke", type: "text", ph: "Contoh: Ø 200 mm × stroke 1.850 mm" },
      { name: "tjo", label: "Target Jam Operasi / TJO", type: "number", ph: "Contoh: 3000",
        hint: "Umur pakai yang ditargetkan untuk model ini, dalam jam operasi alat berat." },
      { name: "catatan", label: "Catatan Tambahan", type: "textarea" }
    ];
    openModal({
      title: p ? "Ubah Master Model Produk" : "Tambah Master Model Produk",
      body: '<div class="grid-2">' + fieldHTML(fields[0], p && p.nama) + fieldHTML(fields[1], p && p.kode) + "</div>" +
        '<div class="grid-2">' + fieldHTML(fields[2], p && p.dimensi) + fieldHTML(fields[3], p && p.tjo) + "</div>" +
        fieldHTML(fields[4], p && p.catatan),
      okLabel: "Simpan Model",
      onOk: function (r, close) {
        var f = readForm(r, fields);
        if (f.missing) { toast(f.missing + " wajib diisi.", "err"); return false; }
        var dup = DB.products.filter(function (x) {
          return x.kode.toLowerCase() === f.values.kode.toLowerCase() && (!p || x.id !== p.id);
        }).length;
        if (dup) { toast("Kode induk " + f.values.kode + " sudah dipakai.", "err"); return false; }
        if (p) { Object.keys(f.values).forEach(function (k) { p[k] = f.values[k]; }); }
        else { DB.products.push({ id: uid("p"), kode: f.values.kode, nama: f.values.nama,
          jenis: "", dimensi: f.values.dimensi, tjo: f.values.tjo,
          catatan: f.values.catatan }); }
        save(); close(); done(); toast("Model produk tersimpan.");
      }
    });
  }

  /* ---------------- ASSET ---------------- */
  PAGES.asset = function (root) {
    var q = "", fs = "";
    function draw() {
      var list = DB.assets.filter(function (a) {
        if (fs && a.status !== fs) return false;
        if (!q) return true;
        var s = (a.sn + " " + prod(a).nama + " " + a.qr + " " + (a.wo || "") + " " +
          woUnit(a.id).join(" ") + " " + (a.noPR || "") + " " + (a.noPO || "")).toLowerCase();
        return s.indexOf(q.toLowerCase()) >= 0;
      }).sort(function (x, y) { return x.sn < y.sn ? -1 : 1; });

      var rows = list.length ? list.map(function (a) {
        var st = stat(a), p = prod(a);
        var extra = "";
        if (a.status === "DMG_PR") extra = '<div style="margin-top:5px"><span class="badge b-amber">Butuh PO</span></div>';
        else if (a.status === "DMG_PO") extra = '<div style="margin-top:5px"><span class="badge b-cyan">Siap Kirim</span></div>';
        else if (a.status === "RPR") {
          var rp = activeRepair(a.id);
          if (rp) { var d = daysBetween(rp.tglMasuk, Date.now());
            extra = '<div class="' + durTone(d) + '" style="margin-top:5px;font-size:11px">' + d + " hari di vendor</div>"; }
        }
        return '<tr class="clickable" data-open="' + a.id + '">' +
          '<td><span class="t-link mono">' + esc(a.sn) + "</span>" +
            '<div class="t-sub">' + esc(lokasiLabel(a)) + (a.slot ? " · " + esc(a.slot) : "") + "</div></td>" +
          '<td><div class="t-strong">' + esc(p.nama) + "</div>" +
            '<div class="t-sub">Model Ref: ' + esc(p.kode) + " · " + esc(a.tipe) + "</div></td>" +
          "<td>" + (a.wo ? '<span class="mono" style="color:var(--cyan);font-weight:650">' + esc(a.wo) + "</span>" +
            (a.jenisRepair ? '<div class="t-sub">' + esc(a.jenisRepair === "WC" ? "Warranty Claim" : "Recondition") + "</div>" : "")
            : '<span style="color:var(--ink-3)">—</span>') + "</td>" +
          '<td><span class="badge ' + st.tone + '"><span class="dot"></span>' + esc(st.label) + "</span>" + extra + "</td>" +
          '<td><b>' + a.siklusPakai + "×</b></td>" +
          '<td><b class="' + (a.siklusRepair >= CRITICAL_REPAIR ? "dur-bad" : "") + '">' + a.siklusRepair + "×</b></td>" +
          '<td style="text-align:right"><button class="icon-btn" data-qr="' + a.id + '" title="QR Code">' + icon("qr") + "</button></td></tr>";
      }).join("") : '<tr><td colspan="7">' + emptyState("Tidak ada unit yang cocok dengan pencarian.", "asset") + "</td></tr>";

      var opts = ['<option value="">Semua Status</option>'].concat(Object.keys(ST).map(function (k) {
        return '<option value="' + k + '"' + (fs === k ? " selected" : "") + ">" + esc(ST[k].label) + "</option>";
      })).join("");

      root.innerHTML =
        pageHead("asset", "Katalog Unit Asset Cylinder", "Manajemen logistik, status operasional, dan tracking fisik silinder pabrik",
          tombolEkspor("xls") +
          (canEditMaster() ? '<button class="btn btn-primary" id="add">' + icon("plus") + "Tambah Asset</button>" : "")) +
        '<div class="card"><div class="card-body" style="padding-bottom:14px"><div class="search-bar">' +
          '<div class="search-input">' + icon("search") +
            '<input class="input" id="q" placeholder="Cari serial number, nama cylinder, nomor WO, PR, atau PO..." value="' + esc(q) + '"></div>' +
          '<select class="input" id="fs" style="max-width:230px">' + opts + "</select></div></div>" +
          '<div class="table-wrap"><table><thead><tr>' +
          "<th>Serial Number</th><th>Nama Spesifikasi Cylinder</th>" +
          '<th title="Nomor Work Order perbaikan terakhir">WO Terakhir</th><th>Status & Dokumen</th>' +
          "<th>Siklus Pakai</th><th>Siklus Repair</th><th></th>" +
          "</tr></thead><tbody>" + rows + "</tbody></table></div></div>";

      el("q").addEventListener("input", function (e) {
        q = e.target.value; var pos = e.target.selectionStart;
        draw(); var n = el("q"); n.focus(); n.setSelectionRange(pos, pos);
      });
      el("fs").addEventListener("change", function (e) { fs = e.target.value; draw(); });
      el("xls").addEventListener("click", function () { eksporExcel("Asset", [shAsset(list), shTerpasang()]); });
      if (el("add")) el("add").addEventListener("click", function () { formAsset(draw); });
      root.querySelectorAll("[data-open]").forEach(function (tr) {
        tr.addEventListener("click", function (e) {
          if (e.target.closest("[data-qr]")) return;
          go("asset", tr.getAttribute("data-open"));
        });
      });
      root.querySelectorAll("[data-qr]").forEach(function (b) {
        b.addEventListener("click", function (e) {
          e.stopPropagation(); showQR(byId(DB.assets, b.getAttribute("data-qr")));
        });
      });
    }
    draw();
  };

  function showQR(a) {
    openModal({
      title: "QR Code Asset", sub: a.sn, narrow: true,
      body: '<div class="qr-stage"><img id="qrc" alt="QR Code ' + esc(a.sn) + '"></div>' +
        '<div class="qr-sn">' + esc(a.qr) + "</div>" +
        '<button class="btn btn-primary btn-block" id="dl">' + icon("download") + "Unduh Gambar PNG</button>" +
        '<button class="btn btn-ghost btn-block" id="pr" style="margin-top:9px">' + icon("print") + "Cetak Label</button>" +
        '<p style="font-size:11.5px;color:var(--ink-3);text-align:center;margin:14px 0 0">' +
          "Cetak pada label industri tahan panas, uap, dan oli menggunakan printer thermal transfer ribbon resin." +
          "<br>Di HP, gambar QR dapat ditekan-lama lalu disimpan.</p>",
      foot: null,
      onMount: function (r, close) {
        // dirender sebagai <img> agar di HP bisa ditekan-lama lalu "Simpan gambar",
        // termasuk ketika halaman dibuka dari tautan yang memblokir unduhan langsung
        var cv = document.createElement("canvas");
        drawQR(cv, a.qr, { scale: 8, ec: "M" });
        r.querySelector("#qrc").src = cv.toDataURL("image/png");
        r.querySelector("#dl").addEventListener("click", function () { downloadQR(a); });
        r.querySelector("#pr").addEventListener("click", function () { printQR(a); });
      }
    });
  }

  function formAsset(done) {
    var fields = [
      { name: "productId", label: "Model Katalog Produk", type: "select", req: true,
        options: [{ v: "", l: "— Cari Kode / Seri Produk —" }].concat(DB.products.map(function (p) {
          return { v: p.id, l: p.kode + " — " + p.nama }; })) },
      { name: "sn", label: "Serial Number Resmi (Unique SN)", type: "text", req: true, ph: "contoh: CYL-BOOM-007" },
      { name: "tipe", label: "Kategori Sistem Penggerak", type: "select",
        options: ["Hydraulic Cylinder", "Pneumatic Cylinder"] },
      { name: "gudangId", label: "Gudang Penampung Awal (Initial Inbound)", type: "select-gudang", req: true },
      { name: "deskripsi", label: "Deskripsi", type: "textarea", ph: "Kondisi awal unit atau nomor pembelian" },
      { name: "catatan", label: "Catatan", type: "textarea" }
    ];
    if (!DB.products.length) { toast("Isi menu Product terlebih dahulu sebelum mendaftarkan unit.", "err"); return; }

    openModal({
      title: "Registrasi Unit Asset Baru",
      sub: "Tambahkan unit sebagai aset fisik dan buat identitas QR permanen",
      wide: true,
      body: '<div class="grid-2"><div>' + fieldHTML(fields[0]) + fieldHTML(fields[1]) + fieldHTML(fields[2]) + fieldHTML(fields[3]) +
        "</div><div>" + fieldHTML(fields[4]) + fieldHTML(fields[5]) + "</div></div>",
      okLabel: "Simpan Unit Asset",
      onOk: function (r, close) {
        var f = readForm(r, fields);
        if (f.missing) { toast(f.missing + " wajib diisi.", "err"); return false; }
        var sn = f.values.sn.toUpperCase();
        if (findAssetByCode(sn)) { toast("Serial Number " + sn + " sudah terdaftar.", "err"); return false; }
        var g = byId(DB.gudangs, f.values.gudangId);
        var a = {
          id: uid("a"), sn: sn, qr: QR_PREFIX + sn, productId: f.values.productId,
          tipe: f.values.tipe || "Hydraulic Cylinder", status: "RFU",
          lokasiTipe: "GUDANG", lokasiId: g.id, slot: "",
          siklusPakai: 0, siklusRepair: 0, noPR: "", noPO: "",
          deskripsi: f.values.deskripsi, catatan: f.values.catatan, createdAt: Date.now()
        };
        DB.assets.push(a);
        pushMutasi({ assetId: a.id, aksi: MT.REGISTRASI, dari: "Initial", ke: g.nama, catatan: f.values.deskripsi });
        save(); close(); done();
        toast("Unit " + sn + " terdaftar. Cetak dan tempel stiker QR sebelum unit dipakai.");
        showQR(a);
      }
    });
  }

  /* ---------------- ASSET DETAIL ---------------- */
  PAGES.asset_detail = function (root, id) {
    var a = byId(DB.assets, id);
    if (!a) { root.innerHTML = emptyState("Unit tidak ditemukan.", "asset"); return; }
    var p = prod(a), st = stat(a);
    var filter = "SEMUA";

    function drawTimeline() {
      var list = assetMutasis(a.id);
      if (filter === "MUTASI") list = list.filter(function (m) { return m.aksi !== MT.EDIT; });
      else if (filter === "EDIT") list = list.filter(function (m) { return m.aksi === MT.EDIT; });

      var box = root.querySelector("#tl");
      if (!list.length) { box.innerHTML = emptyState("Belum ada riwayat.", "history"); return; }

      box.innerHTML = list.map(function (m, i) {
        var next = list[i + 1];
        var tone = MT_TONE[m.aksi] || "b-gray";
        var col = { "b-green": "var(--green)", "b-blue": "var(--blue)", "b-amber": "var(--amber)",
          "b-orange": "var(--orange)", "b-cyan": "var(--cyan)", "b-navy": "var(--navy)", "b-gray": "var(--gray)" }[tone];
        var bg = { "b-green": "var(--green-bg)", "b-blue": "var(--blue-bg)", "b-amber": "var(--amber-bg)",
          "b-orange": "var(--orange-bg)", "b-cyan": "var(--cyan-soft)", "b-navy": "#EEEDF6", "b-gray": "var(--gray-bg)" }[tone];
        var ic = TL_ICON[m.aksi] || "warehouse";

        return '<div class="tl-item"><div class="tl-mark">' +
            '<div class="tl-dot" style="background:' + bg + ";color:" + col + '">' + icon(ic) + "</div>" +
            (next ? '<div class="tl-line"><span class="tl-gap">' + humanGap(m.ts - next.ts) + "</span></div>" : "") +
          "</div><div class=\"tl-body\">" +
            '<div class="tl-title">' + esc(m.aksi) +
              (m.slot ? '<span class="chip mini">' + esc(m.slot) + "</span>" : "") + "</div>" +
            '<div class="tl-time">' + fmtDateTime(m.ts) + " · PIC: " + esc(m.pic) + " · " + esc(m.logId) + "</div>" +
            '<div class="tl-route"><span class="chip">' + esc(m.dariLabel) + "</span>" + icon("arrow") +
              '<span class="chip">' + esc(m.keLabel) + "</span>" +
              (m.dokumen ? '<span class="chip" style="color:var(--cyan)">' + icon("doc") + esc(m.dokumen) + "</span>" : "") + "</div>" +
            (m.catatan ? '<div class="tl-note">' + esc(m.catatan) + "</div>" : "") +
          "</div></div>";
      }).join("");
      box.querySelectorAll(".tl-route svg").forEach(function (s) { s.style.width = "13px"; s.style.height = "13px"; });
    }

    var acts = availableActions(a);
    var repairs = DB.repairs.filter(function (r) { return r.assetId === a.id; });
    var totalBiaya = repairs.reduce(function (s, r) { return s + (r.biaya || 0); }, 0);

    root.innerHTML =
      '<div class="page-head"><div class="ph-ico">' + icon("asset") + "</div>" +
        "<div><h1>" + esc(p.nama) + '</h1><p>Serial Identitas ' + esc(a.sn) + "</p></div>" +
        '<div class="ph-actions">' +
          '<button class="btn btn-ghost" id="back">' + icon("back") + "Kembali</button>" +
          '<button class="btn btn-ghost" id="qr">' + icon("qr") + "QR Code</button>" +
          (canEditMaster() ? '<button class="btn btn-ghost" id="edit">' + icon("edit") + "Edit</button>" : "") +
          (acts.length ? '<button class="btn btn-cyan" id="mut">' + icon("mutasi") + "Mutasi</button>" : "") +
        "</div></div>" +

      '<div class="detail-grid"><div>' +
        '<div class="card"><div class="card-head"><h3>Informasi Asset</h3><p>Kondisi parameter aset ini</p></div>' +
        '<div class="info-list">' +
          info("Status", '<span class="badge ' + st.tone + '"><span class="dot"></span>' + esc(st.label) + "</span>") +
          info("QR Code", '<span class="mono">' + esc(a.qr) + "</span>") +
          info("Kategori Tipe", esc(a.tipe)) +
          info("Model Induk", esc(p.kode)) +
          info("Dimensi", esc(p.dimensi || "—")) +
          info("Siklus Pakai", "<b>" + a.siklusPakai + "×</b>") +
          info("Siklus Repair", '<b class="' + (a.siklusRepair >= CRITICAL_REPAIR ? "dur-bad" : "") + '">' + a.siklusRepair + "×</b>") +
          info("WO Terakhir", a.wo ? '<span class="mono" style="color:var(--cyan)">' + esc(a.wo) + "</span>" : "—") +
          info("Jenis Pekerjaan", a.jenisRepair === "WC" ? '<span class="badge b-red">WC — Warranty Claim</span>' :
            (a.jenisRepair === "RC" ? '<span class="badge b-gray">RC — Recondition</span>' : "—")) +
          info("PR Terakhir", a.noPR ? '<span class="mono" style="color:var(--cyan)">' + esc(a.noPR) + "</span>" : "—") +
          info("PO Terakhir", a.noPO ? '<span class="mono" style="color:var(--cyan)">' + esc(a.noPO) + "</span>" : "—") +
          info("Lokasi", esc(lokasiLabel(a)) + (a.slot ? " · " + esc(a.slot) : "")) +
          info("Total Biaya Repair", totalBiaya ? fmtRp(totalBiaya) : "—") +
          info("Terdaftar", fmtDate(a.createdAt)) +
        "</div></div>" +
        (function () {
          if (a.lokasiTipe !== "ALAT") return "";
          var alat = byId(DB.alats, a.lokasiId);
          var j = hitungJam(a, alat);
          if (!j.hmi && !j.tjo) return "";
          var tone = !j.tjo ? "" : (j.kjo > 0 ? "dur-bad" : (j.kjo > -j.tjo * 0.15 ? "dur-warn" : "dur-ok"));
          return '<div class="card" style="margin-top:14px"><div class="card-head"><h3>Umur Pakai Terpasang</h3>' +
            "<p>Dihitung dari hour meter " + esc(alat ? alat.nama : "alat berat") + "</p></div>" +
            '<div class="card-body" style="padding-top:8px"><div class="hm-grid">' +
            '<div class="hm-box"><div class="hk">HMI · Install</div><div class="hv">' + nomorRingkas(j.hmi) + "</div></div>" +
            '<div class="hm-box"><div class="hk">JJO · Berjalan</div><div class="hv">' + nomorRingkas(j.jjo) + "</div></div>" +
            '<div class="hm-box"><div class="hk">TJO · Target</div><div class="hv">' + nomorRingkas(j.tjo) + "</div></div>" +
            '<div class="hm-box"><div class="hk">THM · Ganti Pada</div><div class="hv">' + nomorRingkas(j.thm) + "</div></div>" +
            '<div class="hm-box"><div class="hk">KJO · Selisih</div><div class="hv ' + tone + '">' +
              (j.tjo ? (j.kjo > 0 ? "+" : "") + j.kjo.toLocaleString("id-ID") : "—") + "</div></div>" +
            "</div>" +
            (j.tjo ? '<div class="alloc-bar" style="margin:16px 0 8px"><span style="width:' + j.pakai +
              '%;background:' + (j.kjo > 0 ? "var(--red)" : "var(--green)") + '"></span></div>' +
              '<div style="font-size:11.5px;color:var(--ink-3)">Terpakai <b>' + j.pakai +
              "%</b> dari target " + nomorRingkas(j.tjo) + " jam · target ganti pada hour meter " +
              nomorRingkas(j.thm) + "</div>" : "") +
            "</div></div>";
        })() +
        (a.catatan || a.deskripsi ?
          '<div class="card" style="margin-top:14px"><div class="card-head"><h3>Catatan</h3></div>' +
          '<div class="card-body" style="font-size:12.7px;color:var(--ink-2)">' +
          esc(a.deskripsi || "") + (a.deskripsi && a.catatan ? "<br>" : "") + esc(a.catatan || "") + "</div></div>" : "") +
        (repairs.length ?
          '<div class="card" style="margin-top:14px"><div class="card-head"><h3>Riwayat Perbaikan</h3>' +
          "<p>" + repairs.length + " catatan perbaikan</p></div><div class=\"info-list\">" +
          repairs.slice().sort(function (x, y) { return y.tglMasuk - x.tglMasuk; }).map(function (r) {
            var v = byId(DB.vendors, r.vendorId);
            var d = r.tglKeluar ? daysBetween(r.tglMasuk, r.tglKeluar) : daysBetween(r.tglMasuk, Date.now());
            return info(fmtDate(r.tglMasuk), '<div style="text-align:right"><div>' + esc(v ? v.nama : "—") +
              (r.wo ? ' <span class="mono" style="color:var(--cyan)">' + esc(r.wo) + "</span>" : "") + "</div>" +
              '<div style="font-size:11.5px;font-weight:500;color:var(--ink-3);margin-top:2px">' +
              (r.jenisRepair === "WC" ? "Klaim garansi" : (r.biaya ? fmtRp(r.biaya) : "Berlangsung")) +
              " · <span class=\"" + durTone(d) + '">' + d + " hari</span></div>" +
              (r.inspeksi ? '<div style="font-size:11px;color:var(--ink-3);margin-top:4px">' +
                Object.keys(r.inspeksi).map(function (k) { return esc(k) + ": " + esc(r.inspeksi[k]); }).join(" · ") +
                "</div>" : "") + "</div>");
          }).join("") + "</div></div>" : "") +
      "</div>" +

      '<div class="card"><div class="card-head" style="display:flex;align-items:center;gap:14px">' +
        '<div style="flex:1"><h3>Riwayat</h3><p>Jejak lengkap pergerakan unit sepanjang umur pakainya</p></div>' +
        '<div class="tabs"><button class="tab active" data-f="SEMUA">Semua</button>' +
        '<button class="tab" data-f="MUTASI">Mutasi</button>' +
        '<button class="tab" data-f="EDIT">Edit</button></div></div>' +
        '<div class="timeline" id="tl"></div></div></div>';

    drawTimeline();
    el("back").addEventListener("click", function () { go("asset"); });
    el("qr").addEventListener("click", function () { showQR(a); });
    if (el("edit")) el("edit").addEventListener("click", function () { formEditAsset(a, function () { render(); }); });
    if (el("mut")) el("mut").addEventListener("click", function () {
      pickAction(a, function () { go("asset", a.id); render(); });
    });
    root.querySelectorAll(".tab").forEach(function (t) {
      t.addEventListener("click", function () {
        root.querySelectorAll(".tab").forEach(function (x) { x.classList.remove("active"); });
        t.classList.add("active"); filter = t.getAttribute("data-f"); drawTimeline();
      });
    });

    function info(k, v) {
      return '<div class="info-row"><span class="k">' + esc(k) + '</span><span class="v">' + v + "</span></div>";
    }
  };

  function formEditAsset(a, done) {
    var fields = [
      { name: "sn", label: "Serial Number", type: "text", req: true },
      { name: "productId", label: "Model Katalog Produk", type: "select", req: true,
        options: DB.products.map(function (p) { return { v: p.id, l: p.kode + " — " + p.nama }; }) },
      { name: "tipe", label: "Kategori Sistem Penggerak", type: "select", options: ["Hydraulic Cylinder", "Pneumatic Cylinder"] },
      { name: "deskripsi", label: "Deskripsi", type: "textarea" },
      { name: "catatan", label: "Catatan", type: "textarea" }
    ];
    openModal({
      title: "Ubah Data Unit Asset", sub: a.sn,
      body: fields.map(function (f) { return fieldHTML(f, a[f.name]); }).join(""),
      okLabel: "Simpan Perubahan",
      onOk: function (r, close) {
        var f = readForm(r, fields);
        if (f.missing) { toast(f.missing + " wajib diisi.", "err"); return false; }
        var sn = f.values.sn.toUpperCase();
        var other = findAssetByCode(sn);
        if (other && other.id !== a.id) { toast("Serial Number sudah dipakai unit lain.", "err"); return false; }
        var changes = [];
        if (sn !== a.sn) { changes.push("SN: " + a.sn + " → " + sn); a.sn = sn; a.qr = QR_PREFIX + sn; }
        if (f.values.productId !== a.productId) {
          changes.push("Model: " + prod(a).kode + " → " + byId(DB.products, f.values.productId).kode);
          a.productId = f.values.productId;
        }
        if (f.values.tipe !== a.tipe) { changes.push("Tipe: " + a.tipe + " → " + f.values.tipe); a.tipe = f.values.tipe; }
        a.deskripsi = f.values.deskripsi; a.catatan = f.values.catatan;
        if (changes.length) {
          pushMutasi({ assetId: a.id, aksi: MT.EDIT, dari: "Data Unit", ke: "Data Unit", catatan: changes.join(" · ") });
        }
        save(); close(); done(); toast("Data unit diperbarui.");
      }
    });
  }

  /* ---------------- PILIH TINDAKAN MUTASI ---------------- */
  function pickAction(a, done) {
    var acts = availableActions(a);
    if (!acts.length) {
      openModal({ title: "Tidak Ada Tindakan", sub: a.sn, narrow: true,
        body: '<p style="margin:0;font-size:13px;color:var(--ink-2)">Unit berstatus <b>' + esc(stat(a).label) +
          "</b> tidak memiliki tindakan lanjutan di dalam sistem.</p>",
        foot: '<button class="btn btn-ghost" data-x>Tutup</button>' });
      return;
    }
    var m = openModal({
      title: "Pilih Tindakan Alur Logistik",
      sub: a.sn + " · " + stat(a).label,
      body: acts.map(function (ac, i) {
        var col = { "b-green": "var(--green)", "b-blue": "var(--blue)", "b-amber": "var(--amber)",
          "b-orange": "var(--orange)", "b-cyan": "var(--cyan)", "b-gray": "var(--gray)" }[ac.tone];
        var bg = { "b-green": "var(--green-bg)", "b-blue": "var(--blue-bg)", "b-amber": "var(--amber-bg)",
          "b-orange": "var(--orange-bg)", "b-cyan": "var(--cyan-soft)", "b-gray": "var(--gray-bg)" }[ac.tone];
        return '<button class="action-pick" data-i="' + i + '">' +
          '<span class="ap-ico" style="background:' + bg + ";color:" + col + '">' + icon(ac.ico) + "</span>" +
          '<span style="flex:1"><span class="ap-t" style="display:block">' + esc(ac.label) + "</span>" +
          '<span class="ap-d" style="display:block">' + esc(ac.desc) + "</span></span>" +
          '<span class="ap-arrow">' + icon("arrow") + "</span></button>";
      }).join(""),
      foot: '<button class="btn btn-ghost" data-x>Batal</button>',
      onMount: function (r, close) {
        r.querySelectorAll(".ap-ico svg,.ap-arrow svg").forEach(function (s) { s.style.width = "16px"; s.style.height = "16px"; });
        r.querySelectorAll("[data-i]").forEach(function (b) {
          b.addEventListener("click", function () {
            var ac = acts[Number(b.getAttribute("data-i"))];
            close();
            runActionForm(a, ac, done);
          });
        });
      }
    });
    return m;
  }

  function runActionForm(a, ac, done) {
    openModal({
      title: ac.label, sub: a.sn + " · " + prod(a).nama,
      body: '<div style="background:var(--line-soft);border-radius:10px;padding:11px 13px;margin-bottom:17px;font-size:12.3px;color:var(--ink-2)">' +
          icon("info") + " " + esc(ac.desc) + "</div>" +
        ac.fields.map(function (f) {
          var pre = "";
          if (f.name === "gudangId" && f.karantinaFirst) {
            var k = DB.gudangs.filter(function (g) { return g.karantina; })[0];
            pre = k ? k.id : "";
          }
          if (f.name === "noPO") pre = a.noPO || "";
          return fieldHTML(f, pre);
        }).join(""),
      okLabel: "Jalankan Tindakan",
      onMount: function (r) {
        var s = r.querySelector("svg"); if (s) { s.style.width = "13px"; s.style.height = "13px"; s.style.verticalAlign = "-2px"; }
      },
      onOk: function (r, close) {
        var f = readForm(r, ac.fields);
        if (f.missing) { toast(f.missing + " wajib diisi.", "err"); return false; }
        var res = runAction(a.id, ac.key, f.values);
        if (!res.ok) { toast(res.msg, "err"); return false; }
        save(); close();
        toast(res.msg);
        if (done) done();
      }
    });
  }

  /* ---------------- FORM MUTASI (SCAN) ---------------- */
  PAGES["mutasi-form"] = function (root) {
    var found = null;

    function drawScan() {
      stopScanner();
      root.innerHTML =
        pageHead("mutasi", "Alur Logistik Mutasi", "Registrasi perpindahan fisik dan penugasan berkas unit cylinder") +
        '<div class="card scan-card"><div class="card-head"><h3>Scan QR Code / Input Serial</h3>' +
          "<p>Gunakan kamera scanner terintegrasi atau ketik manual</p></div>" +
          '<div class="card-body">' +
            '<div class="scan-view" id="sv">' +
              '<div class="scan-idle" id="idle">' + icon("camera") + "<p>KAMERA PEMINDAI NONAKTIF</p></div>" +
              '<video id="vid" class="hidden" playsinline muted></video>' +
              '<div class="scan-frame hidden" id="frame"><div class="box"></div><div class="scan-laser"></div></div>' +
            "</div>" +
            '<button class="btn btn-primary btn-block" id="cam" style="margin-top:14px">' + icon("camera") + "Buka Lensa Kamera</button>" +
            '<div class="scan-or">ATAU ENTRI MANUAL</div>' +
            '<div class="manual-row"><input class="input" id="sn" placeholder="Ketik serial number unit..." autocomplete="off">' +
              '<button class="btn btn-cyan" id="val">' + icon("check") + "Validasi</button></div>" +
            '<div id="st"></div>' +
          "</div></div>";

      var camOn = false;
      el("cam").addEventListener("click", function () {
        if (camOn) { stopScanner(); drawScan(); return; }
        camOn = true;
        el("idle").classList.add("hidden");
        el("vid").classList.remove("hidden");
        el("frame").classList.remove("hidden");
        el("cam").innerHTML = icon("close") + "Tutup Kamera";
        status("Arahkan kamera ke stiker QR pada badan cylinder...", "info");
        startScanner(el("vid"), function (code) {
          var a = findAssetByCode(code);
          if (!a) { status("QR terbaca (" + code + ") tetapi unit tidak terdaftar di sistem.", "err"); drawScan(); return; }
          found = a; drawDetected();
        }, function (msg) {
          status(msg, "err");
          camOn = false;
          el("idle").classList.remove("hidden");
          el("vid").classList.add("hidden");
          el("frame").classList.add("hidden");
          el("cam").innerHTML = icon("camera") + "Buka Lensa Kamera";
        });
      });

      function validate() {
        var v = el("sn").value.trim();
        if (!v) { status("Masukkan serial number terlebih dahulu.", "err"); return; }
        var a = findAssetByCode(v);
        if (!a) { status("Unit dengan serial " + v + " tidak ditemukan.", "err"); return; }
        found = a; drawDetected();
      }
      el("val").addEventListener("click", validate);
      el("sn").addEventListener("keydown", function (e) { if (e.key === "Enter") validate(); });

      function status(msg, kind) {
        var c = kind === "err" ? "var(--red)" : "var(--cyan)";
        var bg = kind === "err" ? "var(--red-bg)" : "var(--cyan-soft)";
        el("st").innerHTML = '<div class="scan-status" style="background:' + bg + ";color:" + c + '">' + esc(msg) + "</div>";
      }
    }

    function drawDetected() {
      stopScanner();
      var a = found, p = prod(a), st = stat(a);
      var acts = availableActions(a);
      var rp = activeRepair(a.id);

      root.innerHTML =
        pageHead("mutasi", "Alur Logistik Mutasi", "Registrasi perpindahan fisik dan penugasan berkas unit cylinder") +
        '<div class="card scan-card"><div class="card-head"><h3>Spesifikasi Log Terdeteksi</h3>' +
          "<p>Verifikasi kesesuaian unit fisik sebelum melakukan tindakan logistik</p></div>" +
          '<div class="spec-list">' +
            row("Serial Number", '<span class="mono">' + esc(a.sn) + "</span>") +
            row("Nama Model Asset", esc(p.nama)) +
            row("Status Logistik Terakhir", '<span class="badge ' + st.tone + '"><span class="dot"></span>' + esc(st.label) + "</span>") +
            row("Nomor PR Aktif", a.noPR ? '<span class="mono" style="color:var(--cyan)">' + esc(a.noPR) + "</span>" : "—") +
            row("Nomor PO Aktif", a.noPO ? '<span class="mono" style="color:var(--cyan)">' + esc(a.noPO) + "</span>" : "—") +
            row("Posisi Sekarang", '<span class="chip">' + icon(lokasiIcon(a)) + esc(lokasiLabel(a)) +
              (a.slot ? " · " + esc(a.slot) : "") + "</span>") +
            row("Siklus Pakai / Repair", "<b>" + a.siklusPakai + "×</b> / <b>" + a.siklusRepair + "×</b>") +
            (rp ? row("Durasi di Vendor", '<span class="' + durTone(daysBetween(rp.tglMasuk, Date.now())) + '">' +
              daysBetween(rp.tglMasuk, Date.now()) + " hari</span>") : "") +
          "</div></div>" +

        '<div class="card scan-card" style="margin-top:14px"><div class="card-head"><h3>Pilih Tindakan Alur Logistik</h3>' +
          "<p>Tentukan status rilis dokumen penugasan selanjutnya</p></div>" +
          '<div class="card-body">' +
            (acts.length ? acts.map(function (ac, i) {
              var col = { "b-green": "var(--green)", "b-blue": "var(--blue)", "b-amber": "var(--amber)",
                "b-orange": "var(--orange)", "b-cyan": "var(--cyan)", "b-gray": "var(--gray)" }[ac.tone];
              var bg = { "b-green": "var(--green-bg)", "b-blue": "var(--blue-bg)", "b-amber": "var(--amber-bg)",
                "b-orange": "var(--orange-bg)", "b-cyan": "var(--cyan-soft)", "b-gray": "var(--gray-bg)" }[ac.tone];
              return '<button class="action-pick" data-i="' + i + '">' +
                '<span class="ap-ico" style="background:' + bg + ";color:" + col + '">' + icon(ac.ico) + "</span>" +
                '<span style="flex:1"><span class="ap-t" style="display:block">' + esc(ac.label) + "</span>" +
                '<span class="ap-d" style="display:block">' + esc(ac.desc) + "</span></span>" +
                '<span class="ap-arrow">' + icon("arrow") + "</span></button>";
            }).join("") : '<div style="padding:10px 0;font-size:13px;color:var(--ink-3)">Unit berstatus <b>' +
              esc(st.label) + "</b> tidak memiliki tindakan lanjutan.</div>") +
            '<button class="btn btn-ghost btn-block" id="again" style="margin-top:6px">' + icon("back") + "Batalkan & Pindai Ulang</button>" +
          "</div></div>";

      root.querySelectorAll(".ap-ico svg,.ap-arrow svg,.chip svg").forEach(function (s) {
        s.style.width = "15px"; s.style.height = "15px";
      });
      root.querySelectorAll("[data-i]").forEach(function (b) {
        b.addEventListener("click", function () {
          runActionForm(a, acts[Number(b.getAttribute("data-i"))], function () { found = byId(DB.assets, a.id); drawDetected(); });
        });
      });
      el("again").addEventListener("click", function () { found = null; drawScan(); });

      function row(k, v) {
        return '<div class="info-row"><span class="k">' + esc(k) + '</span><span class="v">' + v + "</span></div>";
      }
    }

    drawScan();
  };

  /* ---------------- MUTASI ASSET (LOG) ---------------- */
  PAGES.mutasi = function (root) {
    var f = { q: "", jenis: "", dari: "", sampai: "" };

    function draw() {
      var list = DB.mutasis.slice().sort(function (a, b) { return b.ts - a.ts; }).filter(function (m) {
        var a = byId(DB.assets, m.assetId);
        if (!a) return false;
        if (f.jenis && m.aksi !== f.jenis) return false;
        if (f.dari && m.ts < new Date(f.dari + "T00:00:00").getTime()) return false;
        if (f.sampai && m.ts > new Date(f.sampai + "T23:59:59").getTime()) return false;
        if (f.q) {
          var al = alatMutasi(m);
          var s = (a.sn + " " + prod(a).nama + " " + m.dokumen + " " + m.pic + " " +
            (m.wo || "") + " " + (al ? al.kode + " " + al.nama : "")).toLowerCase();
          if (s.indexOf(f.q.toLowerCase()) < 0) return false;
        }
        return true;
      });

      var rows = list.length ? list.map(function (m) {
        var a = byId(DB.assets, m.assetId);
        return "<tr><td><div class=\"t-strong\">" + fmtDateTime(m.ts) + "</div>" +
            '<div class="t-sub mono">' + esc(m.logId) + "</div></td>" +
          '<td><div class="t-strong">' + esc(prod(a).nama) + "</div>" +
            '<div class="t-sub mono t-link" data-go="' + a.id + '">' + esc(a.sn) + "</div></td>" +
          '<td><span class="badge ' + (MT_TONE[m.aksi] || "b-gray") + '"><span class="dot"></span>' + esc(m.aksi) + "</span></td>" +
          '<td><div class="route"><span class="chip">' + esc(m.dariLabel) + "</span>" + icon("arrow") +
            '<span class="chip">' + esc(m.keLabel) + "</span></div></td>" +
          "<td>" + (function () {
            var al = alatMutasi(m);
            if (!al) return '<span style="color:var(--ink-3)">—</span>';
            return '<span class="mono t-strong">' + esc(al.kode) + "</span>" +
              (m.slot ? '<div class="t-sub">' + esc(m.slot) + "</div>" : "");
          })() + "</td>" +
          "<td>" + (m.wo ? '<span class="mono" style="color:var(--cyan);font-size:12px">' + esc(m.wo) + "</span>" :
            '<span style="color:var(--ink-3)">—</span>') + "</td>" +
          "<td>" + (m.dokumen ? '<span class="mono" style="color:var(--cyan);font-size:12px">' + esc(m.dokumen) + "</span>" : "—") + "</td>" +
          '<td style="max-width:240px;font-size:12px;color:var(--ink-2)">' + (m.catatan ? esc(m.catatan) : "—") + "</td>" +
          "<td>" + esc(m.pic) + "</td></tr>";
      }).join("") : '<tr><td colspan="9">' + emptyState("Tidak ada log yang cocok dengan filter.", "history") + "</td></tr>";

      var jenisOpts = ['<option value="">Semua Pergerakan</option>'].concat(
        Object.keys(MT).map(function (k) {
          return '<option value="' + esc(MT[k]) + '"' + (f.jenis === MT[k] ? " selected" : "") + ">" + esc(MT[k]) + "</option>";
        })).join("");

      root.innerHTML =
        pageHead("history", "Riwayat Mutasi Logistik", "Audit trail dan rekam jejak perpindahan fisik seluruh unit cylinder pabrik",
          tombolEkspor("xls")) +
        '<div class="card"><div class="card-head"><h3>Parameter Filter Data</h3>' +
          "<p>Saring log aktivitas berdasarkan rentang tanggal dan penugasan kerja atau jenis mutasi</p></div>" +
          '<div class="card-body"><div class="filter-grid">' +
            '<div class="field" style="margin:0"><label>Cari Unit Asset / Serial</label>' +
              '<input class="input" id="fq" placeholder="SN, nama asset, WO, atau kode alat berat..." value="' + esc(f.q) + '"></div>' +
            '<div class="field" style="margin:0"><label>Jenis Mutasi</label>' +
              '<select class="input" id="fj">' + jenisOpts + "</select></div>" +
            '<div class="field" style="margin:0"><label>Batas Tanggal Mulai</label>' +
              '<input class="input" type="date" id="fd" value="' + esc(f.dari) + '"></div>' +
            '<div class="field" style="margin:0"><label>Batas Tanggal Selesai</label>' +
              '<input class="input" type="date" id="fs" value="' + esc(f.sampai) + '"></div>' +
          "</div>" +
          '<div class="filter-actions">' +
            '<button class="btn btn-ghost" id="clr">' + icon("reset") + "Bersihkan Filter</button>" +
            '<button class="btn btn-primary" id="app">' + icon("filter") + "Terapkan Pencarian</button></div>" +
          "</div>" +
          '<div class="table-wrap"><table><thead><tr>' +
            "<th>Waktu / Tanggal</th><th>Unit Asset Silinder</th><th>Jenis Tindakan</th><th>Rute Perpindahan</th>" +
            '<th title="Nomor unit alat berat terkait">No. Alat Berat</th>' +
            '<th title="Work Order yang melekat saat kejadian">WO</th>' +
            "<th>Dokumen Resmi</th><th>Catatan Lapangan</th><th>Operator (PIC)</th>" +
          "</tr></thead><tbody>" + rows + "</tbody></table></div>" +
          '<div class="card-body" style="border-top:1px solid var(--line-soft);font-size:12px;color:var(--ink-3)">' +
            "Menampilkan <b>" + list.length + "</b> dari " + DB.mutasis.length + " total catatan log. " +
            "Log bersifat permanen dan tidak dapat dihapus oleh pengguna biasa.</div></div>";

      el("app").addEventListener("click", function () {
        f.q = el("fq").value; f.jenis = el("fj").value; f.dari = el("fd").value; f.sampai = el("fs").value; draw();
      });
      el("clr").addEventListener("click", function () { f = { q: "", jenis: "", dari: "", sampai: "" }; draw(); });
      el("xls").addEventListener("click", function () { eksporExcel("Mutasi Asset", [shMutasi(list)]); });
      el("fq").addEventListener("keydown", function (e) { if (e.key === "Enter") el("app").click(); });
      root.querySelectorAll("[data-go]").forEach(function (n) {
        n.addEventListener("click", function () { go("asset", n.getAttribute("data-go")); });
      });
    }
    draw();
  };

  /* ---------------- PERBAIKAN ---------------- */
  PAGES.perbaikan = function (root) {
    var tab = "BERLANGSUNG";
    var q = "";

    function draw() {
      var list = DB.repairs.filter(function (r) {
        if (r.status !== tab) return false;
        if (!q) return true;
        var a = byId(DB.assets, r.assetId);
        var ve = byId(DB.vendors, r.vendorId);
        var t = ((r.wo || "") + " " + (r.noPO || "") + " " + (r.noPR || "") + " " +
          (a ? a.sn + " " + prod(a).nama : "") + " " + (ve ? ve.nama : "")).toLowerCase();
        return t.indexOf(q.toLowerCase()) >= 0;
      }).sort(function (a, b) { return b.tglMasuk - a.tglMasuk; });

      var rows = list.length ? list.map(function (r) {
        var a = byId(DB.assets, r.assetId);
        if (!a) return "";
        var v = byId(DB.vendors, r.vendorId);
        var d = r.tglKeluar ? daysBetween(r.tglMasuk, r.tglKeluar) : daysBetween(r.tglMasuk, Date.now());
        return "<tr>" +
          '<td><span class="t-link mono" data-go="' + a.id + '">' + esc(a.sn) + "</span></td>" +
          "<td>" + esc(prod(a).nama) + "</td>" +
          "<td>" + (r.wo ? '<span class="mono" style="color:var(--cyan);font-weight:650">' + esc(r.wo) + "</span>" : "—") +
            '<div class="t-sub">' + (r.jenisRepair === "WC" ? "WC — Warranty Claim" : "RC — Recondition") + "</div></td>" +
          '<td><div class="t-strong">' + esc(v ? v.nama : "—") + "</div></td>" +
          "<td>" + (r.noPO ? '<span class="mono" style="font-size:12px;color:var(--cyan)">' + esc(r.noPO) + "</span>" : "—") + "</td>" +
          "<td>" + (r.biaya ? "<b>" + fmtRp(r.biaya) + "</b>" : "—") + "</td>" +
          '<td><span class="' + durTone(d) + '">' + d + " Hari</span></td>" +
          "<td>" + fmtDateTime(r.tglMasuk) + "</td>" +
          "<td>" + (r.tglKeluar ? fmtDateTime(r.tglKeluar) : "—") + "</td>" +
          '<td style="max-width:230px;font-size:12px;color:var(--ink-2)">' + (r.deskripsi ? esc(r.deskripsi) : "—") + "</td>" +
          '<td style="text-align:right">' + (r.status === "BERLANGSUNG" && a.status === "RPR" ?
            '<button class="btn btn-sm btn-cyan" data-fin="' + a.id + '">' + icon("checkCircle") + "Selesaikan</button>" : "") + "</td>" +
        "</tr>";
      }).join("") : '<tr><td colspan="11">' + emptyState(
        tab === "BERLANGSUNG" ? "Tidak ada unit yang sedang diperbaiki." : "Belum ada perbaikan yang tuntas.", "repair") + "</td></tr>";

      var totalBiaya = list.reduce(function (s, r) { return s + (r.biaya || 0); }, 0);
      var avgDur = list.length ? Math.round(list.reduce(function (s, r) {
        return s + daysBetween(r.tglMasuk, r.tglKeluar || Date.now()); }, 0) / list.length) : 0;

      root.innerHTML =
        pageHead("repair", "Manajemen Perbaikan Unit", "Monitoring dan rilis penyelesaian dokumen repair workshop unit silinder luar",
          tombolEkspor("xls")) +
        '<div class="card"><div class="card-head" style="display:flex;align-items:center;gap:14px">' +
          '<div style="flex:1"><h3>' + (tab === "BERLANGSUNG" ? "Unit Sedang di Bengkel Rekanan" : "Arsip Perbaikan Tuntas") + "</h3>" +
          "<p>" + (tab === "BERLANGSUNG"
            ? "Durasi repair dihitung otomatis sejak unit masuk vendor"
            : "Total biaya periode ini: " + fmtRp(totalBiaya) + " · rata-rata durasi " + avgDur + " hari") + "</p></div>" +
          '<div class="tabs"><button class="tab' + (tab === "BERLANGSUNG" ? " active" : "") + '" data-t="BERLANGSUNG">Berlangsung</button>' +
          '<button class="tab' + (tab === "SELESAI" ? " active" : "") + '" data-t="SELESAI">Selesai</button></div></div>' +
          '<div class="card-body" style="padding-bottom:14px">' +
            '<div class="search-input" style="max-width:420px">' + icon("search") +
            '<input class="input" id="qr2" placeholder="Cari nomor WO, PO, serial number, atau vendor..." value="' + esc(q) + '"></div></div>' +
          '<div class="table-wrap"><table><thead><tr>' +
            "<th>Serial Number</th><th>Spesifikasi Unit Cylinder</th>" +
            '<th title="Nomor Work Order">WO / Jenis</th><th>Bengkel Rekanan (Vendor)</th>' +
            "<th>Nomor PO (Dokumen)</th><th>Biaya Repair</th><th>Durasi Repair</th>" +
            "<th>Tanggal Masuk</th><th>Tanggal Keluar</th><th>Deskripsi Kerusakan</th><th></th>" +
          "</tr></thead><tbody>" + rows + "</tbody></table></div></div>";

      root.querySelectorAll(".tab").forEach(function (t) {
        t.addEventListener("click", function () { tab = t.getAttribute("data-t"); draw(); });
      });
      el("xls").addEventListener("click", function () {
        eksporExcel("Perbaikan", [
          shPerbaikan(list, tab === "BERLANGSUNG" ? "Berlangsung" : "Selesai"),
          shPerbaikan(null, "Semua Perbaikan")
        ]);
      });
      if (el("qr2")) el("qr2").addEventListener("input", function (e) {
        q = e.target.value;
        var pos = e.target.selectionStart;
        draw();
        var nn = el("qr2"); nn.focus(); nn.setSelectionRange(pos, pos);
      });
      root.querySelectorAll("[data-go]").forEach(function (n) {
        n.addEventListener("click", function () { go("asset", n.getAttribute("data-go")); });
      });
      root.querySelectorAll("[data-fin]").forEach(function (b) {
        b.addEventListener("click", function () {
          var a = byId(DB.assets, b.getAttribute("data-fin"));
          var acts = availableActions(a).filter(function (x) { return x.key === "SELESAI_REPAIR"; });
          if (acts.length) runActionForm(a, acts[0], draw);
        });
      });
    }
    draw();
  };

  /* ---------------- MASTER: GUDANG / ALAT / VENDOR ---------------- */
  function masterPage(cfg) {
    return function (root) {
      var q = "";
      function draw() {
        var list = DB[cfg.coll];
        if (cfg.cari && q) {
          list = list.filter(function (r) {
            return cfg.cari(r).toLowerCase().indexOf(q.toLowerCase()) >= 0;
          });
        }
        var rows = list.length ? list.map(function (r) {
          return '<tr' + (cfg.buka ? ' class="clickable" data-buka="' + r.id + '"' : "") + ">" +
            cfg.cols.map(function (c) { return "<td>" + c.get(r) + "</td>"; }).join("") +
            '<td style="text-align:right;white-space:nowrap">' +
              (canEditMaster() ? '<button class="icon-btn" data-edit="' + r.id + '">' + icon("edit") + "</button> " +
              '<button class="icon-btn danger" data-del="' + r.id + '">' + icon("trash") + "</button>" : "") + "</td></tr>";
        }).join("") : '<tr><td colspan="' + (cfg.cols.length + 1) + '">' + emptyState(cfg.empty, cfg.ico) + "</td></tr>";

        root.innerHTML =
          pageHead(cfg.ico, cfg.title, cfg.sub,
            (cfg.ekspor ? tombolEkspor("xls") : "") +
            (canEditMaster() ? '<button class="btn btn-primary" id="add">' + icon("plus") + cfg.addLabel + "</button>" : "")) +
          '<div class="card">' +
          (cfg.cari ? '<div class="card-body" style="padding-bottom:14px">' +
            '<div class="search-input" style="max-width:420px">' + icon("search") +
            '<input class="input" id="q" placeholder="' + esc(cfg.cariPh || "Cari...") + '" value="' + esc(q) + '"></div></div>' : "") +
          '<div class="table-wrap"><table><thead><tr>' +
            cfg.cols.map(function (c) { return "<th>" + esc(c.h) + "</th>"; }).join("") + "<th></th>" +
          "</tr></thead><tbody>" + rows + "</tbody></table></div></div>";

        if (el("add")) el("add").addEventListener("click", function () { form(null); });
        if (el("xls")) el("xls").addEventListener("click", function () { cfg.ekspor(); });
        if (el("q")) el("q").addEventListener("input", function (e) {
          q = e.target.value;
          var pos = e.target.selectionStart;
          draw();
          var nn = el("q"); nn.focus(); nn.setSelectionRange(pos, pos);
        });
        root.querySelectorAll("[data-buka]").forEach(function (tr) {
          tr.addEventListener("click", function (e) {
            if (e.target.closest("[data-edit],[data-del]")) return;
            go(cfg.buka, tr.getAttribute("data-buka"));
          });
        });
        root.querySelectorAll("[data-edit]").forEach(function (b) {
          b.addEventListener("click", function () { form(byId(DB[cfg.coll], b.getAttribute("data-edit"))); });
        });
        root.querySelectorAll("[data-del]").forEach(function (b) {
          b.addEventListener("click", function () {
            var r = byId(DB[cfg.coll], b.getAttribute("data-del"));
            var used = cfg.usedBy(r.id);
            if (used) { toast(cfg.usedMsg.replace("{n}", used), "err"); return; }
            confirmDel("Hapus " + (r.nama || r.kode) + "?", function () {
              DB[cfg.coll] = DB[cfg.coll].filter(function (x) { return x.id !== r.id; });
              save(); draw(); toast("Data dihapus.");
            });
          });
        });
      }

      function form(r) {
        openModal({
          title: r ? cfg.editTitle : cfg.formTitle,
          body: cfg.fields.map(function (f) { return fieldHTML(f, r && r[f.name]); }).join(""),
          okLabel: cfg.okLabel,
          onOk: function (root2, close) {
            var f = readForm(root2, cfg.fields);
            if (f.missing) { toast(f.missing + " wajib diisi.", "err"); return false; }
            if (r) { Object.keys(f.values).forEach(function (k) { r[k] = f.values[k]; }); }
            else {
              var o = { id: uid(cfg.prefix) };
              Object.keys(f.values).forEach(function (k) { o[k] = f.values[k]; });
              if (cfg.coll === "gudangs") o.karantina = /karantina|rusak/i.test(o.nama + " " + o.area);
              DB[cfg.coll].push(o);
            }
            save(); close(); draw(); toast("Data tersimpan.");
          }
        });
      }
      draw();
    };
  }

  PAGES.gudang = masterPage({
    coll: "gudangs", ico: "warehouse", prefix: "g",
    title: "Gudang Logistik Asset", sub: "Konfigurasi struktur cakupan area penyimpanan fisik silinder pabrik",
    addLabel: "Registrasi Gudang", formTitle: "Tambah Gudang Baru", editTitle: "Ubah Data Gudang",
    okLabel: "Simpan Gudang", empty: "Belum ada gudang terdaftar.",
    usedBy: function (id) { return DB.assets.filter(function (a) { return a.lokasiTipe === "GUDANG" && a.lokasiId === id; }).length; },
    usedMsg: "Gudang ini masih menyimpan {n} unit dan tidak dapat dihapus.",
    ekspor: function () { eksporExcel("Gudang", [shGudang(), shAsset(DB.assets.filter(function (a) {
      return a.lokasiTipe === "GUDANG"; }))]); },
    cols: [
      { h: "Nama Gudang / Pos", get: function (r) {
        return '<div class="t-strong">' + esc(r.nama) + "</div>" +
          '<div class="t-sub">' + (r.karantina ? "AREA KARANTINA RUSAK" : "BLOK UNTUK DETAIL UNIT") + "</div>"; } },
      { h: "Kode Lokasi", get: function (r) { return '<span class="t-link mono">' + esc(r.kode) + "</span>"; } },
      { h: "Area Spesifik / Lapangan", get: function (r) { return esc(r.area || "—"); } },
      { h: "Total Cylinder", get: function (r) {
        return '<span class="chip">' + icon("box") + countGudang(r.id) + " Unit</span>"; } },
      { h: "Keterangan Tambahan", get: function (r) {
        return '<span style="font-size:12px;color:var(--ink-2)">' + esc(r.keterangan || "—") + "</span>"; } }
    ],
    fields: [
      { name: "nama", label: "Nama Gudang", type: "text", req: true, ph: "contoh: Gudang Utama Batulicin" },
      { name: "kode", label: "Kode Lokasi", type: "text", req: true, ph: "contoh: GDG-BTL" },
      { name: "area", label: "Area / Posisi Gudang", type: "text", ph: "contoh: Workshop Pusat" },
      { name: "keterangan", label: "Keterangan Operasional", type: "textarea", ph: "Detail kapasitas atau jenis barang simpanan..." }
    ]
  });

  PAGES.alat = masterPage({
    coll: "alats", ico: "machine", prefix: "m",
    title: "Stasiun Alat Berat", sub: "Registrasi unit alat berat penempatan cylinder aktif di lapangan",
    addLabel: "Tambah Alat Berat", formTitle: "Registrasi Alat Berat", editTitle: "Ubah Data Alat Berat",
    okLabel: "Simpan Setup", empty: "Belum ada alat berat terdaftar.",
    usedBy: function (id) { return countAlat(id); },
    usedMsg: "Alat berat ini masih memiliki {n} cylinder terpasang.",
    ekspor: function () { eksporExcel("Alat Berat", [shAlat(), shTerpasang()]); },
    cari: function (r) { return r.nama + " " + r.kode + " " + (r.departemen || "") + " " + (r.lokasi || ""); },
    cariPh: "Cari nama atau kode alat berat... contoh: EX-2401",
    buka: "alat",
    cols: [
      { h: "Nama Unit Alat Berat", get: function (r) {
        return '<div class="t-link t-strong">' + esc(r.nama) + "</div>" +
          '<div class="t-sub">KLIK UNTUK MELIHAT CYLINDER TERPASANG</div>'; } },
      { h: "Kode Unit", get: function (r) { return '<span class="mono">' + esc(r.kode) + "</span>"; } },
      { h: "Hour Meter (HMU)", get: function (r) {
        return r.hmu ? "<b>" + Number(r.hmu).toLocaleString("id-ID") + "</b>" : "—"; } },
      { h: "Total Cylinder", get: function (r) {
        return '<span class="chip">' + icon("box") + countAlat(r.id) + " Unit</span>"; } },
      { h: "Departemen Kerja", get: function (r) { return esc(r.departemen || "—"); } },
      { h: "Lokasi Operasi", get: function (r) { return esc(r.lokasi || "—"); } }
    ],
    fields: [
      { name: "nama", label: "Nama Unit / Station", type: "text", req: true, ph: "contoh: EX-2401 Excavator PC2000-8" },
      { name: "kode", label: "ID / Kode Unit", type: "text", req: true, ph: "contoh: E-2401" },
      { name: "departemen", label: "Departemen Kerja", type: "text", ph: "contoh: Produksi – Loading" },
      { name: "lokasi", label: "Lokasi Operasi / Pit", type: "text", ph: "contoh: Pit Kusan Blok A" },
      { name: "hmu", label: "Hour Meter Unit (HMU) Terakhir", type: "number", ph: "contoh: 23456",
        hint: "Angka hour meter alat berat saat pendataan terakhir." },
      { name: "spesifikasi", label: "Spesifikasi / Detail Tugas", type: "textarea", ph: "Keterangan tambahan parameter beban kerja unit..." }
    ]
  });

  PAGES.vendor = masterPage({
    coll: "vendors", ico: "vendor", prefix: "v",
    title: "Vendor & Workshop Rekanan", sub: "Manajemen bengkel rekanan luar untuk penanganan re-chrome / repair cylinder",
    addLabel: "Daftarkan Vendor", formTitle: "Daftarkan Vendor Rekanan", editTitle: "Ubah Data Vendor",
    okLabel: "Simpan Vendor", empty: "Belum ada vendor terdaftar.",
    usedBy: function (id) { return countVendor(id); },
    usedMsg: "Vendor ini masih memegang {n} unit milik perusahaan.",
    ekspor: function () { eksporExcel("Vendor", [shVendor(), shPerbaikan()]); },
    cols: [
      { h: "Nama Instansi / Perusahaan", get: function (r) {
        return '<div class="t-strong">' + esc(r.nama) + '</div><div class="t-sub">PARTNER RESMI REPAIR WORKSHOP</div>'; } },
      { h: "Kode Vendor", get: function (r) { return '<span class="t-link mono">' + esc(r.kode) + "</span>"; } },
      { h: "Total Cylinder", get: function (r) {
        return '<span class="chip">' + icon("box") + countVendor(r.id) + " Unit</span>"; } },
      { h: "No. Telepon", get: function (r) { return esc(r.telepon || "—"); } },
      { h: "Alamat Email", get: function (r) { return esc(r.email || "—"); } },
      { h: "Alamat Workshop", get: function (r) {
        return '<span style="font-size:12px;color:var(--ink-2)">' + esc(r.alamat || "—") + "</span>"; } }
    ],
    fields: [
      { name: "kode", label: "Kode Rekanan / Vendor", type: "text", req: true, ph: "contoh: AFS-01" },
      { name: "nama", label: "Nama Instansi / Perusahaan", type: "text", req: true, ph: "contoh: PT Andalan Fluid Sistem" },
      { name: "telepon", label: "No. Kontak / Telepon", type: "text", ph: "0812xxxxxxx" },
      { name: "email", label: "Alamat Email", type: "text", ph: "vendor@email.com" },
      { name: "alamat", label: "Alamat Bengkel / Workshop", type: "textarea", ph: "Alamat detail operasional workshop..." }
    ]
  });

  /* ---------------- DETAIL ALAT BERAT ---------------- */
  // Perhitungan mengikuti form AFS Cylinder Condition Monitoring:
  //   JJO = HMU - HMI   (jumlah jam operasi cylinder terpasang)
  //   KJO = JJO - TJO   (kelebihan jam operasi; minus berarti masih aman)
  //   THM = HMI + TJO   (target hour meter penggantian)
  function hitungJam(a, alat) {
    var p = prod(a);
    var hmu = Number(alat && alat.hmu) || 0;
    var hmi = Number(a.hmInstall) || 0;
    var tjo = Number(p.tjo) || 0;
    var jjo = hmu && hmi ? Math.max(0, hmu - hmi) : 0;
    return {
      hmi: hmi, tjo: tjo, jjo: jjo,
      kjo: tjo ? jjo - tjo : 0,
      thm: hmi && tjo ? hmi + tjo : 0,
      pakai: tjo ? Math.min(100, Math.round(jjo / tjo * 100)) : 0
    };
  }
  function nomorRingkas(x) { return x == null || x === "" || !Number(x) ? "—" : Number(x).toLocaleString("id-ID"); }

  PAGES.alat_detail = function (root, id) {
    var m = byId(DB.alats, id);
    if (!m) { root.innerHTML = emptyState("Alat berat tidak ditemukan.", "machine"); return; }

    function draw() {
      var terpasang = DB.assets.filter(function (a) {
        return a.lokasiTipe === "ALAT" && a.lokasiId === m.id;
      }).sort(function (x, y) { return (x.slot || "") < (y.slot || "") ? -1 : 1; });

      var lewatTarget = 0;
      var barisan = terpasang.length ? terpasang.map(function (a) {
        var j = hitungJam(a, m);
        var p = prod(a);
        if (j.tjo && j.kjo > 0) lewatTarget++;
        var toneKjo = !j.tjo ? "" : (j.kjo > 0 ? "dur-bad" : (j.kjo > -j.tjo * 0.15 ? "dur-warn" : "dur-ok"));
        return "<tr>" +
          '<td><span class="slot-tag">' + esc(a.slot || "—") + "</span></td>" +
          '<td><span class="t-link mono" data-asset="' + a.id + '">' + esc(a.sn) + "</span>" +
            '<div class="t-sub">' + esc(p.nama) + "</div></td>" +
          "<td>" + (a.wo ? '<span class="mono" style="color:var(--cyan);font-weight:650">' + esc(a.wo) + "</span>" +
            (a.jenisRepair ? '<div class="t-sub">' + esc(a.jenisRepair) + "</div>" : "") : "—") + "</td>" +
          '<td class="mono">' + nomorRingkas(j.hmi) + "</td>" +
          '<td class="mono"><b>' + nomorRingkas(j.jjo) + "</b>" +
            (j.tjo ? '<div class="t-sub">' + j.pakai + "% dari target</div>" : "") + "</td>" +
          '<td class="mono">' + nomorRingkas(j.tjo) + "</td>" +
          '<td class="mono">' + nomorRingkas(j.thm) + "</td>" +
          '<td class="mono ' + toneKjo + '">' + (j.tjo ? (j.kjo > 0 ? "+" : "") + j.kjo.toLocaleString("id-ID") : "—") + "</td>" +
          '<td><span class="badge ' + stat(a).tone + '"><span class="dot"></span>' + esc(stat(a).label) + "</span></td>" +
        "</tr>";
      }).join("") : '<tr><td colspan="9">' + emptyState("Belum ada cylinder terpasang pada unit ini.", "box") + "</td></tr>";

      var riwayat = DB.mutasis.filter(function (mt) {
        return mt.dariLabel === m.nama || mt.keLabel === m.nama;
      }).sort(function (x, y) { return y.ts - x.ts; }).slice(0, 8);

      root.innerHTML =
        '<div class="page-head"><div class="ph-ico">' + icon("machine") + "</div>" +
          "<div><h1>" + esc(m.nama) + "</h1><p>Kode unit " + esc(m.kode) +
            (m.departemen ? " · " + esc(m.departemen) : "") + (m.lokasi ? " · " + esc(m.lokasi) : "") + "</p></div>" +
          '<div class="ph-actions">' +
            '<button class="btn btn-ghost" id="back">' + icon("back") + "Kembali</button>" +
            tombolEkspor("xls") +
            (canEditMaster() ? '<button class="btn btn-cyan" id="hm">' + icon("clock") + "Perbarui Hour Meter</button>" : "") +
          "</div></div>" +

        '<div class="card"><div class="card-head plain"><h3>Kondisi Unit</h3>' +
          "<p>Acuan perhitungan umur pakai seluruh cylinder yang terpasang</p></div>" +
          '<div class="card-body" style="padding-top:10px"><div class="hm-grid">' +
            '<div class="hm-box"><div class="hk">Hour Meter Unit (HMU)</div><div class="hv">' + nomorRingkas(m.hmu) + "</div></div>" +
            '<div class="hm-box"><div class="hk">Cylinder Terpasang</div><div class="hv">' + terpasang.length + "</div></div>" +
            '<div class="hm-box"><div class="hk">Lewat Target Jam</div><div class="hv" style="color:' +
              (lewatTarget ? "var(--red)" : "var(--green)") + '">' + lewatTarget + "</div></div>" +
            '<div class="hm-box"><div class="hk">Departemen</div><div class="hv" style="font-size:12.5px">' +
              esc(m.departemen || "—") + "</div></div>" +
          "</div>" +
          (m.spesifikasi ? '<p style="margin:14px 0 0;font-size:12.5px;color:var(--ink-3)">' + esc(m.spesifikasi) + "</p>" : "") +
          "</div></div>" +

        '<div class="card" style="margin-top:16px"><div class="card-head"><h3>Cylinder Terpasang</h3>' +
          "<p>Posisi, nomor seri, Work Order, dan umur pakai tiap cylinder pada unit ini</p></div>" +
          '<div class="table-wrap"><table><thead><tr>' +
            "<th>Posisi</th><th>Serial Number</th><th>WO Terakhir</th>" +
            '<th title="Hour Meter Install — angka hour meter saat cylinder dipasang">HMI</th>' +
            '<th title="Jumlah Jam Operasi — jam yang sudah dijalani cylinder">JJO</th>' +
            '<th title="Target Jam Operasi model ini">TJO</th>' +
            '<th title="Target Hour Meter — angka hour meter saat cylinder harus diganti">THM</th>' +
            '<th title="Kelebihan Jam Operasi — plus berarti sudah lewat target">KJO</th><th>Status</th>' +
          "</tr></thead><tbody>" + barisan + "</tbody></table></div>" +
          '<div class="card-body" style="border-top:1px solid var(--line-soft);font-size:11.5px;color:var(--ink-3)">' +
            "HMI = hour meter saat dipasang · JJO = HMU − HMI (jam berjalan) · TJO = target jam operasi model · " +
            "THM = HMI + TJO (hour meter saat harus diganti) · KJO = JJO − TJO (plus berarti sudah lewat target)" +
          "</div></div>" +

        '<div class="card" style="margin-top:16px"><div class="card-head"><h3>Riwayat Pergerakan Unit Ini</h3>' +
          "<p>Cylinder yang masuk dan keluar dari alat berat ini</p></div>" +
          (riwayat.length ? riwayat.map(function (mt) {
            var a = byId(DB.assets, mt.assetId);
            return '<div class="act-row"><div class="ar-main">' +
              '<div class="ar-t"><span class="mono">' + esc(a ? a.sn : "—") + "</span>" +
              '<span style="color:var(--ink-3);font-weight:500">' + esc(mt.slot || "") + "</span></div>" +
              '<div class="ar-s">PIC: ' + esc(mt.pic) + " · " + fmtDateTime(mt.ts) +
              (mt.hm ? " · HM " + nomorRingkas(mt.hm) : "") + "</div></div>" +
              '<span class="badge ' + (MT_TONE[mt.aksi] || "b-gray") + '"><span class="dot"></span>' + esc(mt.aksi) + "</span></div>";
          }).join("") : emptyState("Belum ada riwayat.", "history")) +
        "</div>";

      el("back").addEventListener("click", function () { go("alat"); });
      el("xls").addEventListener("click", function () {
        eksporExcel("Alat Berat " + m.kode, [shTerpasang(m), shMutasi(riwayat)]);
      });
      root.querySelectorAll("[data-asset]").forEach(function (b) {
        b.addEventListener("click", function () { go("asset", b.getAttribute("data-asset")); });
      });
      if (el("hm")) el("hm").addEventListener("click", function () {
        var fields = [{ name: "hmu", label: "Hour Meter Unit (HMU) Saat Ini", type: "number", req: true,
          ph: "contoh: 23456", hint: "Seluruh perhitungan jam operasi cylinder pada unit ini ikut diperbarui." }];
        openModal({
          title: "Perbarui Hour Meter", sub: m.nama, narrow: true,
          body: fieldHTML(fields[0], m.hmu),
          okLabel: "Simpan",
          onOk: function (r, close) {
            var f = readForm(r, fields);
            if (f.missing) { toast(f.missing + " wajib diisi.", "err"); return false; }
            m.hmu = Number(f.values.hmu) || 0;
            DB.assets.forEach(function (a) {
              if (a.lokasiTipe === "ALAT" && a.lokasiId === m.id) {
                pushMutasi({ assetId: a.id, aksi: MT.UPDATE_HM, dari: m.nama, ke: m.nama,
                  hm: m.hmu, catatan: "Pendataan hour meter unit" });
              }
            });
            save(); close(); draw(); toast("Hour meter " + m.nama + " diperbarui.");
          }
        });
      });
    }
    draw();
  };

  /* ---------------- MASTER HOUR METER ---------------- */
  // Pembaruan HMU dipakai bersama oleh menu Hour Meter dan halaman detail alat berat.
  function terapkanHMU(alat, nilai, catatan) {
    alat.hmu = Number(nilai) || 0;
    alat.hmuUpdatedAt = Date.now();
    alat.hmuUpdatedBy = SESSION ? SESSION.nama : "Sistem";
    DB.assets.forEach(function (a) {
      if (a.lokasiTipe === "ALAT" && a.lokasiId === alat.id) {
        pushMutasi({ assetId: a.id, aksi: MT.UPDATE_HM, dari: alat.nama, ke: alat.nama,
          hm: alat.hmu, catatan: catatan || "Pendataan hour meter unit" });
      }
    });
  }

  PAGES.hourmeter = function (root) {
    var q = "";
    var ubah = {};        // id alat -> nilai baru yang belum disimpan

    function draw() {
      var list = DB.alats.filter(function (m) {
        if (!q) return true;
        var t = (m.kode + " " + m.nama + " " + (m.departemen || "") + " " + (m.lokasi || "")).toLowerCase();
        return t.indexOf(q.toLowerCase()) >= 0;
      });
      var jmlUbah = Object.keys(ubah).length;

      var rows = list.length ? list.map(function (m) {
        var baru = ubah[m.id];
        var berubah = baru != null && Number(baru) !== Number(m.hmu || 0);
        return '<tr' + (berubah ? ' style="background:#FFFBEB"' : "") + ">" +
          '<td><span class="mono t-strong">' + esc(m.kode) + "</span></td>" +
          '<td><div class="t-strong">' + esc(m.nama) + "</div>" +
            '<div class="t-sub">' + esc(m.departemen || "—") + " · " + esc(m.lokasi || "—") + "</div></td>" +
          '<td><span class="chip">' + icon("box") + countAlat(m.id) + " Unit</span></td>" +
          '<td><input class="input hmu-input" type="number" min="0" step="1" data-hmu="' + m.id + '" ' +
            'value="' + esc(baru != null ? baru : (m.hmu || "")) + '" placeholder="0"></td>' +
          "<td>" + (m.hmuUpdatedAt
            ? '<div class="t-strong" style="font-size:12px">' + fmtDateTime(m.hmuUpdatedAt) + "</div>" +
              '<div class="t-sub">' + esc(m.hmuUpdatedBy || "") + "</div>"
            : '<span style="color:var(--ink-3)">Belum pernah</span>') + "</td>" +
          "<td>" + (berubah
            ? '<span class="badge b-amber">Belum disimpan</span>'
            : '<span style="color:var(--ink-3);font-size:12px">—</span>') + "</td>" +
        "</tr>";
      }).join("") : '<tr><td colspan="6">' + emptyState("Tidak ada alat berat yang cocok.", "machine") + "</td></tr>";

      root.innerHTML =
        pageHead("gauge", "Master Data Hour Meter", "Pendataan HMU tiap alat berat — dasar perhitungan umur pakai seluruh cylinder",
          tombolEkspor("xls") +
          '<button class="btn btn-primary" id="simpan"' + (jmlUbah ? "" : " disabled") + ">" +
            icon("check") + "Simpan Perubahan" + (jmlUbah ? " (" + jmlUbah + ")" : "") + "</button>") +
        '<div class="card"><div class="card-body" style="padding-bottom:14px"><div class="search-bar">' +
          '<div class="search-input">' + icon("search") +
            '<input class="input" id="q" placeholder="Cari kode atau nama alat berat... contoh: EX-2401" value="' + esc(q) + '"></div>' +
        "</div></div>" +
        '<div class="table-wrap"><table><thead><tr>' +
          "<th>Kode Unit</th><th>Nama Unit Alat Berat</th><th>Cylinder Terpasang</th>" +
          '<th style="width:170px">Hour Meter Unit (HMU)</th><th>Terakhir Diperbarui</th><th></th>' +
        "</tr></thead><tbody>" + rows + "</tbody></table></div>" +
        '<div class="card-body" style="border-top:1px solid var(--line-soft);font-size:12px;color:var(--ink-3)">' +
          "Ubah angka HMU langsung pada kolomnya, lalu tekan <b>Simpan Perubahan</b>. " +
          "Seluruh perhitungan JJO, KJO, dan THM pada menu Alat Berat ikut diperbarui saat itu juga, " +
          "dan setiap pembaruan tercatat pada log mutasi tiap cylinder yang terpasang." +
        "</div></div>";

      el("q").addEventListener("input", function (e) {
        q = e.target.value;
        var pos = e.target.selectionStart;
        draw();
        var nn = el("q"); nn.focus(); nn.setSelectionRange(pos, pos);
      });
      el("xls").addEventListener("click", function () { eksporExcel("Hour Meter", [shHourMeter(), shTerpasang()]); });

      root.querySelectorAll("[data-hmu]").forEach(function (inp) {
        inp.addEventListener("input", function () {
          var id = inp.getAttribute("data-hmu");
          var m = byId(DB.alats, id);
          if (String(inp.value) === String(m.hmu || "")) delete ubah[id];
          else ubah[id] = inp.value;
          var b = el("simpan");
          var j = Object.keys(ubah).length;
          b.disabled = !j;
          b.innerHTML = icon("check") + "Simpan Perubahan" + (j ? " (" + j + ")" : "");
          inp.closest("tr").style.background = ubah[id] != null ? "#FFFBEB" : "";
        });
      });

      el("simpan").addEventListener("click", function () {
        var ids = Object.keys(ubah);
        if (!ids.length) return;
        var turun = ids.filter(function (id) {
          var m = byId(DB.alats, id);
          return Number(ubah[id]) < Number(m.hmu || 0);
        });
        function jalankan() {
          ids.forEach(function (id) { terapkanHMU(byId(DB.alats, id), ubah[id], "Pendataan hour meter lapangan"); });
          var jml = ids.length;
          ubah = {};
          save(); draw();
          toast("Hour meter " + jml + " alat berat diperbarui.");
        }
        if (turun.length) {
          confirmDel("Ada " + turun.length + " unit dengan HMU lebih kecil dari angka sebelumnya. Lanjutkan menyimpan?", jalankan);
        } else jalankan();
      });
    }
    draw();
  };

  function shHourMeter() {
    return {
      nama: "Hour Meter",
      kolom: [K.t("Kode Unit", 14), K.t("Nama Unit Alat Berat", 34), K.t("Departemen", 24),
        K.t("Lokasi Operasi", 26), K.n("HMU Sekarang", 14), K.n("Cylinder Terpasang", 16),
        K.dt("Terakhir Diperbarui", 18), K.t("Diperbarui Oleh", 22)],
      baris: DB.alats.map(function (m) {
        return [m.kode, m.nama, m.departemen, m.lokasi, m.hmu ? Number(m.hmu) : "",
          countAlat(m.id), m.hmuUpdatedAt || "", m.hmuUpdatedBy || ""];
      })
    };
  }

  /* ---------------- CYLINDER MONITORING CONDITION ---------------- */
  function shCek(list) {
    return {
      nama: "Cek Kondisi",
      kolom: [K.dt("Tanggal Cek", 18), K.t("Serial Number", 18), K.t("Nama Model", 26),
        K.t("Kode Alat Berat", 15), K.t("Alat Berat", 30), K.t("Posisi", 16),
        K.t("WO", 14), K.n("HMU Saat Cek", 13),
        K.n("ROD", 8), K.n("HE", 8), K.n("CE", 8), K.n("General", 9),
        K.n("Skor Terburuk", 12), K.t("Kondisi", 18), K.t("Ada Foto", 10),
        K.t("Catatan Lapangan", 44), K.t("Pemeriksa", 22)],
      baris: (list || DB.ceks.slice().sort(function (a, b) { return b.ts - a.ts; })).map(function (c) {
        var a = byId(DB.assets, c.assetId);
        var m = byId(DB.alats, c.alatId);
        var t = skorTerburuk(c);
        return [c.ts, a ? a.sn : "", a ? prod(a).nama : "", m ? m.kode : "", c.alatNama || (m ? m.nama : ""),
          c.slot, c.wo || "", c.hmu ? Number(c.hmu) : "",
          Number(c.nilai.ROD) || "", Number(c.nilai.HE) || "", Number(c.nilai.CE) || "", Number(c.nilai.General) || "",
          t || "", t ? SKOR[String(t)].label : "", c.foto ? "Ya" : "Tidak", c.catatan, c.pic];
      })
    };
  }

  // Kecilkan foto sebelum disimpan supaya tidak membebani penyimpanan browser
  function kecilkanFoto(file, selesai) {
    var fr = new FileReader();
    fr.onload = function () {
      var img = new Image();
      img.onload = function () {
        var maks = 760;
        var w = img.width, h = img.height;
        if (w > h && w > maks) { h = Math.round(h * maks / w); w = maks; }
        else if (h >= w && h > maks) { w = Math.round(w * maks / h); h = maks; }
        var cv = document.createElement("canvas");
        cv.width = w; cv.height = h;
        cv.getContext("2d").drawImage(img, 0, 0, w, h);
        try { selesai(cv.toDataURL("image/jpeg", 0.55)); }
        catch (e) { selesai(null); }
      };
      img.onerror = function () { selesai(null); };
      img.src = fr.result;
    };
    fr.onerror = function () { selesai(null); };
    fr.readAsDataURL(file);
  }

  PAGES.monitoring = function (root) {
    var found = null, tab = "PERLU", q = "";

    // Pencarian menelusuri nomor seri, model, alat berat, posisi, dan nomor WO
    function cocokUnit(a) {
      if (!q) return true;
      var m = byId(DB.alats, a.lokasiId);
      var t = (a.sn + " " + prod(a).nama + " " + (a.wo || "") + " " + (a.slot || "") + " " +
        (m ? m.kode + " " + m.nama : "")).toLowerCase();
      return t.indexOf(q.toLowerCase()) >= 0;
    }
    function cocokCek(c) {
      if (!q) return true;
      var a = byId(DB.assets, c.assetId);
      var m = byId(DB.alats, c.alatId);
      var t = ((a ? a.sn + " " + prod(a).nama : "") + " " + (c.wo || "") + " " + (c.slot || "") + " " +
        (m ? m.kode + " " + m.nama : "") + " " + (c.catatan || "") + " " + (c.pic || "")).toLowerCase();
      return t.indexOf(q.toLowerCase()) >= 0;
    }

    /* ---- layar pemindaian + daftar unit ---- */
    function drawScan() {
      stopScanner();
      var semuaUnit = unitWajibCek();
      var daftar = semuaUnit.filter(cocokUnit);
      var riwayat = DB.ceks.slice().sort(function (a, b) { return b.ts - a.ts; }).filter(cocokCek);

      var barisPerlu = daftar.length ? daftar.map(function (a) {
        var c = cekTerakhir(a.id);
        var m = byId(DB.alats, a.lokasiId);
        var umur = c ? daysBetween(c.ts, Date.now()) : null;
        var jatuhTempo = umur == null || umur > JEDA_CEK;
        return '<tr class="clickable" data-cek="' + a.id + '">' +
          '<td><span class="t-link mono">' + esc(a.sn) + "</span>" +
            '<div class="t-sub">' + esc(prod(a).nama) + "</div></td>" +
          "<td>" + (m ? '<span class="mono t-strong">' + esc(m.kode) + "</span>" +
            '<div class="t-sub">' + esc(m.nama) + "</div>" : "—") + "</td>" +
          '<td><span class="slot-tag">' + esc(a.slot || "—") + "</span></td>" +
          "<td>" + (a.wo ? '<span class="mono" style="color:var(--cyan);font-weight:650">' + esc(a.wo) + "</span>" +
            (a.jenisRepair ? '<div class="t-sub">' + esc(a.jenisRepair) + "</div>" : "")
            : '<span style="color:var(--ink-3)">—</span>') + "</td>" +
          "<td>" + (c ? '<div class="t-strong" style="font-size:12.5px">' + fmtDate(c.ts) + "</div>" +
            '<div class="t-sub">' + esc(c.pic) + "</div>" : '<span style="color:var(--ink-3)">Belum pernah</span>') + "</td>" +
          '<td><span class="' + (jatuhTempo ? "dur-bad" : "dur-ok") + '">' +
            (umur == null ? "—" : umur + " hari") + "</span></td>" +
          "<td>" + badgeSkor(skorTerburuk(c)) + "</td>" +
          '<td style="text-align:right">' +
            '<button class="btn btn-sm btn-cyan" data-cek2="' + a.id + '">' + icon("clipboard") + "Cek</button></td>" +
        "</tr>";
      }).join("") : '<tr><td colspan="8">' + emptyState(
        q ? "Tidak ada unit terpasang yang cocok dengan pencarian." : "Tidak ada cylinder yang sedang terpasang di alat berat.",
        "clipboard") + "</td></tr>";

      var barisRiwayat = riwayat.length ? riwayat.map(function (c) {
        var a = byId(DB.assets, c.assetId);
        var m = byId(DB.alats, c.alatId);
        return '<tr class="clickable" data-lihat="' + c.assetId + '">' +
          '<td><div class="t-strong" style="font-size:12.5px">' + fmtDateTime(c.ts) + "</div>" +
            '<div class="t-sub">' + esc(c.pic) + "</div></td>" +
          '<td><span class="t-link mono">' + esc(a ? a.sn : "—") + "</span>" +
            '<div class="t-sub">' + esc(a ? prod(a).nama : "") + "</div></td>" +
          "<td>" + (m ? '<span class="mono">' + esc(m.kode) + "</span>" : "—") +
            (c.slot ? '<div class="t-sub">' + esc(c.slot) + "</div>" : "") + "</td>" +
          "<td>" + (c.wo ? '<span class="mono" style="color:var(--cyan);font-weight:650">' + esc(c.wo) + "</span>"
            : '<span style="color:var(--ink-3)">—</span>') + "</td>" +
          "<td>" + TITIK_CEK.map(function (k) {
            var v = Number(c.nilai[k]) || 0;
            var sk = SKOR[String(v)];
            return '<span class="cek-pill" title="' + k + ": " + (sk ? esc(sk.label) : "-") + '" style="background:' +
              (sk ? sk.bg : "var(--line-soft)") + ";color:" + (sk ? sk.warna : "var(--ink-3)") + '">' +
              k + " " + (v || "–") + "</span>";
          }).join("") + "</td>" +
          "<td>" + badgeSkor(skorTerburuk(c)) + "</td>" +
          "<td>" + (c.foto ? '<span class="chip">' + icon("photo") + "Ada</span>" : "—") + "</td>" +
          '<td style="max-width:280px;font-size:12px;color:var(--ink-2)">' + (c.catatan ? esc(c.catatan) : "—") + "</td>" +
        "</tr>";
      }).join("") : '<tr><td colspan="8">' + emptyState(
        q ? "Tidak ada hasil pengecekan yang cocok dengan pencarian." : "Belum ada pengecekan tercatat.",
        "clipboard") + "</td></tr>";

      var telat = semuaUnit.filter(function (a) {
        var c = cekTerakhir(a.id);
        return !c || daysBetween(c.ts, Date.now()) > JEDA_CEK;
      }).length;
      var perluTindakan = semuaUnit.filter(function (a) { return skorTerburuk(cekTerakhir(a.id)) >= 3; }).length;

      root.innerHTML =
        pageHead("clipboard", "Cylinder Monitoring Condition",
          "Pengecekan rutin kondisi cylinder yang sedang terpasang di alat berat",
          tombolEkspor("xls")) +

        '<div class="stat-grid" style="grid-template-columns:repeat(3,1fr);max-width:720px">' +
          '<div class="stat"><div class="si" style="background:var(--blue-bg);color:var(--blue)">' + icon("box") + "</div>" +
            '<div class="sv">' + semuaUnit.length + '</div><div class="sl">Unit Terpasang</div></div>' +
          '<div class="stat"><div class="si" style="background:var(--amber-bg);color:var(--amber)">' + icon("clock") + "</div>" +
            '<div class="sv" style="color:' + (telat ? "var(--amber)" : "inherit") + '">' + telat +
            '</div><div class="sl">Belum / Lewat ' + JEDA_CEK + ' Hari</div></div>' +
          '<div class="stat"><div class="si" style="background:var(--red-bg);color:var(--red)">' + icon("alert") + "</div>" +
            '<div class="sv" style="color:' + (perluTindakan ? "var(--red)" : "inherit") + '">' + perluTindakan +
            '</div><div class="sl">Perlu Perhatian / Tindakan</div></div>' +
        "</div>" +

        '<div class="card scan-card" style="margin-top:16px"><div class="card-head"><h3>Scan QR Code / Input Serial</h3>' +
          "<p>Pindai stiker QR pada cylinder yang akan diperiksa, atau ketik nomor serinya</p></div>" +
          '<div class="card-body">' +
            '<div class="scan-view" id="sv">' +
              '<div class="scan-idle" id="idle">' + icon("camera") + "<p>KAMERA PEMINDAI NONAKTIF</p></div>" +
              '<video id="vid" class="hidden" playsinline muted></video>' +
              '<div class="scan-frame hidden" id="frame"><div class="box"></div><div class="scan-laser"></div></div>' +
            "</div>" +
            '<button class="btn btn-primary btn-block" id="cam" style="margin-top:14px">' + icon("camera") + "Buka Lensa Kamera</button>" +
            '<div class="scan-or">ATAU ENTRI MANUAL</div>' +
            '<div class="manual-row"><input class="input" id="sn" placeholder="Ketik serial number unit..." autocomplete="off">' +
              '<button class="btn btn-cyan" id="val">' + icon("check") + "Validasi</button></div>" +
            '<div id="st"></div>' +
          "</div></div>" +

        '<div class="card" style="margin-top:16px"><div class="card-head" style="display:flex;align-items:center;gap:14px">' +
          '<div style="flex:1"><h3>' + (tab === "PERLU" ? "Daftar Unit Terpasang" : "Riwayat Pengecekan") + "</h3>" +
          "<p>" + (tab === "PERLU"
            ? "Hanya cylinder berstatus terpasang di alat berat yang wajib diperiksa. Klik baris untuk memeriksa."
            : "Seluruh hasil pengecekan, terbaru di atas. Klik baris untuk melihat perkembangan unit tersebut.") + "</p></div>" +
          '<div class="tabs"><button class="tab' + (tab === "PERLU" ? " active" : "") + '" data-t="PERLU">Perlu Dicek</button>' +
          '<button class="tab' + (tab === "RIWAYAT" ? " active" : "") + '" data-t="RIWAYAT">Riwayat</button></div></div>' +
          '<div class="card-body" style="padding-bottom:14px">' +
            '<div class="search-input" style="max-width:460px">' + icon("search") +
            '<input class="input" id="qcek" placeholder="Cari serial number, nomor WO, atau alat berat..." value="' + esc(q) + '"></div></div>' +
          '<div class="table-wrap"><table><thead><tr>' +
          (tab === "PERLU"
            ? "<th>Serial Number</th><th>Alat Berat</th><th>Posisi</th>" +
              '<th title="Work Order perbaikan terakhir">WO</th>' +
              "<th>Terakhir Dicek</th><th>Umur Cek</th><th>Kondisi Terakhir</th><th></th>"
            : "<th>Tanggal Cek</th><th>Serial Number</th><th>Alat Berat</th>" +
              '<th title="Work Order saat pengecekan">WO</th>' +
              "<th>Hasil Pemeriksaan</th><th>Kondisi</th><th>Foto</th><th>Catatan</th>") +
          "</tr></thead><tbody>" + (tab === "PERLU" ? barisPerlu : barisRiwayat) + "</tbody></table></div>" +
          '<div class="card-body" style="border-top:1px solid var(--line-soft);font-size:12px;color:var(--ink-3)">' +
            "Menampilkan <b>" + (tab === "PERLU" ? daftar.length : riwayat.length) + "</b> dari " +
            (tab === "PERLU" ? semuaUnit.length + " unit terpasang" : DB.ceks.length + " catatan pengecekan") + "." +
          "</div></div>";

      /* ---- kamera & entri manual ---- */
      var camOn = false;
      el("cam").addEventListener("click", function () {
        if (camOn) { stopScanner(); drawScan(); return; }
        camOn = true;
        el("idle").classList.add("hidden");
        el("vid").classList.remove("hidden");
        el("frame").classList.remove("hidden");
        el("cam").innerHTML = icon("close") + "Tutup Kamera";
        status("Arahkan kamera ke stiker QR pada cylinder...", "info");
        startScanner(el("vid"), function (code) {
          var a = findAssetByCode(code);
          if (!a) { status("QR terbaca (" + code + ") tetapi unit tidak terdaftar.", "err"); drawScan(); return; }
          buka(a);
        }, function (msg) {
          status(msg, "err");
          camOn = false;
          el("idle").classList.remove("hidden");
          el("vid").classList.add("hidden");
          el("frame").classList.add("hidden");
          el("cam").innerHTML = icon("camera") + "Buka Lensa Kamera";
        });
      });
      function validate() {
        var v = el("sn").value.trim();
        if (!v) { status("Masukkan serial number terlebih dahulu.", "err"); return; }
        var a = findAssetByCode(v);
        if (!a) { status("Unit dengan serial " + v + " tidak ditemukan.", "err"); return; }
        buka(a);
      }
      el("val").addEventListener("click", validate);
      el("sn").addEventListener("keydown", function (e) { if (e.key === "Enter") validate(); });
      function status(msg, kind) {
        var c = kind === "err" ? "var(--red)" : "var(--cyan)";
        var bg = kind === "err" ? "var(--red-bg)" : "var(--cyan-soft)";
        el("st").innerHTML = '<div class="scan-status" style="background:' + bg + ";color:" + c + '">' + esc(msg) + "</div>";
      }
      function buka(a) {
        if (a.status !== "MCH") {
          status("Unit " + a.sn + " berstatus " + stat(a).label +
            ". Pengecekan kondisi hanya untuk cylinder yang sedang terpasang di alat berat.", "err");
          return;
        }
        stopScanner();
        found = a;
        drawForm();
      }

      el("qcek").addEventListener("input", function (e) {
        q = e.target.value;
        var pos = e.target.selectionStart;
        drawScan();
        var nn = el("qcek"); nn.focus(); nn.setSelectionRange(pos, pos);
      });
      el("xls").addEventListener("click", function () {
        eksporExcel("Cek Kondisi", [shCek(riwayat), shTerpasang()]);
      });
      root.querySelectorAll(".tab").forEach(function (t) {
        t.addEventListener("click", function () { tab = t.getAttribute("data-t"); drawScan(); });
      });
      root.querySelectorAll("[data-cek],[data-cek2]").forEach(function (el2) {
        el2.addEventListener("click", function (e) {
          e.stopPropagation();
          var id = el2.getAttribute("data-cek") || el2.getAttribute("data-cek2");
          buka(byId(DB.assets, id));
        });
      });
      root.querySelectorAll("[data-lihat]").forEach(function (tr) {
        tr.addEventListener("click", function () { go("asset", tr.getAttribute("data-lihat")); });
      });
    }

    /* ---- formulir pengecekan ---- */
    function drawForm() {
      stopScanner();
      var a = found, p = prod(a);
      var m = byId(DB.alats, a.lokasiId);
      var j = hitungJam(a, m);
      var sebelum = cekUnit(a.id);
      var fotoData = null;

      root.innerHTML =
        pageHead("clipboard", "Pengecekan Kondisi Cylinder",
          a.sn + " · " + p.nama + (m ? " · " + m.kode + " " + (a.slot || "") : ""),
          '<button class="btn btn-ghost" id="batal">' + icon("back") + "Batal & Pindai Ulang</button>") +

        '<div class="detail-grid"><div>' +
          '<div class="card"><div class="card-head"><h3>Unit Diperiksa</h3><p>Pastikan unit sudah sesuai</p></div>' +
          '<div class="info-list">' +
            row("Serial Number", '<span class="mono">' + esc(a.sn) + "</span>") +
            row("Nama Model", esc(p.nama)) +
            row("Alat Berat", m ? esc(m.kode) + " · " + esc(m.nama) : "—") +
            row("Posisi", esc(a.slot || "—")) +
            row("HMU Saat Ini", nomorRingkas(m && m.hmu)) +
            row("JJO Berjalan", nomorRingkas(j.jjo) + (j.tjo ? " / " + nomorRingkas(j.tjo) : "")) +
            row("Terakhir Dicek", sebelum.length
              ? fmtDate(sebelum[0].ts) + " · " + badgeSkor(skorTerburuk(sebelum[0]))
              : '<span style="color:var(--ink-3)">Belum pernah</span>') +
          "</div></div>" +
          (sebelum.length ? '<div class="card" style="margin-top:14px"><div class="card-head"><h3>Perkembangan Kondisi</h3>' +
            "<p>" + sebelum.length + " pengecekan sebelumnya</p></div>" +
            '<div class="timeline" style="padding:12px 20px 18px">' + sebelum.slice(0, 6).map(function (c) {
              var t = skorTerburuk(c);
              var sk = SKOR[String(t)];
              return '<div class="cek-riwayat">' +
                '<div class="cek-riwayat-h"><b>' + fmtDate(c.ts) + "</b>" + badgeSkor(t) + "</div>" +
                '<div class="cek-pills">' + TITIK_CEK.map(function (k) {
                  var v = Number(c.nilai[k]) || 0, s2 = SKOR[String(v)];
                  return '<span class="cek-pill" style="background:' + (s2 ? s2.bg : "var(--line-soft)") +
                    ";color:" + (s2 ? s2.warna : "var(--ink-3)") + '">' + k + " " + (v || "–") + "</span>";
                }).join("") + "</div>" +
                (c.catatan ? '<div class="tl-note" style="margin-top:6px">' + esc(c.catatan) + "</div>" : "") +
                (c.foto ? '<img class="cek-foto" src="' + c.foto + '" alt="Foto kondisi">' : "") +
                "</div>";
            }).join("") + "</div></div>" : "") +
        "</div>" +

        '<div class="card"><div class="card-head"><h3>Form Pemeriksaan</h3>' +
          "<p>Isi setiap titik dengan angka 1 sampai 4 sesuai kondisi yang ditemukan di lapangan</p></div>" +
          '<div class="card-body">' +
            '<div class="table-wrap"><table class="cek-tabel"><thead><tr>' +
              TITIK_CEK.map(function (k) { return "<th>" + k + "</th>"; }).join("") +
            "</tr></thead><tbody><tr>" +
              TITIK_CEK.map(function (k, i) {
                return "<td>" +
                  '<select class="input cek-sel" data-titik="' + esc(k) + '" id="ck' + i + '">' +
                  '<option value="">—</option>' +
                  Object.keys(SKOR).map(function (v) {
                    return '<option value="' + v + '"' + (v === "1" ? " selected" : "") + ">" + v + " · " + esc(SKOR[v].label) + "</option>";
                  }).join("") + "</select></td>";
              }).join("") +
            "</tr></tbody></table></div>" +

            '<div class="cek-legend">' + Object.keys(SKOR).map(function (v) {
              return '<span class="cek-pill" style="background:' + SKOR[v].bg + ";color:" + SKOR[v].warna + '">' +
                v + " · " + esc(SKOR[v].label) + "</span>";
            }).join("") + "</div>" +

            '<div class="field" style="margin-top:18px"><label>Catatan Kondisi Lapangan</label>' +
              '<textarea class="input" id="catatan" placeholder="Contoh: rembes tipis pada rod sisi bawah, belum menetes"></textarea>' +
              '<div class="hint">Tuliskan temuan yang tidak terwakili oleh angka di atas.</div></div>' +

            '<div class="field"><label>Foto Kondisi Cylinder</label>' +
              '<input class="input" type="file" id="foto" accept="image/*" capture="environment">' +
              '<div class="hint">Opsional. Foto otomatis diperkecil sebelum disimpan.</div>' +
              '<div id="fotoPrev"></div></div>' +

            '<div class="form-actions">' +
              '<button class="btn btn-ghost" id="batal2">Batal</button>' +
              '<button class="btn btn-primary" id="simpan">' + icon("check") + "Simpan Hasil Pemeriksaan</button>" +
            "</div>" +
          "</div></div></div>";

      function row(k, v) {
        return '<div class="info-row"><span class="k">' + esc(k) + '</span><span class="v">' + v + "</span></div>";
      }

      el("batal").addEventListener("click", function () { found = null; drawScan(); });
      el("batal2").addEventListener("click", function () { found = null; drawScan(); });

      el("foto").addEventListener("change", function (e) {
        var f = e.target.files && e.target.files[0];
        if (!f) { fotoData = null; el("fotoPrev").innerHTML = ""; return; }
        el("fotoPrev").innerHTML = '<div class="hint">Memproses foto...</div>';
        kecilkanFoto(f, function (data) {
          fotoData = data;
          el("fotoPrev").innerHTML = data
            ? '<img class="cek-foto" src="' + data + '" alt="Pratinjau foto">'
            : '<div class="hint" style="color:var(--red)">Foto tidak dapat dibaca.</div>';
        });
      });

      el("simpan").addEventListener("click", function () {
        var nilai = {}, adaIsi = false;
        TITIK_CEK.forEach(function (k, i) {
          var v = el("ck" + i).value;
          if (v) { nilai[k] = Number(v); adaIsi = true; }
        });
        if (!adaIsi) { toast("Isi minimal satu titik pemeriksaan.", "err"); return; }

        var c = {
          id: uid("ck"), assetId: a.id, ts: Date.now(),
          alatId: m ? m.id : "", alatNama: m ? m.nama : "", slot: a.slot || "",
          wo: a.wo || "",
          hmu: m && m.hmu ? Number(m.hmu) : 0,
          nilai: nilai, catatan: el("catatan").value.trim(),
          foto: fotoData || null, pic: SESSION ? SESSION.nama : "Sistem"
        };
        DB.ceks.push(c);

        var t = skorTerburuk(c);
        a.cekTerakhirTs = c.ts;
        a.cekTerakhirSkor = t;
        pushMutasi({
          assetId: a.id, aksi: MT.CEK_KONDISI,
          dari: m ? m.nama : "-", ke: m ? m.nama : "-",
          slot: a.slot, hm: c.hmu,
          catatan: TITIK_CEK.map(function (k) { return k + ":" + (nilai[k] || "-"); }).join(" · ") +
            (c.catatan ? " — " + c.catatan : "")
        });

        // Penyimpanan browser terbatas: bila penuh, foto dilepas lalu dicoba lagi
        try {
          localStorage.setItem(STORE_KEY, JSON.stringify(DB));
        } catch (err) {
          c.foto = null;
          try {
            localStorage.setItem(STORE_KEY, JSON.stringify(DB));
            toast("Penyimpanan penuh — hasil tersimpan tanpa foto.", "err");
          } catch (err2) {
            DB.ceks.pop();
            toast("Penyimpanan browser penuh. Hapus sebagian data lama lalu coba lagi.", "err");
            return;
          }
        }

        toast("Pemeriksaan " + a.sn + " tersimpan — kondisi " + (SKOR[String(t)] ? SKOR[String(t)].label : "-") + ".");
        found = null;
        tab = "RIWAYAT";
        drawScan();
      });
    }

    drawScan();
  };

  /* ---------------- PENGGUNA ---------------- */
  PAGES.pengguna = function (root) {
    function draw() {
      var rows = DB.users.map(function (u) {
        var me = SESSION && u.id === SESSION.id;
        return "<tr><td><div style=\"display:flex;align-items:center;gap:11px\">" +
            '<div class="avatar" style="width:30px;height:30px;font-size:12px">' + esc(u.nama.charAt(0)) + "</div>" +
            '<div><div class="t-strong">' + esc(u.nama) +
              (me ? ' <span class="badge b-cyan" style="margin-left:5px">Anda</span>' : "") + "</div></div></div></td>" +
          "<td>" + esc(u.email) + "</td>" +
          '<td><span class="badge b-navy">' + esc(ROLES[u.role].label) + "</span></td>" +
          '<td><span class="badge ' + (u.aktif ? "b-green" : "b-gray") + '"><span class="dot"></span>' +
            (u.aktif ? "AKTIF" : "NONAKTIF") + "</span></td>" +
          '<td style="text-align:right;white-space:nowrap">' +
            '<button class="icon-btn" data-edit="' + u.id + '">' + icon("edit") + "</button> " +
            (me ? "" : '<button class="icon-btn danger" data-del="' + u.id + '">' + icon("trash") + "</button>") + "</td></tr>";
      }).join("");

      root.innerHTML =
        pageHead("users", "Akses Otoritas Pengguna", "Manajemen kredensial karyawan dan konfigurasi hak akses operator sistem pabrik",
          tombolEkspor("xls") + '<button class="btn btn-primary" id="add">' + icon("plus") + "Tambah Pengguna</button>") +
        '<div class="card"><div class="table-wrap"><table><thead><tr>' +
          "<th>Identitas Personel</th><th>Alamat Email Kredensial</th><th>Hak Akses Otoritas</th><th>Status Akun</th><th></th>" +
        "</tr></thead><tbody>" + rows + "</tbody></table></div>" +
        '<div class="card-body" style="border-top:1px solid var(--line-soft);font-size:12px;color:var(--ink-3)">' +
          "Akun karyawan yang sudah tidak bertugas sebaiknya dinonaktifkan, bukan dihapus, agar riwayat tindakannya tetap utuh.</div></div>";

      el("add").addEventListener("click", function () { form(null); });
      el("xls").addEventListener("click", function () { eksporExcel("Pengguna", [shPengguna()]); });
      root.querySelectorAll("[data-edit]").forEach(function (b) {
        b.addEventListener("click", function () { form(byId(DB.users, b.getAttribute("data-edit"))); });
      });
      root.querySelectorAll("[data-del]").forEach(function (b) {
        b.addEventListener("click", function () {
          var u = byId(DB.users, b.getAttribute("data-del"));
          confirmDel("Hapus akun " + u.nama + "?", function () {
            DB.users = DB.users.filter(function (x) { return x.id !== u.id; });
            save(); draw(); toast("Akun dihapus.");
          });
        });
      });

      function form(u) {
        var fields = [
          { name: "nama", label: "Nama Lengkap Personel", type: "text", req: true, ph: "contoh: Ahmad Subarjo" },
          { name: "email", label: "Alamat Email Kredensial", type: "text", req: true, ph: "operator@jbs.co.id" },
          { name: "password", label: "Kunci Keamanan (Password)", type: "text", req: true, ph: "Minimal 8 karakter unik" },
          { name: "role", label: "Otoritas Ruang Kerja System (Role)", type: "select",
            options: [{ v: "STAFF", l: "Staff Pelaksana Gudang" }, { v: "SUPERVISOR", l: "Supervisor" }, { v: "ADMIN", l: "Administrator" }] },
          { name: "aktif", label: "Status Akun", type: "select", options: [{ v: "1", l: "Aktif" }, { v: "0", l: "Nonaktif" }] }
        ];
        openModal({
          title: u ? "Ubah Data Pengguna" : "Tambah Pengguna Baru",
          body: fields.map(function (f) {
            var v = u ? (f.name === "aktif" ? (u.aktif ? "1" : "0") : u[f.name]) : "";
            return fieldHTML(f, v);
          }).join(""),
          okLabel: "Simpan Personel",
          onOk: function (r, close) {
            var f = readForm(r, fields);
            if (f.missing) { toast(f.missing + " wajib diisi.", "err"); return false; }
            if (f.values.password.length < 8) { toast("Password minimal 8 karakter.", "err"); return false; }
            var dup = DB.users.filter(function (x) {
              return x.email.toLowerCase() === f.values.email.toLowerCase() && (!u || x.id !== u.id); }).length;
            if (dup) { toast("Email sudah dipakai akun lain.", "err"); return false; }
            if (u) {
              u.nama = f.values.nama; u.email = f.values.email; u.password = f.values.password;
              u.role = f.values.role; u.aktif = f.values.aktif === "1";
              if (SESSION && u.id === SESSION.id) SESSION = u;
            } else {
              DB.users.push({ id: uid("u"), nama: f.values.nama, email: f.values.email,
                password: f.values.password, role: f.values.role, aktif: f.values.aktif === "1" });
            }
            save(); close(); draw(); toast("Data pengguna tersimpan.");
          }
        });
      }
    }
    draw();
  };

  /* ---------------- KONFIRMASI HAPUS ---------------- */
  function confirmDel(msg, onYes) {
    openModal({
      title: "Konfirmasi Penghapusan", narrow: true,
      body: '<p style="margin:0;font-size:13.3px;color:var(--ink-2)">' + esc(msg) +
        '<br><span style="color:var(--ink-3);font-size:12px">Tindakan ini tidak dapat dibatalkan.</span></p>',
      foot: '<button class="btn btn-ghost" data-x>Batal</button>' +
        '<button class="btn btn-danger" data-yes>Ya, Hapus</button>',
      onMount: function (r, close) {
        r.querySelector("[data-yes]").addEventListener("click", function () { close(); onYes(); });
      }
    });
  }

  /* ==================================================================
     15. INIT
     ================================================================== */

  function boot() {
    DB = load();
    if (!DB) { DB = seed(); save(); }
    if (!DB.ceks) DB.ceks = [];

    // pulihkan sesi
    try {
      var sid = localStorage.getItem(STORE_KEY + ".session");
      if (sid) { var u = byId(DB.users, sid); if (u && u.aktif) SESSION = u; }
    } catch (e) { }

    window.addEventListener("hashchange", onHash);

    if (SESSION) {
      el("login-screen").classList.add("hidden");
      el("app-shell").classList.remove("hidden");
      onHash();
    } else {
      renderLogin();
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

})();
