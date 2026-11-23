/* =====================================================================
   queue.js - SISI NASABAH (hanya index.html)
   Isi: ambil nomor + tiket + cetak, tabel antrian menunggu, filter layanan,
        info saat hover, form cek nomor (validasi jQuery)
   ===================================================================== */
(function ($) {
  'use strict';

  $(function () {
    if (!$('#tbodyMenunggu').length) { return; }   // bukan halaman nasabah

    const KUNCI_SAYA = 'antrianBank_nomorSaya';    // nomor milik nasabah di browser ini
    const TEKS_BAWAAN = 'Estimasi tunggu dihitung 5 menit per nasabah.';
    let filter = 'semua';                          // 'semua' | 'Teller' | 'Customer Service'

    /* ---- Tabel antrian menunggu ---- */
    function renderTabel() {
      const s = App.muat(), saya = sessionStorage.getItem(KUNCI_SAYA);
      const baris = App.menunggu(s)
        .filter(i => filter === 'semua' || i.jenis_layanan === filter)
        .map(i => '<tr class="' + (i.nomor === saya ? 'baris-saya' : '') + '">' +
          '<td><span class="nomor">' + i.nomor + '</span>' + (i.nomor === saya ? '<span class="penanda-saya">Nomor Anda</span>' : '') + '</td>' +
          '<td>' + App.badgeLayanan(i.jenis_layanan) + '</td>' +
          '<td class="d-none d-sm-table-cell">' + App.jam(i.waktu_ambil) + '</td>' +
          '<td class="text-end">' + App.estimasi(App.diDepan(s, i.nomor)) + '</td></tr>');

      $('#tbodyMenunggu').html(baris.join('') ||
        '<tr><td colspan="4" class="text-center text-soft py-4">Tidak ada antrian yang menunggu.</td></tr>');
      $('#estimasiBaru').text(App.estimasi(App.diDepanBaru(s)));
    }

    /* ---- Ambil nomor: tombol Teller / Customer Service ---- */
    $('.btn-ambil').on('click', function () {
      const item = App.tambah($(this).data('layanan'));   // nomor naik otomatis dan tersimpan
      sessionStorage.setItem(KUNCI_SAYA, item.nomor);
      renderTabel();                                      // supaya baris "Nomor Anda" tersorot

      const s = App.muat(), n = App.diDepan(s, item.nomor);
      $('#tiketNomor').text(item.nomor);
      $('#tiketLayanan').text(item.jenis_layanan);
      $('#tiketWaktu').text(App.jam(item.waktu_ambil));
      $('#tiketDidepan').text(n + ' nasabah');
      $('#tiketEstimasi').text(App.estimasi(n));
      bootstrap.Modal.getOrCreateInstance('#modalTiket').show();
    });

    $('#btnCetak').on('click', () => window.print());   // gaya cetak: @media print di style.css

    // Hover/fokus pada tombol layanan menampilkan jumlah antrian layanan itu
    $('.btn-ambil')
      .on('mouseenter focus', function () {
        const layanan = $(this).data('layanan'), s = App.muat();
        const jumlah = App.menunggu(s).filter(i => i.jenis_layanan === layanan).length;
        $('#infoLayanan').text(layanan + ': ' + jumlah + ' nasabah menunggu. Estimasi giliran Anda ' +
          App.estimasi(App.diDepanBaru(s)) + '.');
      })
      .on('mouseleave blur', () => $('#infoLayanan').text(TEKS_BAWAAN));

    /* ---- Filter layanan ---- */
    $('.btn-filter').on('click', function () {
      filter = $(this).data('layanan');
      $('.btn-filter').removeClass('active').attr('aria-pressed', 'false');
      $(this).addClass('active').attr('aria-pressed', 'true');
      renderTabel();
    });

    /* ---- Form cek nomor: wajib diisi, format huruf T/C + 1-3 angka ---- */
    $('#formCek').on('submit', function (e) {
      e.preventDefault();
      const $in = $('#inputCek'), teks = $.trim($in.val());
      const cocok = /^([TC])-?(\d{1,3})$/i.exec(teks);   // contoh: T4, t-004, C002

      $in.removeClass('is-invalid');
      $('#hasilCek').empty();
      if (teks === '') { return App.tandaiError($in, 'Nomor antrian wajib diisi.'); }
      if (!cocok) { return App.tandaiError($in, 'Format belum sesuai. Contoh: T004 atau C002.'); }

      const nomor = cocok[1].toUpperCase() + cocok[2].padStart(3, '0');   // rapikan: "t4" menjadi "T004"
      $in.val(nomor);

      const s = App.muat(), item = s.antrian.find(i => i.nomor === nomor);
      let tipe, pesan;
      if (!item) {
        tipe = 'danger'; pesan = 'Nomor ' + nomor + ' tidak ditemukan.';
      } else if (item.status === 'menunggu') {
        const n = App.diDepan(s, nomor);
        tipe = 'warning'; pesan = 'Nomor ' + nomor + ' masih menunggu. Di depan Anda ' + n + ' nasabah, estimasi ' + App.estimasi(n) + '.';
      } else if (item.status === 'dipanggil') {
        tipe = 'success'; pesan = 'Nomor ' + nomor + ' sedang dipanggil. Silakan menuju ' + item.jenis_layanan + '.';
      } else {
        tipe = 'secondary'; pesan = 'Nomor ' + nomor + ' sudah selesai dilayani.';
      }
      App.alertBox('#hasilCek', tipe, pesan, false);
    });
    $('#inputCek').on('input', function () { $(this).removeClass('is-invalid'); });

    /* Tampilan selalu mengikuti data */
    $(document).on('antrian:berubah', renderTabel);
    renderTabel();
  });

})(jQuery);
