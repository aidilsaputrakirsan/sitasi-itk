# Comprehensive Analysis of sitasi-itk Laravel Project

## Project Overview
This is an academic thesis management system for ITK (Institut Teknologi Kalimantan) that handles the complete workflow of final projects/theses from proposal to defense. The system appears to be named "SITASI-ITK" (Sistem Informasi Tugas Akhir - Institut Teknologi Kalimantan).

## Core Business Processes

### 1. User Authentication & Role Management
- **User Types**: 
  - Mahasiswa (Students)
  - Dosen (Lecturers/Professors)
  - Tendik (Administrative Staff)
  - Koorpro (Program Coordinator)
- **Authentication**: Username/email + password system
- **Permissions**: Role-based access control using Spatie Permission package
- **Database Tables**: `users`, `roles`, `model_has_roles`, `permissions`, `model_has_permissions`

### 2. Thesis Proposal Submission (Pengajuan TA)
- Student submits thesis title and research field
- Student selects two supervisors (Pembimbing 1 and Pembimbing 2)
- Both supervisors must approve the proposal
- Tracking system for proposal status (submitted, under review, approved, rejected)
- Revision process if rejected
- **Database Tables**: `pengajuan_ta`, `riwayat_pengajuans`

### 3. Consultation/Guidance Process (Bimbingan)
- Students record each guidance session with supervisors
- Records include: date, advisor, consultation notes, results
- Supervisors must approve each consultation record
- Historical tracking of all guidance sessions
- **Database Tables**: `bimbingans`

### 4. Seminar Proposal Process (Sempro)
- Student registers for seminar proposal
- Uploads required documents:
  - Form TA-012
  - Plagiarism check results
  - Proposal draft
- Administrative staff verifies documents
- Period-based registration (specific registration periods)
- Seminar scheduling by admin
- Two examiners (Penguji) assigned
- Evaluation by both supervisors and examiners
- Revision requirements tracking
- Approval process for moving to thesis stage
- **Database Tables**: `sempros`, `jadwal_sempros`, `penilaian_sempros`, `riwayat_pendaftaran_sempros`

### 5. Final Thesis Defense Process (Sidang TA)
- Student registers for thesis defense
- Uploads required documents:
  - Revised proposal with approval
  - Final thesis draft
  - Plagiarism check results
- Similar verification, scheduling, and evaluation flow as seminar proposal
- Final grading system
- Revision tracking post-defense
- **Database Tables**: `sidang_ta`, `jadwal_ta`, `penilaian_sidang_tas`, `riwayat_pendaftaran_sidang_ta`

### 6. Evaluation & Grading System
- Structured evaluation form for both seminar and defense
- Evaluation criteria:
  - Presentation media (20%)
  - Communication skills (40%)
  - Content mastery (40%)
  - Thesis content (60%)
  - Writing structure (40%)
  - Work attitude/performance (for supervisors only)
- Automated calculation of weighted grades
- Aggregation of scores from all evaluators
- **Implementation**: Found in `app/Helpers/NilaiHelper.php`

### 7. Period & Schedule Management
- Academic periods defined (semester, year)
- Different periods for proposal seminars and thesis defense
- Status tracking (active/inactive)
- Schedule management for rooms, dates, times
- Visibility controls for published schedules
- **Database Tables**: `periodes`, `jadwal_sempros`, `jadwal_ta`

### 8. Notification System
- Real-time notifications for status changes
- Notification types:
  - Approval/rejection notifications
  - Schedule notifications
  - Revision requests
  - Submission confirmations
- Read/unread status tracking
- **Database Tables**: `notifikasis`
- **Implementation**: Uses trait in `app/Traits/NotifikasiTraits.php`

### 9. Document Generation
- Automated PDF generation for:
  - Form TA-001 (Thesis Proposal)
  - Form TA-002 (Supervisor Assignment)
  - Form TA-006 (Consultation Records)
  - Form TA-007 (Defense Registration)
  - Form TA-008 (Defense Approval)
  - Seminar schedules
  - Defense schedules
  - Revision approval forms
  - Minutes of meetings (Berita Acara)
- **Implementation**: Through `app/Http/Controllers/PDFController.php` using Laravel DomPDF

### 10. Reference & Catalog Management
- Reference topics provided by lecturers
- Catalog of completed theses
- Search functionality
- Abstract storage and display
- **Database Tables**: `referensis`, `katalogs`

## Data Model & Entity Relationships

