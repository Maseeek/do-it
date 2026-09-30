import test from 'node:test';
import assert from 'node:assert/strict';
import { compressImage, compressMultipleImages, MAX_PROOF_FILE_BYTES, MAX_PROOF_PHOTOS, validateProofFile } from './image-utils';

test('rejects empty, non-image and oversized proof files before decoding', () => {
  assert.throws(() => validateProofFile({ type: 'image/jpeg', size: 0 }), /empty/);
  assert.throws(() => validateProofFile({ type: 'text/plain', size: 100 }), /image file/);
  assert.throws(() => validateProofFile({ type: 'image/jpeg', size: MAX_PROOF_FILE_BYTES + 1 }), /20 MB/);
  assert.doesNotThrow(() => validateProofFile({ type: 'image/png', size: MAX_PROOF_FILE_BYTES }));
});

test('rejects excessive photo batches and invalid settings without allocating images', async () => {
  const file = new File(['photo'], 'photo.jpg', { type: 'image/jpeg' });
  await assert.rejects(compressMultipleImages(Array(MAX_PROOF_PHOTOS + 1).fill(file)), /up to 6/);
  await assert.rejects(compressImage(file, 0), /settings/);
  await assert.rejects(compressImage(file, 1200, Number.NaN), /settings/);
  assert.deepEqual(await compressMultipleImages([]), []);
});
