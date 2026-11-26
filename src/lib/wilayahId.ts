// Data wilayah administratif Indonesia sesuai kode Kemendagri.
// Sumber: github.com/ibnux/data-indonesia (mirror GitHub Pages & jsDelivr, CORS aktif).

export interface WilayahItem {
  id: string; // digit tanpa titik: "61", "6101", "610101", "6101012005"
  kode: string; // format Kemendagri bertitik: "61", "61.01", "61.01.01", "61.01.01.2005"
  nama: string;
}

interface RawWilayah {
  id: string;
  nama: string;
}

const SUMBER_UTAMA = 'https://ibnux.github.io/data-indonesia';
const SUMBER_CADANGAN = 'https://cdn.jsdelivr.net/gh/ibnux/data-indonesia@master';

/** Daftar 38 provinsi Indonesia sesuai kode Kemendagri (cadangan offline & tampilan instan). */
export const PROVINSI_ID: WilayahItem[] = [
  ['11', 'Aceh'],
  ['12', 'Sumatera Utara'],
  ['13', 'Sumatera Barat'],
  ['14', 'Riau'],
  ['15', 'Jambi'],
  ['16', 'Sumatera Selatan'],
  ['17', 'Bengkulu'],
  ['18', 'Lampung'],
  ['19', 'Kepulauan Bangka Belitung'],
  ['21', 'Kepulauan Riau'],
  ['31', 'DKI Jakarta'],
  ['32', 'Jawa Barat'],
  ['33', 'Jawa Tengah'],
  ['34', 'DI Yogyakarta'],
  ['35', 'Jawa Timur'],
  ['36', 'Banten'],
  ['51', 'Bali'],
  ['52', 'Nusa Tenggara Barat'],
  ['53', 'Nusa Tenggara Timur'],
  ['61', 'Kalimantan Barat'],
  ['62', 'Kalimantan Tengah'],
  ['63', 'Kalimantan Selatan'],
  ['64', 'Kalimantan Timur'],
  ['65', 'Kalimantan Utara'],
  ['71', 'Sulawesi Utara'],
  ['72', 'Sulawesi Tengah'],
  ['73', 'Sulawesi Selatan'],
  ['74', 'Sulawesi Tenggara'],
  ['75', 'Gorontalo'],
  ['76', 'Sulawesi Barat'],
  ['81', 'Maluku'],
  ['82', 'Maluku Utara'],
  ['91', 'Papua'],
  ['92', 'Papua Barat'],
  ['93', 'Papua Selatan'],
  ['94', 'Papua Tengah'],
  ['95', 'Papua Pegunungan'],
  ['96', 'Papua Barat Daya'],
].map(([id, nama]) => ({ id, kode: id, nama }));

/** Format kode wilayah digit ("6101012005") menjadi format bertitik Kemendagri ("61.01.01.2005"). */
export function formatKodeKemendagri(raw: string): string {
  const d = raw.replace(/\D/g, '');
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 6) return `${d.slice(0, 2)}.${d.slice(2, 4)}.${d.slice(4)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 4)}.${d.slice(4, 6)}.${d.slice(6, 10)}`;
}

/** Ambil digit saja dari kode wilayah ("61.01.01" → "610101"). */
export function digitKodeWilayah(kode?: string): string {
  return (kode ?? '').replace(/\D/g, '');
}

const cache = new Map<string, WilayahItem[]>();

async function ambilJson(path: string): Promise<WilayahItem[]> {
  const hit = cache.get(path);
  if (hit) return hit;

  let rows: RawWilayah[] | null = null;
  for (const base of [SUMBER_UTAMA, SUMBER_CADANGAN]) {
    try {
      const res = await fetch(`${base}/${path}`);
      if (!res.ok) continue;
      const parsed = (await res.json()) as RawWilayah[];
      if (Array.isArray(parsed)) {
        rows = parsed;
        break;
      }
    } catch {
      /* coba sumber berikutnya */
    }
  }
  if (!rows) throw new Error('Gagal memuat daftar wilayah Kemendagri.');

  const out: WilayahItem[] = rows
    .filter((r) => r && r.id && r.nama)
    .map((r) => ({ id: String(r.id), kode: formatKodeKemendagri(String(r.id)), nama: r.nama.trim() }))
    .sort((a, b) => a.id.localeCompare(b.id));
  cache.set(path, out);
  return out;
}

export async function ambilProvinsi(): Promise<WilayahItem[]> {
  try {
    return await ambilJson('propinsi.json');
  } catch {
    return PROVINSI_ID;
  }
}

export async function ambilKabupaten(provIdOrKode: string): Promise<WilayahItem[]> {
  const d = digitKodeWilayah(provIdOrKode).slice(0, 2);
  if (d.length !== 2) return [];
  return ambilJson(`kabupaten/${d}.json`);
}

export async function ambilKecamatan(kabIdOrKode: string): Promise<WilayahItem[]> {
  const d = digitKodeWilayah(kabIdOrKode).slice(0, 4);
  if (d.length !== 4) return [];
  return ambilJson(`kecamatan/${d}.json`);
}

export async function ambilDesa(kecIdOrKode: string): Promise<WilayahItem[]> {
  const d = digitKodeWilayah(kecIdOrKode).slice(0, 6);
  if (d.length !== 6) return [];
  return ambilJson(`kelurahan/${d}.json`);
}

function normNama(s?: string): string {
  return (s ?? '')
    .toLowerCase()
    .replace(/\((contoh|simulasi)\)/gi, '')
    .replace(/\b(daerah khusus ibukota|dki)\b/g, 'jakarta')
    .replace(/\b(daerah istimewa|di)\b/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function cariProvinsiDariNama(nama?: string, list: WilayahItem[] = PROVINSI_ID): WilayahItem | undefined {
  const n = normNama(nama);
  if (!n) return undefined;
  return (
    list.find((p) => normNama(p.nama) === n) ??
    list.find((p) => normNama(p.nama).includes(n) || n.includes(normNama(p.nama)))
  );
}

/** Menebak provId & kabId Kemendagri dari kodeWilayah atau nama Pemda + provinsi. */
export async function deteksiWilayahPemda(
  pemda?: { nama?: string; provinsi?: string; kodeWilayah?: string } | null,
): Promise<{ provId?: string; kabId?: string }> {
  if (!pemda) return {};
  const d = digitKodeWilayah(pemda.kodeWilayah);
  if (d.length >= 4) return { provId: d.slice(0, 2), kabId: d.slice(0, 4) };

  const prov = cariProvinsiDariNama(pemda.provinsi);
  if (!prov) return {};
  try {
    const kabs = await ambilKabupaten(prov.id);
    const nPemda = normNama(pemda.nama);
    const kab =
      kabs.find((k) => normNama(k.nama) === nPemda) ??
      kabs.find((k) => nPemda && (normNama(k.nama).includes(nPemda) || nPemda.includes(normNama(k.nama))));
    return { provId: prov.id, kabId: kab?.id };
  } catch {
    return { provId: prov.id };
  }
}