### User Management
- **users**: Core user information 
  - Relationships: 
    - hasOne mahasiswa
    - hasOne dosen
    - hasOne sempro
    - hasOne sidangTA 
- **mahasiswas**: Student-specific info (nama, nim, email, nomor_telepon)
  - Relationships: 
    - belongsTo user
    - hasOne pengajuanTA
- **dosens**: Lecturer info (nama_dosen, nip, email)
  - Relationships: 
    - belongsTo user

### Thesis Proposal & Guidance
- **pengajuan_ta**: Thesis proposal details
  - Relationships:
    - belongsTo mahasiswa
    - belongsTo pembimbing1 (user)
    - belongsTo pembimbing2 (user)
    - hasMany riwayatPengajuans
    - hasOne jadwal
    - hasOne jadwalTa
- **bimbingans**: Consultation/guidance records
  - Relationships:
    - belongsTo user (student)
    - belongsTo dosens
- **riwayat_pengajuans**: History of proposal changes
  - Relationships:
    - belongsTo pengajuan_ta
    - belongsTo user

### Seminar Proposal
- **sempros**: Proposal seminar registration
  - Relationships:
    - belongsTo user
    - belongsTo periode
    - hasMany penilaianSempros
- **jadwal_sempros**: Seminar scheduling
  - Relationships:
    - belongsTo periode
    - belongsTo user
    - belongsTo penguji1 (user)
    - belongsTo penguji2 (user)
- **penilaian_sempros**: Evaluation records
  - Relationships:
    - belongsTo sempro
    - belongsTo user (evaluator)
- **riwayat_pendaftaran_sempros**: History of seminar-related activities
  - Relationships:
    - belongsTo pengajuan_ta
    - belongsTo sempro
    - belongsTo user

### Thesis Defense
- **sidang_ta**: Defense registration
  - Relationships:
    - belongsTo user
    - belongsTo periode
    - hasMany penilaianSidang
- **jadwal_ta**: Defense scheduling
  - Relationships:
    - belongsTo periode
    - belongsTo user
- **penilaian_sidang_tas**: Defense evaluation records
  - Relationships:
    - belongsTo sidang
    - belongsTo user (evaluator)
- **riwayat_pendaftaran_sidang_ta**: History of defense-related activities
  - Relationships:
    - belongsTo pengajuan_ta
    - belongsTo sidang_ta
    - belongsTo user

### System Management
- **periodes**: Academic periods
  - Relationships:
    - hasMany jadwalSempros
    - hasMany jadwalSidangs
- **notifikasis**: Notification system
  - Relationships:
    - belongsTo from (user)
    - belongsTo to (user)
- **referensis**: Research topics/references
  - Relationships:
    - belongsTo user (creator)
- **katalogs**: Thesis catalog
  - No direct relationships

### Database Schema Highlights

#### User Tables
```sql
users (
  id, name, username, email, password, photo, signature, ...
)

mahasiswas (
  id, nama, nim, email, nomor_telepon, user_id, ...
)

dosens (
  id, nama_dosen, email, nip, user_id, ...
)
```

#### Thesis Proposal & Process Tables
```sql
pengajuan_ta (
  id, judul, bidang_penelitian, mahasiswa_id, pembimbing_1, pembimbing_2, 
  status, approve_pembimbing1, approve_pembimbing2, ...
)

bimbingans (
  id, user_id, tanggal, dosen, ket_bimbingan, hasil_bimbingan, status, ...
)

riwayat_pengajuans (
  id, pengajuan_ta_id, user_id, riwayat, keterangan, status, ...
)
```

#### Seminar Tables
```sql
sempros (
  id, user_id, periode_id, tanggal, form_ta_012, bukti_plagiasi, proposal_ta,
  status, revisi_pembimbing_1, revisi_pembimbing_2, revisi_penguji_1, 
  revisi_penguji_2, approve_pembimbing_1, approve_pembimbing_2, ...
)

jadwal_sempros (
  id, periode_id, pengajuan_ta_id, user_id, penguji_1, penguji_2,
  tanggal_sempro, waktu_mulai, waktu_selesai, ruangan, ...
)

penilaian_sempros (
  id, sempro_id, user_id, media_presentasi, komunikasi, penguasaan_materi,
  isi_laporan_ta, struktur_penulisan, ...
)
```

