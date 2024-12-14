import { Logger } from './logger/logger';
import { OS } from './os/os';
import config from './config/config';

const logger = new Logger();
const os = new OS(logger, config);

// examples for fifth lab
os.mkfs(15);
os.mkdir('dir1');
os.stat('dir1');
os.mkdir('dir1/dir2');
os.stat('dir1');
os.ls();
os.stat('/');
os.cd('dir1/dir2');
os.create('file.txt');
os.mkdir('/a');
os.mkdir('/a/b');
os.symlink('/dir1', '/a/b/l1');
os.ls('/a/b');
os.open('/a/b/l1/dir2/file.txt');
os.cd('..');
os.pwd();
os.symlink('dir2/./../../dir1/././dir2/file.txt', '/dir1/l2');
os.cd('/a/b');
os.open('l1/l2');
os.cd('/');
os.unlink('/dir1/l2');
os.unlink('/a/b/l1');
os.unlink('dir1/dir2/file.txt');
os.unlink('dir1/dir2');
os.symlink('some', 'dir1/dir2/data.txt');
os.ls('dir1/dir2');
os.link('dir1/dir2/data.txt', '/a/b/document');
os.ls('/a/b');
os.stat('/a/b/document');
os.stat('/dir1/dir2/data.txt');
os.open('dir1/dir2/data.txt');
os.create('some');
os.open('/dir1/dir2/data.txt');
os.mkdir('/1');
os.mkdir('/1/2');
os.cd('/1/2');
os.rmdir('../2');
os.ls();

// examples for fourth lab
// os.pwd();
// os.cd('/abc/abc/sym1');
// os.pwd();
// os.create('/abc/text.txt');
// os.ls();
// os.create('/abc/aa/text.txt');
// os.stat('text.txt')
// os.pwd();
// os.stat('./')

// the lowes fd index example
// os.create('text.txt');
// os.create('text1.txt');
// os.create('text2.txt');
//
// os.open('text.txt');
// os.open('text1.txt');
// os.close(0);
// os.open('text2.txt');


// example of reading non-existing blocks
// os.create('text.txt');
// os.truncate('text.txt', 200);
// os.stat('text.txt');
// os.open('text.txt');
// os.read(0, 200);

// example of reducing file size
// os.create('text.txt');
// os.truncate('text.txt', 200);
// os.stat('text.txt');
// os.open('text.txt');
// os.seek(0, 128);
// os.write(0, 3, 'abc');
// os.stat('text.txt');
// os.seek(0, 0);
// os.read(0, 256);
// os.truncate('text.txt', 200);
// os.stat('text.txt');
// os.seek(0, 0);
// os.read(0, 256);
// os.ls();

// example of opening file multiple times
// os.create('text.txt');
// os.open('text.txt');
// os.open('text.txt');
// os.open('text.txt');
// os.write(0, 1, '1');
// os.seek(1, 1);
// os.write(1, 1, '2');
// os.read(2, 3);

// example of many links to one file
// os.create('text.txt');
// os.link('text.txt', 'newtext.txt');
// os.ls();


// os.create('file.txt');
// os.open('file.txt');
// os.truncate('file.txt', 1024);
// os.seek(0, 512);
// os.write(0, 3, '512');
// os.seek(0, 1024);
// os.write(0, 4, '1024');
// os.seek(0, 0);
// os.read(0, 2048);

// os.link('text.txt', 'newtext.txt');
// os.ls();
// os.stat('text.txt');
// os.unlink('text.txt');
// os.stat('newtext.txt');
// os.truncate('newtext.txt', 1000);
// os.stat('newtext.txt');
// os.open('newtext.txt');
// os.write(0, 10, 'hello the!');
// os.stat('newtext.txt');
// os.seek(0, 5);
// os.read(0, 5);
// os.seek(0, 129);
// os.write(0, 2, '22');
// os.stat('newtext.txt');
// os.seek(0, 0);
// os.read(0, 102);
// os.unlink('newtext.txt');
// os.stat('newtext.txt');
// os.read(0, 10);
// os.close(0);
// os.read(0, 10);
// os.ls();

