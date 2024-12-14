import { Descriptor, DescriptorType } from '../interfaces/descriptor';

export class FS {
  private blockSize: number;
  private blocks: (Buffer | null)[];
  private bitmap: number[];
  private descriptors: (Descriptor | null)[];
  private directory: Record<string, number>; // change name to tree
  private openFiles: Record<number, { descriptorId: number, offset: number }>;
  private fdCounter: boolean[];
  private maxFileName: number;
  private cwd: string;

  constructor(blockSize: number, blockCount: number, descriptorsCount: number, maxFileName: number) {
    this.blockSize = blockSize;
    this.blocks = Array(blockCount).fill(null);
    this.bitmap = Array(blockCount).fill(0);
    this.descriptors = Array(descriptorsCount).fill(null);
    this.directory = {};
    this.openFiles = {};
    this.fdCounter = [];
    this.maxFileName = maxFileName;
    this.cwd = '';
    this.initRootDir();
  }

  private initRootDir(): void {
    const descriptorId = 0;
    this.descriptors[descriptorId] = {
      type: DescriptorType.DIRECTORY,
      links: 3,
      size: 0,
      blocks: [], // mb delete
    };
    this.directory['/'] = descriptorId;
  }

  mkdir(pathname: string): void {
    if (pathname.length > this.maxFileName) {
      throw new Error('Directory name should be shorter than ' + this.maxFileName);
    }
    const path = this.resolveDirsName(pathname);
    if (this.directory[path] !== undefined) {
      throw new Error(`Directory ${pathname} already exists`);
    }
    const descriptorId = this.getFreeDescriptor();
    if (descriptorId === -1) {
      throw new Error('No free descriptor');
    }
    this.descriptors[descriptorId] = {
      type: DescriptorType.DIRECTORY,
      links: 2,
      size: 0,
      blocks: [],
    };
    this.directory[path] = descriptorId;
    this.increaseLinkForPreviousFolder(path);
  }

  rmdir(pathname: string): void {
    const path = this.resolveFullPathname(pathname);
    if (path === '/') {
      throw new Error('You can not delete this folder');
    }
    if (path === this.cwd) {
      throw new Error('You can not delete this from current CWD');
    }
    const descriptorId = this.getDescriptionId(path);
    const descriptor = this.descriptors[descriptorId];
    if (descriptor.type !== DescriptorType.DIRECTORY) {
      throw new Error(`${pathname} is not a directory`);
    }
    if (descriptor.links > 2) {
      throw new Error(`Directory ${pathname} is not empty`);
    }
    this.descriptors[descriptorId] = null;
    delete this.directory[path];
    this.decreaseLinkForPreviousFolder(path);
  }

  cd(pathname: string): void {
    const path = this.resolveFullPathname(pathname);
    const descriptorId = this.getDescriptionId(path);
    const descriptor = this.descriptors[descriptorId];
    if (descriptor.type !== DescriptorType.DIRECTORY) {
      throw new Error(`${pathname} is not a directory`);
    }
    if (this.directory[path] === undefined) {
      throw new Error(`Directory ${pathname} does not exist`);
    }
    this.cwd = this.getAbsolutePathname(pathname);
  }

  pwd(): string {
    return this.cwd.length === 0 ? '/' : this.cwd;
  }

  symlink(target: string, pathname: string): void {
    const path = this.resolveDirsName(pathname);
    if (this.directory[path] !== undefined) {
      throw new Error(`File ${path} already exists`);
    }
    if (pathname.length > this.maxFileName) {
      throw new Error(`File name should be shorter than ${this.maxFileName}`);
    }
    if (target.length > this.blockSize) {
      throw new Error('Target path exceeds maximum block size');
    }
    const descriptorId = this.getFreeDescriptor();
    if (descriptorId === -1) {
      throw new Error('No free descriptor');
    }
    this.descriptors[descriptorId] = {
      type: DescriptorType.SYMLINK,
      links: 1,
      size: target.length,
      blocks: [],
    };
    const blockId = this.getFreeBlock();
    if (blockId === -1) {
      throw new Error('No free block');
    }
    this.bitmap[blockId] = 1;
    const descriptor = this.descriptors[descriptorId];
    descriptor.blocks.push(blockId);
    this.blocks[blockId] = Buffer.alloc(this.blockSize);
    const block = this.blocks[blockId];
    block.write(target, 0, 'utf-8');
    this.directory[path] = descriptorId;
  }

  create(pathname: string): void {
    const path = this.resolveDirsName(pathname);
    if (this.directory[path] !== undefined) {
      throw new Error(`File with name ${path} already exists`);
    }
    if (pathname.length > this.maxFileName) {
      throw new Error('File name should be shorter than ' + this.maxFileName);
    }
    const descriptorId = this.getFreeDescriptor();
    if (descriptorId === -1) {
      throw new Error('No free descriptor');
    }
    this.descriptors[descriptorId] = {
      type: DescriptorType.REGULAR,
      links: 1,
      size: 0,
      blocks: [],
    };
    this.directory[path] = descriptorId;
  }