#### Defense Tables
```sql
sidang_ta (
  id, user_id, periode_id, tanggal, lembar_revisi, draft_ta, bukti_plagiasi,
  status, revisi_pembimbing_1, revisi_pembimbing_2, revisi_penguji_1, 
  revisi_penguji_2, ...
)

jadwal_ta (
  id, periode_id, pengajuan_ta_id, user_id, tanggal_sidang, 
  waktu_mulai, waktu_selesai, ruangan, ...
)

penilaian_sidang_tas (
  id, sidang_ta_id, user_id, media_presentasi, komunikasi, penguasaan_materi,
  isi_laporan_ta, struktur_penulisan, sikap_kinerja, ...
)
```

## Technical Implementation Details

### Backend Framework & Architecture
- **Framework**: Laravel 10.x
- **PHP Version**: 8.1/8.2 required
- **Database**: MySQL
- **Architecture Pattern**: MVC with Livewire components

### Key Packages
- **livewire/livewire (^3.4)**: For reactive UIs without full JavaScript framework
- **spatie/laravel-permission (^6.7)**: Role and permission management
- **barryvdh/laravel-dompdf (^2.2)**: PDF generation
- **maatwebsite/excel (^3.1)**: Excel imports/exports
- **league/flysystem-aws-s3-v3 (^3.27)**: AWS S3 storage

### Authentication & Authorization
- Standard Laravel auth with custom middleware
- Role-based access control using Spatie Permission
- Custom role checking through User model methods: isDosen(), isMahasiswa(), isTendik(), isKoorpro()

### File & Document Management
- File uploads stored in public/storage paths
- S3 integration for cloud storage of documents
- Custom PDF generation service for all forms and certificates

### UI Components & Reactivity
- Uses Livewire 3.x for reactive UI components
- Component structure in app/Http/Livewire
- Each major function has its own Livewire component set

### Calculation Logic
- Grade calculation in NilaiHelper.php using weighted formulas
- For seminar:
  ```
  total1 = (media_presentasi * 20%) + (komunikasi * 40%) + (penguasaan_materi * 40%)
  total2 = (isi_laporan_ta * 60%) + (struktur_penulisan * 40%)
  total_nilai = (total1 * 50%) + (total2 * 50%)
  ```
- For thesis defense with additional supervisor assessment:
  ```
  total1 = (media_presentasi * 20%) + (komunikasi * 40%) + (penguasaan_materi * 40%)
  total2 = (isi_laporan_ta * 60%) + (struktur_penulisan * 40%)
  total3 = sikap_kinerja
  
  if supervisor assessment:
    total_nilai = (total1 * 33%) + (total2 * 34%) + (total3 * 33%)
  else:
    total_nilai = (total1 * 50%) + (total2 * 50%)
  ```

### Notification System
- Custom notification system in notifikasis table
- Not using Laravel's built-in notification system
- Implemented through NotifikasiTraits

### Reusable Traits
- **NotifikasiTraits**: Notification functions
- **PeriodeTraits**: Academic period management
- **UpdateDeleteTraits**: Common CRUD operations

## Code Organization

### Directory Structure
```
/app
├── Console
├── Exceptions
├── Helpers
│   └── NilaiHelper.php (grade calculations)
├── Http
│   ├── Controllers
│   │   ├── AuthController.php
│   │   ├── BimbinganController.php
│   │   ├── DataUserController.php
│   │   ├── PagesController.php (main page routing)
│   │   ├── PDFController.php (document generation)
│   │   ├── PeriodeController.php
│   │   └── ... (other controllers)
│   ├── Livewire
│   │   ├── Alert.php
│   │   ├── Bimbingan/
│   │   ├── DataPengajuan/
│   │   ├── DataUser/
│   │   ├── Jadwal/
│   │   ├── Katalog/
│   │   ├── PengajuanTa/
│   │   ├── Penilaian/
│   │   ├── Periode/
│   │   ├── PeriodeSempro/
│   │   ├── Prosedur/
│   │   ├── Referensi/
│   │   ├── Sempro/
│   │   ├── SidangTa/
│   │   └── UserProfile/
│   ├── Middleware
│   └── Requests
├── Imports (Excel import classes)
├── Models (Data models for all entities)
├── Policies
├── Providers
├── Services
│   └── PdfService.php (PDF generation)
└── Traits
    ├── NotifikasiTraits.php
    ├── PeriodeTraits.php
    └── UpdateDeleteTraits.php
```

### Routes Organization
- Web routes in `routes/web.php` organized by module
- Authentication routes
- Dashboard access
- Thesis management routes
- User management routes
- Document generation routes

### Controller Design
- Standard Laravel controllers with basic CRUD operations
- PagesController manages main page routing
- Specialized controllers for authentication, user data, PDF generation

