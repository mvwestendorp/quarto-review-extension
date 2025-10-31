/**
 * Minimal ZIP archive builder that supports the "store" compression method.
 * Generates standard ZIP files without external dependencies.
 */

const CRC32_TABLE = /* @__PURE__ */ (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      if ((c & 1) !== 0) {
        c = 0xedb88320 ^ (c >>> 1);
      } else {
        c >>>= 1;
      }
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    const byte = data[i] ?? 0;
    const index = (crc ^ byte) & 0xff;
    crc = (CRC32_TABLE[index] ?? 0) ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function toDosTime(date: Date): number {
  const seconds = Math.floor(date.getSeconds() / 2);
  return (
    ((date.getHours() & 0x1f) << 11) |
    ((date.getMinutes() & 0x3f) << 5) |
    (seconds & 0x1f)
  );
}

function toDosDate(date: Date): number {
  let year = date.getFullYear();
  if (year < 1980) {
    year = 1980;
  }
  return (
    (((year - 1980) & 0x7f) << 9) |
    (((date.getMonth() + 1) & 0xf) << 5) |
    (date.getDate() & 0x1f)
  );
}

function writeUint16LE(
  target: Uint8Array,
  offset: number,
  value: number
): number {
  target[offset] = value & 0xff;
  target[offset + 1] = (value >>> 8) & 0xff;
  return offset + 2;
}

function writeUint32LE(
  target: Uint8Array,
  offset: number,
  value: number
): number {
  target[offset] = value & 0xff;
  target[offset + 1] = (value >>> 8) & 0xff;
  target[offset + 2] = (value >>> 16) & 0xff;
  target[offset + 3] = (value >>> 24) & 0xff;
  return offset + 4;
}

interface ZipEntryInternal {
  filename: string;
  filenameBytes: Uint8Array;
  data: Uint8Array;
  crc: number;
  dosTime: number;
  dosDate: number;
  localHeaderOffset: number;
}

export interface ZipEntry {
  filename: string;
  content: string | Uint8Array;
  modified?: Date;
}

/**
 * Builds ZIP archives using the "store" (no compression) method.
 */
export class ZipArchiveBuilder {
  private readonly entries: ZipEntryInternal[] = [];
  private readonly encoder = new TextEncoder();

  public addFile(entry: ZipEntry): void {
    const { filename, content } = entry;
    const normalizedName = filename.replace(/\\/g, '/');
    const filenameBytes = this.encoder.encode(normalizedName);
    const data =
      typeof content === 'string'
        ? this.encoder.encode(content)
        : new Uint8Array(content);
    const date = entry.modified ?? new Date();
    this.entries.push({
      filename: normalizedName,
      filenameBytes,
      data,
      crc: crc32(data),
      dosTime: toDosTime(date),
      dosDate: toDosDate(date),
      localHeaderOffset: 0,
    });
  }

  public isEmpty(): boolean {
    return this.entries.length === 0;
  }

  public buildUint8Array(): Uint8Array {
    if (this.entries.length === 0) {
      return new Uint8Array(0);
    }

    let localTotalSize = 0;
    let centralDirectorySize = 0;

    for (const entry of this.entries) {
      localTotalSize += 30 + entry.filenameBytes.length + entry.data.length;
      centralDirectorySize += 46 + entry.filenameBytes.length;
    }

    const endOfCentralDirectorySize = 22;
    const totalSize =
      localTotalSize + centralDirectorySize + endOfCentralDirectorySize;
    const buffer = new Uint8Array(totalSize);
    let offset = 0;

    // Write local file headers
    for (const entry of this.entries) {
      entry.localHeaderOffset = offset;
      offset = writeUint32LE(buffer, offset, 0x04034b50); // Local file header signature
      offset = writeUint16LE(buffer, offset, 20); // Version needed to extract
      offset = writeUint16LE(buffer, offset, 0); // General purpose bit flag
      offset = writeUint16LE(buffer, offset, 0); // Compression method (store)
      offset = writeUint16LE(buffer, offset, entry.dosTime);
      offset = writeUint16LE(buffer, offset, entry.dosDate);
      offset = writeUint32LE(buffer, offset, entry.crc);
      offset = writeUint32LE(buffer, offset, entry.data.length);
      offset = writeUint32LE(buffer, offset, entry.data.length);
      offset = writeUint16LE(buffer, offset, entry.filenameBytes.length);
      offset = writeUint16LE(buffer, offset, 0); // Extra field length

      buffer.set(entry.filenameBytes, offset);
      offset += entry.filenameBytes.length;
      buffer.set(entry.data, offset);
      offset += entry.data.length;
    }

    const centralDirectoryOffset = offset;

    // Write central directory headers
    for (const entry of this.entries) {
      offset = writeUint32LE(buffer, offset, 0x02014b50); // Central file header signature
      offset = writeUint16LE(buffer, offset, 20); // Version made by
      offset = writeUint16LE(buffer, offset, 20); // Version needed to extract
      offset = writeUint16LE(buffer, offset, 0); // General purpose bit flag
      offset = writeUint16LE(buffer, offset, 0); // Compression method
      offset = writeUint16LE(buffer, offset, entry.dosTime);
      offset = writeUint16LE(buffer, offset, entry.dosDate);
      offset = writeUint32LE(buffer, offset, entry.crc);
      offset = writeUint32LE(buffer, offset, entry.data.length);
      offset = writeUint32LE(buffer, offset, entry.data.length);
      offset = writeUint16LE(buffer, offset, entry.filenameBytes.length);
      offset = writeUint16LE(buffer, offset, 0); // Extra field length
      offset = writeUint16LE(buffer, offset, 0); // File comment length
      offset = writeUint16LE(buffer, offset, 0); // Disk number start
      offset = writeUint16LE(buffer, offset, 0); // Internal file attributes
      offset = writeUint32LE(buffer, offset, 0); // External file attributes
      offset = writeUint32LE(buffer, offset, entry.localHeaderOffset);
      buffer.set(entry.filenameBytes, offset);
      offset += entry.filenameBytes.length;
    }

    // End of central directory record
    offset = writeUint32LE(buffer, offset, 0x06054b50);
    offset = writeUint16LE(buffer, offset, 0); // Number of this disk
    offset = writeUint16LE(buffer, offset, 0); // Disk with central directory
    offset = writeUint16LE(buffer, offset, this.entries.length); // Entries on this disk
    offset = writeUint16LE(buffer, offset, this.entries.length); // Total entries
    offset = writeUint32LE(buffer, offset, centralDirectorySize);
    offset = writeUint32LE(buffer, offset, centralDirectoryOffset);
    offset = writeUint16LE(buffer, offset, 0); // Comment length

    return buffer;
  }

  public buildBlob(): Blob {
    const data = this.buildUint8Array();
    if (typeof Blob === 'undefined') {
      throw new Error('Blob is not supported in this environment');
    }
    const buffer = data.buffer.slice(
      data.byteOffset,
      data.byteOffset + data.byteLength
    ) as ArrayBuffer;
    return new Blob([buffer], { type: 'application/zip' });
  }
}

export default ZipArchiveBuilder;