  stat(pathName: string): [number, Descriptor] {
    const path = this.resolveDirsName(pathName);
    const descriptorId = this.getDescriptionId(path);
    return [descriptorId, this.descriptors[descriptorId]];
  }

  ls(): Record<string, any> {
    const path = this.resolveFullPathname(this.cwd);
    const descriptorId = this.directory[path]
    const descriptor = this.descriptors[descriptorId];
    const files = {
      '.': { descriptor, descriptorId },
      '..': { descriptor, descriptorId },
    };
    for (const [filePath, dId] of Object.entries(this.directory)) {
      if (filePath.startsWith(path) && filePath !== path) {
        const fileName = filePath.substring(filePath.lastIndexOf('/') + 1);
        files[fileName] = {
          descriptor: this.descriptors[dId],
          descriptorId: dId,
        };
      }
    }
    return files;
  }

  open(pathname: string): number {
    const path = this.resolveFullPathname(pathname);
    const descriptorId = this.getDescriptionId(path);
    const descriptor = this.descriptors[descriptorId];
    if (descriptor.type !== DescriptorType.REGULAR) {
      throw new Error(`${pathname} is not a regular file`);
    }
    const fd = this.getTheLowesFdCounter();
    this.openFiles[fd] = { descriptorId, offset: 0 };
    return fd;
  }

  close(fd: number): void {
    const file = this.getOpenedFile(fd);
    delete this.openFiles[fd];
    const descriptor = this.descriptors[file.descriptorId];
    if (descriptor.links === 0) {
      this.freeBlocks(descriptor, file.descriptorId);
    }
    this.fdCounter[fd] = false;
    if (Object.keys(this.openFiles).length === 0) {
      this.fdCounter = [];
    }
  }

  seek(fd: number, offset: number): void {
    const file = this.getOpenedFile(fd);
    if (offset < 0 || offset > this.descriptors[file.descriptorId].size) {
      throw new Error('Invalid offset');
    }
    file.offset = offset;
  }

  write(fd: number, size: number, data: Buffer): void {
    const file = this.getOpenedFile(fd);
    const descriptor = this.descriptors[file.descriptorId];
    let bytesWritten = 0;
    while (bytesWritten < size) {
      const blockIndex = Math.floor(file.offset / this.blockSize);
      const blockOffset = file.offset % this.blockSize;
      while (descriptor.blocks.length <= blockIndex) {
        const blockId = this.getFreeBlock();
        if (blockId === -1) {
          throw new Error('No free block');
        }
        this.bitmap[blockId] = 1;
        descriptor.blocks.push(blockId);
        this.blocks[blockId] = Buffer.alloc(this.blockSize);
      }
      const blockId = descriptor.blocks[blockIndex];
      const block = this.blocks[blockId];
      if (!block) {
        throw new Error(`No block with ID ${blockId}`);
      }
      const bytesToWrite = this.blockSize - blockOffset;
      data.copy(block, blockOffset, bytesWritten, bytesToWrite);
      file.offset += bytesToWrite;
      descriptor.size = Math.max(descriptor.size, file.offset);
      bytesWritten += bytesToWrite;
    }
  }

  read(fd: number, size: number): string {
    const file = this.getOpenedFile(fd);
    const descriptor = this.descriptors[file.descriptorId];
    let bytesRead = '';
    while (bytesRead.length < size) {
      const blockIndex = Math.floor(file.offset / this.blockSize);
      const blockOffset = file.offset % this.blockSize;
      const blockId = descriptor.blocks[blockIndex];
      if (blockId === null || blockId === undefined) {
        break;
      }
      const block = this.blocks[blockId];
      if (!block) {
        throw new Error('No block data');
      }
      const bytesToRead = blockOffset + size >= this.blockSize ? this.blockSize : blockOffset + size;
      const processedBlock = block.map((byte) => (byte === 0 || byte === undefined ? 48 : byte));
      bytesRead += processedBlock.slice(blockOffset, bytesToRead).toString();
      file.offset += bytesToRead;
    }
    if (bytesRead.length < size) {
      const delta = size - bytesRead.length;
      bytesRead += Array(delta).fill(0).join('');
    }
    return bytesRead;
  }

  truncate(fileName: string, newSize: number): void {
    const descriptorId = this.getDescriptionId(fileName);
    const descriptor = this.descriptors[descriptorId];
    if (newSize < descriptor.size) {
      const remainsBlocksCount = Math.floor(newSize / this.blockSize);
      const removedBlocks = descriptor.blocks.splice(remainsBlocksCount);
      removedBlocks.forEach(blockId => {
        this.bitmap[blockId] = 0;
        this.blocks[blockId] = null;
      });
    }
    descriptor.size = newSize;
  }

