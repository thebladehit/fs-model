import { Logger } from './logger/logger';
import { OS } from './os/os';
import config from './config/config';

const logger = new Logger();
const os = new OS(logger, config);

os.mkfs(5);
os.ls();

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
os.create('text.txt');
os.link('text.txt', 'newtext.txt');
os.ls();


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

