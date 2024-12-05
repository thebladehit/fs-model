import { Descriptor, DescriptorType } from '../interfaces/descriptor';

export class FS {
  private blockSize: number;
  private blocks: (Buffer | null)[];
  private bitmap: number[];
  private descriptors: (Descriptor | null)[];
  private directory: Record<string, number>;
  private openFiles: Record<number, { descriptorId: number, offset: number }>;
  private fdCounter: boolean[];
  private maxFileName: number;

  constructor(blockSize: number, blockCount: number, descriptorsCount: number, maxFileName: number) {
    this.blockSize = blockSize;
    this.blocks = Array(blockCount).fill(null);
    this.bitmap = Array(blockCount).fill(0);
    this.descriptors = Array(descriptorsCount).fill(null);
    this.directory = {};
    this.openFiles = {};
    this.fdCounter = [];
    this.maxFileName = maxFileName;
  }

  create(fileName: string): void {
    if (this.directory[fileName] !== undefined) {
      throw new Error(`File with name ${fileName} already exists`);
    }
    if (fileName.length > this.maxFileName) {
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
    this.directory[fileName] = descriptorId;
  }

  stat(fileName: string): [number, Descriptor] {
    const descriptorId = this.getDescriptionId(fileName);
    return [descriptorId, this.descriptors[descriptorId]];
  }

  ls(): Record<string, number> {
    return this.directory;
  }

  open(fileName: string): number {
    const descriptorId = this.getDescriptionId(fileName);
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

  private getDescriptionId(fileName: string): number {
    const descriptorId = this.directory[fileName];
    if (descriptorId === undefined) {
      throw new Error(`File ${fileName} not found`);
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
