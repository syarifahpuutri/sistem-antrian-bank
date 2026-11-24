// bagian ini dibuat oleh novi aulia (h1101251043)
(function ($) {
  'use strict';

  if (!App.sudahLogin()) { location.replace('index.html'); return; }
  $('body').removeClass('cek-auth');

  $(function () {
    let fLayanan = 'semua', fStatus = 'semua', kunci = '';
    let urut = 1;                                 
    const pesan = (tipe, teks) => App.alertBox('#areaAlert', tipe, teks);
    const norm = t => t.toLowerCase().replace('-', '').replace(/^([tc])0*/, '$1');

    /* ---- Tabel semua antrian ---- */
    function renderTabel() {
      const s = App.muat(), d = App.dipanggil(s);
      const baris = s.antrian
        .filter(i => (fLayanan === 'semua' || i.jenis_layanan === fLayanan) &&
                     (fStatus === 'semua' || i.status === fStatus) &&
                     norm(i.nomor).includes(norm(kunci)))
        .sort((a, b) => urut * (new Date(a.waktu_ambil) - new Date(b.waktu_ambil)))
        .map(i => '<tr>' +
          '<td><span class="nomor">' + i.nomor + '</span></td>' +
          '<td>' + App.badgeLayanan(i.jenis_layanan) + '</td>' +
          '<td class="d-none d-sm-table-cell">' + App.jam(i.waktu_ambil) + '</td>' +
          '<td>' + App.badgeStatus(i.status) + '</td>' +
          '<td class="text-end">' + (i.status === 'dipanggil'
            ? '<button type="button" class="btn btn-sm btn-brand btn-selesai-baris" data-nomor="' + i.nomor + '">Selesai</button>'
            : '<span class="text-soft">-</span>') + '</td></tr>');

      $('#tbodyKelola').html(baris.join('') ||
        '<tr><td colspan="5" class="text-center text-soft py-4">Tidak ada antrian yang cocok dengan filter.</td></tr>');

      $('#btnPanggil').prop('disabled', !!d);
      $('#btnUlang, #btnSelesai').prop('disabled', !d);
      $('#infoPanggil').text(d ? 'Selesaikan ' + d.nomor + ' sebelum memanggil nomor berikutnya.'
        : 'Panggilan berikutnya diambil dari: ' + (fLayanan === 'semua' ? 'semua layanan' : fLayanan) + '.');
    }

    $('#btnPanggil').on('click', function () {
      const s = App.muat(), sedang = App.dipanggil(s);
      if (sedang) { return pesan('warning', 'Selesaikan nomor ' + sedang.nomor + ' dulu.'); }

      const next = App.menunggu(s).find(i => fLayanan === 'semua' || i.jenis_layanan === fLayanan);
      if (!next) { return pesan('info', 'Tidak ada antrian yang menunggu' + (fLayanan === 'semua' ? '' : ' untuk ' + fLayanan) + '.'); }

      next.status = 'dipanggil';
      s.lastCall = Date.now();                     
      App.simpan(s);
      pesan('success', 'Memanggil nomor ' + next.nomor + ' (' + next.jenis_layanan + ').');
    });

    $('#btnUlang').on('click', function () {
      const s = App.muat(), d = App.dipanggil(s);
      if (!d) { return; }
      s.lastCall = Date.now();                     
      App.simpan(s);
      pesan('info', 'Memanggil ulang nomor ' + d.nomor + '.');
    });

    function selesaikan(nomor) {
      const s = App.muat(), item = s.antrian.find(i => i.nomor === nomor && i.status === 'dipanggil');
      if (!item) { return; }
      item.status = 'selesai';
      item.waktu_selesai = new Date().toISOString();
      App.simpan(s);
      pesan('success', 'Nomor ' + nomor + ' selesai dilayani.');
    }
    $('#btnSelesai').on('click', () => { const d = App.dipanggil(App.muat()); if (d) { selesaikan(d.nomor); } });
    $('#tbodyKelola').on('click', '.btn-selesai-baris', function () { selesaikan($(this).data('nomor')); });

    /* ---- Cari, filter, urutkan ---- */
    $('#cariNomor').on('input', function () { kunci = $.trim($(this).val()); renderTabel(); });
    $('#filterLayanan').on('change', function () { fLayanan = $(this).val(); renderTabel(); });
    $('#filterStatus').on('change', function () { fStatus = $(this).val(); renderTabel(); });
    $('#btnUrut').on('click', function () {
      urut = -urut;
      $(this).find('i').attr('class', urut === 1 ? 'bi bi-sort-down' : 'bi bi-sort-up');
      $(this).find('span').text(urut === 1 ? 'Terlama' : 'Terbaru');
      renderTabel();
    });

    /* ---- Reset data dan keluar ---- */
    $('#btnKonfirmReset').on('click', function () {
      App.resetData();
      bootstrap.Modal.getOrCreateInstance('#modalReset').hide();
      pesan('success', 'Data antrian dikembalikan ke data awal.');
    });
    $('.js-logout').on('click', function () { App.logout(); location.href = 'index.html'; });

    $(document).on('antrian:berubah', renderTabel);
    renderTabel();
  });

})(jQuery);
