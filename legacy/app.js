/* Keuangan Berdua: pencatat pemasukan, pengeluaran, dan hutang untuk dua orang.
   Semua data disimpan di localStorage browser ini (lihat load/save di bawah).

   Jenis transaksi (tx.kind):
     income   uang masuk
     expense  pengeluaran yang dibayar tunai/transfer
     paylater belanja pakai paylater: uang belum keluar, tapi hutang (tx.debtId) bertambah
     payment  bayar cicilan: uang keluar, hutang (tx.debtId) berkurang
*/
(function () {
  'use strict';

  var KEY = 'keuangan-berdua-v1';
  var CATS = {
    income: ['Gaji', 'ShopeeFood', 'Bonus/THR', 'Lainnya'],
    expense: ['Makan & belanja harian', 'Transport & bensin', 'Sewa/kontrakan', 'Listrik, air, internet',
      'Pulsa & kuota', 'Kesehatan', 'Keluarga', 'Hiburan', 'Lainnya']
  };
  var DEBT_TYPES = { paylater: 'Paylater', pinjol: 'Pinjaman online', lain: 'Lainnya' };

  var state = load();
  var tab = 'ringkasan';
  var month = today().slice(0, 7);
  var payoffOrder = 'kecil';
  var onSubmit = null;

  var $ = function (id) { return document.getElementById(id); };
  var view = $('view'), dialog = $('dialog'), form = $('form');

  // ---------- data ----------
  function load() {
    var fresh = { version: 1, people: ['Saya', 'Pasangan'], tx: [], debts: [] };
    try {
      var saved = JSON.parse(localStorage.getItem(KEY));
      return saved && Array.isArray(saved.tx) && Array.isArray(saved.debts) ? Object.assign(fresh, saved) : fresh;
    } catch (e) { return fresh; }
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); }
    catch (e) { alert('Data gagal disimpan di browser ini. Ekspor data dari menu Pengaturan supaya tidak hilang.'); }
  }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function today() {
    var d = new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function sum(list, fn) { return list.reduce(function (a, x) { return a + fn(x); }, 0); }
  function monthTx() { return state.tx.filter(function (t) { return t.date.slice(0, 7) === month; }); }
  function ofKind(list, kind) { return list.filter(function (t) { return t.kind === kind; }); }
  function amount(t) { return t.amount; }
  function findDebt(id) { return state.debts.filter(function (d) { return d.id === id; })[0]; }

  function debtBalance(d) {
    var mine = state.tx.filter(function (t) { return t.debtId === d.id; });
    return d.start + sum(ofKind(mine, 'paylater'), amount) - sum(ofKind(mine, 'payment'), amount) +
      sum(d.adjust || [], function (a) { return a.amount; });
  }

  // ---------- format ----------
  function rp(n) { return (n < 0 ? '-' : '') + 'Rp ' + Math.abs(Math.round(n)).toLocaleString('id-ID'); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function parseAmount(s) { return parseInt(String(s).replace(/\D/g, ''), 10) || 0; }
  function longDate(iso) {
    return new Date(iso + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  // ---------- ringkasan ----------
  function renderSummary() {
    var tx = monthTx();
    var income = sum(ofKind(tx, 'income'), amount);
    var spent = sum(ofKind(tx, 'expense'), amount);
    var paylater = sum(ofKind(tx, 'paylater'), amount);
    var paid = sum(ofKind(tx, 'payment'), amount);
    var left = income - spent - paid;
    var totalDebt = sum(state.debts, debtBalance);
    var delta = paylater - paid;

    var html = '<div class="stats">' +
      stat('Pemasukan', rp(income), 'good') +
      stat('Pengeluaran tunai', rp(spent)) +
      stat('Bayar hutang', rp(paid)) +
      stat('Sisa uang', rp(left), left < 0 ? 'bad' : '') +
      '</div>';

    html += '<section class="card"><h2>Hutang</h2><div class="big">' + rp(totalDebt) + '</div>';
    if (!state.debts.length) {
      html += '<p class="muted">Belum ada hutang yang dicatat. Masukkan semua pinjaman dan paylater di menu Hutang supaya totalnya kelihatan.</p>';
    } else {
      html += '<p class="muted">Bulan ini belanja pakai paylater ' + rp(paylater) + ', bayar cicilan ' + rp(paid) + '.</p>';
      if (delta > 0) html += '<p class="bad">Hutang bertambah ' + rp(delta) + ' bulan ini.</p>';
      else if (delta < 0) html += '<p class="good">Hutang berkurang ' + rp(-delta) + ' bulan ini.</p>';
      if (income > 0 && paid > 0) {
        var ratio = Math.round(paid / income * 100);
        html += '<p class="' + (ratio > 30 ? 'warn' : 'muted') + '">' + ratio +
          '% pemasukan bulan ini dipakai untuk cicilan. Patokan yang umum dipakai: paling banyak 30%.</p>';
      }
    }
    html += '</section>';

    var due = state.debts.filter(function (d) { return d.dueDay && debtBalance(d) > 0; })
      .sort(function (a, b) { return a.dueDay - b.dueDay; });
    if (due.length) {
      html += '<section class="card"><h2>Jatuh tempo bulan ini</h2>' + due.map(function (d) {
        var s = dueStatus(d, tx);
        return '<div class="row"><div class="main">' + esc(d.name) + '<small class="' + s.cls + '">' + s.text + '</small></div>' +
          '<span class="amt">' + rp(d.monthly || 0) + '</span>' +
          (s.done ? '' : '<button class="small" data-action="pay" data-id="' + d.id + '">Bayar</button>') + '</div>';
      }).join('') + '</section>';
    }

    var byCat = {};
    tx.forEach(function (t) {
      if (t.kind === 'expense' || t.kind === 'paylater') byCat[t.category] = (byCat[t.category] || 0) + t.amount;
    });
    var cats = Object.keys(byCat).sort(function (a, b) { return byCat[b] - byCat[a]; });
    if (cats.length) {
      html += '<section class="card"><h2>Pengeluaran per kategori</h2>' +
        '<p class="muted">Termasuk yang dibayar pakai paylater.</p>' + cats.map(function (c) {
          return '<div class="row"><div class="main">' + esc(c) +
            '<div class="bar"><i style="width:' + (byCat[c] / byCat[cats[0]] * 100) + '%"></i></div></div>' +
            '<span class="amt">' + rp(byCat[c]) + '</span></div>';
        }).join('') + '</section>';
    }

    if (tx.length) {
      html += '<section class="card"><h2>Per orang</h2>' + state.people.map(function (p) {
        var mine = tx.filter(function (t) { return t.who === p; });
        var out = sum(mine.filter(function (t) { return t.kind !== 'income'; }), amount);
        return '<div class="row"><div class="main">' + esc(p) + '<small>Keluar ' + rp(out) +
          ' (tunai, paylater, dan cicilan)</small></div><span class="amt good">+' +
          rp(sum(ofKind(mine, 'income'), amount)) + '</span></div>';
      }).join('') + '</section>';
    } else {
      html += '<section class="card"><p>Belum ada catatan di bulan ini.</p>' +
        '<div class="actions"><button class="primary" data-action="add-tx" data-kind="expense">Catat pengeluaran</button>' +
        '<button data-action="add-tx" data-kind="income">Catat pemasukan</button></div></section>';
    }
    return html;
  }

  function stat(label, value, cls) {
    return '<div class="stat"><span>' + label + '</span><b class="' + (cls || '') + '">' + value + '</b></div>';
  }

  function dueStatus(d, tx) {
    var paid = sum(tx.filter(function (t) { return t.kind === 'payment' && t.debtId === d.id; }), amount);
    if (d.monthly > 0 && paid >= d.monthly) return { text: 'Sudah dibayar', cls: 'good', done: true };
    var parts = month.split('-');
    var lastDay = new Date(+parts[0], +parts[1], 0).getDate();
    var day = Math.min(d.dueDay, lastDay);
    var text = 'Tanggal ' + day, cls = '';
    if (month === today().slice(0, 7)) {
      var diff = day - new Date().getDate();
      if (diff > 0) { text += ', ' + diff + ' hari lagi'; if (diff <= 3) cls = 'warn'; }
      else if (diff === 0) { text += ', hari ini'; cls = 'warn'; }
      else { text += ', lewat ' + (-diff) + ' hari'; cls = 'bad'; }
    }
    if (paid > 0) text += '. Baru dibayar ' + rp(paid);
    return { text: text, cls: cls, done: false };
  }

  // ---------- transaksi ----------
  function renderTx() {
    var tx = monthTx().sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : 0; });
    var html = '<div class="actions"><button class="primary" data-action="add-tx" data-kind="expense">+ Pengeluaran</button>' +
      '<button data-action="add-tx" data-kind="income">+ Pemasukan</button></div>';
    if (!tx.length) return html + '<section class="card"><p class="muted">Belum ada transaksi di bulan ini.</p></section>';

    html += '<section class="card">';
    var lastDate = '';
    tx.forEach(function (t) {
      if (t.date !== lastDate) { html += '<p class="day">' + longDate(t.date) + '</p>'; lastDate = t.date; }
      var debt = t.debtId ? findDebt(t.debtId) : null;
      var debtName = debt ? debt.name : 'hutang yang sudah dihapus';
      var title = t.kind === 'payment' ? 'Bayar ' + esc(debtName) : esc(t.category);
      var badge = t.kind === 'paylater' ? '<span class="badge">' + esc(debtName) + '</span>' : '';
      var sub = [t.who, t.note].filter(Boolean).map(esc).join(' · ');
      html += '<div class="row"><div class="main">' + title + badge + '<small>' + sub + '</small></div>' +
        '<span class="amt ' + (t.kind === 'income' ? 'good' : '') + '">' + (t.kind === 'income' ? '+' : '-') + rp(t.amount) + '</span>' +
        '<button class="small danger" data-action="del-tx" data-id="' + t.id + '" aria-label="Hapus transaksi">Hapus</button></div>';
    });
    return html + '</section>';
  }

  function txForm(kind) {
    var paylaters = state.debts.filter(function (d) { return d.type === 'paylater'; });
    function fields(k) {
      return '<div class="seg">' +
        '<label><input type="radio" name="kind" value="expense"' + (k === 'expense' ? ' checked' : '') + '><span>Pengeluaran</span></label>' +
        '<label><input type="radio" name="kind" value="income"' + (k === 'income' ? ' checked' : '') + '><span>Pemasukan</span></label></div>' +
        amountField('Jumlah', '') +
        '<label>Tanggal<input type="date" name="date" value="' + today() + '" required></label>' +
        '<label>Kategori<select name="category">' + options(CATS[k]) + '</select></label>' +
        whoField(k === 'income' ? 'Pemasukan siapa' : 'Siapa yang belanja') +
        (k === 'expense' ? '<label>Dibayar pakai<select name="method"><option value="">Tunai / transfer / e-wallet</option>' +
          paylaters.map(function (d) { return '<option value="' + d.id + '">' + esc(d.name) + '</option>'; }).join('') +
          '</select></label>' +
          (paylaters.length ? '' : '<p class="muted">Paylater belum muncul di sini? Tambahkan dulu di menu Hutang dengan jenis Paylater.</p>') : '') +
        '<label>Catatan (boleh kosong)<input name="note" maxlength="80"></label>';
    }
    openForm('Catat transaksi', fields(kind), function (f) {
      var k = f.kind.value, value = parseAmount(f.amount.value);
      if (!value) return 'Jumlah belum diisi.';
      var t = { id: uid(), kind: k, date: f.date.value, amount: value, category: f.category.value, who: f.who.value, note: f.note.value.trim() };
      if (k === 'expense' && f.method.value) { t.kind = 'paylater'; t.debtId = f.method.value; }
      state.tx.push(t);
      month = t.date.slice(0, 7);
    });
    $('form-fields').addEventListener('change', function onKind(e) {
      if (e.target.name !== 'kind') return;
      var typed = form.amount.value;
      $('form-fields').innerHTML = fields(e.target.value);
      form.amount.value = typed;
    });
  }

  // ---------- hutang ----------
  function renderDebts() {
    var html = '<div class="actions"><button class="primary" data-action="add-debt">+ Hutang</button></div>';
    if (!state.debts.length) {
      return html + '<section class="card"><p>Catat setiap pinjaman dan paylater satu per satu: nama aplikasinya, sisa hutang hari ini, cicilan per bulan, dan tanggal jatuh temponya.</p>' +
        '<p class="muted">Angka sisa hutang bisa dilihat di aplikasi masing-masing.</p></section>';
    }
    var total = sum(state.debts, debtBalance);
    var monthly = sum(state.debts.filter(function (d) { return debtBalance(d) > 0; }), function (d) { return d.monthly || 0; });
    html += '<section class="card"><h2>Total hutang</h2><div class="big">' + rp(total) + '</div>' +
      '<p class="muted">Cicilan wajib per bulan ' + rp(monthly) + '.</p></section>';

    var open = state.debts.filter(function (d) { return debtBalance(d) > 0; });
    if (open.length > 1) {
      var byRate = payoffOrder === 'bunga';
      open.sort(function (a, b) {
        return byRate ? (b.rate || 0) - (a.rate || 0) || debtBalance(a) - debtBalance(b) : debtBalance(a) - debtBalance(b);
      });
      html += '<section class="card"><h2>Urutan pelunasan</h2>' +
        '<p class="muted">Bayar cicilan minimum semuanya. Kalau ada uang lebih, masukkan ke hutang nomor 1 sampai lunas, lalu lanjut ke nomor 2.</p>' +
        '<div class="actions"><button class="small' + (byRate ? '' : ' primary') + '" data-action="order" data-order="kecil">Saldo terkecil dulu</button>' +
        '<button class="small' + (byRate ? ' primary' : '') + '" data-action="order" data-order="bunga">Bunga tertinggi dulu</button></div>' +
        open.map(function (d, i) {
          return '<div class="row"><div class="main">' + (i + 1) + '. ' + esc(d.name) +
            (byRate ? '<small>Bunga ' + (d.rate || 0) + '% per bulan</small>' : '') + '</div><span class="amt">' + rp(debtBalance(d)) + '</span></div>';
        }).join('') +
        '<p class="muted">' + (byRate ? 'Urutan ini paling hemat bunga.' : 'Urutan ini paling cepat mengurangi jumlah tagihan yang harus diingat tiap bulan.') + '</p></section>';
    }

    state.debts.forEach(function (d) {
      var bal = debtBalance(d);
      var mine = state.tx.filter(function (t) { return t.debtId === d.id; });
      var paid = sum(ofKind(mine, 'payment'), amount);
      var info = [DEBT_TYPES[d.type], d.who];
      if (d.monthly) info.push('cicilan ' + rp(d.monthly) + '/bulan');
      if (d.dueDay) info.push('jatuh tempo tgl ' + d.dueDay);
      if (d.rate) info.push('bunga ' + d.rate + '%/bulan');
      html += '<section class="card"><div class="row"><div class="main"><b>' + esc(d.name) + '</b><small>' + info.map(esc).join(' · ') + '</small></div>' +
        '<span class="amt">' + (bal > 0 ? rp(bal) : '<span class="good">Lunas</span>') + '</span></div>';
      if (paid > 0 && bal > 0) {
        html += '<div class="bar"><i style="width:' + (paid / (paid + bal) * 100) + '%"></i></div><p class="muted">Sudah dibayar ' + rp(paid) + '.</p>';
      }
      if (bal > 0 && d.monthly > 0) {
        html += '<p class="muted">Kira-kira ' + Math.ceil(bal / d.monthly) + ' bulan lagi dengan cicilan sekarang, kalau tidak ada hutang baru. Bunga dan denda belum dihitung.</p>';
      }
      html += '<div class="actions end">' +
        (bal > 0 ? '<button class="small primary" data-action="pay" data-id="' + d.id + '">Bayar</button>' : '') +
        '<button class="small" data-action="adjust" data-id="' + d.id + '">Sesuaikan saldo</button>' +
        '<button class="small" data-action="edit-debt" data-id="' + d.id + '">Ubah</button>' +
        '<button class="small danger" data-action="del-debt" data-id="' + d.id + '">Hapus</button></div></section>';
    });
    return html;
  }

  function debtForm(d) {
    var typeOpts = Object.keys(DEBT_TYPES).map(function (k) {
      return '<option value="' + k + '"' + (d && d.type === k ? ' selected' : '') + '>' + DEBT_TYPES[k] + '</option>';
    }).join('');
    openForm(d ? 'Ubah hutang' : 'Tambah hutang',
      '<label>Nama aplikasi / pemberi pinjaman<input name="name" required maxlength="40" value="' + esc(d ? d.name : '') + '" placeholder="mis. SPayLater"></label>' +
      '<label>Jenis<select name="type">' + typeOpts + '</select></label>' +
      whoField('Atas nama', d && d.who) +
      (d ? '' : amountField('Sisa hutang hari ini', '')) +
      amountField('Cicilan per bulan', d && d.monthly ? d.monthly : '', 'monthly') +
      '<label>Tanggal jatuh tempo tiap bulan (1-31)<input name="dueDay" type="number" min="1" max="31" value="' + (d && d.dueDay || '') + '"></label>' +
      '<label>Bunga per bulan dalam % (boleh kosong)<input name="rate" type="number" min="0" max="100" step="0.01" value="' + (d && d.rate || '') + '"></label>',
      function (f) {
        var data = {
          name: f.name.value.trim(), type: f.type.value, who: f.who.value,
          monthly: parseAmount(f.monthly.value), dueDay: parseInt(f.dueDay.value, 10) || 0, rate: parseFloat(f.rate.value) || 0
        };
        if (!data.name) return 'Nama belum diisi.';
        if (d) Object.assign(d, data);
        else {
          data.id = uid(); data.start = parseAmount(f.amount.value); data.adjust = [];
          if (!data.start) return 'Sisa hutang belum diisi.';
          state.debts.push(data);
        }
      });
  }

  function payForm(d) {
    var bal = debtBalance(d);
    openForm('Bayar ' + d.name,
      '<p class="muted">Sisa hutang ' + rp(bal) + '.</p>' +
      amountField('Jumlah dibayar', Math.min(d.monthly || bal, bal)) +
      '<label>Tanggal<input type="date" name="date" value="' + today() + '" required></label>' +
      whoField('Dibayar oleh', d.who),
      function (f) {
        var value = parseAmount(f.amount.value);
        if (!value) return 'Jumlah belum diisi.';
        state.tx.push({ id: uid(), kind: 'payment', debtId: d.id, date: f.date.value, amount: value, category: 'Bayar hutang', who: f.who.value, note: '' });
      });
  }

  function adjustForm(d) {
    var bal = debtBalance(d);
    openForm('Sesuaikan saldo ' + d.name,
      '<p class="muted">Tercatat di sini ' + rp(bal) + '. Kalau angka di aplikasinya berbeda (misalnya karena bunga atau denda), isi angka yang benar.</p>' +
      amountField('Sisa hutang menurut aplikasi', bal),
      function (f) {
        var diff = parseAmount(f.amount.value) - bal;
        if (diff) (d.adjust = d.adjust || []).push({ date: today(), amount: diff });
      });
  }

  // ---------- pengaturan ----------
  function renderSettings() {
    return '<section class="card"><h2>Nama</h2>' +
      '<label>Orang pertama<input id="p0" maxlength="20" value="' + esc(state.people[0]) + '"></label>' +
      '<label>Orang kedua<input id="p1" maxlength="20" value="' + esc(state.people[1]) + '"></label>' +
      '<button class="primary" data-action="save-names">Simpan nama</button></section>' +
      '<section class="card"><h2>Data</h2>' +
      '<p class="muted">Data hanya tersimpan di browser HP atau laptop ini. Supaya pasangan melihat data yang sama, ekspor di sini lalu impor di perangkatnya. Ekspor juga berguna sebagai cadangan.</p>' +
      '<div class="actions"><button data-action="export">Ekspor data</button><button data-action="import">Impor data</button>' +
      '<button class="danger" data-action="reset">Hapus semua data</button></div>' +
      '<input type="file" id="file" accept="application/json,.json" hidden></section>';
  }

  function exportData() {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }));
    a.download = 'keuangan-berdua-' + today() + '.json';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function importData(file) {
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var data = JSON.parse(reader.result);
        if (!Array.isArray(data.tx) || !Array.isArray(data.debts) || !Array.isArray(data.people)) throw new Error();
        if (!confirm('Data di perangkat ini akan diganti dengan isi file (' + data.tx.length + ' transaksi, ' + data.debts.length + ' hutang). Lanjut?')) return;
        state = data; save(); render();
      } catch (e) { alert('File ini bukan hasil ekspor Keuangan Berdua.'); }
    };
    reader.readAsText(file);
  }

  // ---------- form ----------
  function amountField(label, value, name) {
    return '<label>' + label + '<input name="' + (name || 'amount') + '" inputmode="numeric" autocomplete="off" data-rupiah value="' +
      (value ? Number(value).toLocaleString('id-ID') : '') + '" placeholder="0"></label>';
  }
  function whoField(label, selected) {
    return '<label>' + label + '<select name="who">' + options(state.people, selected) + '</select></label>';
  }
  function options(list, selected) {
    return list.map(function (x) { return '<option' + (x === selected ? ' selected' : '') + '>' + esc(x) + '</option>'; }).join('');
  }
  function openForm(title, fields, submit) {
    $('form-title').textContent = title;
    // Ganti node supaya listener dari form sebelumnya ikut terbuang.
    var old = $('form-fields'), box = old.cloneNode(false);
    old.parentNode.replaceChild(box, old);
    box.innerHTML = fields;
    $('form-error').hidden = true;
    onSubmit = submit;
    dialog.showModal();
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var error = onSubmit && onSubmit(form);
    if (error) { $('form-error').textContent = error; $('form-error').hidden = false; return; }
    dialog.close(); save(); render();
  });
  form.addEventListener('input', function (e) {
    if (!e.target.hasAttribute('data-rupiah')) return;
    var n = parseAmount(e.target.value);
    e.target.value = n ? n.toLocaleString('id-ID') : '';
  });

  // ---------- render & event ----------
  function render() {
    $('month').value = month;
    view.innerHTML = { ringkasan: renderSummary, transaksi: renderTx, hutang: renderDebts, pengaturan: renderSettings }[tab]();
    Array.prototype.forEach.call(document.querySelectorAll('.tabs button'), function (b) {
      b.classList.toggle('active', b.dataset.tab === tab);
    });
  }

  function shiftMonth(by) {
    var p = month.split('-'), d = new Date(+p[0], +p[1] - 1 + by, 1);
    month = d.getFullYear() + '-' + pad(d.getMonth() + 1);
  }

  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-tab], [data-action]');
    if (!el) return;
    if (el.dataset.tab) { tab = el.dataset.tab; window.scrollTo(0, 0); return render(); }
    var id = el.dataset.id, debt = id && findDebt(id);
    switch (el.dataset.action) {
      case 'month-prev': shiftMonth(-1); break;
      case 'month-next': shiftMonth(1); break;
      case 'close-form': dialog.close(); return;
      case 'add-tx': return txForm(el.dataset.kind);
      case 'add-debt': return debtForm(null);
      case 'edit-debt': return debtForm(debt);
      case 'pay': return payForm(debt);
      case 'adjust': return adjustForm(debt);
      case 'order': payoffOrder = el.dataset.order; break;
      case 'del-tx':
        if (!confirm('Hapus transaksi ini?')) return;
        state.tx = state.tx.filter(function (t) { return t.id !== id; });
        break;
      case 'del-debt':
        if (!confirm('Hapus ' + debt.name + '? Transaksi yang sudah dicatat tetap ada.')) return;
        state.debts = state.debts.filter(function (d) { return d.id !== id; });
        break;
      case 'save-names':
        var names = [$('p0').value.trim() || 'Saya', $('p1').value.trim() || 'Pasangan'];
        if (names[0] === names[1]) return alert('Kedua nama harus berbeda.');
        var rename = function (x) { var i = state.people.indexOf(x.who); if (i > -1) x.who = names[i]; };
        state.tx.forEach(rename); state.debts.forEach(rename);
        state.people = names;
        break;
      case 'export': return exportData();
      case 'import': return $('file').click();
      case 'reset':
        if (!confirm('Semua transaksi dan hutang di perangkat ini akan dihapus dan tidak bisa dikembalikan. Lanjut?')) return;
        state = { version: 1, people: state.people, tx: [], debts: [] };
        break;
      default: return;
    }
    save(); render();
  });

  document.addEventListener('change', function (e) {
    if (e.target.id === 'month' && e.target.value) { month = e.target.value; render(); }
    if (e.target.id === 'file' && e.target.files[0]) importData(e.target.files[0]);
  });

  render();
})();
