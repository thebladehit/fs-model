export enum DescriptorType {
  REGULAR = 'file',
  DIRECTORY = 'directory',
}

export interface Descriptor {
  type: DescriptorType;
  links: number;
  size: number;
  blocks: number[];
}
