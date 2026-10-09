type PathPart = string | Directory | File;

const files = new Map<string, Uint8Array>();
const directories = new Set<string>();

function normalizeUri(parts: PathPart[]): string {
  const first = parts[0];
  let uri = typeof first === 'string' ? first : first.uri;
  for (const part of parts.slice(1)) {
    const segment = typeof part === 'string' ? part : part.uri;
    uri = `${uri.replace(/\/+$/, '')}/${segment.replace(/^\/+/, '')}`;
  }
  return uri;
}

function parentUri(uri: string): string {
  return uri.slice(0, uri.lastIndexOf('/'));
}

export class Directory {
  readonly uri: string;

  constructor(...parts: PathPart[]) {
    this.uri = normalizeUri(parts);
  }

  get exists(): boolean {
    return directories.has(this.uri);
  }

  create(options?: { idempotent?: boolean; intermediates?: boolean }): void {
    if (this.exists && !options?.idempotent) {
      throw new Error('Directory already exists.');
    }

    const parent = parentUri(this.uri);
    if (!directories.has(parent) && !options?.intermediates) {
      throw new Error('Parent directory does not exist.');
    }
    directories.add(parent);
    directories.add(this.uri);
  }

  list(): Array<Directory | File> {
    const prefix = `${this.uri.replace(/\/+$/, '')}/`;
    const childFiles = Array.from(files.keys())
      .filter((uri) => uri.startsWith(prefix) && !uri.slice(prefix.length).includes('/'))
      .map((uri) => new File(uri));
    const childDirectories = Array.from(directories)
      .filter((uri) => uri.startsWith(prefix) && !uri.slice(prefix.length).includes('/'))
      .map((uri) => new Directory(uri));
    return [...childFiles, ...childDirectories];
  }
}

export class File {
  readonly uri: string;

  constructor(...parts: PathPart[]) {
    this.uri = normalizeUri(parts);
  }

  get exists(): boolean {
    return files.has(this.uri);
  }

  async bytes(): Promise<Uint8Array> {
    const content = files.get(this.uri);
    if (!content) {
      throw new Error('File does not exist.');
    }
    return content.slice();
  }

  create(options?: { intermediates?: boolean; overwrite?: boolean }): void {
    if (this.exists && !options?.overwrite) {
      throw new Error('File already exists.');
    }
    const parent = parentUri(this.uri);
    if (!directories.has(parent) && !options?.intermediates) {
      throw new Error('Parent directory does not exist.');
    }
    directories.add(parent);
    files.set(this.uri, new Uint8Array());
  }

  write(content: string | Uint8Array): void {
    if (!this.exists) {
      throw new Error('File does not exist.');
    }
    files.set(
      this.uri,
      typeof content === 'string' ? new TextEncoder().encode(content) : content.slice(),
    );
  }

  delete(): void {
    files.delete(this.uri);
  }
}

export const Paths = {
  document: new Directory('file:///wallet-document'),
  cache: new Directory('file:///wallet-cache'),
};

directories.add(Paths.document.uri);
directories.add(Paths.cache.uri);

export const fileSystemMock = {
  files,
  directories,
  reset(): void {
    files.clear();
    directories.clear();
    directories.add(Paths.document.uri);
    directories.add(Paths.cache.uri);
  },
};
