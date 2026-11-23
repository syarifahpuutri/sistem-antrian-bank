/* =====================================================================
   display.js - LAYAR PANGGILAN (index.html dan admin.html)
   Isi: nomor besar yang sedang dipanggil, riwayat, angka ringkasan,
        suara panggilan (Speech Synthesis)
   ===================================================================== */
(function ($) {
  'use strict';

  $(function () {
    if (!$('#displayNomor').length) { return; }

    const bisaSuara = 'speechSynthesis' in window;
    // Admin: suara langsung aktif (klik "Panggil berikutnya" sudah dianggap izin oleh browser).
    // Nasabah: harus klik tombol suara dulu, karena browser memblokir suara otomatis.
    let suaraAktif = $('body').data('page') === 'admin';
    let lastCall = null;      // lastCall pada render sebelumnya (null = belum pernah render)
    let nomorLama = null;     // untuk animasi saat nomor berganti

    function render() {
      const s = App.muat(), d = App.dipanggil(s);
      const selesai = s.antrian.filter(i => i.status === 'selesai');

      // Nomor besar: emas jika ada panggilan, abu-abu jika kosong
      const $n = $('#displayNomor');
      $n.text(d ? d.nomor : '---').toggleClass('aktif', !!d);
      $('#displayKeterangan').text(d ? 'Silakan menuju ' + d.jenis_layanan : 'Belum ada panggilan');
      if (nomorLama !== null && nomorLama !== $n.text()) {
        $n.removeClass('berganti');
        void $n[0].offsetWidth;            // memaksa animasi diulang
        $n.addClass('berganti');
      }
      nomorLama = $n.text();

      // Angka ringkasan (elemen berkelas js-jml-total, js-jml-menunggu, dst.)
      $.each({ total: s.antrian.length, menunggu: App.menunggu(s).length, dipanggil: d ? 1 : 0, selesai: selesai.length },
        (kunci, nilai) => $('.js-jml-' + kunci).text(nilai));

      // Riwayat: 3 antrian yang terakhir selesai
      const akhir = selesai.sort((a, b) => new Date(b.waktu_selesai) - new Date(a.waktu_selesai)).slice(0, 3);
      $('#riwayatPanggilan').html(akhir.map(i => '<li>' + i.nomor + '</li>').join('') || '<li class="kosong">Belum ada</li>');

      // Suara hanya jika ada panggilan BARU (lastCall bertambah)
      if (d && suaraAktif && lastCall !== null && s.lastCall > lastCall) {
        ucapkan('Nomor antrian ' + d.nomor.charAt(0) + ' ' + parseInt(d.nomor.slice(1), 10) +
                ', silakan menuju ' + d.jenis_layanan + '.');
      }
      lastCall = s.lastCall;
    }

    function ucapkan(teks) {
      if (!bisaSuara) { return; }
      const u = new SpeechSynthesisUtterance(teks);
      u.lang = 'id-ID';
      u.rate = 0.9;
      speechSynthesis.cancel();            // hentikan ucapan sebelumnya
      speechSynthesis.speak(u);
    }

    // Tombol hidup/mati suara
    function tampilTombol() {
      $('#btnSuara').toggleClass('aktif', suaraAktif).attr('aria-pressed', suaraAktif);
      $('#btnSuara i').attr('class', suaraAktif ? 'bi bi-volume-up-fill' : 'bi bi-volume-mute');
      $('#btnSuara span').text(suaraAktif ? 'Suara aktif' : 'Suara mati');
    }
    $('#btnSuara').prop('disabled', !bisaSuara).on('click', function () {
      suaraAktif = !suaraAktif;
      tampilTombol();
      if (suaraAktif) { ucapkan('Suara panggilan aktif.'); } else { speechSynthesis.cancel(); }
    });
    tampilTombol();

    $(document).on('antrian:berubah', render);
    render();
  });

})(jQuery);