export enum DescriptorType {
  REGULAR = 'file',
  DIRECTORY = 'directory',
  SYMLINK = 'symlink',
}

export interface Descriptor {
  type: DescriptorType;
  links: number;
  size: number;
  blocks: number[];
}