  link(fileName: string, newName: string): void {
    const descriptorId = this.getDescriptionId(fileName);
    if (this.directory[newName] !== undefined) {
      throw new Error(`File with name ${fileName} already exists`);
    }
    this.descriptors[descriptorId].links++;
    this.directory[newName] = descriptorId;
  }

  unlink(fileName: string): void {
    const descriptorId = this.getDescriptionId(fileName);
    const descriptor = this.descriptors[descriptorId];
    descriptor.links--;
    if (descriptor.links === 0) {
      this.freeBlocks(descriptor, descriptorId);
    }
    delete this.directory[fileName];
  }

  private resolveSymlink(descriptor: Descriptor): string {
    const blockId = descriptor.blocks[0];
    const block = this.blocks[blockId];
    return block.slice(0, descriptor.size).toString();
  }

  private normalizePath(pathname: string): string {

    const parts = pathname.split('/').filter(Boolean);
    const stack = [];
    for (const part of parts) {
      if (part === '.') continue;
      if (part === '..') {
        if (stack.length === 0) continue;
        stack.pop();
      } else {
        stack.push(part);
      }
    }
    return '/' + stack.join('/');
  }

  getAbsolutePathname(pathname: string): string {
    if (pathname.startsWith('/')) {
      return this.normalizePath(pathname);
    }
    return this.normalizePath(this.cwd + '/' + pathname);
  }

  resolveFullPathname(pathname: string): string {
    const absolutePath = this.getAbsolutePathname(pathname);
    const parts = absolutePath.split('/').filter(Boolean);
    const stack = [];
    for (const part of parts) {
      const stackPath = stack.join('/');
      const curPath = '/' + (stackPath.length === 0 ? part : stackPath + '/' + part);
      const descriptorId = this.getDescriptionId(curPath);
      const descriptor = this.descriptors[descriptorId];
      if (descriptor.type === DescriptorType.SYMLINK) {
        const symlinkPath = this.resolveSymlink(descriptor);
        if (symlinkPath.startsWith('/')) {
          return this.resolveFullPathname(symlinkPath);
        }
        return this.resolveFullPathname('/' + this.cwd + '/' + symlinkPath);
      } else {
        stack.push(part);
      }
    }
    return '/' + stack.join('/');
  }

  resolveDirsName(pathname: string): string {
    const absolutePath = this.getAbsolutePathname(pathname);
    const parts = absolutePath.split('/');
    const lastPart = parts.pop();
    const dirsName = '/' + parts.join('/');
    return dirsName.length === 1 ? '/' + lastPart
      : this.resolveFullPathname(dirsName) + '/' + lastPart;
  }

  private increaseLinkForPreviousFolder(pathname: string): void {
    const path = pathname.split('/');
    path.pop();
    let previousFolderPath = path.join('/');
    if (previousFolderPath.length === 0) previousFolderPath = '/';
    const descriptorId = this.getDescriptionId(previousFolderPath);
    const descriptor = this.descriptors[descriptorId];
    descriptor.links++;
  }

  private decreaseLinkForPreviousFolder(pathname: string): void {
    const path = pathname.split('/');
    path.pop();
    let previousFolderPath = path.join('/');
    if (previousFolderPath.length === 0) previousFolderPath = '/';
    const descriptorId = this.getDescriptionId(previousFolderPath);
    const descriptor = this.descriptors[descriptorId];
    descriptor.links--;
  }

  private getDescriptionId(fileName: string): number {
    const descriptorId = this.directory[fileName];
    if (descriptorId === undefined) {
      throw new Error(`File or directory ${fileName} not found`);
    }
    return descriptorId;
  }

  private getOpenedFile(fd: number): { descriptorId: number, offset: number } {
    const file = this.openFiles[fd];
    if (!file) {
      throw new Error(`File with FD ${fd} not opened`);
    }
    return file;
  }

  private freeBlocks(descriptor: Descriptor, descriptorId: number): void {
    const isFileOpened = Object.values(this.openFiles).findIndex(file => file.descriptorId === descriptorId) !== -1;
    if (isFileOpened) return;
    descriptor.blocks.forEach(blockId => {
      this.bitmap[blockId] = 0;
      this.blocks[blockId] = null;
    });
  }

  private getTheLowesFdCounter(): number {
    for (let index in this.fdCounter) {
      if (!this.fdCounter[index]) {
        return +index;
      }
    }
    return this.fdCounter.push(true) - 1;
  }

  private getFreeDescriptor() {
    return this.descriptors.findIndex(descriptor => descriptor === null);
  }

  private getFreeBlock() {
    return this.bitmap.findIndex(bit => bit === 0);
  }
}
