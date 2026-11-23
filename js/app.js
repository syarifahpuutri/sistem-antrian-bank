/* =====================================================================
   app.js - FONDASI (dimuat di semua halaman, paling awal)
   Isi: 1) data + localStorage  2) fungsi antrian  3) fungsi tampilan  4) login admin

   Alur data: setiap perubahan disimpan ke localStorage lalu memicu event
   'antrian:berubah'. Tabel, nomor besar, dan statistik mendengarkan event itu,
   jadi tampilan selalu mengikuti data (termasuk perubahan dari tab lain).
   ===================================================================== */
window.App = (function ($) {
  'use strict';

  const KUNCI = 'antrianBank_v2';            // kunci localStorage untuk seluruh data
  const KUNCI_ADMIN = 'antrianBank_admin';   // penanda login (sessionStorage)
  const MENIT = 5;                           // estimasi: 5 menit per nasabah
  const PREFIX = { 'Teller': 'T', 'Customer Service': 'C' };
  const AKUN = { username: 'admin', password: 'admin123' };   // simulasi, tanpa backend

  /* ---------- 1. DATA ---------- */

  // Data awal (7 data). status: 'menunggu' | 'dipanggil' | 'selesai'
  function dataAwal() {
    const lalu = m => new Date(Date.now() - m * 60000).toISOString();   // "m menit yang lalu"
    return {
      antrian: [
        { nomor: 'T001', jenis_layanan: 'Teller',           waktu_ambil: lalu(32), status: 'selesai', waktu_selesai: lalu(25) },
        { nomor: 'C001', jenis_layanan: 'Customer Service', waktu_ambil: lalu(27), status: 'selesai', waktu_selesai: lalu(18) },
        { nomor: 'T002', jenis_layanan: 'Teller',           waktu_ambil: lalu(22), status: 'dipanggil' },
        { nomor: 'T003', jenis_layanan: 'Teller',           waktu_ambil: lalu(15), status: 'menunggu' },
        { nomor: 'C002', jenis_layanan: 'Customer Service', waktu_ambil: lalu(11), status: 'menunggu' },
        { nomor: 'T004', jenis_layanan: 'Teller',           waktu_ambil: lalu(6),  status: 'menunggu' },
        { nomor: 'C003', jenis_layanan: 'Customer Service', waktu_ambil: lalu(2),  status: 'menunggu' }
      ],
      counter: { T: 4, C: 3 },   // nomor terakhir yang dipakai per layanan
      lastCall: 0                // waktu panggilan terakhir (pemicu suara)
    };
  }

  // Baca data dari localStorage; kalau belum ada atau rusak, pakai data awal
  function muat() {
    try {
      const data = JSON.parse(localStorage.getItem(KUNCI));
      if (data && data.antrian) return data;
    } catch (e) { /* data rusak: abaikan */ }
    const awal = dataAwal();
    simpan(awal, true);
    return awal;
  }

  // Simpan data, lalu beri tahu semua tampilan (kecuali diam = true)
  function simpan(state, diam) {
    localStorage.setItem(KUNCI, JSON.stringify(state));
    if (!diam) { $(document).trigger('antrian:berubah'); }
  }

  /* ---------- 2. FUNGSI ANTRIAN ---------- */

  // Antrian berstatus menunggu, paling awal dulu (FIFO)
  const menunggu = s => s.antrian
    .filter(i => i.status === 'menunggu')
    .sort((a, b) => new Date(a.waktu_ambil) - new Date(b.waktu_ambil));

  // Antrian yang sedang dipanggil (maksimal satu) atau null
  const dipanggil = s => s.antrian.find(i => i.status === 'dipanggil') || null;

  // Nasabah menekan tombol layanan: nomor baru dibuat dan disimpan
  function tambah(layanan) {
    const s = muat(), p = PREFIX[layanan];
    s.counter[p] += 1;
    const item = {
      nomor: p + String(s.counter[p]).padStart(3, '0'),   // 1 menjadi "T001"
      jenis_layanan: layanan,
      waktu_ambil: new Date().toISOString(),
      status: 'menunggu'
    };
    s.antrian.push(item);
    simpan(s);
    return item;
  }

  // Jumlah nasabah yang dilayani lebih dulu (termasuk yang sedang dilayani)
  function diDepan(s, nomor) {
    const urutan = menunggu(s).findIndex(i => i.nomor === nomor);
    return urutan < 0 ? null : urutan + (dipanggil(s) ? 1 : 0);
  }
  const diDepanBaru = s => menunggu(s).length + (dipanggil(s) ? 1 : 0);   // untuk yang mengambil nomor sekarang

  // Estimasi tunggu = jumlah di depan x 5 menit
  function estimasi(n) {
    if (n === null) { return '-'; }
    return n === 0 ? 'Segera' : '\u2248 ' + n * MENIT + ' menit';
  }

  /* ---------- 3. FUNGSI TAMPILAN ---------- */

  const jam = iso => new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  const badgeLayanan = j => '<span class="badge ' + (j === 'Teller' ? 'badge-teller' : 'badge-cs') + '">' + j + '</span>';
  const badgeStatus = st => '<span class="badge badge-' + st + '">' + st.charAt(0).toUpperCase() + st.slice(1) + '</span>';

  // Bootstrap alert di dalam elemen target (hilang sendiri setelah 4 detik)
  function alertBox(selektor, tipe, pesan, otomatis) {
    const $a = $('<div class="alert alert-' + tipe + ' alert-dismissible fade show mb-0" role="alert"></div>')
      .text(pesan)
      .append('<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Tutup"></button>');
    $(selektor).empty().append($a);
    if (otomatis !== false) {
      setTimeout(() => bootstrap.Alert.getOrCreateInstance($a[0]).close(), 4000);
    }
  }

  // Tandai input tidak valid (kotak merah) + tulis pesan error. Mengembalikan false.
  function tandaiError($input, pesan) {
    $input.addClass('is-invalid');
    $input.siblings('.invalid-feedback').text(pesan);
    return false;
  }

  // Jam digital: elemen .js-jam diperbarui tiap detik
  function mulaiJam() {
    const $jam = $('.js-jam');
    const tampil = () => $jam.text(new Date().toLocaleTimeString('id-ID'));
    if ($jam.length) { tampil(); setInterval(tampil, 1000); }
  }

  /* ---------- 4. LOGIN ADMIN (simulasi, hanya penjaga tampilan) ---------- */

  const sudahLogin = () => sessionStorage.getItem(KUNCI_ADMIN) === '1';

  // Validasi form login dengan jQuery. Panjang minimal dibaca dari atribut minlength di HTML.
  function validasiLogin() {
    let valid = true;
    $('#formLogin .form-control').each(function () {
      const $f = $(this), nilai = $f.val(), min = Number($f.attr('minlength'));
      const nama = $f.siblings('label').text();
      $f.removeClass('is-invalid');
      if ($.trim(nilai) === '') { valid = tandaiError($f, nama + ' wajib diisi.'); }
      else if (nilai.length < min) { valid = tandaiError($f, nama + ' minimal ' + min + ' karakter.'); }
    });
    return valid;
  }

  function initLogin() {
    // Tombol "Kelola admin": sudah login langsung ke admin.html, belum login tampilkan modal
    $('.js-kelola-admin').on('click', function (e) {
      e.preventDefault();
      if (sudahLogin()) { location.href = 'admin.html'; }
      else { bootstrap.Modal.getOrCreateInstance('#modalLogin').show(); }
    });

    $('#formLogin').on('submit', function (e) {
      e.preventDefault();
      $('#alertLogin').empty();
      if (!validasiLogin()) { return; }
      if ($.trim($('#inputUsername').val()) === AKUN.username && $('#inputPassword').val() === AKUN.password) {
        sessionStorage.setItem(KUNCI_ADMIN, '1');
        location.href = 'admin.html';
      } else {
        alertBox('#alertLogin', 'danger', 'Username atau password salah.');
        $('#inputPassword').val('').trigger('focus');
      }
    });

    // Error hilang saat pengguna mengetik ulang; form dibersihkan saat modal ditutup
    $('#formLogin .form-control').on('input', function () { $(this).removeClass('is-invalid'); });
    $('#modalLogin')
      .on('shown.bs.modal', () => $('#inputUsername').trigger('focus'))
      .on('hidden.bs.modal', () => {
        $('#formLogin')[0].reset();
        $('#formLogin .form-control').removeClass('is-invalid');
        $('#alertLogin').empty();
      });
  }

  /* ---------- Inisialisasi ---------- */
  $(function () {
    $('.js-tahun').text(new Date().getFullYear());
    mulaiJam();
    initLogin();
    // Event 'storage' hanya muncul di tab LAIN saat localStorage berubah: teruskan sebagai event kita
    $(window).on('storage', e => {
      if (e.originalEvent.key === KUNCI) { $(document).trigger('antrian:berubah'); }
    });
  });

  // Fungsi yang boleh dipakai file lain (App.namaFungsi)
  return {
    muat, simpan, menunggu, dipanggil, tambah, diDepan, diDepanBaru, estimasi,
    jam, badgeLayanan, badgeStatus, alertBox, tandaiError, sudahLogin,
    resetData: () => simpan(dataAwal()),
    logout: () => sessionStorage.removeItem(KUNCI_ADMIN)
  };
})(jQuery);