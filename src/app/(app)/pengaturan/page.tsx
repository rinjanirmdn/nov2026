import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { MAX_MEMBERS } from "@/lib/constants";
import { logout } from "@/app/actions/auth";
import { changePassword, regenerateInvite, resetData, updateName } from "@/app/actions/settings";
import { Loading, Card } from "@/components/ui";
import { ConfirmButton } from "@/components/buttons";
import { ImportForm, InlineForm } from "@/components/settings-forms";

async function SettingsPageContent({ searchParams }: PageProps<"/pengaturan">) {
  const user = await requireUser();
  const isNew = (await searchParams).baru === "1";
  const household = await db.household.findUniqueOrThrow({
    where: { id: user.householdId },
    select: { inviteCode: true, members: { select: { id: true, name: true, email: true }, orderBy: { createdAt: "asc" } } },
  });
  const members = household.members;
  const full = members.length >= MAX_MEMBERS;

  return (
    <>
      <header className="top">
        <h1>Pengaturan</h1>
      </header>
      <main>
        <Card title="Berdua">
          {members.map((m) => (
            <div className="row" key={m.id}>
              <div className="main">
                {m.name}
                {m.id === user.id && <span className="badge">Anda</span>}
                <small>{m.email}</small>
              </div>
            </div>
          ))}
          {!full && (
            <div className={"card" + (isNew ? " notice" : "")} style={{ marginTop: 8 }}>
              <p>
                {isNew ? "Akun sudah dibuat. " : ""}Supaya pasangan melihat data yang sama, minta dia buka aplikasi ini, pilih{" "}
                <b>Daftar</b> lalu <b>Gabung dengan pasangan</b>, dan masukkan kode ini:
              </p>
              <p className="code">{household.inviteCode}</p>
              <p className="muted">Kode ini hanya berlaku sampai dua orang bergabung. Jangan bagikan ke orang lain.</p>
              <ConfirmButton action={regenerateInvite} confirmText="Buat kode baru? Kode lama tidak bisa dipakai lagi." className="small">
                Buat kode baru
              </ConfirmButton>
            </div>
          )}
        </Card>

        <Card title="Nama Anda">
          <InlineForm action={updateName} submitLabel="Simpan nama">
            <label>
              Nama yang tampil di catatan
              <input name="name" maxLength={20} defaultValue={user.name} required />
            </label>
          </InlineForm>
        </Card>

        <Card title="Ganti password">
          <InlineForm action={changePassword} submitLabel="Ganti password">
            <label>
              Password lama
              <input type="password" name="current" autoComplete="current-password" required />
            </label>
            <label>
              Password baru (minimal 8 karakter)
              <input type="password" name="next" autoComplete="new-password" minLength={8} required />
            </label>
          </InlineForm>
        </Card>

        <Card title="Data">
          <p className="muted">
            Data tersimpan di server, jadi HP berdua melihat catatan yang sama. Ekspor tetap berguna sebagai cadangan.
          </p>
          <div className="actions">
            <a className="btn" href="/api/ekspor">
              Ekspor data (.json)
            </a>
          </div>
        </Card>

        <Card title="Impor">
          <p className="muted">
            Pindahkan catatan dari aplikasi versi lama: di aplikasi lama buka Pengaturan, tekan Ekspor data, lalu pilih file itu di
            sini. File dari tombol Ekspor di atas juga bisa diimpor.
          </p>
          <ImportForm members={members} meId={user.id} />
        </Card>

        <Card title="Hapus semua data">
          <InlineForm action={resetData} submitLabel="Hapus semua data" submitClass="danger">
            <label>
              Semua transaksi dan hutang akan dihapus untuk berdua dan tidak bisa dikembalikan. Ketik HAPUS untuk melanjutkan.
              <input name="confirm" autoComplete="off" />
            </label>
          </InlineForm>
        </Card>

        <form action={logout}>
          <button type="submit">Keluar</button>
        </form>
      </main>
    </>
  );
}

export default function SettingsPage(props: PageProps<"/pengaturan">) {
  return (
    <Suspense fallback={<Loading title="Pengaturan" />}>
      <SettingsPageContent {...props} />
    </Suspense>
  );
}
