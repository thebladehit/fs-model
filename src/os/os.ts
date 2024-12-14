import { Logger } from '../logger/logger';
import Config from '../config/config';
import { FS } from '../fs/fs';

export class OS {
  private fs: FS;
  private logger: Logger;
  private config: typeof Config;
  private isFsInitialized: boolean;

  constructor(logger: Logger, config: typeof Config) {
    this.logger = logger;
    this.config = config;
  }

  mkfs(descriptorsCount: number): void {
    this.fs = new FS(this.config.blockSize, this.config.blockCount, descriptorsCount, this.config.maxFileName);
    this.isFsInitialized = true;
    this.logger.log('File system is initialized');
  }

  mkdir(dirName: string): void {
    this.invokeMethod(() => {
      this.fs.mkdir(dirName);
    });
  }

  rmdir(dirName: string): void {
    this.invokeMethod(() => {
      this.fs.rmdir(dirName);
    });
  }

  cd(dirName: string): void {
    this.invokeMethod(() => {
      this.fs.cd(dirName);
    });
  }

  pwd(): void {
    this.invokeMethod(() => {
      const cwd = this.fs.pwd();
      this.logger.log(cwd);
    });
  }

  symlink(target: string, pathname: string): void {
    this.invokeMethod(() => {
      this.fs.symlink(target, pathname);
    });
  }

  stat(fileName: string): void {
    this.invokeMethod(() => {
      const [dId, d] = this.fs.stat(fileName);
      this.logger.log(`id=${dId}, type=${d.type}, nlink=${d.links}, size=${d.size}, nblock=${d.blocks.length}`);
    });
  }

  ls(pathname?: string): void {
    this.invokeMethod(() => {
      const files = this.fs.ls(pathname);
      this.logger.log(
        Object.entries(files)
          .map(([fileName, info]) => (`${fileName} => ${info.descriptor.type}, ${info.descriptorId}`))
          .join('\n'),
      );
    });
  }

  create(fileName: string): void {
    this.invokeMethod(() => {
      this.fs.create(fileName);
    });
  }

  open(fileName: string): void {
    this.invokeMethod(() => {
      const fd = this.fs.open(fileName);
      this.logger.log(`fd = ${fd}`);
    });
  }

  close(fd: number): void {
    this.invokeMethod(() => {
      this.fs.close(fd);
    });
  }

  seek(fd: number, offset: number): void {
    this.invokeMethod(() => {
      this.fs.seek(fd, offset);
    });
  }

  read(fd: number, size: number): void {
    this.invokeMethod(() => {
      const data = this.fs.read(fd, size);
      this.logger.log(data);
    });
  }

  write(fd: number, size: number, data: string): void {
    this.invokeMethod(() => {
      this.fs.write(fd, size, Buffer.from(data));
    });
  }

  link(fileName: string, newName: string): void {
    this.invokeMethod(() => {
      this.fs.link(fileName, newName);
    });
  }

  unlink(fileName: string): void {
    this.invokeMethod(() => {
      this.fs.unlink(fileName);
    });
  }

  truncate(fileName: string, size: number): void {
    this.invokeMethod(() => {
      this.fs.truncate(fileName, size);
    });
  }

  private invokeMethod(fn: Function): void {
    if (!this.isFsInitialized) {
      this.logger.error('FS is not initialized');
      return;
    }
    try {
      fn();
    } catch (e) {
      this.logger.error(e.message);
    }
  }
}
