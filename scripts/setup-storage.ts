import { pool } from '../src/db/index.ts';

async function main() {
  console.log('Setting up Supabase Storage bucket: lecture-pdfs...');

  // 1. Create or update the bucket
  await pool.query(`
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES ('lecture-pdfs', 'lecture-pdfs', true, 52428800, ARRAY['application/pdf']::text[])
    ON CONFLICT (id) DO UPDATE SET public = true;
  `);

  // 2. Grant permissions on storage.objects for anon & authenticated roles
  await pool.query(`
    DO $$
    BEGIN
      -- Allow anyone to view/read lecture-pdfs publicly
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public Access for lecture-pdfs'
      ) THEN
        CREATE POLICY "Public Access for lecture-pdfs"
        ON storage.objects FOR SELECT
        USING (bucket_id = 'lecture-pdfs');
      END IF;

      -- Allow anon/authenticated uploads to lecture-pdfs
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Upload Access for lecture-pdfs'
      ) THEN
        CREATE POLICY "Upload Access for lecture-pdfs"
        ON storage.objects FOR INSERT
        WITH CHECK (bucket_id = 'lecture-pdfs');
      END IF;

      -- Allow updates to lecture-pdfs
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Update Access for lecture-pdfs'
      ) THEN
        CREATE POLICY "Update Access for lecture-pdfs"
        ON storage.objects FOR UPDATE
        USING (bucket_id = 'lecture-pdfs');
      END IF;
    END $$;
  `);

  const buckets = await pool.query('SELECT id, name, public FROM storage.buckets');
  console.log('Buckets configured:', buckets.rows);
  process.exit(0);
}

main().catch((err) => {
  console.error('Failed to setup storage bucket:', err);
  process.exit(1);
});
