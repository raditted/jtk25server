# JTK25 Server

Backend API untuk jadwal perkuliahan JTK (Jaringan Telekomunikasi dan Komputer) Politeknik Negeri Bali.

Dibangun dengan [Hono](https://hono.dev) di [Cloudflare Workers](https://workers.cloudflare.com). Data di-**bundle langsung ke dalam Worker** (static JSON imports) — zero runtime fetches.

## URL Produksi

- **Custom Domain:** <https://jtk25.my.id>
- **Workers.dev:** <https://jtk25server.careday17.workers.dev>

## Endpoint API

### v1 (Current)

| Endpoint | Method | Deskripsi | Response Shape |
|----------|--------|-----------|----------------|
| `/api/v1/meta` | GET | Data version hash (SHA-256) + ETag/304 | `{ schema: 2, dataVersion: "..." }` |
| `/api/v1/schedules` | GET | Semua jadwal kuliah (6 kelas) | `{ semester, classes: [{ class_name, schedule }] }` |
| `/api/v1/pengganti` | GET | Jadwal pengganti | `[{ id, class_code, date, kind, ... }]` |
| `/api/v1/announcements` | GET | Pengumuman kampus | `[{ id, title, body, pinned, createdAt, expiresAt }]` |
| `/api/v1/events` | GET | Kegiatan kampus | `[{ id, title, date, endDate, location, category }]` |
| `/api/v1/dosen` | GET | Data 42 dosen | `[{ code, name }]` |
| `/api/v1/rooms` | GET | Data 16 ruangan | `[{ id, name, type }]` |

### Legacy

| Endpoint | Method | Deskripsi |
|----------|--------|-----------|
| `/api/version` | GET | Versi API (`"2.0"`) |
| `/api/schedules` | GET | Kompatibilitas format lama (`academic_year`, `semester`, `curriculum`, `classes`) |

### Middleware

- **CORS** — `hono/cors()` untuk semua route
- **ETag** — `hono/etag()` untuk semua route
- **Cache-Control** — `public, max-age=60` untuk `/api/*`

### Caching

- **ETag**: Setiap respons `/api/v1/meta` menyertakan ETag berbasis SHA-256 hash dari seluruh data
- **304 Not Modified**: Mendukung `If-None-Match` untuk efisiensi bandwidth
- **SPA Assets**: Cache-Control diatur via `_headers` file (no-cache entrypoints, 7-day CDN untuk static assets)

## Arsitektur Data

### Data Files (reference/seed — runtime dilayani D1)

```
data/
├── announcements.json         # Pengumuman seed
├── calendar.json              # Kegiatan seed
├── pengganti.json             # Jadwal pengganti seed (kosong)
├── dosen.json                 # 42 dosen (code + name)
├── rooms.json                 # Ruangan (kelas / lab / online)
├── schedules_D4_2B.json       # Jadwal D4-2B (terbaru: sesi online)
└── seeding/                   # Source markdown + aturan transformasi
```

> Semua endpoint runtime membaca dari **D1**, bukan dari JSON di `data/`.
> File JSON dipakai sebagai seed/reference dan divalidasi oleh `npm run validate`.

### Format Data (Schema v2)

Semua file mengikuti envelope:

```json
{
  "schema": 2,
  "semester": "Ganjil 2025/2026",
  "updatedAt": "2025-09-01T00:00:00Z",
  "data": [...]
}
```

### Session Shape

```json
{
  "time": "07.00-12.20",
  "course_code": "25IF2116",
  "course_name": "Pemrograman RPL",
  "type": "TE",
  "lecturer_code": "MV, LH, RA",
  "lecturer": "Nama Lengkap",
  "room": "H501-Lab. TI",
  "mode": "offline"
}
```

### Sesi Online

Kolom `schedules.mode` bernilai `offline` atau `online`. Sesi online memakai
**ruangan virtual** (`rooms.type = 'online'`), bukan ruangan fisik, sehingga:

- sesi online **tidak** masuk ke matriks okupansi ruangan fisik,
- ketersediaan ruangan **tidak** dihitung dari sesi online,
- `rooms.type` menerima nilai `kelas`, `lab`, dan `online`
  (lihat `migrations/0006_online_rooms.sql`).

Admin API menjaga `room` dan `mode` selalu konsisten: ruangan dengan awalan
`Online-` dipaksa `mode = 'online'` (`effectiveMode()` di `src/admin.ts`).
Validator menolak `room` yang tidak ada di `rooms.json` serta `mode` yang
bertentangan dengan tipe ruangan tersebut.

Ruangan online bawaan: `Online-Google Meet` — "Online (Google Meet)".

### Alur Update Data

1. Edit file JSON di `data/` pada branch `main`
2. Commit dan push
3. Validate: `npm run validate`
4. Deploy: `npm run deploy` (build web + wrangler deploy)
5. Data terbaru langsung tersedia di API

### Data Legacy

Folder `data/legacy/` sudah dihapus — semua jadwal kini dilayani oleh D1.

### Seeding Reference

```
data/seeding/
├── notes.md                              # Aturan transformasi markdown → JSON v2
├── Jadwal_D3_Semester_3_2026-2027.md     # Source markdown D3
├── Jadwal_D4_Semester_3_2026-2027.md     # Source markdown D4
└── ID_Dosen_JTK.md                       # Source 42 lecturer IDs
```

## Validasi

### JSON Schema (6 file)

```
schemas/
├── schedule-class.json    # Jadwal per kelas (DotTime pattern, Day enum, CourseType TE/PR)
├── pengganti.json         # Pengganti (PenggantiKind: replace/add/info)
├── announcements.json     # Pengumuman
├── events.json            # Kegiatan
├── dosen.json             # Dosen
└── rooms.json             # Ruangan
```

### Cross-file Validation Rules

1. **Schedule**: Setiap `lecturer_code` harus ada di `dosen.json`
2. **Pengganti**: `lecturer_code` harus ada di `dosen.json`; date harus valid YYYY-MM-DD
3. **Semua list files**: Duplicate `id` ditolak

```bash
npm run validate                              # Validasi semua data
tsx tools/validate.ts FILE...                 # Validasi file tertentu
tsx tools/validate.ts --dir <path> FILE...    # Custom data directory
```

## Teknologi

| Komponen | Teknologi |
|----------|-----------|
| Runtime | Cloudflare Workers (V8 isolates) |
| Framework | Hono v4 |
| Bahasa | TypeScript |
| Data | Static JSON (bundled at build time) |
| Validasi | AJV + ajv-formats (JSON Schema draft-07) |
| Testing | Vitest |
| Domain | `jtk25.my.id` + `www.jtk25.my.id` (custom domain) |
| CI | GitHub Actions (validate + test) |

## Pengembangan

```bash
npm install                     # Install dependencies
npm run dev                     # Dev server (localhost:8787)
npm run validate                # Validasi data files
npm run test                    # Jalankan test suite
```

### Scripts

| Script | Command | Deskripsi |
|--------|---------|-----------|
| `dev` | `wrangler dev` | Local dev server |
| `build:web` | `cd web && npm install --include=dev && npm run build` | Build the React admin/public SPA → `web/dist` |
| `deploy` | `npm run build:web && wrangler deploy` | Build web + deploy Worker |
| `validate` | `tsx tools/validate.ts` | Validasi data |
| `test` | `vitest run` | Test suite |
| `db:migrate` | `wrangler d1 migrations apply jtk25-schedules --local` | Apply migrations to local D1 |
| `db:migrate:remote` | `wrangler d1 migrations apply jtk25-schedules --remote` | Apply migrations to production D1 |

> Catatan: `--include=dev` wajib dipakai pada `build:web` karena `tsc -b` butuh
> `typescript` dari `devDependencies`.

### Dependencies

| Package | Versi | Fungsi |
|---------|-------|--------|
| hono | ^4.13.7 | HTTP framework |
| @cloudflare/workers-types | ^5.20260911.1 | Workers types |
| @types/node | ^26.5.1 | Node.js types |
| ajv | ^8.20.0 | JSON Schema validator |
| ajv-formats | ^3.0.1 | Format plugins |
| tsx | ^4.23.13 | TypeScript execution |
| vitest | ^5.0.0 | Test framework |

## Deploy

Deploy manual — tidak ada CI/CD pipeline untuk deploy.

```bash
npm run deploy        # Build web (Flutter) + deploy Worker
npx wrangler deploy   # Deploy Worker saja (tanpa rebuild web)
```

Jangan pernah commit API token atau credential Cloudflare ke repository.

## Struktur Proyek

```
server/
├── src/
│   ├── index.ts               # Hono app: routes + SPA fallback
│   ├── admin.ts               # Admin schedules CRUD + auth
│   ├── admin_content.ts       # Admin CRUD untuk rooms/events/announcements/pengganti
│   ├── data.ts                # D1 queries + SHA-256 data version
│   ├── cron.ts, dedup.ts, fcm.ts
│
├── data/                      # 5 master-data JSON (seed/reference; runtime dari D1)
│   └── seeding/               # Source markdown + aturan transformasi
│
├── schemas/                   # 6 JSON Schema files (draft-07)
├── tools/
│   ├── validate.ts            # CLI validator: AJV + cross-file rules
│   └── migrate-to-d1.ts       # JSON → SQL generator
│
├── tests/
│   ├── data.test.ts           # Data layer tests
│   ├── validate.test.ts       # Validation tests
│   └── fixtures/bad/          # 5 bad fixture files (rejected by validator)
│
├── web/                       # React SPA (public + admin) → di-deploy sebagai ASSETS
├── migrations/                # D1 migrations (0001 … 0006)
├── wrangler.jsonc             # Cloudflare Workers config
├── package.json               # Node.js project config
├── worker-configuration.d.ts  # Auto-generated Worker env types
└── README.md                  # File ini
```

## CI/CD

### Server CI (`.github/workflows/ci.yml`)

- Trigger: push/PR ke `main`
- Runner: ubuntu-latest, Node 22
- Jobs:
  1. **Validate** — `npm run validate` (cek validitas JSON schema + cross-file rules)
  2. **Test** — `npm run test` (vitest)

## Lisensi

SSPL v1 — Lihat [LICENSE](LICENSE) untuk detail.
