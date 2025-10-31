import { describe, it, expect } from 'vitest';
import ZipArchiveBuilder from '@utils/zip';

const decoder = new TextDecoder();

function readUint16LE(buffer: Uint8Array, offset: number): number {
  return buffer[offset] | (buffer[offset + 1] << 8);
}

function readUint32LE(buffer: Uint8Array, offset: number): number {
  return (
    buffer[offset] |
    (buffer[offset + 1] << 8) |
    (buffer[offset + 2] << 16) |
    (buffer[offset + 3] << 24)
  ) >>> 0;
}

describe('ZipArchiveBuilder', () => {
  it('produces a valid archive with stored entries', () => {
    const archive = new ZipArchiveBuilder();
    archive.addFile({ filename: 'test.txt', content: 'hello' });
    const data = archive.buildUint8Array();

    expect(data.length).toBeGreaterThan(0);

    // Local file header signature
    expect(readUint32LE(data, 0)).toBe(0x04034b50);

    const nameLength = readUint16LE(data, 26);
    expect(nameLength).toBe(8);

    const nameStart = 30;
    const filename = decoder.decode(data.slice(nameStart, nameStart + nameLength));
    expect(filename).toBe('test.txt');

    const fileDataStart = nameStart + nameLength;
    const fileContent = decoder.decode(data.slice(fileDataStart, fileDataStart + 5));
    expect(fileContent).toBe('hello');

    const endRecordOffset = data.length - 22;
    expect(readUint32LE(data, endRecordOffset)).toBe(0x06054b50);

    const centralDirectoryOffset = readUint32LE(data, endRecordOffset + 16);
    expect(readUint32LE(data, centralDirectoryOffset)).toBe(0x02014b50);
    const centralNameLength = readUint16LE(data, centralDirectoryOffset + 28);
    const centralName = decoder.decode(
      data.slice(
        centralDirectoryOffset + 46,
        centralDirectoryOffset + 46 + centralNameLength
      )
    );
    expect(centralName).toBe('test.txt');
  });

  it('builds an empty archive when no files are present', () => {
    const archive = new ZipArchiveBuilder();
    const data = archive.buildUint8Array();
    expect(data.length).toBe(0);
  });
});