### Livewire Component Structure
- Each business process has dedicated components
- Components divided by user roles and functions
- Common pattern: Show.php for list views, Edit.php for edit forms

## Migration to Next.js + Supabase

### Database Design for Supabase

#### Core Tables
1. **users**
   - id (uuid, primary key)
   - name
   - email
   - username
   - password (hashed)
   - photo_url
   - signature_url
   - role (array of roles using Supabase's RLS)
   - created_at
   - updated_at

2. **mahasiswa**
   - id (uuid, primary key)
   - user_id (foreign key to users)
   - nama
   - nim
   - email
   - nomor_telepon
   - created_at
   - updated_at

3. **dosen**
   - id (uuid, primary key)
   - user_id (foreign key to users)
   - nama_dosen
   - nip
   - email
   - created_at
   - updated_at

4. **pengajuan_ta**
   - id (uuid, primary key)
   - judul
   - bidang_penelitian
   - mahasiswa_id (foreign key to mahasiswa)
   - pembimbing_1 (foreign key to users)
   - pembimbing_2 (foreign key to users)
   - status
   - approve_pembimbing1 (boolean)
   - approve_pembimbing2 (boolean)
   - created_at
   - updated_at

5. **bimbingan**
   - id (uuid, primary key)
   - user_id (foreign key to users)
   - tanggal
   - dosen (foreign key to users)
   - ket_bimbingan
   - hasil_bimbingan
   - status
   - created_at
   - updated_at

... (and so on for all other tables)

### Authentication Strategy
- Use Supabase Auth for user management
- Implement custom claims or a separate roles table for authorization
- Create middleware equivalent for Next.js to check permissions

### File Storage
- Use Supabase Storage with separate buckets:
  - profile-photos
  - signatures
  - proposal-documents
  - plagiarism-reports
  - thesis-drafts

### API Structure
- Create API routes in Next.js to mimic Laravel controllers
- Implement server actions for form submissions
- Use React Query for data fetching and caching

### React Components Organization
- Use shadcn/ui or similar component library for UI
- Create components that mirror Livewire functionality
- Implement form validation similar to Laravel requests

### Next.js App Router Structure
```
/app
├── (auth)
│   ├── login
│   ├── register
│   └── reset-password
├── dashboard
│   ├── layout.tsx
│   ├── page.tsx
│   ├── mahasiswa/...
│   ├── dosen/...
│   ├── tendik/...
│   └── koorpro/...
├── bimbingan/...
├── pengajuan-ta/...
├── sempro/...
├── sidang-ta/...
├── katalog/...
├── referensi/...
├── penilaian/...
└── pdf/...
```

### API Integration Points
- **/api/auth**: Authentication endpoints
- **/api/pengajuan**: Thesis proposal management
- **/api/bimbingan**: Consultation records
- **/api/sempro**: Seminar proposal management
- **/api/sidang**: Thesis defense management
- **/api/penilaian**: Evaluation and grading
- **/api/pdf**: Document generation

### Supabase RLS Policies
- Row-level security rules based on user roles
- Example policies:
  - Students can only access their own data
  - Lecturers can access data for students they supervise
  - Tendik can access all records for administrative purposes
  - Koorpro has full access

## Deployment Strategy

### Next.js Deployment
- Deploy frontend on Vercel
- Configure environment variables for Supabase connection
- Set up proper CORS headers and security

### Supabase Configuration
- Database: Set up tables with proper indexes
- Authentication: Configure email templates and security settings
- Storage: Configure bucket policies and CORS
- Edge Functions: For complex backend logic

### Maintenance Considerations
- Regular backups of Supabase database
- Monitoring of API usage and performance
- Updating dependencies to maintain security

## Development Roadmap Recommendation

### Phase 1: Foundation
1. Set up Next.js project with TypeScript
2. Configure Supabase with base tables
3. Implement authentication system
4. Create core UI components

### Phase 2: Core Features
1. Thesis proposal submission flow
2. Consultation management
3. User management (students, lecturers)
4. Basic notification system

### Phase 3: Advanced Features
1. Seminar proposal registration and management
2. Thesis defense registration and management
3. Evaluation system with calculations
4. PDF generation

### Phase 4: Refinement
1. Advanced notification system
2. Search and filtering
3. Reporting and analytics
4. UI/UX improvements

## Testing Strategy
1. Unit tests for core functions (especially calculations)
2. Integration tests for key workflows
3. E2E tests for critical user journeys
4. Performance testing for database queries