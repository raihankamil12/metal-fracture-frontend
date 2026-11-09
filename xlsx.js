/* =====================================================================
   JB-SYS — penulis berkas Excel (.xlsx) mandiri
   Tidak memakai pustaka luar. Berkas .xlsx sebenarnya adalah arsip ZIP
   berisi beberapa berkas XML, jadi di sini dibuat keduanya dari nol:
   ZIP ditulis tanpa kompresi (metode "stored"), yang tetap sah dan
   dibuka normal oleh Excel, LibreOffice, maupun Google Sheets.

   Pemakaian:
     XLSXJB.buat([{ nama:"Asset", kolom:[...], baris:[[...]] }])  -> Uint8Array

   Definisi kolom: { h:"Judul", w:18, f:"s"|"n"|"rp"|"dt"|"tgl"|"pm" }
     s   teks            n   angka ribuan
     rp  rupiah          dt  tanggal + jam
     tgl tanggal saja    pm  angka bertanda (minus merah)
   ===================================================================== */
var XLSXJB = (function () {
  "use strict";

  /* ---------------- CRC-32 untuk entri ZIP ---------------- */
  var TBL = (function () {
    var t = new Uint32Array(256), c, k, i;
    for (i = 0; i < 256; i++) {
      c = i;
      for (k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      t[i] = c >>> 0;
    }
    return t;
  })();
  function crc32(u8) {
    var c = 0xFFFFFFFF;
    for (var i = 0; i < u8.length; i++) c = TBL[(c ^ u8[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  function utf8(str) {
    if (typeof TextEncoder !== "undefined") return new TextEncoder().encode(str);
    var s = unescape(encodeURIComponent(str)), a = new Uint8Array(s.length);
    for (var i = 0; i < s.length; i++) a[i] = s.charCodeAt(i);
    return a;
  }

  /* ---------------- Penulis ZIP (stored) ---------------- */
  function zip(files) {
    var lokal = [], pusat = [], offset = 0, total = 0;

    files.forEach(function (f) {
      var nama = utf8(f.nama), isi = f.isi, crc = crc32(isi), len = isi.length;

      var lh = new Uint8Array(30 + nama.length);
      var d = new DataView(lh.buffer);
      d.setUint32(0, 0x04034b50, true);
      d.setUint16(4, 20, true);        // versi minimum
      d.setUint16(6, 0x0800, true);    // nama berkas UTF-8
      d.setUint16(8, 0, true);         // metode 0 = disimpan apa adanya
      d.setUint16(10, 0, true);        // waktu
      d.setUint16(12, 0, true);        // tanggal
      d.setUint32(14, crc, true);
      d.setUint32(18, len, true);
      d.setUint32(22, len, true);
      d.setUint16(26, nama.length, true);
      d.setUint16(28, 0, true);
      lh.set(nama, 30);

      var cd = new Uint8Array(46 + nama.length);
      var c = new DataView(cd.buffer);
      c.setUint32(0, 0x02014b50, true);
      c.setUint16(4, 20, true);
      c.setUint16(6, 20, true);
      c.setUint16(8, 0x0800, true);
      c.setUint16(10, 0, true);
      c.setUint16(12, 0, true);
      c.setUint16(14, 0, true);
      c.setUint32(16, crc, true);
      c.setUint32(20, len, true);
      c.setUint32(24, len, true);
      c.setUint16(28, nama.length, true);
      c.setUint32(42, offset, true);
      cd.set(nama, 46);

      lokal.push(lh, isi);
      pusat.push(cd);
      offset += lh.length + len;
      total += lh.length + len;
    });

    var ukuranPusat = pusat.reduce(function (a, b) { return a + b.length; }, 0);
    var eocd = new Uint8Array(22);
    var e = new DataView(eocd.buffer);
    e.setUint32(0, 0x06054b50, true);
    e.setUint16(8, files.length, true);
    e.setUint16(10, files.length, true);
    e.setUint32(12, ukuranPusat, true);
    e.setUint32(16, total, true);

    var out = new Uint8Array(total + ukuranPusat + 22), pos = 0;
    lokal.forEach(function (b) { out.set(b, pos); pos += b.length; });
    pusat.forEach(function (b) { out.set(b, pos); pos += b.length; });
    out.set(eocd, pos);
    return out;
  }

  /* ---------------- Bantuan XML ---------------- */
  function xesc(v) {
    return String(v == null ? "" : v)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      // buang karakter kendali yang ditolak Excel
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");
  }
  function kolomHuruf(i) {
    var s = "";
    i += 1;
    while (i > 0) { var m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); }
    return s;
  }
  // Excel menyimpan tanggal sebagai angka hari sejak 1899-12-30, memakai jam lokal
  function serialTanggal(ts) {
    var d = new Date(ts);
    return (ts - d.getTimezoneOffset() * 60000) / 86400000 + 25569;
  }

  var GAYA = { s: 2, n: 3, rp: 4, dt: 5, tgl: 6, pm: 7 };

  /* ---------------- styles.xml ---------------- */
  function styles() {
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      '<numFmts count="5">' +
        '<numFmt numFmtId="164" formatCode="#,##0"/>' +
        '<numFmt numFmtId="165" formatCode="&quot;Rp&quot;\\ #,##0"/>' +
        '<numFmt numFmtId="166" formatCode="dd/mm/yyyy\\ hh:mm"/>' +
        '<numFmt numFmtId="167" formatCode="dd/mm/yyyy"/>' +
        '<numFmt numFmtId="168" formatCode="#,##0;[Red]\\-#,##0"/>' +
      '</numFmts>' +
      '<fonts count="2">' +
        '<font><sz val="10"/><name val="Calibri"/><color rgb="FF1B2033"/></font>' +
        '<font><b/><sz val="10"/><name val="Calibri"/><color rgb="FFFFFFFF"/></font>' +
      '</fonts>' +
      '<fills count="3">' +
        '<fill><patternFill patternType="none"/></fill>' +
        '<fill><patternFill patternType="gray125"/></fill>' +
        '<fill><patternFill patternType="solid"><fgColor rgb="FF211B51"/><bgColor indexed="64"/></patternFill></fill>' +
      '</fills>' +
      '<borders count="2">' +
        '<border><left/><right/><top/><bottom/><diagonal/></border>' +
        '<border><left style="thin"><color rgb="FFD9DEE8"/></left><right style="thin"><color rgb="FFD9DEE8"/></right>' +
          '<top style="thin"><color rgb="FFD9DEE8"/></top><bottom style="thin"><color rgb="FFD9DEE8"/></bottom><diagonal/></border>' +
      '</borders>' +
      '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
      '<cellXfs count="8">' +
        '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
        '<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">' +
          '<alignment horizontal="center" vertical="center" wrapText="1"/></xf>' +
        '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1">' +
          '<alignment vertical="top" wrapText="1"/></xf>' +
        '<xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"/>' +
        '<xf numFmtId="165" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"/>' +
        '<xf numFmtId="166" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"/>' +
        '<xf numFmtId="167" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"/>' +
        '<xf numFmtId="168" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"/>' +
      '</cellXfs>' +
      '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
      "</styleSheet>";
  }

  /* ---------------- worksheet ---------------- */
  function lembar(sh) {
    var kolom = sh.kolom || [], baris = sh.baris || [];
    var akhir = kolom.length ? kolomHuruf(kolom.length - 1) : "A";
    var jml = baris.length + 1;

    var cols = kolom.length
      ? "<cols>" + kolom.map(function (k, i) {
          return '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + (k.w || 14) + '" customWidth="1"/>';
        }).join("") + "</cols>"
      : "";

    var head = "<row r=\"1\" ht=\"30\" customHeight=\"1\">" + kolom.map(function (k, i) {
      return '<c r="' + kolomHuruf(i) + '1" s="1" t="inlineStr"><is><t xml:space="preserve">' +
        xesc(k.h) + "</t></is></c>";
    }).join("") + "</row>";

    var body = baris.map(function (r, ri) {
      var no = ri + 2;
      var sel = r.map(function (v, ci) {
        var k = kolom[ci] || {}, f = k.f || "s", ref = kolomHuruf(ci) + no;
        if (v == null || v === "") return "";
        if (f === "dt" || f === "tgl") {
          var num = typeof v === "number" ? serialTanggal(v) : null;
          if (num == null) return '<c r="' + ref + '" s="2" t="inlineStr"><is><t>' + xesc(v) + "</t></is></c>";
          return '<c r="' + ref + '" s="' + GAYA[f] + '"><v>' + num + "</v></c>";
        }
        if (f === "n" || f === "rp" || f === "pm") {
          var angka = Number(v);
          if (!isFinite(angka)) return '<c r="' + ref + '" s="2" t="inlineStr"><is><t>' + xesc(v) + "</t></is></c>";
          return '<c r="' + ref + '" s="' + GAYA[f] + '"><v>' + angka + "</v></c>";
        }
        return '<c r="' + ref + '" s="2" t="inlineStr"><is><t xml:space="preserve">' + xesc(v) + "</t></is></c>";
      }).join("");
      return '<row r="' + no + '">' + sel + "</row>";
    }).join("");

    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      '<dimension ref="A1:' + akhir + jml + '"/>' +
      '<sheetViews><sheetView workbookViewId="0">' +
        '<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>' +
        '<selection pane="bottomLeft" activeCell="A2" sqref="A2"/>' +
      "</sheetView></sheetViews>" +
      '<sheetFormatPr defaultRowHeight="15"/>' +
      cols +
      "<sheetData>" + head + body + "</sheetData>" +
      (kolom.length && baris.length ? '<autoFilter ref="A1:' + akhir + jml + '"/>' : "") +
      '<pageMargins left="0.4" right="0.4" top="0.6" bottom="0.6" header="0.3" footer="0.3"/>' +
      "</worksheet>";
  }

  /* ---------------- nama lembar yang sah ---------------- */
  function namaAman(nama, dipakai) {
    var s = String(nama || "Sheet").replace(/[\\\/\?\*\[\]:]/g, " ").slice(0, 31).trim() || "Sheet";
    var dasar = s, i = 2;
    while (dipakai.indexOf(s.toLowerCase()) >= 0) {
      s = (dasar.slice(0, 28) + " " + i).trim();
      i++;
    }
    dipakai.push(s.toLowerCase());
    return s;
  }

  /* ---------------- API ---------------- */
  function buat(sheets) {
    if (!sheets || !sheets.length) sheets = [{ nama: "Kosong", kolom: [], baris: [] }];
    var dipakai = [];
    sheets = sheets.map(function (sh) {
      return { nama: namaAman(sh.nama, dipakai), kolom: sh.kolom, baris: sh.baris };
    });

    var berkas = [];
    berkas.push({
      nama: "[Content_Types].xml", isi: utf8(
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
        '<Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
        '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
        sheets.map(function (_, i) {
          return '<Override PartName="/xl/worksheets/sheet' + (i + 1) +
            '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>';
        }).join("") +
        "</Types>")
    });

    berkas.push({
      nama: "_rels/.rels", isi: utf8(
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
        "</Relationships>")
    });

    berkas.push({
      nama: "xl/workbook.xml", isi: utf8(
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ' +
        'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
        "<sheets>" + sheets.map(function (sh, i) {
          return '<sheet name="' + xesc(sh.nama) + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>';
        }).join("") + "</sheets></workbook>")
    });

    berkas.push({
      nama: "xl/_rels/workbook.xml.rels", isi: utf8(
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        sheets.map(function (_, i) {
          return '<Relationship Id="rId' + (i + 1) +
            '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' +
            (i + 1) + '.xml"/>';
        }).join("") +
        '<Relationship Id="rId' + (sheets.length + 1) +
        '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
        "</Relationships>")
    });

    berkas.push({ nama: "xl/styles.xml", isi: utf8(styles()) });
    sheets.forEach(function (sh, i) {
      berkas.push({ nama: "xl/worksheets/sheet" + (i + 1) + ".xml", isi: utf8(lembar(sh)) });
    });

    return zip(berkas);
  }

  /* CSV cadangan bila .xlsx tidak diizinkan lingkungan */
  function csv(sh) {
    function sel(v) {
      var t = v == null ? "" : String(v);
      return /[";\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t;
    }
    var baris = [(sh.kolom || []).map(function (k) { return sel(k.h); }).join(";")];
    (sh.baris || []).forEach(function (r) { baris.push(r.map(sel).join(";")); });
    return "﻿" + baris.join("\r\n");   // BOM agar Excel membaca UTF-8
  }

  return { buat: buat, csv: csv };
})();
