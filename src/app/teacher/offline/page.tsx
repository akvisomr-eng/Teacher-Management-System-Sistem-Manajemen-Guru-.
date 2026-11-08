export const metadata = { title: "Offline | TMS Teacher Desk" };
export default function TeacherOfflinePage() {
  return <main style={{maxWidth:620,margin:"15vh auto",padding:28,fontFamily:"Arial,sans-serif",color:"#17233d"}}>
    <h1>Anda sedang offline</h1>
    <p>Ruang kerja belum dapat dimuat dari server. Dokumen yang sudah tersimpan di perangkat tetap berada di penyimpanan lokal browser.</p>
    <p>Periksa koneksi internet, lalu buka kembali Ruang Kerja Guru. Jangan hapus data browser sebelum mengekspor paket kerja Anda.</p>
    <a href="/teacher">Coba lagi</a>
  </main>;
}
